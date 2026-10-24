// PageWeave — Universal Web Data Assistant & JobTrack Pro Popup Script
document.addEventListener('DOMContentLoaded', async () => {
  // Elements: Header & Status
  const userTierBadge = document.getElementById('userTierBadge');
  const connStatus = document.getElementById('connStatus');
  const rescanBtn = document.getElementById('rescanBtn');
  const alertSuccess = document.getElementById('alertSuccess');
  const alertError = document.getElementById('alertError');
  const alertInfo = document.getElementById('alertInfo');

  // Elements: Capture Tab
  const srcBtnTable = document.getElementById('srcBtnTable');
  const srcBtnList = document.getElementById('srcBtnList');
  const srcBtnSelection = document.getElementById('srcBtnSelection');
  const srcBtnMeta = document.getElementById('srcBtnMeta');
  const countTables = document.getElementById('countTables');
  const countLists = document.getElementById('countLists');
  const countSelection = document.getElementById('countSelection');
  const countMeta = document.getElementById('countMeta');
  const previewLabel = document.getElementById('previewLabel');
  const previewMeta = document.getElementById('previewMeta');
  const previewContainer = document.getElementById('previewContainer');
  const targetDatasetSelect = document.getElementById('targetDatasetSelect');
  const newDatasetName = document.getElementById('newDatasetName');
  const saveDatasetBtn = document.getElementById('saveDatasetBtn');
  const exportQuickCsvBtn = document.getElementById('exportQuickCsvBtn');

  // Elements: Datasets Tab
  const datasetsListContainer = document.getElementById('datasetsListContainer');
  const refreshDatasetsBtn = document.getElementById('refreshDatasetsBtn');
  const datasetDetailsBox = document.getElementById('datasetDetailsBox');
  const detailDatasetName = document.getElementById('detailDatasetName');
  const detailDatasetMeta = document.getElementById('detailDatasetMeta');
  const exportDatasetCsvBtn = document.getElementById('exportDatasetCsvBtn');
  const closeDetailBtn = document.getElementById('closeDetailBtn');

  // Elements: JobTrack Tab
  const companyInput = document.getElementById('company');
  const positionInput = document.getElementById('position');
  const salaryInput = document.getElementById('salary');
  const workModeSelect = document.getElementById('workMode');
  const locationInput = document.getElementById('location');
  const statusSelect = document.getElementById('status');
  const notesInput = document.getElementById('notes');
  const urlInput = document.getElementById('url');
  const saveJobTrackBtn = document.getElementById('saveJobTrackBtn');
  const autofillBtn = document.getElementById('autofillBtn');
  const runAtsBtn = document.getElementById('runAtsBtn');
  const atsResultBox = document.getElementById('atsResultBox');
  const atsScoreValue = document.getElementById('atsScoreValue');
  const atsFitLabel = document.getElementById('atsFitLabel');
  const atsMatchedChips = document.getElementById('atsMatchedChips');
  const atsMissingChips = document.getElementById('atsMissingChips');
  const genCoverLetterBtn = document.getElementById('genCoverLetterBtn');
  const coverLetterBox = document.getElementById('coverLetterBox');
  const coverLetterText = document.getElementById('coverLetterText');
  const shortPitchText = document.getElementById('shortPitchText');
  const copyCoverLetterBtn = document.getElementById('copyCoverLetterBtn');
  const copyPitchBtn = document.getElementById('copyPitchBtn');

  // Elements: Account & Pro Tab
  const accountTierLabel = document.getElementById('accountTierLabel');
  const quotaCapture = document.getElementById('quotaCapture');
  const quotaAi = document.getElementById('quotaAi');
  const quotaDatasets = document.getElementById('quotaDatasets');
  const pairAccountBtn = document.getElementById('pairAccountBtn');
  const openSettingsBtn = document.getElementById('openSettingsBtn');
  const proPlanSelect = document.getElementById('proPlanSelect');
  const checkoutNotice = document.getElementById('checkoutNotice');
  const orderStatusBadge = document.getElementById('orderStatusBadge');
  const qrAmount = document.getElementById('qrAmount');
  const qrTransferCode = document.getElementById('qrTransferCode');
  const checkPaymentStatusBtn = document.getElementById('checkPaymentStatusBtn');

  // State
  let serverConfig = { serverUrl: 'http://127.0.0.1:64366', apiToken: '' };
  let extractedPageData = null;
  let activeSourceType = 'table';
  let activeTableIndex = 0;
  let currentPreviewRows = [];
  let currentPreviewHeaders = [];
  let userDatasets = [];
  let selectedDetailDatasetId = null;

  // 1. Tải cấu hình từ storage.local (không hardcode token)
  try {
    const stored = await chrome.storage.local.get({
      serverUrl: 'http://127.0.0.1:64366',
      apiToken: ''
    });
    serverConfig = stored;
  } catch (err) {
    console.error('Không thể đọc storage:', err);
  }

  // Helper alerts
  function showAlert(element, text, duration = 4000) {
    element.textContent = text;
    element.style.display = 'block';
    if (duration > 0) {
      setTimeout(() => { element.style.display = 'none'; }, duration);
    }
  }

  function hideAlerts() {
    alertSuccess.style.display = 'none';
    alertError.style.display = 'none';
    alertInfo.style.display = 'none';
  }

  // 2. Chuyển Tab
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      const pane = document.getElementById(targetId);
      if (pane) pane.classList.add('active');

      if (targetId === 'tab-datasets') {
        loadUserDatasets();
      } else if (targetId === 'tab-account') {
        loadAccountAndCheckout();
      }
    });
  });

  // 3. Kiểm tra trạng thái máy chủ & Token
  async function checkServerConnection() {
    try {
      const res = await fetch(`${serverConfig.serverUrl}/api/health`);
      if (!res.ok) throw new Error('Máy chủ không phản hồi.');

      if (serverConfig.apiToken) {
        const authRes = await fetch(`${serverConfig.serverUrl}/api/auth/extension/status`, {
          headers: { 'Authorization': `Bearer ${serverConfig.apiToken}` }
        });

        if (authRes.ok) {
          const authData = await authRes.json();
          connStatus.textContent = 'Đã kết nối';
          connStatus.style.background = '#dcfce7';
          connStatus.style.color = '#166534';

          if (authData.isPro) {
            userTierBadge.textContent = '⭐ PRO';
            userTierBadge.style.background = '#fef08a';
            userTierBadge.style.color = '#854d0e';
            accountTierLabel.textContent = 'Gói Pro Cao cấp';
          } else {
            userTierBadge.textContent = 'FREE';
            userTierBadge.style.background = '#e2e8f0';
            userTierBadge.style.color = '#475569';
            accountTierLabel.textContent = 'Gói Miễn phí';
          }
          return;
        }
      }

      connStatus.textContent = 'Chưa kết nối';
      connStatus.style.background = '#fee2e2';
      connStatus.style.color = '#991b1b';
    } catch {
      connStatus.textContent = 'Mất kết nối';
      connStatus.style.background = '#fee2e2';
      connStatus.style.color = '#991b1b';
    }
  }

  // Helper: đảm bảo content script đã được nạp trên tab đang xem
  async function ensureContentScriptInjected(tabId) {
    try {
      const ping = await chrome.tabs.sendMessage(tabId, { action: 'PING' }).catch(() => null);
      if (ping && ping.pong) return true;

      if (chrome.scripting && chrome.scripting.executeScript) {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ['content.js']
        });
        await new Promise(resolve => setTimeout(resolve, 150));
        return true;
      }
    } catch (e) {
      console.warn('Không thể nạp tự động content script:', e);
    }
    return false;
  }

  // 4. Bóc tách dữ liệu từ Content Script
  async function scanPageData() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) {
        renderEmptyPreview('Không tìm thấy tab trình duyệt đang hoạt động.');
        return false;
      }

      // Kiểm tra URL hệ thống bị Chrome chặn content script
      const tabUrl = tab.url || '';
      if (/^(chrome|edge|about|chrome-extension|view-source):/i.test(tabUrl)) {
        renderEmptyPreview('Trình duyệt không cho phép trích xuất trên các trang hệ thống nội bộ. Hãy mở trang web thông thường.');
        return false;
      }

      // Thử gửi thông điệp bóc tách dữ liệu
      let response = await chrome.tabs.sendMessage(tab.id, { action: 'EXTRACT_ALL_PAGE_DATA' }).catch(() => null);

      // Nếu chưa có content script (tab mở trước khi nạp extension), chủ động inject và gọi lại
      if (!response || !response.success || !response.data) {
        await ensureContentScriptInjected(tab.id);
        response = await chrome.tabs.sendMessage(tab.id, { action: 'EXTRACT_ALL_PAGE_DATA' }).catch(() => null);
      }

      if (!response || !response.success || !response.data) {
        renderEmptyPreview('Chưa kết nối được với trang web. Vui lòng F5 (tải lại) tab trang web này rồi bấm "Quét lại".');
        return false;
      }

      extractedPageData = response.data;
      const { tables, repeatingLists, selectedText, metadata, jobPosting } = extractedPageData;

      // Cập nhật số lượng
      countTables.textContent = `${tables.length} bảng`;
      countLists.textContent = `${repeatingLists.length} danh sách`;
      countSelection.textContent = selectedText ? `${selectedText.slice(0, 15)}…` : 'Trống';
      if (countMeta) {
        countMeta.textContent = (jobPosting && (jobPosting.position || jobPosting.company)) ? 'Phát hiện tin' : 'Toàn trang';
      }

      // Điền sẵn tab JobTrack
      if (jobPosting) {
        companyInput.value = jobPosting.company || '';
        positionInput.value = jobPosting.position || '';
        salaryInput.value = jobPosting.salary || '';
        workModeSelect.value = jobPosting.workMode || 'On-site';
        locationInput.value = jobPosting.location || '';
        notesInput.value = jobPosting.notes || '';
        urlInput.value = jobPosting.url || tab.url || '';
      }

      // Tự động chọn nguồn dữ liệu tốt nhất
      if (tables.length > 0) {
        selectSource('table', 0);
      } else if (repeatingLists.length > 0) {
        selectSource('list', 0);
      } else if (selectedText) {
        selectSource('selection');
      } else {
        selectSource('meta');
      }

      return true;
    } catch (err) {
      console.warn('Lỗi khi bóc tách trang:', err);
      renderEmptyPreview(`Lỗi khi bóc tách trang: ${err.message}`);
      return false;
    }
  }

  // 5. Chuyển đổi nguồn dữ liệu Preview
  function selectSource(type, index = 0) {
    activeSourceType = type;
    activeTableIndex = index;

    [srcBtnTable, srcBtnList, srcBtnSelection, srcBtnMeta].forEach(b => b.classList.remove('active'));

    if (type === 'table') {
      srcBtnTable.classList.add('active');
      renderTableSource(index);
    } else if (type === 'list') {
      srcBtnList.classList.add('active');
      renderListSource(index);
    } else if (type === 'selection') {
      srcBtnSelection.classList.add('active');
      renderSelectionSource();
    } else if (type === 'meta') {
      srcBtnMeta.classList.add('active');
      renderMetaSource();
    }
  }

  function renderTableSource(idx) {
    if (!extractedPageData || !extractedPageData.tables[idx]) {
      renderEmptyPreview('Không tìm thấy bảng HTML trên trang này.');
      return;
    }
    const t = extractedPageData.tables[idx];
    previewLabel.textContent = `Bảng HTML: ${t.title || `Bảng ${idx + 1}`} (${t.rowCount} dòng):`;
    renderTabularPreview(t.headers, t.rows);
  }

  function renderListSource(idx) {
    if (!extractedPageData || !extractedPageData.repeatingLists[idx]) {
      renderEmptyPreview('Không tìm thấy danh sách lặp trên trang.');
      return;
    }
    const l = extractedPageData.repeatingLists[idx];
    previewLabel.textContent = `Danh sách: ${l.title} (${l.rowCount} mục):`;
    renderTabularPreview(l.headers, l.rows);
  }

  function renderSelectionSource() {
    if (!extractedPageData || !extractedPageData.selectedText) {
      renderEmptyPreview('Hãy bôi đen một đoạn văn bản bất kỳ trên trang web.');
      return;
    }
    previewLabel.textContent = 'Đoạn bôi chọn từ trang:';
    const text = extractedPageData.selectedText;
    const headers = ['Tiêu đề trang', 'Nội dung trích xuất', 'Đường dẫn'];
    const rows = [{
      'Tiêu đề trang': extractedPageData.title,
      'Nội dung trích xuất': text,
      'Đường dẫn': extractedPageData.url
    }];
    renderTabularPreview(headers, rows);
  }

  function renderMetaSource() {
    if (!extractedPageData) {
      renderEmptyPreview('Chưa có thông tin trang.');
      return;
    }

    const hasJob = extractedPageData.jobPosting && (extractedPageData.jobPosting.position || extractedPageData.jobPosting.company);
    previewLabel.textContent = hasJob ? 'Dữ liệu tin tuyển dụng bóc tách được:' : 'Thông tin trang (Metadata):';

    const headers = ['Trường', 'Giá trị'];
    const rows = [];

    if (hasJob) {
      const j = extractedPageData.jobPosting;
      rows.push({ 'Trường': 'Vị trí công việc', 'Giá trị': j.position || 'Chưa rõ' });
      rows.push({ 'Trường': 'Công ty / Nhà tuyển dụng', 'Giá trị': j.company || 'Chưa rõ' });
      if (j.salary) rows.push({ 'Trường': 'Mức lương', 'Giá trị': j.salary });
      if (j.location) rows.push({ 'Trường': 'Địa điểm', 'Giá trị': j.location });
      if (j.workMode) rows.push({ 'Trường': 'Hình thức', 'Giá trị': j.workMode });
      if (j.notes) rows.push({ 'Trường': 'Tóm tắt mô tả', 'Giá trị': j.notes.slice(0, 150) + (j.notes.length > 150 ? '…' : '') });
    }

    rows.push({ 'Trường': 'Tiêu đề trang', 'Giá trị': extractedPageData.title || '' });
    if (extractedPageData.metadata?.description) {
      rows.push({ 'Trường': 'Mô tả SEO', 'Giá trị': extractedPageData.metadata.description });
    }
    rows.push({ 'Trường': 'URL', 'Giá trị': extractedPageData.url || '' });
    rows.push({ 'Trường': 'Thời gian trích xuất', 'Giá trị': new Date(extractedPageData.timestamp).toLocaleString('vi-VN') });

    renderTabularPreview(headers, rows);
  }

  function renderTabularPreview(headers, rows) {
    currentPreviewHeaders = headers;
    currentPreviewRows = rows;

    if (!rows || rows.length === 0) {
      renderEmptyPreview('Bảng không chứa dữ liệu.');
      return;
    }

    let html = '<table class="preview-table"><thead><tr>';
    headers.forEach(h => {
      html += `<th>${escapeHtml(h)}</th>`;
    });
    html += '</tr></thead><tbody>';

    const displayRows = rows.slice(0, 15);
    displayRows.forEach(row => {
      html += '<tr>';
      headers.forEach(h => {
        html += `<td>${escapeHtml(String(row[h] || ''))}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table>';

    if (rows.length > 15) {
      html += `<div style="padding: 6px; text-align: center; font-size: 10px; color: #64748b; background: #f8fafc;">Hiển thị 15 / ${rows.length} dòng. Bấm "Tải CSV" để tải trọn bộ.</div>`;
    }

    previewContainer.innerHTML = html;
  }

  function renderEmptyPreview(msg) {
    currentPreviewHeaders = [];
    currentPreviewRows = [];
    previewContainer.innerHTML = `<div style="padding: 20px; text-align: center; color: #94a3b8; font-size: 11px;">${escapeHtml(msg)}</div>`;
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // 6. Tải và nạp danh sách Datasets người dùng
  async function loadUserDatasets() {
    if (!serverConfig.apiToken) {
      datasetsListContainer.innerHTML = `
        <div style="padding: 16px; text-align: center; color: #64748b; font-size: 11px;">
          Chưa kết nối tài khoản. Vui lòng vào tab <b>Gói Pro</b> và bấm <b>Kết nối với Web App</b>.
        </div>`;
      return;
    }

    try {
      const res = await fetch(`${serverConfig.serverUrl}/api/datasets`, {
        headers: { 'Authorization': `Bearer ${serverConfig.apiToken}` }
      });

      if (!res.ok) throw new Error('Không thể tải bộ dữ liệu.');
      userDatasets = await res.json();

      // Cập nhật select trong tab Capture
      targetDatasetSelect.innerHTML = '<option value="new">+ Tạo bộ dữ liệu mới…</option>';
      userDatasets.forEach(ds => {
        const opt = document.createElement('option');
        opt.value = ds.id;
        opt.textContent = `${ds.name} (${ds.recordCount || 0} dòng)`;
        targetDatasetSelect.appendChild(opt);
      });

      // Cập nhật danh sách trong tab Datasets
      if (userDatasets.length === 0) {
        datasetsListContainer.innerHTML = `
          <div style="padding: 20px; text-align: center; color: #94a3b8; font-size: 11px;">
            Bạn chưa có bộ dữ liệu nào. Hãy quét một trang web và bấm <b>Lưu dữ liệu</b>!
          </div>`;
        return;
      }

      let html = '';
      userDatasets.forEach(ds => {
        html += `
          <div class="dataset-item" data-id="${ds.id}">
            <div class="dataset-item-header">
              <span>${escapeHtml(ds.name)}</span>
              <span style="font-size: 10px; padding: 2px 5px; background: #eff6ff; color: #1e40af; border-radius: 4px;">${ds.recordCount || 0} dòng</span>
            </div>
            <div class="dataset-item-meta">
              Danh mục: ${escapeHtml(ds.category)} • Cập nhật: ${new Date(ds.updatedAt).toLocaleDateString('vi-VN')}
            </div>
          </div>`;
      });
      datasetsListContainer.innerHTML = html;

      // Click xem chi tiết
      document.querySelectorAll('.dataset-item').forEach(item => {
        item.addEventListener('click', () => {
          const id = item.getAttribute('data-id');
          showDatasetDetails(id);
        });
      });
    } catch (err) {
      datasetsListContainer.innerHTML = `<div style="padding: 12px; color: #991b1b; font-size: 11px;">Lỗi: ${escapeHtml(err.message)}</div>`;
    }
  }

  function showDatasetDetails(id) {
    const ds = userDatasets.find(d => d.id === id);
    if (!ds) return;
    selectedDetailDatasetId = id;
    detailDatasetName.textContent = ds.name;
    detailDatasetMeta.textContent = `Danh mục: ${ds.category} • Số cột: ${ds.columns?.length || 0} • Số bản ghi: ${ds.recordCount || 0}`;
    datasetDetailsBox.style.display = 'block';
  }

  closeDetailBtn?.addEventListener('click', () => {
    datasetDetailsBox.style.display = 'none';
    selectedDetailDatasetId = null;
  });

  // Tải CSV dataset từ server
  exportDatasetCsvBtn?.addEventListener('click', async () => {
    if (!selectedDetailDatasetId || !serverConfig.apiToken) return;
    try {
      const res = await fetch(`${serverConfig.serverUrl}/api/datasets/${selectedDetailDatasetId}/export`, {
        headers: { 'Authorization': `Bearer ${serverConfig.apiToken}` }
      });
      if (!res.ok) throw new Error('Không thể xuất file CSV.');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dataset_${selectedDetailDatasetId.slice(0, 8)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Lỗi xuất file: ${err.message}`);
    }
  });

  // 7. Lưu dữ liệu trích xuất vào Dataset
  targetDatasetSelect.addEventListener('change', () => {
    if (targetDatasetSelect.value === 'new') {
      newDatasetName.style.display = 'block';
      newDatasetName.focus();
    } else {
      newDatasetName.style.display = 'none';
    }
  });

  saveDatasetBtn.addEventListener('click', async () => {
    if (currentPreviewRows.length === 0) {
      showAlert(alertError, 'Không có dữ liệu để lưu.');
      return;
    }

    if (!serverConfig.apiToken) {
      showAlert(alertError, 'Vui lòng kết nối tài khoản tại tab Gói Pro trước.');
      return;
    }

    saveDatasetBtn.disabled = true;
    saveDatasetBtn.textContent = 'Đang lưu…';
    hideAlerts();

    try {
      let datasetId = targetDatasetSelect.value;

      // 1. Nếu tạo mới
      if (datasetId === 'new') {
        const name = newDatasetName.value.trim() || extractedPageData?.title || `Bộ dữ liệu ${new Date().toLocaleDateString('vi-VN')}`;
        const columns = currentPreviewHeaders.map(h => ({
          key: h.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase().slice(0, 32),
          label: h,
          type: 'text'
        }));

        const createRes = await fetch(`${serverConfig.serverUrl}/api/datasets`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serverConfig.apiToken}`
          },
          body: JSON.stringify({
            name,
            category: 'custom',
            columns
          })
        });

        if (!createRes.ok) throw new Error('Không thể tạo bộ dữ liệu mới.');
        const newDs = await createRes.json();
        datasetId = newDs.id;
      }

      // 2. Chèn các bản ghi
      const records = currentPreviewRows.map(row => ({
        data: row,
        sourceUrl: extractedPageData?.url || window.location.href,
        sourceTitle: extractedPageData?.title || '',
        capturedAt: new Date().toISOString()
      }));

      const addRes = await fetch(`${serverConfig.serverUrl}/api/datasets/${datasetId}/records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serverConfig.apiToken}`
        },
        body: JSON.stringify({ records, dedup: true })
      });

      if (!addRes.ok) throw new Error('Không thể lưu bản ghi vào bộ dữ liệu.');
      const result = await addRes.json();

      showAlert(alertSuccess, `✓ Đã lưu thành công ${result.inserted} dòng (bỏ qua ${result.skippedDuplicates} dòng trùng).`);
      loadUserDatasets();
    } catch (err) {
      showAlert(alertError, `Lỗi: ${err.message}`);
    } finally {
      saveDatasetBtn.disabled = false;
      saveDatasetBtn.textContent = '💾 Lưu dữ liệu';
    }
  });

  // 8. Xuất nhanh CSV trực tiếp trên máy client
  exportQuickCsvBtn.addEventListener('click', () => {
    if (currentPreviewRows.length === 0) {
      showAlert(alertError, 'Không có dữ liệu để xuất file.');
      return;
    }

    // CSV Formula Injection Sanitizer
    function sanitize(val) {
      if (val === undefined || val === null) return '';
      let s = String(val);
      if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
      if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
      return s;
    }

    const headerLine = currentPreviewHeaders.map(h => sanitize(h)).join(',');
    const rowLines = currentPreviewRows.map(r => {
      return currentPreviewHeaders.map(h => sanitize(r[h])).join(',');
    });

    // UTF-8 BOM
    const csvContent = '\uFEFF' + [headerLine, ...rowLines].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeTitle = (extractedPageData?.title || 'pageweave_export').replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF]/g, '_').slice(0, 30);
    a.download = `${safeTitle}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showAlert(alertSuccess, '✓ Đã tải xuống file CSV an toàn thành công!');
  });

  // 9. JobTrack Core: Lưu vào JobTrack Kanban
  saveJobTrackBtn.addEventListener('click', async () => {
    const company = companyInput.value.trim();
    const position = positionInput.value.trim();

    if (!company || !position) {
      showAlert(alertError, 'Vui lòng nhập tên công ty và vị trí.');
      return;
    }

    saveJobTrackBtn.disabled = true;
    saveJobTrackBtn.textContent = 'Đang lưu…';
    hideAlerts();

    try {
      const payload = {
        company,
        position,
        salary: salaryInput.value.trim() || null,
        workMode: workModeSelect.value,
        location: locationInput.value.trim() || null,
        status: statusSelect.value,
        notes: notesInput.value.trim() || null,
        url: urlInput.value.trim() || null
      };

      const res = await fetch(`${serverConfig.serverUrl}/api/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serverConfig.apiToken}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Lỗi khi lưu tin vào JobTrack.');
      }

      showAlert(alertSuccess, '✓ Đã lưu tin tuyển dụng vào JobTrack thành công!');
    } catch (err) {
      showAlert(alertError, `✗ ${err.message}`);
    } finally {
      saveJobTrackBtn.disabled = false;
      saveJobTrackBtn.textContent = '💾 Lưu vào JobTrack';
    }
  });

  // Auto-Apply
  autofillBtn.addEventListener('click', async () => {
    autofillBtn.disabled = true;
    autofillBtn.textContent = 'Đang điền…';
    hideAlerts();

    try {
      const profileRes = await fetch(`${serverConfig.serverUrl}/api/profile`, {
        headers: { 'Authorization': `Bearer ${serverConfig.apiToken}` }
      });

      if (!profileRes.ok) {
        throw new Error('Chưa thiết lập hồ sơ ứng viên trên Web UI (/api/profile).');
      }

      const profile = await profileRes.json();
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error('Không tìm thấy tab hiện tại.');

      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'AUTOFILL_FORM',
        profile
      });

      if (response && response.success) {
        showAlert(alertSuccess, `✓ Đã tự động điền ${response.count} trường thông tin.`);
      }
    } catch (err) {
      showAlert(alertError, `Auto-Apply: ${err.message}`);
    } finally {
      autofillBtn.disabled = false;
      autofillBtn.textContent = '⚡ Auto-Apply';
    }
  });

  // ATS Match
  runAtsBtn.addEventListener('click', async () => {
    const position = positionInput.value.trim();
    if (!position) {
      showAlert(alertError, 'Vui lòng nhập vị trí tuyển dụng trước khi chấm điểm ATS.');
      return;
    }

    runAtsBtn.disabled = true;
    runAtsBtn.textContent = 'Đang chấm điểm…';
    hideAlerts();

    try {
      const res = await fetch(`${serverConfig.serverUrl}/api/ai/pro/ats-match`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serverConfig.apiToken}`
        },
        body: JSON.stringify({
          company: companyInput.value.trim(),
          position,
          notes: notesInput.value.trim()
        })
      });

      if (!res.ok) throw new Error('Không thể chấm điểm ATS.');
      const data = await res.json();

      atsResultBox.style.display = 'block';
      atsScoreValue.textContent = `${data.score}%`;
      atsFitLabel.textContent = data.overallFit;

      atsMatchedChips.innerHTML = (data.matchedSkills || []).map(s => `<span class="chip chip-matched">✓ ${escapeHtml(s)}</span>`).join('') || '<span style="font-size:10px;color:#94a3b8;">Không có</span>';
      atsMissingChips.innerHTML = (data.missingSkills || []).map(s => `<span class="chip chip-missing">⚠ ${escapeHtml(s)}</span>`).join('') || '<span style="font-size:10px;color:#94a3b8;">Đã đủ</span>';
    } catch (err) {
      showAlert(alertError, `Lỗi ATS: ${err.message}`);
    } finally {
      runAtsBtn.disabled = false;
      runAtsBtn.textContent = '🎯 Chấm điểm ATS';
    }
  });

  // AI Cover Letter
  genCoverLetterBtn.addEventListener('click', async () => {
    const position = positionInput.value.trim();
    if (!position) {
      showAlert(alertError, 'Vui lòng nhập vị trí tuyển dụng trước khi tạo thư.');
      return;
    }

    genCoverLetterBtn.disabled = true;
    genCoverLetterBtn.textContent = 'Đang tạo…';
    hideAlerts();

    try {
      const res = await fetch(`${serverConfig.serverUrl}/api/ai/pro/cover-letter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serverConfig.apiToken}`
        },
        body: JSON.stringify({
          company: companyInput.value.trim(),
          position,
          notes: notesInput.value.trim(),
          language: 'vi'
        })
      });

      if (!res.ok) throw new Error('Không thể tạo thư xin việc.');
      const data = await res.json();

      coverLetterBox.style.display = 'block';
      coverLetterText.value = data.coverLetter || '';
      shortPitchText.value = data.shortPitch || '';
    } catch (err) {
      showAlert(alertError, `Lỗi tạo thư: ${err.message}`);
    } finally {
      genCoverLetterBtn.disabled = false;
      genCoverLetterBtn.textContent = '✍️ Tạo Thư & InMail';
    }
  });

  copyCoverLetterBtn?.addEventListener('click', () => {
    navigator.clipboard.writeText(coverLetterText.value);
    showAlert(alertSuccess, '✓ Đã sao chép thư xin việc vào clipboard!');
  });

  copyPitchBtn?.addEventListener('click', () => {
    navigator.clipboard.writeText(shortPitchText.value);
    showAlert(alertSuccess, '✓ Đã sao chép tin nhắn HR vào clipboard!');
  });

  function renderOrderStatus(order) {
    if (!orderStatusBadge) return;
    if (!order || !order.status) {
      orderStatusBadge.style.display = 'none';
      return;
    }
    orderStatusBadge.style.display = 'block';
    if (order.status === 'paid') {
      orderStatusBadge.style.background = '#ecfdf5';
      orderStatusBadge.style.color = '#047857';
      orderStatusBadge.textContent = '✓ Đã thanh toán — Gói PRO đã kích hoạt';
    } else if (order.status === 'failed') {
      orderStatusBadge.style.background = '#fef2f2';
      orderStatusBadge.style.color = '#b91c1c';
      orderStatusBadge.textContent = '✕ Thanh toán thất bại: Số tiền chuyển chưa đủ';
    } else if (order.status === 'expired') {
      orderStatusBadge.style.background = '#f1f5f9';
      orderStatusBadge.style.color = '#64748b';
      orderStatusBadge.textContent = '⌛ Đơn hàng đã hết hạn — Vui lòng tạo đơn mới';
    } else if (order.status === 'pending') {
      orderStatusBadge.style.background = '#eff6ff';
      orderStatusBadge.style.color = '#1d4ed8';
      orderStatusBadge.textContent = '⏳ Chờ thanh toán qua ngân hàng';
    } else if (order.status === 'cancelled') {
      orderStatusBadge.style.background = '#f1f5f9';
      orderStatusBadge.style.color = '#64748b';
      orderStatusBadge.textContent = '✕ Đơn hàng đã hủy';
    }
  }

  async function loadPlans() {
    try {
      const res = await fetch(`${serverConfig.serverUrl}/api/pro/plans`, {
        headers: { 'Authorization': `Bearer ${serverConfig.apiToken}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      if (!Array.isArray(data.plans)) return;
      const currentSelected = proPlanSelect.value;
      proPlanSelect.innerHTML = '';
      for (const p of data.plans) {
        const opt = document.createElement('option');
        opt.value = p.plan;
        const formattedAmount = `${Number(p.amount).toLocaleString('vi-VN')}đ`;
        if (p.plan === 'monthly') {
          opt.textContent = `Gói 1 Tháng — ${formattedAmount}`;
        } else if (p.plan === 'quarterly') {
          opt.textContent = `Gói 3 Tháng — ${formattedAmount} (Tiết kiệm 16%)`;
        } else if (p.plan === 'yearly') {
          opt.textContent = `Gói 1 Năm — ${formattedAmount} (Tiết kiệm 33%)`;
        } else {
          opt.textContent = `${p.plan} — ${formattedAmount}`;
        }
        if (p.plan === currentSelected || (!currentSelected && p.plan === 'quarterly')) {
          opt.selected = true;
        }
        proPlanSelect.appendChild(opt);
      }
    } catch (err) {
      console.warn('Lỗi tải danh sách gói:', err);
    }
  }

  async function loadUsageSummary() {
    const usageRes = await fetch(`${serverConfig.serverUrl}/api/usage/summary`, {
      headers: { 'Authorization': `Bearer ${serverConfig.apiToken}` }
    });
    if (usageRes.ok) {
      const u = await usageRes.json();
      quotaCapture.textContent = `Dữ liệu web: ${u.dataCaptureUsed.toLocaleString('vi-VN')} / ${u.dataCaptureLimit.toLocaleString('vi-VN')} dòng/tháng`;
      quotaAi.textContent = `Lượt AI: ${u.aiTransformUsed} / ${u.aiTransformLimit} lượt/tháng`;
      quotaDatasets.textContent = `Bộ dữ liệu: ${u.datasetsCount} / ${u.datasetsLimit} bảng`;
    }
  }

  async function loadAccountAndCheckout() {
    if (!serverConfig.apiToken) return;

    try {
      await loadUsageSummary();
      await loadPlans();

      const stored = await chrome.storage.local.get(['currentOrderId']);
      if (stored.currentOrderId) {
        const orderRes = await fetch(`${serverConfig.serverUrl}/api/pro/orders/${stored.currentOrderId}`, {
          headers: { 'Authorization': `Bearer ${serverConfig.apiToken}` }
        });
        if (orderRes.ok) {
          const order = await orderRes.json();
          renderOrderStatus(order);
          qrAmount.textContent = `${Number(order.amount).toLocaleString('vi-VN')} đ`;
          qrTransferCode.textContent = String(order.transferCode);
          return;
        }
      }

      await refreshCheckout();
    } catch (err) {
      console.warn('Lỗi tải quota:', err);
    }
  }

  const CHECKOUT_UNAVAILABLE_NOTICE = 'Không tạo được đơn thanh toán. Vui lòng thử lại sau.';

  function resetCheckoutSummary() {
    qrAmount.textContent = '—';
    qrTransferCode.textContent = '—';
    renderOrderStatus(null);
  }

  function checkoutNoticeText(checkout) {
    const serverNotice = typeof checkout.testNotice === 'string' ? checkout.testNotice.trim() : '';
    if (serverNotice) return serverNotice;
    const mode = typeof checkout.mode === 'string' ? checkout.mode.trim() : '';
    if (mode === 'test') return 'Máy chủ báo chế độ thử nghiệm.';
    if (mode) return `Máy chủ báo chế độ thanh toán: ${mode}.`;
    return 'Máy chủ chưa trả về thông tin chế độ thanh toán.';
  }

  async function refreshCheckout() {
    try {
      const plan = proPlanSelect.value;
      const res = await fetch(`${serverConfig.serverUrl}/api/pro/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serverConfig.apiToken}`
        },
        body: JSON.stringify({ plan })
      });

      if (!res.ok) {
        resetCheckoutSummary();
        checkoutNotice.textContent = CHECKOUT_UNAVAILABLE_NOTICE;
        return;
      }

      const checkout = await res.json();
      checkoutNotice.textContent = checkoutNoticeText(checkout);
      const amount = Number(checkout.amount);
      qrAmount.textContent = Number.isFinite(amount) ? `${amount.toLocaleString('vi-VN')} đ` : '—';
      qrTransferCode.textContent = checkout.transferCode ? String(checkout.transferCode) : '—';
      if (checkout.orderId) {
        await chrome.storage.local.set({ currentOrderId: checkout.orderId });
        renderOrderStatus({ status: 'pending' });
      }
    } catch (err) {
      console.warn('Lỗi checkout:', err);
      resetCheckoutSummary();
      checkoutNotice.textContent = CHECKOUT_UNAVAILABLE_NOTICE;
    }
  }

  proPlanSelect.addEventListener('change', refreshCheckout);

  pairAccountBtn.addEventListener('click', async () => {
    pairAccountBtn.disabled = true;
    pairAccountBtn.textContent = 'Đang ghép nối…';
    hideAlerts();

    try {
      const res = await fetch(`${serverConfig.serverUrl}/api/auth/extension/pair`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'http://127.0.0.1:64364'
        },
        credentials: 'include',
        body: JSON.stringify({ client: 'PageWeave Side Panel' })
      });

      if (res.ok) {
        const data = await res.json();
        serverConfig.apiToken = data.token;
        await chrome.storage.local.set({ apiToken: data.token });
        showAlert(alertSuccess, '✓ Ghép nối tài khoản thành công!');
        checkServerConnection();
        loadAccountAndCheckout();
        return;
      }

      chrome.tabs.create({ url: 'http://127.0.0.1:64364' });
      showAlert(alertInfo, 'Vui lòng đăng nhập trên JobTrack Web rồi bấm nút này lại để kết nối.');
    } catch (err) {
      showAlert(alertError, `Lỗi ghép nối: ${err.message}`);
    } finally {
      pairAccountBtn.disabled = false;
      pairAccountBtn.textContent = '🔗 Kết nối với Web App';
    }
  });

  checkPaymentStatusBtn.addEventListener('click', async () => {
    checkPaymentStatusBtn.disabled = true;
    checkPaymentStatusBtn.textContent = 'Đang kiểm tra…';
    try {
      await checkServerConnection();
      const stored = await chrome.storage.local.get(['currentOrderId']);
      if (stored.currentOrderId) {
        const orderRes = await fetch(`${serverConfig.serverUrl}/api/pro/orders/${stored.currentOrderId}`, {
          headers: { 'Authorization': `Bearer ${serverConfig.apiToken}` }
        });
        if (orderRes.ok) {
          const order = await orderRes.json();
          renderOrderStatus(order);
          await loadUsageSummary();
          if (order.status === 'paid') {
            showAlert(alertSuccess, '✓ Đã kích hoạt gói PRO thành công!');
          } else if (order.status === 'failed') {
            showAlert(alertError, '✕ Thanh toán không đủ số tiền của gói cước.');
          } else if (order.status === 'expired') {
            showAlert(alertInfo, '⌛ Đơn hàng đã hết hạn.');
          } else {
            showAlert(alertInfo, '⏳ Đơn hàng đang chờ thanh toán qua ngân hàng.');
          }
          return;
        }
      }
      await loadUsageSummary();
      showAlert(alertSuccess, '✓ Đã cập nhật trạng thái thanh toán và quota mới nhất!');
    } catch (err) {
      showAlert(alertError, err.message);
    } finally {
      checkPaymentStatusBtn.disabled = false;
      checkPaymentStatusBtn.textContent = '🔄 Kiểm tra thanh toán';
    }
  });

  srcBtnTable.addEventListener('click', () => selectSource('table', 0));
  srcBtnList.addEventListener('click', () => selectSource('list', 0));
  srcBtnSelection.addEventListener('click', () => selectSource('selection'));
  srcBtnMeta.addEventListener('click', () => selectSource('meta'));

  rescanBtn.addEventListener('click', async () => {
    rescanBtn.disabled = true;
    rescanBtn.textContent = '⏳ Đang quét…';
    hideAlerts();
    try {
      const ok = await scanPageData();
      if (ok) {
        showAlert(alertSuccess, '✓ Đã quét và cập nhật dữ liệu trang thành công!', 3000);
      } else {
        showAlert(alertError, 'Không thể kết nối hoặc quét trang này. Hãy F5 (tải lại) tab trang web và bấm Quét lại.', 4000);
      }
    } catch (err) {
      showAlert(alertError, `Lỗi quét trang: ${err.message}`, 4000);
    } finally {
      rescanBtn.disabled = false;
      rescanBtn.textContent = '🔄 Quét lại';
    }
  });

  openSettingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  await checkServerConnection();
  await scanPageData();
});
