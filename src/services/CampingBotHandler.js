import { ref, get, update } from 'firebase/database';
import { database } from '../../firebase';
import { MastodonClient } from './MastodonClient';
import { 
  formatCampingProgressMessage, 
  formatCampingCompleteMessage,
  formatErrorMessage 
} from './MessageFormatter';
import { processCampingStage } from '../../utils/campingHelper';

/**
 * 캠핑 봇 핸들러
 * 마스토돈 멘션을 처리하고 캠핑 진행
 */
export class CampingBotHandler {
  constructor() {
    this.client = new MastodonClient();
  }

  /**
   * 멘션 처리 (주기적으로 호출)
   */
  async processMentions() {
    try {
      const mentions = await this.client.getMentions();
      
      for (const mention of mentions) {
        if (mention.type !== 'mention') continue;
        
        const status = mention.status;
        const content = status.content.replace(/<[^>]*>/g, ''); // HTML 태그 제거
        
        // 명령어 파싱
        if (content.includes('[캠핑]') || content.includes('캠핑')) {
          await this.handleCampingCommand(status, 'continue');
        } else if (content.includes('[만족]') || content.includes('만족')) {
          await this.handleCampingCommand(status, 'satisfy');
        }
      }
    } catch (error) {
      console.error('멘션 처리 실패:', error);
    }
  }

  /**
   * 캠핑 명령어 처리
   */
  async handleCampingCommand(status, action) {
    try {
      // 1. 사용자의 마스토돈 계정 확인
      const mastodonAccount = `@${status.account.acct}`;
      
      // 2. Firebase에서 해당 계정의 진행 중인 캠핑 세션 찾기
      const session = await this.findActiveSession(mastodonAccount);
      
      if (!session) {
        await this.client.replyToStatus(
          status.id,
          formatErrorMessage('NO_SESSION')
        );
        return;
      }

      // 3. 캠핑 진행
      if (action === 'continue') {
        await this.progressCamping(status, session);
      } else if (action === 'satisfy') {
        await this.completeCamping(status, session, true);
      }

    } catch (error) {
      console.error('캠핑 명령어 처리 실패:', error);
      await this.client.replyToStatus(
        status.id,
        formatErrorMessage('UNKNOWN')
      );
    }
  }

  /**
   * 진행 중인 캠핑 세션 찾기
   */
  async findActiveSession(mastodonAccount) {
    const sessionsRef = ref(database, 'community/campingSessions');
    const snapshot = await get(sessionsRef);
    
    if (!snapshot.exists()) return null;
    
    const sessions = snapshot.val();
    
    // 해당 마스토돈 계정의 진행 중인 세션 찾기
    for (const [key, session] of Object.entries(sessions)) {
      // 세션 소유자의 마스토돈 계정 확인
      const memberRef = ref(database, `members/${session.memberId}/mastodonAccount`);
      const memberSnapshot = await get(memberRef);
      
      if (memberSnapshot.exists() && memberSnapshot.val() === mastodonAccount) {
        if (session.status === 'waiting_for_mastodon' || session.status === 'in_progress') {
          return { ...session, firebaseKey: key };
        }
      }
    }
    
    return null;
  }

  /**
   * 캠핑 진행 (다음 단계)
   */
  async progressCamping(status, session) {
    const { firebaseKey, isDuo, currentStage } = session;
    
    // 단계 진행 계산
    const stageResult = processCampingStage(
      currentStage + 1,
      isDuo,
      null // allItems는 서버 측에서 처리
    );

    const newStage = currentStage + 1;
    
    // Firebase 업데이트
    const updates = {
      currentStage: newStage,
      status: stageResult.success ? (newStage >= 3 ? 'ready_to_complete' : 'in_progress') : 'failed',
      lastUpdatedAt: new Date().toISOString()
    };

    if (!stageResult.success) {
      // 실패 시 자동 완료
      updates.status = 'completed';
      updates.cookingSuccess = false;
    }

    await update(ref(database, `community/campingSessions/${firebaseKey}`), updates);

    // 마스토돈 답글
    const message = stageResult.success
      ? formatCampingProgressMessage({ ...session, currentStage: newStage }, stageResult)
      : formatCampingCompleteMessage({ ...session, currentStage: newStage }, false);

    await this.client.replyToStatus(status.id, message);
  }

  /**
   * 캠핑 완료 (만족 또는 자동 완료)
   */
  async completeCamping(status, session, isManualComplete = false) {
    const { firebaseKey, currentStage, isDuo } = session;
    
    // 요리 성공 확률 계산
    const stageData = getCampingStageData(currentStage);
    const cookingSuccess = Math.random() < stageData.successChance;

    // Firebase 업데이트
    await update(ref(database, `community/campingSessions/${firebaseKey}`), {
      status: 'completed',
      cookingSuccess,
      lastUpdatedAt: new Date().toISOString()
    });

    // 마스토돈 답글
    const message = formatCampingCompleteMessage(
      { ...session, currentStage },
      cookingSuccess
    );

    await this.client.replyToStatus(status.id, message);
  }
}

/**
 * 단계별 데이터 (campingHelper.js와 동기화 필요)
 */
function getCampingStageData(stage) {
  const stages = [
    { successChance: 0.60, friendshipBonus: 5, expBonus: 50 },
    { successChance: 0.65, friendshipBonus: 8, expBonus: 80 },
    { successChance: 0.70, friendshipBonus: 12, expBonus: 120 }
  ];
  
  return stages[stage - 1] || stages[0];
}