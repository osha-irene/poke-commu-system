// src/hooks/useShop.js - 초기 재고 템플릿 방식

import { useState, useEffect } from 'react';
import { ref, onValue, set, get } from 'firebase/database';
import { database } from '../firebase';

// 현재 주차 계산 (ISO 8601 기준 - 월요일 시작)
const getWeekKey = (date) => {
  const d = new Date(date);
  const dayNum = d.getDay() || 7;
  d.setDate(d.getDate() + 4 - dayNum);
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNum = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getFullYear()}-W${weekNum}`;
};

// 기본 초기 재고 템플릿 (최초 생성 시에만 사용)
const getDefaultInitialDailyItems = () => ({
  monday: [
    { itemId: 'potion', price: 300, stock: 10 },
    { itemId: 'antidote', price: 100, stock: 5 }
  ],
  tuesday: [
    { itemId: 'pokeball', price: 200, stock: 8 }
  ],
  wednesday: [
    { itemId: 'super-potion', price: 700, stock: 5 }
  ],
  thursday: [
    { itemId: 'great-ball', price: 600, stock: 5 }
  ],
  friday: [
    { itemId: 'hyper-potion', price: 1200, stock: 3 }
  ],
  saturday: [
    { itemId: 'ultra-ball', price: 1200, stock: 3 }
  ],
  sunday: [
    { itemId: 'full-heal', price: 600, stock: 5 }
  ]
});

export const useShop = (currentUser, updateCurrentUser, allItems) => {
  const [shopData, setShopData] = useState({
    dailyItems: {},
    initialDailyItems: {}, // ⭐ 초기 재고 템플릿
    permanentItems: [],
    rareDailyItem: null,
    rareItemPool: [],
    gachaBall: { enabled: false, balls: [] },
    refreshInterval: 86400000,
    lastRefresh: Date.now(),
    lastWeekReset: null
  });
  const [isLoading, setIsLoading] = useState(true);

  // 🔥 Firebase 실시간 리스너 + 주간 리셋 체크
  useEffect(() => {
    const shopRef = ref(database, 'gameData/shopData');
    
    const unsubscribe = onValue(shopRef, async (snapshot) => {
      if (snapshot.exists()) {
        const loadedData = snapshot.val();
        const currentWeek = getWeekKey(new Date());
        
        // ⭐ initialDailyItems가 없으면 추가 (기존 DB 마이그레이션)
        if (!loadedData.initialDailyItems) {
          console.log('⚠️ initialDailyItems 없음 - 현재 dailyItems를 템플릿으로 저장');
          loadedData.initialDailyItems = JSON.parse(JSON.stringify(loadedData.dailyItems || getDefaultInitialDailyItems()));
          await set(shopRef, loadedData);
        }
        
        // ⭐ 주간 리셋 체크
        const needsWeeklyReset = !loadedData.lastWeekReset || loadedData.lastWeekReset !== currentWeek;
        
        if (needsWeeklyReset) {
          console.log('🔄 새로운 주 감지! 요일별 아이템 재고 리셋');
          console.log(`  이전 주차: ${loadedData.lastWeekReset || '없음'}`);
          console.log(`  현재 주차: ${currentWeek}`);
          
          // ⭐ initialDailyItems 템플릿으로 리셋
          const resetData = {
            ...loadedData,
            dailyItems: JSON.parse(JSON.stringify(loadedData.initialDailyItems)), // 깊은 복사
            lastWeekReset: currentWeek
          };
          
          await set(shopRef, resetData);
          console.log('✅ 요일별 아이템 재고 리셋 완료');
          console.log('📦 리셋된 재고:', resetData.dailyItems);
          
          setShopData(resetData);
        } else {
          // 리셋 필요 없음
          const normalizedData = {
            dailyItems: loadedData.dailyItems || {},
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
        
        // 아이템 개수 로그
        const dailyCount = Object.values(shopData.dailyItems || {}).reduce((sum, items) => sum + items.length, 0);
        const permCount = shopData.permanentItems?.length || 0;
        const rareCount = shopData.rareDailyItem ? 1 : 0;
        
        console.log('🛒 상점 데이터 로드:');
        console.log(`  - 요일별: ${dailyCount}개`);
        console.log(`  - 상시: ${permCount}개`);
        console.log(`  - 희귀: ${rareCount}개`);
        console.log(`  - 현재 주차: ${currentWeek}`);
        
      } else {
        // 초기 상점 데이터 생성
        const currentWeek = getWeekKey(new Date());
        const defaultTemplate = getDefaultInitialDailyItems();
        
        const initialShopData = {
          dailyItems: JSON.parse(JSON.stringify(defaultTemplate)), // 현재 재고
          initialDailyItems: JSON.parse(JSON.stringify(defaultTemplate)), // 템플릿
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
        console.log(`  - 현재 주차: ${currentWeek}`);
      }
      
      setIsLoading(false);
    }, (error) => {
      console.error('❌ 상점 데이터 로드 실패:', error);
      
      const currentWeek = getWeekKey(new Date());
      const defaultTemplate = getDefaultInitialDailyItems();
      
      setShopData({
        dailyItems: JSON.parse(JSON.stringify(defaultTemplate)),
        initialDailyItems: JSON.parse(JSON.stringify(defaultTemplate)),
        permanentItems: [],
        rareDailyItem: null,
        rareItemPool: [],
        gachaBall: { enabled: false, balls: [] },
        refreshInterval: 86400000,
        lastRefresh: Date.now(),
        lastWeekReset: currentWeek
      });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 상점 데이터 업데이트 (Firebase에 저장)
  const updateShopData = async (newShopData) => {
    console.log('🔥 updateShopData 호출됨');
    console.log('📦 받은 데이터:', newShopData);
    
    try {
      const shopRef = ref(database, 'gameData/shopData');
      console.log('📍 Firebase 경로:', 'gameData/shopData');
      
      await set(shopRef, newShopData);
      console.log('✅ Firebase 저장 완료');
    } catch (error) {
      console.error('❌ 상점 데이터 저장 실패:', error);
      throw error;
    }
  };

  // ⭐ 초기 재고 템플릿 업데이트 (관리자 전용)
  const updateInitialDailyItems = async (newInitialDailyItems) => {
    console.log('📝 초기 재고 템플릿 업데이트');
    
    try {
      const updatedShopData = {
        ...shopData,
        initialDailyItems: newInitialDailyItems
      };
      
      await updateShopData(updatedShopData);
      console.log('✅ 초기 재고 템플릿 저장 완료');
      return true;
    } catch (error) {
      console.error('❌ 초기 재고 템플릿 저장 실패:', error);
      return false;
    }
  };

  // 아이템 판매
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
    
    const itemData = allItems.find(i => 
      i.id === item.itemId || i.name === item.name
    );
    
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
    
    const updatedUser = {
      ...currentUser,
      inventory: newInventory,
      money: currentUser.money + totalPrice
    };
    
    updateCurrentUser(updatedUser);
    
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
    updateInitialDailyItems, // ⭐ 초기 재고 템플릿 업데이트 함수 추가
    sellItem,
    isLoading
  };
};