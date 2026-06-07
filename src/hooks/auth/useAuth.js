// src/hooks/useAuth.js - 실시간 리스너 제거 버전
// onValue 리스너를 제거하고 로그인 시에만 데이터 로드

import { useState, useEffect } from 'react';
import { ref, get, set } from 'firebase/database';
import { 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged 
} from 'firebase/auth';
import { auth, database } from '../../firebase';

const ensurePartyPadding = (caughtPokemon) => {
  if (caughtPokemon && typeof caughtPokemon === 'object' && !Array.isArray(caughtPokemon)) {
    caughtPokemon = Object.values(caughtPokemon);
  }
  
  if (!caughtPokemon || !Array.isArray(caughtPokemon) || caughtPokemon.length === 0) {
    return [null, null, null, null, null, null];
  }
  
  const cleanedPokemon = caughtPokemon.map(p => 
    (p === 'null' || p === null || p === undefined) ? null : p
  );
  
  const party = cleanedPokemon.slice(0, 6);
  const box = cleanedPokemon.slice(6);
  
  while (party.length < 6) {
    party.push(null);
  }
  
  return [...party, ...box];
};

export const useAuth = (members, setMembers) => {
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
              caughtPokemon: ensurePartyPadding(memberData.caughtPokemon || [])
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
  }, [setMembers]);

  const handleLogin = async (userId, password) => {
    try {
      const email = `${userId}@pokemon.com`;
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
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
      updatedUser.caughtPokemon = ensurePartyPadding(updates.caughtPokemon);
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

  return {
    currentUser,
    handleLogin,
    handleLogout,
    updateCurrentUser,
    isLoading: isAuthLoading
  };
};