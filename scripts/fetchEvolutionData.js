// 이 스크립트를 프로젝트 루트에 fetchEvolutionData.js로 저장하고
// node fetchEvolutionData.js 로 실행하세요

const fs = require('fs');
const https = require('https');

// API 요청 함수
function fetchAPI(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
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

// 딜레이 함수 (API 제한 방지)
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 진화 조건 파싱
function parseEvolutionDetails(details) {
  if (!details || details.length === 0) return null;
  
  const detail = details[0];
  const condition = {};
  
  // 레벨업 진화
  if (detail.trigger?.name === 'level-up') {
    if (detail.min_level) {
      condition.type = 'level';
      condition.level = detail.min_level;
    }
    
    // 친밀도 진화
    if (detail.min_happiness) {
      condition.type = 'friendship';
      condition.friendship = detail.min_happiness;
    }
    
    // 시간대 조건
    if (detail.time_of_day) {
      condition.timeOfDay = detail.time_of_day;
    }
    
    // 특정 장소
    if (detail.location) {
      condition.location = detail.location.name;
    }
    
    // 알고있는 기술
    if (detail.known_move) {
      condition.knownMove = detail.known_move.name;
    }
    
    // 파티 내 특정 타입
    if (detail.party_type) {
      condition.partyType = detail.party_type.name;
    }
  }
  
  // 아이템 사용 진화
  if (detail.trigger?.name === 'use-item') {
    condition.type = 'item';
    condition.item = detail.item?.name || null;
  }
  
  // 교환 진화
  if (detail.trigger?.name === 'trade') {
    condition.type = 'trade';
    if (detail.held_item) {
      condition.heldItem = detail.held_item.name;
    }
    if (detail.trade_species) {
      condition.tradeSpecies = detail.trade_species.name;
    }
  }
  
  // 기타 조건들
  if (detail.min_beauty) condition.minBeauty = detail.min_beauty;
  if (detail.min_affection) condition.minAffection = detail.min_affection;
  if (detail.needs_overworld_rain) condition.needsRain = true;
  if (detail.turn_upside_down) condition.turnUpsideDown = true;
  
  return Object.keys(condition).length > 0 ? condition : null;
}

// 진화 체인 파싱 (재귀)
function parseEvolutionChain(chain, evolutions = []) {
  if (!chain) return evolutions;
  
  // 현재 포켓몬에서 진화하는 경우들
  if (chain.evolves_to && chain.evolves_to.length > 0) {
    for (const evolution of chain.evolves_to) {
      const fromSpeciesId = parseInt(chain.species.url.split('/').filter(Boolean).pop());
      const toSpeciesId = parseInt(evolution.species.url.split('/').filter(Boolean).pop());
      
      const condition = parseEvolutionDetails(evolution.evolution_details);
      
      if (condition) {
        evolutions.push({
          from: fromSpeciesId,
          to: toSpeciesId,
          fromName: chain.species.name,
          toName: evolution.species.name,
          condition: condition
        });
      }
      
      // 재귀적으로 다음 진화 처리
      parseEvolutionChain(evolution, evolutions);
    }
  }
  
  return evolutions;
}

async function main() {
  console.log('🔄 PokeAPI에서 진화 데이터를 가져오는 중...\n');
  
  const allEvolutions = [];
  let successCount = 0;
  let errorCount = 0;
  
  // Evolution chain은 약 500개 정도 (모든 진화 라인)
  // 실제로는 468개 정도가 존재함
  const maxChains = 500;
  
  for (let i = 1; i <= maxChains; i++) {
    try {
      const url = `https://pokeapi.co/api/v2/evolution-chain/${i}/`;
      const data = await fetchAPI(url);
      
      const evolutions = parseEvolutionChain(data.chain);
      allEvolutions.push(...evolutions);
      
      successCount++;
      
      if (i % 10 === 0) {
        console.log(`✅ ${i}/${maxChains} 진화 체인 처리 완료... (현재 ${allEvolutions.length}개 진화 발견)`);
      }
      
      // API 제한 방지 (100ms 대기)
      await delay(100);
      
    } catch (error) {
      // 존재하지 않는 체인 ID는 건너뛰기
      if (error.message?.includes('404')) {
        errorCount++;
      } else {
        console.error(`❌ 체인 ${i} 처리 실패:`, error.message);
      }
    }
  }
  
  console.log(`\n✅ 완료!`);
  console.log(`📊 성공: ${successCount}개 체인`);
  console.log(`⚠️  누락: ${errorCount}개 체인 (존재하지 않음)`);
  console.log(`🔄 총 진화: ${allEvolutions.length}개\n`);
  
  // 번호순 정렬
  allEvolutions.sort((a, b) => a.from - b.from);
  
  // JSON 파일로 저장
  const output = {
    generatedAt: new Date().toISOString(),
    totalEvolutions: allEvolutions.length,
    evolutions: allEvolutions
  };
  
  const outputPath = './src/data/evolutions.json';
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');
  
  console.log(`💾 저장 완료: ${outputPath}`);
  console.log(`\n📝 진화 타입별 통계:`);
  
  // 통계 출력
  const stats = {
    level: 0,
    item: 0,
    trade: 0,
    friendship: 0,
    other: 0
  };
  
  allEvolutions.forEach(evo => {
    const type = evo.condition.type;
    if (type === 'level') stats.level++;
    else if (type === 'item') stats.item++;
    else if (type === 'trade') stats.trade++;
    else if (type === 'friendship') stats.friendship++;
    else stats.other++;
  });
  
  console.log(`   레벨업: ${stats.level}개`);
  console.log(`   아이템: ${stats.item}개`);
  console.log(`   교환: ${stats.trade}개`);
  console.log(`   친밀도: ${stats.friendship}개`);
  console.log(`   기타: ${stats.other}개`);
  
  console.log(`\n🎉 모든 작업이 완료되었습니다!`);
}

main().catch(console.error);