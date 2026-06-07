// fetchRegionalLearnsets.js - 리전폼 포켓몬 기술 습득 데이터 수집
// 실행 방법: node fetchRegionalLearnsets.js

const fs = require('fs');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 리전폼 목록 (PokeAPI에서 사용하는 이름)
const REGIONAL_FORMS = [
  // 알로라 폼
  { apiName: 'rattata-alola', number: 10091 },
  { apiName: 'raticate-alola', number: 10092 },
  { apiName: 'raichu-alola', number: 10100 },
  { apiName: 'sandshrew-alola', number: 10101 },
  { apiName: 'sandslash-alola', number: 10102 },
  { apiName: 'vulpix-alola', number: 10103 },
  { apiName: 'ninetales-alola', number: 10104 },
  { apiName: 'diglett-alola', number: 10105 },
  { apiName: 'dugtrio-alola', number: 10106 },
  { apiName: 'meowth-alola', number: 10107 },
  { apiName: 'persian-alola', number: 10108 },
  { apiName: 'geodude-alola', number: 10109 },
  { apiName: 'graveler-alola', number: 10110 },
  { apiName: 'golem-alola', number: 10111 },
  { apiName: 'grimer-alola', number: 10112 },
  { apiName: 'muk-alola', number: 10113 },
  { apiName: 'exeggutor-alola', number: 10114 },
  { apiName: 'marowak-alola', number: 10115 },
  
  // 가라르 폼
  { apiName: 'meowth-galar', number: 10161 },
  { apiName: 'ponyta-galar', number: 10162 },
  { apiName: 'rapidash-galar', number: 10163 },
  { apiName: 'slowpoke-galar', number: 10164 },
  { apiName: 'slowbro-galar', number: 10165 },
  { apiName: 'farfetchd-galar', number: 10166 },
  { apiName: 'weezing-galar', number: 10167 },
  { apiName: 'mr-mime-galar', number: 10168 },
  { apiName: 'articuno-galar', number: 10169 },
  { apiName: 'zapdos-galar', number: 10170 },
  { apiName: 'moltres-galar', number: 10171 },
  { apiName: 'slowking-galar', number: 10172 },
  { apiName: 'corsola-galar', number: 10173 },
  { apiName: 'zigzagoon-galar', number: 10174 },
  { apiName: 'linoone-galar', number: 10175 },
  { apiName: 'darumaka-galar', number: 10176 },
  { apiName: 'darmanitan-galar-standard', number: 10177 },
  { apiName: 'yamask-galar', number: 10178 },
  { apiName: 'stunfisk-galar', number: 10179 },
  
  // 히스이 폼
  { apiName: 'growlithe-hisui', number: 10229 },
  { apiName: 'arcanine-hisui', number: 10230 },
  { apiName: 'voltorb-hisui', number: 10231 },
  { apiName: 'electrode-hisui', number: 10232 },
  { apiName: 'typhlosion-hisui', number: 10233 },
  { apiName: 'qwilfish-hisui', number: 10234 },
  { apiName: 'sneasel-hisui', number: 10235 },
  { apiName: 'samurott-hisui', number: 10236 },
  { apiName: 'lilligant-hisui', number: 10237 },
  { apiName: 'zorua-hisui', number: 10238 },
  { apiName: 'zoroark-hisui', number: 10239 },
  { apiName: 'braviary-hisui', number: 10240 },
  { apiName: 'sliggoo-hisui', number: 10241 },
  { apiName: 'goodra-hisui', number: 10242 },
  { apiName: 'avalugg-hisui', number: 10243 },
  { apiName: 'decidueye-hisui', number: 10244 },
  
  // 팔데아 폼
  { apiName: 'tauros-paldea-combat-breed', number: 10250 },
  { apiName: 'tauros-paldea-blaze-breed', number: 10251 },
  { apiName: 'tauros-paldea-aqua-breed', number: 10252 },
  { apiName: 'wooper-paldea', number: 10253 },
];

async function fetchRegionalLearnsets() {
  console.log('🌍 리전폼 포켓몬 기술 습득 데이터 수집 시작...\n');
  
  // 기존 moves.json 로드
  const movesPath = 'src/data/moves.json';
  let movesData;
  
  try {
    movesData = JSON.parse(fs.readFileSync(movesPath, 'utf-8'));
    console.log(`📁 기존 moves.json 로드 완료 (${Object.keys(movesData.pokemonLearnsets).length}개 포켓몬)`);
  } catch (error) {
    console.error('❌ moves.json 로드 실패:', error.message);
    return;
  }
  
  // moves 배열에서 ID -> moveId 매핑 생성
  const moveIdMap = {};
  movesData.moves.forEach(move => {
    // API에서 오는 move URL의 ID와 매핑
    moveIdMap[move.nameEn] = move.id;
  });
  
  let successCount = 0;
  let failCount = 0;
  
  for (const regional of REGIONAL_FORMS) {
    try {
      console.log(`📚 ${regional.apiName} (${regional.number}) 데이터 가져오는 중...`);
      
      const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${regional.apiName}`);
      
      if (!response.ok) {
        console.log(`  ⚠️ API 응답 실패: ${response.status}`);
        failCount++;
        continue;
      }
      
      const data = await response.json();
      
      // 레벨업으로 배우는 기술 추출
      const levelUpMoves = data.moves
        .filter(moveData => {
          return moveData.version_group_details.some(
            detail => detail.move_learn_method.name === 'level-up'
          );
        })
        .map(moveData => {
          // 최신 버전의 레벨업 정보 찾기
          const levelUpDetail = moveData.version_group_details
            .filter(detail => detail.move_learn_method.name === 'level-up')
            .sort((a, b) => {
              const priority = {
                'scarlet-violet': 9,
                'sword-shield': 8,
                'legends-arceus': 7,
                'sun-moon': 6,
                'ultra-sun-ultra-moon': 6,
              };
              const priorityA = priority[a.version_group.name] || 0;
              const priorityB = priority[b.version_group.name] || 0;
              return priorityB - priorityA;
            })[0];
          
          if (!levelUpDetail) return null;
          
          // move name에서 ID 찾기
          const moveName = moveData.move.name;
          const moveId = moveIdMap[moveName] || moveName;
          
          return {
            moveId: moveId,
            level: levelUpDetail.level_learned_at
          };
        })
        .filter(Boolean)
        .sort((a, b) => a.level - b.level);
      
      // TM/기술머신으로 배우는 기술 추출
      const tmMoves = data.moves
        .filter(moveData => {
          return moveData.version_group_details.some(
            detail => detail.move_learn_method.name === 'machine'
          );
        })
        .map(moveData => {
          const moveName = moveData.move.name;
          return moveIdMap[moveName] || moveName;
        });
      
      // 알 기술 추출
      const eggMoves = data.moves
        .filter(moveData => {
          return moveData.version_group_details.some(
            detail => detail.move_learn_method.name === 'egg'
          );
        })
        .map(moveData => {
          const moveName = moveData.move.name;
          return moveIdMap[moveName] || moveName;
        });
      
      // pokemonLearnsets에 추가
      movesData.pokemonLearnsets[regional.number.toString()] = {
        levelUpMoves: levelUpMoves,
        tmMoves: tmMoves,
        eggMoves: eggMoves,
        tutorMoves: []
      };
      
      console.log(`  ✓ ${levelUpMoves.length}개 레벨업 기술, ${tmMoves.length}개 TM 기술 수집`);
      successCount++;
      
      // API 과부하 방지
      await delay(300);
      
    } catch (error) {
      console.error(`  ❌ ${regional.apiName} 실패:`, error.message);
      failCount++;
    }
  }
  
  // 결과 저장
  fs.writeFileSync(movesPath, JSON.stringify(movesData, null, 2), 'utf-8');
  
  console.log(`\n✅ 완료!`);
  console.log(`  - 성공: ${successCount}개`);
  console.log(`  - 실패: ${failCount}개`);
  console.log(`  - 총 포켓몬 learnset: ${Object.keys(movesData.pokemonLearnsets).length}개`);
  console.log(`📁 저장 위치: ${movesPath}`);
}

// 실행
fetchRegionalLearnsets();
