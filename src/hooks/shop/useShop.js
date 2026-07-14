// src/hooks/shop/useShop.js - 완전한 최종 버전

import { useState, useEffect, useRef } from 'react';
import { ref, get, onChildAdded, onChildChanged, onChildRemoved, set, runTransaction } from 'firebase/database';
import { database } from '../../firebase';
import { getItemPocket } from '../../utils/itemUtils';
import {
  getKoreaDateKey,
  getKoreaDayIndex,
  getKoreaWeekKey,
  getMillisecondsUntilNextKoreaMidnight,
} from '../../utils/shopTime';

// enrichItemData 함수
const enrichItemData = (itemTemplate, allItems) => {
  if (!itemTemplate) return null;
  
  if (!allItems || allItems.length === 0) {
    console.warn('⚠️ allItems가 비어있음!');
    return null;
  }
  
  let fullItem = null;
  
  if (itemTemplate.itemId) {
    fullItem = allItems.find(i => i.id === itemTemplate.itemId);
  }
  
  if (!fullItem && itemTemplate.name) {
    fullItem = allItems.find(i => 
      i.name === itemTemplate.name || 
      i.nameEn === itemTemplate.name
    );
  }
  
  if (!fullItem) {
    console.error('❌ 아이템을 찾을 수 없습니다:', itemTemplate);
    return null;
  }
  
  return {
    itemId: fullItem.id,
    name: fullItem.name,
    nameEn: fullItem.nameEn,
    imageUrl: fullItem.spriteUrl || fullItem.imageUrl,
    category: fullItem.category,
    pocket: getItemPocket(fullItem),
    description: fullItem.effect || fullItem.description,
    cost: fullItem.cost,
    price: itemTemplate.price || fullItem.cost,
    stock: itemTemplate.stock || 999,
    isPersistent: itemTemplate.isPersistent || false
  };
};

// 기본 요일별 아이템
const getDefaultInitialDailyItems = () => ({
  monday: [
    { itemId: 17, price: 300, stock: 10, isPersistent: true },
    { itemId: 18, price: 100, stock: 5, isPersistent: true }
  ],
  tuesday: [
    { itemId: 4, price: 200, stock: 8, isPersistent: true }
  ],
  wednesday: [
    { itemId: 17, price: 700, stock: 5, isPersistent: true }
  ],
  thursday: [
    { itemId: 3, price: 600, stock: 5, isPersistent: true }
  ],
  friday: [
    { itemId: 25, price: 1200, stock: 3, isPersistent: true }
  ],
  saturday: [
    { itemId: 2, price: 1200, stock: 3, isPersistent: true }
  ],
  sunday: [
    { itemId: 23, price: 600, stock: 5, isPersistent: true }
  ]
});

// 기본 랜덤박스 설정
const getDefaultRandomBoxes = () => ([
  { id: 1, name: '브론즈 박스', price: 1000, enabled: false, items: [] },
  { id: 2, name: '실버 박스', price: 3000, enabled: false, items: [] },
  { id: 3, name: '골드 박스', price: 5000, enabled: false, items: [] }
]);

export const useShop = (currentUser, updateCurrentUser, allItems, updateInventory) => {
  const [koreaDateKey, setKoreaDateKey] = useState(() => getKoreaDateKey());
  const [shopData, setShopData] = useState({
    dailyItems: {},
    initialDailyItems: {},
    permanentItems: [],
    rareDailyItem: null,
    rareItemPool: [],
    rareItemConfig: { enabled: false },
    periodItem: null,
    periodItemPool: [],
    periodItemConfig: { enabled: false },
    gachaBall: { enabled: false, balls: [] },
    randomBoxes: getDefaultRandomBoxes(),
    refreshInterval: 86400000,
    lastRefresh: Date.now(),
    lastWeekReset: null
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setKoreaDateKey(getKoreaDateKey());
    }, getMillisecondsUntilNextKoreaMidnight() + 1000);
    return () => clearTimeout(timer);
  }, [koreaDateKey]);

  // ⭐ ensureShopData(주간 리셋 병합/희귀·기간한정 아이템 로테이션 + 조건부 Firebase 쓰기)는
  // 세션당 딱 한 번만 실행되어야 한다. 이 값이 false인 동안 effect가 allItems 참조 변경으로
  // 여러 번 재실행되면(레시피/커스텀 아이템 갱신 등), 매번 다시 병합 로직을 태워 dailyItems가
  // 계속 늘어나는 회귀가 생길 수 있다 — ref로 "이미 부트스트랩했는지"를 기억해 재실행을 막는다.
  // allItems는 레시피/커스텀 아이템이 하나 바뀔 때마다(recipes 갱신, customItem 추가/수정 등)
  // 새 배열 참조로 다시 만들어진다. 아래 effect가 allItems를 그대로 의존성 배열에 넣으면
  // 그때마다 gameData/shopData의 onChildAdded/onChildChanged 리스너가 재구독되면서 상점
  // 데이터 전체를 매번 다시 내려받는다 — 최신 아이템 목록은 ref로만 참조하고, effect 자체는
  // "아이템이 처음 준비됐는지"(hasItems)에만 반응하도록 분리한다.
  const allItemsRef = useRef(allItems);
  useEffect(() => {
    allItemsRef.current = allItems;
  }, [allItems]);
  const hasItems = Array.isArray(allItems) && allItems.length > 0;

  // 소지금 증감 — 로컬 스냅샷(currentUser.money)이 아니라 Firebase의 실제 최신 값을 기준으로
  // 원자적으로 반영한다. 로컬 값을 기준으로 계산하면 그 사이 다른 곳에서 바뀐 금액을 덮어쓸 수 있다.
  const adjustMoney = (delta) => {
    const moneyRef = ref(database, `members/${currentUser.id}/money`);
    return runTransaction(moneyRef, (money) => (Number(money) || 0) + delta);
  };

  useEffect(() => {
    if (!hasItems) return;
    const allItems = allItemsRef.current;

    const shopRef = ref(database, 'gameData/shopData');
    let isMounted = true;
    let isInitialLoad = true;

    const normalizeShopData = (loadedData = {}) => {
      const currentWeek = getKoreaWeekKey();
      const initialDailyItems = loadedData.initialDailyItems || getDefaultInitialDailyItems();
      const enrichedDailyItems = {};

      for (const [day, items] of Object.entries(loadedData.dailyItems || {})) {
        enrichedDailyItems[day] = items.map(item => {
          if (item.imageUrl && item.description) return item;
          return enrichItemData(item, allItems);
        }).filter(Boolean);
      }

      return {
        dailyItems: enrichedDailyItems,
        initialDailyItems,
        permanentItems: loadedData.permanentItems || [],
        rareDailyItem: loadedData.rareDailyItem || null,
        rareItemPool: loadedData.rareItemPool || [],
        rareItemConfig: loadedData.rareItemConfig || { enabled: false },
        periodItem: loadedData.periodItem || null,
        periodItemPool: loadedData.periodItemPool || [],
        periodItemConfig: loadedData.periodItemConfig || { enabled: false },
        gachaBall: loadedData.gachaBall || { enabled: false, balls: [] },
        randomBoxes: loadedData.randomBoxes || getDefaultRandomBoxes(),
        refreshInterval: loadedData.refreshInterval || 86400000,
        lastRefresh: loadedData.lastRefresh || Date.now(),
        lastWeekReset: loadedData.lastWeekReset || currentWeek
      };
    };

    const ensureShopData = async (loadedData = {}) => {
      const currentWeek = getKoreaWeekKey();
      const baseData = {
        ...loadedData,
        randomBoxes: loadedData.randomBoxes || getDefaultRandomBoxes(),
        initialDailyItems: loadedData.initialDailyItems || getDefaultInitialDailyItems(),
        dailyItems: loadedData.dailyItems || {},
        rareItemConfig: loadedData.rareItemConfig || { enabled: false },
        periodItemPool: loadedData.periodItemPool || [],
        periodItemConfig: loadedData.periodItemConfig || { enabled: false },
      };

      const today = getKoreaDateKey();
      if (baseData.rareDailyItem?.lastRefresh !== today && baseData.rareItemPool?.length > 0) {
        const selectedRareItem = baseData.rareItemPool[Math.floor(Math.random() * baseData.rareItemPool.length)];
        baseData.rareDailyItem = {
          itemId: selectedRareItem.itemId,
          price: selectedRareItem.price,
          stock: 1,
          lastRefresh: today
        };
      }

      if (baseData.periodItem?.lastRefresh !== currentWeek && baseData.periodItemPool?.length > 0) {
        const randomIndex = Math.floor(Math.random() * baseData.periodItemPool.length);
        const selectedPeriodItem = baseData.periodItemPool[randomIndex];
        baseData.periodItem = {
          itemId: selectedPeriodItem.itemId,
          price: selectedPeriodItem.price,
          stock: selectedPeriodItem.stock ?? 10,
          lastRefresh: currentWeek
        };
        baseData.periodItemPool = baseData.periodItemPool.filter((_, idx) => idx !== randomIndex);
      }

      if (!baseData.lastWeekReset || baseData.lastWeekReset !== currentWeek) {
        const resetDailyItems = {};
        for (const day of ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']) {
          const initialItems = baseData.initialDailyItems[day] || [];
          const currentItems = baseData.dailyItems?.[day] || [];
          const enrichedInitialItems = initialItems
            .map(template => enrichItemData(template, allItems))
            .filter(Boolean);
          const persistentAddedItems = currentItems.filter(item =>
            item.isPersistent === true &&
            !initialItems.some(init => init.itemId === item.itemId)
          );
          resetDailyItems[day] = [...enrichedInitialItems, ...persistentAddedItems];
        }
        baseData.dailyItems = resetDailyItems;
        baseData.lastWeekReset = currentWeek;
      }

      return baseData;
    };

    get(shopRef)
      .then(async (snapshot) => {
        if (!snapshot.exists()) {
          const currentWeek = getKoreaWeekKey();
          const defaultTemplate = getDefaultInitialDailyItems();
          const enrichedDailyItems = {};
          for (const [day, items] of Object.entries(defaultTemplate)) {
            enrichedDailyItems[day] = items.map(template => enrichItemData(template, allItems)).filter(Boolean);
          }
          const initialShopData = {
            dailyItems: enrichedDailyItems,
            initialDailyItems: defaultTemplate,
            permanentItems: [],
            rareDailyItem: null,
            rareItemPool: [],
            rareItemConfig: { enabled: false },
            periodItem: null,
            periodItemPool: [],
            periodItemConfig: { enabled: false },
            gachaBall: { enabled: false, balls: [] },
            randomBoxes: getDefaultRandomBoxes(),
            refreshInterval: 86400000,
            lastRefresh: Date.now(),
            lastWeekReset: currentWeek
          };
          await set(shopRef, initialShopData);
          if (isMounted) setShopData(initialShopData);
          return;
        }

        const loadedData = snapshot.val();

        const ensuredData = await ensureShopData(loadedData);
        if (JSON.stringify(ensuredData) !== JSON.stringify(loadedData)) {
          await set(shopRef, ensuredData);
        }
        if (isMounted) setShopData(normalizeShopData(ensuredData));
      })
      .catch((error) => {
        console.error('shop data load failed:', error);
      })
      .finally(() => {
        isInitialLoad = false;
        if (isMounted) setIsLoading(false);
      });

    const handleChildSnapshot = (snapshot) => {
      if (isInitialLoad) return;
      setShopData(prev => normalizeShopData({
        ...prev,
        [snapshot.key]: snapshot.val()
      }));
    };

    const unsubAdded = onChildAdded(shopRef, handleChildSnapshot);
    const unsubChanged = onChildChanged(shopRef, handleChildSnapshot);
    const unsubRemoved = onChildRemoved(shopRef, (snapshot) => {
      if (isInitialLoad) return;
      setShopData(prev => {
        const next = { ...prev };
        delete next[snapshot.key];
        return normalizeShopData(next);
      });
    });

    return () => {
      isMounted = false;
      unsubAdded();
      unsubChanged();
      unsubRemoved();
    };
  }, [hasItems, koreaDateKey]);

  const updateShopData = async (newShopData) => {
    try {
      const shopRef = ref(database, 'gameData/shopData');
      await set(shopRef, newShopData);
      console.log('✅ 상점 데이터 저장 완료');
    } catch (error) {
      console.error('❌ 상점 데이터 저장 실패:', error);
      throw error;
    }
  };

  // ⭐ 요일별 아이템 추가
  const addDailyItem = async (day, item, isPersistent = false) => {
    const newItem = {
      ...item,
      isPersistent: isPersistent
    };
    
    const updatedShopData = {
      ...shopData,
      dailyItems: {
        ...shopData.dailyItems,
        [day]: [...(shopData.dailyItems[day] || []), newItem]
      }
    };
    
    await updateShopData(updatedShopData);
    console.log(`✅ ${day}에 아이템 추가 (persistent: ${isPersistent})`);
  };

  // ⭐ isPersistent 토글 (itemId로 수정)
  const toggleItemPersistent = async (day, itemId) => {
    const updatedItems = (shopData.dailyItems[day] || []).map(item => 
      item.itemId === itemId
        ? { ...item, isPersistent: !item.isPersistent }
        : item
    );
    
    const updatedShopData = {
      ...shopData,
      dailyItems: {
        ...shopData.dailyItems,
        [day]: updatedItems
      }
    };
    
    await updateShopData(updatedShopData);
  };

  // ⭐ 요일별 아이템 삭제
  const removeDailyItem = async (day, itemIndex) => {
    const updatedItems = (shopData.dailyItems[day] || []).filter((_, idx) => idx !== itemIndex);
    
    const updatedShopData = {
      ...shopData,
      dailyItems: {
        ...shopData.dailyItems,
        [day]: updatedItems
      }
    };
    
    await updateShopData(updatedShopData);
  };

  const updateInitialDailyItems = async (newInitialDailyItems) => {
    try {
      const updatedShopData = {
        ...shopData,
        initialDailyItems: newInitialDailyItems
      };
      
      await updateShopData(updatedShopData);
      return true;
    } catch (error) {
      console.error('❌ 요일별 아이템 저장 실패:', error);
      return false;
    }
  };

  const sellItem = async (item, count) => {
    if (!currentUser) return false;

    const matchesSoldItem = (i) => (
      (item.itemId != null && i.itemId === item.itemId) ||
      (item.name != null && i.name === item.name)
    );

    const inventoryItem = currentUser.inventory.find(matchesSoldItem);

    if (!inventoryItem || inventoryItem.count < count) {
      alert('판매할 아이템이 부족합니다!');
      return false;
    }

    const isTrash = item._isTrash === true;
    const itemData = allItems.find(i => i.id === item.itemId || i.name === item.name);

    if (!isTrash && itemData && !itemData.canSell) {
      alert('이 아이템은 판매할 수 없습니다!');
      return false;
    }

    const sellPrice = isTrash ? 0 : (itemData?.sellPrice || Math.floor((itemData?.cost || 0) * 0.5));
    const totalPrice = sellPrice * count;

    const txResult = await updateInventory((inventory) => {
      const target = inventory.find(matchesSoldItem);
      if (!target || target.count < count) {
        return; // 그 사이 수량이 줄어들어 트랜잭션 중단
      }
      return inventory
        .map(i => (matchesSoldItem(i) ? { ...i, count: i.count - count } : i))
        .filter(i => i.count > 0);
    });

    if (!txResult.committed) {
      alert('판매할 아이템이 부족합니다!');
      return false;
    }

    await adjustMoney(totalPrice);

    if (isTrash) {
      alert(`${itemData?.name || item.name} ${count}개를 버렸습니다.`);
    } else {
      alert(`${itemData?.name || item.name} ${count}개를 ₽${totalPrice.toLocaleString()}에 판매했습니다!`);
    }

    return true;
  };

  // 랜덤박스 구매
  const buyRandomBox = async (box, result) => {
    if (!currentUser) return false;

    const itemData = allItems.find(i => i.id === result.itemId);

    const txResult = await updateInventory((inventory) => {
      const existingItem = inventory.find(
        i => i.itemId === result.itemId || i.name === result.name
      );
      return existingItem
        ? inventory.map(i =>
            (i.itemId === result.itemId || i.name === result.name)
              ? { ...i, count: i.count + result.count }
              : i
          )
        : [
            ...inventory,
            {
              itemId: result.itemId,
              name: result.name,
              nameEn: itemData?.nameEn,
              count: result.count,
              imageUrl: itemData?.spriteUrl || itemData?.imageUrl,
              cost: itemData?.cost || 0,
              sellPrice: itemData?.sellPrice || 0,
              category: itemData?.category,
              pocket: itemData?.pocket
            }
          ];
    });

    if (!txResult.committed) {
      alert('구매 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
      return false;
    }

    await adjustMoney(-box.price);

    console.log(`✅ ${box.name} 구매 완료! ${result.name} x${result.count} 획득`);
    return true;
  };

  // 아이템 구매
  const handlePurchase = async (item, quantity) => {
    if (!currentUser) return false;
    
    console.log('🛒 구매 시도 - 전체 아이템 정보:', item);
    
    let itemData;
    if (typeof item === 'string' || typeof item === 'number') {
      itemData = allItems.find(i => i.id === item);
      if (!itemData) {
        alert('아이템 정보를 찾을 수 없습니다!');
        return false;
      }
    } else {
      itemData = item;
    }
    
    const itemCost = Number(itemData.price ?? itemData.buyPrice ?? itemData.cost ?? 0);
    const totalCost = itemCost * quantity;
    
    console.log('💰 최종 가격:', itemCost, '총액:', totalCost);
    
    if (totalCost <= 0) {
      console.error('❌ 가격이 0 이하입니다! 아이템 정보:', itemData);
      alert('아이템 가격 정보가 올바르지 않습니다!');
      return false;
    }
    
    if (currentUser.money < totalCost) {
      alert('돈이 부족합니다!');
      return false;
    }
    
    // 재고 체크
    const itemStock = itemData.stock ?? 99;
    if (itemStock !== 99 && itemStock < quantity) {
      alert(`재고가 부족합니다! (남은 재고: ${itemStock}개)`);
      return false;
    }
    
    // 한정 아이템 구매 이력 체크
    const itemType = itemData.type;
    const itemId = itemData.itemId ?? itemData.id;
    const resolvedItemId = itemData.id ?? itemData.itemId;
    
    if (itemType === 'rare') {
      const purchaseHistory = currentUser.purchaseHistory || {};
      const today = getKoreaDateKey();
      const todayPurchases = purchaseHistory[today] || {};
      
      const alreadyPurchased = todayPurchases[itemId] || 0;
      if (alreadyPurchased >= 1) {
        alert('한정 아이템은 1인당 1개만 구매할 수 있습니다!');
        return false;
      }
      
      if (quantity > 1) {
        alert('한정 아이템은 한 번에 1개만 구매할 수 있습니다!');
        return false;
      }
    }
    
    // 몬스터볼 10개당 프리미어볼 1개 증정
    const isPokeBall = itemData.nameEn === 'poke-ball' || itemData.name === '몬스터볼';
    const premierBallCount = isPokeBall ? Math.floor(quantity / 10) : 0;
    const premierData = premierBallCount > 0 ? allItems.find(i => i.nameEn === 'premier-ball') : null;

    // 인벤토리에 아이템(+프리미어볼 증정분) 추가 - 항상 최신 인벤토리 기준으로 병합
    const invTxResult = await updateInventory((inventory) => {
      const existingItem = inventory.find(
        i => i.itemId === resolvedItemId || i.name === itemData.name
      );

      let next = existingItem
        ? inventory.map(i =>
            (i.itemId === resolvedItemId || i.name === itemData.name)
              ? { ...i, count: i.count + quantity }
              : i
          )
        : [
            ...inventory,
            {
              itemId: resolvedItemId,
              name: itemData.name,
              nameEn: itemData.nameEn,
              count: quantity,
              imageUrl: itemData.spriteUrl || itemData.imageUrl,
              cost: itemCost,
              sellPrice: itemData.sellPrice,
              category: itemData.category,
              pocket: itemData.pocket,
              effect: itemData.effect,
              friendshipBoost: itemData.friendshipBoost,
              ivBoost: itemData.ivBoost,
              evBoost: itemData.evBoost,
              conditionBoost: itemData.conditionBoost,
              specialEffect: itemData.specialEffect
            }
          ];

      if (premierData) {
        const existingPremier = next.find(i => i.itemId === premierData.id || i.nameEn === 'premier-ball');
        next = existingPremier
          ? next.map(i =>
              (i.itemId === premierData.id || i.nameEn === 'premier-ball')
                ? { ...i, count: i.count + premierBallCount }
                : i
            )
          : [
              ...next,
              {
                itemId: premierData.id,
                name: premierData.name,
                nameEn: premierData.nameEn,
                count: premierBallCount,
                imageUrl: premierData.spriteUrl || premierData.imageUrl,
                cost: premierData.cost,
                sellPrice: premierData.sellPrice,
                category: premierData.category,
                pocket: premierData.pocket,
              }
            ];
      }

      return next;
    });

    if (!invTxResult.committed) {
      alert('구매 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
      return false;
    }

    // 상점 재고 감소 처리
    try {
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const todayName = dayNames[getKoreaDayIndex()];
      
      let updatedShopData = JSON.parse(JSON.stringify(shopData));
      let needShopUpdate = false;
      
      if (itemType === 'rare' && updatedShopData.rareDailyItem?.itemId === itemId) {
        const purchaseHistory = currentUser.purchaseHistory || {};
        const todayStr = getKoreaDateKey();
        const todayPurchases = purchaseHistory[todayStr] || {};
        todayPurchases[itemId] = (todayPurchases[itemId] || 0) + quantity;
        purchaseHistory[todayStr] = todayPurchases;
        
        if (updatedShopData.rareDailyItem.stock !== 99) {
          updatedShopData.rareDailyItem = {
            ...updatedShopData.rareDailyItem,
            stock: Math.max(0, updatedShopData.rareDailyItem.stock - quantity)
          };
          needShopUpdate = true;
        }
        
        await adjustMoney(-totalCost);
        updateCurrentUser({
          purchaseHistory: purchaseHistory
        });

      } else if (itemType === 'daily') {
        const dailyItems = updatedShopData.dailyItems?.[todayName] || [];
        updatedShopData.dailyItems[todayName] = dailyItems.map(i =>
          i.itemId === itemId && i.stock !== 99
            ? { ...i, stock: Math.max(0, i.stock - quantity) }
            : i
        );
        needShopUpdate = true;

      } else if (itemType === 'permanent') {
        updatedShopData.permanentItems = (updatedShopData.permanentItems || []).map(i =>
          i.itemId === itemId && i.stock !== 99
            ? { ...i, stock: Math.max(0, i.stock - quantity) }
            : i
        );
        needShopUpdate = true;

      } else if (itemType === 'period' && updatedShopData.periodItem?.itemId === itemId) {
        if (updatedShopData.periodItem.stock !== 99) {
          updatedShopData.periodItem = {
            ...updatedShopData.periodItem,
            stock: Math.max(0, updatedShopData.periodItem.stock - quantity)
          };
          needShopUpdate = true;
        }
      }

      if (needShopUpdate) {
        await updateShopData(updatedShopData);
      }

      if (itemType !== 'rare') {
        await adjustMoney(-totalCost);
      }

      const premierMsg = premierBallCount > 0 ? `프레미어볼 ${premierBallCount}개를 증정 받았다!` : '';
      return { success: true, premierMsg };
      
    } catch (error) {
      console.error('❌ 재고 업데이트 실패:', error);
      alert('구매 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
      return false;
    }
  };

  return {
    shopData,
    updateShopData,
    addDailyItem,
    removeDailyItem,
    toggleItemPersistent,
    updateInitialDailyItems,
    sellItem,
    buyRandomBox,
    handlePurchase,
    isLoading
  };
};
