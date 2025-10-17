// src/hooks/useShop.js - 실시간 동기화 버전

import { useState, useEffect } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { database } from '../firebase';

export const useShop = (currentUser, updateCurrentUser, allItems) => {
  const [shopData, setShopData] = useState({
    dailyItems: {},
    permanentItems: [],
    rareDailyItem: null,
    rareItemPool: [],
    gachaBall: { enabled: false, balls: [] },
    refreshInterval: 86400000,
    lastRefresh: Date.now()
  });
  const [isLoading, setIsLoading] = useState(true);

  // 🔥 Firebase 실시간 리스너 (onValue 사용)
  useEffect(() => {
    const shopRef = ref(database, 'gameData/shopData');
    
    // 실시간 리스너 연결
    const unsubscribe = onValue(shopRef, (snapshot) => {
      if (snapshot.exists()) {
        const loadedData = snapshot.val();
        
        // 새로운 구조로 데이터 변환
        const normalizedData = {
          dailyItems: loadedData.dailyItems || {},
          permanentItems: loadedData.permanentItems || [],
          rareDailyItem: loadedData.rareDailyItem || null,
          rareItemPool: loadedData.rareItemPool || [],
          gachaBall: loadedData.gachaBall || { enabled: false, balls: [] },
          refreshInterval: loadedData.refreshInterval || 86400000,
          lastRefresh: loadedData.lastRefresh || Date.now()
        };
        
        setShopData(normalizedData);
        
        // 아이템 개수 계산
        const dailyCount = Object.values(normalizedData.dailyItems).reduce((sum, items) => sum + items.length, 0);
        const permCount = normalizedData.permanentItems.length;
        const rareCount = normalizedData.rareDailyItem ? 1 : 0;
        
        console.log('🛒 상점 데이터 실시간 로드:');
        console.log(`  - 요일별: ${dailyCount}개`);
        console.log(`  - 상시: ${permCount}개`);
        console.log(`  - 희귀: ${rareCount}개`);
        console.log(`  - 희귀템 풀: ${normalizedData.rareItemPool.length}개`);
      } else {
        // 초기 상점 데이터 생성
        const initialShopData = {
          dailyItems: {},
          permanentItems: [],
          rareDailyItem: null,
          rareItemPool: [],
          gachaBall: { enabled: false, balls: [] },
          refreshInterval: 86400000,
          lastRefresh: Date.now()
        };
        set(shopRef, initialShopData);
        setShopData(initialShopData);
        console.log('✅ 초기 상점 데이터 생성 (새 구조)');
      }
      setIsLoading(false);
    }, (error) => {
      console.error('❌ 상점 데이터 로드 실패:', error);
      // 폴백: 기본 데이터 사용
      setShopData({
        dailyItems: {},
        permanentItems: [],
        rareDailyItem: null,
        rareItemPool: [],
        gachaBall: { enabled: false, balls: [] },
        refreshInterval: 86400000,
        lastRefresh: Date.now()
      });
      setIsLoading(false);
    });

    // 컴포넌트 언마운트 시 리스너 해제
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
      
      // setShopData는 onValue 리스너가 자동으로 처리
    } catch (error) {
      console.error('❌ 상점 데이터 저장 실패:', error);
      throw error; // 에러를 다시 던져서 호출한 곳에서 처리
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
    
    // 버리기인지 확인
    const isTrash = item._isTrash === true;
    
    const itemData = allItems.find(i => 
      i.id === item.itemId || i.name === item.name
    );
    
    // 버리기가 아닐 때만 판매 가능 여부 체크
    if (!isTrash && itemData && !itemData.canSell) {
      alert('이 아이템은 판매할 수 없습니다!');
      return false;
    }
    
    // 버리기면 판매가 0, 아니면 정상 판매가
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
      money: (currentUser.money || 0) + totalPrice
    });
    
    if (isTrash) {
      alert(`${item.name} ${count}개를 버렸습니다.`);
    } else {
      alert(`${item.name} ${count}개를 ₽${totalPrice.toLocaleString()}에 판매했습니다!`);
    }
    
    return true;
  };

  return {
    shopData,
    updateShopData,
    sellItem,
    isLoading
  };
};