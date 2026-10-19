# PokéSurvivor 한국어 패치

## [아이폰 자동 업데이트 설치 파일 받기](https://raw.githubusercontent.com/GuenohPark/pokesurvivor/main/dist/pokesurvivor-ko-auto.user.js)

[설치 방법](docs/INSTALL.md) · [PWA에서 안 되는 이유와 대안](docs/PWA.md) · [게임 플레이](https://pokesurvivor.org/play/) · [게임 팁](docs/TIPS.md)

**아이폰은 Safari 탭 + Userscripts로 사용하세요. 홈 화면의 독립 PWA는 지원하지 않습니다.**
Userscripts 배포판은 메뉴·이름·설명 등 DOM 화면을 번역합니다. 진행 화면의 **Swarm(기술/대량 발생), 실시간 격파 수, 포켓몬 이름은 Canvas로 그려져 현재 Userscripts에서는 번역되지 않습니다.** [정확한 지원 범위](docs/COMPATIBILITY.md)

비공식 팬 패치입니다. Nintendo, GAME FREAK, PokéSurvivor 개발팀과 무관하며 게임 수치·계정 저장·랭킹·서버 요청을 바꾸지 않습니다.

## 다운로드

- **권장: [자동 업데이트 로더](https://raw.githubusercontent.com/GuenohPark/pokesurvivor/main/dist/pokesurvivor-ko-auto.user.js)**. 이 파일 하나만 설치합니다. 접속할 때 새 번역팩을 받아 캐시합니다.
- [수동 설치용 전체 번역팩](https://raw.githubusercontent.com/GuenohPark/pokesurvivor/main/dist/pokesurvivor-ko-menu.user.js). 자동 로더와 동시에 켜지 마세요.
- [데스크톱 확장 실험판 ZIP](https://raw.githubusercontent.com/GuenohPark/pokesurvivor/main/dist/pokesurvivor-ko-desktop-extension.zip). iPhone 설치 파일이 아닙니다. 압축을 풀고 Chrome의 개발자 모드에서 로드합니다. [제약](docs/COMPATIBILITY.md)
- [설치 파일 폴더 전체 보기](dist/). 개발 소스는 설치할 필요가 없습니다.

Safari에서 코드만 보이면 링크를 길게 눌러 **링크된 파일 다운로드**를 선택하고 Userscripts의 지정 폴더에 저장하세요. 확장자는 .user.js 그대로 유지합니다.

## 아이폰 빠른 설치

1. App Store의 [Userscripts](https://apps.apple.com/app/userscripts/id1463298887)를 설치하고 앱에서 스크립트 저장 폴더를 확인합니다.
2. 위 **자동 업데이트 로더 한 개**를 그 폴더에 넣습니다. 이전 메뉴 패치나 전체 번역팩은 끕니다.
3. iPhone의 Safari 확장 설정에서 Userscripts를 켜고 **pokesurvivor.org와 pokesurvivor.com 모두** 접근을 허용합니다.
4. [게임](https://pokesurvivor.org/play/)을 **일반 Safari 탭**으로 열어 확장 메뉴의 Userscripts를 한 번 확인하고 새로고침합니다.

.org/play/ 안에서 실제 .com 게임을 iframe으로 띄우기 때문에 두 사이트 권한이 필요합니다. [상세 설치·업데이트·문제 해결](docs/INSTALL.md)

**홈 화면 아이콘으로 열고 싶다면:** iOS 26 이상에서 ‘홈 화면에 추가’할 때 **‘웹앱으로 열기’를 끄고** Safari 바로가기로 추가하세요. 독립 PWA에 Userscripts를 적용하는 방식은 아닙니다. 기존 PWA는 저장 데이터가 다를 수 있으니 삭제하지 말고 먼저 보관하세요. [PWA 안내](docs/PWA.md)

## 번역 내용

- 포켓몬 966종의 한국어 명칭, 기술·진화·아이템 이름과 설명 76개
- 통합 사전 1,443개 레코드: 메뉴·미션·업적·도감·설정·새소식 등
- 한글 갈무리11 도트 폰트, 한국어 도감 검색, 생존 팁 15개
- ‘Psychic’의 타입 **에스퍼**와 기술 **사이코키네시스** 등 문맥 구분

번역팩 **0.4.3** · 자동 로더 **0.1.1**. 이번 버전은 터치 기기에서 한글 글리프를 10% 줄입니다. 영문·숫자와 데스크톱 크기는 유지합니다. Canvas 진행 화면 번역을 해결한 버전은 아닙니다. 물리적 iPhone에서 새 로더·전체 흐름을 직접 검증한 상태는 아닙니다.

## 저장소 구조

```text
dist/       내려받아 설치하는 완성 파일
extension/  별도 브라우저 확장 소스와 필요한 리소스
src/        번역·검색·자동 업데이트 실행 코드
data/       번역 사전·공식 명칭·팁 데이터
assets/     폰트 내장 소스
scripts/    빌드 스크립트
tests/      자동 테스트·입력 자료·검증 결과
docs/       설치·PWA·지원 범위·팁·변경 기록
licenses/   게임·폰트·명칭 데이터의 개별 라이선스
```

루트의 .user.js / .meta.js 4개는 **기존 설치자의 업데이트 주소 호환용 복사본**입니다. 새 설치는 위 dist 링크를 사용하세요. 빌드할 때 dist와 호환 복사본을 함께 생성합니다.

개발·재생성:

```sh
npm run build
npm test
```

새 코드는 dist를 기준으로 배포합니다. [변경 기록](docs/CHANGELOG.md) · [출처·라이선스](docs/THIRD-PARTY-NOTICES.md) · [MIT 적용 범위](LICENSE)
