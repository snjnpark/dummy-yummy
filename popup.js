document.addEventListener('DOMContentLoaded', () => {
  const modeToggle = document.getElementById('mode-toggle');
  const manualSettings = document.getElementById('manual-settings');
  const fillFormButton = document.getElementById('fill-form');
  const manualInputs = document.querySelectorAll('#manual-settings input');

  function loadSettings() {
    chrome.storage.local.get('settings', (data) => {
      const settings = data.settings || { mode: 'auto', manualConfig: {} };
      const isManual = settings.mode === 'manual';
      modeToggle.checked = isManual;
      manualSettings.classList.toggle('hidden', !isManual);
      Object.keys(settings.manualConfig).forEach(type => {
        const config = settings.manualConfig[type];
        const checkbox = document.querySelector(`input[type="checkbox"][data-type="${type}"]`);
        const textInput = document.querySelector(`input[type="text"][data-type="${type}"]`);
        if (checkbox) checkbox.checked = config.enabled;
        if (textInput) textInput.value = config.text;
      });
    });
  }

  function saveSettings() {
    const settings = {
      mode: modeToggle.checked ? 'manual' : 'auto',
      manualConfig: {}
    };
    const types = ['email', 'name', 'company', 'phone'];
    types.forEach(type => {
      const checkbox = document.getElementById(`manual-${type}-enabled`);
      const textInput = document.getElementById(`manual-${type}-text`);
      settings.manualConfig[type] = {
        enabled: checkbox.checked,
        text: textInput.value
      };
    });
    chrome.storage.local.set({ settings });
  }

  modeToggle.addEventListener('change', () => {
    manualSettings.classList.toggle('hidden', !modeToggle.checked);
    saveSettings();
  });

  manualInputs.forEach(input => {
    input.addEventListener('input', saveSettings);
  });

  fillFormButton.addEventListener('click', () => {
    chrome.storage.local.get('settings', (data) => {
      const settings = data.settings || { mode: 'auto', manualConfig: {} };
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: fillFormsInPage,
          args: [settings]
        });
      });
    });
  });

  loadSettings();
});

function fillFormsInPage(settings) {
  // --- 데이터 및 헬퍼 함수 (content.js에서 가져옴) ---
  const DUMMY_DATA = {
    firstNames: ['민준', '서준', '도윤', '예준', '시우', '하준', '주원', '지호', '지후', '준서', '서연', '서윤', '지우', '서현', '하윤', '민서', '지유', '윤서', '채원', '수아'],
    lastNames: ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임'],
    companies: ['삼송', '현다이', '네버', '카카우', '쿠폰'],
    emailDomains: ['gmale.com', 'never.com', 'cacao.com', 'hammail.net', 'late.com']
  };

  function getRandomElement(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function generateRandomString(length = 8) { return Math.random().toString(36).substring(2, 2 + length); }
  function getFakeFirstName() { return getRandomElement(DUMMY_DATA.firstNames); }
  function getFakeLastName() { return getRandomElement(DUMMY_DATA.lastNames); }
  function getFakeFullName() { return getFakeLastName() + getFakeFirstName(); }
  function getFakeEmail() { return `${generateRandomString(10)}@${getRandomElement(DUMMY_DATA.emailDomains)}`; }
  function getFakeCompany() { return getRandomElement(DUMMY_DATA.companies); }
  function getFakePhoneNumber(format = 'hyphen') { return format === 'digits' ? '01000000000' : '010-0000-0000'; }
  function dispatchEvents(element) { 
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // --- 모드별 로직 실행 ---
  if (settings.mode === 'manual') {
    // --- 수동 모드 로직 ---
    const inputs = Array.from(document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input:not([type])'));
    Object.keys(settings.manualConfig).forEach(type => {
      const config = settings.manualConfig[type];
      if (!config.enabled || !config.text) return;

      const searchText = config.text.toLowerCase();
      const targetInput = inputs.find(input => {
        if (input.value) return false;
        const attrs = [input.id, input.name, input.placeholder, input.getAttribute('aria-label') || ''].join(' ').toLowerCase();
        return attrs.includes(searchText);
      });

      if (targetInput) {
        let fakeData = null;
        switch (type) {
          case 'email': fakeData = getFakeEmail(); break;
          case 'name': fakeData = getFakeFullName(); break;
          case 'company': fakeData = getFakeCompany(); break;
          case 'phone': fakeData = getFakePhoneNumber(); break; // 수동에선 기본 하이픈 형태로
        }
        if (fakeData) {
          targetInput.value = fakeData;
          dispatchEvents(targetInput);
        }
      }
    });
  } else {
    // --- 자동 모드 로직 (기존 content.js 로직) ---
    function getFieldType(input) {
      const attrs = [input.id, input.name, input.placeholder, input.getAttribute('aria-label') || ''].join(' ').toLowerCase();
      if (/e-?mail|메일|업무\s?메일/.test(attrs)) return 'email';
      if (/full-?name|성함/.test(attrs)) return 'fullName';
      if (/last-?name|lname|성/.test(attrs) && !/first-?name|fname|이름/.test(attrs)) return 'lastName';
      if (/first-?name|fname|이름/.test(attrs) && !/last-?name|lname|성/.test(attrs)) return 'firstName';
      if (/name|이름/.test(attrs)) return 'name';
      if (/company|organization|기업|회사명?/.test(attrs)) return 'company';
      if (/phone|mobile|tel|전화/.test(attrs)) return 'phone';
      return null;
    }

    const inputs = Array.from(document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input:not([type])'));
    const lastNameInput = inputs.find(input => !input.value && getFieldType(input) === 'lastName');
    const firstNameInput = inputs.find(input => !input.value && getFieldType(input) === 'firstName');

    if (lastNameInput && firstNameInput) {
      lastNameInput.value = getFakeLastName();
      dispatchEvents(lastNameInput);
      firstNameInput.value = getFakeFirstName();
      dispatchEvents(firstNameInput);
    } else {
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

    inputs.forEach(input => {
      if (input.value || input.disabled || input.readOnly) return;
      const fieldType = getFieldType(input);
      let fakeData = null;
      switch (fieldType) {
        case 'email': fakeData = getFakeEmail(); break;
        case 'company': fakeData = getFakeCompany(); break;
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
}