// src/hooks/game/useRegionExplore.js
// 지역 탐험 시스템

import { useIndividualValues } from './useIndividualValues';

const SAFARI_BALL_DAILY_REWARD_COUNT = 10;

const getLocalDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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

  const normalizeRate = (value, fallback = 1) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return parsed > 1 ? parsed / 100 : parsed;
  };

  const addInventoryItem = (inventory = [], itemData, count) => {
    if (!itemData || count <= 0) return inventory;

    const nextInventory = Array.isArray(inventory) ? [...inventory] : [];
    const existingIndex = nextInventory.findIndex((item) => (
      item.itemId === itemData.id ||
      item.name === itemData.name ||
      item.nameEn === itemData.nameEn
    ));

    if (existingIndex !== -1) {
      nextInventory[existingIndex] = {
        ...nextInventory[existingIndex],
        count: (Number(nextInventory[existingIndex].count) || 0) + count
      };
      return nextInventory;
    }

    return [
      ...nextInventory,
      {
        itemId: itemData.id,
        name: itemData.name,
        nameEn: itemData.nameEn,
        count,
        imageUrl: itemData.spriteUrl || itemData.imageUrl,
        category: itemData.category,
        onUse: itemData.onUse || null
      }
    ];
  };

  // 지역 탐험
  const handleRegionClick = async (region, setEncounterPokemon, allItems) => {
    if (!currentUser) return;

    const baseRegionName = region.regionName || region.name;
    const placeName = region.placeName || null;
    const encounterLocationName = placeName
      ? `${baseRegionName} ${placeName}`
      : baseRegionName;

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
      const isSafari = region.isSafari === true;
      const safariBall = allItems.find((item) => item.nameEn === 'safari-ball' || item.name === '사파리볼');
      const todayKey = getLocalDateKey();
      const canReceiveSafariBalls = isSafari
        && safariBall
        && currentUser.lastSafariBallRewardDate !== todayKey;
      const nextDailyWalks = currentUser.dailyWalks - 1;
      const nextInventory = canReceiveSafariBalls
        ? addInventoryItem(currentUser.inventory, safariBall, SAFARI_BALL_DAILY_REWARD_COUNT)
        : currentUser.inventory;

      // 탐험 횟수 차감
      await updateCurrentUser({
        dailyWalks: nextDailyWalks,
        ...(canReceiveSafariBalls ? {
          inventory: nextInventory,
          lastSafariBallRewardDate: todayKey
        } : {})
      });
      console.log('✅ 탐험 횟수 차감 완료:', nextDailyWalks);

      if (canReceiveSafariBalls) {
        console.log(`✅ 사파리 장소 일일 입장 보상 지급: 사파리볼 x${SAFARI_BALL_DAILY_REWARD_COUNT}`);
      }

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
        const safariText = canReceiveSafariBalls
          ? `\n🎁 사파리볼 x${SAFARI_BALL_DAILY_REWARD_COUNT}을 받았습니다!`
          : '';
        alert(`🌿 ${encounterLocationName}을(를) 탐험했지만 포켓몬을 발견하지 못했습니다!${safariText}\n\n💰 ${loot.money}원을 획득했습니다!${itemText}`);
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
        await recordFirstEncounter(pokemonNumber, encounterLocationName);

        const regionMaxLevel = region.regionMaxLevel || region.maxLevel || 20;
        const maxLevel = Math.min(region.maxLevel || regionMaxLevel, regionMaxLevel);
        const minLevel = Math.min(region.minLevel || 5, maxLevel);
		const level = Math.floor(Math.random() * (maxLevel - minLevel + 1)) + minLevel;
        const baseCatchRate = normalizeRate(randomPokemon.catchRate, 0.2);
        const maxCatchRate = normalizeRate(region.maxCatchRate, 1);
        const catchRate = Math.min(baseCatchRate, maxCatchRate);

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
      catchRate,
      regionName: encounterLocationName,
      baseRegionId: region.baseRegionId || region.regionId || region.id,
      placeId: region.placeId || null,
      placeName,
      isCave: region.isCave === true,
      isWaterside: region.isWaterside === true,
      isSafari,
      minLevel,
      maxLevel,
		};

		setEncounterPokemon(encounteredPokemon);


      } else {
        alert(placeName ? '이 장소에는 포켓몬이 없습니다!' : '이 지역에는 포켓몬이 없습니다!');
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
