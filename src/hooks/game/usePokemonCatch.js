// src/hooks/game/usePokemonCatch.js
// 포켓몬 포획 시스템

import { getBaseStatPatch } from '../../utils/pokemonBaseStats';
import { getAbilityEnglishName } from '../../utils/abilityUtils';

export const usePokemonCatch = (
  currentUser,
  updateCurrentUser,
  allPokemonMaster,
  allItems,
  allMoves,
  movesData,
  useIndividualValues,
  useMoves,
  usePokedex,
  systemSettings = {}
) => {
  
  const { generateGender, generateSize, generateAbility, generateIVs } = useIndividualValues;
  const { getStartingMoves } = useMoves;
  const { recordFirstCatch } = usePokedex;

  // 포켓몬 잡기
  const handleCatchSuccess = async (pokemon, ballUsed, regionName, regions) => {
    if (!currentUser) return;
    
    console.log('🎯 포획 시도:', pokemon);
    console.log('  - pokemon.number:', pokemon.number);
    console.log('  - pokemon.originalNumber:', pokemon.originalNumber);
    
    const nonPartnerCount = currentUser.caughtPokemon.filter(p => p && !p.isPartner).length;
    
    const maxNonPartnerPokemon = Number(systemSettings.maxNonPartnerPokemon) || 18;
    if (nonPartnerCount >= maxNonPartnerPokemon) {
      alert(`⚠️ 파트너를 제외한 포켓몬이 ${maxNonPartnerPokemon}마리입니다!\n더 이상 포켓몬을 잡을 수 없습니다.`);
      return;
    }
    
    // number로 직접 검색 (리전폼의 경우 number가 10103 같은 고유 번호)
    const pokemonTemplate = allPokemonMaster.find(p => p.number === pokemon.number);
    
    console.log('  - 찾은 템플릿:', pokemonTemplate?.name, 'number:', pokemonTemplate?.number);
    
    if (!pokemonTemplate) {
      console.error('❌ 포켓몬 템플릿을 찾을 수 없습니다!');
      console.error('  - 검색한 번호:', pokemon.number);
      alert('포켓몬 정보를 찾을 수 없습니다!');
      return;
    }
    
    const region = regions.find(r => r.name === regionName || r.areaName === regionName);
    const minLevel = pokemon.minLevel || region?.minLevel || 5;
    const maxLevel = pokemon.maxLevel || region?.maxLevel || 20;
    const level = pokemon.level || Math.floor(Math.random() * (maxLevel - minLevel + 1)) + minLevel;
    
    const ballItem = allItems.find(item => 
      item.name === ballUsed.name || item.id === ballUsed.id
    );
    
    // 개체값 생성
    const gender = generateGender(pokemonTemplate);
    const size = generateSize(pokemonTemplate);
    const ability = generateAbility(pokemonTemplate, false);
    const abilityEn = getAbilityEnglishName(ability) || pokemonTemplate.abilitiesEn?.[0] || null;
    const ivs = generateIVs();
    
    const newPokemon = {
      uniqueId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      pokemonId: pokemonTemplate.id,
      name: pokemonTemplate.name,
      nameEn: pokemonTemplate.nameEn,
      number: pokemonTemplate.number,
      originalNumber: pokemonTemplate.originalNumber || pokemonTemplate.number,
      formVariant: pokemonTemplate.formVariant || null,
      type: pokemonTemplate.type,
      type2: pokemonTemplate.type2 || null,
      ...getBaseStatPatch(pokemonTemplate),
      level: level,
      hp: pokemonTemplate.baseHp,
      maxHp: pokemonTemplate.baseHp,
      exp: 0,
      friendship: 0,
      heldItem: null,
      moves: getStartingMoves(pokemonTemplate, level, movesData),
      caughtWithBall: ballUsed.name,
      ballImageUrl: ballUsed.imageUrl || ballItem?.spriteUrl || ballItem?.imageUrl,
      isPartner: false,
      isShiny: pokemon.isShiny || false,
      
      // 개체값 속성들
      gender: gender,
      height: size.height,
      weight: size.weight,
      sizeRank: size.sizeRank,
      heightVariation: size.heightVariation,
      weightVariation: size.weightVariation,
      ability: ability,
      abilityEn,
      isHiddenAbility: false,
      
      condition: { elegance: 0, beauty: 0, cuteness: 0, intelligence: 0, strength: 0 },
      ivs,
      effort: { 
        hp: 0, 
        attack: 0, 
        defense: 0, 
        specialAttack: 0,
        specialDefense: 0,
        speed: 0 
      },
      imageUrl: pokemonTemplate.imageUrl,
      iconUrl: pokemon.isShiny 
        ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-viii/icons/shiny/${pokemonTemplate.number}.png`
        : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-viii/icons/${pokemonTemplate.number}.png`,
      spriteUrl: pokemon.isShiny
        ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${pokemonTemplate.number}.png`
        : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonTemplate.number}.png`
    };

    const currentPokemon = [...currentUser.caughtPokemon];
    const party = currentPokemon.slice(0, 6);
    const box = currentPokemon.slice(6);
    
    let emptySlotIndex = -1;
    for (let i = 0; i < 6; i++) {
      if (!party[i] || party[i] === null) {
        emptySlotIndex = i;
        break;
      }
    }
    
    let updatedCaughtPokemon;
    
    if (emptySlotIndex !== -1) {
      console.log('✅ 엔트리 빈 슬롯', emptySlotIndex, '에 포켓몬 추가');
      party[emptySlotIndex] = newPokemon;
      updatedCaughtPokemon = [...party, ...box];
    } else {
      console.log('📦 엔트리 가득참 - 박스에 포켓몬 추가');
      updatedCaughtPokemon = [...party, ...box, newPokemon];
    }
    
    console.log('🎉 포켓몬 잡기 완료!');
    
    updateCurrentUser({ caughtPokemon: updatedCaughtPokemon });

    // 첫 포획 기록
    const formNumber = String(pokemonTemplate.number);
    const originalNumber = String(pokemonTemplate.originalNumber || pokemonTemplate.number);
    const isRegionalForm = formNumber !== originalNumber;
    const isFirstFormCatch = await recordFirstCatch(formNumber);
    const isFirstOriginalCatch = isRegionalForm
      ? await recordFirstCatch(originalNumber)
      : isFirstFormCatch;
    const isFirstCatch = isFirstFormCatch || isFirstOriginalCatch;
    const pokemonNumber = originalNumber;
    
    return { isFirstCatch, pokemonNumber, pokemonTemplate };
  };

  return {
    handleCatchSuccess
  };
};

export default usePokemonCatch;
