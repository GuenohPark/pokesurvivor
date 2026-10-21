# 통합 배포판 감사

## 현재 기기별 기본 안내

사용자 요청에 따라 아이폰은 **Safari + 무료 Userscripts + 자동 로더 0.1.2**를 기본 권장합니다. PC·Android는 Tampermonkey 통합판을 유지합니다. 설치 페이지는 아이폰 선택 시 앱 안내와 주 설치 링크를 Userscripts용으로 전환하며, JavaScript가 꺼져 있어도 아이폰 전용 다운로드 링크를 제공합니다. Userscripts는 DOM 전용이며 전투 Canvas·독립 PWA·실기기 전체 흐름 제한은 그대로입니다. 아래 공통 Tampermonkey 구현 기록이 아이폰 유료 앱 설치 권장을 뜻하지 않습니다.

## 범위와 구조

공통 Tampermonkey userscript는 PC Chrome/Edge/Firefox, Android Firefox, iPhone Safari를 대상으로 합니다. document-start 부트스트랩이 한 번 초기화하며 공통 DOM 마커와 기능 등록부를 사용합니다. URL 1초 polling, popstate/hashchange/pageshow, body/root observer로 화면 변경을 감지하고 history API는 monkeypatch하지 않습니다. 기존 번역/핵심, 글꼴, 검색, 팁, 포켓몬 티어, 기술 티어 기능을 재사용합니다.

메타데이터는 package 기반 버전(0.5.0), `@grant none`, `@sandbox raw`, `@run-at document-start`, 최상위 프레임 전용, 공식 .com 호스트만을 사용합니다. 산출물은 자체 완결형이며 원격 실행 JS, GM 의존성, 자체 업데이트 로직이 없습니다. Raw 업데이트 링크는 관리자 확인/설정을 위한 것이며 즉시 교체하지 않습니다. iOS 백그라운드 정지나 권한에 따라 확인이 늦을 수 있으므로 실행 중인 판에서 교체하지 않습니다.

## 저장소·기능 검토 범위

검토 대상 경로: `src/`, `data/`, `assets/`, `scripts/`, `dist/`, `extension/`, `chrome-extension/`, `android/`, `tests/`, `site/`, `.github/`, package 메타데이터, 라이선스, 레거시 루트 userscripts. 빌드 manifest는 입력/번들의 바이트 동일성을 기록합니다. 이는 재현 가능한 식별성이지 보안 인증은 아닙니다. 포켓몬 14종 평가는 잠정이며, 기술 103개 항목은 적합도/추천 정보이지 승률 데이터가 아닙니다. 터치 기기의 한글 전용 글꼴 크기는 90%로 유지합니다.

## 호환성·안전 경계

- 공식 .com 최상위 페이지 전용이며 .org, 인증 페이지, iframe은 제외합니다.
- 통합판 사용 전 기존 패치 스크립트와 사용자 Chrome 확장을 끕니다. 아이폰 기본 권장 자동 로더 0.1.2는 DOM 전용입니다. Chrome/browser 수동판 0.1.8, Store 0.1.3, APK 앱 버전은 별도 대안으로 유지합니다. 저장/계정 또는 APK를 삭제하지 않습니다.
- Canvas/dialog 래핑은 활성 게임 경로에서만 실행하며 원래 호출과 반환을 보존합니다. 페이지 컨텍스트 실행만으로 게임 Canvas 접근을 입증하지 않습니다.
- 게임 데이터·서버 요청·계정 저장·랭킹·세이브를 변경하지 않습니다. iOS 15 호환성을 위해 RegExp lookbehind를 피합니다.

## 검증 상태

자동 테스트는 실기기 검증과 다릅니다. 데스크톱 Chrome MV3 MAIN-world 확인은 코드 수준이며 설치 확장 종단간 시험이 아닙니다. 직접 Aside Chrome에서 하는 smoke test도 Tampermonkey 관리자 검증을 대신하지 않습니다. 물리 iOS/Android, Windows/macOS 및 기타 브라우저의 실제 Tampermonkey, 로그인과 cloud-save 흐름은 별도 기록이 없으면 미검증입니다. iOS에서 관리자 설치 여부를 신뢰성 있게 감지할 수 없으므로 사이트 안내는 사용자 에이전트 기반 권고에 그칩니다. 로컬 자동 검사와 직접 Chromium smoke test는 통과했습니다. 실제 GitHub CI와 Pages 배포도 아래 실행 기록으로 확인했습니다. 이는 Tampermonkey 설치나 실기기 성공을 뜻하지 않습니다.

참고: [Tampermonkey Safari 안내](https://www.tampermonkey.net/index.php?browser=safari&locale=en) (공식 안내: iOS 15+), [App Store](https://apps.apple.com/app/tampermonkey/id6738342400), [sandbox 문서](https://www.tampermonkey.net/documentation.php?locale=en&q=sandbox). CSP에 따라 Raw sandbox가 otherrealm으로 fallback될 수 있으며 이것이 Canvas 접근 증거는 아닙니다.


## 공개 서버 검증 기록 · 2026-10-21

- [Build and publish #2](https://github.com/GuenohPark/pokesurvivor/actions/runs/39538378899): 성공, 전체 npm 검사와 Chrome 검사 실행.
- [Pages #2](https://github.com/GuenohPark/pokesurvivor/actions/runs/39538419534): 성공, [설치 페이지](https://guenohpark.github.io/pokesurvivor/) 공개.
- 자동 생성 커밋: `efac6313919bea275730b1c8630e508dde1a901f`. 통합 버전 0.5.0 / 별도 Chrome·브라우저 수동판 0.1.8.
- 공개 Userscript SHA-256: `baf488a1a28420a1c07521700f94566aebe720bf16643afce1c6df1914e066d7`. 메타데이터 및 Chrome 0.1.8 ZIP의 공개 체크섬도 대조했습니다.
- 기준 커밋 `37beb558ea8b429f7068c9c3d4ab37b33dc515c8`의 Android 경로, 라이선스, 버전별 APK/ZIP/체크섬 54개 공개 파일의 blob 지문이 모두 유지됐습니다. 개인 서명키를 읽거나 교체하지 않았습니다.
- 최초 CI는 `.nojekyll`의 0바이트 강제 검사에서 실패했습니다. 파일 존재 검사로 정정하고 설치 페이지 버전 검사는 package 기반으로 바꾼 뒤 통과했습니다.
- 지문 대조에서 생성된 `tests/fixtures/tier-player-reference.json`이 게시 허용 목록에서 빠진 것을 찾아 추가했습니다. 임의 tests/소스 경로는 여전히 자동 stage하지 않습니다.
- 동일 공개 입력으로 Userscript/메타데이터를 재생성하면 공개 바이트와 일치합니다. 별도 ARM/Node 환경의 능력치 자료 재생성은 일부 EHP 값에 1e-12 미만의 부동소수점 꼬리 차이가 있을 수 있습니다. 평가 등급은 바뀌지 않으며, 게시 지문은 CI 생성본을 기준으로 검증합니다.
- 통합 런타임 10그룹, 설치 페이지 14그룹, Chrome 58검사 및 기존 회귀 검사 통과. 직접 게임 DOM smoke와 설치 페이지 360/768/1440px 폭 점검은 관리자 설치 E2E·물리적 실기기 검증을 대체하지 않습니다.
