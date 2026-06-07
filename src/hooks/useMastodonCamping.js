import { useState, useEffect } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { database } from '../firebase';

/**
 * 캠핑 세션 실시간 동기화 훅
 * 마스토돈에서 업데이트된 캠핑 세션을 실시간으로 가져옴
 */
export function useMastodonCamping(userId) {
  const [mySessions, setMySessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setMySessions([]);
      setIsLoading(false);
      return;
    }

    const sessionsRef = ref(database, 'community/campingSessions');
    
    const unsubscribe = onValue(sessionsRef, (snapshot) => {
      if (snapshot.exists()) {
        const sessions = Object.entries(snapshot.val())
          .map(([key, session]) => ({
            ...session,
            firebaseKey: key
          }))
          .filter(session => session.memberId === userId)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // 최신순 정렬
        
        setMySessions(sessions);
      } else {
        setMySessions([]);
      }
      
      setIsLoading(false);
    });

    return () => off(sessionsRef, 'value', unsubscribe);
  }, [userId]);

  return {
    mySessions,
    isLoading
  };
}