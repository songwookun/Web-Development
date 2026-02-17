/* ========== 관리자 기능 (인라인 편집) ========== */

/* 비밀번호의 SHA-256 해시값만 저장 (원문 노출 방지) */
/* 비밀번호 변경 시: 브라우저 콘솔에서 아래 실행 후 해시값 교체
   crypto.subtle.digest('SHA-256', new TextEncoder().encode('새비밀번호'))
     .then(h => console.log(Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,'0')).join('')))
*/
const ADMIN_PW_HASH = '46aa9cb46bbe70bb3e069a6ff398999a6fdba5df240e6c05d3b97cada96d8572';

let adminCurrentType = '';
let adminCurrentEditId = null;

/* ---------- 인증 ---------- */
function adminIsAuthed() {
  return sessionStorage.getItem('admin_auth') === '1';
}

async function hashPassword(pw) {
  const data = new TextEncoder().encode(pw);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function adminLogin(pw) {
  const hash = await hashPassword(pw);
  if (hash === ADMIN_PW_HASH) {
    sessionStorage.setItem('admin_auth', '1');
    return true;
  }
  return false;
}

function adminLogout() {
  sessionStorage.removeItem('admin_auth');
  document.body.classList.remove('edit-mode');
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
  const input = document.getElementById('admin-pw-input');
  const error = document.getElementById('admin-login-error');
  overlay.classList.add('show');
  error.classList.remove('show');
  input.value = '';
  setTimeout(() => input.focus(), 100);
}

function adminHideLogin() {
  document.getElementById('admin-login-overlay').classList.remove('show');
}

/* ---------- 이벤트 바인딩 ---------- */
document.addEventListener('DOMContentLoaded', () => {
  // 푸터 저작권 3회 클릭으로 관리자 접근
  let _ac = 0, _at = null;
  document.getElementById('copyright').addEventListener('click', () => {
    _ac++;
    clearTimeout(_at);
    _at = setTimeout(() => { _ac = 0; }, 2000);
    if (_ac >= 3) {
      _ac = 0;
      if (adminIsAuthed()) {
        enterEditMode();
      } else {
        adminShowLogin();
      }
    }
  });

  // 로그인 폼 제출
  document.getElementById('admin-login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pw = document.getElementById('admin-pw-input').value;
    if (await adminLogin(pw)) {
      adminHideLogin();
      enterEditMode();
    } else {
      document.getElementById('admin-login-error').classList.add('show');
      document.getElementById('admin-pw-input').value = '';
      document.getElementById('admin-pw-input').focus();
    }
  });

  // 로그인 모달 닫기
  document.getElementById('admin-login-close').addEventListener('click', () => {
    adminHideLogin();
  });

  document.getElementById('admin-login-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'admin-login-overlay') adminHideLogin();
  });

  // 편집 모달 오버레이 클릭으로 닫기
  document.getElementById('admin-modal-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'admin-modal-overlay') adminCloseModal();
  });
});

/* ---------- 삭제 ---------- */
function adminHandleDelete(type, id) {
  if (!confirm('정말 삭제하시겠습니까?')) return;
  deleteItem(type, id);
  if (type === 'contacts') {
    renderPhoneList();
    return;
  }
  if (location.hash.startsWith('#notice/')) {
    location.hash = '#notices';
  } else {
    navigate();
  }
}

/* ---------- 편집 모달 ---------- */
function adminOpenModal(type, editId = null) {
  adminCurrentType = type;
  adminCurrentEditId = editId;

  /* 단일 객체 타입들 */
  if (type === 'test_info') {
    const info = getData('test_info');
    document.getElementById('admin-modal-title').textContent = '테스트 안내 수정';
    const formEl = document.getElementById('admin-modal-form');
    formEl.innerHTML = `
      <div class="form-group">
        <label>테스트 일정</label>
        <input type="text" id="f-schedule" value="${info.schedule}" required>
      </div>
      <div class="form-group">
        <label>소요 시간</label>
        <input type="text" id="f-duration" value="${info.duration}" required>
      </div>
      <div class="form-group">
        <label>테스트 영역</label>
        <input type="text" id="f-areas" value="${info.areas}" required>
      </div>
      <div class="form-group">
        <label>준비물</label>
        <input type="text" id="f-materials" value="${info.materials}" required>
      </div>
      <div class="form-group">
        <label>비용</label>
        <input type="text" id="f-cost" value="${info.cost}" required>
      </div>
      <div class="form-group">
        <label>문의 전화</label>
        <input type="text" id="f-phone" value="${info.phone}" required>
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

  if (type === 'map_info') {
    const info = getData('map_info');
    document.getElementById('admin-modal-title').textContent = '교통/운영 정보 수정';
    const formEl = document.getElementById('admin-modal-form');
    formEl.innerHTML = `
      <div class="form-group">
        <label>대중교통 안내 (줄바꿈으로 항목 구분)</label>
        <textarea id="f-transport" style="min-height:100px" required>${info.transport}</textarea>
      </div>
      <div class="form-group">
        <label>운영 시간</label>
        <input type="text" id="f-hours" value="${info.hours}" required>
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

  const isEdit = editId !== null;
  let item = isEdit ? getData(type).find(i => i.id === editId) : null;

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

  const forms = {
    banners: `
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

function adminHandleSubmit(e) {
  e.preventDefault();

  /* 단일 객체 저장 */
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
    saveData('test_info', info);
    adminCloseModal();
    navigate();
    return;
  }

  if (adminCurrentType === 'map_info') {
    const info = {
      transport: document.getElementById('f-transport').value.trim(),
      hours: document.getElementById('f-hours').value.trim(),
    };
    saveData('map_info', info);
    adminCloseModal();
    navigate();
    return;
  }

  const collectors = {
    banners: () => ({
      title: document.getElementById('f-title').value.trim(),
      titleAfter: document.getElementById('f-titleAfter').value.trim(),
      subtitle: document.getElementById('f-subtitle').value.trim(),
      bgImage: document.getElementById('f-bgImage').value.trim(),
      btnText: document.getElementById('f-btnText').value.trim(),
      btnLink: document.getElementById('f-btnLink').value.trim(),
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
    updateItem(adminCurrentType, adminCurrentEditId, data);
  } else {
    addItem(adminCurrentType, data);
  }

  adminCloseModal();
  if (isContact) {
    renderPhoneList();
  } else {
    navigate();
  }
}
