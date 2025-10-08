const fs = require('fs');

const typeMap = {
  'normal': '노말',
  'fire': '불꽃',
  'water': '물',
  'electric': '전기',
  'grass': '풀',
  'ice': '얼음',
  'fighting': '격투',
  'poison': '독',
  'ground': '땅',
  'flying': '비행',
  'psychic': '에스퍼',
  'bug': '벌레',
  'rock': '바위',
  'ghost': '고스트',
  'dragon': '드래곤',
  'dark': '악',
  'steel': '강철',
  'fairy': '페어리'
};

async function fetchAllPokemon() {
  const pokemon = [];
  
  console.log('🔄 151마리 포켓몬 데이터 가져오는 중...\n');
  
  for (let i = 1; i <= 151; i++) {
    try {
      // 기본 데이터와 종 데이터 동시에 가져오기
      const [pokeData, speciesData] = await Promise.all([
        fetch(`https://pokeapi.co/api/v2/pokemon/${i}`).then(r => r.json()),
        fetch(`https://pokeapi.co/api/v2/pokemon-species/${i}`).then(r => r.json())
      ]);
      
      // 한글 이름 찾기
      const koreanName = speciesData.names.find(n => n.language.name === 'ko')?.name || pokeData.name;
      
      // 주 타입 (첫 번째 타입)
      const mainType = typeMap[pokeData.types[0].type.name] || '노말';
      
      // 포획률 (0~1 사이로 정규화)
      const catchRate = Math.min(speciesData.capture_rate / 255, 0.95);
      
      // 스탯
      const hp = pokeData.stats.find(s => s.stat.name === 'hp')?.base_stat || 50;
      const attack = pokeData.stats.find(s => s.stat.name === 'attack')?.base_stat || 50;
      const defense = pokeData.stats.find(s => s.stat.name === 'defense')?.base_stat || 50;
      const speed = pokeData.stats.find(s => s.stat.name === 'speed')?.base_stat || 50;
      
      pokemon.push({
        id: i,
        number: i,
        name: koreanName,
        nameEn: pokeData.name,
        type: mainType,
        catchRate: parseFloat(catchRate.toFixed(2)),
        baseHp: hp,
        baseAttack: attack,
        baseDefense: defense,
        baseSpeed: speed,
        imageUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${i}.png`
      });
      
      console.log(`✅ #${String(i).padStart(3, '0')} ${koreanName} (${mainType})`);
      
      // API 요청 제한 회피 (50ms 대기)
      await new Promise(resolve => setTimeout(resolve, 50));
      
    } catch (error) {
      console.error(`❌ #${i} 가져오기 실패:`, error.message);
    }
  }
  
  // JSON 파일로 저장
  const output = {
    pokemon: pokemon,
    metadata: {
      totalCount: pokemon.length,
      generatedAt: new Date().toISOString(),
      source: "PokeAPI (https://pokeapi.co)",
      generation: 1
    }
  };
  
  const outputPath = 'src/data/pokemon.json';
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');
  
  console.log(`\n🎉 완료! ${pokemon.length}마리 포켓몬 데이터 생성`);
  console.log(`📁 저장 위치: ${outputPath}`);
}

// 실행
fetchAllPokemon().catch(console.error);