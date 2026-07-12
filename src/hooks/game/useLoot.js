// src/hooks/game/useLoot.js
// 전리품 생성 및 적용 시스템

import { ref, get, set, runTransaction } from 'firebase/database';
import { database } from '../../firebase';

export const useLoot = (currentUser, updateCurrentUser, setMembers, allItems, members = {}, updateInventory) => {
  
  // 기본 전리품 설정
  const getDefaultLootConfig = () => ({
    money: { min: 50, max: 200 },
    itemCount: { min: 1, max: 3 },
    itemPool: ['potion', 'super-potion', 'pokeball', 'great-ball', 'antidote', 'paralyze-heal', 'awakening', 'burn-heal'],
    ingredientCount: { min: 0, max: 1 },
    ingredientPool: ['oran-berry', 'pecha-berry', 'cheri-berry', 'rawst-berry'],
    berryCount: { min: 0, max: 1 },
    berryPool: ['oran-berry', 'sitrus-berry', 'lum-berry']
  });

  // 전리품 생성
  const generateLoot = (lootConfig, items = allItems) => {
    const loot = { money: 0, items: [], ingredients: [], berries: [] };
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      console.warn('allItems가 아직 로드되지 않았습니다');
      return loot;
    }
    
    const { money } = lootConfig;
    loot.money = Math.floor(Math.random() * (money.max - money.min + 1)) + money.min;
    
    // 일반 아이템
    const itemCount = Math.floor(Math.random() * (lootConfig.itemCount.max - lootConfig.itemCount.min + 1)) + lootConfig.itemCount.min;
    for (let i = 0; i < itemCount; i++) {
      if (lootConfig.itemPool && lootConfig.itemPool.length > 0) {
        const randomItemId = lootConfig.itemPool[Math.floor(Math.random() * lootConfig.itemPool.length)];
        const itemData = items.find(item => item.id === randomItemId);
        if (itemData) {
          const existing = loot.items.find(item => item.id === randomItemId);
          if (existing) {
            existing.count++;
          } else {
            loot.items.push({ id: randomItemId, name: itemData.name, count: 1 });
          }
        }
      }
    }
    
    // 재료
    const ingredientCount = Math.floor(Math.random() * (lootConfig.ingredientCount.max - lootConfig.ingredientCount.min + 1)) + lootConfig.ingredientCount.min;
    for (let i = 0; i < ingredientCount; i++) {
      if (lootConfig.ingredientPool && lootConfig.ingredientPool.length > 0) {
        const randomItemId = lootConfig.ingredientPool[Math.floor(Math.random() * lootConfig.ingredientPool.length)];
        const itemData = items.find(item => item.id === randomItemId);
        if (itemData) {
          const existing = loot.ingredients.find(item => item.id === randomItemId);
          if (existing) {
            existing.count++;
          } else {
            loot.ingredients.push({ id: randomItemId, name: itemData.name, count: 1 });
          }
        }
      }
    }
    
    // 나무열매
    const berryCount = Math.floor(Math.random() * (lootConfig.berryCount.max - lootConfig.berryCount.min + 1)) + lootConfig.berryCount.min;
    for (let i = 0; i < berryCount; i++) {
      if (lootConfig.berryPool && lootConfig.berryPool.length > 0) {
        const randomItemId = lootConfig.berryPool[Math.floor(Math.random() * lootConfig.berryPool.length)];
        const itemData = items.find(item => item.id === randomItemId);
        if (itemData) {
          const existing = loot.berries.find(item => item.id === randomItemId);
          if (existing) {
            existing.count++;
          } else {
            loot.berries.push({ id: randomItemId, name: itemData.name, count: 1 });
          }
        }
      }
    }
    
    return loot;
  };

  // 전리품 적용
  const applyLoot = async (loot, ballUsed = null) => {
    if (!loot || !currentUser) return;

    const allLootItems = [...loot.items, ...loot.ingredients, ...loot.berries];

    // 인벤토리(볼 소모 + 전리품 획득)는 항상 최신 값 기준으로 병합되도록 트랜잭션으로 처리
    const invTxResult = await updateInventory((inventory) => {
      let next = Array.isArray(inventory) ? [...inventory] : [];

      if (ballUsed && !currentUser.isSuperAdmin) {
        next = next.map(item =>
          (item.itemId === ballUsed.id || item.name === ballUsed.name)
            ? { ...item, count: Math.max(0, (Number(item.count) || 0) - 1) }
            : item
        );
      }

      allLootItems.forEach(lootItem => {
        const existingIndex = next.findIndex(i =>
          i.itemId === lootItem.id || i.name === lootItem.name
        );

        if (existingIndex !== -1) {
          next[existingIndex] = {
            ...next[existingIndex],
            count: (Number(next[existingIndex].count) || 0) + lootItem.count
          };
        } else {
          const itemData = allItems.find(i => i.id === lootItem.id);
          if (itemData) {
            next.push({
              itemId: lootItem.id,
              name: lootItem.name,
              nameEn: itemData.nameEn,
              count: lootItem.count,
              imageUrl: itemData.spriteUrl || itemData.imageUrl,
              category: itemData.category,
              onUse: itemData.onUse || null
            });
          }
        }
      });

      return next;
    });

    if (!invTxResult.committed) {
      console.error('❌ applyLoot: 인벤토리 업데이트 실패');
      return;
    }

    // 돈 지급 — 로컬 state(members/currentUser)가 최신이 아닐 수 있으므로, 인벤토리와 동일하게
    // Firebase의 실제 최신 값을 기준으로 트랜잭션으로 더한다 (그렇지 않으면 로컬 값이 stale일 때
    // 기존 소지금을 무시하고 주운 돈만 남는 문제가 생긴다).
    const moneyRef = ref(database, `members/${currentUser.id}/money`);
    const moneyResult = await runTransaction(moneyRef, (currentMoney) => (
      (Number(currentMoney) || 0) + (Number(loot.money) || 0)
    ));

    if (!moneyResult.committed) {
      console.error('❌ applyLoot: 소지금 업데이트 실패');
      return;
    }

    const newMoney = moneyResult.snapshot.val();

    setMembers(prev => ({
      ...prev,
      [currentUser.id]: { ...(prev[currentUser.id] || currentUser), money: newMoney }
    }));

    console.log('✅ applyLoot: Firebase 저장 완료');
  };

  // 지역 전리품 설정 업데이트
  const updateRegionLootConfig = async (regionId, lootConfig, regions, setRegions) => {
    if (!currentUser?.isAdmin && !currentUser?.isSuperAdmin) {
      console.error('❌ updateRegionLootConfig: 관리자 권한 없음 (저장되지 않음)', currentUser);
      alert('관리자 권한이 없어 저장하지 못했습니다.');
      return false;
    }

    const updatedRegions = (Array.isArray(regions) ? regions : []).map(region =>
      region.id === regionId ? { ...region, lootConfig } : region
    );

    setRegions(updatedRegions);

    try {
      await set(ref(database, 'gameData/regions'), updatedRegions);

      const configRef = ref(database, 'gameData/config');
      const snapshot = await get(configRef);
      const currentConfig = snapshot.val() || {};
      await set(configRef, {
        ...currentConfig,
        regions: updatedRegions
      });
      return true;
    } catch (error) {
      console.error('보상 설정 저장 실패:', error);
      alert('저장 중 오류가 발생했습니다.');
      return false;
    }
  };

  return {
    getDefaultLootConfig,
    generateLoot,
    applyLoot,
    updateRegionLootConfig
  };
};

export default useLoot;
