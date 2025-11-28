# 포켓몬 배틀 시스템 - 간단 가이드

## 설치

```bash
npm install @smogon/calc
```

## 파일 구조

```
battle/
├── hooks/
│   └── useBattle.js          # 배틀 로직
└── components/
    └── BattleArena.jsx       # 배틀 UI (심플)
```

## 기본 사용법

```jsx
import { BattleArena } from './battle/components/BattleArena';

const pokemon1 = {
  name: 'Charizard',
  level: 50,
  types: ['Fire', 'Flying'],
  ability: 'Blaze',
  item: 'Life Orb',
  nature: 'Modest',
  stats: { hp: 153, attack: 104, defense: 98, spAttack: 159, spDefense: 105, speed: 120 },
  ivs: { hp: 31, attack: 31, defense: 31, spAttack: 31, spDefense: 31, speed: 31 },
  evs: { hp: 0, attack: 0, defense: 0, spAttack: 252, spDefense: 4, speed: 252 },
  moves: [
    { name: 'Fire Blast' },
    { name: 'Air Slash' }
  ]
};

const pokemon2 = { /* 비슷한 구조 */ };

<BattleArena player1Pokemon={pokemon1} player2Pokemon={pokemon2} />
```

## Firebase 포켓몬 데이터 변환

```jsx
// Firebase의 포켓몬 데이터를 배틀 형식으로 변환
function convertToBattleFormat(firebasePokemon) {
  return {
    name: firebasePokemon.name,
    level: firebasePokemon.level,
    types: firebasePokemon.types,
    ability: firebasePokemon.ability || 'Overgrow',
    item: firebasePokemon.heldItem || null,
    nature: firebasePokemon.nature || 'Hardy',
    stats: firebasePokemon.stats,
    ivs: firebasePokemon.ivs || { hp: 31, attack: 31, defense: 31, spAttack: 31, spDefense: 31, speed: 31 },
    evs: firebasePokemon.evs || { hp: 0, attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0 },
    moves: firebasePokemon.moves.map(move => ({ name: move.name }))
  };
}
```

## 주요 기능

- **정확한 데미지 계산**: Pokémon Showdown 공식 계산식
- **턴제 배틀**: 기술 선택 → 데미지 계산 → HP 감소
- **배틀 로그**: 모든 행동 기록
- **승패 판정**: HP 0이 되면 자동 승리 판정

## 확장 예시

### AI 상대 추가

```jsx
// Player 2를 AI로 만들기
useEffect(() => {
  if (!battleState.winner && battleState.turn > 0) {
    setTimeout(() => {
      const randomMove = Math.floor(Math.random() * player2Pokemon.moves.length);
      useMove('player2', randomMove);
    }, 1000);
  }
}, [battleState.turn]);
```

### 배틀 결과 저장

```jsx
import { ref, push } from 'firebase/database';

useEffect(() => {
  if (battleState.winner) {
    const battleRef = ref(database, 'battleHistory');
    push(battleRef, {
      timestamp: Date.now(),
      winner: battleState.winner,
      turns: battleState.turn,
      log: battleState.log
    });
  }
}, [battleState.winner]);
```

## 파일 위치 안내

**프로젝트에 통합 시:**

1. `battle/` 폴더를 `src/` 아래에 복사
2. BattleExample.jsx 참고해서 사용
3. 라우터에 추가: `<Route path="/battle" element={<BattleExample />} />`

**필수 props:**
- `player1Pokemon`: 첫 번째 포켓몬 데이터
- `player2Pokemon`: 두 번째 포켓몬 데이터

## 트러블슈팅

### 한글 포켓몬 이름 사용 시

```jsx
const NAME_MAP = {
  '리자몽': 'Charizard',
  '거북왕': 'Blastoise',
  // ...
};

const englishName = NAME_MAP[koreanName] || koreanName;
```

### 기술 이름이 인식 안될 때

@smogon/calc은 영문 기술명만 인식합니다.
예: '불대문자' → 'Fire Blast'

## 참고

- [@smogon/calc](https://github.com/smogon/damage-calc)
- [Pokémon Showdown](https://pokemonshowdown.com/)
