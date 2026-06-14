import { useState } from 'react';
import evolutionsData from '../../data/evolutions.json';
import { getBaseStatPatch } from '../../utils/pokemonBaseStats';
import { getPokemonDisplayParts } from '../../utils/pokemonDisplayName';

const getBaseName = (pokemon) => getPokemonDisplayParts(pokemon).name;

export const useEvolution = (currentUser, updateCurrentUser, allPokemonMaster) => {
  const [evolutionModal, setEvolutionModal] = useState(null);

  const toPokemonNumber = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };

  const getPokemonNumberCandidates = (pokemon = {}) => {
    const currentNumber = toPokemonNumber(pokemon.number);
    if (currentNumber !== null) return [currentNumber];

    return [pokemon.originalNumber, pokemon.pokemonId]
      .map(toPokemonNumber)
      .filter((number, index, numbers) => number !== null && numbers.indexOf(number) === index);
  };

  const findEvolutionForPokemon = (pokemon, predicate = () => true) => {
    const candidates = getPokemonNumberCandidates(pokemon);
    return evolutionsData.evolutions.find((evo) =>
      candidates.includes(toPokemonNumber(evo.from)) && predicate(evo)
    );
  };

  const findPokemonTemplateByNumber = (number) => {
    const targetNumber = toPokemonNumber(number);
    return allPokemonMaster.find((pokemon) =>
      toPokemonNumber(pokemon.number) === targetNumber ||
      toPokemonNumber(pokemon.originalNumber) === targetNumber
    );
  };

 // 진화 가능 여부 확인
  const checkEvolution = (pokemon) => {
    console.log('🔍 checkEvolution 호출:', pokemon.name, pokemon.number, 'Lv.', pokemon.level);
    
    if (!pokemon) {
      console.log('❌ pokemon이 없음');
      return null;
    }

    // 해당 포켓몬의 진화 정보 찾기
    const evolution = findEvolutionForPokemon(pokemon);
    
    console.log('📋 찾은 진화 정보:', evolution);

    if (!evolution) {
      console.log('❌ 진화 정보 없음 (이 포켓몬은 진화하지 않거나 최종 진화형)');
      return null;
    }

    const { condition } = evolution;
    console.log('📝 진화 조건:', condition);

    // 레벨 진화
    if (condition.type === 'level') {
      console.log('🎚️ 레벨 진화 체크:', pokemon.level, '>=', condition.level);
      
      if (pokemon.level >= condition.level) {
        console.log('✅ 레벨 조건 충족!');
        
        // 추가 조건 확인
        if (condition.timeOfDay) {
          const hour = new Date().getHours();
          const currentTime = hour >= 6 && hour < 18 ? 'day' : 'night';
          console.log('⏰ 시간 조건:', currentTime, '필요:', condition.timeOfDay);
          if (currentTime !== condition.timeOfDay) {
            console.log('❌ 시간 조건 미충족');
            return null;
          }
        }

        if (condition.partyType) {
          // 파티에 특정 타입 포켓몬이 있는지 확인
          const hasType = currentUser.caughtPokemon
            .slice(0, 6)
            .some(p => p && (p.type === condition.partyType || p.type2 === condition.partyType));
          console.log('🎭 파티 타입 조건:', condition.partyType, '보유:', hasType);
          if (!hasType) {
            console.log('❌ 파티 타입 조건 미충족');
            return null;
          }
        }

        if (condition.knownMove) {
          // 특정 기술을 알고 있는지 확인
          const hasMove = pokemon.moves?.some(
            m => m.moveId === condition.knownMove || m.name?.toLowerCase() === condition.knownMove
          );
          console.log('⚔️ 기술 조건:', condition.knownMove, '보유:', hasMove);
          if (!hasMove) {
            console.log('❌ 기술 조건 미충족');
            return null;
          }
        }

        console.log('🎉 모든 조건 충족! 진화 가능!');
        return evolution;
      } else {
        console.log('❌ 레벨 조건 미충족');
      }
    }

    // 친밀도 진화
    if (condition.type === 'friendship') {
      console.log('💖 친밀도 진화 체크:', pokemon.friendship || 0, '>=', condition.friendship);
      
      if ((pokemon.friendship || 0) >= condition.friendship) {
        console.log('✅ 친밀도 조건 충족!');
        
        if (condition.timeOfDay) {
          const hour = new Date().getHours();
          const currentTime = hour >= 6 && hour < 18 ? 'day' : 'night';
          console.log('⏰ 시간 조건:', currentTime, '필요:', condition.timeOfDay);
          if (currentTime !== condition.timeOfDay) {
            console.log('❌ 시간 조건 미충족');
            return null;
          }
        }
        
        console.log('🎉 모든 조건 충족! 진화 가능!');
        return evolution;
      } else {
        console.log('❌ 친밀도 조건 미충족');
      }
    }

    // 아이템 진화는 별도 함수에서 처리
    // 교환 진화는 나중에 구현

    console.log('❌ 최종: 진화 조건 미충족');
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
      
      const evolvedPokemonData = findPokemonTemplateByNumber(evolution.to);
      
      if (!evolvedPokemonData) {
        console.log('❌ 진화할 포켓몬 데이터 없음');
        return false;
      }
      
      setEvolutionModal({
        show: true,
        pokemon: pokemon,
        evolution: evolution,
        fromPokemon: pokemon,
        toPokemon: evolvedPokemonData,
        isItemEvolution: false
      });
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
    
    const evolution = findEvolutionForPokemon(pokemon, (evo) => {
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
    
    // ⭐ 변경: 바로 진화하지 않고 모달 표시
    const evolvedPokemonData = findPokemonTemplateByNumber(evolution.to);
    
    if (!evolvedPokemonData) {
      alert('진화할 포켓몬 데이터를 찾을 수 없습니다!');
      return false;
    }
    
    console.log('✨ 진화 모달 표시:', pokemon.name, '→', evolvedPokemonData.name);
    
    // 진화 모달 표시 (실제 진화는 acceptEvolution에서)
    setEvolutionModal({
      show: true,
      pokemon: pokemon,
      evolution: evolution,
      fromPokemon: pokemon,
      toPokemon: evolvedPokemonData,
      isItemEvolution: true
    });
    
    return true;
  };

  // 진화 실행
  const performEvolution = (pokemon, evolution) => {
    const evolvedTemplate = findPokemonTemplateByNumber(evolution.to);

    if (!evolvedTemplate) {
      alert('❌ 진화 정보를 찾을 수 없습니다!');
      return false;
    }

    const updatedPokemon = currentUser.caughtPokemon.map(p => {
      if (p && p.uniqueId === pokemon.uniqueId) {
        return {
          ...p,
          number: evolvedTemplate.number,
          originalNumber: evolvedTemplate.originalNumber || evolvedTemplate.number,
          pokemonId: evolvedTemplate.number,
          name: getBaseName(evolvedTemplate),
          nameEn: evolvedTemplate.nameEn,
          type: evolvedTemplate.type,
          type2: evolvedTemplate.type2 || null,
          ...getBaseStatPatch(evolvedTemplate),
          imageUrl: evolvedTemplate.imageUrl,
          iconUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-viii/icons/${evolvedTemplate.number}.png`,
          spriteUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${evolvedTemplate.number}.png`,
          // 닉네임이 종족명이면 제거, 커스텀 닉네임은 유지
          nickname: (p.nickname && p.nickname !== getBaseName(p) && p.nickname !== p.name && p.nickname !== p.nameEn) ? p.nickname : null,
          evolutionCancelled: false
        };
      }
      return p;
    });

    const evolvedAt = Date.now();
    const evolutionHistoryEntry = {
      id: `evolution_${pokemon.uniqueId || evolvedAt}_${evolvedAt}`,
      pokemonId: pokemon.uniqueId || null,
      fromName: pokemon.nickname || getBaseName(pokemon),
      toName: getBaseName(evolvedTemplate),
      toNameEn: evolvedTemplate.nameEn,
      toNumber: evolvedTemplate.number,
      imageUrl: evolvedTemplate.imageUrl,
      evolvedAt
    };

    updateCurrentUser({
      caughtPokemon: updatedPokemon,
      evolutionHistory: [
        evolutionHistoryEntry,
        ...((currentUser.evolutionHistory || []).filter(Boolean))
      ].slice(0, 10)
    });
    return true;
  };

  // 진화 수락
  const acceptEvolution = () => {
    if (!evolutionModal || !evolutionModal.pokemon || !evolutionModal.evolution) {
      console.log('❌ 진화 모달 정보 없음');
      return;
    }

    const { pokemon, evolution } = evolutionModal;
    const success = performEvolution(pokemon, evolution);

    if (success) {
      const evolvedTemplate = findPokemonTemplateByNumber(evolution.to);
      alert(`🎉 축하합니다!\n${pokemon.nickname || pokemon.name}이(가) ${evolvedTemplate.name}(으)로 진화했습니다!`);
    }

    setEvolutionModal(null);
  };
  
// 수동 진화 (포켓몬 상세에서 진화 버튼 클릭)
const manualEvolve = (pokemon) => {
  console.log('🎯 manualEvolve 호출:', pokemon.name, 'Lv.', pokemon.level);
  
  // 변함없는돌을 지니고 있으면 진화 불가
  if (pokemon.heldItem === 'everstone' || pokemon.heldItem === '변함없는돌') {
    alert('변함없는돌을 지니고 있어 진화할 수 없습니다!');
    return false;
  }
  
  const evolution = checkEvolution(pokemon);
  console.log('🎯 진화 정보:', evolution);
  
  if (!evolution) {
    alert('아직 진화 조건을 충족하지 못했습니다!');
    return false;
  }
  
  // 모달 표시 (실제 진화는 acceptEvolution에서)
  const evolvedPokemonData = findPokemonTemplateByNumber(evolution.to);
  
  if (!evolvedPokemonData) {
    alert('진화할 포켓몬 데이터를 찾을 수 없습니다!');
    return false;
  }
  
  console.log('✨ 진화 모달 표시:', pokemon.name, '→', evolvedPokemonData.name);
  
  setEvolutionModal({
    show: true,
    pokemon: pokemon,
    evolution: evolution,
    fromPokemon: pokemon,
    toPokemon: evolvedPokemonData,
    isItemEvolution: false
  });
  
  return true;
};

  // 진화 거부
  const cancelEvolution = () => {
    if (!evolutionModal || !evolutionModal.pokemon) {
      setEvolutionModal(null);
      return;
    }
    
    const { pokemon, isItemEvolution } = evolutionModal;
    
    // 아이템 진화는 거부 플래그 저장하지 않음 (아이템을 다시 사용하면 다시 진화 가능)
    if (!isItemEvolution) {
      // 레벨업 진화만 거부 플래그 저장
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
    } else {
      alert(`${pokemon.nickname || pokemon.name}의 진화를 취소했습니다.`);
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
