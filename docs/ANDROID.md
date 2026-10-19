# Android 한국어 테스트 앱

[테스트 APK 받기](https://raw.githubusercontent.com/GuenohPark/pokesurvivor/main/dist/pokesurvivor-ko-android-test.apk) · [소스 ZIP](https://raw.githubusercontent.com/GuenohPark/pokesurvivor/main/dist/pokesurvivor-ko-android-source.zip) · [소스 폴더](../android/)

공식 https://pokesurvivor.com/ 을 WebView로 직접 열고, 번역 JS를 해당 공식 페이지에서 실행하는 비공식 앱입니다. 원본 게임 서버를 복제하지 않습니다. 주소창 없는 화면이며 DOM과 Canvas 번역 코드를 포함합니다. **실제 Android 설치·로그인·플레이 검증은 아직 하지 않았습니다.**

## 두 종류의 업데이트

### 번역팩: 자동 확인·다운로드

앱 실행/새로고침 시 이 저장소 dist의 번역팩 버전을 확인합니다. 더 새 버전만 내려받아 앱의 전용 저장 공간에 캐시합니다. 같은 버전이면 큰 파일을 다시 받지 않고 오프라인에서는 캐시 또는 내장본을 사용합니다. 진행 중인 화면의 JS를 바꾸거나 강제로 새로고침하지 않습니다. 새로 받은 번역은 **다음 페이지 로드**부터 적용합니다.

다운로드 파일의 버전·식별자·크기·기본 형식을 확인하고, 실제 실행 후 DOM/Canvas 버전 확인에 성공한 후보만 정상 캐시로 확정합니다. 실패한 후보는 무효화하고 이전 캐시/내장본으로 돌아갑니다. 원격 코드는 이 사용자의 GitHub 저장소를 신뢰해 실행하는 것이며 악성 코드 전체를 탐지한다는 의미는 아닙니다.

### APK 자체: 새 버전 확인 후 사용자 설치

앱 자체 버전은 별도 메타데이터로 확인합니다. 앱 메뉴의 ‘앱 업데이트’에서 GitHub의 새 APK를 열 수 있습니다. **APK를 몰래 설치하거나 보안 설정을 해제하지 않습니다.** 다운로드·설치 확인은 Android에서 사용자가 진행해야 합니다.

메타데이터: [pokesurvivor-ko-android.meta.properties](../dist/pokesurvivor-ko-android.meta.properties). 새 APK를 배포할 때 버전 코드·이름·SHA-256과 실제 APK를 함께 갱신합니다.

## 설치와 조작

1. Android에서 APK를 받아 엽니다. 필요한 경우 다운로드한 앱의 ‘이 출처 허용’만 허용하고 Play Protect를 끄지 마세요.
2. 인터넷 연결 상태에서 공식 게임과 번역 확인이 끝날 때까지 기다립니다.
3. Android 뒤로 가기로 앱 메뉴를 엽니다. ‘앱 정보’에서 적용 번역 버전·업데이트 상태·라이선스를 볼 수 있습니다.

Google/팝업 로그인은 지원하지 않습니다. 일반 사용자명·비밀번호 로그인과 공식 클라우드 기록 복원도 실제 기기 검증이 필요합니다. 앱은 기존 브라우저와 저장 공간이 다르므로 브라우저 로컬 기록과 로그인 상태를 자동으로 가져오지는 않습니다. 앱 삭제/저장 공간 삭제 전 기록이 안전한지 확인하세요.

INTERNET 권한만 요청합니다. TLS/출처 보안을 끄거나 JavaScript 네이티브 브리지를 노출하지 않습니다. 계정 입력값을 별도 서버로 보내는 기능은 없으며 공식 게임 자체 통신은 별개입니다.

이 앱은 원본 개발팀·Nintendo·GAME FREAK의 공식 앱이 아니며 비상업 테스트 용도입니다. 앱에 포함한 출처·폰트·데이터별 라이선스를 확인하세요.
