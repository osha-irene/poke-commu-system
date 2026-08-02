// src/hooks/game/useBerryFarm.js
// 나무열매 농장 - 나무열매플랜터(최대 4개)에 나무열매를 심어 며칠 뒤 수확한다.

import { getItemPocket } from '../../utils/itemUtils';
import { resolveItemData } from '../../utils/itemUsageRules';

export const MAX_BERRY_PLANTER_SLOTS = 4;
export const BERRY_GROWTH_MS = 4 * 24 * 60 * 60 * 1000; // 나흘
const BASE_MAX_YIELD = 2;
const FERTILIZED_MAX_YIELD = 4;

export const useBerryFarm = (currentUser, updateInventory, updateFieldTransaction, allItems = []) => {
  const berryPlanterSlots = Math.min(MAX_BERRY_PLANTER_SLOTS, Number(currentUser?.berryPlanterSlots) || 0);
  const berryFarm = currentUser?.berryFarm || {};

  const getSlotState = (slot) => {
    const entry = berryFarm[String(slot)];
    if (!entry) return { status: 'empty' };
    const elapsed = Date.now() - Number(entry.plantedAt || 0);
    if (elapsed >= BERRY_GROWTH_MS) return { status: 'ready', entry };
    return { status: 'growing', entry, remainingMs: BERRY_GROWTH_MS - elapsed };
  };

  const matchInventoryItem = (target) => (i) => (
    (target.itemId != null && i.itemId === target.itemId) ||
    (target.nameEn && i.nameEn === target.nameEn) ||
    (target.name && i.name === target.name)
  );

  // 나무열매 심기 - 빈 슬롯에 인벤토리의 나무열매 1개를 심는다.
  const plantBerry = async (slot, inventoryItem) => {
    if (!currentUser || !inventoryItem) return false;

    if (slot < 0 || slot >= berryPlanterSlots) {
      alert('아직 사용할 수 없는 플랜터입니다!');
      return false;
    }
    if (berryFarm[String(slot)]) {
      alert('이미 무언가 자라고 있습니다!');
      return false;
    }

    const itemData = resolveItemData(allItems, inventoryItem) || inventoryItem;
    if (getItemPocket(itemData) !== 'berries') {
      alert('나무열매만 심을 수 있습니다!');
      return false;
    }
    if ((inventoryItem.count ?? 0) <= 0) {
      alert('보유한 나무열매가 없습니다!');
      return false;
    }

    const result = await updateFieldTransaction(`berryFarm/${slot}`, (current) => {
      if (current) return undefined; // 트랜잭션 중단 - 이미 다른 요청이 먼저 심었음
      return {
        berryItemId: inventoryItem.itemId ?? itemData.id,
        berryName: itemData.name || inventoryItem.name,
        berryNameEn: itemData.nameEn || inventoryItem.nameEn || null,
        berryImageUrl: itemData.spriteUrl || itemData.imageUrl || inventoryItem.imageUrl || null,
        plantedAt: Date.now(),
        fertilized: false,
      };
    });

    if (!result.committed) {
      alert('이미 무언가 자라고 있습니다!');
      return false;
    }

    const match = matchInventoryItem(inventoryItem);
    await updateInventory((inventory = []) => (
      inventory
        .map(i => match(i) ? { ...i, count: (i.count ?? 1) - 1 } : i)
        .filter(i => (i.count ?? 1) > 0)
    ));

    return true;
  };

  // 비료 주기 - 자라는 동안 아무 때나 1회, 다 자란 뒤에는 줄 수 없다.
  const applyFertilizer = async (slot, fertilizerItem) => {
    if (!currentUser || !fertilizerItem) return false;

    const entry = berryFarm[String(slot)];
    if (!entry) {
      alert('이 플랜터에는 아무것도 자라고 있지 않습니다!');
      return false;
    }
    if (entry.fertilized) {
      alert('이미 비료를 줬습니다!');
      return false;
    }
    if (Date.now() - Number(entry.plantedAt || 0) >= BERRY_GROWTH_MS) {
      alert('이미 다 자라서 비료가 필요 없습니다!');
      return false;
    }
    if ((fertilizerItem.count ?? 0) <= 0) {
      alert('보유한 비료가 없습니다!');
      return false;
    }

    const result = await updateFieldTransaction(`berryFarm/${slot}`, (current) => {
      if (!current || current.fertilized) return undefined;
      return { ...current, fertilized: true };
    });

    if (!result.committed) {
      alert('비료 적용에 실패했습니다. 다시 시도해주세요.');
      return false;
    }

    const match = matchInventoryItem(fertilizerItem);
    await updateInventory((inventory = []) => (
      inventory
        .map(i => match(i) ? { ...i, count: (i.count ?? 1) - 1 } : i)
        .filter(i => (i.count ?? 1) > 0)
    ));

    return true;
  };

  // 수확 - 심은 것과 같은 종류의 나무열매를 비료 여부에 따라 1~2개(기본) 또는 1~4개(비료) 획득.
  const harvestBerry = async (slot) => {
    if (!currentUser) return false;

    const entry = berryFarm[String(slot)];
    if (!entry) {
      alert('이 플랜터에는 아무것도 없습니다!');
      return false;
    }
    if (Date.now() - Number(entry.plantedAt || 0) < BERRY_GROWTH_MS) {
      alert('아직 다 자라지 않았습니다!');
      return false;
    }

    const maxYield = entry.fertilized ? FERTILIZED_MAX_YIELD : BASE_MAX_YIELD;
    const yieldCount = 1 + Math.floor(Math.random() * maxYield);

    const result = await updateFieldTransaction(`berryFarm/${slot}`, (current) => {
      if (!current) return undefined;
      return null; // 슬롯 비움
    });

    if (!result.committed) {
      alert('수확에 실패했습니다. 다시 시도해주세요.');
      return false;
    }

    await updateInventory((inventory = []) => {
      const existing = inventory.find(i => i.itemId === entry.berryItemId || i.name === entry.berryName);
      if (existing) {
        return inventory.map(i => (
          (i.itemId === entry.berryItemId || i.name === entry.berryName)
            ? { ...i, count: (i.count ?? 0) + yieldCount }
            : i
        ));
      }
      return [
        ...inventory,
        {
          itemId: entry.berryItemId,
          name: entry.berryName,
          nameEn: entry.berryNameEn,
          count: yieldCount,
          imageUrl: entry.berryImageUrl,
        },
      ];
    });

    alert(`${entry.berryName}을(를) ${yieldCount}개 수확했습니다!`);
    return true;
  };

  return {
    berryPlanterSlots,
    berryFarm,
    getSlotState,
    plantBerry,
    applyFertilizer,
    harvestBerry,
  };
};
