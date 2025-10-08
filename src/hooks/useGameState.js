import { useState, useEffect } from 'react';
import pokemonData from '../data/pokemon.json';
import itemsData from '../data/items.json';
import regionsData from '../data/regions.json';

export default function useGameState() {
  const [currentTab, setCurrentTab] = useState('map');
  const [isAdmin, setIsAdmin] = useState(false);
  const [encounterPokemon, setEncounterPokemon] = useState(null);

  // 마스터 데이터 (JSON에서 로드)
  const [allPokemon] = useState(pokemonData.pokemon);
  const [allItems] = useState(itemsData.items);

  // LocalStorage에서 불러오기 함수
  const loadFromStorage = (key, defaultValue) => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        return JSON.parse(saved);
      }
      return defaultValue;
    } catch (error) {
      console.error(`Error loading ${key} from localStorage:`, error);
      return defaultValue;
    }
  };

  // 트레이너 데이터 (LocalStorage에서 불러오기)
  const [trainer, setTrainer] = useState(() => 
    loadFromStorage('poke_trainer', {
      name: '지우',
      dailyWalks: 5,
      maxDailyWalks: 5,
      money: 5000
    })
  );

  // 트레이너가 잡은 포켓몬
  const [caughtPokemon, setCaughtPokemon] = useState(() =>
    loadFromStorage('poke_caughtPokemon', [])
  );

  // 트레이너가 가진 아이템
  const [inventory, setInventory] = useState(() =>
    loadFromStorage('poke_inventory', [
      { itemId: 1, name: '몬스터볼', count: 15, imageUrl: '/images/items/pokeball.png' },
      { itemId: 2, name: '슈퍼볼', count: 5, imageUrl: '/images/items/greatball.png' },
      { itemId: 3, name: '하이퍼볼', count: 2, imageUrl: '/images/items/ultraball.png' },
      { itemId: 4, name: '이상한사탕', count: 3, imageUrl: '/images/items/rare-candy.png' },
    ])
  );

  // 구역 설정
  const [regions, setRegions] = useState(() => {
    const savedRegions = loadFromStorage('poke_regions', null);
    if (savedRegions) {
      return savedRegions;
    }
    
    // 처음 실행시 기본값
    return regionsData.regions.map(region => ({
      ...region,
      pokemons: region.defaultPokemon
    }));
  });

  // 자동 저장 - trainer 변경될 때마다
  useEffect(() => {
    localStorage.setItem('poke_trainer', JSON.stringify(trainer));
  }, [trainer]);

  // 자동 저장 - caughtPokemon 변경될 때마다
  useEffect(() => {
    localStorage.setItem('poke_caughtPokemon', JSON.stringify(caughtPokemon));
  }, [caughtPokemon]);

  // 자동 저장 - inventory 변경될 때마다
  useEffect(() => {
    localStorage.setItem('poke_inventory', JSON.stringify(inventory));
  }, [inventory]);

  // 자동 저장 - regions 변경될 때마다
  useEffect(() => {
    localStorage.setItem('poke_regions', JSON.stringify(regions));
  }, [regions]);

  // 매일 자정에 산책 횟수 리셋
  useEffect(() => {
    const checkAndResetWalks = () => {
      const lastReset = localStorage.getItem('poke_lastWalkReset');
      const today = new Date().toDateString();
      
      if (lastReset !== today) {
        setTrainer(prev => ({
          ...prev,
          dailyWalks: prev.maxDailyWalks
        }));
        localStorage.setItem('poke_lastWalkReset', today);
      }
    };

    // 페이지 로드시 체크
    checkAndResetWalks();
    
    // 1시간마다 체크
    const interval = setInterval(checkAndResetWalks, 60 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const handleRegionClick = (region) => {
    if (trainer.dailyWalks > 0) {
      const regionPokemonIds = region.pokemons;
      const availablePokemon = allPokemon.filter(p => regionPokemonIds.includes(p.id));
      
      if (availablePokemon.length > 0) {
        const randomPokemon = availablePokemon[Math.floor(Math.random() * availablePokemon.length)];
        setEncounterPokemon(randomPokemon);
        
        setTrainer(prev => ({
          ...prev,
          dailyWalks: prev.dailyWalks - 1
        }));
      }
    } else {
      alert('오늘의 산책 횟수를 모두 사용했습니다!');
    }
  };

  const handleCloseEncounter = () => {
    setEncounterPokemon(null);
  };

  const handleCatchSuccess = (pokemon, ballUsed) => {
    const pokemonTemplate = allPokemon.find(p => p.id === pokemon.id);
    
    const newPokemon = {
      uniqueId: Date.now(),
      pokemonId: pokemon.id,
      name: pokemon.name,
      number: pokemon.number,
      type: pokemon.type,
      level: Math.floor(Math.random() * 20) + 5,
      hp: pokemonTemplate.baseHp,
      maxHp: pokemonTemplate.baseHp,
      exp: 0,
      imageUrl: pokemon.imageUrl
    };
    
    setCaughtPokemon(prev => [...prev, newPokemon]);

    setInventory(prev => prev.map(item => 
      item.name === ballUsed.name 
        ? { ...item, count: Math.max(0, item.count - 1) }
        : item
    ));
  };

  const updateMaxDailyWalks = (newMax) => {
    setTrainer(prev => ({
      ...prev,
      maxDailyWalks: newMax
    }));
  };

  const updateRegionPokemon = (regionId, pokemonIds) => {
    setRegions(prev => prev.map(region => 
      region.id === regionId 
        ? { ...region, pokemons: pokemonIds }
        : region
    ));
  };

  const addItemToInventory = (itemId, count = 1) => {
    const itemTemplate = allItems.find(i => i.id === itemId);
    if (!itemTemplate) return;

    setInventory(prev => {
      const existingItem = prev.find(item => item.itemId === itemId);
      if (existingItem) {
        return prev.map(item =>
          item.itemId === itemId
            ? { ...item, count: item.count + count }
            : item
        );
      } else {
        return [...prev, {
          itemId: itemTemplate.id,
          name: itemTemplate.name,
          count: count,
          imageUrl: itemTemplate.imageUrl
        }];
      }
    });
  };

  // 게임 데이터 초기화 (디버그용)
  const resetGameData = () => {
    const confirmed = window.confirm(
      '⚠️ 모든 게임 데이터를 초기화하시겠습니까?\n\n' +
      '- 포획한 포켓몬\n' +
      '- 보유 아이템\n' +
      '- 산책 횟수\n' +
      '- 관리자 설정\n\n' +
      '이 작업은 되돌릴 수 없습니다!'
    );
    
    if (confirmed) {
      // LocalStorage 모든 게임 데이터 삭제
      localStorage.removeItem('poke_trainer');
      localStorage.removeItem('poke_caughtPokemon');
      localStorage.removeItem('poke_inventory');
      localStorage.removeItem('poke_regions');
      localStorage.removeItem('poke_lastWalkReset');
      
      // 페이지 새로고침
      window.location.reload();
    }
  };

  return {
    currentTab,
    setCurrentTab,
    isAdmin,
    setIsAdmin,
    trainer,
    caughtPokemon,
    items: inventory,
    encounterPokemon,
    regions,
    allPokemon,
    allItems,
    handleRegionClick,
    handleCloseEncounter,
    handleCatchSuccess,
    updateMaxDailyWalks,
    updateRegionPokemon,
    addItemToInventory,
    resetGameData
  };
}