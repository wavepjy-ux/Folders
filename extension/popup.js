const urlInput = document.getElementById('url');
const downloadDirInput = document.getElementById('downloadDir');
const formatSelect = document.getElementById('formatSelect');
const startInput = document.getElementById('start');
const endInput = document.getElementById('end');
const loadFormatsBtn = document.getElementById('loadFormats');
const downloadBtn = document.getElementById('download');
const statusEl = document.getElementById('status');

const STATE_KEY = 'popupState';
let formatsCache = [];

function renderFormats(formats, selectedId = '') {
  formatSelect.innerHTML = '';

  if (!formats.length) {
    formatSelect.innerHTML = '<option value="">먼저 화질을 불러오세요</option>';
    return;
  }

  for (const fmt of formats) {
    const opt = document.createElement('option');
    opt.value = fmt.format_id;
    opt.textContent = `${fmt.label} (${fmt.ext})`;
    if (selectedId && selectedId === fmt.format_id) {
      opt.selected = true;
    }
    formatSelect.appendChild(opt);
  }
}

function setStatus(message, type = '') {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`.trim();
}

function saveState() {
  chrome.storage.local.set({
    [STATE_KEY]: {
      url: urlInput.value.trim(),
      downloadDir: downloadDirInput.value.trim(),
      start: startInput.value.trim(),
      end: endInput.value.trim(),
      formatId: formatSelect.value,
      formats: formatsCache,
      status: statusEl.textContent,
      statusType: statusEl.classList.contains('error') ? 'error' : statusEl.classList.contains('success') ? 'success' : ''
    }
  });
}

function parseTimeToSeconds(value) {
  const raw = value.trim();
  if (!raw) {
    return null;
  }

  if (/^\d+$/.test(raw)) {
    return Number(raw);
  }

  const parts = raw.split(':');
  if (parts.some((p) => !/^\d+$/.test(p))) {
    throw new Error('시간 형식은 mm:ss 또는 hh:mm:ss 이어야 합니다.');
  }

  if (parts.length === 2) {
    const [mm, ss] = parts.map(Number);
    if (ss >= 60) {
      throw new Error('초(ss)는 0~59 범위여야 합니다.');
    }
    return mm * 60 + ss;
  }

  if (parts.length === 3) {
    const [hh, mm, ss] = parts.map(Number);
    if (mm >= 60 || ss >= 60) {
      throw new Error('mm, ss는 0~59 범위여야 합니다.');
    }
    return hh * 3600 + mm * 60 + ss;
  }

  throw new Error('시간 형식은 mm:ss 또는 hh:mm:ss 이어야 합니다.');
}

function sendProxy(endpoint, payload) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: 'proxyRequest', endpoint, payload }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!response?.ok) {
        reject(new Error(response?.error || '요청 실패'));
        return;
      }
      resolve(response.data);
    });
  });
}

chrome.storage.local.get([STATE_KEY], (result) => {
  const state = result[STATE_KEY] || {};
  urlInput.value = state.url || '';
  downloadDirInput.value = state.downloadDir || '';
  startInput.value = state.start || '';
  endInput.value = state.end || '';

  formatsCache = Array.isArray(state.formats) ? state.formats : [];
  renderFormats(formatsCache, state.formatId || '');

  if (state.status) {
    setStatus(state.status, state.statusType || '');
  }
});

[urlInput, downloadDirInput, startInput, endInput, formatSelect].forEach((el) => {
  el.addEventListener('input', saveState);
  el.addEventListener('change', saveState);
});

loadFormatsBtn.addEventListener('click', async () => {
  const url = urlInput.value.trim();
  if (!url) {
    setStatus('URL을 입력해 주세요.', 'error');
    saveState();
    return;
  }

  setStatus('화질 정보를 불러오는 중...');
  formatSelect.innerHTML = '<option value="">불러오는 중...</option>';
  saveState();

  try {
    const data = await sendProxy('/api/formats', { url });
    const formats = data.formats || [];
    formatsCache = formats;

    if (!formats.length) {
      renderFormats([]);
      setStatus('화질 정보가 없습니다.', 'error');
      saveState();
      return;
    }

    renderFormats(formats);
    setStatus(`화질 ${formats.length}개 로드 완료`, 'success');
    saveState();
  } catch (error) {
    formatsCache = [];
    renderFormats([]);
    setStatus(`실패: ${error.message}`, 'error');
    saveState();
  }
});

downloadBtn.addEventListener('click', async () => {
  const url = urlInput.value.trim();
  const format_id = formatSelect.value;
  const download_dir = downloadDirInput.value.trim();

  if (!url) {
    setStatus('URL을 입력해 주세요.', 'error');
    saveState();
    return;
  }

  if (!format_id) {
    setStatus('화질을 선택해 주세요.', 'error');
    saveState();
    return;
  }

  let start;
  let end;
  try {
    start = parseTimeToSeconds(startInput.value);
    end = parseTimeToSeconds(endInput.value);
  } catch (error) {
    setStatus(`실패: ${error.message}`, 'error');
    saveState();
    return;
  }

  if (start !== null && end !== null && end <= start) {
    setStatus('종료 시간은 시작 시간보다 커야 합니다.', 'error');
    saveState();
    return;
  }

  setStatus('다운로드 요청 중... (팝업이 닫혀도 서버 작업은 계속됩니다)');
  saveState();

  try {
    const data = await sendProxy('/api/download', {
      url,
      format_id,
      start,
      end,
      download_dir: download_dir || null
    });
    setStatus(`완료: ${data.file_name}`, 'success');
    saveState();
  } catch (error) {
    setStatus(`실패: ${error.message}`, 'error');
    saveState();
  }
});
