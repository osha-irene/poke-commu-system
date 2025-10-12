// fetchPokemonLearnsets.js - 포켓몬별 레벨업 기술 데이터 수집
// 실행 방법: node fetchPokemonLearnsets.js

const fs = require('fs');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchPokemonLearnsets() {
  console.log('🎯 포켓몬별 기술 습득 데이터 수집 시작...\n');
  
  try {
    const pokemonLearnsets = {};
    const totalPokemon = 1025; // 전체 포켓몬 (9세대까지)
    
    for (let i = 1; i <= totalPokemon; i++) {
      try {
        console.log(`📚 (${i}/${totalPokemon}) 포켓몬 ${i}번 데이터 가져오는 중...`);
        
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${i}`);
        const data = await response.json();
        
        // 레벨업으로 배우는 기술만 추출
        const levelUpMoves = data.moves
          .filter(moveData => {
            return moveData.version_group_details.some(
              detail => detail.move_learn_method.name === 'level-up'
            );
          })
          .map(moveData => {
            // 최신 버전의 레벨업 정보 찾기 (우선순위: 최신 세대)
            const levelUpDetail = moveData.version_group_details
              .filter(detail => detail.move_learn_method.name === 'level-up')
              .sort((a, b) => {
                // 버전 그룹 이름에서 우선순위 결정 (최신이 우선)
                const priority = {
                  'scarlet-violet': 9,
                  'sword-shield': 8,
                  'sun-moon': 7,
                  'omega-ruby-alpha-sapphire': 6,
                  'x-y': 5,
                  'black-white': 4,
                  'heartgold-soulsilver': 3,
                  'platinum': 2,
                  'diamond-pearl': 1
                };
                const priorityA = priority[a.version_group.name] || 0;
                const priorityB = priority[b.version_group.name] || 0;
                return priorityB - priorityA;
              })[0];
            
            if (!levelUpDetail) return null;
            
            // moveData.move.url에서 move ID 추출
            const moveId = parseInt(moveData.move.url.split('/').slice(-2)[0]);
            
            return {
              moveId: moveId,
              level: levelUpDetail.level_learned_at
            };
          })
          .filter(Boolean)
          .sort((a, b) => a.level - b.level); // 레벨 순 정렬
        
        // 한글 이름 가져오기
        const speciesResponse = await fetch(data.species.url);
        const speciesData = await speciesResponse.json();
        const koreanName = speciesData.names.find(n => n.language.name === 'ko');
        
        pokemonLearnsets[i] = {
          name: koreanName?.name || data.name,
          nameEn: data.name,
          number: i,
          levelUpMoves: levelUpMoves
        };
        
        console.log(`  ✓ ${levelUpMoves.length}개의 레벨업 기술 수집 완료`);
        
        // API 과부하 방지 (300ms)
        await delay(300);
        
      } catch (error) {
        console.error(`❌ 포켓몬 ${i}번 가져오기 실패:`, error.message);
      }
    }
    
    // 결과 저장
    const outputData = {
      pokemonLearnsets: pokemonLearnsets,
      metadata: {
        totalPokemon: Object.keys(pokemonLearnsets).length,
        generation: 'all (1-9)',
        updatedAt: new Date().toISOString(),
        source: 'PokeAPI v2'
      }
    };
    
    fs.writeFileSync(
      'pokemonLearnsets.json',
      JSON.stringify(outputData, null, 2),
      'utf-8'
    );
    
    console.log(`\n✅ 완료! ${Object.keys(pokemonLearnsets).length}마리의 포켓몬 기술 데이터를 pokemonLearnsets.json에 저장했습니다.`);
    console.log('📁 파일 위치: ./pokemonLearnsets.json');
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  }
}

// 실행
fetchPokemonLearnsets();