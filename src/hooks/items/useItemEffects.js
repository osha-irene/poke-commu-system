// src/hooks/items/useItemEffects.js
// 아이템 사용 효과 시스템

import { useRef } from 'react';
import { isEVItem, applyEVItem } from '../../utils/evItemUtils';
import { getLearnsetTmMoves, getPokemonLearnset } from '../../utils/pokemonLearnsets';

export const useItemEffects = (
  currentUser,
  updateCurrentUser,
  allItems,
  allMoves,
  pokemonLearnsets,
  useMoves,
  useEvolution,
  handleRareCandyWithEvolution
) => {
  
  const movesHook = useMoves;
  const evolutionHook = useEvolution;
  const itemUseLockRef = useRef(null);

  // 포켓몬에게 아이템 사용
  const useItemOnPokemon = (item, pokemon) => {
    if (!currentUser || !pokemon) return;

    const itemKey = item?.itemId || item?.id || item?.name || 'unknown-item';
    const pokemonKey = pokemon?.uniqueId || pokemon?.id || pokemon?.name || 'unknown-pokemon';
    const useKey = `${itemKey}:${pokemonKey}`;

    if (itemUseLockRef.current === useKey) return;
    itemUseLockRef.current = useKey;

    const releaseItemUseLock = () => {
      window.setTimeout(() => {
        if (itemUseLockRef.current === useKey) {
          itemUseLockRef.current = null;
        }
      }, 750);
    };

    try {
    
    const itemData = allItems.find(i => 
      i.id === item.itemId || i.name === item.name
    );
    
    const consumeItem = (item) => {
      if (currentUser.isSuperAdmin) return;
      
      const newInventory = currentUser.inventory
        .map(i => (i.itemId === item.itemId || i.name === item.name)
          ? { ...i, count: i.count - 1 }
          : i
        )
        .filter(i => i.count > 0);
      updateCurrentUser({ inventory: newInventory });
    };

    const updatePokemonInUser = (updatedPokemon) => {
      const updatedCaughtPokemon = currentUser.caughtPokemon.map(p => 
        p && p.uniqueId === updatedPokemon.uniqueId ? updatedPokemon : p
      );
      const updates = { caughtPokemon: updatedCaughtPokemon };
      if (currentUser.partnerPokemon?.uniqueId === updatedPokemon.uniqueId) {
        updates.partnerPokemon = updatedPokemon;
      }
      updateCurrentUser(updates);
    };
    
    // 기술머신 (TM) 사용 로직
    if (itemData?.isTM) {
      console.log('💿 기술머신 사용:', itemData);
      
      let moveData = allMoves.find(m => m.id === itemData.moveId);
      
      if (!moveData && typeof itemData.moveId === 'number') {
        console.log('⚠️ moveId가 숫자입니다. nameEn으로 찾습니다:', itemData.nameEn);
        moveData = allMoves.find(m => 
          m.id === itemData.nameEn || 
          m.nameEn === itemData.nameEn ||
          m.name === itemData.name
        );
      }
      
      if (!moveData) {
        console.log('⚠️ ID로 못 찾음. 이름으로 재시도:', itemData.name, itemData.nameEn);
        moveData = allMoves.find(m => 
          m.name === itemData.name ||
          m.nameEn === itemData.nameEn
        );
      }
      
      if (!moveData) {
        console.error('❌ 기술을 찾을 수 없습니다:', {
          tmMoveId: itemData.moveId,
          tmName: itemData.name,
          tmNameEn: itemData.nameEn
        });
        alert('기술 정보를 찾을 수 없습니다!');
        return;
      }
      
      console.log('✅ 기술 찾음:', moveData);
      
      const learnset = getPokemonLearnset(pokemonLearnsets, pokemon);
      
      if (!learnset) {
        console.warn('⚠️ 이 포켓몬의 학습 데이터가 없습니다:', pokemon.number);
        alert(`${pokemon.nickname || pokemon.name}의 기술 학습 정보를 찾을 수 없습니다!`);
        return;
      }
      
      if (!getLearnsetTmMoves(learnset).includes(moveData.id)) {
        alert(`${pokemon.nickname || pokemon.name}은(는) ${moveData.name}을(를) 배울 수 없습니다!`);
        return;
      }
      
      console.log('✅ 배울 수 있는 TM 확인됨!');
      
      const currentMoves = pokemon.moves || [];
      
      if (currentMoves.some(m => m.moveId === moveData.id)) {
        alert(`${pokemon.nickname || pokemon.name}은(는) 이미 ${moveData.name}을(를) 알고 있습니다!`);
        return;
      }
      
      if (currentMoves.length < 4) {
        const success = movesHook.learnMove(pokemon.uniqueId, moveData);
        if (success) {
          consumeItem(item);
        }
        return;
      }
      
      const moveNames = currentMoves.map((m, idx) => {
        const move = allMoves.find(mv => mv.id === m.moveId);
        return `${idx + 1}. ${move?.name || '???'}`;
      }).join('\n');
      
      const choice = window.prompt(
        `${pokemon.nickname || pokemon.name}의 기술이 가득 찼습니다!\n\n현재 기술:\n${moveNames}\n\n교체할 기술 번호를 입력하세요 (1-4)\n취소하려면 0을 입력하세요:`
      );
      
      if (choice === null || choice === '0') {
        return;
      }
      
      const choiceNum = parseInt(choice);
      if (isNaN(choiceNum) || choiceNum < 1 || choiceNum > 4) {
        alert('잘못된 입력입니다!');
        return;
      }
      
      const oldMoveId = currentMoves[choiceNum - 1].moveId;
      const success = movesHook.learnMove(pokemon.uniqueId, moveData, oldMoveId);
      
      if (success) {
        consumeItem(item);
      }
      return;
    }

    // 기존 아이템 로직들
    const updatedPokemon = { ...pokemon };
    let itemUsed = false;
    const effectMessages = [];

    if (item.friendshipBoost || itemData?.friendshipBoost) {
      const baseBoost = item.friendshipBoost || itemData.friendshipBoost;
      const boost = Math.max(0, Math.floor(baseBoost * (pokemon.friendshipGainMultiplier || 1)));
      updatedPokemon.friendship = Math.min(255, (pokemon.friendship || 0) + boost);
      effectMessages.push(`💖 친밀도: ${pokemon.friendship || 0} → ${updatedPokemon.friendship} (+${boost})`);
      itemUsed = true;
    }

    if (item.ivBoost || itemData?.ivBoost) {
      const boost = item.ivBoost || itemData.ivBoost;
      Object.keys(boost).forEach(stat => {
        if (updatedPokemon.ivs && updatedPokemon.ivs[stat] !== undefined) {
          const current = updatedPokemon.ivs[stat] || 0;
          const newValue = Math.min(31, current + boost[stat]);
          updatedPokemon.ivs[stat] = newValue;
          effectMessages.push(`🌟 ${stat}: ${current} → ${newValue} (+${boost[stat]})`);
          itemUsed = true;
        }
      });
    }

    if (item.evBoost || itemData?.evBoost) {
      const boost = item.evBoost || itemData.evBoost;
      const totalEV = Object.values(updatedPokemon.effortValues || {}).reduce((sum, v) => sum + v, 0);
      
      Object.keys(boost).forEach(stat => {
        if (updatedPokemon.effortValues && updatedPokemon.effortValues[stat] !== undefined) {
          const current = updatedPokemon.effortValues[stat] || 0;
          const remaining = 510 - totalEV;
          const actualBoost = Math.min(boost[stat], remaining, 252 - current);
          
          if (actualBoost > 0) {
            const newValue = current + actualBoost;
            updatedPokemon.effortValues[stat] = newValue;
            effectMessages.push(`⚡ ${stat}: ${current} → ${newValue} (+${actualBoost})`);
            itemUsed = true;
          }
        }
      });
    }

    if (item.conditionBoost || itemData?.conditionBoost) {
      const boost = item.conditionBoost || itemData.conditionBoost;
      const conditionMap = {
        'coolness': 'cool',
        'beauty': 'beauty',
        'cuteness': 'cute',
        'cleverness': 'clever',
        'toughness': 'tough'
      };
      
      Object.keys(boost).forEach(condKey => {
        const mappedKey = conditionMap[condKey] || condKey;
        if (updatedPokemon.condition && updatedPokemon.condition[mappedKey] !== undefined) {
          const current = updatedPokemon.condition[mappedKey] || 0;
          const newValue = Math.min(255, current + boost[condKey]);
          updatedPokemon.condition[mappedKey] = newValue;
          effectMessages.push(`✨ ${condKey}: ${current} → ${newValue} (+${boost[condKey]})`);
          itemUsed = true;
        }
      });
    }

    if (item.specialEffect || itemData?.specialEffect) {
      effectMessages.push(`⚡ ${item.specialEffect || itemData.specialEffect}`);
      itemUsed = true;
    }

    if (itemUsed) {
      updatePokemonInUser(updatedPokemon);
      const message = `${pokemon.nickname || pokemon.name}에게 ${item.name}을(를) 사용했습니다!\n\n${effectMessages.join('\n')}`;
      alert(message);
      consumeItem(item);
      return;
    }
    
    // EV 아이템
    if (isEVItem(itemData?.nameEn || itemData?.name)) {
      const result = applyEVItem(
        pokemon, 
        itemData.nameEn || itemData.name,
        updatePokemonInUser
      );
      
      if (result.success) {
        alert(result.message);
        consumeItem(item);
      } else {
        alert(result.message);
      }
      return;
    }
    
    // 이상한사탕
    if (itemData?.name === '이상한사탕' || 
        itemData?.nameEn?.toLowerCase().includes('rare candy')) {
      const availableExp = Number(currentUser.trainerExp) || 0;
      const input = window.prompt(`배분할 경험치를 입력해주세요.\n보유 경험치: ${availableExp}`, '');
      if (input === null) return;

      const expAmount = Math.floor(Number(input) || 0);
      if (expAmount <= 0) {
        alert('배분할 경험치를 입력해주세요.');
        return;
      }

      handleRareCandyWithEvolution(pokemon.uniqueId, undefined, expAmount);
      return;
    }
     
    // 진화의 돌
    if (itemData?.category?.includes('evolution')) {
      console.log('🪨 진화의 돌 사용:', itemData.name, itemData.nameEn);
      
      const success = evolutionHook.evolveWithItem(pokemon, itemData.nameEn || itemData.name);
      console.log('✅ 진화 체크 결과:', success);
      
      if (success) {
        consumeItem(item);
      } else {
        alert('이 포켓몬은 해당 아이템으로 진화할 수 없습니다.');
      }
      return;
    }
    
    alert(`${pokemon.nickname || pokemon.name}에게 ${item.name}을(를) 사용했습니다!`);
    consumeItem(item);
    } finally {
      releaseItemUseLock();
    }
  };

  return {
    useItemOnPokemon
  };
};

export default useItemEffects;
