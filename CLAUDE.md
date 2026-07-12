# CLAUDE.md

## 재화/누적값 갱신 규칙 (중요)

`money`(소지금), `inventory` 등 여러 화면·여러 액션에서 동시에 바뀔 수 있는 누적값은
**절대로 클로저에 캡처된 로컬 스냅샷(`currentUser.money`, `members[id].money` 등)을 기준으로
"기존값 + 변화량"을 계산해서 덮어쓰지 않는다.**

```js
// ❌ 이렇게 하지 말 것 — currentUser가 오래된 값이면 그 사이 다른 곳에서 바뀐 금액을 통째로 덮어씀
updateCurrentUser({ money: currentUser.money - price });
```

```js
// ✅ Firebase runTransaction으로 실제 최신 값을 기준으로 원자적으로 반영
const moneyRef = ref(database, `members/${currentUser.id}/money`);
await runTransaction(moneyRef, (money) => (Number(money) || 0) + delta);
```

인벤토리도 동일한 이유로 `updateInventory`(내부적으로 `runTransaction` 사용)를 통해서만 변경한다.

**왜 이 규칙이 있는지**: 2026-07-10 `9dc9fe6 fix: shop-inventory sync` 커밋에서 인벤토리 쪽만
트랜잭션으로 바꾸다가, 같은 함수(`useLoot.js`의 `applyLoot`) 안의 소지금 계산을 클로저 스냅샷
방식으로 되돌려 놔서 "탐험 중 돈을 주우면 기존 소지금이 사라지고 주운 돈만 남는" 회귀가 생겼다.
비관리자 계정은 `members` 전체를 실시간으로 새로고침하는 리스너가 없어서(권한상 불필요하다고
설계됨) 이 stale 값이 훨씬 잘 드러났다. 자세한 경위는 [useLoot.js](src/hooks/game/useLoot.js)와
[useShop.js](src/hooks/shop/useShop.js)의 `adjustMoney` 관련 주석 참고.

- 돈/재화를 고치거나 새로 추가할 때는 항상 이 패턴(`runTransaction` 또는 이미 트랜잭션화된
  `updateInventory`)을 따를 것.
- 이 패턴이 필요한데 아직 적용 안 된 곳을 발견하면, 조용히 그냥 넘어가지 말고 사용자에게
  알릴 것 (예: `src/components/views/ShopView.jsx`의 `purchaseDesktopGacha`,
  `purchaseDesktopRandomBox` 등은 아직 `trainer.money` 클로저 값을 그대로 쓰고 있어서
  같은 회귀 위험이 있음 — 2026-07-13 기준 미수정).
