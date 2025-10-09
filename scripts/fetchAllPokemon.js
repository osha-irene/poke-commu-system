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

async function fetchAllPokemon() {
  console.log('🎮 1~9세대 전체 포켓몬 데이터 가져오는 중...\n');

  try {
    // 9세대까지는 약 1025마리
    const MAX_POKEMON = 1025;
    const allPokemon = [];

    console.log(`총 ${MAX_POKEMON}마리 처리 예정...\n`);

    for (let i = 1; i <= MAX_POKEMON; i++) {
      try {
        const pokemonData = await fetchJSON(`https://pokeapi.co/api/v2/pokemon/${i}`);
        const speciesData = await fetchJSON(pokemonData.species.url);
        
        // 한글 이름 찾기
        const koreanName = speciesData.names.find(n => n.language.name === 'ko');
        
        // 타입 정보
        const types = pokemonData.types
          .sort((a, b) => a.slot - b.slot)
          .map(t => TYPE_MAP[t.type.name] || t.type.name);
        
        const pokemon = {
          id: pokemonData.id,
          number: pokemonData.id,
          name: koreanName?.name || pokemonData.name,
          nameEn: pokemonData.name,
          type: types[0],
          type2: types[1] || null,
          catchRate: (speciesData.capture_rate / 255).toFixed(2),
          baseHp: pokemonData.stats.find(s => s.stat.name === 'hp').base_stat,
          baseAttack: pokemonData.stats.find(s => s.stat.name === 'attack').base_stat,
          baseDefense: pokemonData.stats.find(s => s.stat.name === 'defense').base_stat,
          baseSpeed: pokemonData.stats.find(s => s.stat.name === 'speed').base_stat,
          generation: speciesData.generation.name.replace('generation-', ''),
          imageUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonData.id}.png`
        };
        
        allPokemon.push(pokemon);
        
        if (i % 50 === 0) {
          console.log(`진행중... ${i}/${MAX_POKEMON} (${Math.round(i/MAX_POKEMON*100)}%)`);
        }
        
        // API 과부하 방지
        await new Promise(resolve => setTimeout(resolve, 50));
        
      } catch (error) {
        console.error(`✗ No.${i} 실패:`, error.message);
      }
    }

    // 저장
    const output = {
      pokemon: allPokemon,
      metadata: {
        totalCount: allPokemon.length,
        generatedAt: new Date().toISOString(),
        source: 'PokeAPI (https://pokeapi.co)',
        maxGeneration: 9
      }
    };

    fs.writeFileSync(
      'src/data/allPokemon.json',
      JSON.stringify(output, null, 2),
      'utf8'
    );

    console.log(`\n✅ 완료! ${allPokemon.length}마리를 src/data/allPokemon.json에 저장했습니다.`);
    
    // 세대별 통계
    const byGeneration = {};
    allPokemon.forEach(p => {
      byGeneration[p.generation] = (byGeneration[p.generation] || 0) + 1;
    });
    
    console.log('\n📊 세대별 포켓몬 수:');
    Object.keys(byGeneration).sort().forEach(gen => {
      console.log(`  ${gen}세대: ${byGeneration[gen]}마리`);
    });

  } catch (error) {
    console.error('❌ 오류:', error);
  }
}

fetchAllPokemon();