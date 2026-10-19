# PWA에서 번역이 안 되는 이유

[처음 화면](../README.md) · [설치 안내](INSTALL.md) · [정확한 번역 범위](COMPATIBILITY.md)

## 아이폰 홈 화면의 독립 PWA

**현재 이 패치의 지원 경로는 ‘Safari 탭 + Userscripts’입니다. 아이폰의 독립 홈 화면 웹앱(PWA)은 지원하지 않습니다.**

아이폰 홈 화면 웹앱은 일반 Safari 탭과 별도 환경에서 열립니다. Safari 확장/Userscripts가 이 환경에서 자동 실행되는 경로가 제공되지 않아, 자동 로더도 시작하지 못합니다. 번역 파일 경로나 캐시만 바꿔서 해결되는 문제가 아닙니다. 별도 Safari WebExtension을 만드는 것 역시 iPhone 독립 PWA에 확장이 실행된다는 보장이 아닙니다.

Apple은 Safari 확장을 iOS Safari와 macOS Safari에서 지원하며 **Mac 웹앱의 확장 지원은 macOS 15 이상**으로 별도 명시합니다. 이를 iPhone 홈 화면 웹앱에도 된다는 의미로 해석하지 않습니다. iPhone PWA는 이번 작업에서 실기기 재현 시험을 하지 않았고, 사용자의 미동작 보고와 문헌을 바탕으로 지원 범위를 정리했습니다.

## 홈 화면 아이콘은 유지하고 Safari로 열기

**iOS 26 이상에서 지원되는 방법:**

1. 기존 PWA는 일단 그대로 둡니다. Safari에서 [pokesurvivor.org/play/](https://pokesurvivor.org/play/)를 직접 엽니다.
2. 공유 → **홈 화면에 추가**를 선택합니다.
3. **‘웹앱으로 열기’(Open as Web App)를 끕니다.**
4. ‘PokéSurvivor 한국어 Safari’처럼 구분되는 이름으로 추가합니다.
5. 새 아이콘을 눌렀을 때 독립 앱 대신 **Safari 탭**으로 열리는지 확인하고 Userscripts 권한·스크립트를 켭니다.

이것은 **PWA 패치가 아니라 Safari로 여는 홈 화면 바로가기**입니다. 해당 토글이 없는 iOS에서는 Safari 즐겨찾기나 일반 Safari 탭으로 접근하세요. 다른 기본 브라우저로 열린다면 Safari에서 직접 게임 URL을 여세요.

## 기존 PWA를 먼저 삭제하지 마세요

독립 웹앱과 Safari는 저장 공간·로그인 상태가 다를 수 있습니다. 게스트 진행·로컬 저장이 Safari에서 자동으로 이어진다고 가정하지 마세요. 기존 PWA의 게임 내 저장·내보내기 기능과 계정 동기화 여부를 먼저 확인하고, 데이터가 안전한지 확인하기 전에는 기존 앱 삭제나 사이트 데이터 지우기를 권하지 않습니다.

## 다른 플랫폼과 혼동하지 않기

- **Mac Safari 웹앱:** macOS 15 이상은 호환 Safari 확장을 웹앱 설정에서 켤 수 있습니다. 이 저장소의 서명된 Safari 앱은 아직 배포하지 않았고 해당 조합의 종단간 시험도 하지 않았습니다.
- **데스크톱 Chrome 설치형 PWA:** 기반 Chrome 프로필의 확장 기능에 따라 다를 수 있습니다. 아이폰의 제한을 모든 PWA의 제한이라고 일반화하지 않습니다. 이 조합도 직접 검증하지 않았습니다.
- **진짜 iPhone 독립 PWA에서 한국어 사용:** 게임 개발팀이 한국어를 원본 게임에 포함하는 방식이 가장 직접적입니다. 이 프로젝트가 원본 사이트를 수정하거나 승인을 받았다고 주장하지 않습니다.

## 확인 자료

- [Apple: Safari web extensions 지원 플랫폼](https://developer.apple.com/documentation/safariservices/safari-web-extensions)
- [Apple: iPhone에서 웹사이트를 앱으로 열기](https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios)
- [WebKit: Safari 26.0, Open as Web App를 끄는 북마크 옵션](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/)
- [Apple Community: iPhone 홈 화면 PWA의 Safari 확장 미동작 보고와 대안](https://discussions.apple.com/thread/256341757) (커뮤니티 답변이며 Apple의 지원 보증은 아닙니다.)
- [Apple: Mac 웹앱과 확장 설정](https://support.apple.com/en-us/104996)

문헌 확인: 2026-10-19. OS 업데이트로 동작이 바뀔 수 있으며, 아이폰 실기기 PWA 및 최신 자동 로더는 아직 직접 검증하지 않았습니다.
