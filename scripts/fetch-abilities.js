/**
 * PokeAPI에서 abilities 데이터 수집
 * 
 * 실행 방법:
 * node fetch-abilities.js
 * 
 * 결과:
 * abilities.json 생성 (src/data/abilities.json)
 */

const https = require('https');
const fs = require('fs');

const ABILITIES_URL = 'https://pokeapi.co/api/v2/ability?limit=1000';
const OUTPUT_FILE = './abilities.json';

async function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
      res.on('error', reject);
    });
  });
}

async function fetchAbilityDetails(url) {
  const data = await fetchJSON(url);
  
  // 한글 이름 찾기
  const koreanName = data.names.find(n => n.language.name === 'ko');
  const englishName = data.names.find(n => n.language.name === 'en');
  const koreanEffect = data.effect_entries.find(e => e.language.name === 'ko');
  const englishEffect = data.effect_entries.find(e => e.language.name === 'en');
  
  return {
    id: data.id,
    name: koreanName?.name || englishName?.name || data.name,
    nameEn: data.name,
    effect: koreanEffect?.effect || englishEffect?.effect || '',
    shortEffect: koreanEffect?.short_effect || englishEffect?.short_effect || '',
    generation: data.generation.name,
    pokemon: data.pokemon.length
  };
}

async function fetchAllAbilities() {
  console.log('🔍 특성 목록 가져오는 중...');
  
  const list = await fetchJSON(ABILITIES_URL);
  const abilities = [];
  
  console.log(`📊 총 ${list.results.length}개 특성 발견`);
  
  for (let i = 0; i < list.results.length; i++) {
    const ability = list.results[i];
    
    try {
      console.log(`⏳ [${i + 1}/${list.results.length}] ${ability.name} 가져오는 중...`);
      const details = await fetchAbilityDetails(ability.url);
      abilities.push(details);
      
      // API 부하 방지
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`❌ ${ability.name} 실패:`, error.message);
    }
  }
  
  const output = {
    abilities,
    count: abilities.length,
    generatedAt: new Date().toISOString()
  };
  
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`✅ ${OUTPUT_FILE} 생성 완료!`);
  console.log(`📝 총 ${abilities.length}개 특성 저장됨`);
}

fetchAllAbilities().catch(console.error);
