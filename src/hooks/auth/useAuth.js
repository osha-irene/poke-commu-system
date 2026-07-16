// src/hooks/useAuth.js - 실시간 리스너 제거 버전
// onValue 리스너를 제거하고 로그인 시에만 데이터 로드

import { useState, useEffect } from 'react';
import { ref, get, onChildChanged, onChildRemoved, update, runTransaction } from 'firebase/database';
import { 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updatePassword
} from 'firebase/auth';
import { auth, database } from '../../firebase';
import { fillMissingBaseStats, findPokemonTemplate } from '../../utils/pokemonBaseStats';
import { getAbilityEnglishName } from '../../utils/abilityUtils';
import { DEFAULT_IVS, withNormalizedIVs } from '../../utils/pokemonIndividualValues';
import { toMemberSummary, toMemberParty } from '../../utils/memberViewData';

const ensurePartyPadding = (caughtPokemon, allPokemonMaster = []) => {
  if (caughtPokemon && typeof caughtPokemon === 'object' && !Array.isArray(caughtPokemon)) {
    const numericKeys = Object.keys(caughtPokemon)
      .map(key => Number(key))
      .filter(key => Number.isInteger(key) && key >= 0);
    const maxIndex = numericKeys.length > 0 ? Math.max(...numericKeys) : -1;

    caughtPokemon = Array.from({ length: Math.max(6, maxIndex + 1) }, (_, index) => (
      Object.prototype.hasOwnProperty.call(caughtPokemon, index) ? caughtPokemon[index] : null
    ));
  }
  
  if (!caughtPokemon || !Array.isArray(caughtPokemon) || caughtPokemon.length === 0) {
    return [null, null, null, null, null, null];
  }
  
  const cleanedPokemon = caughtPokemon.map(p => {
    if (p === 'null' || p === null || p === undefined) return null;
    const template = findPokemonTemplate(p, allPokemonMaster);
    if (!template) return withNormalizedIVs(p, DEFAULT_IVS);
    return withNormalizedIVs(fillMissingBaseStats({
      ...p,
      nameEn: p.nameEn || template.nameEn,
      abilityEn: p.abilityEn || getAbilityEnglishName(p.ability) || template.abilitiesEn?.[0] || null
    }, template), DEFAULT_IVS);
  });
  
  const party = cleanedPokemon.slice(0, 6);
  const box = cleanedPokemon.slice(6);
  
  while (party.length < 6) {
    party.push(null);
  }
  
  return [...party, ...box];
};

export const useAuth = (members, setMembers, allPokemonMaster = []) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    let isSubscribed = true;
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!isSubscribed) return;
      
      if (firebaseUser) {
        console.log('🔐 Auth 상태 변경 감지:', firebaseUser.uid);
        
        // ⭐ 로그인 시 한 번만 데이터 로드 (실시간 리스너 제거)
        try {
          const directMemberRef = ref(database, `members/${firebaseUser.uid}`);
          let snapshot = await get(directMemberRef);
          let memberId = firebaseUser.uid;

          if (!snapshot.exists()) {
            const membersSnapshot = await get(ref(database, 'members'));
            const allMembers = membersSnapshot.val() || {};
            const matchedEntry = Object.entries(allMembers).find(([, member]) => (
              member?.authUid === firebaseUser.uid ||
              (firebaseUser.email && member?.email === firebaseUser.email)
            ));

            if (matchedEntry) {
              [memberId] = matchedEntry;
              snapshot = { exists: () => true, val: () => matchedEntry[1] };
            }
          }

          if (snapshot.exists() && isSubscribed) {
            const memberData = snapshot.val();
            const paddedUser = {
              ...memberData,
              id: memberId,
              authUid: firebaseUser.uid,
              email: firebaseUser.email,
              caughtPokemon: ensurePartyPadding(memberData.caughtPokemon || [], allPokemonMaster),
              partnerPokemon: withNormalizedIVs(memberData.partnerPokemon, DEFAULT_IVS)
            };
            
            console.log('✅ 회원 데이터 로드:', paddedUser.name);
            
            setCurrentUser(paddedUser);
            
            setMembers(prev => ({
              ...prev,
              [memberId]: paddedUser
            }));
            localStorage.setItem('poke_currentUserId', memberId);
          }
        } catch (error) {
          console.error('❌ 데이터 로드 실패:', error);
        }
      } else {
        console.log('🔐 로그아웃 상태');
        setCurrentUser(null);
      }
      
      if (isSubscribed) {
        setIsAuthLoading(false);
      }
    });

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, [allPokemonMaster, setMembers]);

  // 본인 데이터 실시간 감지 (관리자가 다른 화면에서 내 정보를 수정해도 새로고침 없이 즉시 반영)
  useEffect(() => {
    if (!currentUser?.id) return undefined;
    const memberId = currentUser.id;
    const memberRef = ref(database, `members/${memberId}`);
    const normalizeMemberChildValue = (key, value) => {
      if (key === 'caughtPokemon') {
        return ensurePartyPadding(value || [], allPokemonMaster);
      }
      if (key === 'partnerPokemon') {
        return withNormalizedIVs(value, DEFAULT_IVS);
      }
      return value;
    };
    const applyMemberChildUpdate = (key, rawValue) => {
      if (!key || key === 'id' || key === 'authUid' || key === 'email') return;
      const value = normalizeMemberChildValue(key, rawValue);

      setCurrentUser(prev => {
        if (!prev) return prev;
        const merged = { ...prev, [key]: value };
        return JSON.stringify(prev) === JSON.stringify(merged) ? prev : merged;
      });

      setMembers(prevMembers => ({
        ...prevMembers,
        [memberId]: {
          ...(prevMembers[memberId] || {}),
          id: memberId,
          [key]: value,
        }
      }));
    };

    const unsubChanged = onChildChanged(memberRef, (snapshot) => {
      applyMemberChildUpdate(snapshot.key, snapshot.val());
    });
    const unsubRemoved = onChildRemoved(memberRef, (snapshot) => {
      applyMemberChildUpdate(snapshot.key, null);
    });

    return () => {
      unsubChanged();
      unsubRemoved();
    };
  }, [currentUser?.id, allPokemonMaster, setMembers]);

  const handleLogin = async (userId, password) => {
    try {
      const email = `${userId}@pokemon.com`;
      const authPassword = password === '0000' ? '000000' : password;
      const userCredential = await signInWithEmailAndPassword(auth, email, authPassword);

      const firebaseUid = userCredential.user.uid;
      
      console.log('✅ Auth 로그인 성공, UID:', firebaseUid);
      
      localStorage.setItem('poke_currentUserId', firebaseUid);
      
      return true;
      
    } catch (error) {
      console.error('❌ 로그인 오류:', error);
      
      if (error.code === 'auth/invalid-credential' || 
          error.code === 'auth/user-not-found' ||
          error.code === 'auth/wrong-password') {
        alert('아이디 또는 비밀번호가 일치하지 않습니다.');
      } else if (error.code === 'auth/too-many-requests') {
        alert('로그인 시도가 너무 많아 Firebase가 잠시 차단했습니다. 잠시 후 다시 시도해주세요.');
      } else {
        alert(`로그인 중 오류가 발생했습니다.\n${error.code || ''}${error.message ? `\n${error.message}` : ''}`);
      }
      
      return false;
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      localStorage.removeItem('poke_currentUserId');
      console.log('✅ 로그아웃 완료');
    } catch (error) {
      console.error('❌ 로그아웃 오류:', error);
    }
  };

  const updateCurrentUser = async (updates) => {
    if (!currentUser) {
      console.error('❌ currentUser가 없음!');
      return;
    }
    
    console.log('📝 updateCurrentUser 호출됨');
    console.log('📝 업데이트 내용:', updates);

    // ⭐ updateInventory 등 다른 호출이 방금 currentUser를 갱신했을 수 있으므로, 클로저에 갇힌
    // currentUser/members 스냅샷이 아니라 setCurrentUser의 functional update로 "그 시점의 최신" 값 위에
    // updates만 얹는다. 그렇지 않으면 예: 요리 후 재료 차감(updateInventory)이 반영된 직후 이 함수가
    // 오래된 인벤토리를 통째로 되살려버린다.
    let updatedUser;
    setCurrentUser(prev => {
      const latestUser = prev || members[currentUser.id] || currentUser;

      updatedUser = {
        ...latestUser,
        ...updates,
        ...(updates.caughtPokemon ? { caughtPokemon: [...updates.caughtPokemon] } : {})
      };

      // ⭐ members/ 실시간 스냅샷(latestUser)에는 caughtPokemon이 패딩되지 않은 채(심지어 undefined로) 들어올 수 있으므로,
      // updates에 caughtPokemon이 없어도 항상 패딩된 배열로 보정한다 (안 그러면 다음 updateCurrentUser 호출에서
      // currentUser.caughtPokemon이 undefined가 되어 포획 시 TypeError 발생)
      updatedUser.caughtPokemon = ensurePartyPadding(
        updates.caughtPokemon || latestUser.caughtPokemon || currentUser.caughtPokemon,
        allPokemonMaster
      );

      if (updates.partnerPokemon !== undefined) {
        updatedUser.partnerPokemon = withNormalizedIVs(updates.partnerPokemon, DEFAULT_IVS);
      }

      return updatedUser;
    });

    setMembers(prevMembers => ({
      ...prevMembers,
      [currentUser.id]: updatedUser
    }));
    
    // ⭐ 그 다음 Firebase에 저장
    try {
      const dataToSave = { ...updates };
      delete dataToSave.id;
      delete dataToSave.email;
      delete dataToSave.authUid;

      if (updates.caughtPokemon !== undefined) {
        dataToSave.caughtPokemon = updatedUser.caughtPokemon;
      }
      if (updates.partnerPokemon !== undefined) {
        dataToSave.partnerPokemon = updatedUser.partnerPokemon;
      }
      
      const cleanData = JSON.parse(
        JSON.stringify(dataToSave, (key, value) => 
          value === undefined ? null : value
        )
      );
      if (Object.keys(cleanData).length === 0) return;
      
      const memberRef = ref(database, `members/${currentUser.id}`);
      await update(memberRef, cleanData);
      await update(ref(database, `memberSummary/${currentUser.id}`), toMemberSummary(updatedUser, currentUser.id));
      // caughtPokemon/partnerPokemon(용량 큰 상세)은 실제로 바뀐 경우에만 기록 - 그래야 무관한
      // 업데이트(출석/구매 등)마다 접속자 전원에게 파티 상세가 재전송되는 걸 막을 수 있다.
      if (updates.caughtPokemon !== undefined || updates.partnerPokemon !== undefined) {
        await update(ref(database, `memberParty/${currentUser.id}`), toMemberParty(updatedUser, currentUser.id));
      }
      console.log('✅ Firebase 저장 완료');
    } catch (error) {
      console.error('❌ Firebase 저장 실패:', error);
    }
  };

  // ⭐ 인벤토리 전용 트랜잭션 업데이트 - 항상 Firebase의 최신 값을 기준으로 병합되므로
  // 동시에 여러 곳(상점 구매, 아이템 지급/회수, 관리자 지급 등)에서 인벤토리를 바꿔도
  // 마지막 쓰기가 이전 변경을 통째로 덮어쓰는 문제가 없다.
  const updateInventory = async (mutate) => {
    if (!currentUser) {
      console.error('❌ currentUser가 없음!');
      return { committed: false };
    }

    const inventoryRef = ref(database, `members/${currentUser.id}/inventory`);
    const result = await runTransaction(inventoryRef, (currentInventory) => {
      const next = mutate(currentInventory || []);
      if (next === undefined) return; // 트랜잭션 중단
      // Firebase는 undefined 값을 허용하지 않으므로 null로 치환
      return JSON.parse(JSON.stringify(next, (key, value) => (value === undefined ? null : value)));
    });

    if (result.committed) {
      const newInventory = result.snapshot.val() || [];
      setCurrentUser(prev => (prev ? { ...prev, inventory: newInventory } : prev));
      setMembers(prevMembers => (
        prevMembers[currentUser.id]
          ? { ...prevMembers, [currentUser.id]: { ...prevMembers[currentUser.id], inventory: newInventory } }
          : prevMembers
      ));
    }

    return result;
  };

  // ⭐ 보유 포켓몬(caughtPokemon) 전용 트랜잭션 업데이트 - 항상 Firebase의 최신 배열을 기준으로
  // 병합되므로, 짧은 시간 안에 여러 마리를 연달아 잡아도(각 호출이 클로저에 갇힌 옛 배열을 기준으로
  // 통째로 덮어써서) 먼저 잡은 포켓몬이 사라지는 문제가 없다.
  const updateCaughtPokemon = async (mutate) => {
    if (!currentUser) {
      console.error('❌ currentUser가 없음!');
      return { committed: false };
    }

    const caughtRef = ref(database, `members/${currentUser.id}/caughtPokemon`);
    const result = await runTransaction(caughtRef, (currentCaught) => {
      const next = mutate(ensurePartyPadding(currentCaught, allPokemonMaster));
      if (next === undefined) return; // 트랜잭션 중단
      // Firebase는 undefined 값을 허용하지 않으므로 null로 치환
      return JSON.parse(JSON.stringify(next, (key, value) => (value === undefined ? null : value)));
    });

    if (result.committed) {
      const newCaughtPokemon = ensurePartyPadding(result.snapshot.val() || [], allPokemonMaster);
      setCurrentUser(prev => (prev ? { ...prev, caughtPokemon: newCaughtPokemon } : prev));
      setMembers(prevMembers => (
        prevMembers[currentUser.id]
          ? { ...prevMembers, [currentUser.id]: { ...prevMembers[currentUser.id], caughtPokemon: newCaughtPokemon } }
          : prevMembers
      ));
      await update(
        ref(database, `memberParty/${currentUser.id}`),
        toMemberParty({ ...currentUser, caughtPokemon: newCaughtPokemon }, currentUser.id)
      );
    }

    return result;
  };

  // ⭐ 보유 포켓몬 한 마리(파티/박스든 파트너든)를 uniqueId로 찾아 갱신하는 트랜잭션.
  // 아이템을 연달아 사용하거나 기술을 연달아 가르칠 때도 항상 Firebase의 최신 데이터를 기준으로
  // 병합되므로, 먼저 한 변경이 나중 호출에 덮여 사라지는 문제가 없다.
  const updateOwnedPokemonByUniqueId = async (uniqueId, mutate) => {
    if (!currentUser) {
      console.error('❌ currentUser가 없음!');
      return { committed: false };
    }

    const isPartner = currentUser.partnerPokemon?.uniqueId === uniqueId;

    if (isPartner) {
      const partnerRef = ref(database, `members/${currentUser.id}/partnerPokemon`);
      const result = await runTransaction(partnerRef, (currentPartner) => {
        if (!currentPartner) return currentPartner;
        const next = mutate(withNormalizedIVs(currentPartner, DEFAULT_IVS));
        if (next === undefined) return; // 트랜잭션 중단
        return JSON.parse(JSON.stringify(next, (key, value) => (value === undefined ? null : value)));
      });

      if (result.committed) {
        const newPartner = withNormalizedIVs(result.snapshot.val(), DEFAULT_IVS);
        setCurrentUser(prev => (prev ? { ...prev, partnerPokemon: newPartner } : prev));
        setMembers(prevMembers => (
          prevMembers[currentUser.id]
            ? { ...prevMembers, [currentUser.id]: { ...prevMembers[currentUser.id], partnerPokemon: newPartner } }
            : prevMembers
        ));
        await update(
          ref(database, `memberParty/${currentUser.id}`),
          toMemberParty({ ...currentUser, partnerPokemon: newPartner }, currentUser.id)
        );
      }

      return result;
    }

    return updateCaughtPokemon((currentCaught) => {
      const index = currentCaught.findIndex(p => p && p.uniqueId === uniqueId);
      if (index === -1) return currentCaught; // 대상을 못 찾음 - 변경 없이 그대로 둠

      const mutated = mutate(currentCaught[index]);
      if (mutated === undefined) return undefined; // 트랜잭션 중단

      const next = [...currentCaught];
      next[index] = mutated;
      return next;
    });
  };

  const changeCurrentUserPassword = async (newPassword) => {
    if (!auth.currentUser || !currentUser) {
      alert('로그인 정보를 확인할 수 없습니다. 다시 로그인해주세요.');
      return false;
    }

    if (!newPassword || newPassword.length < 6) {
      alert('새 비밀번호는 6자 이상으로 입력해주세요.');
      return false;
    }

    try {
      await updatePassword(auth.currentUser, newPassword);
      await updateCurrentUser({
        forcePasswordChange: false,
        password: null
      });
      return true;
    } catch (error) {
      console.error('❌ 비밀번호 변경 실패:', error);
      if (error.code === 'auth/requires-recent-login') {
        alert('보안을 위해 다시 로그인한 뒤 비밀번호를 변경해주세요.');
      } else {
        alert('비밀번호 변경 중 오류가 발생했습니다.');
      }
      return false;
    }
  };

  return {
    currentUser,
    handleLogin,
    handleLogout,
    updateCurrentUser,
    updateInventory,
    updateCaughtPokemon,
    updateOwnedPokemonByUniqueId,
    changeCurrentUserPassword,
    isLoading: isAuthLoading
  };
};
