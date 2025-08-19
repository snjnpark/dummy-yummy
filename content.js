(function() {
  // --- 가짜 데이터 생성 함수 ---
  const DUMMY_DATA = {
    firstNames: ['민준', '서준', '도윤', '예준', '시우', '하준', '주원', '지호', '지후', '준서', '서연', '서윤', '지우', '서현', '하윤', '민서', '지유', '윤서', '채원', '수아'],
    lastNames: ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임'],
    companies: ['삼송', '현다이', '네버', '카카우', '쿠폰'],
    emailDomains: ['gmale.com', 'never.com', 'cacao.com', 'hammail.net', 'late.com']
  };

  function getRandomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function generateRandomString(length = 8) {
    return Math.random().toString(36).substring(2, 2 + length);
  }

  function getFakeFirstName() {
    return getRandomElement(DUMMY_DATA.firstNames);
  }

  function getFakeLastName() {
    return getRandomElement(DUMMY_DATA.lastNames);
  }

  function getFakeFullName() {
    return getFakeLastName() + getFakeFirstName();
  }

  function getFakeEmail() {
    return `${generateRandomString(10)}@${getRandomElement(DUMMY_DATA.emailDomains)}`;
  }

  function getFakeCompany() {
    return getRandomElement(DUMMY_DATA.companies);
  }

  function getFakePhoneNumber(format = 'hyphen') {
    if (format === 'digits') {
        return '01000000000';
    }
    return '010-0000-0000';
  }


  // --- 입력 필드 식별 및 채우기 ---

  function getFieldType(input) {
    const attrs = [
      input.id,
      input.name,
      input.placeholder,
      input.getAttribute('aria-label') || ''
    ].join(' ').toLowerCase();

    if (/e-?mail|메일|업무\s?메일/.test(attrs)) return 'email';
    if (/full-?name|성함/.test(attrs)) return 'fullName';
    if (/last-?name|lname|성/.test(attrs) && !/first-?name|fname|이름/.test(attrs)) return 'lastName';
    if (/first-?name|fname|이름/.test(attrs) && !/last-?name|lname|성/.test(attrs)) return 'firstName';
    if (/name|이름/.test(attrs)) return 'name';
    if (/company|organization|기업|회사명?/.test(attrs)) return 'company';
    if (/phone|mobile|tel|전화/.test(attrs)) return 'phone';
    
    return null;
  }

  function dispatchEvents(element) {
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function fillForms() {
    const inputs = Array.from(document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input:not([type])'));

    // --- 1. 이름 관련 필드 처리 ---
    const lastNameInput = inputs.find(input => !input.value && getFieldType(input) === 'lastName');
    const firstNameInput = inputs.find(input => !input.value && getFieldType(input) === 'firstName');

    // '성'과 '이름' 필드가 명확히 구분되어 있으면 각각 채웁니다.
    if (lastNameInput && firstNameInput) {
        lastNameInput.value = getFakeLastName();
        dispatchEvents(lastNameInput);

        firstNameInput.value = getFakeFirstName();
        dispatchEvents(firstNameInput);
    } else {
        // 그렇지 않으면, '성함', '이름', 'Name' 등으로 볼 수 있는 첫 번째 필드에 전체 이름을 채웁니다.
        const fullNameInput = inputs.find(input => {
            if (input.value) return false;
            const type = getFieldType(input);
            return type === 'fullName' || type === 'name' || type === 'firstName';
        });

        if (fullNameInput) {
            fullNameInput.value = getFakeFullName();
            dispatchEvents(fullNameInput);
        }
    }

    // --- 2. 나머지 필드(이메일, 회사, 전화번호) 처리 ---
    inputs.forEach(input => {
      // 이미 값이 채워졌거나, 비활성화된 필드는 건너뜁니다.
      if (input.value || input.disabled || input.readOnly) {
        return;
      }

      const fieldType = getFieldType(input);
      let fakeData = null;

      switch (fieldType) {
        case 'email':
          fakeData = getFakeEmail();
          break;
        case 'company':
          fakeData = getFakeCompany();
          break;
        case 'phone':
          const pattern = input.getAttribute('pattern');
          const maxLength = input.getAttribute('maxlength');
          let phoneFormat = 'hyphen';
          if ((pattern && (pattern.includes('\d') || pattern.includes('[0-9]')) && !pattern.includes('-')) || (maxLength && parseInt(maxLength, 10) < 13)) {
            phoneFormat = 'digits';
          }
          fakeData = getFakePhoneNumber(phoneFormat);
          break;
      }

      if (fakeData) {
        input.value = fakeData;
        dispatchEvents(input);
      }
    });
  }

  fillForms();
})();
