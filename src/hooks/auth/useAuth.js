// src/hooks/useAuth.js - 실시간 리스너 제거 버전
// onValue 리스너를 제거하고 로그인 시에만 데이터 로드

import { useState, useEffect } from 'react';
import { ref, get, set, onValue } from 'firebase/database';
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
          const memberRef = ref(database, `members/${firebaseUser.uid}`);
          const snapshot = await get(memberRef);
          
          if (snapshot.exists() && isSubscribed) {
            const memberData = snapshot.val();
            const paddedUser = {
              ...memberData,
              id: firebaseUser.uid,
              email: firebaseUser.email,
              caughtPokemon: ensurePartyPadding(memberData.caughtPokemon || [], allPokemonMaster),
              partnerPokemon: withNormalizedIVs(memberData.partnerPokemon, DEFAULT_IVS)
            };
            
            console.log('✅ 회원 데이터 로드:', paddedUser.name);
            
            setCurrentUser(paddedUser);
            
            setMembers(prev => ({
              ...prev,
              [firebaseUser.uid]: paddedUser
            }));
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

  // egg 필드 실시간 감지 (어드민이 캠핑 결과 반영 시 즉시 반영)
  useEffect(() => {
    if (!currentUser?.id) return;
    const eggRef = ref(database, `members/${currentUser.id}/egg`);
    const unsub = onValue(eggRef, (snapshot) => {
      const egg = snapshot.val() || null;
      setCurrentUser(prev => {
        if (!prev) return prev;
        if (prev.egg === egg) return prev;
        return { ...prev, egg };
      });
    });
    return () => unsub();
  }, [currentUser?.id]);

  const handleLogin = async (userId, password) => {
    try {
      const email = `${userId}@pokemon.com`;
      let userCredential;

      try {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } catch (error) {
        if (
          password === '0000' &&
          (error.code === 'auth/invalid-credential' ||
            error.code === 'auth/user-not-found' ||
            error.code === 'auth/wrong-password')
        ) {
          userCredential = await signInWithEmailAndPassword(auth, email, '000000');
        } else {
          throw error;
        }
      }

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
      } else {
        alert('로그인 중 오류가 발생했습니다.');
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
    
    const latestUser = members[currentUser.id] || currentUser;
    
    let updatedUser = {
      ...latestUser,
      ...updates,
      ...(updates.caughtPokemon ? { caughtPokemon: [...updates.caughtPokemon] } : {})
    };
    
    if (updates.caughtPokemon) {
      updatedUser.caughtPokemon = ensurePartyPadding(updates.caughtPokemon, allPokemonMaster);
    }

    if (updates.partnerPokemon !== undefined) {
      updatedUser.partnerPokemon = withNormalizedIVs(updates.partnerPokemon, DEFAULT_IVS);
    }
    
    // ⭐ 로컬 상태 먼저 업데이트
    setCurrentUser(updatedUser);
    
    setMembers(prevMembers => ({
      ...prevMembers,
      [currentUser.id]: updatedUser
    }));
    
    // ⭐ 그 다음 Firebase에 저장
    try {
      const { id, email, ...dataToSave } = updatedUser;
      
      const cleanData = JSON.parse(
        JSON.stringify(dataToSave, (key, value) => 
          value === undefined ? null : value
        )
      );
      
      const memberRef = ref(database, `members/${currentUser.id}`);
      await set(memberRef, cleanData);
      console.log('✅ Firebase 저장 완료');
    } catch (error) {
      console.error('❌ Firebase 저장 실패:', error);
    }
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
    changeCurrentUserPassword,
    isLoading: isAuthLoading
  };
};
