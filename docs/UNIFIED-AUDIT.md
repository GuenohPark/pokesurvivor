# 통합 배포판 감사

## 범위와 구조

공통 Tampermonkey userscript는 PC Chrome/Edge/Firefox, Android Firefox, iPhone Safari를 대상으로 합니다. document-start 부트스트랩이 한 번 초기화하며 공통 DOM 마커와 기능 등록부를 사용합니다. URL 1초 polling, popstate/hashchange/pageshow, body/root observer로 화면 변경을 감지하고 history API는 monkeypatch하지 않습니다. 기존 번역/핵심, 글꼴, 검색, 팁, 포켓몬 티어, 기술 티어 기능을 재사용합니다.

메타데이터는 package 기반 버전(0.5.0), `@grant none`, `@sandbox raw`, `@run-at document-start`, 최상위 프레임 전용, 공식 .com 호스트만을 사용합니다. 산출물은 자체 완결형이며 원격 실행 JS, GM 의존성, 자체 업데이트 로직이 없습니다. Raw 업데이트 링크는 관리자 확인/설정을 위한 것이며 즉시 교체하지 않습니다. iOS 백그라운드 정지나 권한에 따라 확인이 늦을 수 있으므로 실행 중인 판에서 교체하지 않습니다.

## 저장소·기능 검토 범위

검토 대상 경로: `src/`, `data/`, `assets/`, `scripts/`, `dist/`, `extension/`, `chrome-extension/`, `android/`, `tests/`, `site/`, `.github/`, package 메타데이터, 라이선스, 레거시 루트 userscripts. 빌드 manifest는 입력/번들의 바이트 동일성을 기록합니다. 이는 재현 가능한 식별성이지 보안 인증은 아닙니다. 포켓몬 14종 평가는 잠정이며, 기술 103개 항목은 적합도/추천 정보이지 승률 데이터가 아닙니다. 터치 기기의 한글 전용 글꼴 크기는 90%로 유지합니다.

## 호환성·안전 경계

- 공식 .com 최상위 페이지 전용이며 .org, 인증 페이지, iframe은 제외합니다.
- 통합판 사용 전 기존 패치 스크립트와 사용자 Chrome 확장을 끕니다. 레거시 자동 로더 1.2는 DOM 전용입니다. Chrome/browser 수동판 0.1.8, Store 0.1.3, APK 앱 버전은 별도 대안으로 유지합니다. 저장/계정 또는 APK를 삭제하지 않습니다.
- Canvas/dialog 래핑은 활성 게임 경로에서만 실행하며 원래 호출과 반환을 보존합니다. 페이지 컨텍스트 실행만으로 게임 Canvas 접근을 입증하지 않습니다.
- 게임 데이터·서버 요청·계정 저장·랭킹·세이브를 변경하지 않습니다. iOS 15 호환성을 위해 RegExp lookbehind를 피합니다.

## 검증 상태

자동 테스트는 실기기 검증과 다릅니다. 데스크톱 Chrome MV3 MAIN-world 확인은 코드 수준이며 설치 확장 종단간 시험이 아닙니다. 직접 Aside Chrome에서 하는 smoke test도 Tampermonkey 관리자 검증을 대신하지 않습니다. 물리 iOS/Android, Windows/macOS 및 기타 브라우저의 실제 Tampermonkey, 로그인과 cloud-save 흐름은 별도 기록이 없으면 미검증입니다. iOS에서 관리자 설치 여부를 신뢰성 있게 감지할 수 없으므로 사이트 안내는 사용자 에이전트 기반 권고에 그칩니다. 로컬 CI 입력 SHA 재현성과 시작 테스트는 통과했지만 실제 CI·Pages 배포 및 브라우저 검증은 미확인입니다.

참고: [Tampermonkey Safari 안내](https://www.tampermonkey.net/index.php?browser=safari&locale=en, iOS 15+), [App Store](https://apps.apple.com/app/tampermonkey/id6738342400), [sandbox 문서](https://www.tampermonkey.net/documentation.php?locale=en&q=sandbox). CSP에 따라 Raw sandbox가 otherrealm으로 fallback될 수 있으며 이것이 Canvas 접근 증거는 아닙니다.
