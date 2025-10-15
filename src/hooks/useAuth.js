// src/hooks/useAuth.js - 아이디/비밀번호 전용 버전 (수정됨)

import { useState, useEffect } from 'react';
import { ref, get, set } from 'firebase/database';
import { 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged 
} from 'firebase/auth';
import { auth, database } from '../firebase';

const ensurePartyPadding = (caughtPokemon) => {
  if (!caughtPokemon || caughtPokemon.length === 0) {
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

  // 🔥 Firebase Auth 상태 감지
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        console.log('🔐 Auth 상태 변경 감지:', firebaseUser.uid);
        
        try {
          const memberRef = ref(database, `members/${firebaseUser.uid}`);
          const snapshot = await get(memberRef);
          
          if (snapshot.exists()) {
            const memberData = snapshot.val();
            const paddedUser = {
              ...memberData,
              id: firebaseUser.uid,
              email: firebaseUser.email,
              caughtPokemon: ensurePartyPadding(memberData.caughtPokemon || [])
            };
            
            console.log('✅ 회원 데이터 로드:', paddedUser.name);
            console.log('✅ isAdmin:', paddedUser.isAdmin);
            console.log('✅ isSuperAdmin:', paddedUser.isSuperAdmin);
            
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
      
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, [setMembers]);

  // 🔑 로그인 - Auth만 처리, onAuthStateChanged가 데이터 설정
  const handleLogin = async (userId, password) => {
    try {
      // 1️⃣ Firebase Database에서 회원 존재 확인
      const memberRef = ref(database, `members/${userId}`);
      const snapshot = await get(memberRef);
      
      if (!snapshot.exists()) {
        alert('존재하지 않는 회원입니다.');
        return false;
      }
      
      const member = snapshot.val();
      console.log('🔐 로그인 시도:', member.name);
      
      // 2️⃣ Firebase Auth 로그인 (이후 onAuthStateChanged가 자동으로 데이터 설정)
      try {
        const email = `${userId}@pokemon.com`;
        await signInWithEmailAndPassword(auth, email, password);
        
        console.log('✅ Auth 로그인 성공 - onAuthStateChanged가 데이터 설정 중...');
        return true;
        
      } catch (error) {
        console.error('❌ Auth 로그인 오류:', error);
        
        if (error.code === 'auth/invalid-credential' || 
            error.code === 'auth/user-not-found' ||
            error.code === 'auth/wrong-password') {
          alert('아이디 또는 비밀번호가 일치하지 않습니다.');
        } else {
          alert('로그인 중 오류가 발생했습니다.');
        }
        
        return false;
      }
    } catch (error) {
      console.error('❌ Firebase Database 조회 실패:', error);
      alert('로그인 중 오류가 발생했습니다.');
      return false;
    }
  };

  // 🔓 로그아웃
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      localStorage.removeItem('poke_currentUserId');
      window.location.reload();
      console.log('✅ 로그아웃 완료');
    } catch (error) {
      console.error('❌ 로그아웃 오류:', error);
    }
  };

  // 회원 데이터 업데이트
  const updateCurrentUser = async (updates) => {
    if (!currentUser) return;
    
    console.log('📝 updateCurrentUser 호출됨');
    console.log('📝 업데이트 내용:', updates);
    
    setMembers(async prevMembers => {
      const latestUser = prevMembers[currentUser.id] || currentUser;
      
      let updatedUser = {
        ...latestUser,
        ...updates,
        ...(updates.caughtPokemon ? { caughtPokemon: [...updates.caughtPokemon] } : {})
      };
      
      // caughtPokemon 업데이트 시 패딩 확인
      if (updates.caughtPokemon) {
        console.log('📝 caughtPokemon 업데이트 감지');
        updatedUser.caughtPokemon = ensurePartyPadding(updates.caughtPokemon);
      }
      
      setCurrentUser(updatedUser);
      
      // Firebase 저장
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
      
      return {
        ...prevMembers,
        [currentUser.id]: updatedUser
      };
    });
  };

  // 사용자 정보 자동 동기화
  useEffect(() => {
    if (currentUser && currentUser.id) {
      const updatedUser = members[currentUser.id];
      if (updatedUser && JSON.stringify(updatedUser) !== JSON.stringify(currentUser)) {
        console.log('🔄 자동 동기화 감지');
        const paddedUser = {
          ...updatedUser,
          caughtPokemon: ensurePartyPadding(updatedUser.caughtPokemon || [])
        };
        setCurrentUser(paddedUser);
      }
    }
  }, [members, currentUser]);

  return {
    currentUser,
    handleLogin,
    handleLogout,
    updateCurrentUser,
    isAuthLoading
  };
};