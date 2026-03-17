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

function restartBannerTimer() {
  stopBannerSlider();
  if (bannerCount <= 1) return;
  bannerInterval = setInterval(() => {
    currentBannerIdx = (currentBannerIdx + 1) % bannerCount;
    updateBannerPosition();
  }, 5000);
}

function startBannerSlider() {
  stopBannerSlider();
  if (bannerCount <= 1) return;
  currentBannerIdx = 0;
  restartBannerTimer();
  initBannerTouch();
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
  restartBannerTimer();
}

/* ---------- 배너 터치 슬라이드 ---------- */
function initBannerTouch() {
  const slider = document.querySelector('.banner-slider');
  if (!slider || bannerCount <= 1) return;

  let startX = 0;
  let startY = 0;
  let deltaX = 0;
  let isDragging = false;
  let isHorizontal = null;
  const track = slider.querySelector('.banner-track');

  slider.addEventListener('touchstart', function(e) {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    deltaX = 0;
    isDragging = true;
    isHorizontal = null;
    track.classList.add('dragging');
    stopBannerSlider();
  }, { passive: true });

  slider.addEventListener('touchmove', function(e) {
    if (!isDragging) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    deltaX = currentX - startX;
    const deltaY = currentY - startY;

    // 첫 움직임에서 방향 판별 (수평 vs 수직)
    if (isHorizontal === null && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
      isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);
    }

    if (!isHorizontal) return;

    // 끝에서 더 넘어가지 않도록 저항감 추가
    let clampedDelta = deltaX;
    if ((currentBannerIdx === 0 && deltaX > 0) || (currentBannerIdx === bannerCount - 1 && deltaX < 0)) {
      clampedDelta = deltaX * 0.3;
    }

    const offset = -(currentBannerIdx * 100) + (clampedDelta / slider.offsetWidth) * 100;
    track.style.transform = `translateX(${offset}%)`;
  }, { passive: true });

  slider.addEventListener('touchend', function() {
    if (!isDragging) return;
    isDragging = false;
    track.classList.remove('dragging');

    const threshold = slider.offsetWidth * 0.2; // 20% 넘기면 전환

    if (isHorizontal && Math.abs(deltaX) > threshold) {
      if (deltaX < 0 && currentBannerIdx < bannerCount - 1) {
        currentBannerIdx++;
      } else if (deltaX > 0 && currentBannerIdx > 0) {
        currentBannerIdx--;
      }
    }

    updateBannerPosition();
    restartBannerTimer();
  }, { passive: true });
}

/* ---------- 드래그 핸들 헬퍼 ---------- */
function dragHandle(id) {
  return `<span class="drag-handle" data-drag-handle title="드래그하여 순서 변경">⠿</span>`;
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

/* ---------- 공통 배너 슬라이더 빌더 ---------- */
function buildBannerSliderHtml(banners, pageName) {
  const slides = banners.map(b => {
    const bgStyle = b.bgImage
      ? `background:linear-gradient(rgba(0,0,0,0.5),rgba(0,0,0,0.5)),url('${b.bgImage}') center/cover no-repeat;`
      : '';
    return `
      <div class="banner-slide hero" ${bgStyle ? 'style="' + bgStyle + '"' : ''}>
        <div class="banner-edit-wrap">
          <button class="btn-edit hero-edit-btn" onclick="adminOpenModal('banners',${b.id},'${pageName}')">수정</button>
          <button class="btn-delete hero-edit-btn" onclick="adminHandleDelete('banners',${b.id})">삭제</button>
        </div>
        <h1><span class="accent">${b.title}</span>${b.titleAfter}</h1>
        <p>${b.subtitle}</p>
        ${b.btnText && b.btnLink ? `<a href="${b.btnLink}" class="hero-btn">${b.btnText}</a>` : ''}
      </div>
    `;
  }).join('');

  const dots = banners.length > 1
    ? `<div class="banner-dots">${banners.map((_, i) => `<span class="banner-dot${i === 0 ? ' active' : ''}" onclick="goToBanner(${i})"></span>`).join('')}</div>`
    : '';

  const sortList = banners.length > 1
    ? `<div class="banner-sort-list" data-sortable="banners">
        ${banners.map((b, i) => `
          <div class="banner-sort-item" data-id="${b.id}">
            <span class="drag-handle" data-drag-handle title="드래그하여 순서 변경">⠿</span>
            <span class="banner-sort-num">${i + 1}</span>
            <span class="banner-sort-title">${b.title}${b.titleAfter}</span>
          </div>
        `).join('')}
      </div>`
    : '';

  return `
    <section class="banner-slider">
      <div class="banner-track">${slides}</div>
      ${dots}
      <div class="banner-add-wrap">
        <button class="btn-edit hero-edit-btn" onclick="adminOpenModal('banners',null,'${pageName}')">+ 배너 추가</button>
      </div>
      ${sortList}
    </section>
  `;
}

function buildPageHeaderOrBanner(banners, pageName, title, subtitle) {
  if (banners.length > 0) {
    bannerCount = banners.length;
    return buildBannerSliderHtml(banners, pageName);
  }
  /* 배너 없으면 기존 page-header + 편집모드 추가 버튼 */
  bannerCount = 0;
  return `
    <div class="page-header">
      <h2>${title}</h2>
      ${subtitle ? `<p>${subtitle}</p>` : ''}
      <div class="banner-add-wrap" style="margin-top:12px;">
        <button class="btn-edit hero-edit-btn" onclick="adminOpenModal('banners',null,'${pageName}')">+ 배너 추가</button>
      </div>
    </div>
  `;
}

/* ---------- 링크 헬퍼 (강사, 교육과정 공용) ---------- */
function instructorLinkHtml(i) {
  if (!i.link) return '';
  return `<a href="${i.link}" target="_blank" rel="noopener" class="instructor-link">${i.linkLabel || '더 보기'}</a>`;
}

function curriculumLinkHtml(c) {
  if (!c.link) return '';
  return `<a href="${c.link}" target="_blank" rel="noopener" class="instructor-link">${c.linkLabel || '더 보기'}</a>`;
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
    getDataFiltered('banners', 'page', 'home'),
    getData('test_steps'),
  ]);

  bannerCount = banners.length;

  mainEl.innerHTML = `
    <!-- 배너 슬라이더 -->
    ${buildBannerSliderHtml(banners, 'home')}

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
              ${curriculumLinkHtml(c)}
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
  initSortable();
}

/* ---------- 강사소개 페이지 ---------- */
async function renderInstructors() {
  const [instructors, banners] = await Promise.all([
    getData('instructors'),
    getDataFiltered('banners', 'page', 'instructors'),
  ]);
  mainEl.innerHTML = `
    ${buildPageHeaderOrBanner(banners, 'instructors', '강사진 소개', '안보라의 전문 강사진을 소개합니다')}
    <section class="section">
      <div class="card-grid" data-sortable="instructors">
        ${instructors.map(i => `
          <div class="card instructor-card" data-id="${i.id}">
            ${dragHandle(i.id)}
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
  if (banners.length > 0) startBannerSlider();
  initSortable();
}

/* ---------- 교육과정 페이지 ---------- */
async function renderCurriculum() {
  const [curriculum, banners] = await Promise.all([
    getData('curriculum'),
    getDataFiltered('banners', 'page', 'curriculum'),
  ]);
  mainEl.innerHTML = `
    ${buildPageHeaderOrBanner(banners, 'curriculum', '교육과정', '체계적인 단계별 교육과정으로 국어 실력을 완성합니다')}
    <section class="section">
      <div class="card-grid" data-sortable="curriculum">
        ${curriculum.map(c => `
          <div class="card" data-id="${c.id}">
            ${dragHandle(c.id)}
            <div class="card-body">
              <span class="card-tag">${c.tag}</span>
              <h3>${c.title}</h3>
              <p>${c.desc}</p>
              <p style="margin-top:12px;font-size:0.85rem;"><strong>대상:</strong> ${c.target}</p>
              ${curriculumLinkHtml(c)}
              ${editBtns('curriculum', c.id)}
            </div>
          </div>
        `).join('')}
        ${addCard('curriculum', '교육과정 추가')}
      </div>
    </section>
  `;
  if (banners.length > 0) startBannerSlider();
  initSortable();
}

/* ---------- 입학 테스트 페이지 ---------- */

/* 달력/예약 상태 */
let bookingCalendarDate = new Date(); /* 현재 표시 중인 달력 월 */
let bookingCounts = {};               /* { '2026-03-20': 5, ... } */
let bookingConfig = {};               /* Supabase test_booking_config */

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

async function renderTest() {
  const [steps, info, banners, config] = await Promise.all([
    getData('test_steps'),
    getData('test_info'),
    getDataFiltered('banners', 'page', 'test'),
    getData('test_booking_config'),
  ]);

  bookingConfig = config;
  /* URL 공백/줄바꿈 제거 */
  if (bookingConfig.scriptUrl) bookingConfig.scriptUrl = bookingConfig.scriptUrl.replace(/\s/g, '');

  mainEl.innerHTML = `
    ${buildPageHeaderOrBanner(banners, 'test', '입학 테스트', '정확한 실력 진단으로 최적의 학습 과정을 안내합니다')}
    <section class="section">
      <div class="test-info">
        <h3>테스트 진행 절차</h3>
        <div class="test-steps" data-sortable="test_steps">
          ${steps.map((s, idx) => `
            <div class="test-step" data-id="${s.id}">
              ${dragHandle(s.id)}
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
        </div>

        <!-- 예약 달력 -->
        <div class="booking-section">
          <h3>테스트 일정 예약</h3>
          <div class="booking-config-edit">
            <button class="btn-edit" onclick="adminOpenModal('test_booking_config')">수정</button>
          </div>
          ${config.scriptUrl ? `
            <div class="booking-calendar-wrap">
              <div class="booking-calendar-header">
                <button class="booking-nav-btn" onclick="bookingChangeMonth(-1)">&#8249;</button>
                <span class="booking-month-title" id="booking-month-title"></span>
                <button class="booking-nav-btn" onclick="bookingChangeMonth(1)">&#8250;</button>
              </div>
              <div class="booking-calendar" id="booking-calendar"></div>
              <div class="booking-legend">
                <span class="booking-legend-item"><span class="legend-dot legend-available"></span> 신청 가능</span>
                <span class="booking-legend-item"><span class="legend-dot legend-full"></span> 마감</span>
                <span class="booking-legend-item"><span class="legend-dot legend-disabled"></span> 선택 불가</span>
              </div>
            </div>
          ` : `
            <p class="booking-no-config">관리자 모드에서 예약 설정(Apps Script URL)을 먼저 입력해주세요.</p>
          `}
        </div>
      </div>
    </section>
  `;
  if (banners.length > 0) startBannerSlider();
  initSortable();

  if (config.scriptUrl) {
    bookingCalendarDate = new Date();
    await bookingRenderCalendar();
  }
}

/* 달력 월 변경 */
async function bookingChangeMonth(delta) {
  bookingCalendarDate.setMonth(bookingCalendarDate.getMonth() + delta);
  await bookingRenderCalendar();
}

/* 달력 렌더링 */
async function bookingRenderCalendar() {
  const cal = document.getElementById('booking-calendar');
  const titleEl = document.getElementById('booking-month-title');
  if (!cal || !titleEl) return;

  const year = bookingCalendarDate.getFullYear();
  const month = bookingCalendarDate.getMonth();
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

  titleEl.textContent = `${year}년 ${month + 1}월`;

  /* Apps Script에서 예약 현황 조회 */
  try {
    const res = await fetch(`${bookingConfig.scriptUrl}?action=counts&month=${monthStr}`);
    const json = await res.json();
    bookingCounts = json.counts || {};
  } catch (err) {
    console.error('예약 현황 조회 실패:', err);
    bookingCounts = {};
  }

  const availableDays = bookingConfig.availableDays || [];
  const maxPerDay = bookingConfig.maxPerDay || 20;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  /* 달력 그리드 생성 */
  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();

  let html = '<div class="booking-weekdays">';
  DAY_NAMES.forEach(d => { html += `<span class="booking-weekday">${d}</span>`; });
  html += '</div><div class="booking-days">';

  /* 빈 칸 */
  for (let i = 0; i < firstDay; i++) {
    html += '<span class="booking-day empty"></span>';
  }

  /* 날짜 */
  for (let d = 1; d <= lastDate; d++) {
    const dateObj = new Date(year, month, d);
    const dayOfWeek = dateObj.getDay();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const count = bookingCounts[dateStr] || 0;
    const isAvailableDay = availableDays.includes(dayOfWeek);
    const isPast = dateObj < today;
    const isFull = count >= maxPerDay;

    let cls = 'booking-day';
    let onclick = '';

    if (!isAvailableDay || isPast) {
      cls += ' disabled';
    } else if (isFull) {
      cls += ' full';
    } else {
      cls += ' available';
      onclick = `onclick="bookingOpenModal('${dateStr}')"`;
    }

    const countBadge = isAvailableDay && !isPast && count > 0
      ? `<span class="booking-count">${count}/${maxPerDay}</span>`
      : '';

    html += `<span class="${cls}" ${onclick}>
      <span class="booking-day-num">${d}</span>
      ${countBadge}
    </span>`;
  }

  html += '</div>';
  cal.innerHTML = html;
}

/* 신청 모달 열기 */
function bookingOpenModal(dateStr) {
  const times = bookingConfig.availableTimes || ['16:00', '19:00', '20:00'];
  const [y, m, d] = dateStr.split('-');
  const dayName = DAY_NAMES[new Date(Number(y), Number(m) - 1, Number(d)).getDay()];
  const displayDate = `${y}년 ${Number(m)}월 ${Number(d)}일 (${dayName})`;

  const overlay = document.getElementById('admin-modal-overlay');
  document.getElementById('admin-modal-title').textContent = '입학 테스트 신청';

  const formEl = document.getElementById('admin-modal-form');
  formEl.innerHTML = `
    <div class="form-group">
      <label>선택 날짜</label>
      <input type="text" value="${displayDate}" readonly style="background:#f5f6f8;cursor:default;">
      <input type="hidden" id="f-booking-date" value="${dateStr}">
    </div>
    <div class="form-group">
      <label>시간 선택</label>
      <select id="f-booking-time" required>
        <option value="">시간을 선택하세요</option>
        ${times.map(t => `<option value="${t}">${t}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label>이름</label>
      <input type="text" id="f-booking-name" placeholder="이름을 입력하세요" required>
    </div>
    <div class="form-group">
      <label>나이</label>
      <input type="text" id="f-booking-age" placeholder="나이를 입력하세요" required>
    </div>
    <div class="form-group">
      <label>연락처</label>
      <input type="tel" id="f-booking-phone" placeholder="010-0000-0000" required>
    </div>
    <div class="modal-actions">
      <button type="button" class="btn-cancel" onclick="adminCloseModal()">취소</button>
      <button type="submit" class="btn-save">신청하기</button>
    </div>
  `;

  formEl.onsubmit = async (e) => {
    e.preventDefault();
    const submitBtn = formEl.querySelector('.btn-save');
    submitBtn.disabled = true;
    submitBtn.textContent = '처리 중...';

    try {
      const params = new URLSearchParams({
        action: 'book',
        name: document.getElementById('f-booking-name').value.trim(),
        age: document.getElementById('f-booking-age').value.trim(),
        phone: document.getElementById('f-booking-phone').value.trim(),
        date: document.getElementById('f-booking-date').value,
        time: document.getElementById('f-booking-time').value,
        maxPerDay: bookingConfig.maxPerDay || 20,
      });

      const res = await fetch(`${bookingConfig.scriptUrl}?${params}`);
      const text = await res.text();
      console.log('Apps Script 응답:', text);

      let result;
      try {
        result = JSON.parse(text);
      } catch (parseErr) {
        alert('서버 응답 파싱 오류. 콘솔을 확인해주세요.');
        console.error('파싱 오류:', parseErr, '원본 응답:', text);
        return;
      }

      if (result.success) {
        alert('입학 테스트 예약이 완료되었습니다!');
        adminCloseModal();
        await bookingRenderCalendar();
      } else {
        alert(result.error || '예약에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (err) {
      alert('네트워크 오류: ' + err.message);
      console.error('예약 오류:', err);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = '신청하기';
    }
  };

  overlay.classList.add('show');
}

/* ---------- 공지사항 목록 ---------- */
async function renderNotices() {
  const banners = await getDataFiltered('banners', 'page', 'notices');
  mainEl.innerHTML = `
    ${buildPageHeaderOrBanner(banners, 'notices', '공지사항', '안보라의 소식을 전합니다')}
    <section class="section">
      <div class="notice-search">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input type="text" id="notice-search-input" placeholder="검색어를 입력하세요">
      </div>
      <button class="add-notice-btn" onclick="adminOpenModal('notices')">+ 공지사항 추가</button>
      <div id="notice-list-container"></div>
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
  if (banners.length > 0) startBannerSlider();
  initSortable();
}

let noticeCurrentPage = 1;
const NOTICES_PER_PAGE = 10;

async function filterNoticeList(keyword = '', page = 1) {
  const all = await getData('notices');
  const q = keyword.trim().toLowerCase();
  const filtered = q
    ? all.filter(n => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q))
    : all;

  const container = document.getElementById('notice-list-container');
  if (!container) return;

  if (filtered.length === 0) {
    container.innerHTML = `<div style="padding:40px;text-align:center;color:#999;">${q ? '검색 결과가 없습니다.' : '등록된 공지사항이 없습니다.'}</div>`;
    return;
  }

  /* 중요 공지와 일반 공지 분리 */
  const important = filtered.filter(n => n.important);
  const normal = filtered.filter(n => !n.important);

  /* 일반 공지 페이지네이션 */
  const totalPages = Math.max(1, Math.ceil(normal.length / NOTICES_PER_PAGE));
  noticeCurrentPage = Math.min(Math.max(1, page), totalPages);
  const start = (noticeCurrentPage - 1) * NOTICES_PER_PAGE;
  const pageNormals = normal.slice(start, start + NOTICES_PER_PAGE);

  /* 1페이지에만 중요 공지 상단 표시 */
  const visibleNotices = noticeCurrentPage === 1
    ? [...important, ...pageNormals]
    : pageNormals;

  const noticeHtml = visibleNotices.map(n => `
    <a href="#notice/${n.id}" class="notice-item">
      ${n.important ? '<span class="notice-badge">중요</span>' : ''}
      <span class="title">${n.title}</span>
      <span class="date">${n.date}</span>
      ${noticeEditBtns(n.id)}
    </a>
  `).join('');

  /* 페이지네이션 버튼 */
  let paginationHtml = '';
  if (totalPages > 1) {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(`<button class="page-btn${i === noticeCurrentPage ? ' active' : ''}" onclick="goNoticePage(${i})">${i}</button>`);
    }
    paginationHtml = `<div class="pagination">${pages.join('')}</div>`;
  }

  container.innerHTML = `<div class="notice-list">${noticeHtml}</div>${paginationHtml}`;
}

function goNoticePage(page) {
  const keyword = document.getElementById('notice-search-input')?.value || '';
  filterNoticeList(keyword, page);
}

/* ---------- URL 자동 링크 변환 ---------- */
function linkify(text) {
  return text.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
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
      <div class="content">${linkify(notice.content)}</div>
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
            <div class="map-btn-group">
              <a href="https://map.kakao.com/link/search/${encodeURIComponent(b.mapQuery)}" target="_blank" rel="noopener" class="map-kakao-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                카카오맵에서 보기
              </a>
              <a href="https://map.naver.com/v5/search/${encodeURIComponent(b.mapQuery)}" target="_blank" rel="noopener" class="map-naver-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                네이버지도에서 보기
              </a>
            </div>
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
