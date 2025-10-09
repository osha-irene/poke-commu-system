const fs = require('fs');
const https = require('https');

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

const TYPE_MAP = {
  'normal': '노말', 'fire': '불꽃', 'water': '물',
  'electric': '전기', 'grass': '풀', 'ice': '얼음',
  'fighting': '격투', 'poison': '독', 'ground': '땅',
  'flying': '비행', 'psychic': '에스퍼', 'bug': '벌레',
  'rock': '바위', 'ghost': '고스트', 'dragon': '드래곤',
  'dark': '악', 'steel': '강철', 'fairy': '페어리'
};

async function fixLeafeon() {
  console.log('리피아(#470) 데이터 추가 중...\n');

  try {
    // 1. 기존 데이터 읽기
    const data = JSON.parse(fs.readFileSync('src/data/allPokemon.json', 'utf8'));
    
    // 2. 리피아 데이터 가져오기
    const pokemonData = await fetchJSON('https://pokeapi.co/api/v2/pokemon/470');
    const speciesData = await fetchJSON(pokemonData.species.url);
    
    const koreanName = speciesData.names.find(n => n.language.name === 'ko');
    const types = pokemonData.types
      .sort((a, b) => a.slot - b.slot)
      .map(t => TYPE_MAP[t.type.name] || t.type.name);
    
    const leafeon = {
      id: 470,
      number: 470,
      name: koreanName?.name || 'leafeon',
      nameEn: 'leafeon',
      type: types[0],
      type2: types[1] || null,
      catchRate: (speciesData.capture_rate / 255).toFixed(2),
      baseHp: pokemonData.stats.find(s => s.stat.name === 'hp').base_stat,
      baseAttack: pokemonData.stats.find(s => s.stat.name === 'attack').base_stat,
      baseDefense: pokemonData.stats.find(s => s.stat.name === 'defense').base_stat,
      baseSpeed: pokemonData.stats.find(s => s.stat.name === 'speed').base_stat,
      generation: speciesData.generation.name.replace('generation-', ''),
      imageUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/470.png`
    };
    
    // 3. 해당 위치에 추가 (정렬 유지)
    const index = data.pokemon.findIndex(p => p.id > 470);
    if (index === -1) {
      data.pokemon.push(leafeon);
    } else {
      data.pokemon.splice(index, 0, leafeon);
    }
    
    // 4. 저장
    data.metadata.totalCount = data.pokemon.length;
    fs.writeFileSync(
      'src/data/allPokemon.json',
      JSON.stringify(data, null, 2),
      'utf8'
    );
    
    console.log('✅ 완료! 리피아 데이터가 추가되었습니다.');
    console.log('리피아:', leafeon);
    
  } catch (error) {
    console.error('❌ 오류:', error);
  }
}

fixLeafeon();