import { useState, useEffect } from 'react';
import { ref, get, set, push, update } from 'firebase/database';
import { database } from '../../firebase';
import * as campingHelper from '../../utils/campingHelper';

export const useCamping = (currentUser, updateCurrentUser, allPokemonMaster, allItems) => {
  const [campingSessions, setCampingSessions] = useState([]);
  const [userCampingData, setUserCampingData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // 사용자 캠핑 데이터 로드
  useEffect(() => {
    if (!currentUser?.id) return;

    const loadUserCampingData = async () => {
      try {
        const campingRef = ref(database, `members/${currentUser.id}/campingData`);
        const snapshot = await get(campingRef);
        
        if (snapshot.exists()) {
          setUserCampingData(snapshot.val());
        } else {
          const initialData = {
            lastCampingDate: null,
            totalCampings: 0,
            bestStageReached: 0
          };
          setUserCampingData(initialData);
        }
      } catch (error) {
        console.error('캠핑 데이터 로드 실패:', error);
      }
    };

    loadUserCampingData();
  }, [currentUser?.id]);

  // 모든 캠핑 세션 로드
  useEffect(() => {
    const loadCampingSessions = async () => {
      try {
        const sessionsRef = ref(database, 'gameData/campingSessions');
        const snapshot = await get(sessionsRef);
        
        if (snapshot.exists()) {
          const sessions = Object.entries(snapshot.val()).map(([key, value]) => ({
            firebaseKey: key,
            ...value
          }));
          setCampingSessions(sessions);
        }
      } catch (error) {
        console.error('캠핑 세션 로드 실패:', error);
      }
    };

    loadCampingSessions();
  }, []);

  // 캠핑 시작
  const startCamping = async (entryPokemon, partnerId = null, partnerName = null) => {
    if (!currentUser?.id) {
      alert('로그인이 필요합니다');
      return { success: false };
    }

    // 관리자는 제한 없음
    if (!currentUser.isAdmin && !currentUser.isSuperAdmin) {
      if (!campingHelper.canCampToday(userCampingData?.lastCampingDate)) {
        const nextDate = campingHelper.getNextCampingDate(userCampingData?.lastCampingDate);
        alert(`이번 주 캠핑을 이미 완료했습니다!\n다음 캠핑: ${nextDate.toLocaleDateString()}`);
        return { success: false };
      }

      if (!campingHelper.isCampingDay()) {
        alert('캠핑은 월요일과 화요일에만 가능합니다!');
        return { success: false };
      }
    }

    setIsLoading(true);

    try {
      const session = campingHelper.createCampingSession(
        currentUser.id,
        currentUser.name,
        entryPokemon,
        partnerId,
        partnerName
      );

      const sessionsRef = ref(database, 'gameData/campingSessions');
      const newSessionRef = push(sessionsRef);
      await set(newSessionRef, session);

      setCampingSessions(prev => [...prev, { firebaseKey: newSessionRef.key, ...session }]);

      alert(`✅ 캠핑을 시작했습니다!\n\n관리자가 마스토돈에서 진행 상황을 안내할 예정입니다.`);
      
      return { success: true, sessionId: session.id };
    } catch (error) {
      console.error('캠핑 시작 실패:', error);
      alert('캠핑 시작 중 오류가 발생했습니다');
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  };

  // 관리자: 세션 진행
  const progressSession = async (sessionKey, choice) => {
    if (!currentUser?.isAdmin) {
      alert('관리자만 사용할 수 있습니다');
      return;
    }

    try {
      const sessionRef = ref(database, `gameData/campingSessions/${sessionKey}`);
      const snapshot = await get(sessionRef);
      
      if (!snapshot.exists()) {
        alert('세션을 찾을 수 없습니다');
        return;
      }

      const session = snapshot.val();
      const newStage = choice === 'continue' ? session.currentStage + 1 : session.currentStage;

      if (choice === 'satisfy' || newStage === 5) {
        await update(sessionRef, {
          currentStage: newStage,
          status: 'ready_to_complete',
          lastUpdatedAt: new Date().toISOString()
        });
      } else if (choice === 'continue') {
        await update(sessionRef, {
          currentStage: newStage,
          status: 'in_progress',
          lastUpdatedAt: new Date().toISOString()
        });
      }

      const updatedSession = { ...session, currentStage: newStage, status: choice === 'satisfy' || newStage === 5 ? 'ready_to_complete' : 'in_progress' };
      setCampingSessions(prev => prev.map(s => s.firebaseKey === sessionKey ? { ...s, ...updatedSession } : s));

      alert(`단계 ${newStage}로 진행되었습니다`);
    } catch (error) {
      console.error('세션 진행 실패:', error);
      alert('진행 중 오류가 발생했습니다');
    }
  };

  // 관리자: 요리 결과 처리
  const completeCooking = async (sessionKey, success) => {
    if (!currentUser?.isAdmin) {
      alert('관리자만 사용할 수 있습니다');
      return;
    }

    try {
      const sessionRef = ref(database, `gameData/campingSessions/${sessionKey}`);
      const snapshot = await get(sessionRef);
      
      if (!snapshot.exists()) {
        alert('세션을 찾을 수 없습니다');
        return;
      }

      const session = snapshot.val();
      const stageData = success ? campingHelper.generateCookingResult(session.currentStage, session.isDuo) : null;

      await update(sessionRef, {
        cookingResult: stageData,
        cookingSuccess: success,
        status: 'completed',
        completedAt: new Date().toISOString()
      });

      setCampingSessions(prev => prev.map(s => 
        s.firebaseKey === sessionKey 
          ? { ...s, cookingResult: stageData, cookingSuccess: success, status: 'completed' } 
          : s
      ));

      if (success) {
        alert(`요리 성공! 친밀도 +${stageData.stageData.friendshipBonus}, 경험치 +${stageData.stageData.expBonus}`);
      } else {
        alert('요리에 실패했습니다...');
      }
    } catch (error) {
      console.error('요리 완료 처리 실패:', error);
      alert('완료 처리 중 오류가 발생했습니다');
    }
  };

  // 관리자: 결과 회원에게 반영
  const applyResultsToMember = async (sessionKey) => {
    if (!currentUser?.isAdmin) {
      alert('관리자만 사용할 수 있습니다');
      return;
    }

    try {
      const sessionRef = ref(database, `gameData/campingSessions/${sessionKey}`);
      const snapshot = await get(sessionRef);
      
      if (!snapshot.exists()) {
        alert('세션을 찾을 수 없습니다');
        return;
      }

      const session = snapshot.val();
      
      if (!session.cookingSuccess) {
        alert('요리에 실패했으므로 보상이 없습니다');
        await update(sessionRef, { status: 'applied' });
        return;
      }

      const memberRef = ref(database, `members/${session.memberId}`);
      const memberSnapshot = await get(memberRef);
      
      if (!memberSnapshot.exists()) {
        alert('회원 데이터를 찾을 수 없습니다');
        return;
      }

      const memberData = memberSnapshot.val();
      const stageData = session.cookingResult.stageData;

      // 엔트리 포켓몬 친밀도 증가 (null 제외)
      const updatedPokemon = memberData.caughtPokemon.map((pokemon, index) => {
        if (index < 6 && pokemon) {
          const newFriendship = Math.min(255, (pokemon.friendship || 0) + stageData.friendshipBonus);
          console.log(`친밀도 업데이트: ${pokemon.name} ${pokemon.friendship || 0} → ${newFriendship}`);
          return {
            ...pokemon,
            friendship: newFriendship
          };
        }
        return pokemon;
      });

      // 캐릭터 경험치 증가
      const newExp = (memberData.characterExp || 0) + stageData.expBonus;

      // 친밀도 160 이상 포켓몬이 있는지 확인
      const hasHighFriendshipPokemon = updatedPokemon
        .slice(0, 6)
        .some(p => p && (p.friendship || 0) >= 160);

      let bonusItem = null;
      let updatedInventory = memberData.inventory || [];

      if (hasHighFriendshipPokemon) {
        bonusItem = campingHelper.rollBonusItem(allItems);
        
        if (bonusItem) {
          const existingItemIndex = updatedInventory.findIndex(i => i.itemId === bonusItem.id);
          
          if (existingItemIndex >= 0) {
            updatedInventory = updatedInventory.map((item, idx) =>
              idx === existingItemIndex
                ? { ...item, count: item.count + 1 }
                : item
            );
          } else {
            updatedInventory = [
              ...updatedInventory,
              {
                itemId: bonusItem.id,
                name: bonusItem.name,
                count: 1,
                imageUrl: bonusItem.imageUrl || bonusItem.spriteUrl
              }
            ];
          }
          console.log(`보너스 아이템 획득: ${bonusItem.name}`);
        }
      }

      // 🥚 2인 캠핑일 경우 알 획득 시도
      let eggObtained = null;
      if (session.isDuo && session.partnerId) {
        const partnerRef = ref(database, `members/${session.partnerId}`);
        const partnerSnapshot = await get(partnerRef);
        
        if (partnerSnapshot.exists()) {
          const partnerData = partnerSnapshot.val();
          
          const member1Entry = updatedPokemon.slice(0, 6).filter(p => p);
          const member2Entry = partnerData.caughtPokemon.slice(0, 6).filter(p => p);
          
          const eggResult = campingHelper.canGetEgg(member1Entry, member2Entry, allPokemonMaster);
          
          if (eggResult.canGet) {
            eggObtained = campingHelper.createEgg(
              eggResult.parents.pokemon1,
              eggResult.parents.pokemon2,
              allPokemonMaster
            );
            
            console.log(`🥚 알 획득! ${eggObtained.species}`);
          }
        }
      }

      // Firebase 업데이트
      const updates = {
        caughtPokemon: updatedPokemon,
        characterExp: newExp,
        inventory: updatedInventory,
        'campingData/lastCampingDate': new Date().toISOString(),
        'campingData/totalCampings': (memberData.campingData?.totalCampings || 0) + 1,
        'campingData/bestStageReached': Math.max(
          memberData.campingData?.bestStageReached || 0,
          session.currentStage
        )
      };

      // 알이 있으면 추가
      if (eggObtained) {
        updates.egg = eggObtained;
      }

      await update(memberRef, updates);
      await update(sessionRef, { status: 'applied', eggObtained: !!eggObtained });

      setCampingSessions(prev => prev.map(s => s.firebaseKey === sessionKey ? { ...s, status: 'applied' } : s));

      alert(
        `✅ 결과 반영 완료!\n\n` +
        `친밀도 +${stageData.friendshipBonus}\n` +
        `경험치 +${stageData.expBonus}\n` +
        (bonusItem ? `보너스 아이템: ${bonusItem.name} 획득!\n` : '') +
        (eggObtained ? `🥚 특별 보상: ${eggObtained.species}의 알 획득!` : '')
      );
    } catch (error) {
      console.error('결과 반영 실패:', error);
      alert('결과 반영 중 오류가 발생했습니다: ' + error.message);
    }
  };

  // 관리자: 세션 삭제
  const deleteSession = async (sessionKey) => {
    if (!currentUser?.isAdmin) {
      alert('관리자만 사용할 수 있습니다');
      return;
    }

    const confirmed = window.confirm('이 캠핑 세션을 삭제하시겠습니까?');
    if (!confirmed) return;

    try {
      const sessionRef = ref(database, `gameData/campingSessions/${sessionKey}`);
      await set(sessionRef, null);

      setCampingSessions(prev => prev.filter(s => s.firebaseKey !== sessionKey));
      alert('세션이 삭제되었습니다');
    } catch (error) {
      console.error('세션 삭제 실패:', error);
      alert('삭제 중 오류가 발생했습니다');
    }
  };

  return {
    campingSessions,
    userCampingData,
    isLoading,
    startCamping,
    progressSession,
    completeCooking,
    applyResultsToMember,
    deleteSession,
    canCampToday: userCampingData ? campingHelper.canCampToday(userCampingData.lastCampingDate) : true,
    isCampingDay: campingHelper.isCampingDay()
  };
};