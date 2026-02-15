chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== 'proxyRequest') return;

  const { endpoint, payload } = message;

  fetch(`http://localhost:8787${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
    .then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        sendResponse({ ok: false, error: data.detail || '서버 요청 실패' });
        return;
      }
      sendResponse({ ok: true, data });
    })
    .catch((err) => sendResponse({ ok: false, error: err.message }));

  return true;
});
