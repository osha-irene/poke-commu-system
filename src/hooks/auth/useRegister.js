// src/hooks/auth/useRegister.js
// 회원가입 로직 훅

import { createUserWithEmailAndPassword } from 'firebase/auth';
import { ref, set } from 'firebase/database';
import { auth, database } from '../../firebase';

export function useRegister(setMembers) {
  const handleRegister = async (userId, password, name) => {
    try {
      console.log('회원가입 시작:', userId);
      
      const email = `${userId}@pokemon.com`;
      
      // Firebase Auth에 계정 생성
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUid = userCredential.user.uid;
      console.log('Auth 계정 생성 완료:', firebaseUid);
      
      // Realtime Database에 회원 데이터 저장
      const memberRef = ref(database, `members/${firebaseUid}`);
      const newMemberData = {
        name: name,
        email: email,
        isAdmin: false,
        isSuperAdmin: false,
        canManageItems: false,
        dailyWalks: 10,
        maxDailyWalks: 10,
        money: 10000,
        trainerExp: 0,
        lastAttendanceDate: null,
        caughtPokemon: [null, null, null, null, null, null],
        inventory: [
          {
            itemId: 4,
            name: '몬스터볼',
            count: 15,
            imageUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png'
          }
        ],
        createdAt: new Date().toISOString()
      };
      
      await set(memberRef, newMemberData);
      console.log('Database 저장 완료:', firebaseUid);
      
      // members state에 추가 (즉시 반영)
      if (setMembers) {
        setMembers(prev => ({
          ...prev,
          [firebaseUid]: {
            ...newMemberData,
            id: firebaseUid
          }
        }));
      }
      
      alert(`회원가입 완료!\n\n아이디: ${userId}\n이름: ${name}\n\n로그인해주세요!`);
      return true;
      
    } catch (error) {
      console.error('회원가입 오류:', error);
      
      if (error.code === 'auth/email-already-in-use') {
        alert('이미 사용 중인 아이디입니다.');
      } else if (error.code === 'auth/weak-password') {
        alert('비밀번호는 6자 이상이어야 합니다.');
      } else if (error.code === 'auth/invalid-email') {
        alert('유효하지 않은 이메일 형식입니다.');
      } else {
        alert(`회원가입 중 오류가 발생했습니다.\n${error.message}`);
      }
      
      return false;
    }
  };

  return { handleRegister };
}

export default useRegister;
