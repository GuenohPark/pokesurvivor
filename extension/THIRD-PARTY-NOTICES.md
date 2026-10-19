# 출처와 라이선스 범위

## 직접 작성한 코드

[src/runtime-core.js](https://github.com/GuenohPark/pokesurvivor/blob/main/src/runtime-core.js), [src/search-korean.js](https://github.com/GuenohPark/pokesurvivor/blob/main/src/search-korean.js), [src/tips-ui.js](https://github.com/GuenohPark/pokesurvivor/blob/main/src/tips-ui.js), [scripts/build.cjs](https://github.com/GuenohPark/pokesurvivor/blob/main/scripts/build.cjs) 및 확장 실행 연결 코드는 이 패치를 위해 작성했습니다. 직접 작성한 코드에는 [LICENSE](LICENSE)의 MIT 조건을 적용합니다. 아래 데이터와 폰트에는 별도 조건이 적용됩니다.

## 게임 문구와 파생 번역

원본: JPTER78/PokéSurvivor, https://github.com/JPTER78/pokesurvivor 및 https://pokesurvivor.com/ . 현재 게임 소스는 PolyForm Noncommercial 1.0.0입니다. 언어팩·설명·새소식 등에서 파생된 번역은 비상업적 팬 번역이며 원본 조건을 존중합니다. 이 저장소의 MIT 고지는 이를 덮어쓰지 않습니다. [GAME-LICENSE-NONCOMMERCIAL.md](licenses/GAME-LICENSE-NONCOMMERCIAL.md)에 원본 라이선스를 보존했습니다. 원본 저장소에서 과거 MIT 배포 버전과 현재 비상업 라이선스를 구분합니다.

## 공식 한국어 명칭

PokéAPI의 커뮤니티 데이터에서 한국어 language_id=3 행을 조회했습니다. 리비전: 6fd69dfe90465ba96534f6816fc817737d1f97f6. 출처·조인 방법·파일 해시는 [names-provenance.json](https://github.com/GuenohPark/pokesurvivor/blob/main/data/names-provenance.json)을 참고하세요. 원본 BSD-3-Clause 고지는 [PokeAPI-LICENSE.md](licenses/PokeAPI-LICENSE.md)에 있습니다. Nintendo 또는 The Pokémon Company의 보증·승인을 뜻하지 않습니다.

현재 게임의 내부 ID와 실제 표시 기술명이 다른 경우 실제 표시 이름과 영어 사전 별칭을 대조했습니다. Enjambre/Swarm → 벌레의알림은 공식 특성명을 게임 진화 명칭으로 차용한 경우로, 공식 기술명이라고 주장하지 않습니다.

## 폰트

갈무리11 v2.40.3 (일반·굵게), Copyright Lee Minseo. SIL Open Font License 1.1. [Galmuri-LICENSE.txt](licenses/Galmuri-LICENSE.txt) 및 폰트 내장 코드에 고지 포함. https://github.com/quiple/galmuri

## 게임 리소스와 개인정보

게임 원본 실행 코드·스프라이트·음원·계정 저장 기록을 재배포하지 않습니다. 실행 중 화면의 닉네임을 수집하거나 GitHub로 보내는 기능이 없습니다. 큰 번역팩 자체는 외부 네트워크 호출을 하지 않습니다. 자동 로더는 이 저장소의 고정된 raw.githubusercontent.com 주소에서 메타데이터와 새 코드만 GET 요청하며, 캐시를 Userscripts GM 저장소에 보관합니다. 게임 계정·비밀번호·점수는 전송하지 않습니다. 게임 자체 통신 및 Userscripts 앱 자체 기능은 별개입니다. 서버의 랭킹 검증 정책상 허용 여부를 보증하지 않습니다.
