// src/hooks/useShop.js - enrichment + isPersistent 완전 버전

import { useState, useEffect } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { database } from '../firebase';

// 현재 주차 계산
const getWeekKey = (date) => {
  const d = new Date(date);
  const dayNum = d.getDay() || 7;
  d.setDate(d.getDate() + 4 - dayNum);
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNum = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getFullYear()}-W${weekNum}`;
};

// 🔥 enrichItemData 함수
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
    description: fullItem.effect || fullItem.description,
    cost: fullItem.cost,
    price: itemTemplate.price || fullItem.cost,
    stock: itemTemplate.stock || 999,
    isPersistent: itemTemplate.isPersistent || false  // ⭐ 추가
  };
};

// 기본 초기 재고 템플릿
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

export const useShop = (currentUser, updateCurrentUser, allItems) => {
  const [shopData, setShopData] = useState({
    dailyItems: {},
    initialDailyItems: {},
    permanentItems: [],
    rareDailyItem: null,
    rareItemPool: [],
    gachaBall: { enabled: false, balls: [] },
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
        
        if (!loadedData.initialDailyItems) {
          loadedData.initialDailyItems = getDefaultInitialDailyItems();
          await set(shopRef, loadedData);
        }
        
        const needsWeeklyReset = !loadedData.lastWeekReset || loadedData.lastWeekReset !== currentWeek;
        
        if (needsWeeklyReset) {
          console.log('🔄 새로운 주 감지! 요일별 아이템 재고 리셋');
          
          // 🔥 주간 리셋 로직 (isPersistent 고려)
          const resetDailyItems = {};
          
          for (const day of ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']) {
            const initialItems = loadedData.initialDailyItems[day] || [];
            const currentItems = loadedData.dailyItems[day] || [];
            
            // 1. 초기 템플릿 아이템 enrichment
            const enrichedInitialItems = initialItems
              .map(template => enrichItemData(template, allItems))
              .filter(Boolean);
            
            // 2. 추가된 persistent 아이템 (초기 템플릿에 없는 것)
            const persistentAddedItems = currentItems.filter(item => 
              item.isPersistent === true && 
              !initialItems.some(init => init.itemId === item.itemId)
            );
            
            resetDailyItems[day] = [...enrichedInitialItems, ...persistentAddedItems];
            console.log(`✅ ${day}: ${resetDailyItems[day].length}개 (초기: ${enrichedInitialItems.length}, 추가: ${persistentAddedItems.length})`);
          }
          
          const resetData = {
            ...loadedData,
            dailyItems: resetDailyItems,
            lastWeekReset: currentWeek
          };
          
          await set(shopRef, resetData);
          setShopData(resetData);
          console.log('✅ 리셋 완료 (persistent 아이템 유지됨)');
          
        } else {
          console.log('ℹ️ 주간 리셋 불필요, enrichment 적용');
          
          // 🔥 기존 데이터 enrichment
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
            gachaBall: loadedData.gachaBall || { enabled: false, balls: [] },
            refreshInterval: loadedData.refreshInterval || 86400000,
            lastRefresh: loadedData.lastRefresh || Date.now(),
            lastWeekReset: loadedData.lastWeekReset || currentWeek
          };
          
          setShopData(normalizedData);
        }
        
      } else {
        // 🔥 초기 데이터 생성
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
          gachaBall: { enabled: false, balls: [] },
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

  // ⭐ isPersistent 토글
  const toggleItemPersistent = async (day, itemId) => { // ⭐ itemIndex → itemId
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
    }


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
      console.error('❌ 초기 재고 템플릿 저장 실패:', error);
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

  return {
    shopData,
    updateShopData,
    addDailyItem,           // ⭐
    removeDailyItem,        // ⭐
    toggleItemPersistent,   // ⭐
    updateInitialDailyItems,
    sellItem,
    isLoading
  };
};