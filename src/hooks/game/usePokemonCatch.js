// src/hooks/game/usePokemonCatch.js
// 포켓몬 포획 시스템

import { getBaseStatPatch } from '../../utils/pokemonBaseStats';
import { getAbilityEnglishName } from '../../utils/abilityUtils';
import { normalizeIVs } from '../../utils/pokemonIndividualValues';
import { getPokemonDisplayParts } from '../../utils/pokemonDisplayName';
import { withWurmpleEvolutionId } from '../../utils/wurmpleEvolution';

export const usePokemonCatch = (
  currentUser,
  updateCurrentUser,
  updateCaughtPokemon,
  updateInventory,
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
  const handleCatchSuccess = async (pokemon, ballUsed, regionName, regions, consumeBall = false) => {
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
    const ballName = ballUsed.name || ballItem?.name || '';
    const ballNameEn = ballUsed.nameEn || ballItem?.nameEn || '';
    const isFriendBall = ballName.includes('프렌드') || ballNameEn === 'friend-ball';
    const isLuxuryBall = ballName.includes('럭셔리') || ballNameEn === 'luxury-ball';
    
    // 개체값 생성
    // 성별/특성은 조우 화면(useRegionExplore)에서 이미 뽑아 유저에게 보여준 값이 있으므로,
    // 여기서 다시 뽑으면 "조우 때 본 것"과 "실제로 잡히는 것"이 달라질 수 있다. level/ivs/isShiny와
    // 같은 방식으로 encounter에서 넘어온 값을 그대로 쓰고, 없을 때만(다른 경로로 호출된 경우) 새로 뽑는다.
    // 크기(size)는 조우 화면에 안 보여주므로 여기서 새로 뽑아도 안전하다.
    const gender = pokemon.gender || generateGender(pokemonTemplate);
    const size = generateSize(pokemonTemplate);
    const ability = pokemon.ability || generateAbility(pokemonTemplate, false);
    const abilityEn = pokemon.abilityEn || getAbilityEnglishName(ability) || pokemonTemplate.abilitiesEn?.[0] || null;
    const ivs = pokemon.ivs ? normalizeIVs(pokemon.ivs) : generateIVs();
    
    const FLAVORS = ['매운맛', '신맛', '단맛', '쓴맛', '짠맛'];
    const favoriteFlavor = FLAVORS[Math.floor(Math.random() * FLAVORS.length)];

    const newPokemon = withWurmpleEvolutionId({
      uniqueId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      favoriteFlavor,
      pokemonId: pokemonTemplate.id,
      name: getPokemonDisplayParts(pokemonTemplate).name || pokemonTemplate.name,
      nameEn: pokemonTemplate.nameEn,
      number: pokemonTemplate.number,
      originalNumber: pokemonTemplate.originalNumber || pokemonTemplate.number,
      regionalForm: pokemonTemplate.regionalForm || null,
      formVariant: pokemonTemplate.formVariant || null,
      type: pokemonTemplate.type,
      type2: pokemonTemplate.type2 || null,
      ...getBaseStatPatch(pokemonTemplate),
      level: level,
      caughtLevel: level, // 만난 순간의 레벨을 고정 저장 (레벨업해도 "레벨 N에 만났다" 문구가 안 바뀌도록)
      hp: pokemonTemplate.baseHp,
      maxHp: pokemonTemplate.baseHp,
      exp: 0,
      friendship: isFriendBall ? 200 : 0,
      friendshipGainMultiplier: isLuxuryBall ? 2 : 1,
      caughtWithFriendBall: isFriendBall,
      caughtWithLuxuryBall: isLuxuryBall,
      heldItem: null,
      moves: getStartingMoves(pokemonTemplate, level, movesData),
      caughtWithBall: ballUsed.name,
      ballImageUrl: ballUsed.imageUrl || ballItem?.spriteUrl || ballItem?.imageUrl,
      caughtLocation: regionName || null,
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
      iconUrl: (() => {
        const orig = pokemonTemplate.originalNumber;
        const iconNum = (orig === 710 || orig === 711) ? orig : pokemonTemplate.number;
        return pokemon.isShiny
          ? `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/versions/generation-viii/icons/shiny/${iconNum}.png`
          : `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/versions/generation-viii/icons/${iconNum}.png`;
      })(),
      spriteUrl: pokemon.isShiny
        ? `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/shiny/${pokemonTemplate.number}.png`
        : `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/${pokemonTemplate.number}.png`
    });

    // ⭐ 클로저에 갇힌 caughtPokemon 스냅샷을 기준으로 통째로 덮어쓰면, 짧은 시간 안에 여러 마리를
    // 연달아 잡을 때 나중 호출이 먼저 잡은 포켓몬을 지운 배열로 되돌려버릴 수 있다(먼저 잡은 포켓몬이
    // 사라지는 버그의 원인). 항상 Firebase의 최신 배열을 기준으로 트랜잭션으로 병합한다.
    const caughtResult = await updateCaughtPokemon((currentCaught) => {
      const party = currentCaught.slice(0, 6);
      const box = currentCaught.slice(6);

      const emptySlotIndex = party.findIndex(p => !p || p === null);

      if (emptySlotIndex !== -1) {
        console.log('✅ 엔트리 빈 슬롯', emptySlotIndex, '에 포켓몬 추가');
        party[emptySlotIndex] = newPokemon;
        return [...party, ...box];
      }

      console.log('📦 엔트리 가득참 - 박스에 포켓몬 추가');
      return [...party, ...box, newPokemon];
    });

    if (!caughtResult.committed) {
      alert('포켓몬을 잡는 중 오류가 발생했습니다. 다시 시도해주세요.');
      return;
    }

    console.log('🎉 포켓몬 잡기 완료!');

    const exhaustedExp = Number(pokemon.pendingDailyExploreExhaustedExp) || 0;

    // consumeBall=true 이면 볼도 같은 이유로 최신 인벤토리를 기준으로 트랜잭션 소모
    let updatedInventory = null;
    if (consumeBall && !currentUser.isSuperAdmin) {
      const invResult = await updateInventory((currentInventory = []) => (
        currentInventory.map(item =>
          (item.itemId === ballUsed?.id || item.name === ballUsed?.name)
            ? { ...item, count: Math.max(0, (Number(item.count) || 0) - 1) }
            : item
        )
      ));
      if (invResult.committed) {
        updatedInventory = invResult.snapshot.val();
      }
    }

    if (exhaustedExp > 0 && Number(currentUser.dailyWalks) > 0) {
      await updateCurrentUser({
        trainerExp: (Number(currentUser.trainerExp) || 0) + exhaustedExp
      });
    }

    // 첫 포획 기록
    const formNumber = String(pokemonTemplate.number);
    const originalNumber = String(pokemonTemplate.originalNumber || pokemonTemplate.number);
    const isRegionalForm = formNumber !== originalNumber;
    const isFirstFormCatch = await recordFirstCatch(formNumber);
    const isFirstOriginalCatch = isRegionalForm
      ? await recordFirstCatch(originalNumber)
      : isFirstFormCatch;
    const isFirstCatch = isFirstOriginalCatch;
    const pokemonNumber = originalNumber;

    return { isFirstCatch, pokemonNumber, pokemonTemplate, updatedInventory };
  };

  return {
    handleCatchSuccess
  };
};

export default usePokemonCatch;
