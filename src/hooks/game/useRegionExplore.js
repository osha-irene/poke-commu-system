// src/hooks/game/useRegionExplore.js
// 지역 탐험 시스템

import { useIndividualValues } from './useIndividualValues';
import { DEFAULT_IVS } from '../../utils/pokemonIndividualValues';

const SAFARI_BALL_DAILY_REWARD_COUNT = 10;
const DAILY_EXPLORE_EXHAUSTED_EXP = 100;

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
  usePokedex,
  updateInventory
) => {

  const { generateGender, generateAbility } = useIndividualValues();
  const { generateLoot, getDefaultLootConfig, applyLoot } = useLoot;
  const { recordFirstEncounter } = usePokedex;

  const normalizeRate = (value, fallback = 1) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return parsed > 1 ? parsed / 100 : parsed;
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
      const isDailyExploreExhausted = nextDailyWalks === 0;
      const nextTotalExploreCount = (Number(currentUser.totalExploreCount) || 0) + 1;

      // 탐험 횟수 차감 (사파리볼은 사파리 구역 탐험 시 즉시 지급 - 조우 창에서 바로 써야 하므로
      // 포획 성공 이후로 미루면 정작 그 조우에서 쓸 볼이 없어 아무 볼도 못 고르는 상황이 생김)
      await updateCurrentUser({
        dailyWalks: nextDailyWalks,
        totalExploreCount: nextTotalExploreCount,
        ...(isDailyExploreExhausted ? { trainerExp: (Number(currentUser.trainerExp) || 0) + DAILY_EXPLORE_EXHAUSTED_EXP } : {}),
        ...(canReceiveSafariBalls ? { lastSafariBallRewardDate: todayKey } : {})
      });
      console.log('✅ 탐험 횟수 차감 완료:', nextDailyWalks);

      if (canReceiveSafariBalls) {
        await updateInventory((inventory) => {
          const idx = (inventory || []).findIndex(i => i.itemId === safariBall.id || i.nameEn === safariBall.nameEn);
          if (idx >= 0) {
            // itemId가 없는(과거 버그로 저장된) 항목이 매칭됐을 수도 있으므로, 병합 시
            // itemId를 항상 다시 채워서 정상 모양으로 복구한다.
            return inventory.map((i, n) => n === idx ? {
              ...i,
              itemId: safariBall.id,
              count: (i.count || 0) + SAFARI_BALL_DAILY_REWARD_COUNT
            } : i);
          }
          return [
            ...(inventory || []),
            {
              itemId: safariBall.id,
              name: safariBall.name,
              nameEn: safariBall.nameEn,
              count: SAFARI_BALL_DAILY_REWARD_COUNT,
              imageUrl: safariBall.spriteUrl || safariBall.imageUrl || ''
            }
          ];
        });
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
        alert(`🌿 ${encounterLocationName}을(를) 탐험했지만 포켓몬을 발견하지 못했습니다!\n\n💰 ${loot.money}원을 획득했습니다!${itemText}`);
        if (isDailyExploreExhausted) {
          alert(`오늘의 모든 탐험을 완료했습니다!\n경험치 ${DAILY_EXPLORE_EXHAUSTED_EXP}을 받았습니다.`);
        }
        return;
      }

      // 포켓몬 조우 시
      const regionPokemonIds = region.pokemons || [];
      const searchPokedex = region.allowNationalPokedex ? allPokemonMaster : gamePokedex;

      const matchedPokemon = searchPokedex.filter(p =>
        regionPokemonIds.includes(p.id) ||
        regionPokemonIds.includes(p.number)
      );

      // 장소 설정에서 특정 폼(예: 플라베베 색깔 폼)을 명시적으로 골라도, 그 폼이
      // "게임 도감"에는 원종만 등록되어 있고 폼 자체는 별도 등록이 안 돼 있으면
      // 위 필터에서 조용히 빠져서 항상 원종만 나오는 것처럼 보인다. 장소에서 이미
      // 명시적으로 선택한 id는 전국 도감에서라도 찾아서 후보에 포함시킨다.
      const matchedIds = new Set();
      matchedPokemon.forEach(p => { matchedIds.add(p.id); matchedIds.add(p.number); });
      const missingIds = regionPokemonIds.filter(id => !matchedIds.has(id));
      const fallbackPokemon = missingIds.length > 0
        ? allPokemonMaster.filter(p => missingIds.includes(p.id) || missingIds.includes(p.number))
        : [];

      // 메가진화 폼은 배틀 전용이라 야생 조우에 절대 나오면 안 된다. 예전 장소 설정에
      // 실수로 메가폼 번호(예: tatsugiri-*-mega)가 저장돼 있어도 여기서 방어적으로 거른다.
      const isMegaForm = (p) =>
        /-mega(-[xy])?$/i.test(String(p?.formVariant || p?.nameEn || p?.species || ''));
      const availablePokemon = [...matchedPokemon, ...fallbackPokemon].filter(p => !isMegaForm(p));

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
      ivs: DEFAULT_IVS,
      catchRate,
      regionName: encounterLocationName,
      baseRegionId: region.baseRegionId || region.regionId || region.id,
      placeId: region.placeId || null,
      placeName,
      isCave: region.isCave === true,
      isWaterside: region.isWaterside === true,
      isSafari,
      background: region.background || null,
      minLevel,
      maxLevel,
      pendingDailyExploreExhaustedExp: isDailyExploreExhausted ? DAILY_EXPLORE_EXHAUSTED_EXP : 0,
		};

		setEncounterPokemon(encounteredPokemon);


      } else {
        alert(placeName ? '이 장소에는 포켓몬이 없습니다!' : '이 지역에는 포켓몬이 없습니다!');
        if (isDailyExploreExhausted) {
          alert(`오늘의 모든 탐험을 완료했습니다!\n경험치 ${DAILY_EXPLORE_EXHAUSTED_EXP}을 받았습니다.`);
        }
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
