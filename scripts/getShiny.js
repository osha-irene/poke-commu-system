// 포켓몬 데이터에 shiny 스프라이트 추가 스크립트
// 실행 방법: node getShiny.js

/**
 * 포켓몬 이색 스프라이트 URL 생성 함수
 */
const getShinySprite = (number) => {
  return `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/shiny/${number}.png`;
};

/**
 * 포켓몬 배열에 shiny 데이터 추가
 */
const addShinySpritesToPokemon = (pokemonArray) => {
  console.log('🌟 이색 스프라이트 추가 시작...');
  
  const updatedPokemon = pokemonArray.map(pokemon => {
    return {
      ...pokemon,
      // 이색 스프라이트 URL 추가
      shinySprite: getShinySprite(pokemon.number),
      
      // 이색 여부 플래그 (나중에 사용할 수 있음)
      isShiny: false
    };
  });
  
  console.log('✅ 이색 스프라이트 추가 완료!');
  console.log(`총 ${updatedPokemon.length}마리의 포켓몬에 shiny 데이터가 추가되었습니다.`);
  
  return updatedPokemon;
};

/**
 * JSON 파일로 저장 (Node.js 환경)
 */
const saveToFile = (data, filename = 'pokemon_with_shiny.json') => {
  const fs = require('fs');
  fs.writeFileSync(filename, JSON.stringify(data, null, 2), 'utf8');
  console.log(`💾 파일 저장 완료: ${filename}`);
};

/**
 * 브라우저에서 JSON 다운로드
 */
const downloadJSON = (data, filename = 'pokemon_with_shiny.json') => {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  console.log(`💾 파일 다운로드 시작: ${filename}`);
};

/**
 * 포켓몬 인스턴스에 이색 플래그 토글
 * (포획된 포켓몬을 이색으로 만들 때 사용)
 */
const toggleShiny = (pokemon) => {
  return {
    ...pokemon,
    isShiny: !pokemon.isShiny
  };
};

/**
 * 이색 확률 계산 (기본 1/4096)
 */
const rollShiny = (shinyCharm = false) => {
  const baseOdds = 4096;
  const charmBonus = shinyCharm ? 2 : 0;
  const rolls = 1 + charmBonus;
  
  for (let i = 0; i < rolls; i++) {
    if (Math.random() < 1 / baseOdds) {
      return true;
    }
  }
  return false;
};

/**
 * 포획 시 이색 판정
 */
const catchPokemon = (pokemonData, hasShinyCharm = false) => {
  const isShiny = rollShiny(hasShinyCharm);
  
  const caughtPokemon = {
    ...pokemonData,
    isShiny: isShiny,
    // 이색이면 shiny 스프라이트 사용, 아니면 일반 스프라이트 사용
    currentSprite: isShiny ? pokemonData.shinySprite : pokemonData.spriteUrl
  };
  
  if (isShiny) {
    console.log('✨✨✨ 이색 포켓몬이다! ✨✨✨');
  }
  
  return caughtPokemon;
};

/**
 * 특정 포켓몬 테스트
 */
const testShinySprite = () => {
  console.log('🧪 이색 스프라이트 테스트:');
  console.log('피카츄:', getShinySprite(25));
  console.log('뮤츠:', getShinySprite(150));
  console.log('루카리오:', getShinySprite(448));
};

// ===== Node.js에서 실행 =====
if (typeof require !== 'undefined' && require.main === module) {
  const fs = require('fs');
  
  // allPokemon.json 파일 읽기
  try {
    const rawData = JSON.parse(fs.readFileSync('./allPokemon.json', 'utf8'));
    
    // 데이터가 배열인지 객체인지 확인
    let pokemonArray;
    if (Array.isArray(rawData)) {
      pokemonArray = rawData;
    } else if (rawData.pokemon && Array.isArray(rawData.pokemon)) {
      pokemonArray = rawData.pokemon;
    } else if (rawData.pokemons && Array.isArray(rawData.pokemons)) {
      pokemonArray = rawData.pokemons;
    } else {
      // 객체의 첫 번째 배열 속성 찾기
      const firstArrayKey = Object.keys(rawData).find(key => Array.isArray(rawData[key]));
      if (firstArrayKey) {
        pokemonArray = rawData[firstArrayKey];
        console.log(`📦 '${firstArrayKey}' 속성에서 포켓몬 배열을 찾았습니다.`);
      } else {
        throw new Error('포켓몬 배열을 찾을 수 없습니다. JSON 구조를 확인해주세요.');
      }
    }
    
    console.log(`📊 총 ${pokemonArray.length}마리의 포켓몬 발견`);
    
    const updatedPokemon = addShinySpritesToPokemon(pokemonArray);
    
    // 원본 구조 유지하면서 저장
    let outputData;
    if (Array.isArray(rawData)) {
      outputData = updatedPokemon;
    } else {
      outputData = { ...rawData };
      const arrayKey = Object.keys(rawData).find(key => Array.isArray(rawData[key]));
      outputData[arrayKey] = updatedPokemon;
    }
    
    saveToFile(outputData, 'allPokemon_with_shiny.json');
    
  } catch (error) {
    console.error('❌ 에러 발생:', error.message);
    console.log('\n💡 사용법:');
    console.log('1. allPokemon.json 파일이 같은 폴더에 있는지 확인');
    console.log('2. 파일명이 다르다면 코드에서 파일명 수정');
    console.log('3. node getShiny.js 실행');
    console.log('\n📋 JSON 파일 예시 구조:');
    console.log('  [{ "number": 1, "name": "이상해씨" }, ...]');
    console.log('  또는');
    console.log('  { "pokemon": [{ "number": 1, "name": "이상해씨" }, ...] }');
  }
}

// Export (모듈로 사용할 경우)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getShinySprite,
    addShinySpritesToPokemon,
    saveToFile,
    toggleShiny,
    rollShiny,
    catchPokemon,
    testShinySprite
  };
}

// 브라우저 전역 객체로 노출
if (typeof window !== 'undefined') {
  window.PokemonShinyUtils = {
    getShinySprite,
    addShinySpritesToPokemon,
    downloadJSON,
    toggleShiny,
    rollShiny,
    catchPokemon,
    testShinySprite
  };
  
  console.log('🌟 PokemonShinyUtils 로드 완료!');
}