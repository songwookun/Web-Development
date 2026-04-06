/* ========== 관리자 기능 (Supabase Auth) ========== */
/* 기존 SHA-256 해시 비교 방식 → Supabase Auth 이메일/비밀번호 로그인 */

let adminCurrentType = '';
let adminCurrentEditId = null;
let adminBannerPage = 'home'; /* 배너가 속한 페이지 */

/* ---------- 인증 상태 관리 ---------- */
/* Supabase Auth 세션을 추적하는 플래그 (동기적으로 확인 가능) */
let _isAdmin = false;

/* 페이지 로드 시 기존 세션 확인 */
supabaseClient.auth.getSession().then(({ data: { session } }) => {
  _isAdmin = !!session;
});

/* 로그인/로그아웃 이벤트 자동 감지 */
supabaseClient.auth.onAuthStateChange((event, session) => {
  _isAdmin = !!session;
  /* 세션이 없으면 편집 모드 해제 */
  if (!session) {
    document.body.classList.remove('edit-mode');
  }
});

/* 현재 관리자 로그인 상태 확인 (동기 함수 - 기존 호출부 호환) */
function adminIsAuthed() {
  return _isAdmin;
}

/* ---------- 로그인 ---------- */
async function adminLogin(email, password) {
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    console.error('로그인 오류:', error.message);
    return false;
  }
  return true;
}

/* ---------- 로그아웃 ---------- */
async function adminLogout() {
  await supabaseClient.auth.signOut();
  document.body.classList.remove('edit-mode');
}

/* ---------- 비밀번호 변경 ---------- */
async function adminChangePw(newPassword) {
  const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
  if (error) {
    alert('비밀번호 변경 실패: ' + error.message);
    return false;
  }
  alert('비밀번호가 변경되었습니다.');
  return true;
}

/* ---------- 편집 모드 ---------- */
function enterEditMode() {
  document.body.classList.add('edit-mode');
}

function exitEditMode() {
  document.body.classList.remove('edit-mode');
}

/* ---------- 로그인 모달 ---------- */
function adminShowLogin() {
  const overlay = document.getElementById('admin-login-overlay');
  const emailInput = document.getElementById('admin-email-input');
  const pwInput = document.getElementById('admin-pw-input');
  const error = document.getElementById('admin-login-error');
  overlay.classList.add('show');
  error.classList.remove('show');
  emailInput.value = '';
  pwInput.value = '';
  setTimeout(() => emailInput.focus(), 100);
}

function adminHideLogin() {
  document.getElementById('admin-login-overlay').classList.remove('show');
}

/* ---------- 비밀번호 변경 모달 ---------- */
function adminShowChangePw() {
  const overlay = document.getElementById('admin-pw-change-overlay');
  overlay.classList.add('show');
  document.getElementById('admin-new-pw').value = '';
  document.getElementById('admin-new-pw-confirm').value = '';
  document.getElementById('admin-pw-change-error').textContent = '';
  document.getElementById('admin-pw-change-error').classList.remove('show');
}

function adminHideChangePw() {
  document.getElementById('admin-pw-change-overlay').classList.remove('show');
}

/* ---------- 이벤트 바인딩 ---------- */
document.addEventListener('DOMContentLoaded', () => {
  /* 로그인 폼 제출 */
  document.getElementById('admin-login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('admin-email-input').value.trim();
    const pw = document.getElementById('admin-pw-input').value;
    if (await adminLogin(email, pw)) {
      adminHideLogin();
      enterEditMode();
      location.hash = '#home';
    } else {
      document.getElementById('admin-login-error').classList.add('show');
      document.getElementById('admin-pw-input').value = '';
      document.getElementById('admin-pw-input').focus();
    }
  });

  /* 로그인 모달 닫기 */
  document.getElementById('admin-login-close').addEventListener('click', () => {
    adminHideLogin();
    if (location.hash === '#admin') location.hash = '#home';
  });
  document.getElementById('admin-login-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'admin-login-overlay') {
      adminHideLogin();
      if (location.hash === '#admin') location.hash = '#home';
    }
  });

  /* 비밀번호 변경 폼 제출 */
  document.getElementById('admin-pw-change-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const newPw = document.getElementById('admin-new-pw').value;
    const confirmPw = document.getElementById('admin-new-pw-confirm').value;
    const errorEl = document.getElementById('admin-pw-change-error');

    if (newPw.length < 6) {
      errorEl.textContent = '비밀번호는 6자 이상이어야 합니다.';
      errorEl.classList.add('show');
      return;
    }
    if (newPw !== confirmPw) {
      errorEl.textContent = '비밀번호가 일치하지 않습니다.';
      errorEl.classList.add('show');
      return;
    }

    if (await adminChangePw(newPw)) {
      adminHideChangePw();
    }
  });

  /* 비밀번호 변경 모달 닫기 */
  document.getElementById('admin-pw-change-close').addEventListener('click', () => {
    adminHideChangePw();
  });
  document.getElementById('admin-pw-change-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'admin-pw-change-overlay') adminHideChangePw();
  });

  /* 편집 모달: 오버레이 클릭으로 닫히지 않음 (취소/수정하기 버튼으로만 닫기) */
});

/* ---------- 드래그 앤 드롭 정렬 ---------- */
function initSortable() {
  if (!document.body.classList.contains('edit-mode')) return;

  document.querySelectorAll('[data-sortable]').forEach(container => {
    if (container._sortableInit) return;
    container._sortableInit = true;

    const type = container.dataset.sortable;

    /* --- 데스크톱 드래그 (마우스 직접 제어) --- */
    let dragEl = null;
    let dragClone = null;
    let dragOffsetX = 0;
    let dragOffsetY = 0;

    container.addEventListener('mousedown', (e) => {
      const handle = e.target.closest('[data-drag-handle]');
      if (!handle) return;
      const item = handle.closest('[data-id]');
      if (!item) return;
      e.preventDefault();

      dragEl = item;
      dragEl.classList.add('drag-dragging');

      const rect = item.getBoundingClientRect();
      dragOffsetX = e.clientX - rect.left;
      dragOffsetY = e.clientY - rect.top;

      dragClone = item.cloneNode(true);
      dragClone.classList.add('drag-clone');
      dragClone.style.width = rect.width + 'px';
      dragClone.style.left = (e.clientX - dragOffsetX) + 'px';
      dragClone.style.top = (e.clientY - dragOffsetY) + 'px';
      document.body.appendChild(dragClone);

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    function onMouseMove(e) {
      if (!dragEl) return;
      e.preventDefault();

      if (dragClone) {
        dragClone.style.left = (e.clientX - dragOffsetX) + 'px';
        dragClone.style.top = (e.clientY - dragOffsetY) + 'px';
      }

      const target = getDragTarget(container, e.clientY, e.clientX);
      clearDragOver(container);
      if (target && target !== dragEl) {
        target.classList.add('drag-over');
      }
    }

    function onMouseUp(e) {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      if (!dragEl) return;

      const target = getDragTarget(container, e.clientY, e.clientX);
      if (target && target !== dragEl) {
        const rect = target.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        if (e.clientY < midY) {
          container.insertBefore(dragEl, target);
        } else {
          container.insertBefore(dragEl, target.nextSibling);
        }
        finishDrag(container, type);
      }

      dragEl.classList.remove('drag-dragging');
      if (dragClone) { dragClone.remove(); dragClone = null; }
      dragEl = null;
      clearDragOver(container);
    }

    /* --- 모바일 터치 드래그 --- */
    let touchDragEl = null;
    let touchClone = null;
    let touchTimer = null;
    let touchStartY = 0;
    let touchStartX = 0;
    let isDragActive = false;

    container.addEventListener('touchstart', (e) => {
      const handle = e.target.closest('[data-drag-handle]');
      if (!handle) return;
      const item = handle.closest('[data-id]');
      if (!item) return;

      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;

      touchTimer = setTimeout(() => {
        isDragActive = true;
        touchDragEl = item;
        touchDragEl.classList.add('drag-dragging');

        /* 복제본 생성 */
        touchClone = item.cloneNode(true);
        touchClone.classList.add('drag-clone');
        touchClone.style.width = item.offsetWidth + 'px';
        touchClone.style.left = (touchStartX - item.offsetWidth / 2) + 'px';
        touchClone.style.top = (touchStartY - 30) + 'px';
        document.body.appendChild(touchClone);
      }, 150);
    }, { passive: true });

    container.addEventListener('touchmove', (e) => {
      if (!isDragActive || !touchDragEl) {
        /* 아직 드래그 시작 전이면 타이머 취소 */
        if (touchTimer && !isDragActive) {
          const dx = Math.abs(e.touches[0].clientX - touchStartX);
          const dy = Math.abs(e.touches[0].clientY - touchStartY);
          if (dx > 10 || dy > 10) {
            clearTimeout(touchTimer);
            touchTimer = null;
          }
        }
        return;
      }
      e.preventDefault();

      const touch = e.touches[0];
      if (touchClone) {
        touchClone.style.left = (touch.clientX - touchClone.offsetWidth / 2) + 'px';
        touchClone.style.top = (touch.clientY - 30) + 'px';
      }

      const target = getDragTarget(container, touch.clientY, touch.clientX);
      clearDragOver(container);
      if (target && target !== touchDragEl) {
        target.classList.add('drag-over');
      }
    }, { passive: false });

    container.addEventListener('touchend', (e) => {
      clearTimeout(touchTimer);
      touchTimer = null;

      if (!isDragActive || !touchDragEl) {
        isDragActive = false;
        return;
      }

      const touch = e.changedTouches[0];
      const target = getDragTarget(container, touch.clientY, touch.clientX);
      if (target && target !== touchDragEl) {
        const rect = target.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        if (touch.clientY < midY) {
          container.insertBefore(touchDragEl, target);
        } else {
          container.insertBefore(touchDragEl, target.nextSibling);
        }
      }

      touchDragEl.classList.remove('drag-dragging');
      if (touchClone) {
        touchClone.remove();
        touchClone = null;
      }
      clearDragOver(container);
      finishDrag(container, type);

      touchDragEl = null;
      isDragActive = false;
    }, { passive: true });
  });
}

/* 드래그 대상 요소 탐색 (포인터 위치 기반) */
function getDragTarget(container, clientY, clientX) {
  const items = [...container.querySelectorAll('[data-id]')];
  for (const item of items) {
    const rect = item.getBoundingClientRect();
    if (clientY >= rect.top && clientY <= rect.bottom &&
        clientX >= rect.left && clientX <= rect.right) {
      return item;
    }
  }
  /* 가장 가까운 요소 반환 */
  let closest = null;
  let minDist = Infinity;
  for (const item of items) {
    const rect = item.getBoundingClientRect();
    const cy = rect.top + rect.height / 2;
    const dist = Math.abs(clientY - cy);
    if (dist < minDist) {
      minDist = dist;
      closest = item;
    }
  }
  return closest;
}

function clearDragOver(container) {
  container.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
}

async function finishDrag(container, type) {
  const items = [...container.querySelectorAll('[data-id]')];
  const sorted = items.map((el, idx) => ({
    id: Number(el.dataset.id),
    sortOrder: (idx + 1) * 10,
  }));

  /* 번호 텍스트 갱신 (test_steps의 step-num, banner-sort의 num) */
  items.forEach((el, idx) => {
    const numEl = el.querySelector('.step-num') || el.querySelector('.banner-sort-num');
    if (numEl) numEl.textContent = idx + 1;
  });

  await updateSortOrder(type, sorted);
}

/* ---------- 삭제 (비동기) ---------- */
async function adminHandleDelete(type, id) {
  if (!confirm('정말 삭제하시겠습니까?')) return;
  await deleteItem(type, id);
  if (type === 'contacts') {
    await renderPhoneList();
    return;
  }
  if (location.hash.startsWith('#notice/')) {
    location.hash = '#notices';
  } else {
    await navigate();
  }
}

/* ---------- 편집 모달 (비동기 - DB에서 데이터 조회) ---------- */
async function adminOpenModal(type, editId = null, bannerPage = null) {
  adminCurrentType = type;
  adminCurrentEditId = editId;
  if (type === 'banners' && bannerPage) adminBannerPage = bannerPage;

  /* 단일 객체: 예약 설정 */
  if (type === 'test_booking_config') {
    const config = await getData('test_booking_config');
    document.getElementById('admin-modal-title').textContent = '입학 테스트 예약 설정';
    const formEl = document.getElementById('admin-modal-form');

    const currentDays = config.availableDays || [];
    const currentTimes = config.availableTimes || ['16:00', '19:00', '20:00'];

    formEl.innerHTML = `
      <div class="form-group">
        <label>지정 요일 (선택)</label>
        <div class="booking-day-checkboxes" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:4px;">
          ${['일', '월', '화', '수', '목', '금', '토'].map((d, i) => `
            <label style="display:flex;align-items:center;gap:4px;font-weight:400;font-size:0.95rem;">
              <input type="checkbox" class="f-avail-day" value="${i}" ${currentDays.includes(i) ? 'checked' : ''}>
              ${d}
            </label>
          `).join('')}
        </div>
      </div>
      <div class="form-group">
        <label>시간대 (쉼표로 구분)</label>
        <input type="text" id="f-avail-times" value="${currentTimes.join(', ')}" placeholder="16:00, 19:00, 20:00" required>
      </div>
      <div class="form-group">
        <label>하루 최대 인원</label>
        <input type="number" id="f-max-per-day" value="${config.maxPerDay || 20}" min="1" required>
      </div>
      <div class="form-group">
        <label>Apps Script 웹앱 URL</label>
        <input type="url" id="f-script-url" value="${config.scriptUrl || ''}" placeholder="https://script.google.com/macros/s/.../exec" required>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn-cancel" onclick="adminCloseModal()">취소</button>
        <button type="submit" class="btn-save">저장</button>
      </div>
    `;
    formEl.onsubmit = adminHandleSubmit;
    document.getElementById('admin-modal-overlay').classList.add('show');
    return;
  }

  /* 단일 객체: 테스트 안내 */
  if (type === 'test_info') {
    const info = await getData('test_info');
    document.getElementById('admin-modal-title').textContent = '테스트 안내 수정';
    const formEl = document.getElementById('admin-modal-form');
    formEl.innerHTML = `
      <div class="form-group">
        <label>테스트 일정</label>
        <input type="text" id="f-schedule" value="${info.schedule || ''}" required>
      </div>
      <div class="form-group">
        <label>소요 시간</label>
        <input type="text" id="f-duration" value="${info.duration || ''}" required>
      </div>
      <div class="form-group">
        <label>테스트 영역</label>
        <input type="text" id="f-areas" value="${info.areas || ''}" required>
      </div>
      <div class="form-group">
        <label>준비물</label>
        <input type="text" id="f-materials" value="${info.materials || ''}" required>
      </div>
      <div class="form-group">
        <label>비용</label>
        <input type="text" id="f-cost" value="${info.cost || ''}" required>
      </div>
      <div class="form-group">
        <label>문의 전화</label>
        <input type="text" id="f-phone" value="${info.phone || ''}" required>
      </div>
      <div class="form-group">
        <label>구글폼 신청 링크 (선택)</label>
        <input type="url" id="f-formUrl" value="${info.formUrl || ''}" placeholder="https://docs.google.com/forms/...">
      </div>
      <div class="modal-actions">
        <button type="button" class="btn-cancel" onclick="adminCloseModal()">취소</button>
        <button type="submit" class="btn-save">수정</button>
      </div>
    `;
    formEl.onsubmit = adminHandleSubmit;
    document.getElementById('admin-modal-overlay').classList.add('show');
    return;
  }

  /* 단일 객체: 약도 부가정보 */
  if (type === 'map_info') {
    const info = await getData('map_info');
    document.getElementById('admin-modal-title').textContent = '교통/운영 정보 수정';
    const formEl = document.getElementById('admin-modal-form');
    formEl.innerHTML = `
      <div class="form-group">
        <label>대중교통 안내 (줄바꿈으로 항목 구분)</label>
        <textarea id="f-transport" style="min-height:100px" required>${info.transport || ''}</textarea>
      </div>
      <div class="form-group">
        <label>운영 시간</label>
        <input type="text" id="f-hours" value="${info.hours || ''}" required>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn-cancel" onclick="adminCloseModal()">취소</button>
        <button type="submit" class="btn-save">수정</button>
      </div>
    `;
    formEl.onsubmit = adminHandleSubmit;
    document.getElementById('admin-modal-overlay').classList.add('show');
    return;
  }

  /* 배열 타입: 수정 시 해당 항목 조회 */
  const isEdit = editId !== null;
  let item = null;
  if (isEdit) {
    const items = await getData(type);
    item = items.find(i => i.id === editId);
    /* 배너 수정 시 기존 page 값 복원 */
    if (type === 'banners' && item && item.page) adminBannerPage = item.page;
  }

  const titles = {
    banners: isEdit ? '배너 수정' : '배너 추가',
    instructors: isEdit ? '강사 수정' : '강사 추가',
    curriculum: isEdit ? '교육과정 수정' : '교육과정 추가',
    notices: isEdit ? '공지사항 수정' : '공지사항 추가',
    test_steps: isEdit ? '테스트 단계 수정' : '테스트 단계 추가',
    contacts: isEdit ? '연락처 수정' : '연락처 추가',
    map_branches: isEdit ? '캠퍼스 수정' : '캠퍼스 추가',
    terms: isEdit ? '약관 항목 수정' : '약관 항목 추가',
    privacy: isEdit ? '개인정보 항목 수정' : '개인정보 항목 추가',
  };
  document.getElementById('admin-modal-title').textContent = titles[type];

  const pageLabels = { home: '메인', instructors: '강사소개', curriculum: '교육과정', test: '입학테스트', notices: '공지사항' };
  const bannerPageVal = item ? (item.page || adminBannerPage) : adminBannerPage;

  const forms = {
    banners: `
      <div class="form-group">
        <label>대상 페이지</label>
        <input type="text" id="f-page" value="${pageLabels[bannerPageVal] || bannerPageVal}" readonly style="background:#f5f6f8;cursor:default;">
      </div>
      <div class="form-group">
        <label>강조 문구 (색상 적용)</label>
        <input type="text" id="f-title" value="${item ? item.title : ''}" placeholder="예: 국어의 힘" required>
      </div>
      <div class="form-group">
        <label>이어지는 문구</label>
        <input type="text" id="f-titleAfter" value="${item ? item.titleAfter : ''}" placeholder="예: 을 키우는 곳" required>
      </div>
      <div class="form-group">
        <label>설명</label>
        <textarea id="f-subtitle" required>${item ? item.subtitle : ''}</textarea>
      </div>
      <div class="form-group">
        <label>배경 이미지 URL (선택 · 비우면 기본 색상)</label>
        <input type="text" id="f-bgImage" value="${item ? item.bgImage || '' : ''}" placeholder="https://...">
      </div>
      <div class="form-group">
        <label>배경 크기</label>
        <select id="f-bgSize">
          <option value="cover" ${item && item.bgSize === 'cover' ? 'selected' : ''}>꽉 채우기 (cover)</option>
          <option value="contain" ${item && item.bgSize === 'contain' ? 'selected' : ''}>이미지 전체 보기 (contain)</option>
          <option value="fit" ${item && item.bgSize === 'fit' ? 'selected' : ''}>이미지에 맞추기 (빈공간 없음)</option>
          <option value="auto" ${item && item.bgSize === 'auto' ? 'selected' : ''}>원본 크기 (auto)</option>
        </select>
      </div>
      <div class="form-group">
        <label>배경 위치</label>
        <select id="f-bgPosition">
          <option value="center" ${!item || !item.bgPosition || item.bgPosition === 'center' ? 'selected' : ''}>중앙</option>
          <option value="top" ${item && item.bgPosition === 'top' ? 'selected' : ''}>상단</option>
          <option value="bottom" ${item && item.bgPosition === 'bottom' ? 'selected' : ''}>하단</option>
          <option value="left" ${item && item.bgPosition === 'left' ? 'selected' : ''}>왼쪽</option>
          <option value="right" ${item && item.bgPosition === 'right' ? 'selected' : ''}>오른쪽</option>
          <option value="top left" ${item && item.bgPosition === 'top left' ? 'selected' : ''}>좌상단</option>
          <option value="top right" ${item && item.bgPosition === 'top right' ? 'selected' : ''}>우상단</option>
          <option value="bottom left" ${item && item.bgPosition === 'bottom left' ? 'selected' : ''}>좌하단</option>
          <option value="bottom right" ${item && item.bgPosition === 'bottom right' ? 'selected' : ''}>우하단</option>
        </select>
      </div>
      <div class="form-group">
        <label>배경 어둡기 (0 = 원본, 70 = 많이 어둡게)</label>
        <input type="range" id="f-bgDim" min="0" max="80" value="${item && item.bgDim !== undefined ? item.bgDim : 45}" oninput="document.getElementById('f-bgDim-val').textContent=this.value+'%'">
        <span id="f-bgDim-val" style="font-size:0.85rem;color:#666;">${item && item.bgDim !== undefined ? item.bgDim : 45}%</span>
      </div>
      <div class="form-group">
        <label>버튼 링크 URL (비우면 버튼 숨김)</label>
        <input type="text" id="f-btnLink" value="${item ? item.btnLink || '' : ''}" placeholder="예: #test 또는 https://...">
      </div>
      <div class="form-group">
        <label>버튼 표시 이름 (비우면 버튼 숨김)</label>
        <input type="text" id="f-btnText" value="${item ? item.btnText || '' : ''}" placeholder="예: 입학 테스트 신청">
      </div>
    `,
    instructors: `
      <div class="form-group">
        <label>이름</label>
        <input type="text" id="f-name" value="${item ? item.name : ''}" required>
      </div>
      <div class="form-group">
        <label>직책</label>
        <input type="text" id="f-position" value="${item ? item.position : ''}" placeholder="예: 대표 강사 · 국어 문학" required>
      </div>
      <div class="form-group">
        <label>소개</label>
        <textarea id="f-desc" required>${item ? item.desc : ''}</textarea>
      </div>
      <div class="form-group">
        <label>이미지 URL (선택)</label>
        <input type="text" id="f-img" value="${item ? item.img : ''}" placeholder="https://...">
      </div>
      <div class="form-group">
        <label>소개 링크 URL (선택)</label>
        <input type="text" id="f-link" value="${item ? item.link || '' : ''}" placeholder="https://...">
      </div>
      <div class="form-group">
        <label>링크 표시 이름 (선택 · 비우면 "더 보기")</label>
        <input type="text" id="f-linkLabel" value="${item ? item.linkLabel || '' : ''}" placeholder="예: 더 보기">
      </div>
    `,
    curriculum: `
      <div class="form-group">
        <label>과정명</label>
        <input type="text" id="f-title" value="${item ? item.title : ''}" required>
      </div>
      <div class="form-group">
        <label>구분</label>
        <input type="text" id="f-tag" value="${item ? item.tag : ''}" placeholder="예: 기초, 심화, 파이널" required>
      </div>
      <div class="form-group">
        <label>설명</label>
        <textarea id="f-desc" required>${item ? item.desc : ''}</textarea>
      </div>
      <div class="form-group">
        <label>대상</label>
        <input type="text" id="f-target" value="${item ? item.target : ''}" placeholder="예: 고2 · 고3" required>
      </div>
      <div class="form-group">
        <label>수업 시간</label>
        <input type="text" id="f-schedule" value="${item ? item.schedule : ''}" placeholder="예: 월/수/금 16:00 ~ 18:00" required>
      </div>
      <div class="form-group">
        <label>링크 URL (선택)</label>
        <input type="text" id="f-link" value="${item ? item.link || '' : ''}" placeholder="https://...">
      </div>
      <div class="form-group">
        <label>링크 표시 이름 (선택 · 비우면 "더 보기")</label>
        <input type="text" id="f-linkLabel" value="${item ? item.linkLabel || '' : ''}" placeholder="예: 더 보기">
      </div>
    `,
    notices: `
      <div class="form-group">
        <label>제목</label>
        <input type="text" id="f-title" value="${item ? item.title : ''}" required>
      </div>
      <div class="form-group">
        <label>날짜</label>
        <input type="date" id="f-date" value="${item ? item.date : new Date().toISOString().slice(0, 10)}" required>
      </div>
      <div class="form-group">
        <label>내용</label>
        <textarea id="f-content" style="min-height:200px" required>${item ? item.content : ''}</textarea>
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" id="f-important" ${item && item.important ? 'checked' : ''}>
          중요 공지로 설정
        </label>
      </div>
    `,
    test_steps: `
      <div class="form-group">
        <label>단계 제목</label>
        <input type="text" id="f-title" value="${item ? item.title : ''}" placeholder="예: 전화 예약" required>
      </div>
      <div class="form-group">
        <label>설명</label>
        <textarea id="f-desc" required>${item ? item.desc : ''}</textarea>
      </div>
    `,
    contacts: `
      <div class="form-group">
        <label>이름</label>
        <input type="text" id="f-name" value="${item ? item.name : ''}" placeholder="예: 본관, 카카오톡 상담" required>
      </div>
      <div class="form-group">
        <label>전화번호 (선택 · 비우면 링크로 이동)</label>
        <input type="tel" id="f-phone" value="${item ? item.phone || '' : ''}" placeholder="예: 02-1234-5678">
      </div>
      <div class="form-group">
        <label>링크 URL (선택)</label>
        <input type="text" id="f-link" value="${item ? item.link || '' : ''}" placeholder="예: https://pf.kakao.com/...">
      </div>
      <div class="form-group">
        <label>링크 표시 이름 (선택)</label>
        <input type="text" id="f-linkLabel" value="${item ? item.linkLabel || '' : ''}" placeholder="예: 카카오톡 상담">
      </div>
    `,
    map_branches: `
      <div class="form-group">
        <label>캠퍼스 이름</label>
        <input type="text" id="f-name" value="${item ? item.name : ''}" placeholder="예: 아르누보관" required>
      </div>
      <div class="form-group">
        <label>라벨 (선택 · 예: 메인)</label>
        <input type="text" id="f-label" value="${item ? item.label || '' : ''}" placeholder="예: 메인">
      </div>
      <div class="form-group">
        <label>주소</label>
        <input type="text" id="f-addr" value="${item ? item.addr : ''}" required>
      </div>
      <div class="form-group">
        <label>참고 사항 (선택)</label>
        <input type="text" id="f-note" value="${item ? item.note || '' : ''}" placeholder="예: 한티역 1번 출구 오른쪽 약 100m">
      </div>
      <div class="form-group">
        <label>지도 검색어</label>
        <input type="text" id="f-mapQuery" value="${item ? item.mapQuery : ''}" placeholder="예: 서울 강남구 도곡로 405" required>
      </div>
    `,
    terms: `
      <div class="form-group">
        <label>제목</label>
        <input type="text" id="f-title" value="${item ? item.title : ''}" placeholder="예: 제1조 (목적)" required>
      </div>
      <div class="form-group">
        <label>내용 ("- "로 시작하면 목록으로 표시)</label>
        <textarea id="f-content" style="min-height:150px" required>${item ? item.content : ''}</textarea>
      </div>
    `,
    privacy: `
      <div class="form-group">
        <label>제목</label>
        <input type="text" id="f-title" value="${item ? item.title : ''}" placeholder="예: 1. 개인정보의 수집 및 이용 목적" required>
      </div>
      <div class="form-group">
        <label>내용 ("- "로 시작하면 목록으로 표시)</label>
        <textarea id="f-content" style="min-height:150px" required>${item ? item.content : ''}</textarea>
      </div>
    `,
  };

  const formEl = document.getElementById('admin-modal-form');
  formEl.innerHTML = forms[type] + `
    <div class="modal-actions">
      <button type="button" class="btn-cancel" onclick="adminCloseModal()">취소</button>
      <button type="submit" class="btn-save">${isEdit ? '수정' : '추가'}</button>
    </div>
  `;
  formEl.onsubmit = adminHandleSubmit;

  document.getElementById('admin-modal-overlay').classList.add('show');
}

function adminCloseModal() {
  document.getElementById('admin-modal-overlay').classList.remove('show');
  adminCurrentType = '';
  adminCurrentEditId = null;
}

/* ---------- 폼 제출 처리 (비동기 - DB에 저장) ---------- */
async function adminHandleSubmit(e) {
  e.preventDefault();

  /* 중복 제출 방지 */
  const submitBtn = e.target.querySelector('.btn-save');
  if (submitBtn) submitBtn.disabled = true;

  try {
    /* 단일 객체 저장 */
    if (adminCurrentType === 'test_booking_config') {
      const dayCheckboxes = document.querySelectorAll('.f-avail-day:checked');
      const availableDays = [...dayCheckboxes].map(cb => Number(cb.value));
      const timesStr = document.getElementById('f-avail-times').value;
      const availableTimes = timesStr.split(',').map(t => t.trim()).filter(t => t);

      const config = {
        availableDays,
        availableTimes,
        maxPerDay: Number(document.getElementById('f-max-per-day').value) || 20,
        scriptUrl: document.getElementById('f-script-url').value.trim(),
      };
      await saveData('test_booking_config', config);
      adminCloseModal();
      await navigate();
      return;
    }

    if (adminCurrentType === 'test_info') {
      const info = {
        schedule: document.getElementById('f-schedule').value.trim(),
        duration: document.getElementById('f-duration').value.trim(),
        areas: document.getElementById('f-areas').value.trim(),
        materials: document.getElementById('f-materials').value.trim(),
        cost: document.getElementById('f-cost').value.trim(),
        phone: document.getElementById('f-phone').value.trim(),
        formUrl: document.getElementById('f-formUrl').value.trim(),
      };
      await saveData('test_info', info);
      adminCloseModal();
      await navigate();
      return;
    }

    if (adminCurrentType === 'map_info') {
      const info = {
        transport: document.getElementById('f-transport').value.trim(),
        hours: document.getElementById('f-hours').value.trim(),
      };
      await saveData('map_info', info);
      adminCloseModal();
      await navigate();
      return;
    }

    /* 배열 항목 수집 */
    const collectors = {
      banners: () => ({
        title: document.getElementById('f-title').value.trim(),
        titleAfter: document.getElementById('f-titleAfter').value.trim(),
        subtitle: document.getElementById('f-subtitle').value.trim(),
        bgImage: document.getElementById('f-bgImage').value.trim(),
        bgSize: document.getElementById('f-bgSize').value,
        bgPosition: document.getElementById('f-bgPosition').value,
        bgDim: parseInt(document.getElementById('f-bgDim').value, 10),
        btnText: document.getElementById('f-btnText').value.trim(),
        btnLink: document.getElementById('f-btnLink').value.trim(),
        page: adminBannerPage,
      }),
      instructors: () => ({
        name: document.getElementById('f-name').value.trim(),
        position: document.getElementById('f-position').value.trim(),
        desc: document.getElementById('f-desc').value.trim(),
        img: document.getElementById('f-img').value.trim(),
        link: document.getElementById('f-link').value.trim(),
        linkLabel: document.getElementById('f-linkLabel').value.trim(),
      }),
      curriculum: () => ({
        title: document.getElementById('f-title').value.trim(),
        tag: document.getElementById('f-tag').value.trim(),
        desc: document.getElementById('f-desc').value.trim(),
        target: document.getElementById('f-target').value.trim(),
        schedule: document.getElementById('f-schedule').value.trim(),
        link: document.getElementById('f-link').value.trim(),
        linkLabel: document.getElementById('f-linkLabel').value.trim(),
      }),
      notices: () => ({
        title: document.getElementById('f-title').value.trim(),
        date: document.getElementById('f-date').value,
        content: document.getElementById('f-content').value.trim(),
        important: document.getElementById('f-important').checked,
      }),
      test_steps: () => ({
        title: document.getElementById('f-title').value.trim(),
        desc: document.getElementById('f-desc').value.trim(),
      }),
      contacts: () => ({
        name: document.getElementById('f-name').value.trim(),
        phone: document.getElementById('f-phone').value.trim(),
        link: document.getElementById('f-link').value.trim(),
        linkLabel: document.getElementById('f-linkLabel').value.trim(),
      }),
      map_branches: () => ({
        name: document.getElementById('f-name').value.trim(),
        label: document.getElementById('f-label').value.trim(),
        addr: document.getElementById('f-addr').value.trim(),
        note: document.getElementById('f-note').value.trim(),
        mapQuery: document.getElementById('f-mapQuery').value.trim(),
      }),
      terms: () => ({
        title: document.getElementById('f-title').value.trim(),
        content: document.getElementById('f-content').value.trim(),
      }),
      privacy: () => ({
        title: document.getElementById('f-title').value.trim(),
        content: document.getElementById('f-content').value.trim(),
      }),
    };

    const data = collectors[adminCurrentType]();
    const isContact = adminCurrentType === 'contacts';

    if (adminCurrentEditId !== null) {
      await updateItem(adminCurrentType, adminCurrentEditId, data);
    } else {
      await addItem(adminCurrentType, data);
    }

    adminCloseModal();
    if (isContact) {
      await renderPhoneList();
    } else {
      await navigate();
    }
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}
