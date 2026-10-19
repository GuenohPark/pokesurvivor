# 실행 방식과 남은 제약

## iPhone Safari + App Store Userscripts

현재 배포 userscript는 `@inject-into content`로 실행되며 **DOM 텍스트·이름·설명·능력치·속성·한국어 검색**을 처리합니다. 게임 데이터나 서버 요청은 수정하지 않습니다.

**[blocked] 현재 iPhone Userscripts 앱만으로 Canvas HUD·게임 내 텍스트·브라우저 기본 확인창까지 적용됐다고 볼 수 없습니다.** 언어팩 번역 데이터는 준비되어 있으나 페이지 실행 컨텍스트 접근이 별도로 필요합니다. iPhone 실기기에서 v0.4.0 전체 흐름을 직접 검증한 것은 아닙니다. 기존 메뉴 패치는 사용자가 iPhone에서 작동한다고 확인했습니다.

검토한 Userscripts 안정 버전은 macOS v4.8.6 / iOS v1.8.6입니다. 이 버전은 page 모드를 인라인 script 태그로 넣습니다. 게임의 CSP는 이를 제한합니다. 단순히 `@inject-into page`로 바꾸거나 CSP를 끄는 방법은 이 배포의 해결책이 아닙니다.

근거:
- [Userscripts v4.8.6 page/content 주입 코드](https://github.com/quoid/userscripts/blob/06900223459036d2a238d93ab1af4d9f26cadbc7/src/ext/content-scripts/entry-userscripts.js#L48-L138)
- [개발자가 MAIN 실행을 별도로 검토한 이슈 #954](https://github.com/quoid/userscripts/issues/954)
- [공식 게임의 i18n](https://pokesurvivor.com/js/core/i18n.js)

## 별도 WebExtension 소스

저장소의 manifest.json과 extension-*.js는 별도 브라우저 확장 소스입니다. 백그라운드에서 **browser.scripting.executeScript({world:'MAIN', func, args})**를 사용합니다. 문자열 eval이나 동적 script 태그를 이용하지 않으며 사이트 CSP를 해제하지 않습니다. 숨겨진 게임 G 객체에도 접근하지 않습니다.

MAIN 쪽은 fillText·strokeText·measureText를 함께 감싸고, alert/confirm 문구도 번역합니다. 기존 게임 i18n과 이어서 작동합니다. HUD의 Psychic 기술명은 사이코키네시스로, DOM의 에스퍼 타입 표시는 에스퍼로 분리합니다. Canvas에는 DOM의 사용자명 보호 마커가 없으므로, 닉네임이 사전의 포켓몬 이름과 정확히 같은 경우 화면에서 번역될 수 있습니다. 서버에 저장된 닉네임은 바뀌지 않습니다.

**검증 범위:** 데스크톱 Chromium 페이지 컨텍스트에 같은 코드를 실행해 Mewtwo/뮤츠 및 Psychic/사이코키네시스의 measureText 결과가 일치하는 것과 기본 창 번역 래퍼 설치를 확인했습니다. 실제 확장을 설치한 종단간 시험이나 Safari iPhone 서명 앱 시험을 수행한 것은 아닙니다.

### 데스크톱 Chrome에서 소스로 설치

1. 저장소 ZIP을 받아 압축을 풉니다.
2. Chrome 확장 관리에서 개발자 모드를 켭니다.
3. 압축해제된 확장 프로그램 로드로 manifest.json이 있는 폴더를 고릅니다.
4. 기존 Userscripts 패치는 꺼서 중복 실행을 피하고 게임을 새로고침합니다.

### iPhone 설치

**ZIP이나 manifest 파일을 iPhone에서 여는 것만으로는 설치되지 않습니다.** Xcode의 Safari Web Extension 변환, 앱 서명, 기기 설치 또는 TestFlight/App Store 배포가 필요합니다. 이 저장소에는 서명된 iOS 앱이 없습니다. 필요한 호스트 권한은 pokesurvivor.org와 pokesurvivor.com이며 실제 지원 iOS·Safari 버전과 권한 처리는 기기에서 검증해야 합니다.

다른 해결책은 공식 개발팀이 한국어 사전을 게임에 포함하거나 의도적인 번역 확장 API를 제공하는 것입니다. 현재 저장소는 그 승인을 받았다고 주장하지 않습니다.

## 기타 범위

- .org/play는 .com 게임을 iframe으로 불러옵니다. 두 사이트 권한이 필요합니다.
- .org 공략 기사의 전문 번역은 게임 한글화 범위에 포함하지 않습니다.
- 회원 닉네임·사용자 입력·비밀번호·저장 데이터는 번역 대상이 아닙니다. 한국어 검색은 검색칸만 원래 게임의 영문/번호 필터로 연결합니다.
- 숫자·피해량·아이템 효과·획득 확률은 수정하지 않습니다. 원본 숫자 표기 방식을 유지합니다.
- 공식 업데이트로 추가된 새 문자열이나 다른 화면 구조는 추가 점검이 필요할 수 있습니다. 100% 모든 실행 분기를 시험했다는 의미가 아닙니다.
