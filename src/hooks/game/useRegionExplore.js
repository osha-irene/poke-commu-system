// src/hooks/game/useRegionExplore.js
// 지역 탐험 시스템

import { useIndividualValues } from './useIndividualValues';

export const useRegionExplore = (
  currentUser,
  updateCurrentUser,
  allPokemonMaster,
  gamePokedex,
  useLoot,
  usePokedex
) => {
  
  const { generateGender, generateAbility } = useIndividualValues();
  const { generateLoot, getDefaultLootConfig, applyLoot } = useLoot;
  const { recordFirstEncounter } = usePokedex;

  // 지역 탐험
  const handleRegionClick = async (region, setEncounterPokemon, allItems) => {
    if (!currentUser) return;

    // 안전하게 배열로 변환
    const accessibleRegions = Array.isArray(currentUser.accessibleRegions) 
      ? currentUser.accessibleRegions 
      : [];
      
    if (accessibleRegions.length > 0 && !accessibleRegions.includes(region.id)) {
      alert('⛔ 이 구역에 접근할 수 없습니다!');
      return;
    }

    if (currentUser.dailyWalks > 0) {
      // 조우 확률 계산
      let encounterRatePercent = region.encounterRate !== undefined ? region.encounterRate : 80;
      
      if (encounterRatePercent < 1) {
        encounterRatePercent = encounterRatePercent * 100;
      }
      
      const encounterRate = encounterRatePercent / 100;
      
      console.log('🎲 조우 확률:', {
        원본값: region.encounterRate,
        설정값: encounterRatePercent + '%',
        실제확률: encounterRate,
        랜덤값: Math.random()
      });
      
      const randomEncounter = Math.random();
      
      // 탐험 횟수 차감
      await updateCurrentUser({ dailyWalks: currentUser.dailyWalks - 1 });
      console.log('✅ 탐험 횟수 차감 완료:', currentUser.dailyWalks - 1);

      // 포켓몬 미조우 시
      if (randomEncounter >= encounterRate) {
        const loot = generateLoot(region.lootConfig || getDefaultLootConfig(), allItems);
        const itemList = [
          ...loot.items.map(item => `${item.name} x${item.count}`),
          ...loot.ingredients.map(item => `${item.name} x${item.count}`),
          ...loot.berries.map(item => `${item.name} x${item.count}`)
        ];
        applyLoot(loot, null);
        const itemText = itemList.length > 0 ? `\n🎁 ${itemList.join(', ')}` : '';
        alert(`🌿 ${region.name}을(를) 탐험했지만 포켓몬을 발견하지 못했습니다!\n\n💰 ${loot.money}원을 획득했습니다!${itemText}`);
        return;
      }
      
      // 포켓몬 조우 시
      const regionPokemonIds = region.pokemons || []; 
      const searchPokedex = region.allowNationalPokedex ? allPokemonMaster : gamePokedex;

      const availablePokemon = searchPokedex.filter(p => 
        regionPokemonIds.includes(p.id) || 
        regionPokemonIds.includes(p.number)
      );

      if (availablePokemon.length > 0) {
        const rates = region.pokemonRates || {};
        const weightedPokemon = [];
    
        availablePokemon.forEach(p => {
          const id = p.id || p.number;
          const weight = rates[id] || 10;
          for (let i = 0; i < weight; i++) {
            weightedPokemon.push(p);
          }
        });
        
        const randomPokemon = weightedPokemon[Math.floor(Math.random() * weightedPokemon.length)];
        
        const shinyRate = region.shinyRate || 4096;
        const isShiny = Math.random() < (1 / shinyRate);
        
        console.log('✨ 이로치 판정:', {
          pokemon: randomPokemon.name,
          shinyRate: shinyRate,
          probability: `1/${shinyRate}`,
          isShiny: isShiny
        });
        
        const pokemonNumber = String(randomPokemon.number);
        
        // 첫 조우 기록
        await recordFirstEncounter(pokemonNumber, region.name);
        
        const loot = generateLoot(region.lootConfig || getDefaultLootConfig(), allItems);
        
        const minLevel = region.minLevel || 5;
		const maxLevel = region.maxLevel || 20;
		const level = Math.floor(Math.random() * (maxLevel - minLevel + 1)) + minLevel;

		// 성별 생성
		const gender = generateGender(randomPokemon);

		// 특성 생성
		const ability = generateAbility(randomPokemon, false);

		const encounteredPokemon = {
		  ...randomPokemon,
		  level,
		  isShiny,
		  gender,
		  ability,
		};

		setEncounterPokemon(encounteredPokemon);
        
        
      } else {
        alert('이 지역에는 포켓몬이 없습니다!');
      }
    } else {
      alert('오늘의 탐험 횟수를 모두 소진했습니다!');
    }
  };

  return {
    handleRegionClick
  };
};

export default useRegionExplore;