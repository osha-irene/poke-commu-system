// scripts/fetchAbilityKorean.js
// 사용법: node scripts/fetchAbilityKorean.js

const fs = require('fs');
const path = require('path');

// PokeAPI에서 특성의 한글 설명을 가져오는 함수
async function fetchAbilityFlavorText(abilityId) {
  try {
    const response = await fetch(`https://pokeapi.co/api/v2/ability/${abilityId}`);
    if (!response.ok) {
      console.error(`Failed to fetch ability ${abilityId}: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    // 한글 flavor_text 찾기 (가장 최신 버전 선호)
    const koreanFlavorTexts = data.flavor_text_entries
      .filter(entry => entry.language.name === 'ko')
      .sort((a, b) => {
        // 버전 그룹 이름으로 정렬 (최신이 앞으로)
        const versionOrder = [
          'sword-shield', 'ultra-sun-ultra-moon', 'sun-moon',
          'omega-ruby-alpha-sapphire', 'x-y', 'black-2-white-2',
          'black-white', 'heartgold-soulsilver', 'platinum',
          'diamond-pearl', 'ruby-sapphire', 'emerald'
        ];
        const aIndex = versionOrder.indexOf(a.version_group.name);
        const bIndex = versionOrder.indexOf(b.version_group.name);
        return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
      });
    
    // 한글 effect 찾기
    const koreanEffect = data.effect_entries.find(
      entry => entry.language.name === 'ko'
    );
    
    return {
      flavorText: koreanFlavorTexts[0]?.flavor_text?.replace(/\n/g, ' ') || null,
      effectKo: koreanEffect?.effect?.replace(/\n/g, ' ') || null,
      shortEffectKo: koreanEffect?.short_effect?.replace(/\n/g, ' ') || null
    };
  } catch (error) {
    console.error(`Error fetching ability ${abilityId}:`, error.message);
    return null;
  }
}

async function main() {
  // abilities.json 읽기
  const abilitiesPath = path.join(__dirname, '../src/data/abilities.json');
  const abilitiesData = JSON.parse(fs.readFileSync(abilitiesPath, 'utf-8'));
  
  console.log(`총 ${abilitiesData.abilities.length}개의 특성을 처리합니다...`);
  
  const updatedAbilities = [];
  let processed = 0;
  let failed = 0;
  
  for (const ability of abilitiesData.abilities) {
    const koreanData = await fetchAbilityFlavorText(ability.id);
    
    if (koreanData) {
      updatedAbilities.push({
        ...ability,
        effectKo: koreanData.effectKo || koreanData.flavorText || null,
        shortEffectKo: koreanData.shortEffectKo || koreanData.flavorText || null,
        flavorTextKo: koreanData.flavorText || null
      });
      processed++;
    } else {
      updatedAbilities.push({
        ...ability,
        effectKo: null,
        shortEffectKo: null,
        flavorTextKo: null
      });
      failed++;
    }
    
    // 진행 상황 출력
    if ((processed + failed) % 10 === 0) {
      console.log(`진행: ${processed + failed}/${abilitiesData.abilities.length} (성공: ${processed}, 실패: ${failed})`);
    }
    
    // API 속도 제한 방지 (100ms 대기)
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // 결과 저장
  const outputPath = path.join(__dirname, '../src/data/abilities.json');
  fs.writeFileSync(
    outputPath,
    JSON.stringify({ abilities: updatedAbilities }, null, 2),
    'utf-8'
  );
  
  console.log(`\n완료!`);
  console.log(`- 성공: ${processed}`);
  console.log(`- 실패: ${failed}`);
  console.log(`- 저장됨: ${outputPath}`);
}

main().catch(console.error);
