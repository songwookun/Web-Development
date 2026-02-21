/* ========== 데이터 관리 (Supabase DB) ========== */
/* localStorage 대신 Supabase 클라우드 DB에서 데이터를 읽고 씁니다. */
/* 모든 CRUD 함수는 비동기(async)입니다. */

/* ---------- 테이블명 매핑 ---------- */
const TABLE_NAMES = {
  banners: 'banners',
  instructors: 'instructors',
  curriculum: 'curriculum',
  notices: 'notices',
  test_steps: 'test_steps',
  test_info: 'test_info',
  contacts: 'contacts',
  map_branches: 'map_branches',
  map_info: 'map_info',
  terms: 'terms',
  privacy: 'privacy',
};

/* 단일 행 테이블 (배열이 아닌 객체 하나로 반환) */
const SINGLETON_TYPES = ['test_info', 'map_info'];

/* ---------- 컬럼명 변환 (JS camelCase ↔ DB snake_case) ---------- */

/* camelCase → snake_case */
function toSnakeCase(str) {
  return str.replace(/[A-Z]/g, c => '_' + c.toLowerCase());
}

/* snake_case → camelCase */
function toCamelCase(str) {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

/* DB 행 → JS 객체 변환 */
/* 특수 매핑: DB 'description' → JS 'desc' */
function rowToJs(row) {
  const obj = {};
  for (const [key, val] of Object.entries(row)) {
    if (key === 'created_at') continue; /* 프론트엔드에서 불필요 */
    const jsKey = key === 'description' ? 'desc' : toCamelCase(key);
    obj[jsKey] = val;
  }
  return obj;
}

/* JS 객체 → DB 행 변환 */
/* 특수 매핑: JS 'desc' → DB 'description' */
function jsToRow(obj) {
  const row = {};
  for (const [key, val] of Object.entries(obj)) {
    if (key === 'id') continue; /* id는 DB가 자동 생성 */
    const dbKey = key === 'desc' ? 'description' : toSnakeCase(key);
    row[dbKey] = val;
  }
  return row;
}

/* ---------- 클라이언트 캐시 (불필요한 API 호출 방지) ---------- */
const dataCache = {};
const CACHE_TTL = 30000; /* 30초 동안 캐시 유지 */

function invalidateCache(key) {
  delete dataCache[key];
}

/* ---------- 데이터 조회 (SELECT) ---------- */
async function getData(key) {
  /* 캐시에 유효한 데이터가 있으면 바로 반환 */
  const now = Date.now();
  if (dataCache[key] && (now - dataCache[key].time < CACHE_TTL)) {
    return dataCache[key].data;
  }

  const table = TABLE_NAMES[key];
  let query = supabaseClient.from(table).select('*');

  /* 정렬: 공지사항은 날짜 내림차순, 나머지는 id 오름차순 */
  if (key === 'notices') {
    query = query.order('date', { ascending: false }).order('id', { ascending: false });
  } else {
    query = query.order('id', { ascending: true });
  }

  const { data, error } = await query;

  if (error) {
    console.error(`getData(${key}) 오류:`, error);
    return SINGLETON_TYPES.includes(key) ? {} : [];
  }

  /* 단일 행 테이블은 객체로, 나머지는 배열로 반환 */
  let result;
  if (SINGLETON_TYPES.includes(key)) {
    result = data.length > 0 ? rowToJs(data[0]) : {};
  } else {
    result = data.map(rowToJs);
  }

  /* 캐시 저장 */
  dataCache[key] = { data: result, time: now };
  return result;
}

/* ---------- 단일 객체 저장 - test_info, map_info용 (UPSERT) ---------- */
async function saveData(key, jsObj) {
  const table = TABLE_NAMES[key];
  const row = jsToRow(jsObj);
  row.id = 1; /* 단일 행 테이블은 항상 id = 1 */

  const { error } = await supabaseClient.from(table).upsert(row);
  if (error) {
    console.error(`saveData(${key}) 오류:`, error);
    alert('저장에 실패했습니다. 다시 시도해 주세요.');
    return;
  }
  invalidateCache(key);
}

/* ---------- 항목 추가 (INSERT) ---------- */
async function addItem(key, jsObj) {
  const table = TABLE_NAMES[key];
  const row = jsToRow(jsObj);

  const { data, error } = await supabaseClient.from(table).insert(row).select();
  if (error) {
    console.error(`addItem(${key}) 오류:`, error);
    alert('추가에 실패했습니다. 다시 시도해 주세요.');
    return null;
  }
  invalidateCache(key);
  return data.length > 0 ? rowToJs(data[0]) : null;
}

/* ---------- 항목 수정 (UPDATE) ---------- */
async function updateItem(key, id, jsObj) {
  const table = TABLE_NAMES[key];
  const row = jsToRow(jsObj);

  const { data, error } = await supabaseClient.from(table).update(row).eq('id', id).select();
  if (error) {
    console.error(`updateItem(${key}) 오류:`, error);
    alert('수정에 실패했습니다. 다시 시도해 주세요.');
    return null;
  }
  invalidateCache(key);
  return data.length > 0 ? rowToJs(data[0]) : null;
}

/* ---------- 항목 삭제 (DELETE) ---------- */
async function deleteItem(key, id) {
  const table = TABLE_NAMES[key];

  const { error } = await supabaseClient.from(table).delete().eq('id', id);
  if (error) {
    console.error(`deleteItem(${key}) 오류:`, error);
    alert('삭제에 실패했습니다. 다시 시도해 주세요.');
    return;
  }
  invalidateCache(key);
}
