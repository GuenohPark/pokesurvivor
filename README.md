# PokéSurvivor 한국어 패치

## 기기별 권장 설치 · 공통 번역팩 0.5.0

**[공개 설치 페이지](https://guenohpark.github.io/pokesurvivor/)** · **[아이폰 Userscripts 자동 로더](https://raw.githubusercontent.com/GuenohPark/pokesurvivor/main/dist/pokesurvivor-ko-auto.user.js)** · **[PC·Android 통합 설치 파일](https://raw.githubusercontent.com/GuenohPark/pokesurvivor/main/dist/pokesurvivor.user.js)** · [설치 안내](docs/INSTALL.md) · [호환성·검증 범위](docs/COMPATIBILITY.md) · [통합 감사](docs/UNIFIED-AUDIT.md)

**iPhone/iPad 기본 권장은 Safari + 무료 [Userscripts](https://apps.apple.com/app/userscripts/id1463298887) + 자동 로더 0.1.2입니다. 유료 iPhone Tampermonkey는 필요하지 않습니다.** PC Chrome/Edge/Firefox와 Android Firefox는 Tampermonkey 통합판을 사용합니다. 아이폰 Userscripts 경로는 DOM 번역용이며 전투 Canvas HUD는 번역되지 않습니다. 기존 번역·검색·폰트·팁·포켓몬/기술 추천 기능을 재사용합니다. 공식 .com 최상위 페이지 전용이며 .org, 로그인/인증 페이지, iframe은 지원하지 않습니다. 설치 전 기존 패치 스크립트와 사용자 Chrome 확장을 끄세요. Chrome 확장·스토어판·Android APK는 별도 대안으로 보존됩니다. 기존 저장/계정 또는 APK를 삭제하지 마세요. iOS의 업데이트 확인은 지연될 수 있고 현재 판에 즉시 적용되지 않습니다. 실제 물리 iPhone/Android 및 Tampermonkey 실기기 전체 흐름은 아직 검증되지 않았습니다.

## 포켓몬별 기술 추천 배지 · 공통 런타임 0.5.0

**[기술 배지·적합도 기준](docs/MOVE-BADGES.md)** · **[최신 기술 번역 감사](docs/TRANSLATION-AUDIT.md)** · **[도감 표시·평가 기준](docs/TIERS.md)** · **[966종 풀강화 계산표](dist/pokesurvivor-full-upgrade-stats.csv)**

메인 파트너·도감 등 글자로 보이는 포켓몬 이름 옆에 **S / A+ / 화력 / 미평가**를 작게 표시합니다. 별도 티어 메뉴·안내 영역·추가 상세 수치 패널은 없습니다. 피격 크기를 반영해 S 후보를 **뮤츠·게을킹·전수목**으로 재선별했습니다. [재평가 기준과 한계](docs/TIER-REEVALUATION.md). 14종만 잠정 평가했으며 미평가 포켓몬도 `미평가`라고 명시하고, 미보유 도감의 `???`는 그대로 숨깁니다. 등급은 풀강화 기준의 비공식 잠정 분석이며, 계정 강화나 실제 게임 수치는 변경하지 않습니다.

기술 이름 옆에 `다A·보S · 특수적합`처럼 다수전/보스전 잠정 추천과 해당 포켓몬의 물리·특수 적합도를 작게 표시합니다. 단일 타입의 동일 타입 직접 공격 +20%는 설명에 구분합니다. 메뉴의 기본 기술만 대상이며 런중 진화·전투 Canvas 표시는 제외합니다. 아이폰 Userscripts의 이전 자동 로더 0.1.1은 0.1.2로 교체하세요. 새 통합판과는 동시에 켜지 마세요. [범위·검증·아르세우스 FAQ](docs/MOVE-BADGES.md).

## 기존 배포 경로 · 통합판과 동시 사용 금지

아래 Chrome 확장·APK는 별도 대안입니다. 아이폰은 Safari + 무료 Userscripts가 기본 권장 경로이며, 기기별 설치는 맨 위 공개 설치 페이지를 따르세요.

## Chrome 확장 · Windows / Mac

**[Chrome 확장 ZIP 다운로드](https://raw.githubusercontent.com/GuenohPark/pokesurvivor/main/dist/pokesurvivor-ko-chrome-extension-0.1.8-test.zip)** · **[Windows/Mac 설치 안내](docs/CHROME-EXTENSION.md)** · [확장 소스](chrome-extension/)

- Windows 10/11 및 macOS의 Chrome 111 이상용 **Manifest V3** 확장입니다. ZIP을 풀고 `chrome://extensions` → 개발자 모드 → 압축해제된 확장 프로그램 로드에서 `manifest.json`이 있는 폴더를 선택하세요.
- 설치 후 **[공식 게임 .com 직접 열기](https://pokesurvivor.com/)** 또는 기존 게임 새로고침. `.org/play/`의 iframe이나 Google/Firebase 인증 페이지에는 적용하지 않습니다. 진행 중인 판에서 새로고침하지 마세요.
- GitHub 수동 설치판 0.1.8 / 공통 DOM·메뉴 런타임 0.5.0. DOM·Canvas 번역과 한국어 글꼴을 포함하며, 기존 Userscript와 중복 사용하지 마세요.
- 이전 0.1.0은 사용자가 직접 확인했다고 보고했습니다. **새 0.1.8의 이름 배지·수치 검사는 별도 기록**하며 Windows 실기기와 Google 로그인 성공을 보장하지 않습니다.
- **스토어 제출본은 0.1.3 / 패치 0.4.6입니다.** 공통 패치 0.5.0·GitHub 수동 설치판 0.1.8와 구분하세요. 기존 스토어 제출·게시 설정은 이번 작업에서 변경하지 않았습니다. 현재 심사 결과는 별도 확인 대상입니다. [스토어 자동 업데이트 안내](docs/CHROME-WEB-STORE.md). 기존 압축해제 설치판은 자동 업데이트되지 않으며, 게시된 스토어판으로 한 번 전환해야 합니다. 브라우저/계정/키보드를 별도로 재구현하지 않으며 인증 정보·쿠키·토큰을 복사하지 않습니다.

## [아이폰 권장 · 무료 Userscripts 자동 로더](https://raw.githubusercontent.com/GuenohPark/pokesurvivor/main/dist/pokesurvivor-ko-auto.user.js)

[아이폰 설치](docs/INSTALL.md) · [Android Firefox + Google 로그인 시험 경로](docs/FIREFOX-ANDROID.md) · [Android 테스트 APK](docs/ANDROID.md) · [PWA에서 안 되는 이유와 대안](docs/PWA.md) · [게임 플레이](https://pokesurvivor.com/) · [게임 팁](docs/TIPS.md)

**아이폰 새 설치는 Safari + 무료 Userscripts + 자동 로더를 권장합니다. Tampermonkey 통합판과 동시에 켜지 마세요. 홈 화면의 독립 PWA는 지원하지 않습니다.**
아이폰 Safari의 Userscripts용 배포판은 메뉴·이름·설명 등 DOM 화면을 번역합니다. 진행 화면의 **Swarm(기술/대량 발생), 실시간 격파 수, 포켓몬 이름은 Canvas로 그려져 현재 Userscripts에서는 번역되지 않습니다.** [정확한 지원 범위](docs/COMPATIBILITY.md)

비공식 팬 패치입니다. Nintendo, GAME FREAK, PokéSurvivor 개발팀과 무관하며 게임 수치·계정 저장·랭킹·서버 요청을 바꾸지 않습니다.

## 아이폰 Userscripts·별도 확장 다운로드

- **아이폰 Safari 권장: [자동 업데이트 로더](https://raw.githubusercontent.com/GuenohPark/pokesurvivor/main/dist/pokesurvivor-ko-auto.user.js)**. 이 파일 하나만 설치합니다. 접속할 때 새 번역팩을 받아 캐시합니다.
- [수동 설치용 전체 번역팩](https://raw.githubusercontent.com/GuenohPark/pokesurvivor/main/dist/pokesurvivor-ko-menu.user.js). 자동 로더와 동시에 켜지 마세요.
- [이전 데스크톱 확장 실험판 ZIP (보존용)](https://raw.githubusercontent.com/GuenohPark/pokesurvivor/main/dist/pokesurvivor-ko-desktop-extension.zip). iPhone 설치 파일이 아닙니다. 압축을 풀고 Chrome의 개발자 모드에서 로드합니다. [제약](docs/COMPATIBILITY.md)
- [설치 파일 폴더 전체 보기](dist/). 개발 소스는 설치할 필요가 없습니다.

Safari에서 코드만 보이면 링크를 길게 눌러 **링크된 파일 다운로드**를 선택하고 Userscripts의 지정 폴더에 저장하세요. 확장자는 .user.js 그대로 유지합니다.

## Android: Google 계정으로 사용하고 싶다면

**[Firefox + Tampermonkey 시험 설치 안내](docs/FIREFOX-ANDROID.md)** · **[브라우저용 패치 파일](https://raw.githubusercontent.com/GuenohPark/pokesurvivor/main/dist/pokesurvivor-ko-browser.user.js)**

실제 Firefox에서 Google 로그인과 플레이를 진행하고 확장으로 번역하는 대안입니다. Mozilla는 Firefox Android의 홈 화면 웹앱에서도 확장 사용을 안내합니다. **이 조합은 실기기 미검증이며, 기존 APK의 Google 로그인을 고친 버전은 아닙니다.** 브라우저 파일 0.1.8 / 공통 DOM·메뉴 런타임 0.5.0. 기존 패치와 중복 사용하지 마세요.

## Android 단독 APK 테스트 앱

**[APK 받기](https://raw.githubusercontent.com/GuenohPark/pokesurvivor/main/dist/pokesurvivor-ko-android-test.apk)** · [설치·자동 업데이트·제약](docs/ANDROID.md) · [소스](android/)

앱 **0.1.1-test** / 내장 번역팩 **0.4.3**. 공식 게임을 직접 여는 주소창 없는 비공식 WebView 앱입니다. DOM/Canvas 번역 코드를 포함하며 번역팩은 GitHub 버전을 자동 확인합니다. APK 자체는 업데이트 확인 후 사용자가 설치합니다. **Android 실기기 플레이·로그인·기록 연동은 미검증이며 Google 팝업 로그인은 미지원입니다.**

## 아이폰 무료 Userscripts 빠른 설치

1. App Store의 [Userscripts](https://apps.apple.com/app/userscripts/id1463298887)를 설치하고 앱에서 스크립트 저장 폴더를 확인합니다.
2. 위 **자동 업데이트 로더 한 개**를 그 폴더에 넣습니다. 이전 메뉴 패치나 전체 번역팩은 끕니다.
3. iPhone의 Safari 확장 설정에서 Userscripts를 켜고 **pokesurvivor.com만** 접근을 허용합니다.
4. [게임](https://pokesurvivor.com/)을 **일반 Safari 탭**으로 열어 확장 메뉴의 Userscripts를 한 번 확인하고 새로고침합니다.

.org 및 `www.pokesurvivor.org`는 제외됩니다. .com을 일반 Safari 탭에서 직접 여세요. 기존 로더 0.1.1의 .org 권한은 끄고 새 0.1.2만 켜세요. [상세 설치·업데이트·문제 해결](docs/INSTALL.md)

**홈 화면 아이콘으로 열고 싶다면:** iOS 26 이상에서 ‘홈 화면에 추가’할 때 **‘웹앱으로 열기’를 끄고** Safari 바로가기로 추가하세요. 독립 PWA에 Userscripts를 적용하는 방식은 아닙니다. 기존 PWA는 저장 데이터가 다를 수 있으니 삭제하지 말고 먼저 보관하세요. [PWA 안내](docs/PWA.md)

## 번역 내용

- 포켓몬 966종의 한국어 명칭, 기술·진화·아이템 이름과 설명 114개
- 통합 사전 1,518개 레코드: 메뉴·미션·업적·도감·설정·새소식 등
- 한글 갈무리11 도트 폰트, 한국어 도감 검색, 생존 팁 15개
- ‘Psychic’의 타입 **에스퍼**와 기술 **사이코키네시스** 등 문맥 구분

공통 DOM·메뉴 런타임 **0.5.0** · 아이폰 Userscripts 자동 로더 **0.1.2**. 이번 버전은 공통 번들·중복 실행 방지·매니저 자동 업데이트 메타데이터·설치 페이지·CI 배포를 추가합니다. 기존 포켓몬 재평가·번역·기술 추천·종별 적합도 배지를 유지하며, 0.4.3의 터치 기기 한글 글리프 10% 축소를 유지합니다. 영문·숫자와 데스크톱 크기는 유지합니다. 아이폰 Safari Userscripts의 Canvas 진행 화면 번역을 해결한 버전은 아닙니다. 물리적 iPhone에서 새 로더·전체 흐름을 직접 검증한 상태는 아닙니다.

## 저장소 구조

```text
dist/       내려받아 설치하는 완성 파일
chrome-extension/  Chrome·Windows/Mac용 MV3 확장 소스
android/    Android 테스트 앱 소스·빌드·검증 기록
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
npm run test:chrome
npm run build:chrome
```

새 코드는 dist를 기준으로 배포합니다. [변경 기록](docs/CHANGELOG.md) · [출처·라이선스](docs/THIRD-PARTY-NOTICES.md) · [MIT 적용 범위](LICENSE)
