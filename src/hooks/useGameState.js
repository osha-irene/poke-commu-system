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

  // 트레이너 데이터
  const [trainer, setTrainer] = useState({
    name: '지우',
    dailyWalks: 3,
    maxDailyWalks: 5,
    money: 5000 // 나중에 아이템 구매용
  });

  // 트레이너가 잡은 포켓몬 (실제 소유)
  const [caughtPokemon, setCaughtPokemon] = useState([
    { 
      uniqueId: 1, // 고유 ID (같은 포켓몬을 여러 번 잡을 수 있으므로)
      pokemonId: 4, // pokemon.json의 id
      name: '피카츄', 
      number: 25, 
      type: '전기', 
      level: 25, 
      hp: 100, 
      maxHp: 100,
      exp: 0,
      imageUrl: '/images/pokemon/025.png'
    },
    { 
      uniqueId: 2,
      pokemonId: 2,
      name: '파이리', 
      number: 4, 
      type: '불꽃', 
      level: 18, 
      hp: 80, 
      maxHp: 85,
      exp: 0,
      imageUrl: '/images/pokemon/004.png'
    },
  ]);

  // 트레이너가 가진 아이템 (인벤토리)
  const [inventory, setInventory] = useState([
    { itemId: 1, name: '몬스터볼', count: 15, imageUrl: '/images/items/pokeball.png' },
    { itemId: 2, name: '슈퍼볼', count: 5, imageUrl: '/images/items/greatball.png' },
    { itemId: 3, name: '하이퍼볼', count: 2, imageUrl: '/images/items/ultraball.png' },
    { itemId: 4, name: '이상한사탕', count: 3, imageUrl: '/images/items/rare-candy.png' },
  ]);

  // 구역 설정 (관리자가 수정 가능)
  const [regions, setRegions] = useState(() => {
    // regionsData에서 로드하고 defaultPokemon을 pokemons로 복사
    return regionsData.regions.map(region => ({
      ...region,
      pokemons: region.defaultPokemon
    }));
  });

  const handleRegionClick = (region) => {
    if (trainer.dailyWalks > 0) {
      // 해당 지역에 등장하는 포켓몬 중 랜덤 선택
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
    // JSON 데이터를 기반으로 새 포켓몬 생성
    const pokemonTemplate = allPokemon.find(p => p.id === pokemon.id);
    
    const newPokemon = {
      uniqueId: Date.now(), // 고유 ID
      pokemonId: pokemon.id, // 원본 포켓몬 ID
      name: pokemon.name,
      number: pokemon.number,
      type: pokemon.type,
      level: Math.floor(Math.random() * 20) + 5, // 랜덤 레벨
      hp: pokemonTemplate.baseHp,
      maxHp: pokemonTemplate.baseHp,
      exp: 0,
      imageUrl: pokemon.imageUrl
    };
    
    setCaughtPokemon(prev => [...prev, newPokemon]);

    // 인벤토리에서 볼 차감
    setInventory(prev => prev.map(item => 
      item.name === ballUsed.name 
        ? { ...item, count: Math.max(0, item.count - 1) }
        : item
    ));
  };

  // 관리자 기능 - 산책 횟수 설정
  const updateMaxDailyWalks = (newMax) => {
    setTrainer(prev => ({
      ...prev,
      maxDailyWalks: newMax
    }));
  };

  // 관리자 기능 - 구역 포켓몬 설정
  const updateRegionPokemon = (regionId, pokemonIds) => {
    setRegions(prev => prev.map(region => 
      region.id === regionId 
        ? { ...region, pokemons: pokemonIds }
        : region
    ));
  };

  // 아이템 추가 (이벤트/보상용)
  const addItemToInventory = (itemId, count = 1) => {
    const itemTemplate = allItems.find(i => i.id === itemId);
    if (!itemTemplate) return;

    setInventory(prev => {
      const existingItem = prev.find(item => item.itemId === itemId);
      if (existingItem) {
        // 이미 있으면 개수 증가
        return prev.map(item =>
          item.itemId === itemId
            ? { ...item, count: item.count + count }
            : item
        );
      } else {
        // 없으면 새로 추가
        return [...prev, {
          itemId: itemTemplate.id,
          name: itemTemplate.name,
          count: count,
          imageUrl: itemTemplate.imageUrl
        }];
      }
    });
  };

  return {
    currentTab,
    setCurrentTab,
    isAdmin,
    setIsAdmin,
    trainer,
    caughtPokemon,
    items: inventory, // 기존 코드 호환을 위해 items로 export
    encounterPokemon,
    regions,
    allPokemon, // 마스터 데이터
    allItems, // 마스터 데이터
    handleRegionClick,
    handleCloseEncounter,
    handleCatchSuccess,
    updateMaxDailyWalks,
    updateRegionPokemon,
    addItemToInventory
  };
}