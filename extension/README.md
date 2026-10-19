# 데스크톱 브라우저 확장 실험판

이 폴더는 필요한 스크립트·전체 번역팩·라이선스를 포함합니다. 폴더 밖의 실행 파일은 필요하지 않습니다.

## Chrome에서 소스로 로드

1. ZIP을 풀고 이 README와 manifest.json이 있는 폴더를 확인합니다.
2. Chrome 확장 관리에서 개발자 모드를 켭니다.
3. ‘압축해제된 확장 프로그램 로드’에서 이 폴더를 선택합니다.
4. 기존 Userscripts 패치는 끄고 게임을 새로고침합니다.

권한은 pokesurvivor.org와 pokesurvivor.com의 화면 패치를 위한 것입니다. .org/play/가 .com iframe을 포함하므로 두 사이트가 필요합니다.

DOM 번역과 별도로 MAIN world에서 Canvas·기본 확인창 번역을 시도합니다. 데스크톱 Chromium에서 동등한 코드의 일부 동작만 확인했으며, 실제 확장을 설치한 종단간 시험은 아직 수행하지 않았습니다. Canvas 닉네임이 사전의 포켓몬 이름과 정확히 같으면 화면에서 번역될 수 있으나 서버 값은 수정하지 않습니다.

**iPhone:** 이 ZIP이나 manifest 파일을 여는 것으로 설치되지 않습니다. Safari 확장 앱 패키징·서명·기기 설치가 필요하며, 서명된 iOS 앱은 포함하지 않습니다. 별도 확장도 독립 iPhone PWA 지원을 보장하지 않습니다.

[최신 설치 안내](https://github.com/GuenohPark/pokesurvivor/blob/main/docs/INSTALL.md) · [지원 범위](https://github.com/GuenohPark/pokesurvivor/blob/main/docs/COMPATIBILITY.md) · [PWA](https://github.com/GuenohPark/pokesurvivor/blob/main/docs/PWA.md)

[MIT 적용 범위](LICENSE) · [출처·개별 조건](THIRD-PARTY-NOTICES.md) · [개별 라이선스](licenses/)
