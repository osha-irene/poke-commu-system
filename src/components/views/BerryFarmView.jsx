// src/components/views/BerryFarmView.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { Lock } from 'lucide-react';
import { useGame } from '../../contexts/GameContext';
import { getItemPocket } from '../../utils/itemUtils';
import { resolveItemData } from '../../utils/itemUsageRules';
import { MAX_BERRY_PLANTER_SLOTS, BERRY_GROWTH_MS } from '../../hooks/game/useBerryFarm';

import bgPot from '../../assets/berrypot/UI/BerryPots/bg_pot.png';
import potSpace from '../../assets/berrypot/UI/BerryPots/pot_space.png';
import berryPotIcon from '../../assets/berrypot/Items/BERRYPOTS.png';
import potStage1 from '../../assets/berrypot/UI/BerryPots/pot_stage1.png';
import potStage2 from '../../assets/berrypot/UI/BerryPots/pot_stage2.png';
import potStage3 from '../../assets/berrypot/UI/BerryPots/pot_stage3.png';
import cancelBtn from '../../assets/berrypot/UI/BerryPots/cancel_btn_normal.png';
import wailmerPail from '../../assets/berrypot/UI/BerryPots/WAILMERPAIL.png';

const FERTILIZER_NAME_CANDIDATES = ['비료'];

const formatRemaining = (ms) => {
  const totalMinutes = Math.max(0, Math.ceil(ms / 60000));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}일 ${hours}시간 남음`;
  if (hours > 0) return `${hours}시간 ${minutes}분 남음`;
  return `${minutes}분 남음`;
};

// 성장 진행률에 따라 화분 스프라이트를 고른다 (심은 직후 -> 잎이 자람 -> 다 자람)
const getGrowthSprite = (progress) => {
  if (progress >= 1) return potStage3;
  if (progress >= 0.5) return potStage2;
  return potStage1;
};

const PixelButton = ({ children, onClick, disabled, tone = 'lime' }) => {
  const toneClasses = {
    lime: 'bg-lime-600 hover:bg-lime-700 border-lime-800',
    blue: 'bg-sky-500 hover:bg-sky-600 border-sky-800',
    amber: 'bg-amber-500 hover:bg-amber-600 border-amber-800',
  }[tone];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-white font-bold text-sm py-2 rounded-md border-b-4 active:border-b-0 active:translate-y-1 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${toneClasses}`}
      style={{ imageRendering: 'pixelated' }}
    >
      {children}
    </button>
  );
};

export default function BerryFarmView() {
  const { items = [], allItems = [], berryFarm } = useGame();
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [pickingBerry, setPickingBerry] = useState(false);
  const [, setTick] = useState(0);

  // 남은 시간 표시를 1분마다 갱신
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  const berryInventory = useMemo(() => (
    items.filter((i) => {
      const data = resolveItemData(allItems, i) || i;
      return getItemPocket(data) === 'berries' && (i.count ?? 0) > 0;
    })
  ), [items, allItems]);

  const fertilizerInInventory = useMemo(() => (
    items.find((i) => FERTILIZER_NAME_CANDIDATES.includes(i.name) && (i.count ?? 0) > 0) || null
  ), [items]);

  if (!berryFarm) {
    return <div className="p-6 text-gray-500">농장 정보를 불러올 수 없습니다.</div>;
  }

  const { berryPlanterSlots, getSlotState, plantBerry, applyFertilizer, harvestBerry } = berryFarm;

  const closeDialogue = () => {
    setSelectedSlot(null);
    setPickingBerry(false);
  };

  const handleSelectSlot = (slot) => {
    setPickingBerry(false);
    setSelectedSlot((prev) => (prev === slot ? null : slot));
  };

  const handlePlant = async (berryItem) => {
    if (selectedSlot == null) return;
    if (!window.confirm(`${berryItem.name}을(를) 심으시겠습니까? (1개 소모)`)) return;
    const ok = await plantBerry(selectedSlot, berryItem);
    if (ok) closeDialogue();
  };

  const handleFertilize = async () => {
    if (selectedSlot == null) return;
    if (!fertilizerInInventory) {
      alert('보유한 비료가 없습니다!');
      return;
    }
    if (!window.confirm('비료를 주시겠습니까? (1개 소모)')) return;
    await applyFertilizer(selectedSlot, fertilizerInInventory);
  };

  const handleHarvest = async () => {
    if (selectedSlot == null) return;
    await harvestBerry(selectedSlot);
    closeDialogue();
  };

  const selectedState = selectedSlot != null ? getSlotState(selectedSlot) : null;

  return (
    <div className="mx-auto p-4" style={{ width: 640 }}>
      {/* 잔디 배경 씬 - 좌측 화분 선택 박스 + 우측 장식 화분 (원본 "Choose one of the Berry Pots" 화면 구도) */}
      <div
        className="relative rounded-3xl overflow-hidden"
        style={{
          width: 640,
          height: 480,
          backgroundImage: `url(${bgPot})`,
          backgroundSize: '640px 480px',
          backgroundPosition: 'top',
          imageRendering: 'pixelated',
        }}
      >
        {/* 화분 선택 박스 (pot_space.png 원본 비율 그대로) */}
        <div
          className="absolute p-2"
          style={{
            top: 164,
            left: -4,
            width: 388,
            height: 260,
            backgroundImage: `url(${potSpace})`,
            backgroundSize: '388px 260px',
            imageRendering: 'pixelated',
          }}
        >
          <div className="flex flex-wrap content-start gap-x-1 gap-y-0 pt-3 pl-2">
            {Array.from({ length: MAX_BERRY_PLANTER_SLOTS }).map((_, slot) => {
              const locked = slot >= berryPlanterSlots;
              const state = !locked ? getSlotState(slot) : null;
              const isSelected = selectedSlot === slot;

              let progress = 0;
              if (state?.status === 'growing') {
                progress = 1 - state.remainingMs / BERRY_GROWTH_MS;
              } else if (state?.status === 'ready') {
                progress = 1;
              }

              return (
                <button
                  key={slot}
                  onClick={() => !locked && handleSelectSlot(slot)}
                  disabled={locked}
                  className="relative flex flex-col items-center justify-end disabled:cursor-not-allowed"
                  style={{ width: 56, height: 64 }}
                >
                  {/* 선택 커서 (4모서리 브라켓) */}
                  {isSelected && (
                    <>
                      <span className="absolute -top-1 -left-1 w-3 h-3 border-t-4 border-l-4 border-orange-400" />
                      <span className="absolute -top-1 -right-1 w-3 h-3 border-t-4 border-r-4 border-orange-400" />
                      <span className="absolute -bottom-1 -left-1 w-3 h-3 border-b-4 border-l-4 border-orange-400" />
                      <span className="absolute -bottom-1 -right-1 w-3 h-3 border-b-4 border-r-4 border-orange-400" />
                    </>
                  )}

                  {locked ? (
                    <div className="relative flex flex-col items-center justify-center opacity-50 grayscale" style={{ width: 80, height: 97 }}>
                      <img src={berryPotIcon} alt="" style={{ width: 80, height: 80, imageRendering: 'pixelated' }} />
                      <Lock size={16} className="text-gray-700 absolute" />
                    </div>
                  ) : state.status === 'empty' ? (
                    <img src={potStage1} alt="" style={{ width: 80, height: 97, imageRendering: 'pixelated' }} />
                  ) : (
                    <div className="relative flex flex-col items-center">
                      <img src={getGrowthSprite(progress)} alt="" style={{ width: 80, height: 97, imageRendering: 'pixelated' }} />
                      {state.entry?.berryImageUrl && (
                        <img
                          src={state.entry.berryImageUrl}
                          alt=""
                          className="absolute -top-2 w-5 h-5"
                          style={{ imageRendering: 'pixelated' }}
                        />
                      )}
                      {state.status === 'ready' && (
                        <span className="absolute -top-3 right-0 text-[10px]">✨</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 대화창 + 취소 버튼 (원본처럼 별도로 나란히) */}
      <div className="flex items-stretch gap-2 mt-1">
        <div className="flex-1 bg-white border-4 border-gray-700 rounded-xl p-3 shadow-md min-h-[72px]">
          {selectedSlot == null ? (
            <p className="text-sm text-gray-700">화분을 하나 선택하세요.</p>
          ) : pickingBerry ? (
            <div>
              <p className="text-sm text-gray-800 font-semibold mb-2">심을 나무열매를 선택하세요.</p>
              {berryInventory.length === 0 ? (
                <p className="text-xs text-gray-500 mb-2">보유한 나무열매가 없습니다.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 mb-1 max-h-32 overflow-y-auto">
                  {berryInventory.map((berryItem) => (
                    <button
                      key={berryItem.itemId ?? berryItem.name}
                      onClick={() => handlePlant(berryItem)}
                      className="flex items-center gap-2 border-2 border-lime-300 rounded-lg px-2 py-1.5 text-xs hover:bg-lime-50 transition-colors"
                    >
                      {berryItem.imageUrl && (
                        <img src={berryItem.imageUrl} alt="" className="w-6 h-6" style={{ imageRendering: 'pixelated' }} />
                      )}
                      <span className="flex-1 text-left truncate">{berryItem.name}</span>
                      <span className="text-gray-500">{berryItem.count}개</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : selectedState.status === 'empty' ? (
            <>
              <p className="text-sm text-gray-800 mb-2">플랜터 {selectedSlot + 1} - 비어 있습니다.</p>
              <PixelButton onClick={() => setPickingBerry(true)}>나무열매 심기</PixelButton>
            </>
          ) : selectedState.status === 'growing' ? (
            <>
              <p className="text-sm text-gray-800 mb-1">
                <span className="font-bold">{selectedState.entry.berryName}</span>을(를) 기르는 중입니다.
              </p>
              <p className="text-xs text-gray-500 mb-2">
                {formatRemaining(selectedState.remainingMs)}
                {selectedState.entry.fertilized && ' · 비료 적용됨'}
              </p>
              {!selectedState.entry.fertilized && (
                <PixelButton tone="blue" onClick={handleFertilize}>
                  <span className="inline-flex items-center gap-1 justify-center">
                    <img src={wailmerPail} alt="" className="w-4 h-4" style={{ imageRendering: 'pixelated' }} />
                    비료 주기
                  </span>
                </PixelButton>
              )}
            </>
          ) : (
            <>
              <p className="text-sm text-gray-800 mb-2">
                <span className="font-bold">{selectedState.entry.berryName}</span> 수확할 준비가 되었습니다!
              </p>
              <PixelButton tone="amber" onClick={handleHarvest}>수확하기</PixelButton>
            </>
          )}
        </div>

        <button onClick={pickingBerry ? () => setPickingBerry(false) : closeDialogue} className="flex-shrink-0">
          <img src={cancelBtn} alt="취소" style={{ imageRendering: 'pixelated', height: 48 }} />
        </button>
      </div>
    </div>
  );
}
