# 안보라 국어학원 웹사이트 - 코드 가이드

---

## 1. 프로젝트 구조

```
Web/
├── index.html          ← 유일한 HTML 진입점 (SPA)
├── css/
│   └── style.css       ← 전체 스타일시트
├── js/
│   ├── data.js         ← 1순위 로드 : 데이터 관리 (localStorage CRUD)
│   ├── admin.js        ← 2순위 로드 : 관리자 인증 + 인라인 편집 기능
│   └── app.js          ← 3순위 로드 : SPA 라우터 + 페이지 렌더링 + 전화 FAB
├── img/
│   └── logo.png        ← 학원 로고
└── CODE_GUIDE.md       ← 이 문서
```

---

## 2. 스크립트 로드 순서

```html
<script src="js/data.js"></script>    ← ① CRUD 함수 + 기본 데이터
<script src="js/admin.js"></script>   ← ② 관리자 인증 + 편집 모달
<script src="js/app.js"></script>     ← ③ 라우터 + 렌더링 + 전화 FAB
```

| 순서 | 파일 | 역할 |
|------|------|------|
| ① | `data.js` | `getData`, `addItem` 등 CRUD 함수를 전역에 등록. 나머지 파일이 의존함 |
| ② | `admin.js` | `adminIsAuthed`, `adminOpenModal` 등 관리자 함수 등록. `app.js`가 호출함 |
| ③ | `app.js` | 라우터 초기화 + `DOMContentLoaded`로 첫 화면 렌더링 |

---

## 3. 실행 흐름

```
브라우저가 index.html 파싱
│
├─ CSS 로드 (style.css)
│
├─ DOM 파싱 (header, edit-bar, main, footer, phone FAB, 모달들)
│
├─ data.js 실행 → DB_KEYS, 기본 데이터, CRUD 함수 등록
│
├─ admin.js 실행
│   ├─ 비밀번호 해시, 인증 함수, 편집 모달 함수 등록
│   └─ DOMContentLoaded 리스너 등록 (푸터 3회 클릭, 로그인 폼, 모달 이벤트)
│
├─ app.js 실행
│   ├─ 라우터 함수, 렌더링 함수 등록
│   ├─ 전화 FAB 초기화 (renderPhoneList, 토글 이벤트)
│   ├─ 햄버거 메뉴 이벤트 바인딩
│   └─ DOMContentLoaded + hashchange 리스너 등록
│
└─ DOMContentLoaded 발생
    ├─ admin.js: 이벤트 바인딩 완료
    └─ app.js: navigate() 실행 → 첫 화면 렌더링
```

---

## 4. 각 파일 상세 설명

---

### 4-1. `index.html` - 단일 진입점

SPA의 유일한 HTML 파일. 모든 페이지 전환은 JS가 `<main id="main-content">` 내용을 교체합니다.

#### 구조

```
<body>
├─ <header class="header">              ← 고정 헤더 (항상 보임)
│   ├─ 로고 (logo.png + "안보라 국어 학원")
│   ├─ 햄버거 버튼 (모바일)
│   └─ <nav> 메뉴 링크들
│
├─ <div class="edit-bar">               ← 편집 모드 바 (평소 숨김)
│   ├─ 깜빡이는 초록 점 + "편집 모드"
│   └─ 편집 종료 / 로그아웃 버튼
│
├─ <main id="main-content">             ← JS가 동적으로 채우는 영역
│
├─ <footer class="footer">
│   ├─ 약도, 이용약관, 개인정보 링크
│   └─ <p id="copyright">              ← ★ 3회 클릭 시 관리자 접근
│
├─ <div class="fab-phone-wrap">         ← 플로팅 전화 버튼 (항상 보임)
│   ├─ 관별 전화번호 목록 (토글)
│   └─ 전화 아이콘 FAB
│
├─ <div id="admin-login-overlay">       ← 비밀번호 입력 모달 (숨김)
│
└─ <div id="admin-modal-overlay">       ← 편집 모달 (숨김)
```

---

### 4-2. `js/data.js` - 데이터 관리

서버 없이 **localStorage**를 DB처럼 사용합니다.

#### 저장 키

```javascript
const DB_KEYS = {
  instructors: 'academy_instructors',   // 강사
  curriculum:  'academy_curriculum',    // 교육과정
  notices:     'academy_notices',       // 공지사항
  test_steps:  'academy_test_steps',   // 입학 테스트 단계
  test_info:   'academy_test_info',    // 테스트 안내 정보 (단일 객체)
  branches:    'academy_branches',     // 관별 전화번호
  hero:        'academy_hero',         // 메인 배너 (단일 객체)
};
```

#### 데이터 구조

| 키 | 타입 | 필드 |
|----|------|------|
| `instructors` | 배열 | `id, name, position, desc, img` |
| `curriculum` | 배열 | `id, title, tag, desc, target, schedule` |
| `notices` | 배열 | `id, title, date, content, important` |
| `test_steps` | 배열 | `id, title, desc` |
| `test_info` | 단일 객체 | `schedule, duration, areas, materials, cost, phone, formUrl` |
| `branches` | 배열 | `id, name, phone` |
| `hero` | 단일 객체 | `title, titleAfter, subtitle, bgImage, btnText, btnLink` |

#### CRUD 함수

```
getData(key)       → localStorage에서 읽기 (없으면 기본 데이터 저장 후 반환)
saveData(key, data)→ localStorage에 JSON으로 저장
getNextId(items)   → 배열 내 최대 id + 1 (자동 증가)
addItem(key, item) → 배열에 새 항목 추가
updateItem(key, id, updates) → 기존 항목 수정
deleteItem(key, id)→ 항목 삭제
```

**참고**: `test_info`와 `hero`는 단일 객체이므로 `addItem`/`updateItem`/`deleteItem` 대신 `saveData`로 직접 저장합니다.

---

### 4-3. `js/app.js` - SPA 라우터 + 렌더링

#### 라우터 동작 원리

```
URL: index.html#notice/3
         ↓
location.hash → "#notice/3"
         ↓
hash.split('/') → ["notice", "3"]
         ↓
page = "notice", param = "3"
         ↓
renderers["notice"] → renderNoticeDetail(3)
```

#### 라우트 맵

| 해시 | 함수 | 설명 |
|------|------|------|
| `#home` (기본) | `renderHome()` | 메인 (배너 + 강사/교육과정/테스트/공지 미리보기) |
| `#instructors` | `renderInstructors()` | 강사 전체 목록 |
| `#curriculum` | `renderCurriculum()` | 교육과정 전체 목록 |
| `#test` | `renderTest()` | 입학 테스트 (단계 + 안내 정보) |
| `#notices` | `renderNotices()` | 공지사항 목록 (검색 기능 포함) |
| `#notice/숫자` | `renderNoticeDetail(id)` | 공지 상세 |
| `#map` | `renderMap()` | 약도 (카카오맵 링크 + 관별 주소) |
| `#terms` | `renderTerms()` | 이용약관 |
| `#privacy` | `renderPrivacy()` | 개인정보처리방침 |
| `#admin` | 인증 후 편집모드 진입 | 숨겨진 경로 |

#### 인라인 편집 컨트롤 헬퍼

모든 렌더링 함수 안에 편집 컨트롤이 포함되어 있지만, CSS로 숨겨져 있다가 `body.edit-mode` 클래스가 추가되면 표시됩니다.

```javascript
editBtns(type, id)      // 카드에 수정/삭제 버튼 (class="card-edit-actions")
addCard(type, label)     // "+ 추가" 점선 카드 (class="add-card")
noticeEditBtns(id)       // 공지 목록 항목에 수정/삭제 (class="item-edit-actions")
```

#### 공지사항 검색

```
renderNotices()
├─ 검색창 렌더링 (notice-search)
├─ filterNoticeList() 호출 → 목록 렌더링
└─ 이벤트 바인딩:
    ├─ compositionstart → 한글 조합 중 플래그 ON
    ├─ compositionend   → 플래그 OFF + 검색 실행
    └─ input            → 조합 중 아니면 검색 실행

filterNoticeList(keyword)
├─ getData('notices')에서 전체 가져옴
├─ keyword로 title, content 필터링 (toLowerCase 비교)
└─ #notice-list-container의 innerHTML만 교체 (검색창 유지)
```

**핵심**: 검색 시 전체 페이지가 아닌 목록만 교체하므로 한글 IME 조합이 깨지지 않고, 검색 결과 클릭도 정상 동작합니다.

#### 플로팅 전화 버튼

```
fab-phone 클릭
├─ fab-phone-wrap에 'open' 클래스 토글
└─ 열릴 때 renderPhoneList() 호출
    ├─ getData('branches')에서 관 데이터 가져옴
    ├─ 각 관: 이름 + 전화번호 + tel: 링크
    ├─ 편집 모드일 때: 수정/삭제 버튼 표시
    └─ 편집 모드일 때: "+ 관 추가" 버튼 표시

문서 아무 곳 클릭 → fab-phone-wrap.open 제거 (닫힘)
```

**모바일**: `tel:` 링크이므로 터치 시 바로 전화 연결 팝업이 뜹니다.

---

### 4-4. `js/admin.js` - 관리자 기능

#### 비밀번호 인증 (SHA-256 해시)

```
비밀번호는 코드에 원문이 아닌 SHA-256 해시값으로 저장됩니다.

const ADMIN_PW_HASH = '46aa9cb...';  // 해시값만 노출

adminLogin(pw)
├─ 입력값을 SHA-256으로 해시
├─ 저장된 해시와 비교
├─ 일치 → sessionStorage에 'admin_auth'='1' 저장
└─ 불일치 → false 반환

비밀번호 변경 방법:
  브라우저 콘솔에서 해시 생성 → admin.js의 ADMIN_PW_HASH 교체
```

인증은 **sessionStorage** 기반이므로 탭/브라우저를 닫으면 자동 로그아웃됩니다.

#### 관리자 진입 방법

| 방법 | 설명 |
|------|------|
| 푸터 3회 클릭 | `© 2026 안보라...` 텍스트를 2초 내에 3번 클릭 |
| URL 직접 입력 | 주소창에 `#admin` 입력 |

어떤 방법이든 비밀번호 모달이 뜹니다. 사이트 어디에도 관리자 링크가 노출되지 않습니다.

#### 편집 모드 (CSS 기반 토글)

```
enterEditMode()  → document.body.classList.add('edit-mode')
exitEditMode()   → document.body.classList.remove('edit-mode')

body.edit-mode일 때 CSS가 자동으로:
├─ 편집 바 (초록색) 표시
├─ 카드 수정/삭제 버튼 표시
├─ "+ 추가" 카드/버튼 표시
├─ 공지 상세 수정/삭제 표시
├─ 테스트 안내 수정 버튼 표시
├─ 히어로 배너 수정 버튼 표시
└─ 전화 목록 관 수정/추가 버튼 표시

페이지를 다시 렌더링하지 않고 CSS 클래스만으로 토글합니다.
```

#### 편집 모달 처리

```
adminOpenModal(type, editId)
│
├─ 단일 객체 타입 (hero, test_info):
│   └─ getData()로 현재값 가져와서 폼에 채움
│
├─ 배열 타입 (instructors, curriculum, notices, test_steps, branches):
│   ├─ editId가 있으면 → 해당 항목 찾아서 폼에 기존값 채움
│   └─ editId가 null이면 → 빈 폼 (추가 모드)
│
└─ 모달 표시

adminHandleSubmit()
│
├─ hero / test_info → saveData()로 단일 객체 저장
├─ branches → addItem/updateItem + renderPhoneList() (전화 목록 갱신)
└─ 나머지 → addItem/updateItem + navigate() (페이지 다시 렌더링)
```

#### 편집 가능한 항목 총정리

| 영역 | 수정 | 추가 | 삭제 |
|------|:----:|:----:|:----:|
| 메인 배너 (히어로) | ✅ | - | - |
| 강사 | ✅ | ✅ | ✅ |
| 교육과정 | ✅ | ✅ | ✅ |
| 공지사항 | ✅ | ✅ | ✅ |
| 테스트 단계 | ✅ | ✅ | ✅ |
| 테스트 안내 정보 | ✅ | - | - |
| 관별 전화번호 | ✅ | ✅ | ✅ |

---

### 4-5. `css/style.css` - 스타일

#### CSS 변수

```css
--primary: #1B3A5C        /* 메인 네이비 */
--primary-light: #2a5a8c  /* 밝은 네이비 */
--accent: #C9A96E         /* 골드 포인트 */
--accent-dark: #a8893e    /* 어두운 골드 */
--bg: #f5f6f8             /* 배경색 */
--white: #ffffff
--text: #333333           /* 기본 텍스트 */
--text-light: #666666     /* 보조 텍스트 */
--border: #e0e0e0         /* 구분선 */
--radius: 8px             /* 모서리 둥글기 */
--header-h: 70px          /* 헤더 높이 */
--max-w: 1200px           /* 최대 너비 */
```

#### 주요 레이아웃

```
┌────────────── header (fixed, z-index: 1000) ───────────────┐
│  [로고]    메인화면  강사소개  교육과정  입학테스트  공지사항  │
└────────────────────────────────────────────────────────────┘
┌────────────── edit-bar (fixed, z-index: 999, 편집 모드만) ──┐
│  ● 편집 모드                          [편집 종료] [로그아웃]  │
└────────────────────────────────────────────────────────────┘
┌────────────── main ───────────────────────────────────────┐
│  [동적 컨텐츠: 배너, 카드, 목록, 상세 등]                    │
└────────────────────────────────────────────────────────────┘
┌────────────── footer (배경: primary) ─────────────────────┐
│           약도 | 이용약관 | 개인정보                         │
│       © 2026 안보라. All rights reserved.                  │
└────────────────────────────────────────────────────────────┘
                                               ┌──────────┐
                                               │ [전화 FAB]│
                                               └──────────┘
```

#### z-index 계층

```
3000  admin-login-overlay (로그인 모달)
2000  admin-modal-overlay (편집 모달)
1001  hamburger 버튼
1000  header
 999  edit-bar
 900  fab-phone-wrap (전화 버튼)
```

#### 편집 모드 CSS 패턴

편집 컨트롤은 HTML에 항상 존재하지만, CSS로 숨겨져 있습니다:

```css
.card-edit-actions { display: none; }
body.edit-mode .card-edit-actions { display: flex; }

.add-card { display: none; }
body.edit-mode .add-card { display: block; }
```

이 패턴으로 **JS 재렌더링 없이** 편집 모드를 토글할 수 있습니다.

#### 반응형 브레이크포인트

| 조건 | 변경 사항 |
|------|-----------|
| `max-width: 768px` | 햄버거 메뉴, nav 사이드바, 카드 1열, 편집 바 세로 배치 |
| `max-width: 480px` | 섹션 헤더 세로, 푸터 간격 축소 |

---

## 5. 데이터 흐름 요약

### 공개 페이지

```
localStorage ──getData()──→ JS 배열/객체 ──템플릿 리터럴──→ innerHTML ──→ 화면
```

### 편집 모드 수정

```
편집 버튼 클릭
  → adminOpenModal(type, id) → 모달 표시 + 기존값 채움
  → 사용자 수정 후 저장 클릭
  → adminHandleSubmit()
    → saveData() 또는 addItem()/updateItem()  ← localStorage 저장
    → navigate() 또는 renderPhoneList()        ← 화면 갱신
```

---

## 6. 약도 페이지

카카오맵 API 키 없이 "카카오맵에서 보기" 링크 방식을 사용합니다.

```
https://map.kakao.com/link/search/주소
```

관별 주소:
| 관 | 주소 | 비고 |
|----|------|------|
| 아르누보관 (메인) | 강남구 도곡로 405, 삼환아르누보 2차 3층 | - |
| 한티관 | 강남구 선릉로 318, 동궁상가 2층 | 한티역 1번 출구 100m |
| 디마크관 | 강남구 도곡로 408, 디마크빌딩 5층 | 한티역 3번 출구 110m |

---

## 7. 보안 참고

| 항목 | 현재 상태 | 비고 |
|------|-----------|------|
| 비밀번호 저장 | SHA-256 해시 | 소스에 원문 미노출 |
| 인증 저장소 | sessionStorage | 탭 닫으면 자동 만료 |
| 데이터 저장 | localStorage | 클라이언트 전용 |
| 실제 보안 | 제한적 | 서버 연결 시 Firebase Auth 등으로 교체 권장 |

비밀번호 변경 방법:
```javascript
// 브라우저 콘솔에서 실행
crypto.subtle.digest('SHA-256', new TextEncoder().encode('새비밀번호'))
  .then(h => console.log(Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,'0')).join('')))
// 출력된 해시값을 admin.js의 ADMIN_PW_HASH에 교체
```