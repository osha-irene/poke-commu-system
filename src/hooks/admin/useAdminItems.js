// src/hooks/admin/useAdminItems.js
// 아이템 관리 전용 훅

import { ref, get, set } from 'firebase/database';
import { database } from '../../firebase';

export const useAdminItems = (
  currentUser,
  members,
  setMembers,
  updateCurrentUser,
  allItems
) => {
  const canManageItems = () => Boolean(
    currentUser?.isAdmin ||
    currentUser?.isSuperAdmin ||
    currentUser?.canManageItems
  );

  // ========== 자신에게 아이템 추가 ==========
  const addItemToSelf = (item, count) => {
    if (!currentUser) {
      alert('사용자 정보를 불러올 수 없습니다!');
      return;
    }
    
    if (!canManageItems()) {
      alert('아이템 관리 권한이 없습니다!');
      return;
    }
    
    const existingItem = currentUser.inventory.find(i => 
      i.itemId === item.id || i.name === item.name
    );
    
    const newInventory = existingItem
      ? currentUser.inventory.map(i => 
          (i.itemId === item.id || i.name === item.name)
            ? { ...i, count: i.count + count }
            : i
        )
      : [
          ...currentUser.inventory,
          {
            itemId: item.id,
            name: item.name,
            nameEn: item.nameEn,
            count: count,
            imageUrl: item.spriteUrl || item.imageUrl,
            category: item.category,
            effect: item.effect,
            cost: item.cost,
            sellPrice: item.sellPrice,
            canSell: item.canSell ?? true,
            isCustom: item.isCustom || false
          }
        ];
    
    updateCurrentUser({ inventory: newInventory });
    alert(`${item.name} ${count}개를 추가했습니다!`);
  };

  // ========== 회원에게 아이템 지급 ==========
  const giveItemToMember = async (memberId, item, count) => {
    if (!canManageItems()) return;
    
    const member = members[memberId];
    if (!member) return;
    
    const currentInventory = member.inventory || [];
    
    const existingItem = currentInventory.find(i => 
      i.itemId === item.id || i.name === item.name
    );
    
    const newInventory = existingItem
      ? currentInventory.map(i => 
          (i.itemId === item.id || i.name === item.name)
            ? { ...i, count: i.count + count }
            : i
        )
      : [
          ...currentInventory,
          {
            itemId: item.id,
            name: item.name,
            nameEn: item.nameEn,
            count: count,
            imageUrl: item.spriteUrl || item.imageUrl,
            category: item.category,
            effect: item.effect,
            cost: item.cost,
            sellPrice: item.sellPrice,
            canSell: item.canSell ?? true,
            isCustom: item.isCustom || false
          }
        ];

    const updatedMember = {
      ...member,
      inventory: newInventory
    };
    
    try {
      const { id, email, ...dataToSave } = updatedMember;
      
      const cleanData = JSON.parse(
        JSON.stringify(dataToSave, (key, value) => 
          value === undefined ? null : value
        )
      );
      
      const memberRef = ref(database, `members/${memberId}`);
      await set(memberRef, cleanData);
      
      setMembers(prev => ({
        ...prev,
        [memberId]: updatedMember
      }));
      
      // 본인에게 지급한 경우 currentUser도 업데이트
      if (memberId === currentUser?.id) {
        updateCurrentUser({ inventory: newInventory });
      }
      
      alert(`${member.name}님에게 ${item.name} ${count}개를 지급했습니다!`);
    } catch (error) {
      alert('아이템 지급 중 오류가 발생했습니다!');
    }
  };

  // ========== 커스텀 아이템 생성 ==========
  const createCustomItem = async (itemData, { silent = false } = {}) => {
    if (!canManageItems()) {
      return false;
    }
    
    const newItem = {
      ...itemData,
      id: itemData.id || `custom_${Date.now()}`,
      isCustom: true,
      createdBy: currentUser.name,
      createdAt: new Date().toISOString(),
      pocket: itemData.pocket || itemData.category || 'misc',
    };
    
    try {
      const customItemsRef = ref(database, 'gameData/customItems');
      const snapshot = await get(customItemsRef);
      
      const customItems = snapshot.exists() ? snapshot.val() : [];
      const itemsArray = Array.isArray(customItems) ? customItems : Object.values(customItems || {});
      itemsArray.push(newItem);
      
      await set(customItemsRef, itemsArray);
      if (!silent) alert(`커스텀 아이템 "${itemData.name}"이 생성되었습니다!`);
      return true;
    } catch (error) {
      console.error('❌ 커스텀 아이템 생성 실패:', error);
      alert('커스텀 아이템 생성 중 오류가 발생했습니다!');
      return false;
    }
  };

  const updateCustomItem = async (itemId, updatedFields) => {
    if (!canManageItems()) return false;
    try {
      const customItemsRef = ref(database, 'gameData/customItems');
      const snapshot = await get(customItemsRef);
      const customItems = snapshot.exists() ? snapshot.val() : [];
      const itemsArray = Array.isArray(customItems) ? customItems : Object.values(customItems || {});
      let found = false;
      const updated = itemsArray.map(i => {
        if (i.id !== itemId) return i;
        found = true;
        return { ...i, ...updatedFields };
      });
      if (!found) return false;
      const cleanUpdated = JSON.parse(
        JSON.stringify(updated, (key, value) => value === undefined ? null : value)
      );
      await set(customItemsRef, cleanUpdated);
      return true;
    } catch (error) {
      console.error('커스텀 아이템 수정 실패:', error);
      return false;
    }
  };

  const deleteCustomItem = async (itemId) => {
    if (!canManageItems()) return false;
    try {
      const customItemsRef = ref(database, 'gameData/customItems');
      const snapshot = await get(customItemsRef);
      const customItems = snapshot.exists() ? snapshot.val() : [];
      const itemsArray = Array.isArray(customItems) ? customItems : Object.values(customItems || {});
      const filtered = itemsArray.filter(i => i.id !== itemId);
      await set(customItemsRef, filtered);
      return true;
    } catch (error) {
      console.error('커스텀 아이템 삭제 실패:', error);
      return false;
    }
  };

  // ========== 회원 아이템 삭제 ==========
  const deleteItemFromMember = async (memberId, itemName) => {
    if (!canManageItems()) return;
    const member = members[memberId];
    if (!member) return;
    const newInventory = (member.inventory || []).filter(i => i.name !== itemName);
    const updatedMember = { ...member, inventory: newInventory };
    try {
      const { id, email, ...dataToSave } = updatedMember;
      const cleanData = JSON.parse(JSON.stringify(dataToSave, (k, v) => v === undefined ? null : v));
      await set(ref(database, `members/${memberId}`), cleanData);
      setMembers(prev => ({ ...prev, [memberId]: updatedMember }));
      if (memberId === currentUser?.id) updateCurrentUser({ inventory: newInventory });
    } catch (error) {
      alert('아이템 삭제 중 오류가 발생했습니다!');
    }
  };

  // ========== 회원 아이템 갯수 조정 ==========
  const adjustMemberItemCount = async (memberId, itemName, newCount) => {
    if (!canManageItems()) return;
    const member = members[memberId];
    if (!member) return;
    const newInventory = newCount <= 0
      ? (member.inventory || []).filter(i => i.name !== itemName)
      : (member.inventory || []).map(i => i.name === itemName ? { ...i, count: newCount } : i);
    const updatedMember = { ...member, inventory: newInventory };
    try {
      const { id, email, ...dataToSave } = updatedMember;
      const cleanData = JSON.parse(JSON.stringify(dataToSave, (k, v) => v === undefined ? null : v));
      await set(ref(database, `members/${memberId}`), cleanData);
      setMembers(prev => ({ ...prev, [memberId]: updatedMember }));
      if (memberId === currentUser?.id) updateCurrentUser({ inventory: newInventory });
    } catch (error) {
      alert('아이템 수정 중 오류가 발생했습니다!');
    }
  };

  return {
    addItemToSelf,
    giveItemToMember,
    deleteItemFromMember,
    adjustMemberItemCount,
    createCustomItem,
    updateCustomItem,
    deleteCustomItem,
  };
};
