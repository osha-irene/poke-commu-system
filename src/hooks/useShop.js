// src/hooks/useShop.js - Firebase 버전

import { useState, useEffect } from 'react';
import { ref, get, set } from 'firebase/database';
import { database } from '../firebase';

export const useShop = (currentUser, updateCurrentUser, allItems) => {
  const [shopData, setShopData] = useState({
    items: [],
    refreshInterval: 86400000, // 24시간 (밀리초)
    lastRefresh: Date.now()
  });
  const [isLoading, setIsLoading] = useState(true);

  // 🔥 Firebase에서 상점 데이터 로드
  useEffect(() => {
    const loadShopData = async () => {
      try {
        const shopRef = ref(database, 'gameData/shopData');
        const snapshot = await get(shopRef);
        
        if (snapshot.exists()) {
          const loadedData = snapshot.val();
          // ⭐ items가 없으면 빈 배열로 초기화
          setShopData({
            items: loadedData.items || [],
            refreshInterval: loadedData.refreshInterval || 86400000,
            lastRefresh: loadedData.lastRefresh || Date.now()
          });
          console.log('🛒 상점 데이터 로드 완료:', (loadedData.items || []).length, '개 아이템');
        } else {
          // 초기 상점 데이터 생성
          const initialShopData = {
            items: [],
            refreshInterval: 86400000,
            lastRefresh: Date.now()
          };
          await set(shopRef, initialShopData);
          setShopData(initialShopData);
          console.log('✅ 초기 상점 데이터 생성');
        }
      } catch (error) {
        console.error('❌ 상점 데이터 로드 실패:', error);
        // 폴백: 기본 데이터 사용
        setShopData({
          items: [],
          refreshInterval: 86400000,
          lastRefresh: Date.now()
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadShopData();
  }, []);

  // 🔥 상점 데이터 변경 시 Firebase 저장
  useEffect(() => {
    const saveShopData = async () => {
      if (isLoading) return;

      try {
        const shopRef = ref(database, 'gameData/shopData');
        await set(shopRef, shopData);
        console.log('💾 상점 데이터 저장 완료');
      } catch (error) {
        console.error('❌ 상점 데이터 저장 실패:', error);
      }
    };

    saveShopData();
  }, [shopData, isLoading]);

  const updateShopData = (newShopData) => {
    setShopData(newShopData);
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