const urlInput = document.getElementById('url');
const downloadDirInput = document.getElementById('downloadDir');
const formatSelect = document.getElementById('formatSelect');
const startInput = document.getElementById('start');
const endInput = document.getElementById('end');
const loadFormatsBtn = document.getElementById('loadFormats');
const downloadBtn = document.getElementById('download');
const statusEl = document.getElementById('status');

chrome.storage.local.get(['downloadDir'], (result) => {
  if (result.downloadDir) {
    downloadDirInput.value = result.downloadDir;
  }
});

downloadDirInput.addEventListener('change', () => {
  const value = downloadDirInput.value.trim();
  chrome.storage.local.set({ downloadDir: value });
});

function setStatus(message, type = '') {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`.trim();
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

loadFormatsBtn.addEventListener('click', async () => {
  const url = urlInput.value.trim();
  if (!url) {
    setStatus('URL을 입력해 주세요.', 'error');
    return;
  }

  setStatus('화질 정보를 불러오는 중...');
  formatSelect.innerHTML = '<option value="">불러오는 중...</option>';

  try {
    const data = await sendProxy('/api/formats', { url });
    const formats = data.formats || [];

    if (!formats.length) {
      formatSelect.innerHTML = '<option value="">사용 가능한 화질이 없습니다</option>';
      setStatus('화질 정보가 없습니다.', 'error');
      return;
    }

    formatSelect.innerHTML = '';
    for (const fmt of formats) {
      const opt = document.createElement('option');
      opt.value = fmt.format_id;
      opt.textContent = `${fmt.label} (${fmt.ext})`;
      formatSelect.appendChild(opt);
    }

    setStatus(`화질 ${formats.length}개 로드 완료`, 'success');
  } catch (error) {
    formatSelect.innerHTML = '<option value="">불러오기 실패</option>';
    setStatus(`실패: ${error.message}`, 'error');
  }
});

downloadBtn.addEventListener('click', async () => {
  const url = urlInput.value.trim();
  const format_id = formatSelect.value;
  const download_dir = downloadDirInput.value.trim();
  const start = startInput.value === '' ? null : Number(startInput.value);
  const end = endInput.value === '' ? null : Number(endInput.value);

  if (!url) {
    setStatus('URL을 입력해 주세요.', 'error');
    return;
  }

  if (!format_id) {
    setStatus('화질을 선택해 주세요.', 'error');
    return;
  }

  if (start !== null && end !== null && end <= start) {
    setStatus('종료 시간은 시작 시간보다 커야 합니다.', 'error');
    return;
  }

  setStatus('다운로드 요청 중...');

  try {
    const data = await sendProxy('/api/download', {
      url,
      format_id,
      start,
      end,
      download_dir: download_dir || null
    });
    setStatus(`완료: ${data.file_name}`, 'success');
  } catch (error) {
    setStatus(`실패: ${error.message}`, 'error');
  }
});
