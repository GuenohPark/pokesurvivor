# 통합 userscript 유지보수

## 소스 관리

공통 Tampermonkey 배포판은 `src/bootstrap.js`, 공용 번역·핵심·글꼴·검색·팁·티어 기능, `scripts/bundle-common.cjs`에서 빌드합니다. 수정은 소스와 데이터를 대상으로 하고 `dist/`의 생성 파일은 직접 편집하지 않습니다. 출력물은 `dist/pokesurvivor.user.js`, `dist/pokesurvivor.meta.js`이며 버전은 `package.json`을 따릅니다. `dist/pokesurvivor-build.json`은 입력과 번들의 바이트 해시를 기록합니다. 팁 기능은 `data/tips.json`과 날짜 placeholder를 사용합니다.

Node 22에서 `npm run build`, `npm test`를 실행합니다. 별도 프레임워크나 설치 시점 의존성은 없습니다. `.github/workflows/build.yml`은 소스 변경 시 빌드·테스트 및 생성 산출물 준비를 수행하고, `.github/workflows/pages.yml`은 신뢰된 main 브랜치 배포를 정의합니다. 워크플로 파일만으로 CI·브랜치 보호·Pages가 실제 활성화됐다고 단정하지 않습니다. 로컬 소스 SHA 재현성과 시작 테스트는 통과했으나 실제 CI/Pages/브라우저 검증은 아직 확인되지 않았습니다.

## 실행·배포 제약

대상은 PC Chrome/Edge/Firefox, Android Firefox, iPhone Safari의 Tampermonkey입니다. 자체 완결형이며 원격 실행 JS, GM API, 자체 업데이트 기능이 없습니다. Raw 업데이트/다운로드 메타데이터는 관리자의 업데이트 확인 및 설정용이지 즉시 교체가 아닙니다. iOS 백그라운드 정지와 권한에 따라 확인이 지연될 수 있습니다. 판 도중 코드를 교체하지 않습니다. URL 변경은 1초 polling, popstate/hashchange/pageshow, body/root observer로 감지하며 history API는 monkeypatch하지 않습니다.

공식 `pokesurvivor.com` 및 `www.pokesurvivor.com` 최상위 페이지만 대상이며 .org, 인증 페이지, iframe은 포함하지 않습니다. Canvas/dialog 훅은 활성 게임 경로에서만 실행하고 원래 호출·반환을 보존합니다. 그렇다고 모든 브라우저/관리자에서 실제 게임 Canvas에 도달함을 입증하는 것은 아닙니다. iOS 15 호환성을 위해 RegExp lookbehind를 사용하지 않습니다.

기존 대안은 별개로 유지합니다. 레거시 자동 로더 1.2는 DOM 전용이며, Chrome/browser 수동판 0.1.8, Store 0.1.3, Android APK 앱 버전은 변경하지 않습니다. 통합판을 켜기 전 기존 패치 스크립트와 사용자 Chrome 확장을 끕니다. 마이그레이션을 위해 저장·계정 또는 APK를 삭제하지 않습니다. 실제 iOS/Android 기기 및 데스크톱 Tampermonkey 조합 검증 전에는 지원 완료라고 표현하지 않습니다.

## 플랫폼별 업데이트 확인

PC는 Tampermonkey의 자동 확인/자동 설치 설정과 브라우저 실행 상태를 따릅니다. Android는 절전·백그라운드 중단, iPhone은 iOS 확장/앱 실행 제약으로 지연될 수 있습니다. GitHub Raw/CDN 캐시, 관리자 승인이나 로컬 수정본도 영향을 줍니다. 고정된 몇 분/몇 시간 내 적용을 보장하지 않습니다. 필요하면 관리자에서 업데이트 확인 후 현재 판을 마치고 다시 로드하세요. 통합판 자체는 다운로드/동적 JS 실행/플레이 중 강제 교체를 하지 않습니다.

설치 페이지 버전은 `site/index.template.html`을 원본으로 `scripts/build-site.cjs`가 생성합니다. `site/index.html`만 직접 수정하지 마세요. 팁 내용·확인일은 `data/tips.json`이 단일 원본입니다.
