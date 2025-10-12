import { useState, useEffect } from 'react';

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
      return user;
    } catch (error) {
      console.error('로그인 상태 복원 실패:', error);
      localStorage.removeItem('poke_currentUserId');
      return null;
    }
  });

  const handleLogin = (userId, password) => {
    const member = members[userId];
    if (member && member.password === password) {
      setCurrentUser(member);
      localStorage.setItem('poke_currentUserId', userId);
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
    
    // ⭐ setMembers를 함수형으로 호출해서 최신 상태 보장
    setMembers(prevMembers => {
      const latestUser = prevMembers[currentUser.id] || currentUser;

      
      const updatedUser = {
        ...latestUser,
        ...updates
      };
      
      
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

        setCurrentUser(updatedUser);
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