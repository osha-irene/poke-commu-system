

export const getAllShopItems = (shopData) => {
  const items = [];
  
  Object.entries(shopData.dailyItems || {}).forEach(([day, dayItems]) => {
    dayItems.forEach(item => {
      items.push({ ...item, type: 'daily', day });
    });
  });
  
  (shopData.permanentItems || []).forEach(item => {
    items.push({ ...item, type: 'permanent' });
  });
  
  if (shopData.rareItemConfig?.enabled && shopData.rareDailyItem?.itemId) {
  items.push({
    ...shopData.rareDailyItem,
    type: 'rare',
    stock: 1
  });
}

  if (shopData.periodItemConfig?.enabled && shopData.periodItem?.itemId) {
    items.push({
      ...shopData.periodItem,
      type: 'period'
    });
  }

  return items;
};

export const getFilteredShopItems = (shopData, filterDay) => {
  const items = getAllShopItems(shopData);
  let filtered = items;

  if (filterDay !== 'all') {
    filtered = items.filter(item => {
      if (item.type === 'daily') return item.day === filterDay;
      return item.type === 'permanent' || item.type === 'rare' || item.type === 'period';
    });
  }

  return filtered.sort((a, b) => {
    const typeOrder = { rare: 0, period: 1, daily: 2, permanent: 3 };
    return typeOrder[a.type] - typeOrder[b.type];
  });
};