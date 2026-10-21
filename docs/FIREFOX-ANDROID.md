# Android: Google 로그인 + 한글 패치 + 홈 화면 실행 시험 경로

## 상태부터 확인

**문서상 지원되는 구성에 맞춘 실기기 미검증 시험판입니다. Google 로그인 성공이나 홈 화면 앱에서의 번역·저장 유지를 보장하지 않습니다.**

- 기존 WebView APK의 Google 로그인 제한을 해제한 새 APK가 아닙니다.
- 로그인과 플레이를 모두 실제 Firefox 안에서 수행하고, Tampermonkey가 게임 화면만 번역하는 대안입니다.
- iPhone Safari의 Userscripts/PWA 제한과는 다른 Android Firefox 경로입니다.
- 기존 Chrome 또는 WebView APK의 로컬 기록은 Firefox로 자동 이전되지 않습니다. 공식 클라우드 계정·기록 복원은 실제 로그인 후 직접 확인해야 합니다. 새 계정을 만들어 기존 계정을 대체하지 마세요.

## 설치

1. [공식 Firefox Android](https://play.google.com/store/apps/details?id=org.mozilla.firefox)를 설치하거나 최신 버전으로 업데이트합니다.
2. Firefox에서 [공식 Tampermonkey 확장](https://addons.mozilla.org/en-US/android/addon/tampermonkey/)을 설치합니다. 확장이 요구하는 권한을 확인하세요.
3. **[Firefox 브라우저용 시험 패치 설치](https://raw.githubusercontent.com/GuenohPark/pokesurvivor/main/dist/pokesurvivor-ko-browser.user.js)**를 Firefox에서 열고 Tampermonkey의 설치 화면에서 설치합니다. 기존 한국어 로더/패치는 동시에 켜지 마세요. 코드만 표시된다면 Tampermonkey 대시보드의 가져오기/URL 설치 기능을 사용하세요.
4. **[공식 게임](https://pokesurvivor.com/)**을 Firefox의 일반 탭에서 엽니다. 비공개 탭은 쓰지 않습니다. 페이지를 새로고침합니다.
5. 게임의 정상 Google 로그인 버튼을 직접 눌러 로그인하고, 기존 기록이 복원되는지 확인합니다. 패치는 Google/Firebase 인증 페이지에 실행되지 않으며 인증 결과를 추출하거나 복사하지 않습니다.
6. 메뉴와 게임의 Canvas 글자가 모두 한글인지 확인합니다. DOM만 번역되고 HUD가 영어라면 페이지 컨텍스트 주입 실패일 수 있으므로 완전 지원으로 보지 마세요.
7. 정상 동작을 먼저 확인한 다음 Firefox 메뉴의 **설치(Install)**로 홈 화면에 추가합니다. 일반 Chrome이나 기존 APK에서 추가한 아이콘이 아니라 **Firefox에서 설치한 아이콘**을 사용하세요.
8. 홈 화면 실행에서 번역과 로그인 상태가 유지되는지 다시 확인합니다. 전체 화면이 안 되면 게임 설정의 전체 화면 기능을 사용해 보세요. 실제 기기의 Firefox/런처 조합에 따라 동작이 달라질 수 있습니다.

## Canvas 번역 조건

이 파일은 기존 iPhone용 DOM 전용 로더와 달리 페이지의 `fillText`, `strokeText`, `measureText`에 번역 훅을 설치합니다. `@sandbox raw`, `@inject-into page`, `@grant none`, `@run-at document-start`를 지정하며 HTML 루트가 생기기 전에는 초기화를 기다립니다. Tampermonkey의 샌드박스 폴백이나 CSP 때문에 콘텐츠 컨텍스트에서만 실행되면 Canvas 번역이 되었다고 볼 수 없습니다.

문제가 있으면 Tampermonkey의 **Content Script API** 설정에서 Firefox용 **UserScripts API** 계열을 확인하세요. 이는 문서 시작 실행을 지원하는 경로입니다. 사이트/브라우저의 보안·인증서·CSP를 전역으로 끄거나 UA를 위장하지 마세요. 설치 뒤 게임을 새로고침해야 합니다.

브라우저 파일 버전은 `0.1.7`, 포함한 번역 데이터는 `0.4.4`입니다. 업데이트는 Tampermonkey의 스크립트 업데이트 기능으로 받습니다. 기존 APK/아이폰 자동 로더와 업데이트 경로가 다릅니다.

## 검증 범위

- 구문, 허용 출처, Google/Firebase 페이지 제외, DOM 준비 대기, Canvas 번역/측정 일치 등 자동 검사 19개 통과.
- 기존 번역·글꼴·로더 자동 검사 유지.
- 격리된 macOS Firefox 자동 시험은 엔진 실행 시간 초과로 완료하지 못했습니다. Tampermonkey에서 실제 MAIN-world 주입이 된다는 검증 결과는 아직 없습니다.
- Android Google 로그인 완료, PWA 확장 실행, 종료 후 로그인/저장 유지, 전체 화면과 성능은 **미검증**입니다.

## 근거

- [Mozilla: Firefox Android 웹앱에서 브라우저 확장 사용 및 설치](https://support.mozilla.org/en-US/kb/use-web-apps-firefox-android)
- [Mozilla: Android용 Tampermonkey](https://addons.mozilla.org/en-US/android/addon/tampermonkey/)
- [Tampermonkey: sandbox/MAIN_WORLD](https://www.tampermonkey.net/documentation.php?locale=en&q=sandbox)
- [Tampermonkey: Content Script API와 document-start](https://www.tampermonkey.net/documentation.php?locale=en&q=content_script_api)
- [Google: WebView 대신 지원 브라우저를 사용하는 OAuth 정책](https://developers.google.com/identity/protocols/oauth2/policies#use-secure-browsers)

비공식 팬 패치입니다. 원본 게임 운영자 및 Pokémon 권리자와 무관합니다.

## 도감 풀강화 잠정 티어

브라우저 스크립트 0.1.7 / 한국어 패치 0.4.10에는 도감 배지와 보유 포켓몬 상세의 풀강화 수치가 포함됩니다. [평가 기준](TIERS.md). 이 기능 추가가 Android Firefox 실기기 또는 Google 로그인 검증 완료를 뜻하지는 않습니다.
