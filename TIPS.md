# 그거 아셨나요? 게임 팁 근거

확인일: 2026-10-19. 공식 사이트 공개 개발용 소스를 읽어 확인한 설명입니다. 공식 개발팀의 공략 문서가 아니며 업데이트로 바뀔 수 있습니다. 전략 권장은 생존을 보장하지 않습니다.

## 1. 적이 많아지면 새 적이 더 강해져요.

적이 이미 55마리 이상이면 새로 생성되는 일반 적의 체력은 1.6배, 공격 피해는 1.25배가 돼요. 경험치도 1.6배예요.

**정확한 조건:** CAP=64, ELITE_FROM=0.85. 생성 직전 count ≥ 54.4이므로 정수 기준 55마리. 이미 살아 있는 적 전체를 강화하는 규칙은 아닙니다.

**확인한 공개 파일:** [js/systems/spawner.js](https://pokesurvivor.com/js/systems/spawner.js)

## 2. 64마리는 절대적인 전체 적 수 제한이 아니에요.

평소 일반 적 생성은 64마리에서 멈춰요. 하지만 보스 생성이나 특수한 무리 생성은 별도라 64마리를 넘을 수 있어요.

**정확한 조건:** 일반 생성·marea는 CAP=64. spawnBoss에는 해당 상한 검사 없음. burst는 CAP+10까지 생성 가능.

**확인한 공개 파일:** [js/systems/spawner.js](https://pokesurvivor.com/js/systems/spawner.js)

## 3. 보스전에는 일반 적이 덜 나와요.

보스가 살아 있으면 일반 적 생성 속도는 평소의 25%로 줄고, 한쪽에서 몰려오는 대규모 무리도 잠시 멈춰요.

**정확한 조건:** bossFight ? 0.25 : 1, 보스전 동안 surgeT 감소 중지.

**확인한 공개 파일:** [js/systems/spawner.js](https://pokesurvivor.com/js/systems/spawner.js)

## 4. 회복·보호막·소환 적은 각각 동시 3마리 제한이에요.

같은 지원 역할이 이미 3마리 살아 있으면 새로 뽑힌 그 역할 대신 다른 적을 골라요.

**정확한 조건:** SUPPORT_MAX=3. healer/shielder/summoner별 일반 생성 후보 대체. 다른 생성 경로 전체의 절대 상한이라고 해석하지 않습니다.

**확인한 공개 파일:** [js/systems/spawner.js](https://pokesurvivor.com/js/systems/spawner.js)

## 5. 큰 잠긴 상자는 곁에서 기다려야 열려요.

큰 상자 가까이에 3.5초 머무르면 열려요. 멀어지면 개봉 진행도가 줄어드니 주변 적을 정리한 뒤 도전해 보세요.

**정확한 조건:** CHEST_TIME=3.5. 범위 밖이면 p.open이 dt×1.5만큼 감소. 정리 권장은 전략 제안이지 보장된 최적 전략은 아닙니다.

**확인한 공개 파일:** [js/systems/interact.js](https://pokesurvivor.com/js/systems/interact.js)

## 6. 샘은 최대 체력에 비례해서 회복시켜요.

충전된 샘 위에 있으면 초당 최대 체력의 14%를 회복해요. 샘은 사용하면 줄어들지만 시간이 지나면 다시 차요.

**정확한 조건:** pl.maxHp×0.14×dt 회복. charge는 초당 1/45 증가, 회복 시 초당 0.09 감소. 충전량·거리·체력 조건 적용.

**확인한 공개 파일:** [js/systems/interact.js](https://pokesurvivor.com/js/systems/interact.js)

## 7. 제단 강화는 25초짜리예요.

제단에 따라 피해 2배, 이동속도 45% 증가, 자석 범위 4배, 재사용 대기시간 40% 감소 중 하나를 받아요.

**정확한 조건:** POWER_TIME=25. POWERS 네 가지를 그대로 표시.

**확인한 공개 파일:** [js/systems/interact.js](https://pokesurvivor.com/js/systems/interact.js)

## 8. 리프트에는 입장 시간과 전투 제한 시간이 있어요.

열린 리프트는 45초 뒤 사라져요. 들어가면 전설과 최대 120초 싸우며, 시간 초과로 지더라도 원래 맵으로 돌아가 판이 이어져요.

**정확한 조건:** TTL=45, ARENA_TIME=120. lost → finish → 원래 맵 복원. 사망 상태 플레이어는 최대 체력 30%로 부활.

**확인한 공개 파일:** [js/systems/rift.js](https://pokesurvivor.com/js/systems/rift.js)

## 9. 리프트 승리 보상인 결속으로 기술을 묶을 수 있어요.

리프트 전설을 이기면 결속을 하나 받아요. 여러 기술을 한 슬롯에 묶어 함께 발동하며, 한 묶음은 최대 4개 기술까지 들어가요.

**정확한 조건:** won에서 bonds++. Player.BOND_MAX=4. 사용 중인 슬롯의 기술 그룹이 함께 발동.

**확인한 공개 파일:** [js/systems/rift.js](https://pokesurvivor.com/js/systems/rift.js) · [js/entities/player.js](https://pokesurvivor.com/js/entities/player.js)

## 10. 아직 못 이긴 전설이 더 잘 선택돼요.

리프트의 전설 선택은 균등하지 않아요. 아직 이기지 못한 전설은 이미 이긴 전설보다 선택 가중치가 4배예요.

**정확한 조건:** 등록된 스프라이트가 있는 전설 후보에서 beaten?1:4. 4배의 확정 등장률이라는 뜻이 아닌 상대 가중치.

**확인한 공개 파일:** [js/systems/rift.js](https://pokesurvivor.com/js/systems/rift.js)

## 11. 뮤츠의 물리 기술 85%는 강화 표시가 아니에요.

뮤츠의 공격은 1.31, 특수공격은 1.55예요. 물리 기술 효율은 강점인 특수공격 대비 약 85%라는 뜻이에요.

**정확한 조건:** dex150 pa=1.31, sa=1.55, atk=1.55. fit physical=1.31/1.55≈0.845. 실제 피해에는 기술·대상·다른 보정도 관여.

**확인한 공개 파일:** [js/systems/stats.js](https://pokesurvivor.com/js/systems/stats.js) · [js/data/pokedex.js](https://pokesurvivor.com/js/data/pokedex.js)

## 12. 포켓몬의 강점 쪽 기술은 더 자주 제안돼요.

레벨업에서 새 기술 후보를 고를 때, 그 포켓몬에게 효율 100%인 기술은 다른 기술보다 선택 가중치가 2배예요.

**정확한 조건:** 신규 기술 후보 pool의 weighted sampling: Stats.fit≥0.999이면2, 아니면1. 최종 카드 전체의 확률이 무조건2배라는 뜻은 아닙니다.

**확인한 공개 파일:** [js/systems/levelup.js](https://pokesurvivor.com/js/systems/levelup.js)

## 13. 기술 레벨만 올린다고 바로 진화하지 않아요.

진화 가능한 기술을 최대 레벨로 만들고, 그 기술에 필요한 능력 강화도 이번 판에서 한 번 이상 골라야 진화 카드 후보가 돼요.

**정확한 조건:** EVO 매핑이 있고 maxLvl에 도달했으며 해당 needs의 statsTaken 조건 충족. 이후 진화 선택지 후보 등록, 즉시 진화 보장 아님.

**확인한 공개 파일:** [js/data/moves.js](https://pokesurvivor.com/js/data/moves.js) · [js/systems/levelup.js](https://pokesurvivor.com/js/systems/levelup.js)

## 14. 일반 적과 리프트 전설은 이로치 확률이 달라요.

이로치 스프라이트가 있는 종류라면 일반 적의 이로치 확률은 1/4096, 리프트 전설은 1/512예요.

**정확한 조건:** Spawner.SHINY_RATE=1/4096, rollShiny는 hasShiny 검사. 리프트 cfg.shiny도 hasShiny 검사 후1/512. 가챠 확률이 아닙니다.

**확인한 공개 파일:** [js/systems/spawner.js](https://pokesurvivor.com/js/systems/spawner.js) · [js/systems/rift.js](https://pokesurvivor.com/js/systems/rift.js)

## 15. 30분부터는 아르세우스의 심판이 기다려요.

심판 구간에서는 이동속도 130을 넘는 부분이 25%만 반영돼요. 이 보정은 30분 이전 일반 구간에는 적용되지 않아요.

**정확한 조건:** AT=30×60. capSpd(s)=s≤130?s:130+(s−130)×0.25. 선택/리프트 중이면 실제 심판 시작은 끝난 뒤.

**확인한 공개 파일:** [js/systems/judgment.js](https://pokesurvivor.com/js/systems/judgment.js)

## 히든코드에 관하여

이번에 확인한 메뉴·설정·입력·시작·데이터베이스·전투 관련 파일에서는 플레이어가 입력하여 보상을 받는 공개 코드를 확인하지 못했습니다. 미확인 코드는 팁에 넣지 않았습니다. 개발자 테스트 함수·계정 식별자·인증 정보는 게임 팁으로 공개하지 않습니다.
