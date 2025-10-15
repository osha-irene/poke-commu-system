// src/hooks/useAuth.js - 무한 루프 해결 버전

import { useState, useEffect } from 'react';
import { ref, get, set } from 'firebase/database';
import { 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged 
} from 'firebase/auth';
import { auth, database } from '../firebase';

const ensurePartyPadding = (caughtPokemon) => {
  // ⭐ 객체인 경우 배열로 변환
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

  // 🔑 로그인
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
      
      // 2️⃣ Firebase Auth 로그인
      try {
        const email = `${userId}@pokemon.com`;
        await signInWithEmailAndPassword(auth, email, password);
        
        console.log('✅ Auth 로그인 성공');
        
        const paddedUser = {
          ...member,
          id: userId,
          email: email,
          caughtPokemon: ensurePartyPadding(member.caughtPokemon || [])
        };
        
        console.log('✅ 즉시 로그인 처리');
        console.log('✅ isAdmin:', paddedUser.isAdmin);
        console.log('✅ isSuperAdmin:', paddedUser.isSuperAdmin);
        
        setCurrentUser(paddedUser);
        
        setMembers(prev => ({
          ...prev,
          [userId]: paddedUser
        }));
        
        localStorage.setItem('poke_currentUserId', userId);
        
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
    if (!currentUser) {
      console.error('❌ currentUser가 없음!');
      return;
    }
    
    console.log('📝 updateCurrentUser 호출됨');
    console.log('📝 현재 user:', currentUser.name);
    console.log('📝 업데이트 내용:', updates);
    
    // ⭐ members에서 최신 사용자 정보 가져오기
    const latestUser = members[currentUser.id] || currentUser;
    
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
    
    // ⭐ setMembers는 동기 함수로 즉시 실행 (Promise 반환 안 함!)
    setMembers(prevMembers => ({
      ...prevMembers,
      [currentUser.id]: updatedUser
    }));
    
    // ⭐ Firebase 저장은 별도로 처리 (async 작업)
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

  // ⭐ 자동 동기화 useEffect 제거! (무한 루프 원인)
  // members가 업데이트되면 updateCurrentUser를 통해서만 currentUser를 업데이트하도록 함

  return {
    currentUser,
    handleLogin,
    handleLogout,
    updateCurrentUser,
    isLoading: isAuthLoading
  };
};