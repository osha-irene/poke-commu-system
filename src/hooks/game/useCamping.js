import { useState, useEffect } from 'react';
import { ref, get, set, push, update, onValue } from 'firebase/database';
import { database } from '../../firebase';
import * as campingHelper from '../../utils/campingHelper';

export const useCamping = (currentUser, updateCurrentUser, allPokemonMaster, allItems) => {
  const [campingSessions, setCampingSessions] = useState([]);
  const [userCampingData, setUserCampingData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // 사용자 캠핑 데이터 실시간 리스너
  useEffect(() => {
    if (!currentUser?.id) return;

    const campingRef = ref(database, `members/${currentUser.id}/campingData`);
    const unsub = onValue(campingRef, (snapshot) => {
      if (snapshot.exists()) {
        setUserCampingData(snapshot.val());
      } else {
        setUserCampingData({
          lastCampingDate: null,
          totalCampings: 0,
          bestStageReached: 0
        });
      }
    }, (error) => {
      console.error('캠핑 데이터 로드 실패:', error);
    });

    return () => unsub();
  }, [currentUser?.id]);

  // 모든 캠핑 세션 실시간 리스너
  useEffect(() => {
    const sessionsRef = ref(database, 'gameData/campingSessions');
    const unsub = onValue(sessionsRef, (snapshot) => {
      if (snapshot.exists()) {
        const sessions = Object.entries(snapshot.val()).map(([key, value]) => ({
          firebaseKey: key,
          ...value
        }));
        setCampingSessions(sessions);
      } else {
        setCampingSessions([]);
      }
    }, (error) => {
      console.error('캠핑 세션 로드 실패:', error);
    });

    return () => unsub();
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
        // 실패 보상 지급
        const configRef = ref(database, 'gameData/campingSettings');
        const configSnap = await get(configRef);
        const failSettings = configSnap.exists() ? configSnap.val() : {};
        const failRewards = Array.isArray(failSettings.failRewards) ? failSettings.failRewards : [];
        const failFriendshipMin = Number(failSettings.failFriendshipMin ?? 0);
        const failFriendshipMax = Number(failSettings.failFriendshipMax ?? failFriendshipMin);
        const failExpMin = Number(failSettings.failExpMin ?? 0);
        const failExpMax = Number(failSettings.failExpMax ?? failExpMin);

        const rollRange = (lo, hi) => lo >= hi ? lo : Math.floor(Math.random() * (hi - lo + 1)) + lo;
        const failFriendship = failFriendshipMax > 0 ? rollRange(failFriendshipMin, failFriendshipMax) : 0;
        const failExp = failExpMax > 0 ? rollRange(failExpMin, failExpMax) : 0;

        const memberRef2 = ref(database, `members/${session.memberId}`);
        const memberSnap2 = await get(memberRef2);
        if (memberSnap2.exists()) {
          const mData = memberSnap2.val();
          let inv = mData.inventory || [];
          for (const reward of failRewards) {
            const idx = inv.findIndex(i => i.name === reward.name || String(i.itemId) === String(reward.itemId));
            if (idx >= 0) {
              inv = inv.map((item, i) => i === idx ? { ...item, count: item.count + (reward.count || 1) } : item);
            } else {
              inv = [...inv, { itemId: reward.itemId, name: reward.name, count: reward.count || 1, imageUrl: reward.imageUrl || reward.spriteUrl || '' }];
            }
          }

          // 실패 친밀도 적용
          let failPokemon = mData.caughtPokemon || [];
          let failPartner = mData.partnerPokemon || null;
          if (failFriendship > 0) {
            const failEntryIds = new Set(
              (session.entryPokemon || []).map(e => e.pokemonId).filter(Boolean)
            );
            failPokemon = failPokemon.map(p => {
              if (p && (failEntryIds.has(p.uniqueId) || failEntryIds.has(p.id) || failEntryIds.has(p.pokemonId))) {
                const bonus = Math.max(0, Math.floor(failFriendship * (p.friendshipGainMultiplier || 1)));
                return { ...p, friendship: Math.min(255, (p.friendship || 0) + bonus) };
              }
              return p;
            });
            if (failPartner) {
              const bonus = Math.max(0, Math.floor(failFriendship * (failPartner.friendshipGainMultiplier || 1)));
              failPartner = { ...failPartner, friendship: Math.min(255, (failPartner.friendship || 0) + bonus) };
            }
          }

          const failCharExp = failExp > 0 ? (mData.characterExp || 0) + failExp : (mData.characterExp || 0);
          const failUpdates = { inventory: inv, caughtPokemon: failPokemon, characterExp: failCharExp };
          if (failPartner) failUpdates.partnerPokemon = failPartner;
          await update(memberRef2, failUpdates);
          updateCurrentUser({ inventory: inv, caughtPokemon: failPokemon, characterExp: failCharExp, ...(failPartner ? { partnerPokemon: failPartner } : {}) });

          const msgs = ['요리에 실패했습니다.'];
          if (failFriendship > 0) msgs.push(`친밀도 +${failFriendship}`);
          if (failExp > 0) msgs.push(`경험치 +${failExp}`);
          if (failRewards.length > 0) msgs.push('위로 아이템: ' + failRewards.map(r => `${r.name} ×${r.count || 1}`).join(', '));
          alert(msgs.join('\n'));
        } else {
          alert('요리에 실패했으므로 보상이 없습니다');
        }
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

      // 캠핑 설정 로드 (보너스 아이템 등)
      const configRef2 = ref(database, 'gameData/campingSettings');
      const configSnap2 = await get(configRef2);
      const campingSettings = configSnap2.exists() ? configSnap2.val() : {};

      // 세션에 저장된 엔트리 포켓몬 ID 목록
      const entryIds = new Set(
        (session.entryPokemon || []).map(e => e.pokemonId).filter(Boolean)
      );
      const isEntryPokemon = (p) =>
        p && (entryIds.has(p.uniqueId) || entryIds.has(p.id) || entryIds.has(p.pokemonId));

      // 친밀도 범위 → 랜덤 값 계산
      const randRange = (min, max, fallback) => {
        const lo = Number(min ?? fallback ?? 0);
        const hi = Number(max ?? lo);
        if (lo >= hi) return lo;
        return Math.floor(Math.random() * (hi - lo + 1)) + lo;
      };

      const friendshipBonus = randRange(stageData.friendshipMin, stageData.friendshipMax, stageData.friendshipBonus);
      const expBonus = randRange(stageData.expMin, stageData.expMax, stageData.expBonus);

      // 엔트리 포켓몬만 친밀도 증가
      const updatedPokemon = memberData.caughtPokemon.map((pokemon) => {
        if (isEntryPokemon(pokemon)) {
          const bonus = Math.max(0, Math.floor(friendshipBonus * (pokemon.friendshipGainMultiplier || 1)));
          const newFriendship = Math.min(255, (pokemon.friendship || 0) + bonus);
          return { ...pokemon, friendship: newFriendship };
        }
        return pokemon;
      });

      // 파트너 포켓몬은 항상 친밀도 증가
      let updatedPartnerPokemon = memberData.partnerPokemon || null;
      if (updatedPartnerPokemon) {
        const bonus = Math.max(0, Math.floor(friendshipBonus * (updatedPartnerPokemon.friendshipGainMultiplier || 1)));
        updatedPartnerPokemon = {
          ...updatedPartnerPokemon,
          friendship: Math.min(255, (updatedPartnerPokemon.friendship || 0) + bonus)
        };
      }

      // 캐릭터 경험치 증가
      const newExp = (memberData.characterExp || 0) + expBonus;

      let updatedInventory = memberData.inventory || [];
      const obtainedStageItems = [];
      const obtainedBonusItems = [];

      // 단계별 아이템 풀 — 해당 단계 아이템 풀에서 minPick~maxPick개 랜덤 획득
      const stagePool = Array.isArray(stageData.bonusItems) ? stageData.bonusItems : [];
      if (stagePool.length > 0) {
        const minPick = Math.max(1, Number(stageData.minPick ?? 1));
        const maxPick = Math.max(minPick, Number(stageData.maxPick ?? minPick));
        const pickCount = Math.min(randRange(minPick, maxPick), stagePool.length);
        // Fisher-Yates shuffle → 앞 pickCount개 사용
        const pool = [...stagePool];
        for (let i = pool.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        for (const picked of pool.slice(0, pickCount)) {
          const existingIdx = updatedInventory.findIndex(i =>
            String(i.itemId) === String(picked.itemId) || i.name === picked.name
          );
          if (existingIdx >= 0) {
            updatedInventory = updatedInventory.map((item, idx) =>
              idx === existingIdx ? { ...item, count: item.count + 1 } : item
            );
          } else {
            updatedInventory = [
              ...updatedInventory,
              { itemId: picked.itemId, name: picked.name, count: 1, imageUrl: picked.spriteUrl || picked.imageUrl || '' }
            ];
          }
          obtainedStageItems.push(picked.name);
        }
      }

      // 보너스 아이템 — 친밀도 기준 이상 포켓몬이 있으면 각 아이템 독립 확률로 추첨
      const minFriendship = Number(campingSettings.minFriendshipForBonus ?? 160);
      const hasHighFriendshipPokemon = [
        ...updatedPokemon.filter(isEntryPokemon),
        ...(updatedPartnerPokemon ? [updatedPartnerPokemon] : [])
      ].some(p => (p.friendship || 0) >= minFriendship);

      if (hasHighFriendshipPokemon) {
        const bonusItemList = Array.isArray(campingSettings.bonusItems) ? campingSettings.bonusItems : [];
        for (const bonusCfg of bonusItemList) {
          const chance = Number(bonusCfg.chance ?? bonusCfg.weight ?? 0);
          if (chance <= 0 || Math.random() * 100 > chance) continue;
          const existingIdx = updatedInventory.findIndex(i =>
            String(i.itemId) === String(bonusCfg.itemId) || i.name === bonusCfg.name
          );
          if (existingIdx >= 0) {
            updatedInventory = updatedInventory.map((item, idx) =>
              idx === existingIdx ? { ...item, count: item.count + 1 } : item
            );
          } else {
            updatedInventory = [
              ...updatedInventory,
              { itemId: bonusCfg.itemId, name: bonusCfg.name, count: 1, imageUrl: bonusCfg.spriteUrl || bonusCfg.imageUrl || '' }
            ];
          }
          obtainedBonusItems.push(bonusCfg.name);
        }
      }

      // 🥚 2인 캠핑일 경우 알 획득 시도
      let eggObtained = null;
      if (session.isDuo && session.partnerId) {
        const partnerRef = ref(database, `members/${session.partnerId}`);
        const partnerSnapshot = await get(partnerRef);
        
        if (partnerSnapshot.exists()) {
          const partnerData = partnerSnapshot.val();
          
          const member1Entry = [
            ...updatedPokemon.filter(isEntryPokemon),
            ...(updatedPartnerPokemon ? [updatedPartnerPokemon] : [])
          ];
          const member2Entry = [
            ...(partnerData.caughtPokemon || []).filter((p, i) => i < 6 && p),
            ...(partnerData.partnerPokemon ? [partnerData.partnerPokemon] : [])
          ];
          
          const eggResult = campingHelper.canGetEgg(member1Entry, member2Entry, allPokemonMaster);
          
          if (eggResult.canGet) {
            eggObtained = campingHelper.createEgg(
              eggResult.parents.pokemon1,
              eggResult.parents.pokemon2,
              allPokemonMaster,
              currentUser?.name,
              partnerData?.name
            );
            
            console.log(`🥚 알 획득! ${eggObtained.species}`);
          }
        }
      }

      // Firebase 업데이트
      const updates = {
        caughtPokemon: updatedPokemon,
        ...(updatedPartnerPokemon ? { partnerPokemon: updatedPartnerPokemon } : {}),
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

      updateCurrentUser({
        caughtPokemon: updatedPokemon,
        characterExp: newExp,
        inventory: updatedInventory,
        ...(eggObtained ? { egg: eggObtained } : {}),
      });

      alert(
        `✅ 결과 반영 완료!\n\n` +
        `친밀도 +${friendshipBonus}\n` +
        `경험치 +${expBonus}\n` +
        (obtainedStageItems.length > 0 ? `단계 아이템: ${obtainedStageItems.join(', ')} 획득!\n` : '') +
        (obtainedBonusItems.length > 0 ? `보너스 아이템: ${obtainedBonusItems.join(', ')} 획득!\n` : '') +
        (eggObtained ? '어라? 포켓몬의 알이 있다!' : '')
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
