// src/hooks/useMembers.js - UID 자동 생성 + Database 복구 기능

import { useState, useEffect } from 'react';
import { ref, get, set } from 'firebase/database';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { database, auth } from '../firebase';
import itemsData from '../data/items.json';

export const useMembers = (allPokemonData) => {
  const [members, setMembers] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadMembers = async () => {
      try {
        const membersRef = ref(database, 'members');
        const snapshot = await get(membersRef);
        
        if (snapshot.exists()) {
          const loadedMembers = snapshot.val();
          
          const updated = {};
          Object.keys(loadedMembers).forEach(userId => {
            const member = loadedMembers[userId];
            
            const updatedCaughtPokemon = member.caughtPokemon?.map(pokemon => {
              if (!pokemon) return pokemon;
              if (pokemon.nameEn) return pokemon;
              
              const template = allPokemonData.find(p => 
                p.number === pokemon.number || p.id === pokemon.pokemonId
              );
              
              if (template && template.nameEn) {
                return { ...pokemon, nameEn: template.nameEn };
              }
              
              return pokemon;
            }) || member.caughtPokemon;
            
            updated[userId] = { 
              ...member, 
              id: userId,
              caughtPokemon: updatedCaughtPokemon 
            };
          });
          
          setMembers(updated);
          console.log('✅ Firebase에서 회원 데이터 로드 완료:', Object.keys(updated).length, '명');
        } else {
          // 🔥 초기 회원 자동 생성 (Authentication 확인 포함)
          console.log('🔧 초기 회원 자동 생성 시작...');
          const createdMembers = await createInitialMembersWithAuth();
          
          if (createdMembers && Object.keys(createdMembers).length > 0) {
            setMembers(createdMembers);
            console.log('✅ 초기 회원 생성 완료:', Object.keys(createdMembers).length, '명');
          } else {
            console.error('❌ 초기 회원 생성 실패');
            setMembers({});
          }
        }
      } catch (error) {
        console.error('❌ 회원 데이터 로드 실패:', error);
        setMembers({});
      } finally {
        setIsLoading(false);
      }
    };

    loadMembers();
  }, [allPokemonData]);

  return {
    members,
    setMembers,
    isLoading
  };
};

// 🔥 Authentication + Database 동시 생성 (또는 복구)
async function createInitialMembersWithAuth() {
  const getInitialInventory = () => {
    const findItem = (searchTerms) => {
      return itemsData.items.find(i => 
        searchTerms.some(term => {
          const nameEn = i.nameEn?.toLowerCase().replace(/[éê]/g, 'e');
          const searchTerm = term.toLowerCase().replace(/[éê]/g, 'e');
          return nameEn?.includes(searchTerm) || i.name?.includes(term);
        })
      );
    };

    const pokeBall = findItem(['poke ball', 'pokeball', '몬스터볼']);
    const greatBall = findItem(['great ball', 'super ball', '슈퍼볼', '수퍼볼']);
    const ultraBall = findItem(['ultra ball', 'hyper ball', '하이퍼볼']);
    const rareCandy = findItem(['rare candy', '이상한사탕']);

    return [
      { itemId: pokeBall?.id || 4, name: '몬스터볼', count: 15, imageUrl: pokeBall?.spriteUrl || 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png' },
      { itemId: greatBall?.id || 3, name: '슈퍼볼', count: 5, imageUrl: greatBall?.spriteUrl || 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/great-ball.png' },
      { itemId: ultraBall?.id || 2, name: '하이퍼볼', count: 2, imageUrl: ultraBall?.spriteUrl || 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/ultra-ball.png' },
      { itemId: rareCandy?.id || 50, name: '이상한사탕', count: 3, imageUrl: rareCandy?.spriteUrl || 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/rare-candy.png' }
    ];
  };

  const initialUsers = [
    {
      email: 'admin@pokemon.com',
      password: 'admin123',
      data: {
        name: '관리자',
        email: 'admin@pokemon.com',
        isAdmin: true,
        isSuperAdmin: true,
        canManageItems: true,
        dailyWalks: 10,
        maxDailyWalks: 10,
        money: 50000,
        accessibleRegions: [],
        caughtPokemon: [null, null, null, null, null, null],
        inventory: getInitialInventory()
      }
    },
    {
      email: 'test@pokemon.com',
      password: '1234',
      data: {
        name: '테스트유저',
        email: 'test@pokemon.com',
        isAdmin: false,
        isSuperAdmin: false,
        canManageItems: false,
        dailyWalks: 10,
        maxDailyWalks: 10,
        money: 10000,
        accessibleRegions: [],
        caughtPokemon: [null, null, null, null, null, null],
        inventory: getInitialInventory()
      }
    }
  ];

  const createdMembers = {};

  for (const user of initialUsers) {
    try {
      console.log(`🔐 ${user.data.name} 계정 처리 중...`);
      
      let uid = null;
      
      // 1️⃣ Authentication에 계정 생성 시도
      try {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          user.email,
          user.password
        );
        
        uid = userCredential.user.uid;
        console.log(`✅ Auth 계정 생성 완료: ${uid}`);
        
        // 즉시 로그아웃
        await signOut(auth);
        console.log(`🔓 ${user.data.name} 자동 로그아웃`);
        
      } catch (authError) {
        if (authError.code === 'auth/email-already-in-use') {
          // 2️⃣ 이미 존재하면 → 기존 UID 찾기
          console.log(`⚠️ ${user.data.name} 계정이 Auth에 이미 존재함`);
          console.log(`🔍 Database에서 기존 UID 찾는 중...`);
          
          // 🔥 전체 members 스캔해서 이메일로 UID 찾기
          const membersRef = ref(database, 'members');
          const snapshot = await get(membersRef);
          
          if (snapshot.exists()) {
            const allMembers = snapshot.val();
            uid = Object.keys(allMembers).find(
              id => allMembers[id].email === user.email
            );
            
            if (uid) {
              console.log(`✅ 기존 UID 발견: ${uid}`);
              // 기존 데이터 그대로 사용
              createdMembers[uid] = {
                ...allMembers[uid],
                id: uid
              };
              console.log(`✅ 기존 ${user.data.name} 데이터 로드 완료`);
              continue; // 다음 사용자로
            }
          }
          
          // 3️⃣ Database에도 없으면 → 임시 로그인해서 UID 가져오기
          console.log(`⚠️ Database에 ${user.data.name} 데이터 없음, 복구 시도...`);
          
          try {
            const { signInWithEmailAndPassword } = await import('firebase/auth');
            const tempCredential = await signInWithEmailAndPassword(
              auth,
              user.email,
              user.password
            );
            
            uid = tempCredential.user.uid;
            console.log(`✅ 임시 로그인으로 UID 획득: ${uid}`);
            
            // 즉시 로그아웃
            await signOut(auth);
            
          } catch (loginError) {
            console.error(`❌ ${user.data.name} 로그인 실패:`, loginError);
            console.log(`💡 Firebase Console에서 ${user.email} 계정을 삭제하고 다시 시도하세요`);
            continue; // 다음 사용자로
          }
          
        } else {
          console.error(`❌ ${user.data.name} Auth 생성 실패:`, authError);
          continue; // 다음 사용자로
        }
      }
      
      // 4️⃣ UID가 확보되면 Database에 저장
      if (uid) {
        const memberRef = ref(database, `members/${uid}`);
        await set(memberRef, user.data);
        console.log(`✅ Database 저장 완료: ${user.data.name} (${uid})`);
        
        createdMembers[uid] = {
          ...user.data,
          id: uid
        };
      }
      
    } catch (error) {
      console.error(`❌ ${user.data.name} 처리 중 오류:`, error);
    }
  }
  
  console.log('🎉 초기 회원 처리 완료!');
  console.log(`📊 생성/복구된 회원: ${Object.keys(createdMembers).length}명`);
  
  return createdMembers;
}