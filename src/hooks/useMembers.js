import { useState, useEffect } from 'react';
import { loadFromStorage, saveToStorage } from '../utils/storage';
import itemsData from '../data/items.json';

export const useMembers = (allPokemonData) => {
  const [members, setMembers] = useState(() => {
    const saved = loadFromStorage('poke_members', null);
    
    if (saved) {
      const updated = {};
      Object.keys(saved).forEach(userId => {
        const member = saved[userId];
        
        const updatedCaughtPokemon = member.caughtPokemon?.map(pokemon => {
          if (!pokemon) return pokemon;
          if (pokemon.nameEn) return pokemon;
          
          const template = allPokemonData.find(p => 
            p.number === pokemon.number || p.id === pokemon.pokemonId
          );
          
          if (template && template.nameEn) {
            return { ...pokemon, nameEn: template.nameEn };
          }
          
          return pokemon;
        }) || member.caughtPokemon;
        
        updated[userId] = { ...member, caughtPokemon: updatedCaughtPokemon };
      });
      
      saveToStorage('poke_members', updated);
      return updated;
    }

    const findItem = (searchTerms) => {
      return itemsData.items.find(i => 
        searchTerms.some(term => {
          const nameEn = i.nameEn?.toLowerCase().replace(/[éê]/g, 'e');
          const searchTerm = term.toLowerCase().replace(/[éê]/g, 'e');
          return nameEn?.includes(searchTerm) || i.name?.includes(term);
        })
      );
    };

    const getInitialInventory = () => {
      const pokeBall = findItem(['poke ball', 'pokeball', '몬스터볼']);
      const greatBall = findItem(['great ball', 'super ball', '슈퍼볼', '수퍼볼']);
      const ultraBall = findItem(['ultra ball', 'hyper ball', '하이퍼볼']);
      const rareCandy = findItem(['rare candy', '이상한사탕']);

      return [
        { itemId: pokeBall?.id || 4, name: '몬스터볼', count: 15, imageUrl: pokeBall?.spriteUrl || 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png' },
        { itemId: greatBall?.id || 3, name: '슈퍼볼', count: 5, imageUrl: greatBall?.spriteUrl || 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/great-ball.png' },
        { itemId: ultraBall?.id || 2, name: '하이퍼볼', count: 2, imageUrl: ultraBall?.spriteUrl || 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/ultra-ball.png' },
        { itemId: rareCandy?.id || 50, name: '이상한사탕', count: 3, imageUrl: rareCandy?.spriteUrl || 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/rare-candy.png' }
      ];
    };

    const initialMembers = {
      admin: {
        id: 'admin',
        password: 'admin123',
        name: '관리자',
        isAdmin: true,
        isSuperAdmin: true,
        dailyWalks: 5,
        maxDailyWalks: 5,
        money: 5000,
        caughtPokemon: [],
        inventory: getInitialInventory()
      }
    };
    saveToStorage('poke_members', initialMembers);
    return initialMembers;
  });

  // 자동 저장
  useEffect(() => {
    saveToStorage('poke_members', members);
  }, [members]);

  return {
    members,
    setMembers
  };
};