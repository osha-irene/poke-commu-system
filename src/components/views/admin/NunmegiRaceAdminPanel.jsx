// src/components/views/admin/NunmegiRaceAdminPanel.jsx
// "누니머기의 눈덩이" 구매(src/hooks/shop/useShop.js의 feedNunmegiRace)로 진행되는
// gameData/nunmegiRace를 실시간으로 보여주고, 필요할 때 0으로 리셋한다.
import React, { useEffect, useState } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { database } from '../../../firebase';
import { Snowflake, RotateCcw } from 'lucide-react';

// 참가 마리 수 - src/hooks/shop/useShop.js의 NUNMEGI_RACER_COUNT,
// functions/raceBot.js의 RACER_IDS와 값을 맞춰야 한다.
const RACER_IDS = [1, 2, 3, 4, 5];

const emptyRaceState = () => ({
  racers: Object.fromEntries(RACER_IDS.map((id) => [id, { progressMm: 0 }])),
  totalFed: 0,
  lastFedRacer: null,
  lastFedAt: null,
});

export default function NunmegiRaceAdminPanel() {
  const [raceState, setRaceState] = useState(null);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    const raceRef = ref(database, 'gameData/nunmegiRace');
    const unsubscribe = onValue(raceRef, (snapshot) => {
      setRaceState(snapshot.val() || emptyRaceState());
    });
    return () => unsubscribe();
  }, []);

  const handleReset = async () => {
    if (!window.confirm('누니머기 레이스 진행도를 전부 0으로 리셋할까요? 되돌릴 수 없습니다.')) return;
    setIsResetting(true);
    try {
      await set(ref(database, 'gameData/nunmegiRace'), emptyRaceState());
    } catch (error) {
      console.error('누니머기 레이스 리셋 실패:', error);
      alert('리셋 중 오류가 발생했습니다: ' + error.message);
    } finally {
      setIsResetting(false);
    }
  };

  if (!raceState) {
    return (
      <div className="rounded-lg border-2 border-sky-300 bg-white/55 p-6 shadow-sm">
        <p className="text-gray-500 text-sm">누니머기 레이스 데이터 로딩 중...</p>
      </div>
    );
  }

  const progressOf = (id) => Number(raceState.racers?.[String(id)]?.progressMm) || 0;
  const progresses = RACER_IDS.map(progressOf);
  const maxProgress = Math.max(...progresses, 0);
  const leaders = maxProgress > 0 ? RACER_IDS.filter((id) => progressOf(id) === maxProgress) : [];
  const barMax = 1000; // 100cm(=1000mm) 완주 기준 고정 스케일

  const lastFedAtText = raceState.lastFedAt
    ? new Date(raceState.lastFedAt).toLocaleString('ko-KR')
    : '-';

  return (
    <div className="rounded-lg border-2 border-sky-300 bg-white p-6 shadow-sm space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Snowflake size={28} className="text-sky-600" />
          <div>
            <h3 className="text-xl font-bold text-gray-900">누니머기 레이스</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              "누니머기의 눈덩이" 구매로 진행되는 레이스 현황입니다. 마스토돈에서 [누니머기 레이스]로도 조회할 수 있어요.
            </p>
          </div>
        </div>
        <button
          onClick={handleReset}
          disabled={isResetting}
          className="flex items-center gap-2 bg-red-50 border border-red-300 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 font-semibold transition-colors disabled:opacity-50 flex-shrink-0"
        >
          <RotateCcw size={16} />
          {isResetting ? '리셋 중...' : '레이스 리셋'}
        </button>
      </div>

      <div className="space-y-3">
        {RACER_IDS.map((id) => {
          const progress = progressOf(id);
          const isLeader = leaders.includes(id);
          const widthPercent = Math.min(100, (progress / barMax) * 100);
          return (
            <div key={id} className="flex items-center gap-3">
              <div className={`w-24 flex-shrink-0 font-bold text-sm ${isLeader ? 'text-sky-700' : 'text-gray-700'}`}>
                {id}번 누니머기{isLeader ? ' 👑' : ''}
              </div>
              <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${isLeader ? 'bg-sky-500' : 'bg-sky-300'}`}
                  style={{ width: `${widthPercent}%` }}
                />
              </div>
              <div className="w-16 text-right text-sm font-semibold text-gray-800">{progress}mm</div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-x-6 gap-y-1 text-sm text-gray-600 border-t border-gray-200 pt-3 flex-wrap">
        <span>먹인 눈덩이 총 <strong className="text-gray-900">{Number(raceState.totalFed) || 0}</strong>개</span>
        <span>
          마지막 급여: {raceState.lastFedRacer ? `${raceState.lastFedRacer}번 누니머기` : '-'} ({lastFedAtText})
        </span>
      </div>
    </div>
  );
}
