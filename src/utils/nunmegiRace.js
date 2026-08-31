// src/utils/nunmegiRace.js
// 누니머기 레이스 진행 로직 - 두 경로가 공유한다.
//   1) 상점에서 "누니머기의 눈덩이" 구매 (src/hooks/shop/useShop.js)
//   2) 모험 전리품으로 얻은 "누니머기의 눈덩이"를 가방에서 사용 (src/hooks/items/useItemEffects.js)
// 참가 마리 수(NUNMEGI_RACER_COUNT)는 functions/raceBot.js의 RACER_IDS,
// src/components/views/admin/NunmegiRaceAdminPanel.jsx의 RACER_IDS와 값을 맞춰야 한다.
import { ref, runTransaction } from 'firebase/database';
import { database } from '../firebase';

export const NUNMEGI_RACER_COUNT = 5;

// 눈덩이 1개를 무작위 누니머기 한 마리에게 먹여 1mm 전진시킨다.
// CLAUDE.md 재화/누적값 갱신 규칙과 같은 이유로 클로저 스냅샷이 아니라 runTransaction으로
// 실제 최신 값을 기준으로 원자적으로 반영한다(여러 명이 거의 동시에 먹여도 유실 없음).
// 성공 시 먹은 누니머기 번호(문자열), 실패 시 null 을 반환한다.
export const feedNunmegiRaceOnce = async () => {
  const raceRef = ref(database, 'gameData/nunmegiRace');
  const result = await runTransaction(raceRef, (current) => {
    const base = current || {};
    const racers = { ...(base.racers || {}) };
    Array.from({ length: NUNMEGI_RACER_COUNT }, (_, i) => String(i + 1)).forEach((id) => {
      if (!racers[id]) racers[id] = { progressMm: 0 };
    });
    const racerId = String(1 + Math.floor(Math.random() * NUNMEGI_RACER_COUNT));
    racers[racerId] = { progressMm: (Number(racers[racerId]?.progressMm) || 0) + 1 };
    return {
      racers,
      totalFed: (Number(base.totalFed) || 0) + 1,
      lastFedRacer: racerId,
      lastFedAt: Date.now(),
    };
  });
  return result.committed ? result.snapshot.val()?.lastFedRacer : null;
};

// 눈덩이 count개를 순서대로 먹인다. 각 시도는 독립적으로 무작위(runTransaction 안에서 매번
// 다시 뽑으므로 재시도돼도 한쪽으로 쏠리지 않는다). 먹은 누니머기 번호 배열을 반환한다.
export const feedNunmegiRace = async (count = 1) => {
  const times = Math.max(1, Math.floor(Number(count) || 1));
  const fedRacers = [];
  for (let i = 0; i < times; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const racerId = await feedNunmegiRaceOnce();
    if (racerId) fedRacers.push(racerId);
  }
  return fedRacers;
};

// fedRacers(먹은 누니머기 번호 배열) → "N번 누니머기가 눈덩이를 X개 먹었다!" 줄 목록
export const buildNunmegiFeedMessage = (fedRacers = []) => {
  const counts = fedRacers.reduce((acc, racerId) => {
    acc[racerId] = (acc[racerId] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([racerId, count]) => `${racerId}번 누니머기가 눈덩이를 ${count}개 먹었다!`)
    .join('\n');
};
