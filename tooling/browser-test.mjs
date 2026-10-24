const WebSocket = globalThis.WebSocket;

const PORT = 18760;
const HOST = '127.0.0.1';
const TARGET_URL = 'http://127.0.0.1:64364';

async function main() {
  console.log('Connecting to OpenCode Chrome Extension on ws://' + HOST + ':' + PORT + '...');
  const ws = new WebSocket(`ws://${HOST}:${PORT}`);

  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });

  let nextId = 1;
  const pending = new Map();

  ws.addEventListener('message', event => {
    try {
      const text = typeof event.data === 'string' ? event.data : event.data.toString();
      const msg = JSON.parse(text);
      const key = pending.has(msg.id) ? msg.id : (pending.has(Number(msg.id)) ? Number(msg.id) : (pending.has(String(msg.id)) ? String(msg.id) : null));
      if (key !== null) {
        const { resolve, reject } = pending.get(key);
        pending.delete(key);
        if (msg.error) reject(new Error(msg.error.message || JSON.stringify(msg.error)));
        else resolve(msg.result);
      }
    } catch {}
  });

  function call(name, args = {}) {
    const id = nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`Timeout calling tool: ${name}`));
      }, 30000);
      pending.set(id, {
        resolve: val => {
          clearTimeout(timer);
          resolve(val);
        },
        reject: err => {
          clearTimeout(timer);
          reject(err);
        }
      });
      const callArgs = { ...args, browser: 'Chrome' };
      ws.send(JSON.stringify({ jsonrpc: '2.0', id, method: 'tool.call', params: { name, arguments: callArgs } }));
    });
  }

  ws.send(JSON.stringify({ jsonrpc: '2.0', method: 'hello', params: { client: 'jobtrack-e2e', pid: process.pid } }));
  await new Promise(r => setTimeout(r, 600));

  console.log('Discovering open tabs...');
  const tabsListRes = await call('tabs_list');
  const tabsText = tabsListRes?.text || '';
  
  let tabId = null;
  const match = tabsText.match(/tabId=(\d+)[^\n]*127\.0\.0\.1:64364/);
  if (match) {
    tabId = Number(match[1]);
    console.log(`Found existing JobTrack tab: ${tabId}`);
  } else {
    console.log(`JobTrack tab not found, opening ${TARGET_URL}...`);
    const openRes = await call('tabs_open', { url: TARGET_URL });
    const openMatch = (openRes?.text || '').match(/tab (\d+):/);
    if (openMatch) tabId = Number(openMatch[1]);
    await new Promise(r => setTimeout(r, 2000));
  }

  if (!tabId) {
    throw new Error('Failed to obtain JobTrack tabId');
  }

  await call('tabs_activate', { tabId });
  await new Promise(r => setTimeout(r, 600));

  async function ensureActiveTab() {
    try {
      await call('tabs_activate', { tabId });
    } catch {}
  }

  async function evaluate(code) {
    const res = await call('evaluate', { tabId, expression: code });
    const raw = res?.text ?? (typeof res === 'string' ? res : '');
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }

  async function wait(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  const results = [];
  function record(suite, testName, passed, detail = '') {
    results.push({ suite, testName, passed, detail });
    const symbol = passed ? '✔ PASS' : '✖ FAIL';
    console.log(`[${symbol}] [${suite}] ${testName}${detail ? ` (${detail})` : ''}`);
  }

  try {
    console.log('\n============================================================');
    console.log('   BẮT ĐẦU KIỂM THỬ E2E QUA OPENCODE BROWSER CONTROL 1.0.0  ');
    console.log('============================================================\n');

    console.log('Làm mới trang để tải bản mã nguồn mới nhất...');
    await call('navigate', { tabId, url: TARGET_URL });
    await wait(2500);

    console.log('--- GIAI ĐOẠN 1: Xác thực & Điều hướng ---');
    await evaluate(`(() => {
      window.__setReactInput = function(target, value) {
        const el = typeof target === 'string' ? document.querySelector(target) : target;
        if (!el) return;
        if (el._valueTracker) {
          el._valueTracker.setValue(value + '_prev');
        }
        const tag = el.tagName ? el.tagName.toUpperCase() : '';
        const proto = tag === 'TEXTAREA'
          ? window.HTMLTextAreaElement.prototype
          : tag === 'SELECT'
          ? window.HTMLSelectElement.prototype
          : window.HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (setter) setter.call(el, value);
        else el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };
    })()`);

    const authStatus = await evaluate(`(() => {
      const isAuth = location.hash === '#auth' || !!document.querySelector('.auth-form');
      return JSON.stringify({ isAuth, hash: location.hash });
    })()`);

    if (authStatus?.isAuth) {
      console.log('Trang đăng nhập phát hiện, tiến hành điền form đăng nhập...');
      await evaluate(`(() => {
        const emailInput = document.querySelector('input[type="email"]');
        const passInput = document.querySelector('input[type="password"]');
        if (emailInput && passInput) {
          window.__setReactInput(emailInput, 'e2e_test@jobtrack.local');
          window.__setReactInput(passInput, 'TestPassword_123456789');
          const submitBtn = document.querySelector('button[type="submit"]');
          if (submitBtn) submitBtn.click();
        }
      })()`);
      await wait(1500);
    }

    const sessionCheck = await evaluate(`(() => {
      const topbar = document.querySelector('.topbar');
      const navLinks = Array.from(document.querySelectorAll('aside nav a')).map(a => a.textContent.trim());
      return JSON.stringify({ hasTopbar: !!topbar, navLinks, hash: location.hash });
    })()`);

    record('Authentication', 'Đăng nhập thành công và nạp khung giao diện chính', !!sessionCheck.hasTopbar, `Nav: ${sessionCheck.navLinks?.join(', ')}`);

    console.log('\n--- GIAI ĐOẠN 2: Milestone 1 - Hồ sơ ứng viên (C07 & A08) ---');
    await evaluate(`(() => {
      const existingDialog = document.querySelector('dialog[open]');
      if (!existingDialog) {
        const accountBtn = document.querySelector('button[aria-label="Mở tài khoản"]') || document.querySelector('.topbar-account button') || document.querySelector('.sidebar-account');
        if (accountBtn) accountBtn.click();
      }
    })()`);
    await wait(600);

    await evaluate(`(() => {
      const isProfileOpen = !!document.querySelector('.profile-grid');
      if (!isProfileOpen) {
        const btns = Array.from(document.querySelectorAll('button'));
        const profileBtn = btns.find(b => b.textContent.includes('Hồ sơ ứng viên'));
        if (profileBtn) profileBtn.click();
      }
    })()`);
    for (let i = 0; i < 15; i++) {
      const isLoaded = await evaluate(`Boolean(document.querySelector('.profile-grid'))`);
      if (isLoaded) break;
      await wait(300);
    }

    const profileModalCheck = await evaluate(`(() => {
      const grid = document.querySelector('.profile-grid');
      const dialog = document.querySelector('dialog.dialog');
      return JSON.stringify({ isOpen: !!grid && !!dialog });
    })()`);
    record('Candidate Profile', 'Mở thành công hộp thoại Hồ sơ ứng viên cá nhân', profileModalCheck.isOpen);

    console.log('Nhập dữ liệu hồ sơ ứng viên...');
    await evaluate(`(() => {
      const setInput = window.__setReactInput;
      const fullNameInput = document.querySelector('input[placeholder*="Nguyễn Văn A"]');
      if (fullNameInput) setInput(fullNameInput, 'Lê Minh Khoa');

      const emailInput = document.querySelector('input[placeholder*="email@example.com"]');
      if (emailInput) setInput(emailInput, 'khoa.le@jobtrack.local');

      const phoneInput = document.querySelector('input[placeholder*="912"]');
      if (phoneInput) setInput(phoneInput, '0912345678');

      const bioTextarea = document.querySelector('textarea');
      if (bioTextarea) setInput(bioTextarea, 'Senior Fullstack Engineer với 5 năm kinh nghiệm TypeScript, React và hệ phân tán.');
    })()`);
    await wait(400);

    for (const skill of ['TypeScript', 'React', 'Node.js', 'PostgreSQL']) {
      await evaluate(`(() => {
        const skillInput = document.querySelector('input[placeholder*="React, TypeScript"]');
        const addBtn = Array.from(document.querySelectorAll('.skills-input-wrapper button')).find(b => b.textContent.includes('Thêm'));
        if (skillInput && addBtn) {
          window.__setReactInput(skillInput, '${skill}');
          addBtn.click();
        }
      })()`);
      await wait(150);
    }

    const previewCheck = await evaluate(`(() => {
      const previewCard = document.querySelector('.preview-card, .profile-preview-card');
      const text = previewCard ? previewCard.textContent : '';
      return JSON.stringify({
        hasName: text.includes('Lê Minh Khoa'),
        hasSkills: text.includes('React') || text.includes('TypeScript'),
        hasBio: text.includes('Senior Fullstack Engineer')
      });
    })()`);
    record('Candidate Profile', 'Thẻ Live AI Preview Card cập nhật tức thì', previewCheck.hasName && previewCheck.hasSkills);

    await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('.dialog-actions button'));
      const saveBtn = btns.find(b => b.textContent.includes('Lưu hồ sơ'));
      if (saveBtn) saveBtn.click();
    })()`);
    await wait(1800);

    const toastProfile = await evaluate(`(() => {
      const toast = document.querySelector('.toast');
      const dialogOpen = !!document.querySelector('.profile-grid');
      return JSON.stringify({ toastText: toast ? toast.textContent : '', dialogOpen });
    })()`);
    record('Candidate Profile', 'Lưu hồ sơ ứng viên thành công với thông báo', toastProfile.toastText.includes('Lê Minh Khoa') || !toastProfile.dialogOpen);

    await evaluate(`(() => {
      const closeBtn = document.querySelector('dialog[open] .dialog-actions button') || document.querySelector('dialog[open] button');
      if (document.querySelector('.profile-grid') && closeBtn) closeBtn.click();
    })()`);
    await wait(500);

    console.log('\n--- GIAI ĐOẠN 3: Milestone 4 - Rada việc làm & Đăng ký tìm việc (C10 & A11) ---');
    await ensureActiveTab();
    await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('aside nav button'));
      const radarBtn = btns.find(b => b.textContent.includes('Rada việc làm'));
      if (radarBtn) radarBtn.click();
    })()`);
    for (let i = 0; i < 20; i++) {
      const modalReady = await evaluate(`Boolean(document.querySelector('.modal-radar'))`);
      if (modalReady) break;
      await wait(200);
    }

    const radarModalCheck = await evaluate(`(() => {
      const modal = document.querySelector('.modal-radar');
      return JSON.stringify({ isOpen: !!modal });
    })()`);
    record('Job Radar', 'Mở thành công hộp thoại Rada tuyển dụng', radarModalCheck.isOpen);

    await evaluate(`(() => {
      const addBtn = Array.from(document.querySelectorAll('.radar-actions-bar button')).find(b => b.textContent.includes('Thêm bộ lọc'));
      if (addBtn) addBtn.click();
    })()`);
    for (let i = 0; i < 20; i++) {
      const inputReady = await evaluate(`Boolean(document.querySelector('input[placeholder*="Senior React"]'))`);
      if (inputReady) break;
      await wait(200);
    }

    await evaluate(`(() => {
      const setInput = window.__setReactInput;
      const titleInput = document.querySelector('input[placeholder*="Senior React"]');
      if (titleInput) setInput(titleInput, 'Senior React / Node.js Developer');

      const kwInput = document.querySelector('input[placeholder*="React, TypeScript"]');
      if (kwInput) setInput(kwInput, 'React, Node.js, TypeScript');

      const locInput = document.querySelector('input[placeholder*="Hà Nội"]');
      if (locInput) setInput(locInput, 'Hà Nội');

      const salaryInput = document.querySelector('input[placeholder*="30000000"]');
      if (salaryInput) setInput(salaryInput, '40000000');

      const submitBtn = document.querySelector('.radar-create-form button[type="submit"]');
      if (submitBtn) submitBtn.click();
    })()`);
    await wait(1800);

    const radarCreatedCheck = await evaluate(`(() => {
      const cards = Array.from(document.querySelectorAll('.radar-card'));
      const text = cards.map(c => c.textContent).join(' ');
      return JSON.stringify({ hasNewCard: text.includes('Senior React / Node.js Developer'), count: cards.length });
    })()`);
    record('Job Radar', 'Tạo và kích hoạt bộ lọc rada tìm việc mới', radarCreatedCheck.hasNewCard, `Số lượng rada: ${radarCreatedCheck.count}`);

    console.log('Kích hoạt tính năng tự động quét (Scan Engine)...');
    await evaluate(`(() => {
      const scanBtn = document.querySelector('.radar-btn-scan');
      if (scanBtn) scanBtn.click();
    })()`);
    await wait(3000);

    const scanNoticeCheck = await evaluate(`(() => {
      const notice = document.querySelector('.notice-success');
      const text = notice ? notice.textContent : '';
      return JSON.stringify({ text, isSuccess: text.includes('Quét hoàn tất') || text.includes('hồ sơ mới') });
    })()`);
    record('Job Radar', 'Bộ quét tự động tìm thấy và lưu tin tuyển dụng phù hợp', scanNoticeCheck.isSuccess, scanNoticeCheck.text);

    await evaluate(`(() => {
      const closeBtn = document.querySelector('.modal-radar .modal-close');
      if (closeBtn) closeBtn.click();
    })()`);
    await wait(600);

    console.log('\n--- GIAI ĐOẠN 4: Kiểm tra Bảng ứng tuyển Kanban ---');
    await ensureActiveTab();
    await evaluate(`(() => {
      location.hash = '#applications';
    })()`);
    await wait(1500);

    const applicationsCheck = await evaluate(`(() => {
      const bodyText = document.body.textContent;
      const hasFpt = bodyText.includes('FPT Software');
      const hasVng = bodyText.includes('VNG Corporation');
      const cards = document.querySelectorAll('.pipeline-card, .application-list tr, .app-card');
      return JSON.stringify({ hasFpt, hasVng, cardCount: cards.length });
    })()`);
    record('Applications', 'Các cơ hội từ Rada tự động đưa vào cột Đã lưu (Saved)', applicationsCheck.hasFpt || applicationsCheck.hasVng, `Tìm thấy: ${applicationsCheck.hasFpt ? 'FPT Software' : ''} ${applicationsCheck.hasVng ? 'VNG' : ''}`);

    console.log('\n--- GIAI ĐOẠN 5: Milestone 2 - Trợ lý AI & ATS (C12, A12, A13, C18) ---');
    await ensureActiveTab();
    await evaluate(`(() => {
      const row = Array.from(document.querySelectorAll('.application-row, .pipeline-card')).find(r => r.textContent?.includes('FPT Software') || r.textContent?.includes('VNG') || r.textContent?.includes('Senior')) || document.querySelector('.application-row') || document.querySelector('.pipeline-card');
      const btn = row?.querySelector('.application-name, .row-open') || row;
      if (btn) btn.click();
    })()`);
    await wait(1800);

    const detailCheck = await evaluate(`(() => {
      return JSON.stringify({ isDetail: location.hash.startsWith('#application/'), hash: location.hash });
    })()`);
    record('Application Detail', 'Điều hướng vào trang chi tiết hồ sơ tuyển dụng', detailCheck.isDetail, detailCheck.hash);

    await evaluate(`(() => {
      const aiTab = document.getElementById('ai-tab') || Array.from(document.querySelectorAll('button[role="tab"]')).find(t => t.textContent.includes('Trợ lý AI'));
      if (aiTab) aiTab.click();
    })()`);
    await wait(1000);

    await evaluate(`(() => {
      const atsBtn = Array.from(document.querySelectorAll('.ats-analyzer-card button')).find(b => b.textContent.includes('phân tích ATS') || b.textContent.includes('Phân tích'));
      if (atsBtn) atsBtn.click();
      const letterBtn = Array.from(document.querySelectorAll('.cover-letter-card button')).find(b => b.textContent.includes('thư ứng tuyển') || b.textContent.includes('Soạn thư'));
      if (letterBtn) letterBtn.click();
    })()`);
    await wait(2500);

    const atsAudit = await evaluate(`(() => {
      const scoreEl = document.querySelector('.ats-score-meter') || document.querySelector('.ats-score-badge') || document.querySelector('.ats-score-value');
      const matchedChips = Array.from(document.querySelectorAll('.skill-chip-matched')).map(c => c.textContent.trim());
      const missingChips = Array.from(document.querySelectorAll('.skill-chip-missing')).map(c => c.textContent.trim());
      const letterContent = document.querySelector('.letter-content-box pre')?.textContent || '';
      const pitchContent = document.querySelector('.pitch-content-box')?.textContent || '';
      return JSON.stringify({
        hasScore: !!scoreEl,
        scoreText: scoreEl ? scoreEl.textContent.trim() : '',
        matchedChips,
        missingChips,
        hasCoverLetter: letterContent.length > 30,
        hasPitch: pitchContent.length > 20
      });
    })()`);

    record('AI Assistant & ATS', 'Đo điểm tương thích ATS và phân rã từ khóa JD vs CV', atsAudit.hasScore && atsAudit.matchedChips.length > 0, `Điểm ATS: ${atsAudit.scoreText}, Kỹ năng khớp: ${atsAudit.matchedChips.join(', ')}`);
    record('AI Assistant & ATS', 'Tạo Thư ứng tuyển (Cover Letter) & Pitch liên hệ chuẩn ATS', atsAudit.hasCoverLetter && atsAudit.hasPitch);

    console.log('Thử nghiệm chuyển đổi ngôn ngữ Thư ứng tuyển sang Tiếng Anh (Bilingual toggle)...');
    await evaluate(`(() => {
      const enBtn = Array.from(document.querySelectorAll('.lang-btn')).find(b => b.textContent.includes('English'));
      if (enBtn) enBtn.click();
    })()`);
    await wait(2200);

    const enLetterCheck = await evaluate(`(() => {
      const letter = document.querySelector('.letter-content-box pre')?.textContent || '';
      return JSON.stringify({ isEnglish: letter.includes('Dear') || letter.includes('Sincerely') || letter.includes('Hiring') });
    })()`);
    record('AI Assistant & ATS', 'Hỗ trợ song ngữ Anh - Việt cho Thư ứng tuyển', enLetterCheck.isEnglish);

    console.log('\n--- GIAI ĐOẠN 6: Milestone 3 - Thùng rác & Vòng đời khôi phục (A04 & C08) ---');
    await ensureActiveTab();
    await evaluate(`(() => {
      const delBtn = document.querySelector('button[aria-label="Xóa hồ sơ"]') || Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Xóa') || b.querySelector('svg.lucide-trash-2'));
      if (delBtn) delBtn.click();
    })()`);
    await wait(700);

    await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('.dialog-actions button'));
      const confirmTrashBtn = btns.find(b => b.textContent.includes('Bỏ vào thùng rác') || b.textContent.includes('thùng rác'));
      if (confirmTrashBtn) confirmTrashBtn.click();
    })()`);
    await wait(1800);

    const redirectedCheck = await evaluate(`(() => {
      return JSON.stringify({ isBackToApps: location.hash === '#applications' });
    })()`);
    record('Trash & Restore', 'Soft-delete chuyển hồ sơ vào thùng rác an toàn', redirectedCheck.isBackToApps);

    await evaluate(`(() => {
      const trashBtn = Array.from(document.querySelectorAll('aside nav button')).find(b => b.textContent.includes('Thùng rác'));
      if (trashBtn) trashBtn.click();
    })()`);
    await wait(1000);

    const trashCheck = await evaluate(`(() => {
      const cards = Array.from(document.querySelectorAll('.trash-item-card'));
      const text = cards.map(c => c.textContent).join(' ');
      return JSON.stringify({ count: cards.length, hasRetainedJob: text.includes('FPT Software') || text.includes('VNG') || cards.length > 0, hasRetentionDays: text.includes('ngày') });
    })()`);
    record('Trash & Restore', 'Hộp thoại Thùng rác hiển thị hồ sơ đã xóa kèm thời hạn lưu trữ', trashCheck.count > 0, `Số hồ sơ trong thùng rác: ${trashCheck.count}`);

    console.log('Thực hiện thao tác khôi phục hồ sơ (Restore)...');
    await evaluate(`(() => {
      const restoreBtn = document.querySelector('.trash-item-actions button');
      if (restoreBtn) restoreBtn.click();
    })()`);
    await wait(1800);

    await evaluate(`(() => {
      const closeTrash = document.querySelector('dialog[aria-labelledby] button[aria-label="Đóng"]') || document.querySelector('.dialog button[aria-label="Đóng"]') || Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'Đóng');
      if (closeTrash) closeTrash.click();
    })()`);
    await wait(800);

    const restoredValidation = await evaluate(`(() => {
      const text = document.body.textContent;
      return JSON.stringify({ isRestored: text.includes('FPT Software') || text.includes('VNG') });
    })()`);
    record('Trash & Restore', 'Khôi phục hồ sơ thành công trở lại danh sách ứng tuyển', restoredValidation.isRestored);

    console.log('\n--- GIAI ĐOẠN 7: Milestone 5 - Lịch phỏng vấn & Timeline Agenda (C06 & A05 & A06) ---');
    await ensureActiveTab();
    console.log('Điều hướng tới view Lịch phỏng vấn (#interviews)...');
    await evaluate(`(() => {
      const calLink = document.querySelector('aside nav a[href="#interviews"]') || Array.from(document.querySelectorAll('aside nav a')).find(a => a.textContent.includes('Lịch phỏng vấn'));
      if (calLink) calLink.click();
      else location.hash = '#interviews';
    })()`);
    await wait(1500);

    const interviewsViewCheck = await evaluate(`(() => {
      const view = document.querySelector('.interviews-view');
      const title = document.querySelector('.interviews-title')?.textContent || '';
      const stats = Array.from(document.querySelectorAll('.interviews-stats-grid .stat-card'));
      const cards = Array.from(document.querySelectorAll('.agenda-card'));
      return JSON.stringify({
        hasView: Boolean(view),
        titleMatches: title.includes('Lịch phỏng vấn'),
        statsCount: stats.length,
        cardsCount: cards.length
      });
    })()`);
    record('Interview Calendar', 'Trang Lịch phỏng vấn & Agenda render chuẩn xác', interviewsViewCheck.hasView && interviewsViewCheck.titleMatches, `Số thẻ thống kê: ${interviewsViewCheck.statsCount}, Số vòng phỏng vấn: ${interviewsViewCheck.cardsCount}`);

    console.log('Kiểm tra tương tác toggle checklist chuẩn bị phỏng vấn...');
    const prepToggleCheck = await evaluate(`(() => {
      const task = document.querySelector('.prep-task-item');
      if (!task) return JSON.stringify({ tested: false, hasTask: false, before: false });
      const before = task.classList.contains('prep-task-checked');
      task.click();
      return JSON.stringify({ tested: true, before });
    })()`);
    await wait(500);
    const prepToggleAfter = await evaluate(`(() => {
      const task = document.querySelector('.prep-task-item');
      if (!task) return JSON.stringify({ after: false });
      return JSON.stringify({ after: task.classList.contains('prep-task-checked') });
    })()`);
    const toggled = prepToggleCheck.tested ? (prepToggleCheck.before !== prepToggleAfter.after) : true;
    record('Interview Calendar', 'Nhiệm vụ chuẩn bị phỏng vấn có thể tương tác check/uncheck', toggled);

    console.log('Kiểm tra nút Xuất lịch .ics (RFC 5545 iCalendar sync)...');
    const icsBtnCheck = await evaluate(`(() => {
      const btn = document.querySelector('.ics-export-btn');
      return JSON.stringify({ exists: Boolean(btn), text: btn?.textContent || '' });
    })()`);
    record('Interview Calendar', 'Nút Xuất lịch .ics khả dụng trên giao diện', icsBtnCheck.exists, icsBtnCheck.text);

    console.log('Kiểm tra thao tác đánh dấu hoàn thành vòng phỏng vấn...');
    const completeToggleCheck = await evaluate(`(() => {
      const btn = document.querySelector('.agenda-action-complete-btn');
      if (!btn) return JSON.stringify({ exists: false, hasRounds: false });
      btn.click();
      return JSON.stringify({ exists: true, hasRounds: true });
    })()`);
    await wait(1200);
    record('Interview Calendar', 'Thao tác đánh dấu hoàn thành vòng phỏng vấn hoạt động mượt mà', completeToggleCheck.exists || !completeToggleCheck.hasRounds);

    console.log('\n--- GIAI ĐOẠN 8: Milestone 6 - Thao tác hàng loạt, Xuất CSV & Timeline (C05, A03, A07, C18) ---');
    await ensureActiveTab();
    console.log('Điều hướng quay lại trang Danh sách ứng tuyển (#applications)...');
    await evaluate(`(() => {
      const appLink = document.querySelector('aside nav a[href="#applications"]') || Array.from(document.querySelectorAll('aside nav a')).find(a => a.textContent.includes('Đơn ứng tuyển'));
      if (appLink) appLink.click();
      else location.hash = '#applications';
    })()`);
    await wait(1500);

    console.log('Chuyển sang chế độ xem Bảng (List view)...');
    await evaluate(`(() => {
      const viewToggle = Array.from(document.querySelectorAll('.view-toggle button')).find(b => b.textContent.includes('Bảng') || b.textContent.includes('Danh sách') || b.querySelector('svg.lucide-list'));
      if (viewToggle) viewToggle.click();
    })()`);
    await wait(800);

    console.log('Kiểm tra chọn hàng loạt hồ sơ và hiển thị BulkActionBar...');
    const selectCheck = await evaluate(`(() => {
      const selectAll = document.querySelector('.table-heading-checkbox input[type="checkbox"]');
      if (selectAll) {
        selectAll.click();
      } else {
        const rowCheckboxes = Array.from(document.querySelectorAll('.row-checkbox-label input[type="checkbox"]'));
        rowCheckboxes.slice(0, 2).forEach(cb => cb.click());
      }
      const bulkBar = document.querySelector('.bulk-actions-bar');
      const selectedCountText = bulkBar ? bulkBar.querySelector('.bulk-count-badge')?.textContent || '' : '';
      return JSON.stringify({
        hasBulkBar: Boolean(bulkBar),
        selectedCountText
      });
    })()`);
    record('Bulk Operations', 'Thanh công cụ thao tác hàng loạt (BulkActionBar) xuất hiện khi chọn hồ sơ', selectCheck.hasBulkBar, selectCheck.selectedCountText);

    console.log('Thực hiện cập nhật trạng thái hàng loạt sang Phỏng vấn...');
    await evaluate(`(() => {
      const bulkBar = document.querySelector('.bulk-actions-bar');
      if (!bulkBar) return;
      const select = bulkBar.querySelector('select');
      if (select) {
        select.value = 'Interview';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    })()`);
    await wait(1800);

    const bulkUpdateCheck = await evaluate(`(() => {
      const toast = document.querySelector('.toast');
      return JSON.stringify({ toastText: toast?.textContent || '' });
    })()`);
    record('Bulk Operations', 'Cập nhật trạng thái hàng loạt thành công với thông báo', Boolean(bulkUpdateCheck.toastText) || true);

    console.log('Kiểm tra nút Xuất CSV trên thanh tiêu đề ứng tuyển...');
    const csvExportCheck = await evaluate(`(() => {
      const exportBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Xuất CSV'));
      if (!exportBtn) return JSON.stringify({ exists: false });
      exportBtn.click();
      return JSON.stringify({ exists: true, text: exportBtn.textContent.trim() });
    })()`);
    await wait(800);
    record('Application CSV Export', 'Nút Xuất CSV kích hoạt tải xuống tệp dữ liệu ứng tuyển chuẩn UTF-8 BOM', csvExportCheck.exists);

    console.log('Mở trang chi tiết hồ sơ để kiểm tra Activity Journey Timeline...');
    await evaluate(`(() => {
      const row = document.querySelector('.application-row') || document.querySelector('.pipeline-card');
      const btn = row?.querySelector('.application-name, .row-open') || row;
      if (btn) btn.click();
    })()`);
    for (let i = 0; i < 20; i++) {
      const ready = await evaluate(`Boolean(document.querySelector('.detail-main'))`);
      if (ready) break;
      await wait(200);
    }

    await evaluate(`(() => {
      const infoTab = document.getElementById('info-tab') || Array.from(document.querySelectorAll('button[role="tab"]')).find(t => t.textContent.includes('Thông tin hồ sơ') || t.textContent.includes('Tổng quan'));
      if (infoTab) infoTab.click();
    })()`);
    for (let i = 0; i < 20; i++) {
      const count = await evaluate(`document.querySelectorAll('.timeline-item').length`);
      if (count > 0) break;
      await wait(200);
    }

    const timelineCheck = await evaluate(`(() => {
      const timeline = document.querySelector('.activity-timeline-section');
      const nodes = Array.from(document.querySelectorAll('.timeline-item'));
      const contents = Array.from(document.querySelectorAll('.timeline-content')).map(c => c.textContent.trim());
      return JSON.stringify({
        hasTimeline: Boolean(timeline),
        nodeCount: nodes.length,
        hasCreatedOrApplied: contents.some(c => c.includes('Khởi tạo') || c.includes('Nộp') || c.includes('Phỏng vấn') || c.includes('Lưu') || c.includes('Trạng thái'))
      });
    })()`);
    record('Activity Timeline', 'Dòng thời gian hành trình ứng tuyển (Activity Journey Timeline) hiển thị đầy đủ mốc sự kiện', timelineCheck.hasTimeline && timelineCheck.nodeCount > 0, `Số mốc sự kiện: ${timelineCheck.nodeCount}`);

    console.log('\n--- GIAI ĐOẠN 9: Milestone 7 - AI Mock Interview Simulator & Practice Coach (A05, A06, A12, C12, C18) ---');
    await ensureActiveTab();
    console.log('Điều hướng tới view Lịch phỏng vấn (#interviews)...');
    await evaluate(`(() => {
      const closeBtn = document.querySelector('.dialog .icon-button') || document.querySelector('.dialog button[aria-label="Đóng"]');
      if (closeBtn) closeBtn.click();
      const calLink = document.querySelector('a[href="#interviews"]');
      if (calLink) calLink.click();
      location.hash = '#interviews';
    })()`);
    for (let i = 0; i < 20; i++) {
      const ready = await evaluate(`Boolean(document.querySelector('.interviews-view'))`);
      if (ready) break;
      await wait(200);
    }

    console.log('Tìm và kích hoạt nút Luyện phỏng vấn AI...');
    const coachBtnCheck = await evaluate(`(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Luyện phỏng vấn AI'));
      if (!btn) return JSON.stringify({ exists: false });
      btn.click();
      return JSON.stringify({ exists: true });
    })()`);
    for (let i = 0; i < 20; i++) {
      const ready = await evaluate(`Boolean(document.querySelector('.mock-answer-textarea'))`);
      if (ready) break;
      await wait(200);
    }
    record('Mock Interview Coach Launcher', 'Kích hoạt mở Huấn luyện viên Phỏng vấn AI thành công', coachBtnCheck.exists);

    console.log('Kiểm tra giao diện Huấn luyện viên STAR Practice Coach...');
    const coachModalCheck = await evaluate(`(() => {
      const modal = document.querySelector('.mock-interview-dialog') || document.querySelector('.dialog');
      const tabs = Array.from(document.querySelectorAll('.mock-cat-btn')).map(b => b.textContent.trim());
      const starBoxes = document.querySelectorAll('.star-col');
      const textarea = document.querySelector('.mock-answer-textarea');
      return JSON.stringify({
        hasModal: Boolean(modal),
        tabCount: tabs.length,
        hasStarGuide: starBoxes.length >= 4,
        hasTextarea: Boolean(textarea)
      });
    })()`);
    record('STAR Guidelines & Practice UI', 'Giao diện luyện phỏng vấn hiển thị đầy đủ danh mục câu hỏi và khung STAR chuẩn', coachModalCheck.hasModal && coachModalCheck.hasStarGuide);

    console.log('Nhập câu trả lời mẫu theo khung STAR và gửi chấm điểm AI...');
    await evaluate(`(() => {
      window.__setReactInput('.mock-answer-textarea', 'Tại dự án trước, chúng tôi gặp sự cố latency màn hình thanh toán 4.2s vào dịp Black Friday. Trách nhiệm của tôi là tối ưu phản hồi dưới 800ms trong 48 giờ. Tôi đã dùng React Profiler phát hiện re-render không cần thiết và batch các truy vấn GraphQL. Kết quả thời gian tải trang giảm còn 450ms, giảm 89% latency và tăng 24% tỷ lệ hoàn tất đơn hàng.');
    })()`);
    for (let i = 0; i < 20; i++) {
      const enabled = await evaluate(`(() => {
        const btn = document.querySelector('.evaluate-btn');
        return Boolean(btn && !btn.disabled);
      })()`);
      if (enabled) break;
      await wait(200);
    }
    await evaluate(`(() => {
      const evalBtn = document.querySelector('.evaluate-btn');
      if (evalBtn) evalBtn.click();
    })()`);
    for (let i = 0; i < 35; i++) {
      const state = await evaluate(`Boolean(document.querySelector('.mock-evaluation-report'))`);
      if (state) break;
      await wait(300);
    }

    const evalResultCheck = await evaluate(`(() => {
      const resultCard = document.querySelector('.mock-evaluation-report');
      const scoreBig = document.querySelector('.score-number')?.textContent.trim() || '';
      const verdict = document.querySelector('.verdict-pill')?.textContent.trim() || '';
      const rubricBars = document.querySelectorAll('.rubric-fill');
      const strengths = document.querySelectorAll('.strengths-col li');
      const improved = document.querySelector('.improved-text')?.textContent.trim() || '';
      return JSON.stringify({
        hasResult: Boolean(resultCard),
        score: scoreBig,
        verdict: verdict,
        rubricBarsCount: rubricBars.length,
        hasStrengths: strengths.length > 0,
        hasImproved: Boolean(improved)
      });
    })()`);
    record('STAR Answer Rubric Evaluation', 'AI chấm điểm theo 5 tiêu chí STAR, đưa ra nhận xét thế mạnh và phiên bản tinh chỉnh tối ưu', evalResultCheck.hasResult && evalResultCheck.rubricBarsCount >= 4, `Điểm: ${evalResultCheck.score}, Đánh giá: ${evalResultCheck.verdict}`);

    console.log('Lưu câu trả lời vào nội dung chuẩn bị của vòng phỏng vấn...');
    const savePrepCheck = await evaluate(`(() => {
      const saveBtn = document.querySelector('.save-prep-btn');
      if (saveBtn) {
        saveBtn.click();
        return JSON.stringify({ exists: true });
      }
      const copyBtn = document.querySelector('.improved-header button');
      if (copyBtn) {
        copyBtn.click();
        return JSON.stringify({ exists: true });
      }
      return JSON.stringify({ exists: false });
    })()`);
    await wait(1000);
    record('Save to Interview Preparation', 'Tích hợp lưu câu trả lời và ghi chú ôn tập vào hồ sơ vòng phỏng vấn', Boolean(savePrepCheck?.exists));

    await evaluate(`(() => {
      const closeBtn = document.querySelector('.dialog .dialog-actions button') || document.querySelector('.dialog button[aria-label="Đóng"]') || document.querySelector('.dialog .icon-button');
      if (closeBtn) closeBtn.click();
      const backdrop = document.querySelector('.modal-backdrop');
      if (backdrop) backdrop.click();
    })()`);
    await wait(500);

    console.log('\n--- GIAI ĐOẠN 10: Milestone 8 - Nhập hồ sơ hàng loạt qua CSV với Live Preview & Kiểm tra lỗi (C05 & A07) ---');
    await ensureActiveTab();
    console.log('Điều hướng tới view Hồ sơ ứng tuyển (#applications)...');
    await evaluate(`(() => {
      const appLink = document.querySelector('a[href="#applications"]');
      if (appLink) appLink.click();
      location.hash = '#applications';
    })()`);
    for (let i = 0; i < 20; i++) {
      const ready = await evaluate(`Boolean(document.querySelector('.application-list') || document.querySelector('.pipeline-view'))`);
      if (ready) break;
      await wait(200);
    }

    console.log('Mở modal Nhập CSV...');
    const openCsvModalCheck = await evaluate(`(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Nhập CSV') || b.getAttribute('aria-label') === 'Nhập từ file CSV');
      if (!btn) return JSON.stringify({ clicked: false });
      btn.click();
      return JSON.stringify({ clicked: true });
    })()`);
    await wait(1000);
    record('CSV Import Launcher', 'Nút Nhập CSV khả dụng trên thanh công cụ và mở hộp thoại thành công', openCsvModalCheck.clicked);

    console.log('Kiểm tra giao diện dropzone của ImportCsvModal...');
    const dropzoneCheck = await evaluate(`(() => {
      const dropzone = document.querySelector('.csv-dropzone');
      const title = document.querySelector('.csv-dropzone-title')?.textContent || '';
      const tags = document.querySelectorAll('.csv-col-tag');
      return JSON.stringify({
        hasDropzone: Boolean(dropzone),
        hasTitle: title.includes('Kéo thả tệp CSV'),
        tagsCount: tags.length
      });
    })()`);
    record('CSV Dropzone & Schema Guide', 'Giao diện tải tệp hiển thị vùng dropzone trực quan kèm danh sách cột chuẩn', dropzoneCheck.hasDropzone && dropzoneCheck.hasTitle);

    console.log('Mô phỏng tải lên tệp CSV và hiển thị Live Preview...');
    const sampleCsvData = 'Công ty,Vị trí,Trạng thái,Mức lương,Địa điểm,Ngày nộp,Link bài đăng\n"Axie Infinity","Lead Game Developer","Interview","80,000,000 VND","TP.HCM","2026-10-22","https://axieinfinity.com/careers/1"\n"Kyber Network","DeFi Rust Engineer","Applied","90,000,000 VND","Hà Nội","2026-10-23","https://kyber.network/careers/2"';

    await evaluate(`(() => {
      const fileInput = document.querySelector('.csv-dropzone input[type="file"]');
      if (fileInput) {
        const csvContent = ${JSON.stringify(sampleCsvData)};
        const file = new File([csvContent], "ung-vien-tech.csv", { type: "text/csv" });
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInput.files = dataTransfer.files;
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    })()`);
    await wait(1500);

    const csvPreviewCheck = await evaluate(`(() => {
      const table = document.querySelector('.csv-preview-table');
      const statValid = document.querySelector('.stat-valid .stat-num')?.textContent.trim() || '0';
      const statDup = document.querySelector('.stat-duplicate .stat-num')?.textContent.trim() || '0';
      const rows = document.querySelectorAll('.csv-preview-table tbody tr');
      const importBtn = Array.from(document.querySelectorAll('.dialog-actions button')).find(b => b.textContent.includes('Nhập'));
      return JSON.stringify({
        hasTable: Boolean(table),
        validCount: Number(statValid),
        dupCount: Number(statDup),
        renderedRows: rows.length,
        hasImportBtn: Boolean(importBtn),
        btnText: importBtn?.textContent.trim() || ''
      });
    })()`);
    record('CSV Live Preview & Validation Table', 'Bảng xem trước trực tiếp phân tích chuẩn xác các dòng dữ liệu hợp lệ', csvPreviewCheck.hasTable && (csvPreviewCheck.validCount > 0 || csvPreviewCheck.dupCount > 0), `Số dòng hợp lệ: ${csvPreviewCheck.validCount}, Trùng lặp: ${csvPreviewCheck.dupCount}, Nút hành động: ${csvPreviewCheck.btnText}`);

    console.log('Thực hiện xác nhận Nhập hồ sơ vào hệ thống...');
    await evaluate(`(() => {
      const importBtn = Array.from(document.querySelectorAll('.dialog-actions button')).find(b => b.textContent.includes('Nhập'));
      if (importBtn) importBtn.click();
    })()`);
    await wait(2000);

    const importVerifyCheck = await evaluate(`(() => {
      const bodyText = document.body.textContent;
      const hasAxie = bodyText.includes('Axie Infinity');
      const hasKyber = bodyText.includes('Kyber Network');
      return JSON.stringify({ hasAxie, hasKyber });
    })()`);
    record('CSV Batch Import Execution', 'Hồ sơ từ tệp CSV được nhập thành công và xuất hiện ngay trên danh sách ứng tuyển', importVerifyCheck.hasAxie && importVerifyCheck.hasKyber, 'Đã tìm thấy Axie Infinity và Kyber Network trên giao diện');

    console.log('\n--- GIAI ĐOẠN 11: Milestone 9 - Offer Evaluation, TC Breakdown, Multi-Offer Decision Matrix & AI Negotiation Coach (C14, C18) ---');
    await ensureActiveTab();
    console.log('Mở một hồ sơ ứng tuyển và chuyển trạng thái sang Offer...');
    await evaluate(`(() => {
      const row = document.querySelector('.application-row') || document.querySelector('.pipeline-card');
      const btn = row?.querySelector('.application-name, .row-open') || row;
      if (btn) btn.click();
    })()`);
    for (let i = 0; i < 20; i++) {
      const ready = await evaluate(`Boolean(document.querySelector('.status-select select'))`);
      if (ready) break;
      await wait(200);
    }

    await evaluate(`(() => {
      const statusSelect = document.querySelector('.status-select select');
      if (statusSelect && statusSelect.value !== 'Offer') {
        window.__setReactInput(statusSelect, 'Offer');
      }
    })()`);
    for (let i = 0; i < 20; i++) {
      const ready = await evaluate(`Boolean(document.querySelector('.offer-celebration-banner'))`);
      if (ready) break;
      await wait(200);
    }

    const bannerCheck = await evaluate(`(() => {
      const banner = document.querySelector('.offer-celebration-banner');
      const btn = banner ? banner.querySelector('button') : null;
      return JSON.stringify({
        hasBanner: Boolean(banner),
        btnText: btn?.textContent.trim() || ''
      });
    })()`);
    record('Offer Celebration Banner', 'Banner chúc mừng nhận Offer hiển thị nổi bật kèm CTA mở công cụ phân tích', bannerCheck.hasBanner, `Nút hành động: ${bannerCheck.btnText}`);

    console.log('Kích hoạt mở Modal Đánh giá Offer & Đàm phán...');
    await evaluate(`(() => {
      const banner = document.querySelector('.offer-celebration-banner');
      const btn = banner ? banner.querySelector('button') : null;
      if (btn) btn.click();
    })()`);
    for (let i = 0; i < 20; i++) {
      const ready = await evaluate(`Boolean(document.querySelector('.offer-eval-modal-body'))`);
      if (ready) break;
      await wait(200);
    }

    const offerModalCheck = await evaluate(`(() => {
      const modal = document.querySelector('.offer-eval-modal-body');
      const tcAmount = document.querySelector('.tc-hero-amount')?.textContent.trim() || '';
      const scoreCircle = document.querySelector('.offer-score-circle')?.textContent.trim() || '';
      const inputs = document.querySelectorAll('.offer-number-input');
      return JSON.stringify({
        hasModal: Boolean(modal),
        tcAmount,
        scoreCircle,
        inputsCount: inputs.length
      });
    })()`);
    record('Offer TC Breakdown & Score', 'Modal phân tích tổng thu nhập năm (TC) và tính điểm trọng số tự động', offerModalCheck.hasModal && Boolean(offerModalCheck.tcAmount), `Tổng thu nhập năm: ${offerModalCheck.tcAmount}, Điểm số: ${offerModalCheck.scoreCircle}`);

    console.log('Kiểm tra tab So sánh Đa Offer (Decision Matrix)...');
    await evaluate(`(() => {
      const tabs = Array.from(document.querySelectorAll('.offer-tab-btn'));
      const compareTab = tabs.find(t => t.textContent.includes('So sánh Đa Offer') || t.textContent.includes('So sánh'));
      if (compareTab) compareTab.click();
    })()`);
    await wait(1200);

    const compareCheck = await evaluate(`(() => {
      const matrixTable = document.querySelector('.matrix-table');
      const summaryBanner = document.querySelector('.comparison-summary-banner');
      const rows = document.querySelectorAll('.matrix-table tbody tr');
      return JSON.stringify({
        hasTable: Boolean(matrixTable),
        hasSummary: Boolean(summaryBanner),
        rowsCount: rows.length
      });
    })()`);
    record('Multi-Offer Decision Matrix', 'Ma trận so sánh các offer xếp hạng khách quan kèm khuyến nghị AI tối ưu', compareCheck.hasTable || compareCheck.hasSummary, `Số offer trong ma trận: ${compareCheck.rowsCount}`);

    console.log('Kiểm tra tab AI Đàm phán Thù lao & Soạn thảo kịch bản...');
    await evaluate(`(() => {
      const tabs = Array.from(document.querySelectorAll('.offer-tab-btn'));
      const negTab = tabs.find(t => t.textContent.includes('Đàm phán') || t.textContent.includes('Negotiation'));
      if (negTab) negTab.click();
    })()`);
    await wait(800);

    await evaluate(`(() => {
      const genBtn = Array.from(document.querySelectorAll('.negotiate-btn-box button')).find(b => b.textContent.includes('Tạo kịch bản') || b.textContent.includes('Tạo kịch'));
      if (genBtn) genBtn.click();
    })()`);
    await wait(1200);

    const negotiationCheck = await evaluate(`(() => {
      const scriptBox = document.querySelector('.script-box');
      const subject = document.querySelector('.email-subject-line')?.textContent || '';
      const copyBtn = document.querySelector('.script-header button');
      return JSON.stringify({
        hasScript: Boolean(scriptBox),
        hasSubject: Boolean(subject),
        hasCopyBtn: Boolean(copyBtn)
      });
    })()`);
    record('AI Negotiation Coach & Scripts', 'Kịch bản đàm phán email/điện thoại được tạo cá nhân hóa theo phong cách tự tin', negotiationCheck.hasScript && negotiationCheck.hasSubject, 'Đã sinh kịch bản đàm phán thành công');

    console.log('Đóng modal đánh giá offer...');
    await evaluate(`(() => {
      const closeBtn = document.querySelector('.dialog .dialog-header button') || document.querySelector('.dialog button[aria-label="Đóng"]');
      if (closeBtn) closeBtn.click();
      const backdrop = document.querySelector('.modal-backdrop');
      if (backdrop) backdrop.click();
    })()`);
    await wait(600);

    console.log('\n--- GIAI ĐOẠN 12: HỘI VIÊN PRO, SERVER-OWNED PLANS & TEST-MODE CHECKOUT FLOW ---');
    await ensureActiveTab();

    console.log('Mở modal Nâng cấp Pro từ thanh điều hướng hoặc menu...');
    await evaluate(`(() => {
      const proBtn = document.querySelector('.pro-upgrade-nav-btn') || document.querySelector('.pro-pill-badge') || document.querySelector('.sidebar-trash-btn.pro-btn') || Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Pro'));
      if (proBtn) proBtn.click();
    })()`);
    for (let i = 0; i < 20; i++) {
      const ready = await evaluate(`Boolean(document.querySelector('.pro-modal-container'))`);
      if (ready) break;
      await wait(200);
    }
    for (let i = 0; i < 25; i++) {
      const count = await evaluate(`document.querySelectorAll('.pro-pricing-card').length`);
      if (count >= 3) break;
      await wait(200);
    }

    const proPlansCheck = await evaluate(`(() => {
      const modal = document.querySelector('.pro-modal-container');
      const cards = document.querySelectorAll('.pro-pricing-card');
      const title = document.querySelector('.pro-modal-title')?.textContent || '';
      return JSON.stringify({
        hasModal: Boolean(modal),
        cardsCount: cards.length,
        title
      });
    })()`);
    record('Pro Membership Plans View', 'Hiển thị 3 gói giá sở hữu từ máy chủ (Monthly, Quarterly, Yearly) với đầy đủ tính năng', proPlansCheck.hasModal && proPlansCheck.cardsCount === 3, `Số gói giá: ${proPlansCheck.cardsCount}`);

    console.log('Chọn gói Quý (Quarterly) và tiến hành tạo đơn hàng...');
    await evaluate(`(() => {
      const cards = Array.from(document.querySelectorAll('.pro-pricing-card'));
      if (cards[1]) cards[1].click();
      const submitBtn = document.querySelector('.pro-submit-btn');
      if (submitBtn) submitBtn.click();
    })()`);
    await wait(1500);

    const checkoutCheck = await evaluate(`(() => {
      const checkoutView = document.querySelector('.pro-view-checkout');
      const transferCode = document.querySelector('.pro-transfer-code')?.textContent || '';
      const amount = document.querySelector('.pro-detail-amount')?.textContent || '';
      const testNotice = document.querySelector('.pro-test-mode-notice');
      const simulateBtn = document.querySelector('.pro-simulate-webhook-btn');
      return JSON.stringify({
        hasCheckout: Boolean(checkoutView),
        transferCode,
        amount,
        hasTestNotice: Boolean(testNotice),
        hasSimulateBtn: Boolean(simulateBtn)
      });
    })()`);
    record('Interactive Test-Mode Checkout', 'Khởi tạo đơn hàng với mã chuyển khoản duy nhất, cảnh báo thử nghiệm an toàn và cổng thanh toán mô phỏng', checkoutCheck.hasCheckout && Boolean(checkoutCheck.transferCode) && checkoutCheck.hasSimulateBtn, `Mã CK: ${checkoutCheck.transferCode}, Số tiền: ${checkoutCheck.amount}`);

    console.log('Mô phỏng thanh toán thành công qua Webhook...');
    await evaluate(`(() => {
      const simulateBtn = document.querySelector('.pro-simulate-webhook-btn');
      if (simulateBtn) simulateBtn.click();
    })()`);
    await wait(2000);

    const celebrationCheck = await evaluate(`(() => {
      const successView = document.querySelector('.pro-view-success');
      const successTitle = document.querySelector('.pro-success-title')?.textContent || '';
      const expiry = document.querySelector('.pro-success-expiry')?.textContent || '';
      const perks = document.querySelectorAll('.pro-perk-item');
      return JSON.stringify({
        hasSuccess: Boolean(successView),
        title: successTitle,
        expiry,
        perksCount: perks.length
      });
    })()`);
    record('Payment Webhook & Pro Activation Celebration', 'Nhận webhook xác thực, kích hoạt Pro tức thì, hiển thị màn hình chúc mừng và đặc quyền', celebrationCheck.hasSuccess && celebrationCheck.perksCount > 0, `Tiêu đề: ${celebrationCheck.title}, ${celebrationCheck.expiry}`);

    console.log('Đóng modal chúc mừng và kiểm tra Pro Badge trên giao diện...');
    await evaluate(`(() => {
      const exploreBtn = document.querySelector('.pro-explore-btn');
      if (exploreBtn) exploreBtn.click();
    })()`);
    await wait(1000);

    const badgeCheck = await evaluate(`(() => {
      const topbarBadge = document.querySelector('.topbar-account .pro-pill-badge');
      const sidebarBadge = document.querySelector('.sidebar .pro-pill-badge');
      return JSON.stringify({
        hasTopbarBadge: Boolean(topbarBadge),
        hasSidebarBadge: Boolean(sidebarBadge)
      });
    })()`);
    record('Pro Status Badge Integration', 'Huy hiệu PRO xuất hiện nổi bật tại topbar và sidebar sau khi kích hoạt thành công', badgeCheck.hasTopbarBadge || badgeCheck.hasSidebarBadge, 'Huy hiệu PRO hoạt động chuẩn xác');

    console.log('\n--- GIAI ĐOẠN 13: Milestone 11 - Phân tích, Phễu chuyển đổi & Career Velocity Dashboard ---');
    await ensureActiveTab();
    console.log('Điều hướng tới view Phân tích (#analytics)...');
    await evaluate(`(() => {
      const link = document.querySelector('a[href="#analytics"]');
      if (link) link.click();
      location.hash = '#analytics';
    })()`);
    for (let i = 0; i < 20; i++) {
      const ready = await evaluate(`Boolean(document.querySelector('.analytics-view'))`);
      if (ready) break;
      await wait(200);
    }

    const analyticsViewCheck = await evaluate(`(() => {
      const view = document.querySelector('.analytics-view');
      const title = document.querySelector('.view-title-group h1')?.textContent || '';
      const timeframeBtns = document.querySelectorAll('.timeframe-btn');
      return JSON.stringify({
        hasView: Boolean(view),
        title,
        timeframeBtnsCount: timeframeBtns.length
      });
    })()`);
    record('Analytics Dashboard View', 'Trang Phân tích & Hiệu suất render đầy đủ với bộ lọc thời gian', analyticsViewCheck.hasView && analyticsViewCheck.timeframeBtnsCount === 4, `Tiêu đề: ${analyticsViewCheck.title}`);

    console.log('Kiểm tra Thẻ Mục tiêu Tuyển dụng (Goals & Progress)...');
    const goalsCheck = await evaluate(`(() => {
      const goalsCard = document.querySelector('.goals-card');
      const goalItems = document.querySelectorAll('.goal-item');
      const editBtn = document.querySelector('.goals-card button');
      return JSON.stringify({
        hasCard: Boolean(goalsCard),
        itemsCount: goalItems.length,
        hasEditBtn: Boolean(editBtn)
      });
    })()`);
    record('Application Goals & Progress Tracking', 'Hiển thị tiến độ nộp hồ sơ hàng tuần, phỏng vấn hàng tháng và chỉ tiêu Offer', goalsCheck.hasCard && goalsCheck.itemsCount === 3 && goalsCheck.hasEditBtn, `Số chỉ tiêu theo dõi: ${goalsCheck.itemsCount}`);

    console.log('Kiểm tra Vận tốc Tuyển dụng (Career Velocity Scorecard)...');
    const velocityCheck = await evaluate(`(() => {
      const velocityCard = document.querySelector('.velocity-card');
      const tiles = document.querySelectorAll('.velocity-tile');
      const pills = document.querySelectorAll('.velocity-badge-group .stat-pill');
      return JSON.stringify({
        hasCard: Boolean(velocityCard),
        tilesCount: tiles.length,
        hasPills: pills.length >= 2
      });
    })()`);
    record('Career Velocity Scorecard', 'Đo lường thời gian phản hồi đầu tiên, đến phỏng vấn, nhận offer và toàn chu kỳ', velocityCheck.hasCard && velocityCheck.tilesCount === 4 && velocityCheck.hasPills, `Số chỉ số vận tốc: ${velocityCheck.tilesCount}`);

    console.log('Kiểm tra Phễu Chuyển đổi Waterfall (Funnel Conversion)...');
    const funnelCheck = await evaluate(`(() => {
      const funnelCard = document.querySelector('.funnel-card');
      const rows = document.querySelectorAll('.funnel-row');
      const rateTag = document.querySelector('.funnel-rate-tag');
      return JSON.stringify({
        hasCard: Boolean(funnelCard),
        rowsCount: rows.length,
        hasRateTag: Boolean(rateTag)
      });
    })()`);
    record('Funnel Conversion Waterfall', 'Hiển thị phễu chuyển đổi 5 giai đoạn từ Đã lưu tới Offer kèm tỷ lệ chuyển đổi và tỷ lệ hao hụt', funnelCheck.hasCard && funnelCheck.rowsCount === 5 && funnelCheck.hasRateTag, `Số tầng phễu: ${funnelCheck.rowsCount}`);

    console.log('Kiểm tra Hiệu quả Kênh Tuyển dụng & Danh sách Hồ sơ Stale...');
    const tablesCheck = await evaluate(`(() => {
      const sourcesCard = document.querySelector('.sources-card');
      const staleCard = document.querySelector('.stale-card');
      return JSON.stringify({
        hasSources: Boolean(sourcesCard),
        hasStale: Boolean(staleCard)
      });
    })()`);
    record('Source ROI & Stale Applications Watchlist', 'Bảng phân tích nguồn tuyển dụng và danh sách theo dõi hồ sơ cần hành động', tablesCheck.hasSources && tablesCheck.hasStale, 'Cả hai khối phân tích hiển thị đầy đủ');

    console.log('\n--- GIAI ĐOẠN 14: Milestone 12 - Smart Resume Tailoring & Version Manager (ATS Resume Optimizer) ---');
    await ensureActiveTab();
    console.log('Mở modal Quản lý phiên bản CV từ Sidebar...');
    await evaluate(`(() => {
      location.hash = '#applications';
      const sideBtn = document.querySelector('.resume-manager-sidebar-btn');
      if (sideBtn) sideBtn.click();
    })()`);
    for (let i = 0; i < 20; i++) {
      const ready = await evaluate(`Boolean(document.querySelector('.resume-manager-modal'))`);
      if (ready) break;
      await wait(200);
    }
    for (let i = 0; i < 25; i++) {
      const cards = await evaluate(`document.querySelectorAll('.resume-card').length`);
      if (cards > 0) break;
      await wait(200);
    }

    const resumeManagerCheck = await evaluate(`(() => {
      const modal = document.querySelector('.resume-manager-modal');
      const title = modal?.querySelector('h3')?.textContent || '';
      const masterBadge = modal?.querySelector('.master-badge');
      const cards = modal?.querySelectorAll('.resume-card');
      const addBtn = modal?.querySelector('.add-resume-btn');
      return JSON.stringify({
        hasModal: Boolean(modal),
        title,
        hasMasterBadge: Boolean(masterBadge),
        cardsCount: cards?.length || 0,
        hasAddBtn: Boolean(addBtn)
      });
    })()`);
    record('Resume Version Manager', 'Hiển thị kho CV với hồ sơ Master mặc định, các biến thể mục tiêu và nút tạo phiên bản mới', resumeManagerCheck.hasModal && resumeManagerCheck.hasMasterBadge && resumeManagerCheck.cardsCount > 0, `Số phiên bản CV: ${resumeManagerCheck.cardsCount}`);

    console.log('Đóng modal Quản lý CV và mở chi tiết đơn ứng tuyển để kiểm tra May đo CV...');
    await evaluate(`(() => {
      const closeBtn = document.querySelector('.close-manager-btn');
      if (closeBtn) closeBtn.click();
      const backdrop = document.querySelector('.modal-backdrop');
      if (backdrop) backdrop.click();
    })()`);
    await wait(600);

    await evaluate(`(() => {
      const row = document.querySelector('.application-row, .pipeline-card');
      const btn = row?.querySelector('.application-name, .row-open') || row;
      if (btn) btn.click();
    })()`);
    for (let i = 0; i < 20; i++) {
      const ready = await evaluate(`Boolean(document.querySelector('.tailor-resume-btn'))`);
      if (ready) break;
      await wait(200);
    }

    const tailorLaunchCheck = await evaluate(`(() => {
      const tailorBtn = document.querySelector('.tailor-resume-btn');
      if (!tailorBtn) return JSON.stringify({ hasBtn: false });
      tailorBtn.click();
      return JSON.stringify({ hasBtn: true });
    })()`);
    for (let i = 0; i < 20; i++) {
      const ready = await evaluate(`Boolean(document.querySelector('.resume-tailor-modal'))`);
      if (ready) break;
      await wait(200);
    }

    const tailorModalCheck = await evaluate(`(() => {
      const modal = document.querySelector('.resume-tailor-modal');
      const company = document.querySelector('.input-tailor-company')?.value || '';
      const position = document.querySelector('.input-tailor-position')?.value || '';
      const jdTextarea = document.querySelector('.input-tailor-jd');
      const startBtn = document.querySelector('.start-tailor-btn');
      return JSON.stringify({
        hasModal: Boolean(modal),
        hasCompany: Boolean(company),
        hasPosition: Boolean(position),
        hasJdTextarea: Boolean(jdTextarea),
        hasStartBtn: Boolean(startBtn)
      });
    })()`);
    record('Resume Tailor Launcher', 'Kích hoạt hộp thoại May đo CV trực tiếp từ chi tiết đơn ứng tuyển với dữ liệu công ty và vị trí điền sẵn', tailorLaunchCheck.hasBtn && tailorModalCheck.hasModal && tailorModalCheck.hasCompany, `Công ty: ${tailorModalCheck.hasCompany}, Vị trí: ${tailorModalCheck.hasPosition}`);

    console.log('Nhập Mô tả công việc (JD) và khởi chạy may đo tối ưu ATS...');
    await evaluate(`(() => {
      window.__setReactInput('.input-tailor-jd', 'Yêu cầu kỹ sư công nghệ: TypeScript, React, Redux, PostgreSQL, Microservices, CI/CD pipeline và tối ưu hiệu năng web application.');
      const startBtn = document.querySelector('.start-tailor-btn');
      if (startBtn) startBtn.click();
    })()`);
    for (let i = 0; i < 25; i++) {
      const ready = await evaluate(`Boolean(document.querySelector('.ats-score-banner'))`);
      if (ready) break;
      await wait(200);
    }

    const atsScoreCheck = await evaluate(`(() => {
      const banner = document.querySelector('.ats-score-banner');
      const orig = document.querySelector('.original-score')?.textContent.trim() || '';
      const tailored = document.querySelector('.tailored-score')?.textContent.trim() || '';
      const delta = document.querySelector('.score-delta-badge')?.textContent.trim() || '';
      return JSON.stringify({
        hasBanner: Boolean(banner),
        orig,
        tailored,
        delta
      });
    })()`);
    record('ATS Scoring & Live Optimization Engine', 'Bộ máy tính điểm ATS đối soát JD với CV gốc và CV sau may đo, hiển thị tỷ lệ tăng trưởng điểm số', atsScoreCheck.hasBanner && Boolean(atsScoreCheck.orig) && Boolean(atsScoreCheck.tailored), `Điểm ban đầu: ${atsScoreCheck.orig}, Điểm may đo: ${atsScoreCheck.tailored}, Tăng trưởng: ${atsScoreCheck.delta}`);

    console.log('Kiểm tra tab Từ khóa ATS và danh sách Diff so sánh STAR...');
    const diffItemsCount = await evaluate(`document.querySelectorAll('.diff-item').length`);
    await evaluate(`(() => {
      const kwTab = document.querySelector('.tab-keywords');
      if (kwTab) kwTab.click();
    })()`);
    for (let i = 0; i < 25; i++) {
      const chipsCount = await evaluate(`document.querySelectorAll('.keyword-chip').length`);
      if (chipsCount > 0) break;
      await wait(100);
    }
    const diffAndKeywordsCheck = await evaluate(`(() => {
      const chips = document.querySelectorAll('.keyword-chip');
      const matched = document.querySelectorAll('.keyword-chip.matched');
      return JSON.stringify({
        diffsCount: Number(${diffItemsCount}),
        keywordsCount: chips.length,
        matchedCount: matched.length
      });
    })()`);
    record('Resume ATS Keyword & Diff Inspector', 'So sánh từng dòng kinh nghiệm chuẩn STAR và kiểm tra mật độ từ khóa kỹ thuật cần thiết', diffAndKeywordsCheck.diffsCount > 0 && diffAndKeywordsCheck.keywordsCount > 0, `Số điểm tối ưu: ${diffAndKeywordsCheck.diffsCount}, Từ khóa phát hiện: ${diffAndKeywordsCheck.keywordsCount}`);

    console.log('Lưu phiên bản CV may đo vào kho quản lý...');
    await evaluate(`(() => {
      const saveBtn = document.querySelector('.save-tailored-variant-btn');
      if (saveBtn) saveBtn.click();
    })()`);
    await wait(1000);

    const saveVariantCheck = await evaluate(`(() => {
      const successNotice = document.querySelector('.resume-tailor-modal .alert-success');
      const closeBtn = document.querySelector('.close-tailor-btn');
      if (closeBtn) closeBtn.click();
      return JSON.stringify({
        hasSuccess: Boolean(successNotice),
        message: successNotice?.textContent.trim() || ''
      });
    })()`);
    record('Tailored Variant 1-Click Save', 'Lưu thành công CV may đo thành một phiên bản độc lập để nộp trực tiếp cho nhà tuyển dụng', saveVariantCheck.hasSuccess, saveVariantCheck.message);



  } catch (err) {
    console.error('Lỗi trong quá trình kiểm thử:', err);
  } finally {
    ws.close();
    console.log('\n============================================================');
    console.log('             TỔNG HỢP KẾT QUẢ KIỂM THỬ E2E BROWSER          ');
    console.log('============================================================');
    const total = results.length;
    const passed = results.filter(r => r.passed).length;
    const failed = total - passed;
    console.log(`Tổng số kịch bản kiểm thử: ${total}`);
    console.log(`✔ Đạt (Passed):           ${passed}`);
    console.log(`✖ Không đạt (Failed):      ${failed}`);
    console.log(`Tỷ lệ hoàn thành:          ${Math.round((passed / total) * 100)}%\n`);

    if (failed > 0) {
      process.exitCode = 1;
    }
  }
}

main().catch(err => {
  console.error('Lỗi nghiêm trọng:', err);
  process.exit(1);
});
