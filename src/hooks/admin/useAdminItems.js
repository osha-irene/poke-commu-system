// src/hooks/admin/useAdminItems.js
// 아이템 관리 전용 훅

import { ref, get, set, runTransaction } from 'firebase/database';
import { database } from '../../firebase';

export const useAdminItems = (
  currentUser,
  members,
  setMembers,
  updateCurrentUser,
  allItems,
  updateInventory
) => {
  const canManageItems = () => Boolean(
    currentUser?.isAdmin ||
    currentUser?.isSuperAdmin ||
    currentUser?.canManageItems
  );

  // 특정 회원의 인벤토리를 항상 Firebase의 최신 값 기준으로 병합하는 트랜잭션 헬퍼.
  // 대상이 본인이면 useAuth의 updateInventory(로컬 currentUser 상태까지 동기화)를 그대로 재사용하고,
  // 다른 회원이면 members/{memberId}/inventory에 직접 트랜잭션을 걸어 members 상태만 갱신한다.
  const applyInventoryMutation = async (memberId, mutate) => {
    if (memberId === currentUser?.id) {
      return updateInventory(mutate);
    }

    const inventoryRef = ref(database, `members/${memberId}/inventory`);
    const result = await runTransaction(inventoryRef, (currentInventory) => {
      const next = mutate(currentInventory || []);
      if (next === undefined) return; // 트랜잭션 중단
      return JSON.parse(JSON.stringify(next, (key, value) => (value === undefined ? null : value)));
    });

    if (result.committed) {
      const newInventory = result.snapshot.val() || [];
      setMembers(prev => (
        prev[memberId]
          ? { ...prev, [memberId]: { ...prev[memberId], inventory: newInventory } }
          : prev
      ));
    }

    return result;
  };

  const buildInventoryAddMutator = (item, count) => (inventory) => {
    const existingItem = inventory.find(i =>
      i.itemId === item.id || i.name === item.name
    );

    return existingItem
      ? inventory.map(i =>
          (i.itemId === item.id || i.name === item.name)
            ? { ...i, count: i.count + count }
            : i
        )
      : [
          ...inventory,
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
  };

  // ========== 자신에게 아이템 추가 ==========
  const addItemToSelf = async (item, count) => {
    if (!currentUser) {
      alert('사용자 정보를 불러올 수 없습니다!');
      return;
    }

    if (!canManageItems()) {
      alert('아이템 관리 권한이 없습니다!');
      return;
    }

    const result = await applyInventoryMutation(currentUser.id, buildInventoryAddMutator(item, count));

    if (!result.committed) {
      alert('아이템 추가 중 오류가 발생했습니다!');
      return;
    }
    alert(`${item.name} ${count}개를 추가했습니다!`);
  };

  // ========== 회원에게 아이템 지급 ==========
  const giveItemToMember = async (memberId, item, count) => {
    if (!canManageItems()) return;

    const member = members[memberId];
    if (!member) return;

    const result = await applyInventoryMutation(memberId, buildInventoryAddMutator(item, count));

    if (!result.committed) {
      alert('아이템 지급 중 오류가 발생했습니다!');
      return;
    }

    alert(`${member.name}님에게 ${item.name} ${count}개를 지급했습니다!`);
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

    const result = await applyInventoryMutation(memberId, (inventory) => (
      inventory.filter(i => i.name !== itemName)
    ));

    if (!result.committed) {
      alert('아이템 삭제 중 오류가 발생했습니다!');
    }
  };

  // ========== 회원 아이템 갯수 조정 ==========
  const adjustMemberItemCount = async (memberId, itemName, newCount) => {
    if (!canManageItems()) return;
    const member = members[memberId];
    if (!member) return;

    const result = await applyInventoryMutation(memberId, (inventory) => (
      newCount <= 0
        ? inventory.filter(i => i.name !== itemName)
        : inventory.map(i => i.name === itemName ? { ...i, count: newCount } : i)
    ));

    if (!result.committed) {
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
