// src/hooks/shop/useShop.js - 완전한 최종 버전

import { useState, useEffect } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { database } from '../../firebase';
import { getItemPocket } from '../../utils/itemUtils';

// 현재 주차 계산
const getWeekKey = (date) => {
  const d = new Date(date);
  const dayNum = d.getDay() || 7;
  d.setDate(d.getDate() + 4 - dayNum);
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNum = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getFullYear()}-W${weekNum}`;
};

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

export const useShop = (currentUser, updateCurrentUser, allItems) => {
  const [shopData, setShopData] = useState({
    dailyItems: {},
    initialDailyItems: {},
    permanentItems: [],
    rareDailyItem: null,
    rareItemPool: [],
    rareItemConfig: { enabled: false },
    gachaBall: { enabled: false, balls: [] },
    randomBoxes: getDefaultRandomBoxes(),
    refreshInterval: 86400000,
    lastRefresh: Date.now(),
    lastWeekReset: null
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('🔄 useShop useEffect 실행');
    console.log('📦 allItems:', allItems?.length || 0, '개');
    
    if (!allItems || allItems.length === 0) {
      console.log('⏳ allItems 로딩 대기 중...');
      return;
    }
    
    const shopRef = ref(database, 'gameData/shopData');
    
    const unsubscribe = onValue(shopRef, async (snapshot) => {
      if (snapshot.exists()) {
        const loadedData = snapshot.val();
        const currentWeek = getWeekKey(new Date());
        
        // 기본값 설정
        if (!loadedData.randomBoxes) {
          loadedData.randomBoxes = getDefaultRandomBoxes();
        }
        if (!loadedData.initialDailyItems) {
          loadedData.initialDailyItems = getDefaultInitialDailyItems();
        }
        if (!loadedData.rareItemConfig) {
          loadedData.rareItemConfig = { enabled: false };
        }
        
        // ⭐ 희귀템 자동 추첨 체크
        const today = new Date().toISOString().split('T')[0];
        const needsRareItemRefresh = loadedData.rareDailyItem?.lastRefresh !== today;
        
        if (needsRareItemRefresh && loadedData.rareItemPool && loadedData.rareItemPool.length > 0) {
          console.log('🎲 희귀템 자동 추첨 실행');
          const randomIndex = Math.floor(Math.random() * loadedData.rareItemPool.length);
          const selectedRareItem = loadedData.rareItemPool[randomIndex];
          
          loadedData.rareDailyItem = {
            itemId: selectedRareItem.itemId,
            price: selectedRareItem.price,
            stock: 1,
            lastRefresh: today
          };
          
          await set(shopRef, loadedData);
          console.log('✅ 오늘의 한정 아이템 추첨 완료:', allItems.find(i => i.id === selectedRareItem.itemId)?.name);
        }
        
        const needsWeeklyReset = !loadedData.lastWeekReset || loadedData.lastWeekReset !== currentWeek;
        
        if (needsWeeklyReset) {
          console.log('🔄 새로운 주 감지! 요일별 아이템 재고 리셋');
          
          const resetDailyItems = {};
          
          for (const day of ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']) {
            const initialItems = loadedData.initialDailyItems[day] || [];
            const currentItems = loadedData.dailyItems[day] || [];
            
            const enrichedInitialItems = initialItems
              .map(template => enrichItemData(template, allItems))
              .filter(Boolean);
            
            const persistentAddedItems = currentItems.filter(item => 
              item.isPersistent === true && 
              !initialItems.some(init => init.itemId === item.itemId)
            );
            
            resetDailyItems[day] = [...enrichedInitialItems, ...persistentAddedItems];
            console.log(`✅ ${day}: ${resetDailyItems[day].length}개`);
          }
          
          const resetData = {
            ...loadedData,
            dailyItems: resetDailyItems,
            lastWeekReset: currentWeek
          };
          
          await set(shopRef, resetData);
          setShopData(resetData);
          console.log('✅ 리셋 완료');
          
        } else {
          console.log('ℹ️ 주간 리셋 불필요, enrichment 적용');
          
          const enrichedDailyItems = {};
          for (const [day, items] of Object.entries(loadedData.dailyItems || {})) {
            enrichedDailyItems[day] = items.map(item => {
              if (item.imageUrl && item.description) {
                return item;
              }
              return enrichItemData(item, allItems);
            }).filter(Boolean);
          }
          
          const normalizedData = {
            dailyItems: enrichedDailyItems,
            initialDailyItems: loadedData.initialDailyItems || getDefaultInitialDailyItems(),
            permanentItems: loadedData.permanentItems || [],
            rareDailyItem: loadedData.rareDailyItem || null,
            rareItemPool: loadedData.rareItemPool || [],
            rareItemConfig: loadedData.rareItemConfig || { enabled: false },
            gachaBall: loadedData.gachaBall || { enabled: false, balls: [] },
            randomBoxes: loadedData.randomBoxes || getDefaultRandomBoxes(),
            refreshInterval: loadedData.refreshInterval || 86400000,
            lastRefresh: loadedData.lastRefresh || Date.now(),
            lastWeekReset: loadedData.lastWeekReset || currentWeek
          };
          
          setShopData(normalizedData);
        }
        
      } else {
        console.log('🔧 초기 상점 데이터 생성 중...');
        
        const currentWeek = getWeekKey(new Date());
        const defaultTemplate = getDefaultInitialDailyItems();
        
        const enrichedDailyItems = {};
        for (const [day, items] of Object.entries(defaultTemplate)) {
          enrichedDailyItems[day] = items
            .map(template => enrichItemData(template, allItems))
            .filter(Boolean);
        }
        
        const initialShopData = {
          dailyItems: enrichedDailyItems,
          initialDailyItems: defaultTemplate,
          permanentItems: [],
          rareDailyItem: null,
          rareItemPool: [],
          rareItemConfig: { enabled: false },
          gachaBall: { enabled: false, balls: [] },
          randomBoxes: getDefaultRandomBoxes(),
          refreshInterval: 86400000,
          lastRefresh: Date.now(),
          lastWeekReset: currentWeek
        };
        
        await set(shopRef, initialShopData);
        setShopData(initialShopData);
        console.log('✅ 초기 상점 데이터 생성 완료');
      }
      
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [allItems]);

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

  const sellItem = (item, count) => {
    if (!currentUser) return false;
    
    const inventoryItem = currentUser.inventory.find(i => 
      i.itemId === item.itemId || i.name === item.name
    );
    
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
    
    const newInventory = currentUser.inventory
      .map(i => 
        (i.itemId === item.itemId || i.name === item.name)
          ? { ...i, count: i.count - count }
          : i
      )
      .filter(i => i.count > 0);
    
    updateCurrentUser({
      inventory: newInventory,
      money: currentUser.money + totalPrice
    });
    
    if (isTrash) {
      alert(`${itemData?.name || item.name} ${count}개를 버렸습니다.`);
    } else {
      alert(`${itemData?.name || item.name} ${count}개를 ₽${totalPrice.toLocaleString()}에 판매했습니다!`);
    }
    
    return true;
  };

  // 랜덤박스 구매
  const buyRandomBox = (box, result) => {
    if (!currentUser) return false;
    
    const newMoney = currentUser.money - box.price;
    
    const existingItem = currentUser.inventory.find(
      i => i.itemId === result.itemId || i.name === result.name
    );
    
    const itemData = allItems.find(i => i.id === result.itemId);
    
    const newInventory = existingItem
      ? currentUser.inventory.map(i =>
          (i.itemId === result.itemId || i.name === result.name)
            ? { ...i, count: i.count + result.count }
            : i
        )
      : [
          ...currentUser.inventory,
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
    
    updateCurrentUser({
      money: newMoney,
      inventory: newInventory
    });
    
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
      const today = new Date().toISOString().split('T')[0];
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
    
    // 인벤토리에 아이템 추가
    const existingItem = currentUser.inventory.find(
      i => i.itemId === resolvedItemId || i.name === itemData.name
    );
    
    const newInventory = existingItem
      ? currentUser.inventory.map(i =>
          (i.itemId === resolvedItemId || i.name === itemData.name)
            ? { ...i, count: i.count + quantity }
            : i
        )
      : [
          ...currentUser.inventory,
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
    
    const newMoney = currentUser.money - totalCost;
    
    // 상점 재고 감소 처리
    try {
      const today = new Date();
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const todayName = dayNames[today.getDay()];
      
      let updatedShopData = JSON.parse(JSON.stringify(shopData));
      let needShopUpdate = false;
      
      if (itemType === 'rare' && updatedShopData.rareDailyItem?.itemId === itemId) {
        const purchaseHistory = currentUser.purchaseHistory || {};
        const todayStr = new Date().toISOString().split('T')[0];
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
        
        updateCurrentUser({
          inventory: newInventory,
          money: newMoney,
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
      }
      
      if (needShopUpdate) {
        await updateShopData(updatedShopData);
      }
      
      if (itemType !== 'rare') {
        updateCurrentUser({
          inventory: newInventory,
          money: newMoney
        });
      }
      
      alert(`${itemData.name} ${quantity}개를 구매했습니다!`);
      return true;
      
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
