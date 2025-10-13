import { useState } from 'react';
import evolutionsData from '../data/evolutions.json';

export const useEvolution = (currentUser, updateCurrentUser, allPokemonMaster) => {
  const [evolutionModal, setEvolutionModal] = useState(null);

  // 진화 가능 여부 확인
  const checkEvolution = (pokemon) => {
    if (!pokemon) return null;

    // 해당 포켓몬의 진화 정보 찾기
    const evolution = evolutionsData.evolutions.find(
      evo => evo.from === pokemon.number
    );

    if (!evolution) return null;

    const { condition } = evolution;

    // 레벨 진화
    if (condition.type === 'level') {
      if (pokemon.level >= condition.level) {
        // 추가 조건 확인
        if (condition.timeOfDay) {
          // 시간대 조건은 현재 시뮬레이션
          const hour = new Date().getHours();
          const currentTime = hour >= 6 && hour < 18 ? 'day' : 'night';
          if (currentTime !== condition.timeOfDay) return null;
        }

        if (condition.partyType) {
          // 파티에 특정 타입 포켓몬이 있는지 확인
          const hasType = currentUser.caughtPokemon
            .slice(0, 6)
            .some(p => p && (p.type === condition.partyType || p.type2 === condition.partyType));
          if (!hasType) return null;
        }

        if (condition.knownMove) {
          // 특정 기술을 알고 있는지 확인
          const hasMove = pokemon.moves?.some(
            m => m.moveId === condition.knownMove || m.name?.toLowerCase() === condition.knownMove
          );
          if (!hasMove) return null;
        }

        return evolution;
      }
    }

    // 친밀도 진화
    if (condition.type === 'friendship') {
      if ((pokemon.friendship || 0) >= condition.friendship) {
        if (condition.timeOfDay) {
          const hour = new Date().getHours();
          const currentTime = hour >= 6 && hour < 18 ? 'day' : 'night';
          if (currentTime !== condition.timeOfDay) return null;
        }
        return evolution;
      }
    }

    // 아이템 진화는 별도 함수에서 처리
    // 교환 진화는 나중에 구현

    return null;
  };

  // 레벨업 시 진화 체크
  const checkEvolutionOnLevelUp = (pokemon) => {
    console.log('🔍 진화 체크 시작:', pokemon.name, 'Lv.', pokemon.level);
    
    // 변함없는돌을 지니고 있으면 진화 체크 안함
    if (pokemon.heldItem === 'everstone' || pokemon.heldItem === '변함없는돌') {
      console.log('🪨 변함없는돌 착용 중 - 진화 불가');
      return false;
    }
    
    // 이미 진화를 거부한 적이 있으면 자동 모달 띄우지 않음
    if (pokemon.evolutionCancelled) {
      console.log('❌ 이전에 진화를 취소함 - 자동 모달 안띄움');
      return false;
    }
    
    const evolution = checkEvolution(pokemon);
    console.log('🎯 진화 정보:', evolution);
    
    if (evolution) {
      console.log('✨ 진화 가능! 모달 띄우기');
      setEvolutionModal({ pokemon, evolution });
      return true;
    }
    
    console.log('❌ 진화 조건 미충족');
    return false;
  };

  // 아이템으로 진화
const evolveWithItem = (pokemon, itemName) => {
  console.log('🔥 evolveWithItem 호출');
  console.log('🔥 pokemon.number:', pokemon.number);
  console.log('🔥 itemName:', itemName);
  
  // 아이템 이름 정규화 (공백, 하이픈 제거, 소문자, 한글 제거)
  const normalizeItemName = (name) => {
    if (!name) return '';
    return name.toLowerCase()
      .replace(/[\s-_]/g, '')  // 공백, 하이픈, 언더스코어 제거
      .replace(/stone/g, '')    // 'stone' 제거
      .replace(/의돌/g, '')     // '의돌' 제거
      .replace(/[가-힣]/g, ''); // 모든 한글 제거
  };
  
  const normalizedItemName = normalizeItemName(itemName);
  console.log('🔥 normalizedItemName:', normalizedItemName);
  
  const evolution = evolutionsData.evolutions.find(evo => {
    if (evo.from !== pokemon.number) return false;
    if (evo.condition.type !== 'item') return false;
    
    const evolItem = normalizeItemName(evo.condition.item || '');
    console.log('🔥 체크 중:', evo.from, '→', evo.to, '아이템:', evolItem, '===', normalizedItemName);
    
    return evolItem === normalizedItemName;
  });

  console.log('🔥 찾은 진화:', evolution);

  if (!evolution) {
    alert('❌ 이 아이템으로는 진화할 수 없습니다!');
    return false;
  }

  performEvolution(pokemon, evolution);
  return true;
};

  // 진화 실행
  const performEvolution = (pokemon, evolution) => {
    const evolvedTemplate = allPokemonMaster.find(
      p => p.number === evolution.to
    );

    if (!evolvedTemplate) {
      alert('❌ 진화 정보를 찾을 수 없습니다!');
      return false;
    }

    const updatedPokemon = currentUser.caughtPokemon.map(p => {
      if (p && p.uniqueId === pokemon.uniqueId) {
        return {
          ...p,
          number: evolvedTemplate.number,
          name: evolvedTemplate.name,
          nameEn: evolvedTemplate.nameEn,
          type: evolvedTemplate.type,
          type2: evolvedTemplate.type2 || null,
          imageUrl: evolvedTemplate.imageUrl,
          iconUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-viii/icons/${evolvedTemplate.number}.png`,
          spriteUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${evolvedTemplate.number}.png`,
          // 닉네임은 유지, 진화 취소 플래그는 제거
          nickname: p.nickname || null,
          evolutionCancelled: false
        };
      }
      return p;
    });

    updateCurrentUser({ caughtPokemon: updatedPokemon });
    return true;
  };

  // 진화 수락
  const acceptEvolution = () => {
    if (!evolutionModal) return;

    const { pokemon, evolution } = evolutionModal;
    const success = performEvolution(pokemon, evolution);

    if (success) {
      const evolvedTemplate = allPokemonMaster.find(p => p.number === evolution.to);
      alert(`🎉 축하합니다!\n${pokemon.nickname || pokemon.name}이(가) ${evolvedTemplate.name}(으)로 진화했습니다!`);
    }

    setEvolutionModal(null);
  };
  
  // 수동 진화 (포켓몬 상세에서 진화 버튼 클릭)
  const manualEvolve = (pokemon) => {
    // 변함없는돌을 지니고 있으면 진화 불가
    if (pokemon.heldItem === 'everstone') {
      alert('❌ 변함없는돌을 지니고 있어 진화할 수 없습니다!');
      return false;
    }
    
    const evolution = checkEvolution(pokemon);
    if (!evolution) {
      alert('❌ 아직 진화 조건을 충족하지 못했습니다!');
      return false;
    }
    
    const success = performEvolution(pokemon, evolution);
    if (success) {
      const evolvedTemplate = allPokemonMaster.find(p => p.number === evolution.to);
      alert(`🎉 축하합니다!\n${pokemon.nickname || pokemon.name}이(가) ${evolvedTemplate.name}(으)로 진화했습니다!`);
    }
    
    return success;
  };

  // 진화 거부
  const cancelEvolution = () => {
    if (evolutionModal) {
      const { pokemon } = evolutionModal;
      
      // 진화를 거부했다는 표시를 저장
      const updatedPokemon = currentUser.caughtPokemon.map(p => {
        if (p && p.uniqueId === pokemon.uniqueId) {
          return {
            ...p,
            evolutionCancelled: true
          };
        }
        return p;
      });
      
      updateCurrentUser({ caughtPokemon: updatedPokemon });
      alert(`${pokemon.nickname || pokemon.name}의 진화를 취소했습니다.\n포켓몬 상세 화면에서 언제든지 진화시킬 수 있습니다.`);
    }
    setEvolutionModal(null);
  };

  // 진화 가능한 모든 포켓몬 찾기
  const getAllEvolvablePokemon = () => {
    if (!currentUser) return [];

    return currentUser.caughtPokemon
      .filter(p => p !== null)
      .map(pokemon => ({
        pokemon,
        evolution: checkEvolution(pokemon)
      }))
      .filter(item => item.evolution !== null);
  };

  return {
    evolutionModal,
    checkEvolution,
    checkEvolutionOnLevelUp,
    evolveWithItem,
    acceptEvolution,
    cancelEvolution,
    manualEvolve,
    getAllEvolvablePokemon
  };
};