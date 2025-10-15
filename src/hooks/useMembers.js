// src/hooks/useMembers.js - Firebase 버전

import { useState, useEffect } from 'react';
import { ref, get, set } from 'firebase/database';
import { database } from '../firebase';
import itemsData from '../data/items.json';

export const useMembers = (allPokemonData) => {
  const [members, setMembers] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // 🔥 Firebase에서 회원 데이터 로드
  useEffect(() => {
    const loadMembers = async () => {
      try {
        const membersRef = ref(database, 'members');
        const snapshot = await get(membersRef);
        
        if (snapshot.exists()) {
          const loadedMembers = snapshot.val();
          
          // nameEn 업데이트
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
              id: userId, // ID 추가
              caughtPokemon: updatedCaughtPokemon 
            };
          });
          
          setMembers(updated);
          console.log('✅ Firebase에서 회원 데이터 로드 완료:', Object.keys(updated));
        } else {
          // 초기 회원 데이터 생성
          console.log('🔧 초기 회원 데이터 생성 중...');
          const initialMembers = createInitialMembers();
          await set(membersRef, initialMembers);
          
          // ID 추가해서 state에 저장
          const membersWithId = {};
          Object.keys(initialMembers).forEach(userId => {
            membersWithId[userId] = { ...initialMembers[userId], id: userId };
          });
          
          setMembers(membersWithId);
          console.log('✅ 초기 회원 데이터 생성 완료');
        }
      } catch (error) {
        console.error('❌ 회원 데이터 로드 실패:', error);
        // 폴백: 로컬 데이터 사용
        const initialMembers = createInitialMembers();
        const membersWithId = {};
        Object.keys(initialMembers).forEach(userId => {
          membersWithId[userId] = { ...initialMembers[userId], id: userId };
        });
        setMembers(membersWithId);
      } finally {
        setIsLoading(false);
      }
    };

    loadMembers();
  }, [allPokemonData]);

  // 🔥 회원 데이터 변경 시 Firebase에 자동 저장
 {/* useEffect(() => {
    const saveMembers = async () => {
      if (isLoading || Object.keys(members).length === 0) return;

      try {
        // ⭐ 각 회원을 개별적으로 저장 (전체가 아님!)
        for (const userId of Object.keys(members)) {
          const { id, ...memberData } = members[userId];
          
          // undefined를 null로 변환
          const cleanData = JSON.parse(
            JSON.stringify(memberData, (key, value) => 
              value === undefined ? null : value
            )
          );
          
          const memberRef = ref(database, `members/${userId}`);
          await set(memberRef, cleanData);
        }
        
        console.log('💾 Firebase에 회원 데이터 저장 완료');
      } catch (error) {
        console.error('❌ 회원 데이터 저장 실패:', error);
      }
    };

    saveMembers();
  }, [members, isLoading]); */}

  return {
    members,
    setMembers,
    isLoading
  };
};

// 초기 회원 데이터 생성 함수
const createInitialMembers = () => {
  const findItem = (searchTerms) => {
    return itemsData.items.find(i => 
      searchTerms.some(term => {
        const nameEn = i.nameEn?.toLowerCase().replace(/[éê]/g, 'e');
        const searchTerm = term.toLowerCase().replace(/[éê]/g, 'e');
        return nameEn?.includes(searchTerm) || i.name?.includes(term);
      })
    );
  };

  const getInitialInventory = () => {
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

  return {
    admin: {
      password: 'admin123',
      name: '관리자',
      email: 'admin@pokemon.com',
      isAdmin: true,
      isSuperAdmin: true,
      canManageItems: true,
      dailyWalks: 10,
      maxDailyWalks: 10,
      money: 50000,
      accessibleRegions: [],
      caughtPokemon: [],
      inventory: getInitialInventory()
    },
    user1: {
      password: '1234',
      name: '테스트유저',
      email: 'test@pokemon.com',
      isAdmin: false,
      isSuperAdmin: false,
      canManageItems: false,
      dailyWalks: 10,
      maxDailyWalks: 10,
      money: 10000,
      accessibleRegions: [],
      caughtPokemon: [],
      inventory: getInitialInventory()
    }
  };
};