const fs = require('fs');

// 한글 매핑
const CONTEST_TYPE_KR = {
  "cool": "근사함",
  "beauty": "아름다움",
  "cute": "귀여움",
  "clever": "슬기로움",
  "tough": "강인함"
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchJson(url) {
  const response = await fetch(url);
  return response.json();
}

async function getAllMoves() {
  console.log("📥 기술 데이터 수집 중...");
  
  // 9세대 모든 기술 (1-919)
  const movesList = await fetchJson("https://pokeapi.co/api/v2/move?limit=919");
  const moves = movesList.results;
  
  const movesData = [];
  
  for (let i = 0; i < moves.length; i++) {
    try {
      console.log(`🔄 ${i + 1}/${moves.length} - ${moves[i].name}`);
      
      // 개별 기술 상세 정보
      const move = await fetchJson(moves[i].url);
      
      // 한글 이름 찾기
      const koreanName = move.names.find(n => n.language.name === "ko")?.name || move.name;
      
      // 한글 설명 찾기
      const koreanDesc = move.effect_entries.find(e => e.language.name === "en")?.short_effect || "";
      
      // 콘테스트 효과 가져오기
      let contestEffectText = "";
      let contestAppeals = 0;
      let contestJam = 0;
      
      if (move.contest_effect) {
        try {
          const effectData = await fetchJson(move.contest_effect.url);
          contestAppeals = effectData.appeal || 0;
          contestJam = effectData.jam || 0;
          contestEffectText = effectData.effect_entries.find(e => e.language.name === "en")?.effect || "";
        } catch (err) {
          // 콘테스트 효과 없을 수 있음
        }
      }
      
      const moveData = {
        id: move.name,
        name: koreanName,
        nameEn: move.name,
        type: move.type.name,
        category: move.damage_class.name,
        power: move.power || 0,
        accuracy: move.accuracy || 100,
        pp: move.pp,
        priority: move.priority,
        description: koreanDesc,
        
        // 콘테스트 속성
        contestType: move.contest_type ? CONTEST_TYPE_KR[move.contest_type.name] : null,
        contestEffect: contestEffectText,
        contestAppeals: contestAppeals,
        contestJam: contestJam,
        
        generation: move.generation.name.split("-")[1]
      };
      
      movesData.push(moveData);
      
      // API 제한 방지
      await delay(100);
      
    } catch (err) {
      console.error(`❌ 오류 (${moves[i].name}):`, err.message);
    }
  }
  
  return movesData;
}

async function getPokemonLearnsets(limit = 1025) {
  console.log(`\n📥 포켓몬 학습 데이터 수집 중 (1~${limit})...`);
  
  const learnsets = {};
  
  for (let pokemonId = 1; pokemonId <= limit; pokemonId++) {
    try {
      console.log(`🔄 포켓몬 #${pokemonId} / ${limit}`);
      
      // 포켓몬 데이터
      const pokemon = await fetchJson(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`);
      
      const levelUp = [];
      const tmMoves = [];
      const eggMoves = [];
      const tutorMoves = [];
      
      for (const moveEntry of pokemon.moves) {
        const moveId = moveEntry.move.name;
        
        for (const versionDetail of moveEntry.version_group_details) {
          const learnMethod = versionDetail.move_learn_method.name;
          
          // 레벨업 기술
          if (learnMethod === "level-up") {
            const level = versionDetail.level_learned_at;
            if (!levelUp.some(m => m.moveId === moveId)) {
              levelUp.push({ moveId, level });
            }
          }
          // TM/HM 기술
          else if (learnMethod === "machine") {
            if (!tmMoves.includes(moveId)) {
              tmMoves.push(moveId);
            }
          }
          // 유전기
          else if (learnMethod === "egg") {
            if (!eggMoves.includes(moveId)) {
              eggMoves.push(moveId);
            }
          }
          // 튜터기
          else if (learnMethod === "tutor") {
            if (!tutorMoves.includes(moveId)) {
              tutorMoves.push(moveId);
            }
          }
        }
      }
      
      // 레벨순 정렬
      levelUp.sort((a, b) => a.level - b.level);
      
      learnsets[pokemonId.toString()] = {
        levelUpMoves: levelUp,
        tmMoves: tmMoves,
        eggMoves: eggMoves,
        tutorMoves: tutorMoves
      };
      
      await delay(150);
      
    } catch (err) {
      console.error(`❌ 오류 (포켓몬 #${pokemonId}):`, err.message);
    }
  }
  
  return learnsets;
}

async function main() {
  console.log("🚀 PokeAPI 데이터 수집 시작! (9세대 전체)\n");
  console.log("⏱️ 예상 소요 시간: 약 20~30분\n");
  
  const startTime = Date.now();
  
  // 1. 기술 데이터 수집 (919개)
  const moves = await getAllMoves();
  
  console.log(`\n⏰ 기술 수집 완료! (${Math.round((Date.now() - startTime) / 1000)}초 소요)\n`);
  
  // 2. 포켓몬 학습 데이터 수집 (1025마리)
  const learnsets = await getPokemonLearnsets(1025);
  
  // 3. JSON 파일로 저장
  const output = {
    moves: moves,
    pokemonLearnsets: learnsets
  };
  
  fs.writeFileSync("moves_complete.json", JSON.stringify(output, null, 2), "utf-8");
  
  const totalTime = Math.round((Date.now() - startTime) / 1000);
  
  console.log(`\n✅ 완료!`);
  console.log(`   - 기술: ${moves.length}개`);
  console.log(`   - 포켓몬: ${Object.keys(learnsets).length}마리`);
  console.log(`   - 파일: moves_complete.json`);
  console.log(`   - 소요 시간: ${Math.floor(totalTime / 60)}분 ${totalTime % 60}초`);
}

main().catch(console.error);