// options.js - Quản lý cài đặt PageWeave & JobTrack Web Clipper
document.addEventListener('DOMContentLoaded', async () => {
  const serverUrlInput = document.getElementById('serverUrl');
  const apiTokenInput = document.getElementById('apiToken');
  const saveBtn = document.getElementById('saveBtn');
  const testBtn = document.getElementById('testBtn');
  const statusMsg = document.getElementById('statusMsg');

  function showMessage(text, isError = false) {
    statusMsg.textContent = text;
    statusMsg.className = `msg ${isError ? 'msg-error' : 'msg-success'}`;
    statusMsg.style.display = 'block';
  }

  // Tải cài đặt hiện tại từ storage.local (không lưu ở sync và không hardcode token mặc định)
  try {
    const config = await chrome.storage.local.get({
      serverUrl: 'http://127.0.0.1:64366',
      apiToken: ''
    });
    serverUrlInput.value = config.serverUrl || 'http://127.0.0.1:64366';
    apiTokenInput.value = config.apiToken || '';
  } catch (err) {
    console.error('Không thể đọc storage:', err);
  }

  // Lưu cài đặt
  saveBtn.addEventListener('click', async () => {
    const serverUrl = serverUrlInput.value.trim().replace(/\/+$/, '');
    const apiToken = apiTokenInput.value.trim();

    if (!serverUrl) {
      showMessage('Vui lòng nhập URL máy chủ.', true);
      return;
    }

    try {
      await chrome.storage.local.set({ serverUrl, apiToken });
      showMessage('✓ Đã lưu cấu hình an toàn vào bộ nhớ máy!');
      setTimeout(() => {
        statusMsg.style.display = 'none';
      }, 3000);
    } catch (err) {
      showMessage(`Lỗi lưu cấu hình: ${err.message}`, true);
    }
  });

  // Kiểm tra kết nối máy chủ & token
  testBtn.addEventListener('click', async () => {
    const serverUrl = serverUrlInput.value.trim().replace(/\/+$/, '');
    const apiToken = apiTokenInput.value.trim();

    if (!serverUrl) {
      showMessage('Vui lòng nhập URL máy chủ để kiểm tra.', true);
      return;
    }

    testBtn.disabled = true;
    testBtn.textContent = 'Đang kiểm tra…';

    try {
      // 1. Kiểm tra health check
      const healthRes = await fetch(`${serverUrl}/api/health`);
      if (!healthRes.ok) {
        throw new Error(`Máy chủ trả về HTTP ${healthRes.status}`);
      }

      // 2. Nếu có token, kiểm tra extension auth status
      if (apiToken) {
        const authRes = await fetch(`${serverUrl}/api/auth/extension/status`, {
          headers: {
            'Authorization': `Bearer ${apiToken}`
          }
        });

        if (authRes.status === 401 || authRes.status === 403) {
          throw new Error('Token xác thực không hợp lệ hoặc đã hết hạn.');
        }

        const data = await authRes.json();
        if (data.valid) {
          const tierStr = data.isPro ? 'Gói Pro Cao cấp ⭐' : 'Gói Miễn phí';
          showMessage(`✓ Kết nối thành công! Đã xác thực tài khoản (${tierStr}), scopes: [${(data.scopes || []).join(', ')}]`);
          return;
        }
      }

      showMessage('✓ Kết nối máy chủ thành công (API Health OK)! Chưa thiết lập Token tài khoản.');
    } catch (err) {
      showMessage(`✗ Kết nối thất bại: ${err.message}`, true);
    } finally {
      testBtn.disabled = false;
      testBtn.textContent = 'Kiểm tra kết nối';
    }
  });
});
