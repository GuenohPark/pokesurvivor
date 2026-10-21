# 실행 방식과 남은 제약

## 기기별 권장 경로

**아이폰은 Safari + 무료 [Userscripts](https://apps.apple.com/app/userscripts/id1463298887) + [자동 로더](https://raw.githubusercontent.com/GuenohPark/pokesurvivor/main/dist/pokesurvivor-ko-auto.user.js)가 기본 권장입니다.** 유료 iPhone Tampermonkey는 필요하지 않습니다. Userscripts는 DOM 번역용이며 전투 Canvas HUD는 지원하지 않습니다. PC·Android Firefox는 Tampermonkey 통합판을 사용합니다.

## PC·Android 통합 Tampermonkey판 0.5.0

[설치 파일](https://raw.githubusercontent.com/GuenohPark/pokesurvivor/main/dist/pokesurvivor.user.js) · [설치 안내](INSTALL.md) · [감사 기록](UNIFIED-AUDIT.md)

공통판의 기본 설치 안내는 PC Chrome/Edge/Firefox와 Android Firefox의 Tampermonkey를 대상으로 합니다. iOS Tampermonkey는 과거 구현 검토 대상이며 현재 아이폰 기본 권장 경로가 아닙니다. document-start에서 한 번 초기화하고, 공통 DOM 마커/기능 등록부와 URL polling(1초), popstate/hashchange/pageshow 및 body/root observer로 화면 변경을 감지하며 history API는 monkeypatch하지 않습니다. @grant none, @sandbox raw, top frame 전용이며 스크립트 안에 원격 실행 코드나 자체 업데이트 기능은 없습니다. Raw 업데이트 링크는 관리자의 확인/설정용이며 즉시 교체가 아닙니다. iOS 백그라운드 정지·권한에 따라 확인이 지연될 수 있고 판 중 코드를 바꾸지 않습니다.

대상은 pokesurvivor.com 및 www.pokesurvivor.com의 최상위 페이지뿐입니다. .org, 인증 화면, iframe/subframe은 제외합니다. 관리자 감지는 iOS에서 신뢰성 있게 할 수 없으므로 안내는 사용자 에이전트 기반 권고일 뿐입니다. Canvas/dialog 훅은 활성 게임 경로에서만 작동하며 원래 호출/반환을 보존하도록 설계했지만, page context에서 실행된다는 사실만으로 실제 게임 Canvas에 도달했다고 입증되지는 않습니다.

통합판을 켜기 전에 이전 패치 스크립트와 사용자 Chrome 확장을 끄세요. 기존 Chrome 수동판 0.1.8, 스토어판 0.1.3, APK 버전은 별도 대안으로 유지하며 기존 저장·계정·APK 삭제는 필요하지 않습니다. 실제 iPhone/Android와 각 Tampermonkey 조합, 로그인 및 클라우드 저장 흐름은 미검증입니다. [유지보수](MAINTENANCE.md)


[설치 안내](INSTALL.md) · [홈 화면 PWA 안내](PWA.md)

**아이폰의 독립 홈 화면 PWA는 현재 지원하지 않습니다. Safari 탭에서 사용하거나, iOS 26 이상의 ‘웹앱으로 열기’를 끈 Safari 바로가기를 사용하세요.** 이 제한은 Canvas 번역 제한과 별개의 실행 환경 문제입니다.

## iPhone Safari + App Store Userscripts

현재 배포 userscript는 `@inject-into content`로 실행되며 **DOM 텍스트·이름·설명·능력치·속성·한국어 검색**을 처리합니다. 게임 데이터나 서버 요청은 수정하지 않습니다.

**[blocked] 현재 iPhone Userscripts 앱만으로 Canvas HUD·게임 내 텍스트·브라우저 기본 확인창까지 적용됐다고 볼 수 없습니다.** 언어팩 번역 데이터는 준비되어 있으나 페이지 실행 컨텍스트 접근이 별도로 필요합니다. iPhone 실기기에서 v0.4.x 전체 흐름을 직접 검증한 것은 아닙니다. 기존 메뉴 패치는 사용자가 iPhone에서 작동한다고 확인했습니다.

검토한 Userscripts 안정 버전은 macOS v4.8.6 / iOS v1.8.6입니다. 이 버전은 page 모드를 인라인 script 태그로 넣습니다. 게임의 CSP는 이를 제한합니다. 단순히 `@inject-into page`로 바꾸거나 CSP를 끄는 방법은 이 배포의 해결책이 아닙니다.

근거:
- [Userscripts v4.8.6 page/content 주입 코드](https://github.com/quoid/userscripts/blob/06900223459036d2a238d93ab1af4d9f26cadbc7/src/ext/content-scripts/entry-userscripts.js#L48-L138)
- [개발자가 MAIN 실행을 별도로 검토한 이슈 #954](https://github.com/quoid/userscripts/issues/954)
- [공식 게임의 i18n](https://pokesurvivor.com/js/core/i18n.js)

## 진행 화면의 Swarm·실시간 격파 수·포켓몬 이름

**[blocked] 현재 App Store Userscripts(content) 설치만으로 이 Canvas HUD를 번역하지 못합니다.** 번역 단어 누락이 아니라 게임 페이지 컨텍스트의 그리기를 가로채지 못하는 실행 환경 제한입니다. 사전에 Swarm/Enjambre → 벌레의알림, Pokémon swarm! → 포켓몬 대량 발생!, Defeated/Derrotados → 격파 수와 포켓몬 이름이 이미 포함되어 있습니다.

공개 [HUD 소스](https://pokesurvivor.com/js/ui/hud.js)의 draw는 플레이어·보스 종 이름, 실시간 격파 수, 활성 기술명과 배너를 Canvas의 fillText/strokeText로 그립니다. [일시정지·결과 화면](https://pokesurvivor.com/js/ui/run-ui.js)은 DOM이어서 기술명·결과 격파 수·획득 포켓몬은 별도로 번역할 수 있지만, 일시정지 화면에 실시간 격파 수가 노출되는 것은 아닙니다.

2026-10-19에 확인한 Userscripts 최신 공개 릴리스는 v4.8.6(iOS 앱 1.8.6 계열)이며 page 주입은 인라인 script를 사용합니다. 게임의 meta CSP는 이를 허용하지 않습니다. content에서 installCanvas를 호출하거나 관찰자를 더 붙이는 것으로 해결됐다고 주장하지 않습니다. 전용 Safari WebExtension의 MAIN 실행, 앱 패키징·서명·기기 설치와 검증이 필요합니다. 진행 화면까지 동작하는 iPhone 설치 파일은 아직 제공하지 않습니다.

## 한글 크기 10% 축소 (0.4.3)

주 포인터가 터치인 기기(pointer: coarse)에서는 갈무리의 한글 전용 font-face 두 개에 size-adjust:90%를 적용합니다. 데스크톱(pointer:fine)은 100%이며 영문·숫자·버튼 크기 자체를 줄이지 않습니다. 미디어 조건 변경과 재주입 시 중복 스타일/리스너를 방지합니다. 이 글리프 축소는 Safari/iOS 17 이상에서 지원되는 font-face size-adjust를 사용하므로 구형 Safari에서는 원래 크기로 남을 수 있습니다. [브라우저 지원](https://caniuse.com/mdn-css_at-rules_font-face_size-adjust)

폰트 비율·일반/굵게·미디어 전환·재주입과 폰트 바이트 보존은 자동 테스트로 확인하며, 물리적 iPhone 검증은 아직 하지 않았습니다.

## 별도 WebExtension 소스

저장소의 extension/manifest.json과 extension/extension-*.js는 별도 브라우저 확장 소스입니다. 백그라운드에서 **browser.scripting.executeScript({world:'MAIN', func, args})**를 사용합니다. 문자열 eval이나 동적 script 태그를 이용하지 않으며 사이트 CSP를 해제하지 않습니다. 숨겨진 게임 G 객체에도 접근하지 않습니다.

MAIN 쪽은 fillText·strokeText·measureText를 함께 감싸고, alert/confirm 문구도 번역합니다. 기존 게임 i18n과 이어서 작동합니다. HUD의 Psychic 기술명은 사이코키네시스로, DOM의 에스퍼 타입 표시는 에스퍼로 분리합니다. Canvas에는 DOM의 사용자명 보호 마커가 없으므로, 닉네임이 사전의 포켓몬 이름과 정확히 같은 경우 화면에서 번역될 수 있습니다. 서버에 저장된 닉네임은 바뀌지 않습니다.

**검증 범위:** 데스크톱 Chromium 페이지 컨텍스트에 같은 코드를 실행해 Mewtwo/뮤츠 및 Psychic/사이코키네시스의 measureText 결과가 일치하는 것과 기본 창 번역 래퍼 설치를 확인했습니다. 실제 확장을 설치한 종단간 시험이나 Safari iPhone 서명 앱 시험을 수행한 것은 아닙니다.

### 데스크톱 Chrome에서 소스로 설치

1. [데스크톱 확장 ZIP](https://raw.githubusercontent.com/GuenohPark/pokesurvivor/main/dist/pokesurvivor-ko-desktop-extension.zip)을 받아 압축을 풉니다.
2. Chrome 확장 관리에서 개발자 모드를 켭니다.
3. 압축해제된 확장 프로그램 로드로 압축 안의 extension/ 폴더를 고릅니다. 저장소 전체 ZIP을 받았다면 extension/ 폴더를 고릅니다. 해당 폴더 안에 manifest.json이 있어야 합니다.
4. 기존 Userscripts 패치는 꺼서 중복 실행을 피하고 게임을 새로고침합니다.

### iPhone 설치

**ZIP이나 manifest 파일을 iPhone에서 여는 것만으로는 설치되지 않습니다.** Safari Web Extension을 앱으로 패키징하고 서명하여 기기에 설치하거나 TestFlight/App Store로 배포해야 합니다. Xcode 또는 Apple의 Safari Web Extension Packager/App Store Connect 경로를 사용할 수 있습니다. 이 저장소에는 서명된 iOS 앱이 없습니다. [Apple의 패키징 안내](https://developer.apple.com/videos/play/wwdc2026/216/)를 참고하세요. 필요한 호스트 권한은 pokesurvivor.com만이며 실제 지원 iOS·Safari 버전과 권한 처리는 기기에서 검증해야 합니다.

다른 해결책은 공식 개발팀이 한국어 사전을 게임에 포함하거나 의도적인 번역 확장 API를 제공하는 것입니다. 현재 저장소는 그 승인을 받았다고 주장하지 않습니다.

## 기타 범위

- .org 및 `www.pokesurvivor.org`는 제외되며, .org에서 .com을 iframe/sub로 실행하는 방식도 지원하지 않습니다. .com을 일반 탭에서 직접 여세요.
- .org 공략 기사의 전문 번역은 게임 한글화 범위에 포함하지 않습니다.
- 회원 닉네임·사용자 입력·비밀번호·저장 데이터는 번역 대상이 아닙니다. 한국어 검색은 검색칸만 원래 게임의 영문/번호 필터로 연결합니다.
- 숫자·피해량·아이템 효과·획득 확률은 수정하지 않습니다. 원본 숫자 표기 방식을 유지합니다.
- 공식 업데이트로 추가된 새 문자열이나 다른 화면 구조는 추가 점검이 필요할 수 있습니다. 100% 모든 실행 분기를 시험했다는 의미가 아닙니다.

## 자동 로더 (0.4.1부터)

자동 로더는 content 컨텍스트에서 GM.getValue·GM.setValue·GM.xmlHttpRequest를 사용합니다. 공개 GitHub 주소의 코드만 받아 버전·식별자·문법을 확인하고 실행합니다. 앱의 업데이트 버튼과 별개로 동작하며 페이지 입력 이후 새 버전을 hot-swap하지 않습니다.

Userscripts v4.8.6/iOS1.8.6의 content 주입 코드 자체가 Function을 사용하는 것을 확인했습니다: https://github.com/quoid/userscripts/blob/06900223459036d2a238d93ab1af4d9f26cadbc7/src/ext/content-scripts/entry-userscripts.js#L79-L89 . 이는 페이지 world의 CSP 차단과 구분됩니다. 자동 로더 역시 이 content 실행 경로를 사용하며 Canvas 권한이 생기는 것은 아닙니다. 물리적 iPhone에서 새 로더를 실행한 검증은 아직 하지 않았습니다. 현재 배포는 공통 번역팩 0.5.0 / 아이폰 자동 로더 0.1.2이며 새 주소는 dist/입니다. 기존 루트 업데이트 주소 4개는 같은 파일로 유지합니다.

캐시가 없을 때 확인 중 사용자가 게임을 먼저 시작하면 받은 코드는 저장만 하고 다음 새로고침 때 적용합니다. 동일 버전 재접속·오프라인·잘못된 응답·버전 불일치·사용자 입력 시점 등 13개 분기와 GM이 전역이 아닌 주입 매개변수인 경우를 Node에서 검증했습니다.
