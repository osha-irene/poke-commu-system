/**
 * 마스토돈 메시지 포맷팅
 * 캠핑 관련 메시지 생성
 */

/**
 * 캠핑 시작 안내 메시지
 */
export function formatCampingStartMessage(sessionData) {
  const { memberName, entryPokemon, isDuo, partnerName } = sessionData;
  
  const pokemonList = entryPokemon
    .map(p => `• ${p.name}`)
    .join('\n');

  const campingType = isDuo 
    ? `👥 2인 캠핑 (파트너: ${partnerName})`
    : '🎒 혼자 캠핑';

  return `
🏕️ ${memberName}님의 캠핑이 시작되었어요!

${campingType}

**함께하는 포켓몬:**
${pokemonList}

📱 **다음 단계 진행 방법:**
이 글에 답글로 \`[캠핑]\` 을 멘션해주세요!

예시: @pokemonbot [캠핑]
  `.trim();
}

/**
 * 캠핑 진행 메시지 (단계별)
 */
export function formatCampingProgressMessage(sessionData, stageResult) {
  const { memberName, currentStage, isDuo } = sessionData;
  const { success, successRate, stageData } = stageResult;

  const bonusText = isDuo ? ' (+15% 2인 보너스)' : '';

  if (success) {
    return `
✅ ${memberName}님의 캠핑 ${currentStage}단계 성공!

🎲 성공률: ${successRate}%${bonusText}

**현재 진행도:**
단계: ${currentStage} / 3
요리 대성공 확률: ${stageData.successChance}%

**계속 진행하려면:**
답글로 \`[캠핑]\` 멘션!

**만족하려면:**
답글로 \`[만족]\` 멘션!
    `.trim();
  } else {
    return `
❌ ${memberName}님의 캠핑 ${currentStage}단계 실패...

🎲 성공률: ${successRate}%${bonusText}

다음엔 더 좋은 결과가 있을 거예요!
    `.trim();
  }
}

/**
 * 캠핑 완료 메시지 (요리 성공/실패)
 */
export function formatCampingCompleteMessage(sessionData, cookingSuccess) {
  const { memberName, currentStage, entryPokemon, isDuo } = sessionData;

  if (cookingSuccess) {
    const bonusText = isDuo ? ' (2인 보너스 포함)' : '';
    
    return `
🎉 ${memberName}님의 캠핑 대성공!

**최종 결과:**
- 도달 단계: ${currentStage}
- 요리 성공!${bonusText}
- 친밀도 상승
- 경험치 획득
- 보너스 아이템 획득 가능!

**엔트리 포켓몬:**
${entryPokemon.map(p => `• ${p.name}`).join('\n')}

웹사이트에서 결과를 확인해보세요! 🎁
    `.trim();
  } else {
    return `
😅 ${memberName}님의 캠핑 완료!

**최종 결과:**
- 도달 단계: ${currentStage}
- 요리 실패...
- 그래도 포켓몬들과 즐거운 시간을 보냈어요!

다음 캠핑에서 더 좋은 결과를 기대해볼게요!
    `.trim();
  }
}

/**
 * 오류 메시지
 */
export function formatErrorMessage(errorType) {
  const messages = {
    NO_SESSION: '⚠️ 진행 중인 캠핑을 찾을 수 없어요. 웹사이트에서 먼저 캠핑을 시작해주세요!',
    ALREADY_COMPLETED: '⚠️ 이미 완료된 캠핑이에요. 새로운 캠핑을 시작해주세요!',
    NOT_AUTHORIZED: '⚠️ 본인의 캠핑만 진행할 수 있어요!',
    INVALID_COMMAND: '⚠️ 알 수 없는 명령어예요. [캠핑] 또는 [만족]을 사용해주세요!',
  };

  return messages[errorType] || '⚠️ 오류가 발생했어요. 잠시 후 다시 시도해주세요!';
}