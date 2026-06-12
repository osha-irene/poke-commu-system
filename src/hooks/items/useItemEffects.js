// src/hooks/items/useItemEffects.js
// ?꾩씠???ъ슜 ?④낵 ?쒖뒪??
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

  // ?ъ폆紐ъ뿉寃??꾩씠???ъ슜
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
    
    // 湲곗닠癒몄떊 (TM) ?ъ슜 濡쒖쭅
    if (itemData?.isTM) {
      console.log('?뮸 湲곗닠癒몄떊 ?ъ슜:', itemData);
      
      let moveData = allMoves.find(m => m.id === itemData.moveId);
      
      if (!moveData && typeof itemData.moveId === 'number') {
        console.log('?좑툘 moveId媛 ?レ옄?낅땲?? nameEn?쇰줈 李얠뒿?덈떎:', itemData.nameEn);
        moveData = allMoves.find(m => 
          m.id === itemData.nameEn || 
          m.nameEn === itemData.nameEn ||
          m.name === itemData.name
        );
      }
      
      if (!moveData) {
        console.log('?좑툘 ID濡?紐?李얠쓬. ?대쫫?쇰줈 ?ъ떆??', itemData.name, itemData.nameEn);
        moveData = allMoves.find(m => 
          m.name === itemData.name ||
          m.nameEn === itemData.nameEn
        );
      }
      
      if (!moveData) {
        console.error('??湲곗닠??李얠쓣 ???놁뒿?덈떎:', {
          tmMoveId: itemData.moveId,
          tmName: itemData.name,
          tmNameEn: itemData.nameEn
        });
        alert('湲곗닠 ?뺣낫瑜?李얠쓣 ???놁뒿?덈떎!');
        return;
      }
      
      console.log('??湲곗닠 李얠쓬:', moveData);
      
      const learnset = getPokemonLearnset(pokemonLearnsets, pokemon);
      
      if (!learnset) {
        console.warn('?좑툘 ???ъ폆紐ъ쓽 ?숈뒿 ?곗씠?곌? ?놁뒿?덈떎:', pokemon.number);
        alert(`${pokemon.nickname || pokemon.name}??湲곗닠 ?숈뒿 ?뺣낫瑜?李얠쓣 ???놁뒿?덈떎!`);
        return;
      }
      
      if (!getLearnsetTmMoves(learnset).includes(moveData.id)) {
        alert(`${pokemon.nickname || pokemon.name}?(?? ${moveData.name}??瑜? 諛곗슱 ???놁뒿?덈떎!`);
        return;
      }
      
      console.log('??諛곗슱 ???덈뒗 TM ?뺤씤??');
      
      const currentMoves = pokemon.moves || [];
      
      if (currentMoves.some(m => m.moveId === moveData.id)) {
        alert(`${pokemon.nickname || pokemon.name}?(?? ?대? ${moveData.name}??瑜? ?뚭퀬 ?덉뒿?덈떎!`);
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
        `${pokemon.nickname || pokemon.name}??湲곗닠??媛??李쇱뒿?덈떎!\n\n?꾩옱 湲곗닠:\n${moveNames}\n\n援먯껜??湲곗닠 踰덊샇瑜??낅젰?섏꽭??(1-4)\n痍⑥냼?섎젮硫?0???낅젰?섏꽭??`
      );
      
      if (choice === null || choice === '0') {
        return;
      }
      
      const choiceNum = parseInt(choice);
      if (isNaN(choiceNum) || choiceNum < 1 || choiceNum > 4) {
        alert('?섎せ???낅젰?낅땲??');
        return;
      }
      
      const oldMoveId = currentMoves[choiceNum - 1].moveId;
      const success = movesHook.learnMove(pokemon.uniqueId, moveData, oldMoveId);
      
      if (success) {
        consumeItem(item);
      }
      return;
    }

    // 湲곗〈 ?꾩씠??濡쒖쭅??
    const updatedPokemon = { ...pokemon };
    let itemUsed = false;
    const effectMessages = [];

    if (item.friendshipBoost || itemData?.friendshipBoost) {
      const baseBoost = item.friendshipBoost || itemData.friendshipBoost;
      const boost = Math.max(0, Math.floor(baseBoost * (pokemon.friendshipGainMultiplier || 1)));
      updatedPokemon.friendship = Math.min(255, (pokemon.friendship || 0) + boost);
      effectMessages.push(`?뮇 移쒕??? ${pokemon.friendship || 0} ??${updatedPokemon.friendship} (+${boost})`);
      itemUsed = true;
    }

    if (item.ivBoost || itemData?.ivBoost) {
      const boost = item.ivBoost || itemData.ivBoost;
      Object.keys(boost).forEach(stat => {
        if (updatedPokemon.ivs && updatedPokemon.ivs[stat] !== undefined) {
          const current = updatedPokemon.ivs[stat] || 0;
          const newValue = Math.min(31, current + boost[stat]);
          updatedPokemon.ivs[stat] = newValue;
          effectMessages.push(`?뙚 ${stat}: ${current} ??${newValue} (+${boost[stat]})`);
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
            effectMessages.push(`??${stat}: ${current} ??${newValue} (+${actualBoost})`);
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
          effectMessages.push(`??${condKey}: ${current} ??${newValue} (+${boost[condKey]})`);
          itemUsed = true;
        }
      });
    }

    if (item.specialEffect || itemData?.specialEffect) {
      effectMessages.push(`??${item.specialEffect || itemData.specialEffect}`);
      itemUsed = true;
    }

    if (itemUsed) {
      updatePokemonInUser(updatedPokemon);
      const message = `${pokemon.nickname || pokemon.name}?먭쾶 ${item.name}??瑜? ?ъ슜?덉뒿?덈떎!\n\n${effectMessages.join('\n')}`;
      alert(message);
      consumeItem(item);
      return;
    }
    
    // EV ?꾩씠??
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
     
    // 吏꾪솕????
    if (itemData?.category?.includes('evolution')) {
      console.log('?え 吏꾪솕?????ъ슜:', itemData.name, itemData.nameEn);
      
      const success = evolutionHook.evolveWithItem(pokemon, itemData.nameEn || itemData.name);
      console.log('??吏꾪솕 泥댄겕 寃곌낵:', success);
      
      if (success) {
        consumeItem(item);
      }
      return;
    }
    
    alert(`${pokemon.nickname || pokemon.name}?먭쾶 ${item.name}??瑜? ?ъ슜?덉뒿?덈떎!`);
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

