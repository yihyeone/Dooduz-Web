# 두더지 도감 안전 수정 가이드

## 최우선 원칙

1. 접속 유지가 기능 추가보다 우선이다.
2. 한 번에 한 가지 UI/기능만 수정한다.
3. 현재 정상 Production 커밋을 기준점으로 잡고 시작한다.
4. 수정 전후로 `index.html`의 outer JavaScript 문법을 반드시 검사한다.
5. 배포 성공만으로 완료 처리하지 않고, 실제 화면 구조가 깨지지 않았는지 확인한다.

## 현재 구조 이해

- `app.html`: 실제 도감 본체가 들어 있는 대용량 파일. GitHub 커넥터에서 내용이 비어 보일 수 있으나 실제 빈 파일로 판단하면 안 된다.
- `index.html`: `app.html`을 fetch한 뒤 문자열 치환으로 UI/기능을 추가하고 `document.write(s)`로 최종 화면을 구성하는 로더.
- 따라서 `index.html`의 문자열 따옴표, 백틱, `</script>`, 줄바꿈이 깨지면 전체 사이트 접속이 실패할 수 있다.

## 금지 패턴

- `index.html` 문자열 안에 중첩 `<script>...</script>` 삽입 금지.
- 검증 없이 multiline JavaScript/CSS 문자열을 직접 삽입 금지.
- sticky 문제를 `100vw`, 큰 `box-shadow`, 임의의 `z-index`로 덮어서 해결하지 않는다.
- 상단 고정영역 수정 시 `.main-header`, `.tools`, `.stats`의 위치/폭을 동시에 바꾸지 않는다.
- 화면이 깨진 상태에서 추가 수정으로 덮어 해결하지 않는다. 즉시 직전 정상 커밋으로 복구한다.

## 부분 수정 표준 절차

### 1. 현재 정상 상태 확인
- 최근 Production success 커밋 확인.
- 수정 대상 CSS/JS가 실제로 어느 파일에 있는지 먼저 확인.

### 2. 변경 범위 최소화
- CSS 수정이면 해당 selector만 수정.
- 기능 추가면 독립적인 버튼/이벤트만 추가.
- 기존 sticky geometry (`position`, `top`, `z-index`, margin/width)는 요청과 직접 관련 없으면 유지.

### 3. 안전한 삽입 방식
- 가능하면 기존 `<style>`에 한 selector만 추가하거나 안전한 단일 `<style>` 문자열을 `</head>` 앞에 삽입.
- 기능은 중첩 script 대신 기존 outer script 내부 함수/이벤트로 추가.
- HTML 버튼은 기존 body 문자열의 명확한 marker 한 곳에만 삽입.

### 4. 자동 검증
커밋 전에 최소 다음을 통과해야 한다.

- `node --check`로 outer JavaScript 문법 확인.
- 금지 문자열/중첩 `</script>` 유입 여부 확인.
- sticky 수정이 아닌 작업에서는 sticky 관련 CSS가 바뀌지 않았는지 확인.
- 의도한 marker가 정확히 1회 존재하는지 확인.

### 5. 배포 후 확인
- GitHub Actions success.
- Vercel Production deployment success.
- 실제 확인 항목:
  - 페이지 정상 접속
  - 상단 타이틀 sticky 정상
  - 검색/필터 sticky 정상
  - 도감 완성도/작성 버튼 가림 없음
  - 카드 스크롤 정상
  - 새 기능 작동

## sticky 영역 수정 시 기준

- 타이틀 탭과 검색/필터 폭은 동일한 도감 컨테이너 기준으로 맞춘다.
- 검색창/필터 내부 padding은 유지하고, 외부 `.tools` 폭만 맞춘다.
- 빈 틈이 생겼다면 먼저 `top` 값이 현재 타이틀 높이와 맞는지 확인한다.
- 빈 틈을 가리는 덮개보다 geometry를 올바르게 맞추는 것이 우선이다.

## 장애 발생 시 복구 순서

1. 신규 기능 커밋 즉시 중단.
2. 직전 Production 정상 커밋으로 `main` 복구.
3. 새 커밋을 하나 만들어 Vercel Production 재배포를 확실히 트리거.
4. Production success 확인 후 다시 수정 설계.

## 완료 기준

'코드 반영됨'이 아니라 아래를 모두 만족해야 완료다.

- 접속 정상
- 기존 기능 정상
- 요청 기능 정상
- 스크롤/sticky 정상
- Production success

이 기준을 앞으로 두더지 도감의 모든 부분 수정에 기본 절차로 사용한다.
