# 꽃 관리자 페이지 최초 설정

관리자 화면 코드는 저장소에 포함되어 있지만, 이미지와 데이터를 실제로 저장하려면 기존 Google Apps Script를 한 번 새 버전으로 배포하고 GitHub 토큰을 Script Properties에 보관해야 한다.

## 1. GitHub 토큰 만들기

1. GitHub의 **Settings → Developer settings → Personal access tokens → Fine-grained tokens**로 이동한다.
2. 저장소는 `yihyeone/Dooduz-Web` 하나만 선택한다.
3. Repository permissions에서 **Contents: Read and write**만 허용한다.
4. 만료일을 설정하고 토큰을 만든다.

토큰은 관리자 웹페이지나 `Code.gs`에 직접 적지 않는다.

## 2. Apps Script 코드 교체

1. 현재 도감에서 사용하는 Google Apps Script 프로젝트를 연다.
2. 저장소의 `apps-script/Code.gs` 전체 내용으로 기존 `Code.gs`를 교체한다.
3. 저장한다.

## 3. Script Properties 설정

Apps Script 좌측 **프로젝트 설정 → 스크립트 속성**에 다음 값을 추가한다.

| 속성 | 값 |
|---|---|
| `GITHUB_TOKEN` | 1단계에서 만든 토큰 |
| `GITHUB_REPOSITORY` | `yihyeone/Dooduz-Web` |
| `GITHUB_BRANCH` | `main` |
| `ADMIN_FLOWER_KEY` | 혜원님만 아는 8자 이상의 꽃 등록 비밀번호 |

## 4. 웹 앱 새 버전 배포

1. **배포 → 배포 관리**를 연다.
2. 현재 웹 앱 배포의 편집 버튼을 누른다.
3. 버전을 **새 버전**으로 바꾼다.
4. 액세스 권한과 실행 계정은 기존 설정을 유지한다.
5. 배포한 뒤 기존 `/exec` 주소가 유지되는지 확인한다.

## 5. 동작 확인

1. `https://dooduz-web.vercel.app/admin.html`에 접속한다.
2. 관리자 PIN으로 로그인한다.
3. **기존 이미지 교체**에서 테스트할 꽃을 정확히 선택한다.
4. 캡처를 올리고 카드 프레임을 212:279 틀에 맞춘다.
5. 등록 후 1~2분 뒤 도감에서 확인한다.

신규 꽃 등록은 Google Sheet에 새 행을 추가하고, 이미지 교체는 시트 행을 변경하지 않는다.
