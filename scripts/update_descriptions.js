const fs = require('fs');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchJson(url) {
  const response = await fetch(url);
  return response.json();
}

async function updateMoveDescriptions() {
  console.log('🚀 기술 설명 한글 번역 업데이트 시작!\n');
  
  // 1. 기존 moves.json 읽기
  const movesData = JSON.parse(fs.readFileSync('src/data/moves.json', 'utf-8'));
  console.log('📖 기존 moves.json 로드:', movesData.moves.length, '개 기술');
  
  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  
  // 2. 각 기술마다 PokeAPI에서 한글 설명 가져오기
  for (let i = 0; i < movesData.moves.length; i++) {
    const move = movesData.moves[i];
    
    try {
      console.log(`🔄 ${i + 1}/${movesData.moves.length} - ${move.name} (${move.id})`);
      
      // PokeAPI에서 기술 정보 가져오기
      const apiMove = await fetchJson(`https://pokeapi.co/api/v2/move/${move.id}`);
      
      // 한글 이름도 업데이트
      const koreanName = apiMove.names.find(n => n.language.name === 'ko');
      if (koreanName) {
        movesData.moves[i].name = koreanName.name;
      }
      
      // 한글 설명 찾기 (flavor_text)
      const koreanFlavorText = apiMove.flavor_text_entries.find(
        entry => entry.language.name === 'ko' && entry.version_group.name === 'scarlet-violet'
      ) || apiMove.flavor_text_entries.find(
        entry => entry.language.name === 'ko'
      );
      
      if (koreanFlavorText) {
        // 줄바꿈 제거 및 정리
        const cleanDescription = koreanFlavorText.flavor_text
          .replace(/\n/g, ' ')
          .replace(/\f/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        movesData.moves[i].description = cleanDescription;
        updatedCount++;
        console.log(`   ✅ ${cleanDescription.substring(0, 40)}...`);
      } else {
        // 한글 설명이 없으면 영문 effect 사용
        const englishEffect = apiMove.effect_entries.find(
          entry => entry.language.name === 'en'
        );
        
        if (englishEffect) {
          movesData.moves[i].description = englishEffect.short_effect;
          console.log(`   ⚠️ 한글 없음 - 영문 사용`);
          skippedCount++;
        } else {
          console.log(`   ❌ 설명 없음`);
          errorCount++;
        }
      }
      
      // API 제한 방지 (100ms 대기)
      await delay(100);
      
    } catch (err) {
      console.error(`   ❌ 오류 (${move.id}):`, err.message);
      errorCount++;
      
      // 오류 발생 시 좀 더 대기
      await delay(500);
    }
  }
  
  // 3. 업데이트된 moves.json 저장
  const outputPath = 'src/data/moves_updated.json';
  fs.writeFileSync(
    outputPath,
    JSON.stringify(movesData, null, 2),
    'utf-8'
  );
  
  console.log('\n✅ 완료!');
  console.log(`   - 한글 업데이트: ${updatedCount}개`);
  console.log(`   - 영문 사용: ${skippedCount}개`);
  console.log(`   - 오류: ${errorCount}개`);
  console.log(`   - 총 기술: ${movesData.moves.length}개`);
  console.log(`   - 출력 파일: ${outputPath}`);
  console.log('\n💡 확인 후 사용:');
  console.log('   1. moves_updated.json 내용 확인');
  console.log('   2. 백업: cp src/data/moves.json src/data/moves_backup.json');
  console.log('   3. 교체: cp src/data/moves_updated.json src/data/moves.json');
}

// 실행
updateMoveDescriptions().catch(console.error);