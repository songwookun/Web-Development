/* ========== 데이터 관리 (localStorage) ========== */

const DB_KEYS = {
  instructors: 'academy_instructors',
  curriculum: 'academy_curriculum',
  notices: 'academy_notices',
  test_steps: 'academy_test_steps',
  test_info: 'academy_test_info',
  contacts: 'academy_contacts',
  banners: 'academy_banners',
  map_branches: 'academy_map_branches',
  map_info: 'academy_map_info',
  terms: 'academy_terms',
  privacy: 'academy_privacy',
};

/* ---------- 기본 데이터 ---------- */
const DEFAULT_INSTRUCTORS = [
  {
    id: 1,
    name: '김서윤',
    position: '대표 강사 · 국어 문학',
    desc: '서울대학교 국어국문학과 졸업. 15년간 수능 국어 강의 경력. 문학 영역 전문.',
    img: '',
    link: '',
    linkLabel: '',
  },
  {
    id: 2,
    name: '박준혁',
    position: '수석 강사 · 비문학/독서',
    desc: '고려대학교 국어교육과 졸업. EBS 연계 교재 집필 참여. 비문학 독해 전략 전문.',
    img: '',
    link: '',
    linkLabel: '',
  },
  {
    id: 3,
    name: '이하은',
    position: '전임 강사 · 문법/언어',
    desc: '연세대학교 국어학 석사. 언어와 매체, 문법 영역 전문. 친절한 개념 설명.',
    img: '',
    link: '',
    linkLabel: '',
  },
];

const DEFAULT_CURRICULUM = [
  {
    id: 1,
    title: '수능 국어 기본 완성반',
    tag: '기초',
    desc: '국어 전 영역의 기본 개념과 핵심 원리를 체계적으로 학습합니다. 문학, 독서, 언어와 매체의 기초를 다집니다.',
    target: '고1 · 고2',
    schedule: '월/수/금 16:00 ~ 18:00',
  },
  {
    id: 2,
    title: '수능 국어 실력 도약반',
    tag: '심화',
    desc: '기본 개념을 바탕으로 실전 문제 풀이 능력을 키웁니다. 고난도 지문 분석 및 시간 관리 전략을 훈련합니다.',
    target: '고2 · 고3',
    schedule: '화/목/토 16:00 ~ 18:30',
  },
  {
    id: 3,
    title: '수능 국어 파이널 특강반',
    tag: '파이널',
    desc: '수능 직전 실전 모의고사와 취약 영역 집중 보완. 최종 점검 및 시험장 전략을 수립합니다.',
    target: '고3 · N수생',
    schedule: '월~토 19:00 ~ 21:30',
  },
  {
    id: 4,
    title: '내신 국어 대비반',
    tag: '내신',
    desc: '학교별 교과서 분석 및 서술형 평가 대비. 내신 만점을 위한 맞춤 학습 프로그램.',
    target: '고1 · 고2',
    schedule: '시험 3주 전 개강',
  },
];

const DEFAULT_NOTICES = [
  {
    id: 1,
    title: '2026년 봄학기 수강 신청 안내',
    date: '2026-02-10',
    content: '안녕하세요, 안보라입니다.\n\n2026년 봄학기 수강 신청이 2월 17일(월)부터 시작됩니다.\n\n■ 신청 기간: 2026.02.17 ~ 2026.02.28\n■ 개강일: 2026.03.03 (월)\n■ 신청 방법: 방문 접수 또는 전화 접수\n\n조기 마감될 수 있으니 서둘러 신청해 주세요.\n감사합니다.',
    important: true,
  },
  {
    id: 2,
    title: '입학 테스트 일정 안내 (3월)',
    date: '2026-02-08',
    content: '3월 입학 테스트 일정을 안내드립니다.\n\n■ 일시: 2026.02.22 (토) 오전 10:00\n■ 장소: 학원 3층 대강의실\n■ 소요시간: 약 60분\n■ 준비물: 필기도구\n\n사전 예약 필수이며, 전화로 신청해 주세요.\n감사합니다.',
    important: true,
  },
  {
    id: 3,
    title: '설 연휴 휴원 안내',
    date: '2026-02-01',
    content: '설 연휴 기간 동안 학원이 휴원합니다.\n\n■ 휴원 기간: 2026.01.28 (화) ~ 2026.02.02 (일)\n■ 정상 수업: 2026.02.03 (월)부터\n\n즐거운 명절 보내세요!',
    important: false,
  },
  {
    id: 4,
    title: '2025 수능 국어 성적 우수자 발표',
    date: '2026-01-20',
    content: '2025학년도 수능 국어 영역에서 우수한 성적을 거둔 학생들을 축하합니다.\n\n■ 1등급 배출: 12명\n■ 2등급 이내: 38명\n\n학생들의 노력에 박수를 보냅니다.\n상세 내용은 학원 게시판을 확인해 주세요.',
    important: false,
  },
  {
    id: 5,
    title: '교재 수령 안내',
    date: '2026-01-15',
    content: '봄학기 교재가 입고되었습니다.\n\n수강 신청 완료 학생은 학원 사무실에서 교재를 수령해 주세요.\n\n■ 수령 시간: 평일 14:00 ~ 20:00\n■ 준비물: 수강증\n\n감사합니다.',
    important: false,
  },
];

const DEFAULT_TEST_STEPS = [
  { id: 1, title: '전화 예약', desc: '학원으로 전화(02-1234-5678)하여 원하는 테스트 일정을 예약합니다.' },
  { id: 2, title: '테스트 응시', desc: '예약 일시에 방문하여 국어 전 영역 레벨 테스트(60분)를 응시합니다.' },
  { id: 3, title: '결과 상담', desc: '테스트 결과를 바탕으로 담당 강사와 1:1 상담을 진행합니다.' },
  { id: 4, title: '반 배정 · 수강 시작', desc: '실력에 맞는 최적의 반에 배정되어 수강을 시작합니다.' },
];

const DEFAULT_TEST_INFO = {
  schedule: '매주 토요일 오전 10:00 (사전 예약 필수)',
  duration: '약 60분',
  areas: '문학, 독서(비문학), 언어와 매체(문법)',
  materials: '필기도구, 학생증',
  cost: '무료',
  phone: '02-1234-5678',
  formUrl: '',
};

const DEFAULT_BANNERS = [
  {
    id: 1,
    title: '국어의 힘',
    titleAfter: '을 키우는 곳',
    subtitle: '체계적인 커리큘럼과 최고의 강사진이 함께하는 안보라에서 국어 실력의 차이를 만들어 보세요.',
    bgImage: '',
    btnText: '입학 테스트 신청',
    btnLink: '#test',
  },
];

const DEFAULT_CONTACTS = [
  { id: 1, name: '본관', phone: '02-556-8383', link: '', linkLabel: '' },
  { id: 2, name: '카카오톡 상담', phone: '', link: 'https://pf.kakao.com/', linkLabel: '카카오톡 상담' },
  { id: 3, name: '네이버 카페', phone: '', link: 'https://cafe.naver.com/', linkLabel: '네이버 카페' },
];

const DEFAULT_MAP_BRANCHES = [
  { id: 1, name: '아르누보관', label: '메인', addr: '서울특별시 강남구 도곡로 405, 삼환아르누보 2차 3층', note: '', mapQuery: '서울 강남구 도곡로 405' },
  { id: 2, name: '한티관', label: '', addr: '서울특별시 강남구 선릉로 318, 동궁상가 2층', note: '한티역 1번 출구 오른쪽 약 100m, 노브랜드 건물 2층', mapQuery: '서울 강남구 선릉로 318' },
  { id: 3, name: '디마크관', label: '', addr: '서울특별시 강남구 도곡로 408, 디마크빌딩 5층 509호', note: '한티역 3번 출구 약 110m', mapQuery: '서울 강남구 도곡로 408' },
];

const DEFAULT_MAP_INFO = {
  transport: '지하철: 수인분당선 한티역 1번 · 3번 출구\n버스: 한티역 정류장 하차 (강남06, 4412)',
  hours: '화~금 15:00 ~ 22:00 / 토~일 10:00 ~ 22:00 / 월요일 정기 휴무',
};

const DEFAULT_TERMS = [
  { id: 1, title: '제1조 (목적)', content: '본 약관은 안보라(이하 "학원")이 운영하는 웹사이트(이하 "사이트")에서 제공하는 서비스의 이용과 관련하여 학원과 이용자 간의 권리·의무 및 기타 필요한 사항을 규정함을 목적으로 합니다.' },
  { id: 2, title: '제2조 (용어의 정의)', content: '"사이트"란 학원이 교육 서비스 및 관련 정보를 제공하기 위해 운영하는 인터넷 웹사이트를 말합니다.\n"이용자"란 본 사이트에 접속하여 약관에 따라 학원이 제공하는 서비스를 이용하는 자를 말합니다.' },
  { id: 3, title: '제3조 (약관의 효력 및 변경)', content: '본 약관은 사이트에 공시함으로써 효력이 발생합니다. 학원은 관련 법령에 위배되지 않는 범위 내에서 약관을 변경할 수 있으며, 변경된 약관은 사이트에 공시한 날로부터 효력이 발생합니다.' },
  { id: 4, title: '제4조 (서비스의 제공)', content: '학원은 다음과 같은 서비스를 제공합니다.\n- 교육과정 및 강사 소개 정보 제공\n- 입학 테스트 안내\n- 공지사항 및 학원 소식 제공' },
  { id: 5, title: '제5조 (면책사항)', content: '학원은 천재지변, 불가항력, 또는 이에 준하는 사유로 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.' },
];

const DEFAULT_PRIVACY = [
  { id: 1, title: '1. 개인정보의 수집 및 이용 목적', content: '안보라은 다음 목적을 위해 개인정보를 수집·이용합니다. 수집한 개인정보는 아래 목적 이외의 용도로 이용되지 않으며, 목적이 변경될 경우 사전에 동의를 구합니다.\n- 수강 상담 및 입학 테스트 예약\n- 교육 서비스 제공 및 학습 관리\n- 공지사항 전달' },
  { id: 2, title: '2. 수집하는 개인정보 항목', content: '성명, 연락처(전화번호), 학년, 학교명' },
  { id: 3, title: '3. 개인정보의 보유 및 이용 기간', content: '수집된 개인정보는 수집 목적이 달성된 후 지체 없이 파기합니다. 단, 관계 법령에 의해 보존할 필요가 있는 경우 해당 법령에서 정한 기간 동안 보존합니다.' },
  { id: 4, title: '4. 개인정보의 파기 절차 및 방법', content: '보유 기간이 경과하거나 처리 목적이 달성된 개인정보는 재생이 불가능한 방법으로 파기합니다.' },
  { id: 5, title: '5. 개인정보 보호 책임자', content: '성명: 안보라\n직위: 원장\n연락처: 02-556-8383\n이메일: privacy@anboraedu.co.kr' },
  { id: 6, title: '6. 정책 변경', content: '본 개인정보처리방침은 2026년 1월 1일부터 시행됩니다. 변경 사항이 있을 경우 사이트를 통해 공지합니다.' },
];

/* ---------- CRUD 함수 ---------- */
function getData(key) {
  const raw = localStorage.getItem(DB_KEYS[key]);
  if (raw) return JSON.parse(raw);

  const defaults = {
    instructors: DEFAULT_INSTRUCTORS,
    curriculum: DEFAULT_CURRICULUM,
    notices: DEFAULT_NOTICES,
    test_steps: DEFAULT_TEST_STEPS,
    test_info: DEFAULT_TEST_INFO,
    contacts: DEFAULT_CONTACTS,
    banners: DEFAULT_BANNERS,
    map_branches: DEFAULT_MAP_BRANCHES,
    map_info: DEFAULT_MAP_INFO,
    terms: DEFAULT_TERMS,
    privacy: DEFAULT_PRIVACY,
  };
  localStorage.setItem(DB_KEYS[key], JSON.stringify(defaults[key]));
  return defaults[key];
}

function saveData(key, data) {
  localStorage.setItem(DB_KEYS[key], JSON.stringify(data));
}

function getNextId(items) {
  if (items.length === 0) return 1;
  return Math.max(...items.map(i => i.id)) + 1;
}

function addItem(key, item) {
  const items = getData(key);
  item.id = getNextId(items);
  items.push(item);
  saveData(key, items);
  return item;
}

function updateItem(key, id, updates) {
  const items = getData(key);
  const idx = items.findIndex(i => i.id === id);
  if (idx === -1) return null;
  items[idx] = { ...items[idx], ...updates, id };
  saveData(key, items);
  return items[idx];
}

function deleteItem(key, id) {
  let items = getData(key);
  items = items.filter(i => i.id !== id);
  saveData(key, items);
}
