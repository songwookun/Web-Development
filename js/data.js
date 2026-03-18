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
  test_booking_config: 'test_booking_config',
  test_bookings: 'test_bookings',
  contacts: 'contacts',
  map_branches: 'map_branches',
  map_info: 'map_info',
  terms: 'terms',
  privacy: 'privacy',
};

/* 단일 행 테이블 (배열이 아닌 객체 하나로 반환) */
const SINGLETON_TYPES = ['test_info', 'map_info', 'test_booking_config'];

/* sort_order 기반 정렬을 지원하는 테이블 */
const SORTABLE_TYPES = ['instructors', 'curriculum', 'banners', 'test_steps'];

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
  /* 기본 캐시 삭제 */
  delete dataCache[key];
  /* 파생 캐시(예: banners__page__home)도 함께 삭제 */
  const prefix = key + '__';
  for (const k of Object.keys(dataCache)) {
    if (k.startsWith(prefix)) delete dataCache[k];
  }
}

/* ---------- 필터링 조회 ---------- */
async function getDataFiltered(key, filterCol, filterVal) {
  const cacheKey = `${key}__${filterCol}__${filterVal}`;
  const now = Date.now();
  if (dataCache[cacheKey] && (now - dataCache[cacheKey].time < CACHE_TTL)) {
    return dataCache[cacheKey].data;
  }

  const table = TABLE_NAMES[key];
  const dbCol = filterCol === 'desc' ? 'description' : toSnakeCase(filterCol);
  let query = supabaseClient.from(table).select('*').eq(dbCol, filterVal);
  if (SORTABLE_TYPES.includes(key)) {
    query = query.order('sort_order', { ascending: true, nullsFirst: false }).order('id', { ascending: true });
  } else {
    query = query.order('id', { ascending: true });
  }

  const { data, error } = await query;
  if (error) {
    console.error(`getDataFiltered(${key}, ${filterCol}) 오류:`, error);
    return [];
  }

  const result = data.map(rowToJs);
  dataCache[cacheKey] = { data: result, time: now };
  return result;
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

  /* 정렬: 공지사항은 날짜 내림차순, sortable은 sort_order 우선, 나머지는 id 오름차순 */
  if (key === 'notices') {
    query = query.order('date', { ascending: false }).order('id', { ascending: false });
  } else if (SORTABLE_TYPES.includes(key)) {
    query = query.order('sort_order', { ascending: true, nullsFirst: false }).order('id', { ascending: true });
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

/* ---------- 예약 카운트 조회 (월별) ---------- */
async function getBookingCounts(month) {
  const { data, error } = await supabaseClient
    .from('test_bookings')
    .select('booking_date')
    .like('booking_date', `${month}%`);

  if (error) {
    console.error('getBookingCounts 오류:', error);
    return {};
  }

  const counts = {};
  data.forEach(row => {
    const d = row.booking_date;
    counts[d] = (counts[d] || 0) + 1;
  });
  return counts;
}

/* ---------- 예약 추가 (Supabase + Apps Script 동시 저장) ---------- */
async function addBooking(booking, scriptUrl) {
  /* 1) Supabase 저장 */
  const { data, error } = await supabaseClient
    .from('test_bookings')
    .insert({
      name: booking.name,
      age: booking.age,
      phone: booking.phone,
      booking_date: booking.date,
      booking_time: booking.time,
    })
    .select();

  if (error) {
    console.error('addBooking Supabase 오류:', error);
    return { success: false, error: '예약 저장에 실패했습니다.' };
  }

  /* 2) Apps Script(스프레드시트) 저장 — Supabase ID 포함 */
  const supabaseId = data && data[0] ? data[0].id : null;
  try {
    const params = new URLSearchParams({
      action: 'book',
      id: supabaseId || '',
      name: booking.name,
      age: booking.age,
      phone: booking.phone,
      date: booking.date,
      time: booking.time,
    });
    fetch(`${scriptUrl}?${params}`).catch(err =>
      console.warn('스프레드시트 저장 실패 (무시):', err)
    );
  } catch (_) { /* 스프레드시트 실패는 무시 */ }

  return { success: true };
}

/* ---------- 예약 삭제 (Supabase + 스프레드시트 동기화) ---------- */
async function deleteBooking(id, scriptUrl) {
  /* 1) Supabase에서 삭제 */
  const { error } = await supabaseClient
    .from('test_bookings')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('deleteBooking Supabase 오류:', error);
    return { success: false, error: '삭제에 실패했습니다.' };
  }

  /* 2) Apps Script에 삭제 요청 — 스프레드시트에서도 해당 행 제거 */
  if (scriptUrl) {
    try {
      const params = new URLSearchParams({ action: 'delete', id: String(id) });
      fetch(`${scriptUrl}?${params}`).catch(err =>
        console.warn('스프레드시트 삭제 실패 (무시):', err)
      );
    } catch (_) { /* 무시 */ }
  }

  return { success: true };
}

/* ---------- 특정 날짜 예약 목록 조회 ---------- */
async function getBookingsByDate(date) {
  const { data, error } = await supabaseClient
    .from('test_bookings')
    .select('*')
    .eq('booking_date', date)
    .order('booking_time', { ascending: true });

  if (error) {
    console.error('getBookingsByDate 오류:', error);
    return [];
  }
  return data || [];
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

/* ---------- sort_order 벌크 업데이트 ---------- */
async function updateSortOrder(key, items) {
  const table = TABLE_NAMES[key];
  await Promise.all(items.map(({ id, sortOrder }) =>
    supabaseClient.from(table).update({ sort_order: sortOrder }).eq('id', id)
  ));
  invalidateCache(key);
}

/* ---------- 항목 추가 (INSERT) ---------- */
async function addItem(key, jsObj) {
  const table = TABLE_NAMES[key];

  /* SORTABLE_TYPES이면 자동으로 맨 뒤 sort_order 부여 */
  if (SORTABLE_TYPES.includes(key) && jsObj.sortOrder == null) {
    const { data: maxRow } = await supabaseClient
      .from(table).select('sort_order').order('sort_order', { ascending: false }).limit(1);
    const maxVal = (maxRow && maxRow.length > 0 && maxRow[0].sort_order) || 0;
    jsObj.sortOrder = maxVal + 10;
  }

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
