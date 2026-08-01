// src/hooks/items/useItemEffects.js
import { useRef, useEffect } from 'react';
import { isEVItem, applyEVItem } from '../../utils/evItemUtils';
import { getLearnsetTmMoves, getLearnsetEggMoves, getPokemonLearnset } from '../../utils/pokemonLearnsets';
import { isRareCandyItem, resolveItemData } from '../../utils/itemUsageRules';
import { isSoyYYNItem } from '../../utils/specialItemUtils';
import { findPokemonTemplate } from '../../utils/pokemonBaseStats';
import { getPokemonAbilities } from '../../utils/abilityUtils';

// 아이템 nameEn → 변경 가능한 포켓몬 originalNumber 목록
const FORM_CHANGE_ITEMS = {
  'rotom-catalog': [479],
  'gracidea': [492],
  'meteorite': [386],
  'meteorite--2': [386],
  'meteorite--3': [386],
  'meteorite--4': [386],
  'furfrou-trim-ticket': [676],
};

// 로토무 카탈로그 등은 여러 번 재사용 가능한 카탈로그라 소모되지 않는다.
// 트리미앙 컷트 이용권은 "이용권"이라 1회 사용 후 소모되어야 한다.
const CONSUMABLE_FORM_CHANGE_ITEMS = new Set(['furfrou-trim-ticket']);

// category가 "evolution"이 아니어도 진화 체크를 같이 태워야 하는 예외 아이템.
// "고래왕급 고추장 떡볶이"(spicy_wailord, 관리자가 vitamins 카테고리의 친밀도 아이템으로
// 만들어서 진화 아이템 분기를 안 타던 커스텀 아이템)만 예외로 처리한다.
const EVOLUTION_CHECK_EXCEPTION_ITEMS = new Set(['spicy_wailord']);

// 꿀 아이템 → 오리코리오 특정 폼 nameEn 직접 매핑
const NECTAR_FORM_MAP = {
  'red-nectar': 'oricorio-baile',
  'yellow-nectar': 'oricorio-pom-pom',
  'pink-nectar': 'oricorio-pau',
  'purple-nectar': 'oricorio-sensu',
};

export const useItemEffects = (
  currentUser,
  updateCurrentUser,
  updateOwnedPokemonByUniqueId,
  updateInventory,
  allItems,
  allMoves,
  pokemonLearnsets,
  useMoves,
  useEvolution,
  handleRareCandyWithEvolution,
  getPokemonFormCandidates,
  changePokemonForm,
  systemSettings = {},
  onRequestStatSelection = null,
  onRequestMoveChoice = null,
  onRequestQnaWrite = null,
  allPokemonMaster = [],
  onRequestAbilitySelect = null,
  adjustNumericField = null
) => {

  const movesHook = useMoves;
  const evolutionHook = useEvolution;
  const itemUseLockRef = useRef(null);
  const systemSettingsRef = useRef(systemSettings);
  useEffect(() => { systemSettingsRef.current = systemSettings; }, [systemSettings]);

  const useItemOnPokemon = async (item, pokemon, selectedFormNameEn = null) => {
    if (!currentUser || !item) return;

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
    console.log('[useItemEffects] 아이템 사용 디버그:', {
      item_name: item.name,
      item_itemId: item.itemId,
      item_conditionBoost: item.conditionBoost,
      itemData_id: itemData?.id,
      itemData_name: itemData?.name,
      itemData_conditionBoost: itemData?.conditionBoost,
      src_will_be: itemData ? 'itemData' : 'item',
    });

    // ⭐ 인벤토리는 클로저 스냅샷이 아니라 Firebase의 최신 값을 기준으로 트랜잭션으로 소모한다.
    // (아이템을 연달아 여러 번 쓰거나 여러 포켓몬에게 나눠 쓸 때, 뒤 호출이 스테일한 인벤토리
    //  기준으로 통째로 덮어써서 앞선 소모분이 되살아나는 문제를 막기 위함)
    // extraUpdates(예: trainerExp)는 인벤토리와 무관한 필드라 별도 updateCurrentUser로 처리한다.
    const consumeItem = async (item, extraUpdates = {}) => {
      if (currentUser.isSuperAdmin) {
        if (Object.keys(extraUpdates).length > 0) updateCurrentUser(extraUpdates);
        return;
      }

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

      await updateInventory((currentInventory = []) => {
        let consumed = false;
        return currentInventory
          .map(i => {
            if (!consumed && matchesItem(i)) {
              consumed = true;
              return { ...i, count: i.count - 1 };
            }
            return i;
          })
          .filter(i => i.count > 0);
      });

      if (Object.keys(extraUpdates).length > 0) {
        updateCurrentUser(extraUpdates);
      }
    };

    // ⭐ 클로저 스냅샷이 아니라 Firebase의 최신 데이터를 기준으로 트랜잭션으로 해당 포켓몬만 갱신한다.
    // (같은 포켓몬/다른 포켓몬에게 아이템을 빠르게 연달아 쓸 때 앞선 변경이 사라지는 문제를 막기 위함)
    const updatePokemonInUser = async (updatedPokemon) => {
      await updateOwnedPokemonByUniqueId(updatedPokemon.uniqueId, () => updatedPokemon);
    };

    // itemData(마스터)가 있으면 마스터 데이터만, 없을 때만 item 데이터 사용
    // itemData(allItems 원본)에 호출자가 넘긴 item의 override(conditionBoost/evBoost/specialEffect 등)를 병합
    const src = itemData ? { ...itemData, ...Object.fromEntries(
      ['conditionBoost', 'evBoost', 'ivBoost', 'specialEffect', 'boostAmount', 'friendshipBoost', 'effortOverride']
        .filter(k => item[k] !== undefined)
        .map(k => [k, item[k]])
    ) } : item;
    if (src.isCustom && src.specialEffect === 'iv') {
      src.specialEffect = null;
    }

    // 멤버(트레이너) 본인 경험치 상승 — 대상 포켓몬 없이도 바로 사용 가능
    if (src.specialEffect === 'trainerExp') {
      const boost = Math.max(0, Number(src.boostAmount) || 0);
      if (boost <= 0) {
        alert('이 아이템은 상승량이 설정되어 있지 않습니다!');
        return;
      }
      consumeItem(item, { trainerExp: (Number(currentUser.trainerExp) || 0) + boost });
      alert(`${item.name}을(를) 사용해서 경험치를 ${boost} 얻었습니다!`);
      return;
    }

    // 최대 포켓몬 슬롯 +N — 대상 포켓몬 없이도 바로 사용 가능, 사용한 멤버 개인에게만 누적 적용.
    // bonusPokemonSlots는 같은 아이템을 연달아 사용할 수 있는 누적값이라 trainerExp처럼
    // consumeItem의 closure 기반 extraUpdates가 아니라 runTransaction 기반 adjustNumericField로
    // 처리한다 (CLAUDE.md 재화/누적값 갱신 규칙 참고).
    if (src.specialEffect === 'maxPokemonSlots') {
      const boost = Math.max(0, Number(src.boostAmount) || 0);
      if (boost <= 0) {
        alert('이 아이템은 슬롯 증가량이 설정되어 있지 않습니다!');
        return;
      }
      if (typeof adjustNumericField !== 'function') {
        alert('현재 이 아이템을 사용할 수 없습니다.');
        return;
      }
      await consumeItem(item);
      await adjustNumericField('bonusPokemonSlots', boost);
      alert(`${item.name}을(를) 사용해서 최대 포켓몬 슬롯이 +${boost} 되었습니다!`);
      return;
    }

    // 볼 변경 티켓 / 미용실 이용권 - 대상 포켓몬 없이 사용, 즉시 QnA "아이템" 탭 작성 모달을 띄운다.
    // 여기서는 소모하지 않음 (실제 글이 등록에 성공해야만 소모되도록 App.jsx의 QnA 작성 흐름에서 소모 처리)
    if (src.specialEffect === 'qnaItemPermit') {
      if (typeof onRequestQnaWrite !== 'function') {
        alert('현재 이 아이템을 사용할 수 없습니다.');
        return;
      }
      onRequestQnaWrite(item, src.permitKind || 'general');
      return;
    }

    if (!pokemon) return;

    // 특성패치 - 이 포켓몬이 가질 수 있는 특성(숨겨진 특성 포함) 중 원하는 것을 골라 변경
    if (src.specialEffect === 'abilityPatch' && !item.__chosenAbility) {
      const template = findPokemonTemplate(pokemon, allPokemonMaster);
      const { abilities, hiddenAbility } = getPokemonAbilities(template);
      const options = [...abilities, ...(hiddenAbility ? [hiddenAbility] : [])]
        .filter((ability, index, all) => all.findIndex(a => a.nameEn === ability.nameEn) === index);

      if (options.length === 0) {
        alert('이 포켓몬의 특성 정보를 찾을 수 없습니다!');
        return;
      }
      if (typeof onRequestAbilitySelect !== 'function') {
        alert('현재 이 아이템을 사용할 수 없습니다.');
        return;
      }
      releaseItemUseLock();
      onRequestAbilitySelect(item, pokemon, options);
      return;
    }

    // 기술머신(범용)/하트비늘 - 배울 수 있는 기술 목록에서 하나를 골라 학습
    const isGenericTmItem = src.specialEffect === 'learnAnyTmMove';
    const isGenericEggItem = src.specialEffect === 'learnAnyEggMove';

    if (isGenericTmItem || isGenericEggItem) {
      // 2단계: 모달에서 이미 기술을 고른 뒤 재호출된 경우 - 바로 학습 + 소모
      if (item.__chosenMoveId) {
        const moveData = allMoves.find(m => m.id === item.__chosenMoveId);
        if (!moveData) {
          alert('기술 정보를 찾을 수 없습니다!');
          return;
        }
        const success = await movesHook.learnMove(pokemon.uniqueId, moveData, item.__chosenOldMoveId || null);
        if (success) {
          consumeItem(item);
        }
        return;
      }

      // 1단계: 배울 수 있는 기술 후보를 모아 선택 모달을 요청
      const learnset = getPokemonLearnset(pokemonLearnsets, pokemon);
      if (!learnset) {
        alert(`${pokemon.nickname || pokemon.name}의 기술 습득 정보를 찾을 수 없습니다!`);
        return;
      }

      const poolIds = isGenericTmItem ? getLearnsetTmMoves(learnset) : getLearnsetEggMoves(learnset);
      const knownMoveIds = new Set((pokemon.moves || []).map(m => m.moveId));
      const options = poolIds
        .filter(moveId => !knownMoveIds.has(moveId))
        .map(moveId => allMoves.find(m => m.id === moveId))
        .filter(Boolean);

      if (options.length === 0) {
        alert(`${pokemon.nickname || pokemon.name}이(가) 이 아이템으로 새로 배울 수 있는 기술이 없습니다!`);
        return;
      }

      if (typeof onRequestMoveChoice !== 'function') {
        alert('현재 이 아이템을 사용할 수 없습니다.');
        return;
      }

      releaseItemUseLock();
      onRequestMoveChoice(item, pokemon, options, isGenericTmItem ? 'tm' : 'egg');
      return;
    }

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
        const success = await movesHook.learnMove(pokemon.uniqueId, moveData);
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
      const success = await movesHook.learnMove(pokemon.uniqueId, moveData, oldMoveId);

      if (success) {
        consumeItem(item);
      }
      return;
    }

    // 기존 아이템 로직
    const updatedPokemon = { ...pokemon, condition: { ...(pokemon.condition || {}) } };
    let itemUsed = false;
    const effectMessages = [];

    const statNameKo = {
      hp: 'HP', attack: '공격', defense: '방어', specialAttack: '특공', specialDefense: '특방', speed: '스피드',
      elegance: '근사함', beauty: '아름다움', cuteness: '귀여움', intelligence: '슬기로움', strength: '강인함',
    };

    // 특성패치 2단계 - 모달에서 이미 특성을 고른 뒤 재호출된 경우 바로 적용 + 소모
    if (src.specialEffect === 'abilityPatch' && item.__chosenAbility) {
      updatedPokemon.ability = item.__chosenAbility.name;
      updatedPokemon.abilityEn = item.__chosenAbility.nameEn;
      updatedPokemon.isHiddenAbility = Boolean(item.__chosenAbility.isHidden);
      updatePokemonInUser(updatedPokemon);
      alert(`${pokemon.nickname || pokemon.name}의 특성이 ${item.__chosenAbility.name}(으)로 바뀌었습니다!`);
      consumeItem(item);
      return;
    }

    if (src.specialEffect === 'effortEdit' && src.effortOverride) {
      const nextEffort = {
        hp: 0,
        attack: 0,
        defense: 0,
        specialAttack: 0,
        specialDefense: 0,
        speed: 0,
        ...Object.fromEntries(
          Object.entries(src.effortOverride).map(([key, value]) => [
            key,
            Math.min(252, Math.max(0, Number(value) || 0))
          ])
        )
      };
      const totalEffort = Object.values(nextEffort).reduce((sum, value) => sum + Number(value || 0), 0);
      if (totalEffort > 510) {
        alert('기초포인트 총합은 510을 초과할 수 없습니다.');
        return;
      }
      updatedPokemon.effort = nextEffort;
      if (updatedPokemon.effortValues) {
        updatedPokemon.effortValues = nextEffort;
      }
      updatePokemonInUser(updatedPokemon);
      alert(`${pokemon.nickname || pokemon.name}의 기초포인트를 수정했습니다!`);
      consumeItem(item);
      return;
    }

    if (isSoyYYNItem(item) || isSoyYYNItem(itemData) || isSoyYYNItem(src)) {
      if (onRequestStatSelection) {
        releaseItemUseLock();
        onRequestStatSelection(item, pokemon, 'effortEdit', 0);
        return;
      }
    }

    if (src.friendshipBoost) {
      const baseBoost = src.friendshipBoost;
      const boost = Math.max(0, Math.floor(baseBoost * (pokemon.friendshipGainMultiplier || 1)));
      const current = pokemon.friendship || 0;
      updatedPokemon.friendship = Math.min(255, current + boost);
      if (updatedPokemon.friendship > current) {
        effectMessages.push('친밀도가 ' + updatedPokemon.friendship + '으로 올랐습니다!');
      }
      itemUsed = true;
    }

    if (src.ivBoost && !src.isCustom) {
      const boost = src.ivBoost;
      Object.keys(boost).forEach(stat => {
        if (updatedPokemon.ivs && updatedPokemon.ivs[stat] !== undefined) {
          const current = updatedPokemon.ivs[stat] || 0;
          const newValue = Math.min(31, current + boost[stat]);
          updatedPokemon.ivs[stat] = newValue;
          if (newValue > current) {
            effectMessages.push((statNameKo[stat] || stat) + ' 개체값이 ' + newValue + '으로 올랐습니다!');
          }
          itemUsed = true;
        }
      });
    }

    // 사용자가 항목을 선택하는 conditionSelect / evSelect
    if (src.specialEffect === 'conditionSelect' || src.specialEffect === 'evSelect') {
      if (onRequestStatSelection) {
        releaseItemUseLock();
        onRequestStatSelection(item, pokemon, src.specialEffect, Number(src.boostAmount) || 1);
        return;
      }
    }

    if (src.evBoost) {
      const boost = src.evBoost;
      const effort = {
        hp: 0,
        attack: 0,
        defense: 0,
        specialAttack: 0,
        specialDefense: 0,
        speed: 0,
        ...(updatedPokemon.effort || updatedPokemon.effortValues || {})
      };

      Object.keys(boost).forEach(stat => {
        if (effort[stat] !== undefined) {
          const current = Number(effort[stat] || 0);
          const totalEV = Object.values(effort).reduce((sum, v) => sum + Number(v || 0), 0);
          const remaining = 510 - totalEV;
          const actualBoost = Math.min(Number(boost[stat]) || 0, remaining, 252 - current);

          if (actualBoost > 0) {
            const newValue = current + actualBoost;
            effort[stat] = newValue;
            effectMessages.push((statNameKo[stat] || stat) + ' 기초포인트 ' + actualBoost + '이 상승하였다!');
            itemUsed = true;
          }
        }
      });

      updatedPokemon.effort = effort;
      if (updatedPokemon.effortValues) {
        updatedPokemon.effortValues = effort;
      }
    }

    if (src.conditionBoost) {
      const boost = src.conditionBoost;
      const condMax = Number(systemSettingsRef.current?.conditionMax) > 0
        ? Number(systemSettingsRef.current.conditionMax)
        : 100;
      Object.keys(boost).forEach(condKey => {
        const current = Number(updatedPokemon.condition?.[condKey] || 0);
        if (current >= condMax) { itemUsed = true; return; }
        const newValue = Math.min(condMax, current + boost[condKey]);
        if (newValue > current) {
          updatedPokemon.condition[condKey] = newValue;
          effectMessages.push((statNameKo[condKey] || condKey) + '이(가) ' + newValue + '으로 올랐습니다!');
        }
        itemUsed = true;
      });
    }

    const specialEffect = src.specialEffect;
    if (specialEffect && typeof specialEffect === 'string' && specialEffect.length > 10) {
      effectMessages.push('효과: ' + specialEffect);
      itemUsed = true;
    }

    // 진화 아이템(category가 evolution인 경우 + 예외 아이템)은 아래 itemUsed 얼리리턴보다
    // 먼저 체크해야 한다 - 안 그러면 spicy_wailord처럼 친밀도 등 다른 효과가 같이 붙은
    // 진화 아이템은 그 효과 처리에서 먼저 return돼버려 진화 체크에 영영 도달하지 못한다.
    // updatedPokemon을 넘겨서 여기서 오른 친밀도 등이 진화 결과에도 반영되게 한다.
    if (itemData?.category?.includes('evolution') || EVOLUTION_CHECK_EXCEPTION_ITEMS.has(itemData?.nameEn)) {
      const success = evolutionHook.evolveWithItem(updatedPokemon, itemData.nameEn || itemData.name);
      if (success) {
        consumeItem(item);
        return;
      }
    }

    if (itemUsed) {
      updatePokemonInUser(updatedPokemon);
      const name = pokemon.nickname || pokemon.name;
      const detail = effectMessages.length > 0 ? '\n\n' + effectMessages.join('\n') : '\n\n이미 최대치입니다.';
      alert(name + '에게 ' + item.name + '을(를) 사용했습니다!' + detail);
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

    // 폼체인지 아이템 (꿀 포함)
    const nectarFormNameEn = NECTAR_FORM_MAP[itemData?.nameEn];
    const formChangeNumbers = FORM_CHANGE_ITEMS[itemData?.nameEn];
    const isNectar = Boolean(nectarFormNameEn);
    const isFormChangeItem = isNectar || Boolean(formChangeNumbers);

    if (isFormChangeItem && typeof changePokemonForm === 'function') {
      // UI에서 이미 폼이 선택된 경우 (selectedFormNameEn 전달됨)
      const targetFormNameEn = selectedFormNameEn || nectarFormNameEn;
      if (targetFormNameEn) {
        const success = await changePokemonForm(pokemon.uniqueId, targetFormNameEn);
        if (success) {
          if (isNectar || CONSUMABLE_FORM_CHANGE_ITEMS.has(itemData?.nameEn)) consumeItem(item);
        }
        return;
      }
      // fallback: 선택 UI 없이 호출된 경우 (기존 prompt 방식)
      if (formChangeNumbers && typeof getPokemonFormCandidates === 'function') {
        const baseNumber = Number(pokemon.originalNumber || pokemon.number);
        if (!formChangeNumbers.includes(baseNumber)) {
          alert('이 아이템은 이 포켓몬에게 사용할 수 없습니다!');
          releaseItemUseLock();
          return;
        }
        const forms = getPokemonFormCandidates(pokemon);
        const otherForms = forms.filter(f => f.nameEn !== pokemon.nameEn);
        if (otherForms.length === 0) {
          alert('변경 가능한 폼이 없습니다.');
          releaseItemUseLock();
          return;
        }
        const formList = otherForms.map((f, i) => `${i + 1}. ${f.name || f.nameEn}`).join('\n');
        const choice = window.prompt(`${pokemon.nickname || pokemon.name}의 폼을 선택하세요:\n\n${formList}\n\n번호를 입력하세요 (취소: 0)`);
        if (!choice || choice === '0') { releaseItemUseLock(); return; }
        const idx = parseInt(choice) - 1;
        if (isNaN(idx) || idx < 0 || idx >= otherForms.length) {
          alert('올바른 번호를 입력해주세요.');
          releaseItemUseLock();
          return;
        }
        await changePokemonForm(pokemon.uniqueId, otherForms[idx].id || otherForms[idx].nameEn || otherForms[idx].name);
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
