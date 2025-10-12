import { useState, useEffect } from 'react';
import { loadFromStorage, saveToStorage } from '../utils/storage';

export const useShop = (currentUser, updateCurrentUser, allItems) => {
  const [shopData, setShopData] = useState(() => 
    loadFromStorage('poke_shopData', {
      items: [],
      refreshInterval: 86400000, // 24시간 (밀리초)
      lastRefresh: Date.now()
    })
  );

  useEffect(() => { 
    saveToStorage('poke_shopData', shopData); 
  }, [shopData]);

  const updateShopData = (newShopData) => {
    setShopData(newShopData);
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
    
    const itemData = allItems.find(i => 
      i.id === item.itemId || i.name === item.name
    );
    
    if (!itemData || !itemData.canSell) {
      alert('이 아이템은 판매할 수 없습니다!');
      return false;
    }
    
    const sellPrice = itemData.sellPrice || Math.floor((itemData.cost || 0) * 0.5);
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
    
    alert(`${item.name} ${count}개를 ₽${totalPrice.toLocaleString()}에 판매했습니다!`);
    return true;
  };

  return {
    shopData,
    updateShopData,
    sellItem
  };
};