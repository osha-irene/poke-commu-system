// combineMoves.js - moves.json과 pokemonLearnsets.json을 하나로 합치기
// 실행 방법: node combineMoves.js

const fs = require('fs');

try {
  console.log('🔗 기술 데이터 병합 시작...\n');
  
  // 파일 읽기
  const movesData = JSON.parse(fs.readFileSync('moves.json', 'utf-8'));
  const learnsetsData = JSON.parse(fs.readFileSync('pokemonLearnsets.json', 'utf-8'));
  
  // 병합
  const combinedData = {
    moves: movesData.moves,
    pokemonLearnsets: learnsetsData.pokemonLearnsets,
    metadata: {
      totalMoves: movesData.moves.length,
      totalPokemon: Object.keys(learnsetsData.pokemonLearnsets).length,
      generation: 'all (1-9)',
      updatedAt: new Date().toISOString(),
      source: 'PokeAPI v2',
      note: 'Combined moves and learnsets data for all generations'
    }
  };
  
  // 저장
  fs.writeFileSync(
    'movesComplete.json',
    JSON.stringify(combinedData, null, 2),
    'utf-8'
  );
  
  console.log('✅ 완료!');
  console.log(`📊 기술: ${combinedData.moves.length}개`);
  console.log(`🎮 포켓몬: ${Object.keys(combinedData.pokemonLearnsets).length}마리`);
  console.log('📁 파일: ./movesComplete.json\n');
  
  // 샘플 출력
  console.log('📝 샘플 데이터:');
  const samplePokemon = combinedData.pokemonLearnsets['1'];
  console.log(`\n${samplePokemon.name} (${samplePokemon.nameEn})`);
  console.log('배우는 기술:');
  samplePokemon.levelUpMoves.slice(0, 5).forEach(lm => {
    const move = combinedData.moves.find(m => m.id === lm.moveId);
    if (move) {
      console.log(`  Lv.${lm.level}: ${move.name} (${move.nameEn})`);
    }
  });
  
} catch (error) {
  console.error('❌ 오류:', error.message);
  console.log('\n💡 먼저 fetchMoves.js와 fetchPokemonLearnsets.js를 실행해주세요!');
}