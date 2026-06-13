// src/hooks/items/useItemEffects.js
import { useRef } from 'react';
import { isEVItem, applyEVItem } from '../../utils/evItemUtils';
import { getLearnsetTmMoves, getPokemonLearnset } from '../../utils/pokemonLearnsets';
import { isRareCandyItem, resolveItemData } from '../../utils/itemUsageRules';

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

  const useItemOnPokemon = async (item, pokemon) => {
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

    const itemData = resolveItemData(allItems, item);

    const consumeItem = (item) => {
      if (currentUser.isSuperAdmin) return;

      const targetItemData = resolveItemData(allItems, item);
      const matchesItem = (inventoryItem) => {
        const inventoryItemData = resolveItemData(allItems, inventoryItem);

        if (targetItemData?.id != null && inventoryItemData?.id != null) {
          return targetItemData.id === inventoryItemData.id;
        }

        if (item.itemId != null && inventoryItem.itemId != null) {
          return item.itemId === inventoryItem.itemId;
        }

        return (
          (item.name && inventoryItem.name === item.name) ||
          (item.nameEn && inventoryItem.nameEn === item.nameEn)
        );
      };

      let consumed = false;

      const newInventory = currentUser.inventory
        .map(i => {
          if (!consumed && matchesItem(i)) {
            consumed = true;
            return { ...i, count: i.count - 1 };
          }
          return i;
        })
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

    // 기술머신 (TM) 사용 처리
    if (itemData?.isTM) {
      console.log('기술머신 사용:', itemData);

      let moveData = allMoves.find(m => m.id === itemData.moveId);

      if (!moveData && typeof itemData.moveId === 'number') {
        moveData = allMoves.find(m =>
          m.id === itemData.nameEn ||
          m.nameEn === itemData.nameEn ||
          m.name === itemData.name
        );
      }

      if (!moveData) {
        moveData = allMoves.find(m =>
          m.name === itemData.name ||
          m.nameEn === itemData.nameEn
        );
      }

      if (!moveData) {
        console.error('기술을 찾을 수 없습니다:', {
          tmMoveId: itemData.moveId,
          tmName: itemData.name,
          tmNameEn: itemData.nameEn
        });
        alert('기술 정보를 찾을 수 없습니다!');
        return;
      }

      const learnset = getPokemonLearnset(pokemonLearnsets, pokemon);

      if (!learnset) {
        alert(`${pokemon.nickname || pokemon.name}의 기술 습득 정보를 찾을 수 없습니다!`);
        return;
      }

      if (!getLearnsetTmMoves(learnset).includes(moveData.id)) {
        alert(`${pokemon.nickname || pokemon.name}은(는) ${moveData.name}을(를) 배울 수 없습니다!`);
        return;
      }

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
        return (idx + 1) + '. ' + (move?.name || '???');
      }).join('\n');

      const choice = window.prompt(
        pokemon.nickname || pokemon.name + '이(가) 기술을 4개 알고 있습니다!\n\n현재 기술:\n' + moveNames + '\n\n교체할 기술 번호를 입력하세요(1-4)\n취소하려면 0을 입력하세요'
      );

      if (choice === null || choice === '0') {
        return;
      }

      const choiceNum = parseInt(choice);
      if (isNaN(choiceNum) || choiceNum < 1 || choiceNum > 4) {
        alert('올바른 번호를 입력해주세요');
        return;
      }

      const oldMoveId = currentMoves[choiceNum - 1].moveId;
      const success = movesHook.learnMove(pokemon.uniqueId, moveData, oldMoveId);

      if (success) {
        consumeItem(item);
      }
      return;
    }

    // 기존 아이템 로직
    const updatedPokemon = { ...pokemon };
    let itemUsed = false;
    const effectMessages = [];

    if (item.friendshipBoost || itemData?.friendshipBoost) {
      const baseBoost = item.friendshipBoost || itemData.friendshipBoost;
      const boost = Math.max(0, Math.floor(baseBoost * (pokemon.friendshipGainMultiplier || 1)));
      updatedPokemon.friendship = Math.min(255, (pokemon.friendship || 0) + boost);
      effectMessages.push('친밀도: ' + (pokemon.friendship || 0) + ' → ' + updatedPokemon.friendship + ' (+' + boost + ')');
      itemUsed = true;
    }

    if (item.ivBoost || itemData?.ivBoost) {
      const boost = item.ivBoost || itemData.ivBoost;
      Object.keys(boost).forEach(stat => {
        if (updatedPokemon.ivs && updatedPokemon.ivs[stat] !== undefined) {
          const current = updatedPokemon.ivs[stat] || 0;
          const newValue = Math.min(31, current + boost[stat]);
          updatedPokemon.ivs[stat] = newValue;
          effectMessages.push('개체값 ' + stat + ': ' + current + ' → ' + newValue + ' (+' + boost[stat] + ')');
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
            effectMessages.push('노력치 ' + stat + ': ' + current + ' → ' + newValue + ' (+' + actualBoost + ')');
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
          effectMessages.push('컨디션 ' + condKey + ': ' + current + ' → ' + newValue + ' (+' + boost[condKey] + ')');
          itemUsed = true;
        }
      });
    }

    if (item.specialEffect || itemData?.specialEffect) {
      effectMessages.push('효과: ' + (item.specialEffect || itemData.specialEffect));
      itemUsed = true;
    }

    if (itemUsed) {
      updatePokemonInUser(updatedPokemon);
      const message = (pokemon.nickname || pokemon.name) + '에게 ' + item.name + '을(를) 사용했습니다!\n\n' + effectMessages.join('\n');
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
    if (isRareCandyItem(item, itemData)) {
      const success = await handleRareCandyWithEvolution(pokemon.uniqueId);
      if (success) {
        consumeItem(item);
      }
      return;
    }

    // 진화 아이템
    if (itemData?.category?.includes('evolution')) {
      const success = evolutionHook.evolveWithItem(pokemon, itemData.nameEn || itemData.name);
      if (success) {
        consumeItem(item);
      }
      return;
    }

    alert((pokemon.nickname || pokemon.name) + '에게 ' + item.name + '을(를) 사용했습니다!');
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
