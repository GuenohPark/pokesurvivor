# PokéSurvivor 한국어 패치

[아이폰용 스크립트 설치 / 업데이트](https://raw.githubusercontent.com/GuenohPark/pokesurvivor/main/pokesurvivor-ko-menu.user.js) · [게임 플레이](https://pokesurvivor.org/play/) · [게임 팁](TIPS.md) · [실행 제약](COMPATIBILITY.md)

**v0.4.0: 메뉴 몇 개만 바꾸던 시험판에서 전체 번역 사전 기반으로 확장했습니다.** 포켓몬 이름·능력치·기술과 아이템 설명·도감·미션·설정·새소식 등을 번역합니다. 한글은 갈무리11 도트 폰트, 영문은 원래 게임 폰트를 유지합니다.

> **중요:** 아이폰 App Store **Userscripts에서는 DOM 화면을 번역**합니다. **Canvas로 그리는 HUD·게임 내 글자·브라우저 기본 확인창까지 완전히 적용되는 상태는 아닙니다.** 번역 데이터와 별도 확장 소스는 준비했지만, iPhone Canvas 적용에는 별도 Safari 확장 변환·서명·실기기 검증이 필요합니다. [정확한 범위](COMPATIBILITY.md)를 먼저 확인해 주세요.
>
> Nintendo, GAME FREAK, PokéSurvivor 개발팀과 무관한 비공식 팬 패치입니다. 게임 원본·계정·공격력·랭킹·서버 통신은 바꾸지 않습니다.

## 포함한 번역

- **포켓몬 966종:** 공식 한국어 명칭을 PokéAPI의 한국어 데이터와 대조
- **기본 기술 65개 + 진화 명칭 59개:** 표시 이름 기준으로 대조. 59개 중 1개는 게임이 빌려 쓴 공식 특성명으로 별도 분류
- **아이템 11개**, 타입, 공격·특수공격·방어·특수방어·체력·스피드
- **기술·아이템 설명 76개**와 강화·진화 조건 문구
- 기존 언어팩 **1,223개 항목 전체**, 새소식 111개, 언어팩 밖 안내 76개와 추가 별칭. 통합 사전은 **1,443개 레코드**이며 원문/영문 별칭과 중복 의미 구분을 포함합니다.
- 미션·업적·프로필·친구·협동·랭킹·설정·법적 고지·저장 안내 등 DOM 문구
- **한국어 도감 검색:** ‘뮤츠’처럼 입력하고 자동완성에서 고르면 원래 게임의 검색으로 연결
- 시작 화면의 **그거 아셨나요?** 랜덤 팁 15개

‘Psychic’은 타입 칩에서 **에스퍼**, 기술명에서 **사이코키네시스**로 구분합니다. ‘Normal’도 타입의 **노말**, 모습의 **일반**, 크기 설정의 **보통**을 구분합니다. 이름과 설명만 번역하며 피해량·효과 수치·진화 조건은 수정하지 않습니다.

## 아이폰 설치 / 기존 버전 교체

1. App Store에서 [Userscripts](https://apps.apple.com/us/app/userscripts/id1463298887)를 설치합니다.
2. Userscripts 앱에서 스크립트 저장 폴더를 확인하거나 지정합니다.
3. [pokesurvivor-ko-menu.user.js](https://raw.githubusercontent.com/GuenohPark/pokesurvivor/main/pokesurvivor-ko-menu.user.js)를 Safari로 열어 설치하거나, 파일로 내려받아 지정 폴더에 넣습니다. **같은 이름의 기존 파일은 교체**하고 `.txt`나 `.html`이 붙지 않게 해주세요.
4. iPhone 설정 → 앱 → Safari → 확장 프로그램에서 Userscripts를 켭니다. **pokesurvivor.org와 pokesurvivor.com 둘 다** 접근을 허용합니다. iOS 버전에 따라 설정 경로는 다를 수 있습니다.
5. [pokesurvivor.org/play](https://pokesurvivor.org/play/)에서 Safari의 확장 메뉴 → Userscripts를 **한 번 열고**, ‘PokéSurvivor 한국어 메뉴 시험판’을 켭니다. 파일 이름/표시 이름은 기존 설치의 업데이트 호환을 위해 유지했습니다.
6. 게임 페이지를 새로고침합니다. 도감의 **뮤츠 / 특수공격 / 염동력** 표시를 확인하세요.

폰트가 내장되어 별도 폰트 앱이나 폰트 서버 연결은 필요하지 않습니다. 전체 스크립트 크기는 약 1.2MB입니다.

### 왜 두 도메인 권한이 필요한가요?

`.org/play/`는 바깥 페이지이고, **실제 .com 게임을 iframe으로 불러옵니다.** 따라서 `@match`와 사이트 권한 모두 두 도메인을 포함해야 합니다. Userscripts 목록에서 내부 프레임 표시인 **sub**가 붙을 수 있습니다. 게임을 다른 서버로 복제하거나 중계하지 않습니다. .org는 독립 가이드 사이트이며 게임의 공식 도메인은 .com입니다.

## 온라인 업데이트

`@version`, `@updateURL`, `@downloadURL`로 새 버전을 확인합니다. Userscripts의 업데이트 확인/알림 기능을 사용한 뒤 게임을 새로고침하세요. **게임 도중 즉시 강제로 바뀌는 방식은 아닙니다.** 확인 주기·조작은 앱 버전과 설정에 따라 달라질 수 있고 GitHub CDN 캐시 때문에 반영이 늦을 수 있습니다.

채팅에서 받은 초기 v0.1/v0.2에는 업데이트 주소가 없으므로 GitHub 배포본으로 **최초 한 번 교체**해야 합니다. 업데이트가 안 잡히면 최신 파일로 교체 → Userscripts 팝업 열기 → 게임 새로고침 순으로 수동 갱신할 수 있습니다.

## 한국어 검색

도감 검색칸에 한국어 이름 일부 또는 전체를 입력하고, 표시된 목록에서 포켓몬을 고르세요. 영문 이름과 번호도 원래처럼 사용할 수 있습니다. 원래 게임의 이름/번호 필터에 연결할 뿐 계정·소유 여부·파트너·저장 데이터는 바꾸지 않습니다. 초성 검색은 지원하지 않습니다.

## 문제 해결

- **Demo user script만 보여요:** 패치가 인식되지 않은 것입니다. 파일이 Userscripts 앱의 지정 폴더에 있는지 확인하고 확장 팝업의 새로고침을 누르세요.
- **.org에서 계속 영어예요:** .com 내부 게임의 확장 권한도 허용했는지 확인하세요.
- **부분적으로 옛 문구가 남아요:** 중복 패치를 끄고 전체 페이지를 새로고침하세요. 파일 교체 뒤 확장 팝업을 한 번 열어야 합니다.
- **전투 화면 글자는 영어예요:** 현재 iPhone Userscripts의 Canvas 제약입니다. [COMPATIBILITY.md](COMPATIBILITY.md)를 참고하세요.
- **새 포켓몬/문구가 영어예요:** 공식 업데이트로 항목이 바뀌었을 수 있습니다. 버전과 화면을 이슈로 남겨 주세요. 비밀번호나 계정 인증 정보는 올리지 마세요.
- **팁이 안 보여요:** 브라우저가 소리 재생을 이미 허용하면 게임 자체가 ‘눌러서 시작’ 화면을 건너뛸 수 있습니다.

## 데스크톱 / 별도 Safari 확장 소스

`manifest.json`, `extension-background.js`, `extension-content.js`는 페이지 컨텍스트에서 Canvas·기본 창 문구까지 처리하기 위한 별도 WebExtension 소스입니다. 사이트 CSP를 끄지 않고 native `scripting.executeScript`의 MAIN/func 경로를 사용합니다.

**iPhone에서 ZIP만 열어 설치할 수는 없습니다.** Safari 확장 변환·서명이 필요하며 서명된 앱은 제공하지 않습니다. 데스크톱의 같은 페이지 래퍼 코드는 시험했지만 실제 확장 설치의 종단간 동작과 iPhone 실기기 동작은 아직 미검증입니다. [설치·검증 범위](COMPATIBILITY.md)

## 검증 기록

- `npm test`: 번역 레코드 1,443개, 플레이스홀더 205개, 명칭/문맥 검증 1,297건, 설명 76개, 검색 대상 966종, 실행 파일 문법 검사 통과
- 데스크톱 Chromium의 **.org 내부 .com 프레임**에서 도감 이름·능력치·타입·한국어 검색·시작/팁 동작 확인
- 페이지 컨텍스트 Canvas의 Mewtwo/뮤츠, Psychic/사이코키네시스 측정 너비가 일치하는 것 확인
- 회원 닉네임·비밀번호·입력 내용·숨겨진 저장 상태는 번역 사전에 수집하지 않음
- 실제 iPhone의 v0.4.0 전체 화면 및 모든 실행 분기를 검증했다는 의미는 아님

## 소스 수정 / 빌드

Node.js 18 이상에서 외부 패키지 없이 실행합니다.

```sh
npm run build
npm test
```

- `dictionary.ko.json`: 한국어 UI·설명·안내 사전
- `official-names.ko.json`: 공식 포켓몬·기술·아이템·타입 명칭
- `runtime-core.js`: 문맥·패턴·DOM·Canvas 번역 엔진
- `search-korean.js`, `search-species.json`: 한국어 검색 연결
- `font-install.js`: 내장 갈무리 폰트와 라이선스
- `tips-ui.js`, `tips.json`, `TIPS.md`: 실전 팁과 근거
- `build.cjs`: 버전/사전으로 userscript·메타데이터·확장 소스 생성

사전을 고친 뒤 `package.json`의 버전을 올리고 빌드·검사를 실행하세요. UI에 새 문자열이 추가되면 영어 언어팩과 실제 화면의 누락 여부를 다시 확인해야 합니다.

## 라이선스 / 출처

[THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)를 참고하세요.

- 직접 작성한 런타임·검색·빌드 코드: MIT. **원본 게임 파생 번역 데이터까지 MIT로 재허가한다는 뜻은 아닙니다.**
- 게임 문구·설명에서 파생된 번역 데이터: 원본의 **PolyForm Noncommercial 1.0.0** 조건을 따르는 비상업적 팬 번역으로 취급
- 공식 명칭 데이터: PokéAPI 한국어 행을 대조했으며 BSD-3-Clause 고지 보존. PokéAPI는 공식 명칭을 수록한 커뮤니티 데이터이지 Nintendo의 공식 배포 API는 아닙니다.
- 갈무리11: Lee Minseo, SIL OFL 1.1
- 원본 게임·스프라이트·계정 기록은 이 저장소에 포함하지 않습니다. Pokémon 관련 권리는 각 권리자에게 있습니다.
