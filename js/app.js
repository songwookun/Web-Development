/* ========== SPA Router & Renderer (Supabase 연동) ========== */
/* 모든 렌더 함수가 async — DB에서 데이터를 비동기로 조회합니다. */

const mainEl = document.getElementById('main-content');
const navEl = document.getElementById('nav');
const hamburgerEl = document.getElementById('hamburger');

/* ---------- 배너 슬라이더 ---------- */
let bannerInterval = null;
let currentBannerIdx = 0;
let bannerCount = 0; /* 현재 배너 개수 (async 없이 참조) */

function stopBannerSlider() {
  if (bannerInterval) {
    clearInterval(bannerInterval);
    bannerInterval = null;
  }
}

function startBannerSlider() {
  stopBannerSlider();
  if (bannerCount <= 1) return;
  currentBannerIdx = 0;
  bannerInterval = setInterval(() => {
    currentBannerIdx = (currentBannerIdx + 1) % bannerCount;
    updateBannerPosition();
  }, 5000);
}

function updateBannerPosition() {
  const track = document.querySelector('.banner-track');
  const dots = document.querySelectorAll('.banner-dot');
  if (!track) return;
  track.style.transform = `translateX(-${currentBannerIdx * 100}%)`;
  dots.forEach((dot, i) => dot.classList.toggle('active', i === currentBannerIdx));
}

function goToBanner(idx) {
  currentBannerIdx = idx;
  updateBannerPosition();
  if (bannerCount > 1) {
    stopBannerSlider();
    bannerInterval = setInterval(() => {
      currentBannerIdx = (currentBannerIdx + 1) % bannerCount;
      updateBannerPosition();
    }, 5000);
  }
}

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

/* ---------- 강사 링크 헬퍼 ---------- */
function instructorLinkHtml(i) {
  if (!i.link) return '';
  return `<a href="${i.link}" target="_blank" rel="noopener" class="instructor-link">${i.linkLabel || '더 보기'}</a>`;
}

/* ---------- 섹션 내용 렌더링 헬퍼 ---------- */
function renderSectionContent(content) {
  const lines = content.split('\n');
  let html = '';
  let inList = false;

  for (const line of lines) {
    if (line.startsWith('- ')) {
      if (!inList) { html += '<ul>'; inList = true; }
      html += `<li>${line.slice(2)}</li>`;
    } else {
      if (inList) { html += '</ul>'; inList = false; }
      if (line.trim()) html += `<p>${line}</p>`;
    }
  }
  if (inList) html += '</ul>';
  return html;
}

/* ---------- 라우터 ---------- */
function getRoute() {
  const hash = location.hash.slice(1) || 'home';
  const [page, param] = hash.split('/');
  return { page, param };
}

async function navigate() {
  stopBannerSlider();
  const { page, param } = getRoute();
  window.scrollTo(0, 0);

  /* 로딩 표시 (데이터 조회가 빠르면 안 보임) */
  mainEl.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';

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
    admin: async () => {
      if (adminIsAuthed()) {
        enterEditMode();
      } else {
        adminShowLogin();
      }
      await renderHome();
    },
  };

  const render = renderers[page] || renderHome;
  await render();
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

async function renderPhoneList() {
  const contacts = await getData('contacts');
  fabPhoneList.innerHTML = contacts.map(c => {
    const hasPhone = c.phone && c.phone.trim();
    const hasLink = c.link && c.link.trim();

    let href, targetAttr, display;
    if (hasPhone) {
      href = `tel:${c.phone.replace(/[^0-9+]/g, '')}`;
      targetAttr = '';
      display = `<span class="fab-phone-name">${c.name}</span><span class="fab-phone-num">${c.phone}</span>`;
    } else if (hasLink) {
      href = c.link;
      targetAttr = ' target="_blank" rel="noopener"';
      display = `<span class="fab-phone-name">${c.name}</span><span class="fab-phone-num">${c.linkLabel || '바로가기'}</span>`;
    } else {
      href = '#';
      targetAttr = '';
      display = `<span class="fab-phone-name">${c.name}</span>`;
    }

    return `
      <div class="fab-phone-item">
        <a href="${href}"${targetAttr} class="fab-phone-link">
          ${display}
        </a>
        <span class="fab-phone-edit" onclick="event.stopPropagation();adminOpenModal('contacts',${c.id})">
          <button class="btn-edit">수정</button>
        </span>
        <span class="fab-phone-edit" onclick="event.stopPropagation();adminHandleDelete('contacts',${c.id})">
          <button class="btn-delete">삭제</button>
        </span>
      </div>
    `;
  }).join('') + `
    <div class="fab-phone-item fab-phone-add" onclick="event.stopPropagation();adminOpenModal('contacts')">
      <span>+ 연락처 추가</span>
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
async function renderHome() {
  /* 여러 데이터를 동시에 조회 (병렬 요청으로 속도 향상) */
  const [instructors, curriculum, notices, banners, testSteps] = await Promise.all([
    getData('instructors'),
    getData('curriculum'),
    getData('notices'),
    getData('banners'),
    getData('test_steps'),
  ]);

  bannerCount = banners.length;

  const bannerSlides = banners.map(b => {
    const bgStyle = b.bgImage
      ? `background:linear-gradient(rgba(0,0,0,0.5),rgba(0,0,0,0.5)),url('${b.bgImage}') center/cover no-repeat;`
      : '';
    return `
      <div class="banner-slide hero" ${bgStyle ? 'style="' + bgStyle + '"' : ''}>
        <div class="banner-edit-wrap">
          <button class="btn-edit hero-edit-btn" onclick="adminOpenModal('banners',${b.id})">수정</button>
          <button class="btn-delete hero-edit-btn" onclick="adminHandleDelete('banners',${b.id})">삭제</button>
        </div>
        <h1><span class="accent">${b.title}</span>${b.titleAfter}</h1>
        <p>${b.subtitle}</p>
        ${b.btnText && b.btnLink ? `<a href="${b.btnLink}" class="hero-btn">${b.btnText}</a>` : ''}
      </div>
    `;
  }).join('');

  const bannerDots = banners.length > 1
    ? `<div class="banner-dots">${banners.map((_, i) => `<span class="banner-dot${i === 0 ? ' active' : ''}" onclick="goToBanner(${i})"></span>`).join('')}</div>`
    : '';

  mainEl.innerHTML = `
    <!-- 배너 슬라이더 -->
    <section class="banner-slider">
      <div class="banner-track">${bannerSlides}</div>
      ${bannerDots}
      <div class="banner-add-wrap">
        <button class="btn-edit hero-edit-btn" onclick="adminOpenModal('banners')">+ 배너 추가</button>
      </div>
    </section>

    <!-- 강사진 미리보기 -->
    <section class="section">
      <div class="section-header">
        <h2 class="section-title">강사진 소개</h2>
        <a href="#instructors" class="more-btn">더보기</a>
      </div>
      <div class="card-grid">
        ${instructors.slice(0, 3).map(i => `
          <div class="card instructor-card">
            <img class="card-img" src="${i.img || placeholderImg(i.name, 400, 300)}" alt="${i.name}">
            <div class="card-body">
              <h3>${i.name}</h3>
              <p class="position">${i.position}</p>
              <p>${i.desc}</p>
              ${instructorLinkHtml(i)}
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
        ${curriculum.slice(0, 3).map(c => `
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
          ${testSteps.slice(0, 3).map((s, idx) => `
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
        ${notices.slice(0, 5).map(n => `
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

  startBannerSlider();
}

/* ---------- 강사소개 페이지 ---------- */
async function renderInstructors() {
  const instructors = await getData('instructors');
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
              ${instructorLinkHtml(i)}
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
async function renderCurriculum() {
  const curriculum = await getData('curriculum');
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
async function renderTest() {
  const [steps, info] = await Promise.all([
    getData('test_steps'),
    getData('test_info'),
  ]);

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
            <p><strong>테스트 일정:</strong> ${info.schedule || ''}</p>
            <p><strong>소요 시간:</strong> ${info.duration || ''}</p>
            <p><strong>테스트 영역:</strong> ${info.areas || ''}</p>
            <p><strong>준비물:</strong> ${info.materials || ''}</p>
            <p><strong>비용:</strong> ${info.cost || ''}</p>
            <p><strong>문의:</strong> ${info.phone || ''}</p>
          </div>
          ${info.formUrl ? `<a href="${info.formUrl}" target="_blank" rel="noopener" class="test-apply-btn">온라인 신청하기</a>` : ''}
        </div>
      </div>
    </section>
  `;
}

/* ---------- 공지사항 목록 ---------- */
async function renderNotices() {
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

  await filterNoticeList();

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

async function filterNoticeList(keyword = '') {
  const all = await getData('notices');
  const q = keyword.trim().toLowerCase();
  const notices = q
    ? all.filter(n => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q))
    : all;

  const container = document.getElementById('notice-list-container');
  if (!container) return;

  container.innerHTML =
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
async function renderNoticeDetail(id) {
  const notices = await getData('notices');
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
async function renderMap() {
  const [contacts, branches, mapInfo] = await Promise.all([
    getData('contacts'),
    getData('map_branches'),
    getData('map_info'),
  ]);

  const transportLines = (mapInfo.transport || '').split('\n').filter(l => l.trim());

  mainEl.innerHTML = `
    <div class="page-header">
      <h2>오시는 길</h2>
      <p>안보라 국어학원 캠퍼스 안내</p>
    </div>
    <div class="info-page">

      ${branches.map(b => `
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
          ${editBtns('map_branches', b.id)}
        </div>
      `).join('')}

      <div class="map-add-card add-card" onclick="adminOpenModal('map_branches')">
        <div class="add-card-inner">
          <span class="add-icon">+</span>
          <span>캠퍼스 추가</span>
        </div>
      </div>

      <div class="map-extra-section">
        <div class="map-extra-edit">
          <button class="btn-edit" onclick="adminOpenModal('map_info')">수정</button>
        </div>
        <h3>대중교통 안내</h3>
        <ul>
          ${transportLines.map(l => {
            const ci = l.indexOf(':');
            if (ci > -1) return `<li><strong>${l.slice(0, ci + 1)}</strong>${l.slice(ci + 1)}</li>`;
            return `<li>${l}</li>`;
          }).join('')}
        </ul>
        <p style="margin-top:12px;"><strong>운영 시간:</strong> ${mapInfo.hours || ''}</p>
      </div>

      <h3>연락처</h3>
      <div class="branch-contact-list">
        ${contacts.map(c => {
          const hasPhone = c.phone && c.phone.trim();
          const hasLink = c.link && c.link.trim();
          let contactHtml = `<strong>${c.name}</strong>`;
          if (hasPhone) {
            contactHtml += `<a href="tel:${c.phone.replace(/[^0-9+]/g, '')}">${c.phone}</a>`;
          }
          if (hasLink) {
            contactHtml += `<a href="${c.link}" target="_blank" rel="noopener" class="contact-ext-link">${c.linkLabel || '바로가기'}</a>`;
          }
          return `<div class="branch-contact-item">${contactHtml}</div>`;
        }).join('')}
      </div>
    </div>
  `;
}

/* ---------- 이용약관 ---------- */
async function renderTerms() {
  const sections = await getData('terms');
  mainEl.innerHTML = `
    <div class="page-header">
      <h2>사이트 이용약관</h2>
    </div>
    <div class="info-page">
      ${sections.map(s => `
        <div class="legal-section">
          <h3>${s.title}</h3>
          ${renderSectionContent(s.content)}
          ${editBtns('terms', s.id)}
        </div>
      `).join('')}
      <div class="legal-add add-card" onclick="adminOpenModal('terms')">
        <div class="add-card-inner">
          <span class="add-icon">+</span>
          <span>항목 추가</span>
        </div>
      </div>
    </div>
  `;
}

/* ---------- 개인정보처리방침 ---------- */
async function renderPrivacy() {
  const sections = await getData('privacy');
  mainEl.innerHTML = `
    <div class="page-header">
      <h2>개인정보처리방침</h2>
    </div>
    <div class="info-page">
      ${sections.map(s => `
        <div class="legal-section">
          <h3>${s.title}</h3>
          ${renderSectionContent(s.content)}
          ${editBtns('privacy', s.id)}
        </div>
      `).join('')}
      <div class="legal-add add-card" onclick="adminOpenModal('privacy')">
        <div class="add-card-inner">
          <span class="add-icon">+</span>
          <span>항목 추가</span>
        </div>
      </div>
    </div>
  `;
}

/* ---------- 초기화 ---------- */
window.addEventListener('hashchange', navigate);
window.addEventListener('DOMContentLoaded', navigate);
