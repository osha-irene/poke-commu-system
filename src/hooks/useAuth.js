// src/hooks/useAuth.js - 로그인 경로 수정 버전

import { useState, useEffect } from 'react';
import { ref, get, set } from 'firebase/database';
import { 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged 
} from 'firebase/auth';
import { auth, database } from '../firebase';

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

  // 🔑 로그인 (수정됨!)
  const handleLogin = async (userId, password) => {
    try {
      // 1️⃣ Firebase Auth 먼저 로그인
      const email = `${userId}@pokemon.com`;
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUid = userCredential.user.uid;
      
      console.log('✅ Auth 로그인 성공, UID:', firebaseUid);
      
      // 2️⃣ UID로 Database에서 회원 데이터 가져오기
      const memberRef = ref(database, `members/${firebaseUid}`);
      const snapshot = await get(memberRef);
      
      if (!snapshot.exists()) {
        console.error('❌ Database에 회원 데이터 없음');
        alert('회원 데이터가 존재하지 않습니다.');
        await signOut(auth);
        return false;
      }
      
      const member = snapshot.val();
      console.log('🔐 로그인 완료:', member.name);
      
      const paddedUser = {
        ...member,
        id: firebaseUid,
        email: email,
        caughtPokemon: ensurePartyPadding(member.caughtPokemon || [])
      };
      
      setCurrentUser(paddedUser);
      
      setMembers(prev => ({
        ...prev,
        [firebaseUid]: paddedUser
      }));
      
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
      window.location.reload();
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
    console.log('📝 현재 user:', currentUser.name);
    console.log('📝 업데이트 내용:', updates);
    
    const latestUser = members[currentUser.id] || currentUser;
    
    let updatedUser = {
      ...latestUser,
      ...updates,
      ...(updates.caughtPokemon ? { caughtPokemon: [...updates.caughtPokemon] } : {})
    };
    
    if (updates.caughtPokemon) {
      console.log('📝 caughtPokemon 업데이트 감지');
      updatedUser.caughtPokemon = ensurePartyPadding(updates.caughtPokemon);
    }
    
    setCurrentUser(updatedUser);
    
    setMembers(prevMembers => ({
      ...prevMembers,
      [currentUser.id]: updatedUser
    }));
    
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