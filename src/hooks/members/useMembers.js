// src/hooks/useMembers.js - UID 자동 생성 + Database 복구 기능

import { useState, useEffect } from 'react';
import { ref, get, set, onValue } from 'firebase/database';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { database, auth } from '../../firebase';
import { preloadDecodedImage } from '../../utils/imageCache';
import itemsData from '../../data/items.json';
import { fillMissingBaseStats, findPokemonTemplate } from '../../utils/pokemonBaseStats';
import { getAbilityEnglishName } from '../../utils/abilityUtils';
import { DEFAULT_IVS, withNormalizedIVs } from '../../utils/pokemonIndividualValues';

// Firebase sometimes returns sparse arrays as objects with numeric keys — normalize back to array
const normalizePokemonArray = (value) => {
  if (!value) return value;
  if (Array.isArray(value)) return value;
  if (typeof value === 'object') {
    const maxIndex = Math.max(...Object.keys(value).map(Number));
    const arr = Array.from({ length: maxIndex + 1 }, (_, i) => value[i] ?? null);
    return arr;
  }
  return value;
};

export const useMembers = (allPokemonData) => {
  const [members, setMembers] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let unsubscribe = null;

    const loadMembers = async () => {
      try {
        const membersRef = ref(database, 'members');
        const snapshot = await get(membersRef);

        if (snapshot.exists()) {
          const loadedMembers = snapshot.val();

          const updated = {};
          Object.keys(loadedMembers).forEach(userId => {
            const member = loadedMembers[userId];

            const normalizedCaughtPokemon = normalizePokemonArray(member.caughtPokemon);
            const updatedCaughtPokemon = normalizedCaughtPokemon?.map(pokemon => {
              if (!pokemon) return pokemon;

              const template = findPokemonTemplate(pokemon, allPokemonData);

              if (template) {
                return withNormalizedIVs(fillMissingBaseStats({
                  ...pokemon,
                  nameEn: pokemon.nameEn || template.nameEn,
                  abilityEn: getAbilityEnglishName(pokemon.ability) || pokemon.abilityEn || template.abilitiesEn?.[0] || null
                }, template), DEFAULT_IVS);
              }

              return withNormalizedIVs(pokemon, DEFAULT_IVS);
            }) || normalizedCaughtPokemon;

            updated[userId] = {
              ...member,
              id: userId,
              caughtPokemon: updatedCaughtPokemon,
              partnerPokemon: withNormalizedIVs(member.partnerPokemon, DEFAULT_IVS)
            };
          });

          Object.values(updated).forEach(member => {
            preloadDecodedImage(member?.profileImageThumb);
            preloadDecodedImage(member?.profileImage);
            preloadDecodedImage(member?.profileImageFull);
            preloadDecodedImage(member?.profileImageUrl);
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

        // 실시간 리스너 등록
        const membersRef = ref(database, 'members');
        unsubscribe = onValue(membersRef, (snap) => {
          if (!snap.exists()) return;
          const data = snap.val();
          setMembers(prev => {
            const updated = {};
            Object.keys(data).forEach(userId => {
              const member = data[userId];
              updated[userId] = {
                ...member,
                id: userId,
                caughtPokemon: normalizePokemonArray(member.caughtPokemon)?.map(pokemon => {
                  if (!pokemon) return pokemon;
                  const template = findPokemonTemplate(pokemon, allPokemonData);
                  if (!template) return pokemon;
                  return {
                    ...pokemon,
                    abilityEn: getAbilityEnglishName(pokemon.ability) || pokemon.abilityEn || template.abilitiesEn?.[0] || null
                  };
                }),
              };
            });
            return JSON.stringify(prev) === JSON.stringify(updated) ? prev : updated;
          });
        });
      }
    };

    loadMembers();
    return () => { if (unsubscribe) unsubscribe(); };
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
    return [
      { itemId: pokeBall?.id || 4, name: '몬스터볼', count: 15, imageUrl: pokeBall?.spriteUrl || 'https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/items/poke-ball.png' }
    ];
  };

   const initialUsers = [
    {
      email: 'admin@pokemon.com',
      password: 'admin123456',  // 6자 이상 확인!
      data: {
        name: '관리자',
        email: 'admin@pokemon.com',
        isAdmin: true,
        isSuperAdmin: true,
        canManageItems: true,
        dailyWalks: 10,
        maxDailyWalks: 10,
        money: 50000,
        trainerExp: 0,
        lastAttendanceDate: null,
        caughtPokemon: [null, null, null, null, null, null],
        inventory: getInitialInventory()
      }
    },
    {
      email: 'test@pokemon.com',
      password: 'test123456',  // 6자 이상 확인!
      data: {
        name: '테스트유저',
        email: 'test@pokemon.com',
        isAdmin: false,
        isSuperAdmin: false,
        canManageItems: false,
        dailyWalks: 10,
        maxDailyWalks: 10,
        money: 3000,
        trainerExp: 0,
        lastAttendanceDate: null,
        caughtPokemon: [null, null, null, null, null, null],
        inventory: getInitialInventory()
      }
    }
  ];

  console.log('🚀 초기 회원 생성 함수 시작');
  console.log('📋 생성할 회원 수:', initialUsers.length);

  const createdMembers = {};

  for (const user of initialUsers) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🔧 ${user.data.name} 처리 시작`);
    console.log('📧 이메일:', user.email);
    console.log('🔑 비밀번호 길이:', user.password.length);
    
    try {
      let uid = null;
      
      try {
        console.log('1️⃣ Auth 계정 생성 시도...');
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          user.email,
          user.password
        );
        
        uid = userCredential.user.uid;
        console.log(`✅ 새 UID 생성 성공: ${uid}`);
        
        await signOut(auth);
        console.log('🔓 로그아웃 완료');
        
      } catch (authError) {
        console.log('⚠️ Auth 에러 발생:', authError.code);
        console.log('📝 에러 메시지:', authError.message);
        
        if (authError.code === 'auth/email-already-in-use') {
          console.log('2️⃣ 기존 계정으로 로그인 시도...');
          
          const { signInWithEmailAndPassword } = await import('firebase/auth');
          
          try {
            const credential = await signInWithEmailAndPassword(
              auth,
              user.email,
              user.password
            );
            
            uid = credential.user.uid;
            console.log(`✅ 기존 UID 획득: ${uid}`);
            
            await signOut(auth);
            console.log('🔓 로그아웃 완료');
            
          } catch (loginError) {
            console.error(`❌ 로그인 실패 (${loginError.code}):`, loginError.message);
            console.log('💡 해결방법: Firebase Console에서 이 계정을 삭제하거나 비밀번호를 확인하세요');
            continue;
          }
        } else {
          console.error(`❌ Auth 에러 (${authError.code}):`, authError.message);
          continue;
        }
      }
      
      if (uid) {
        console.log('3️⃣ Database 저장 시도...');
        const memberRef = ref(database, `members/${uid}`);
        
        console.log('📍 저장 경로:', `members/${uid}`);
        console.log('💾 저장 데이터:', user.data);
        
        await set(memberRef, user.data);
        console.log(`✅ Database 저장 성공`);
        
        createdMembers[uid] = {
          ...user.data,
          id: uid
        };
        
        console.log(`🎊 ${user.data.name} 완료!`);
      } else {
        console.error('❌ UID를 얻지 못했습니다');
      }
      
    } catch (error) {
      console.error(`❌❌❌ ${user.data.name} 전체 처리 실패 ❌❌❌`);
      console.error('에러 타입:', error.constructor.name);
      console.error('에러 코드:', error.code);
      console.error('에러 메시지:', error.message);
      console.error('전체 에러:', error);
    }
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 초기 회원 처리 완료!');
  console.log(`📊 생성/복구된 회원: ${Object.keys(createdMembers).length}명`);
  console.log('👥 생성된 UID 목록:', Object.keys(createdMembers));
  
  return createdMembers;
}
