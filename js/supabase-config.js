/* ========== Supabase 초기화 ========== */

/*
 * 아래 두 값을 본인의 Supabase 프로젝트 값으로 교체하세요.
 * 확인 방법: Supabase 대시보드 > Settings > API
 *
 * SUPABASE_URL  : Project URL (예: https://abcdefg.supabase.co)
 * SUPABASE_ANON_KEY : anon / public 키
 *
 * ※ anon key는 프론트엔드에 노출되어도 안전합니다.
 *   실제 보안은 RLS(Row Level Security)가 서버에서 처리합니다.
 */
const SUPABASE_URL = 'https://rffwmnzvxgmdoyqlkalt.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_3prhN8fL0oo7ySd-Un7zDQ_QOPRrRnv';

/* Supabase 클라이언트 생성 (전역 변수) */
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
