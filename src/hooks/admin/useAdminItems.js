// src/hooks/admin/useAdminItems.js
// 아이템 관리 전용 훅

import { ref, get, set, runTransaction } from 'firebase/database';
import { database } from '../../firebase';

// 아이템 이름 비교용 정규화: 공백 유무나 유니코드 정규화 형태(NFC/NFD) 차이로 같은
// 이름인데 문자열이 달라 매칭에 실패하는 걸 막는다 (예: "식용얼음" vs "식용 얼음").
const normalizeItemName = (name) => (name || '').normalize('NFC').replace(/\s+/g, '');

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

  const buildInventoryRecord = (item, count) => ({
    itemId: item.id,
    name: item.name,
    nameEn: item.nameEn,
    count,
    imageUrl: item.spriteUrl || item.imageUrl,
    category: item.category,
    pocket: item.pocket,
    effect: item.effect,
    cost: item.cost,
    sellPrice: item.sellPrice,
    canSell: item.canSell ?? true,
    isCustom: item.isCustom || false,
    friendshipBoost: item.friendshipBoost,
    ivBoost: item.ivBoost,
    evBoost: item.evBoost,
    conditionBoost: item.conditionBoost,
    specialEffect: item.specialEffect,
    boostAmount: item.boostAmount
  });

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
      : [...inventory, buildInventoryRecord(item, count)];
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

  // ========== 여러 회원에게 아이템 일괄 지급 ==========
  const bulkGiveItem = async (memberIds, item, count) => {
    if (!canManageItems()) return;

    const targetIds = (memberIds || []).filter(id => members[id]);
    if (targetIds.length === 0) {
      alert('선택한 회원이 없습니다.');
      return;
    }

    let successCount = 0;
    const failedNames = [];

    for (const memberId of targetIds) {
      const result = await applyInventoryMutation(memberId, buildInventoryAddMutator(item, count));
      if (result.committed) {
        successCount += 1;
      } else {
        failedNames.push(members[memberId]?.name || memberId);
      }
    }

    if (failedNames.length > 0) {
      alert(`${successCount}명에게 ${item.name} ${count}개를 지급했습니다.\n실패: ${failedNames.join(', ')}`);
    } else {
      alert(`${successCount}명에게 ${item.name} ${count}개씩 지급했습니다!`);
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

  // itemId가 아직 gameData/customItems에 없으면(= items.json 등 정적 카탈로그에만
  // 존재하는 아이템, 예: 메가스톤) 새 레코드로 추가(업서트)한다. 이렇게 하면 정적
  // 카탈로그 아이템도 이 함수 한 번 호출로 "Firebase에서 관리되는" 아이템으로
  // 전환되고, 이후 buildAllItems의 중복 제거 로직이 정적 버전 대신 이 DB 버전을
  // 노출한다.
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
      if (!found) {
        updated.push({
          ...updatedFields,
          id: itemId,
          isCustom: true,
          createdBy: currentUser?.name || 'admin',
          createdAt: new Date().toISOString(),
        });
      }
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

  // ========== 아이템 보유자 전원 인벤토리에서 일괄 삭제 ==========
  const removeItemFromAllInventories = async (itemId, itemName) => {
    if (!canManageItems()) return { removedCount: 0, failedNames: [] };

    const holderIds = Object.keys(members || {}).filter(memberId => {
      const inventory = members[memberId]?.inventory;
      return Array.isArray(inventory) && inventory.some(i => i.itemId === itemId || i.name === itemName);
    });

    let removedCount = 0;
    const failedNames = [];

    for (const memberId of holderIds) {
      const result = await applyInventoryMutation(memberId, (inventory) => (
        (inventory || []).filter(i => !(i.itemId === itemId || i.name === itemName))
      ));
      if (result.committed) {
        removedCount += 1;
      } else {
        failedNames.push(members[memberId]?.name || memberId);
      }
    }

    return { removedCount, failedNames };
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

  // ========== 아이템 교환 (예: 재료 5개 -> 다른 재료 1개로 변환) ==========
  // deductEntries/giveEntries: [{ name, count }]
  // 차감 대상은 회원 인벤토리에 실제 보유한 수량 안에서만, 지급 대상은 allItems 카탈로그에
  // 존재하는 아이템만 허용한다. 트랜잭션 콜백 내부에서 항상 최신 인벤토리 기준으로
  // 재고 충분 여부를 다시 확인하므로(CLAUDE.md 재화 갱신 규칙), 다른 화면에서 그 사이
  // 인벤토리가 바뀌어도 안전하다 — 부족하면 트랜잭션을 중단하고 아무것도 반영하지 않는다.
  const exchangeMemberItems = async (memberId, deductEntries, giveEntries) => {
    if (!canManageItems()) {
      return { success: false, reason: '아이템 관리 권한이 없습니다.' };
    }
    const member = members[memberId];
    if (!member) {
      return { success: false, reason: '회원 정보를 찾을 수 없습니다.' };
    }
    if (!deductEntries?.length || !giveEntries?.length) {
      return { success: false, reason: '차감/지급 아이템을 입력해주세요.' };
    }

    const resolvedGiveItems = [];
    for (const { name, count } of giveEntries) {
      const target = normalizeItemName(name);
      const catalogItem = allItems.find(i => normalizeItemName(i.name) === target);
      if (!catalogItem) {
        return { success: false, reason: `"${name}" 아이템을 카탈로그에서 찾을 수 없습니다.` };
      }
      resolvedGiveItems.push({ item: catalogItem, count });
    }

    // ⭐ Firebase RTDB 트랜잭션은 해당 경로가 로컬에 캐시돼 있지 않으면 update 함수를
    // 먼저 null(빈 값)로 "추측 호출"한 뒤, 서버의 실제 값과 비교해서 다르면 그 실제 값으로
    // 자동 재시도한다. 문제는 우리가 재고 부족을 판단해 return undefined로 "중단"하는
    // 로직을 쓰고 있다는 것 — 이 추측 호출(빈 배열) 단계에서 바로 중단해버리면 재시도가
    // 아예 일어나지 않아서, 실제로는 재고가 충분해도 "재고 부족"으로 실패한다.
    // 관리자가 다른 회원의 인벤토리를 다룰 때는 members/ 전체를 실시간 리스너가 아니라
    // 최초 1회 get()으로만 읽어오기 때문에(useMembers.js), 이 inventory 경로가 트랜잭션
    // 캐시에 아직 없는 경우가 흔하다. 그래서 트랜잭션을 걸기 전에 실제 서버 값을 한 번
    // get()으로 읽어 캐시를 데우고, 그 진짜 최신값 기준으로 먼저 검증한다.
    const inventoryRef = ref(database, `members/${memberId}/inventory`);
    let liveInventory;
    let liveSnapshotExists;
    let liveSnapshotRaw;
    try {
      const liveSnapshot = await get(inventoryRef);
      liveSnapshotExists = liveSnapshot.exists();
      liveSnapshotRaw = liveSnapshotExists ? liveSnapshot.val() : null;
      liveInventory = Array.isArray(liveSnapshotRaw)
        ? liveSnapshotRaw
        : (liveSnapshotRaw && typeof liveSnapshotRaw === 'object' ? Object.values(liveSnapshotRaw) : []);
    } catch (error) {
      return { success: false, reason: `인벤토리를 불러오지 못했습니다. (${error?.message || error})` };
    }

    for (const { name, count } of deductEntries) {
      const target = normalizeItemName(name);
      const totalOwned = liveInventory.reduce((sum, i) => sum + (normalizeItemName(i?.name) === target ? (i?.count || 0) : 0), 0);
      if (totalOwned < count) {
        // ⭐ 임시 진단 정보 — 원인 파악 후 제거 예정. memberId가 실제로 맞는 경로를
        // 가리키는지, 그 경로에 데이터가 존재하는지, 배열 형태였는지를 함께 보여준다.
        return {
          success: false,
          reason: `"${name}" 재고 부족 (필요 ${count}개, 보유 ${totalOwned}개) [DEBUG memberId=${memberId}, exists=${liveSnapshotExists}, rawType=${Array.isArray(liveSnapshotRaw) ? 'array' : typeof liveSnapshotRaw}, rawLen=${liveInventory.length}]`
        };
      }
    }

    let failReason = null;

    const result = await applyInventoryMutation(memberId, (inventory) => {
      const inv = inventory || [];

      // 커스텀 재료는 과거 itemId 체계가 바뀌면서 같은 이름으로 인벤토리에 항목이
      // 두 개 이상 나뉘어 있을 수 있고("합산" 문제), 공백 유무 등으로 표기가 미묘하게
      // 달라 문자열이 정확히 일치하지 않을 수도 있다(예: "식용얼음" vs "식용 얼음",
      // "대포무노먹물" vs "대포무노 먹물"). 그래서 정규화한 이름으로 비교하고,
      // 첫 항목 하나가 아니라 같은 이름의 항목을 모두 합산해서 재고를 확인한다.
      for (const { name, count } of deductEntries) {
        const target = normalizeItemName(name);
        const totalOwned = inv.reduce((sum, i) => sum + (normalizeItemName(i.name) === target ? (i.count || 0) : 0), 0);
        if (totalOwned < count) {
          failReason = `"${name}" 재고 부족 (필요 ${count}개, 보유 ${totalOwned}개)`;
          return undefined; // 트랜잭션 중단
        }
      }
      failReason = null;

      // 합산 검증을 통과했으니, 이름이 같은 여러 항목에 걸쳐 필요한 만큼 순서대로 차감한다.
      let next = inv.map(i => ({ ...i }));
      for (const { name, count } of deductEntries) {
        const target = normalizeItemName(name);
        let remaining = count;
        next = next.map(i => {
          if (remaining <= 0 || normalizeItemName(i.name) !== target) return i;
          const take = Math.min(i.count || 0, remaining);
          remaining -= take;
          return { ...i, count: (i.count || 0) - take };
        });
      }
      next = next.filter(i => i.count > 0);

      for (const { item, count } of resolvedGiveItems) {
        const targetName = normalizeItemName(item.name);
        const existingIdx = next.findIndex(i => i.itemId === item.id || normalizeItemName(i.name) === targetName);
        next = existingIdx >= 0
          ? next.map((i, idx) => idx === existingIdx ? { ...i, count: i.count + count } : i)
          : [...next, buildInventoryRecord(item, count)];
      }

      return next;
    });

    if (!result.committed) {
      return { success: false, reason: failReason || '교환 처리 중 오류가 발생했습니다.' };
    }

    return { success: true };
  };

  return {
    addItemToSelf,
    giveItemToMember,
    bulkGiveItem,
    deleteItemFromMember,
    adjustMemberItemCount,
    exchangeMemberItems,
    removeItemFromAllInventories,
    createCustomItem,
    updateCustomItem,
    deleteCustomItem,
  };
};
