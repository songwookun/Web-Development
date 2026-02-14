/* ========== SPA Router & Renderer ========== */

const mainEl = document.getElementById('main-content');
const navEl = document.getElementById('nav');
const hamburgerEl = document.getElementById('hamburger');

/* ---------- 편집 컨트롤 헬퍼 ---------- */
function editBtns(type, id) {
  return `<div class="card-edit-actions">
    <button class="btn-edit" onclick="adminOpenModal('${type}',${id})">수정</button>
    <button class="btn-delete" onclick="adminHandleDelete('${type}',${id})">삭제</button>
  </div>`;
}

function addCard(type, label) {
  return `<div class="card add-card" onclick="adminOpenModal('${type}')">
    <div class="add-card-inner">
      <span class="add-icon">+</span>
      <span>${label}</span>
    </div>
  </div>`;
}

function noticeEditBtns(id) {
  return `<span class="item-edit-actions" onclick="event.preventDefault();event.stopPropagation()">
    <button class="btn-edit" onclick="adminOpenModal('notices',${id})">수정</button>
    <button class="btn-delete" onclick="adminHandleDelete('notices',${id})">삭제</button>
  </span>`;
}

/* ---------- 라우터 ---------- */
function getRoute() {
  const hash = location.hash.slice(1) || 'home';
  const [page, param] = hash.split('/');
  return { page, param };
}

function navigate() {
  const { page, param } = getRoute();
  window.scrollTo(0, 0);

  const renderers = {
    home: renderHome,
    instructors: renderInstructors,
    curriculum: renderCurriculum,
    test: renderTest,
    notices: renderNotices,
    notice: () => renderNoticeDetail(Number(param)),
    map: renderMap,
    terms: renderTerms,
    privacy: renderPrivacy,
    admin: () => {
      if (adminIsAuthed()) {
        enterEditMode();
      } else {
        adminShowLogin();
      }
      renderHome();
    },
  };

  const render = renderers[page] || renderHome;
  render();
  updateActiveNav(page);
  closeMenu();
}

function updateActiveNav(page) {
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href').slice(1);
    link.classList.toggle('active', href === page);
  });
}

/* ---------- 모바일 메뉴 ---------- */
hamburgerEl.addEventListener('click', () => {
  hamburgerEl.classList.toggle('open');
  navEl.classList.toggle('open');
});

function closeMenu() {
  hamburgerEl.classList.remove('open');
  navEl.classList.remove('open');
}

navEl.addEventListener('click', (e) => {
  if (e.target.classList.contains('nav-link')) closeMenu();
});

/* ---------- 플로팅 전화 버튼 ---------- */
const fabPhoneBtn = document.getElementById('fab-phone');
const fabPhoneList = document.getElementById('fab-phone-list');
const fabPhoneWrap = document.getElementById('fab-phone-wrap');

function renderPhoneList() {
  const branches = getData('branches');
  fabPhoneList.innerHTML = branches.map(b => `
    <div class="fab-phone-item">
      <a href="tel:${b.phone.replace(/[^0-9+]/g, '')}" class="fab-phone-link">
        <span class="fab-phone-name">${b.name}</span>
        <span class="fab-phone-num">${b.phone}</span>
      </a>
      <span class="fab-phone-edit" onclick="event.stopPropagation();adminOpenModal('branches',${b.id})">
        <button class="btn-edit">수정</button>
      </span>
      <span class="fab-phone-edit" onclick="event.stopPropagation();adminHandleDelete('branches',${b.id})">
        <button class="btn-delete">삭제</button>
      </span>
    </div>
  `).join('') + `
    <div class="fab-phone-item fab-phone-add" onclick="event.stopPropagation();adminOpenModal('branches')">
      <span>+ 관 추가</span>
    </div>
  `;
}

fabPhoneBtn.addEventListener('click', () => {
  const isOpen = fabPhoneWrap.classList.toggle('open');
  if (isOpen) renderPhoneList();
});

document.addEventListener('click', (e) => {
  if (!fabPhoneWrap.contains(e.target)) {
    fabPhoneWrap.classList.remove('open');
  }
});

/* ---------- 플레이스홀더 이미지 ---------- */
function placeholderImg(text, w = 400, h = 300) {
  return `https://placehold.co/${w}x${h}/1B3A5C/ffffff?text=${encodeURIComponent(text)}`;
}

/* ---------- 메인 화면 ---------- */
function renderHome() {
  const instructors = getData('instructors').slice(0, 3);
  const curriculum = getData('curriculum').slice(0, 3);
  const notices = getData('notices').slice(0, 5);
  const hero = getData('hero');

  const heroStyle = hero.bgImage
    ? `background:linear-gradient(rgba(0,0,0,0.5),rgba(0,0,0,0.5)),url('${hero.bgImage}') center/cover no-repeat;`
    : '';

  mainEl.innerHTML = `
    <!-- 히어로 -->
    <section class="hero" ${heroStyle ? 'style="' + heroStyle + '"' : ''}>
      <div class="hero-edit-wrap">
        <button class="btn-edit hero-edit-btn" onclick="adminOpenModal('hero')">배너 수정</button>
      </div>
      <h1><span class="accent">${hero.title}</span>${hero.titleAfter}</h1>
      <p>${hero.subtitle}</p>
      ${hero.btnText ? `<a href="${hero.btnLink || '#'}" class="hero-btn">${hero.btnText}</a>` : ''}
    </section>

    <!-- 강사진 미리보기 -->
    <section class="section">
      <div class="section-header">
        <h2 class="section-title">강사진 소개</h2>
        <a href="#instructors" class="more-btn">더보기</a>
      </div>
      <div class="card-grid">
        ${instructors.map(i => `
          <div class="card instructor-card">
            <img class="card-img" src="${i.img || placeholderImg(i.name, 400, 300)}" alt="${i.name}">
            <div class="card-body">
              <h3>${i.name}</h3>
              <p class="position">${i.position}</p>
              <p>${i.desc}</p>
              ${editBtns('instructors', i.id)}
            </div>
          </div>
        `).join('')}
        ${addCard('instructors', '강사 추가')}
      </div>
    </section>

    <!-- 교육과정 미리보기 -->
    <section class="section">
      <div class="section-header">
        <h2 class="section-title">교육과정</h2>
        <a href="#curriculum" class="more-btn">더보기</a>
      </div>
      <div class="card-grid">
        ${curriculum.map(c => `
          <div class="card">
            <div class="card-body">
              <span class="card-tag">${c.tag}</span>
              <h3>${c.title}</h3>
              <p>${c.desc}</p>
              ${editBtns('curriculum', c.id)}
            </div>
          </div>
        `).join('')}
        ${addCard('curriculum', '교육과정 추가')}
      </div>
    </section>

    <!-- 입학 테스트 미리보기 -->
    <section class="section">
      <div class="section-header">
        <h2 class="section-title">입학 테스트 안내</h2>
        <a href="#test" class="more-btn">더보기</a>
      </div>
      <div class="test-info">
        <div class="test-steps">
          ${getData('test_steps').slice(0, 3).map((s, idx) => `
            <div class="test-step">
              <div class="step-num">${idx + 1}</div>
              <h4>${s.title}</h4>
              <p>${s.desc}</p>
            </div>
          `).join('')}
        </div>
      </div>
    </section>

    <!-- 공지사항 미리보기 -->
    <section class="section">
      <div class="section-header">
        <h2 class="section-title">공지사항</h2>
        <a href="#notices" class="more-btn">더보기</a>
      </div>
      <button class="add-notice-btn" onclick="adminOpenModal('notices')">+ 공지사항 추가</button>
      <div class="notice-list">
        ${notices.map(n => `
          <a href="#notice/${n.id}" class="notice-item">
            ${n.important ? '<span class="notice-badge">중요</span>' : ''}
            <span class="title">${n.title}</span>
            <span class="date">${n.date}</span>
            ${noticeEditBtns(n.id)}
          </a>
        `).join('')}
      </div>
    </section>
  `;
}

/* ---------- 강사소개 페이지 ---------- */
function renderInstructors() {
  const instructors = getData('instructors');
  mainEl.innerHTML = `
    <div class="page-header">
      <h2>강사진 소개</h2>
      <p>안보라의 전문 강사진을 소개합니다</p>
    </div>
    <section class="section">
      <div class="card-grid">
        ${instructors.map(i => `
          <div class="card instructor-card">
            <img class="card-img" src="${i.img || placeholderImg(i.name, 400, 300)}" alt="${i.name}">
            <div class="card-body">
              <h3>${i.name}</h3>
              <p class="position">${i.position}</p>
              <p>${i.desc}</p>
              ${editBtns('instructors', i.id)}
            </div>
          </div>
        `).join('')}
        ${addCard('instructors', '강사 추가')}
      </div>
    </section>
  `;
}

/* ---------- 교육과정 페이지 ---------- */
function renderCurriculum() {
  const curriculum = getData('curriculum');
  mainEl.innerHTML = `
    <div class="page-header">
      <h2>교육과정</h2>
      <p>체계적인 단계별 교육과정으로 국어 실력을 완성합니다</p>
    </div>
    <section class="section">
      <div class="card-grid">
        ${curriculum.map(c => `
          <div class="card">
            <div class="card-body">
              <span class="card-tag">${c.tag}</span>
              <h3>${c.title}</h3>
              <p>${c.desc}</p>
              <p style="margin-top:12px;font-size:0.85rem;"><strong>대상:</strong> ${c.target}<br><strong>시간:</strong> ${c.schedule}</p>
              ${editBtns('curriculum', c.id)}
            </div>
          </div>
        `).join('')}
        ${addCard('curriculum', '교육과정 추가')}
      </div>
    </section>
  `;
}

/* ---------- 입학 테스트 페이지 ---------- */
function renderTest() {
  const steps = getData('test_steps');
  const info = getData('test_info');

  mainEl.innerHTML = `
    <div class="page-header">
      <h2>입학 테스트</h2>
      <p>정확한 실력 진단으로 최적의 학습 과정을 안내합니다</p>
    </div>
    <section class="section">
      <div class="test-info">
        <h3>테스트 진행 절차</h3>
        <div class="test-steps">
          ${steps.map((s, idx) => `
            <div class="test-step">
              <div class="step-num">${idx + 1}</div>
              <h4>${s.title}</h4>
              <p>${s.desc}</p>
              ${editBtns('test_steps', s.id)}
            </div>
          `).join('')}
          <div class="test-step add-step" onclick="adminOpenModal('test_steps')">
            <div class="add-card-inner">
              <span class="add-icon">+</span>
              <span>단계 추가</span>
            </div>
          </div>
        </div>

        <div class="test-info-section">
          <h3>테스트 안내</h3>
          <div class="test-detail-edit">
            <button class="btn-edit" onclick="adminOpenModal('test_info')">수정</button>
          </div>
          <div class="test-info-content">
            <p><strong>테스트 일정:</strong> ${info.schedule}</p>
            <p><strong>소요 시간:</strong> ${info.duration}</p>
            <p><strong>테스트 영역:</strong> ${info.areas}</p>
            <p><strong>준비물:</strong> ${info.materials}</p>
            <p><strong>비용:</strong> ${info.cost}</p>
            <p><strong>문의:</strong> ${info.phone}</p>
          </div>
          ${info.formUrl ? `<a href="${info.formUrl}" target="_blank" rel="noopener" class="test-apply-btn">온라인 신청하기</a>` : ''}
        </div>
      </div>
    </section>
  `;
}

/* ---------- 공지사항 목록 ---------- */
function renderNotices() {
  mainEl.innerHTML = `
    <div class="page-header">
      <h2>공지사항</h2>
      <p>안보라의 소식을 전합니다</p>
    </div>
    <section class="section">
      <div class="notice-search">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input type="text" id="notice-search-input" placeholder="검색어를 입력하세요">
      </div>
      <button class="add-notice-btn" onclick="adminOpenModal('notices')">+ 공지사항 추가</button>
      <div class="notice-list" id="notice-list-container"></div>
    </section>
  `;

  filterNoticeList();

  const searchInput = document.getElementById('notice-search-input');
  let composing = false;
  searchInput.addEventListener('compositionstart', () => { composing = true; });
  searchInput.addEventListener('compositionend', () => {
    composing = false;
    filterNoticeList(searchInput.value);
  });
  searchInput.addEventListener('input', () => {
    if (!composing) filterNoticeList(searchInput.value);
  });
}

function filterNoticeList(keyword = '') {
  const all = getData('notices');
  const q = keyword.trim().toLowerCase();
  const notices = q
    ? all.filter(n => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q))
    : all;

  document.getElementById('notice-list-container').innerHTML =
    notices.length === 0
      ? `<div style="padding:40px;text-align:center;color:#999;">${q ? '검색 결과가 없습니다.' : '등록된 공지사항이 없습니다.'}</div>`
      : notices.map(n => `
          <a href="#notice/${n.id}" class="notice-item">
            ${n.important ? '<span class="notice-badge">중요</span>' : ''}
            <span class="title">${n.title}</span>
            <span class="date">${n.date}</span>
            ${noticeEditBtns(n.id)}
          </a>
        `).join('');
}

/* ---------- 공지사항 상세 ---------- */
function renderNoticeDetail(id) {
  const notices = getData('notices');
  const notice = notices.find(n => n.id === id);
  if (!notice) {
    mainEl.innerHTML = '<section class="section"><p>존재하지 않는 공지사항입니다.</p><a href="#notices" class="back-btn">목록으로</a></section>';
    return;
  }
  mainEl.innerHTML = `
    <div class="page-header">
      <h2>공지사항</h2>
    </div>
    <div class="notice-detail">
      <div class="notice-detail-edit">
        <button class="btn-edit" onclick="adminOpenModal('notices',${notice.id})">수정</button>
        <button class="btn-delete" onclick="adminHandleDelete('notices',${notice.id})">삭제</button>
      </div>
      <h2>${notice.title}</h2>
      <p class="meta">${notice.date}</p>
      <div class="content">${notice.content}</div>
      <a href="#notices" class="back-btn">목록으로</a>
    </div>
  `;
}

/* ---------- 약도 ---------- */
function renderMap() {
  const branches = getData('branches');
  const branchInfo = [
    { name: '아르누보관', label: '메인', addr: '서울특별시 강남구 도곡로 405, 삼환아르누보 2차 3층', note: '', mapQuery: '서울 강남구 도곡로 405' },
    { name: '한티관', label: '', addr: '서울특별시 강남구 선릉로 318, 동궁상가 2층', note: '한티역 1번 출구 오른쪽 약 100m, 노브랜드 건물 2층', mapQuery: '서울 강남구 선릉로 318' },
    { name: '디마크관', label: '', addr: '서울특별시 강남구 도곡로 408, 디마크빌딩 5층 509호', note: '한티역 3번 출구 약 110m', mapQuery: '서울 강남구 도곡로 408' },
  ];

  mainEl.innerHTML = `
    <div class="page-header">
      <h2>오시는 길</h2>
      <p>안보라 국어학원 캠퍼스 안내</p>
    </div>
    <div class="info-page">

      ${branchInfo.map(b => `
        <div class="map-branch-card">
          <div class="map-branch-header">
            <h3>${b.name} ${b.label ? '<span class="map-branch-label">' + b.label + '</span>' : ''}</h3>
            <a href="https://map.kakao.com/link/search/${encodeURIComponent(b.mapQuery)}" target="_blank" rel="noopener" class="map-kakao-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
              카카오맵에서 보기
            </a>
          </div>
          <p class="map-branch-addr">${b.addr}</p>
          ${b.note ? '<p class="map-branch-note">' + b.note + '</p>' : ''}
        </div>
      `).join('')}

      <h3>대중교통 안내</h3>
      <ul>
        <li><strong>지하철:</strong> 수인분당선 한티역 1번 · 3번 출구</li>
        <li><strong>버스:</strong> 한티역 정류장 하차 (강남06, 4412)</li>
      </ul>

      <h3>연락처</h3>
      <div class="branch-contact-list">
        ${branches.map(b => `
          <div class="branch-contact-item">
            <strong>${b.name}</strong>
            <a href="tel:${b.phone.replace(/[^0-9+]/g, '')}">${b.phone}</a>
          </div>
        `).join('')}
      </div>
      <p style="margin-top:12px;">운영 시간: 화~금 15:00 ~ 22:00 / 토~일 10:00 ~ 22:00 / 월요일 정기 휴무</p>
    </div>
  `;
}

/* ---------- 이용약관 ---------- */
function renderTerms() {
  mainEl.innerHTML = `
    <div class="page-header">
      <h2>사이트 이용약관</h2>
    </div>
    <div class="info-page">
      <h3>제1조 (목적)</h3>
      <p>본 약관은 안보라(이하 "학원")이 운영하는 웹사이트(이하 "사이트")에서 제공하는 서비스의 이용과 관련하여 학원과 이용자 간의 권리·의무 및 기타 필요한 사항을 규정함을 목적으로 합니다.</p>

      <h3>제2조 (용어의 정의)</h3>
      <p>"사이트"란 학원이 교육 서비스 및 관련 정보를 제공하기 위해 운영하는 인터넷 웹사이트를 말합니다.<br>"이용자"란 본 사이트에 접속하여 약관에 따라 학원이 제공하는 서비스를 이용하는 자를 말합니다.</p>

      <h3>제3조 (약관의 효력 및 변경)</h3>
      <p>본 약관은 사이트에 공시함으로써 효력이 발생합니다. 학원은 관련 법령에 위배되지 않는 범위 내에서 약관을 변경할 수 있으며, 변경된 약관은 사이트에 공시한 날로부터 효력이 발생합니다.</p>

      <h3>제4조 (서비스의 제공)</h3>
      <p>학원은 다음과 같은 서비스를 제공합니다.</p>
      <ul>
        <li>교육과정 및 강사 소개 정보 제공</li>
        <li>입학 테스트 안내</li>
        <li>공지사항 및 학원 소식 제공</li>
      </ul>

      <h3>제5조 (면책사항)</h3>
      <p>학원은 천재지변, 불가항력, 또는 이에 준하는 사유로 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.</p>
    </div>
  `;
}

/* ---------- 개인정보처리방침 ---------- */
function renderPrivacy() {
  mainEl.innerHTML = `
    <div class="page-header">
      <h2>개인정보처리방침</h2>
    </div>
    <div class="info-page">
      <h3>1. 개인정보의 수집 및 이용 목적</h3>
      <p>안보라은 다음 목적을 위해 개인정보를 수집·이용합니다. 수집한 개인정보는 아래 목적 이외의 용도로 이용되지 않으며, 목적이 변경될 경우 사전에 동의를 구합니다.</p>
      <ul>
        <li>수강 상담 및 입학 테스트 예약</li>
        <li>교육 서비스 제공 및 학습 관리</li>
        <li>공지사항 전달</li>
      </ul>

      <h3>2. 수집하는 개인정보 항목</h3>
      <p>성명, 연락처(전화번호), 학년, 학교명</p>

      <h3>3. 개인정보의 보유 및 이용 기간</h3>
      <p>수집된 개인정보는 수집 목적이 달성된 후 지체 없이 파기합니다. 단, 관계 법령에 의해 보존할 필요가 있는 경우 해당 법령에서 정한 기간 동안 보존합니다.</p>

      <h3>4. 개인정보의 파기 절차 및 방법</h3>
      <p>보유 기간이 경과하거나 처리 목적이 달성된 개인정보는 재생이 불가능한 방법으로 파기합니다.</p>

      <h3>5. 개인정보 보호 책임자</h3>
      <p>성명: 안보라<br>직위: 원장<br>연락처: 02-556-8383<br>이메일: privacy@anboraedu.co.kr</p>

      <h3>6. 정책 변경</h3>
      <p>본 개인정보처리방침은 2026년 1월 1일부터 시행됩니다. 변경 사항이 있을 경우 사이트를 통해 공지합니다.</p>
    </div>
  `;
}

/* ---------- 초기화 ---------- */
window.addEventListener('hashchange', navigate);
window.addEventListener('DOMContentLoaded', navigate);