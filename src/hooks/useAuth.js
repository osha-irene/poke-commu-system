// src/hooks/useAuth.js - 전체 코드

import { useState, useEffect } from 'react';

// ⭐⭐⭐ 엔트리를 항상 6자리로 패딩하는 헬퍼 함수
const ensurePartyPadding = (caughtPokemon) => {
  console.log('🔧 ensurePartyPadding 호출됨');
  console.log('🔧 입력 배열:', caughtPokemon);
  
  if (!caughtPokemon || caughtPokemon.length === 0) {
    console.log('🔧 포켓몬 없음 - 6개 null 반환');
    return [null, null, null, null, null, null];
  }
  
  // ⭐⭐⭐ 문자열 'null'을 실제 null로 변환
  const cleanedPokemon = caughtPokemon.map(p => {
    if (p === 'null' || p === null || p === undefined) {
      return null;
    }
    return p;
  });
  
  console.log('🔧 정리된 배열:', cleanedPokemon.map((p, i) => `[${i}] ${p?.name || 'null'}`));
  
  // 엔트리(0-5)와 박스(6~) 분리
  const party = cleanedPokemon.slice(0, 6);
  const box = cleanedPokemon.slice(6);
  
  console.log('🔧 분리된 엔트리:', party.map((p, i) => `[${i}] ${p?.name || 'null'}`));
  console.log('🔧 분리된 박스:', box.map((p, i) => `[${i}] ${p?.name || 'null'}`));
  
  // 엔트리를 6자리로 패딩
  while (party.length < 6) {
    party.push(null);
  }
  
  console.log('🔧 패딩 후 엔트리:', party.map((p, i) => `[${i}] ${p?.name || 'null'}`));
  
  // 엔트리(6자리) + 박스 결합
  const result = [...party, ...box];
  console.log('🔧 최종 결과:', result.map((p, i) => `[${i}] ${p?.name || 'null'}`));
  
  return result;
};

export const useAuth = (members, setMembers) => {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUserId = localStorage.getItem('poke_currentUserId');
      if (!savedUserId) return null;
      
      const user = members[savedUserId];
      if (!user) {
        localStorage.removeItem('poke_currentUserId');
        return null;
      }
      
      console.log('🔐 초기 로드 - 원본 유저:', user.name);
      console.log('🔐 원본 caughtPokemon:', user.caughtPokemon?.map((p, i) => `[${i}] ${p?.name || 'null'}`));
      
      // ⭐⭐⭐ 로그인 시 엔트리 패딩 적용
      const paddedUser = {
        ...user,
        caughtPokemon: ensurePartyPadding(user.caughtPokemon || [])
      };
      
      console.log('🔐 패딩 후:', paddedUser.caughtPokemon?.map((p, i) => `[${i}] ${p?.name || 'null'}`));
      
      return paddedUser;
    } catch (error) {
      console.error('로그인 상태 복원 실패:', error);
      localStorage.removeItem('poke_currentUserId');
      return null;
    }
  });

  const handleLogin = (userId, password) => {
    const member = members[userId];
    if (member && member.password === password) {
      console.log('🔑 로그인 시도:', member.name);
      console.log('🔑 원본 caughtPokemon:', member.caughtPokemon?.map((p, i) => `[${i}] ${p?.name || 'null'}`));
      
      // ⭐⭐⭐ 로그인 시 엔트리 패딩 적용
      const paddedMember = {
        ...member,
        caughtPokemon: ensurePartyPadding(member.caughtPokemon || [])
      };
      
      console.log('🔑 패딩 후:', paddedMember.caughtPokemon?.map((p, i) => `[${i}] ${p?.name || 'null'}`));
      
      setCurrentUser(paddedMember);
      localStorage.setItem('poke_currentUserId', userId);
      
      // ⭐ localStorage에도 패딩된 버전 저장
      setMembers(prev => ({
        ...prev,
        [userId]: paddedMember
      }));
      
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('poke_currentUserId');
    window.location.reload();
  };

  const updateCurrentUser = (updates) => {
    if (!currentUser) {
      return;
    }
    
    console.log('📝 updateCurrentUser 호출됨');
    console.log('📝 업데이트 내용:', updates);
    
    // ⭐ setMembers를 함수형으로 호출해서 최신 상태 보장
    setMembers(prevMembers => {
      const latestUser = prevMembers[currentUser.id] || currentUser;
      
      let updatedUser = {
        ...latestUser,
        ...updates,
        // ⭐ caughtPokemon이 있으면 새 배열로 완전 교체
        ...(updates.caughtPokemon ? { caughtPokemon: [...updates.caughtPokemon] } : {})
      };
      
      // ⭐⭐⭐ caughtPokemon 업데이트 시 항상 패딩 확인
      if (updates.caughtPokemon) {
        console.log('📝 caughtPokemon 업데이트 감지');
        console.log('📝 업데이트 전:', updates.caughtPokemon.map((p, i) => `[${i}] ${p?.name || 'null'}`));
        
        updatedUser.caughtPokemon = ensurePartyPadding(updates.caughtPokemon);
        
        console.log('📝 패딩 후:', updatedUser.caughtPokemon.map((p, i) => `[${i}] ${p?.name || 'null'}`));
      }
      
      // ⭐ currentUser도 동일한 객체로 업데이트
      setCurrentUser(updatedUser);
      
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
        // ⭐⭐⭐ 동기화 시에도 패딩 적용
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
    updateCurrentUser
  };
};