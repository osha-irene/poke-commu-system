// functions/index.js - 최종 완성 버전
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const http = require('http');

admin.initializeApp();
const db = admin.database();

// ==================== 설정 ====================
const MASTODON_IP = '34.182.100.57';
const MASTODON_TOKEN = 'XI72vOEozK2BWJua8Ub5bbiZWIfxC1SzkvYKWWtD-a4';

// ==================== 캠핑 설정 ====================
const CAMPING_STAGES = {
  0: {
    message: '🏕️ 캠핑을 시작했어요!\n떡볶이를 만들어 볼까요?\n\n[만족] 또는 [계속]를 선택해주세요!',
    successRate: 90
  },
  1: {
    message: '🔥 떡볶이가 점점 맛있어 보여요!\n조금 더 끓여볼까요?\n\n[만족] 또는 [계속]를 선택해주세요!',
    successRate: 70
  },
  2: {
    message: '🌟 완벽한 떡볶이가 되어가고 있어요!\n마지막 한 번 더?\n\n[만족] 또는 [계속]를 선택해주세요!',
    successRate: 50
  },
  3: {
    message: '✨ 거의 다 됐어요!\n정말 마지막이에요!\n\n[만족] 또는 [계속]를 선택해주세요!',
    successRate: 30
  },
  4: {
    message: '🎉 완벽해요! 하지만 욕심을 부리면...\n\n[만족] 또는 [계속]를 선택해주세요!',
    successRate: 10
  }
};

// ==================== HTTP 요청 헬퍼 ====================
const makeHttpRequest = (path, method = 'GET', data = null) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: MASTODON_IP,
      port: 80,
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${MASTODON_TOKEN}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    };

    if (data) {
      const postData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const request = http.request(options, (response) => {
      let responseData = '';
      response.on('data', chunk => responseData += chunk);
      response.on('end', () => {
        try {
          resolve(JSON.parse(responseData));
        } catch (e) {
          resolve(responseData);
        }
      });
    });

    request.on('error', reject);
    request.on('timeout', () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (data) {
      request.write(JSON.stringify(data));
    }
    
    request.end();
  });
};

// 마스토돈 멘션 조회
const getMentions = async (sinceId = null) => {
  try {
    let path = '/api/v1/notifications?limit=40';
    if (sinceId) path += `&since_id=${sinceId}`;
    
    console.log('요청 경로:', path);
    const data = await makeHttpRequest(path);
    
    // 응답 타입 확인
    console.log('응답 타입:', typeof data);
    console.log('응답 내용:', JSON.stringify(data).substring(0, 200));
    
    // 배열이 아니면 빈 배열 반환
    if (!Array.isArray(data)) {
      console.error('응답이 배열이 아님:', data);
      return [];
    }
    
    return data.filter(notif => notif.type === 'mention');
  } catch (error) {
    console.error('멘션 조회 실패:', error.message);
    throw error;
  }
};
// 마스토돈 답글 작성
const replyToStatus = async (statusId, content, visibility = 'public') => {
  try {
    await makeHttpRequest('/api/v1/statuses', 'POST', {
      status: content,
      in_reply_to_id: statusId,
      visibility
    });
    console.log('답글 작성 성공');
  } catch (error) {
    console.error('답글 작성 실패:', error.message);
    throw error;
  }
};

// 사용자 세션 찾기
const findUserSession = async (mastodonAccount) => {
  try {
    const membersRef = db.ref('members');
    const membersSnap = await membersRef.once('value');
    const members = membersSnap.val() || {};
    
    let userId = null;
    for (const [id, member] of Object.entries(members)) {
      if (member.mastodonAccount === mastodonAccount) {
        userId = id;
        break;
      }
    }
    
    if (!userId) {
      console.log(`마스토돈 계정 ${mastodonAccount}에 연결된 사용자를 찾을 수 없음`);
      return null;
    }
    
    console.log(`사용자 발견: ${userId}`);
    
    const sessionsRef = db.ref('gameData/campingSessions');
    const sessionsSnap = await sessionsRef.once('value');
    const sessions = sessionsSnap.val() || {};
    
    for (const [key, session] of Object.entries(sessions)) {
      if (session.memberId === userId && 
          session.status !== 'completed' && 
          session.status !== 'applied') {
        console.log(`활성 세션 발견: ${key}`);
        return { sessionKey: key, session, userId };
      }
    }
    
    console.log('활성화된 캠핑 세션을 찾을 수 없음');
    return null;
    
  } catch (error) {
    console.error('세션 찾기 실패:', error);
    return null;
  }
};

// 캠핑 성공/실패 판정
const checkCampingSuccess = (stage) => {
  const stageData = CAMPING_STAGES[stage];
  if (!stageData) return false;
  
  const random = Math.floor(Math.random() * 100) + 1;
  const success = random <= stageData.successRate;
  
  console.log(`단계 ${stage} 판정: ${random}% (성공률: ${stageData.successRate}%) = ${success ? '성공' : '실패'}`);
  return success;
};

// ==================== Cloud Functions ====================

exports.checkMastodonMentions = functions
  .region('asia-northeast3')
  .runWith({
    timeoutSeconds: 300,
    memory: '256MB'
  })
  .pubsub.schedule('every 1 minutes')
  .timeZone('Asia/Seoul')
  .onRun(async (context) => {
    try {
      console.log('==================== 멘션 확인 시작 ====================');
      
      const lastIdRef = db.ref('mastodonBot/lastNotificationId');
      const lastIdSnap = await lastIdRef.once('value');
      const lastMentionId = lastIdSnap.val();
      
      console.log('마지막 확인 ID:', lastMentionId);
      
      const mentions = await getMentions(lastMentionId);
      console.log(`새 멘션 ${mentions.length}개 발견`);
      
      if (mentions.length === 0) {
        console.log('새 멘션 없음');
        return null;
      }
      
      await lastIdRef.set(mentions[0].id);
      
      for (const mention of mentions.reverse()) {
        const statusId = mention.status.id;
        const content = mention.status.content.replace(/<[^>]*>/g, '').trim();
        const mastodonAccount = `@${mention.account.acct}`;
        
        console.log(`\n처리 중: ${mastodonAccount}`);
        console.log(`내용: ${content}`);
        
        const userSession = await findUserSession(mastodonAccount);
        
        if (!userSession) {
          await replyToStatus(statusId, 
            '❌ 활성화된 캠핑 세션을 찾을 수 없어요.\n\n게임에서 먼저 캠핑을 시작해주세요!');
          continue;
        }
        
        const { sessionKey, session } = userSession;
        const sessionRef = db.ref(`gameData/campingSessions/${sessionKey}`);
        
        // 명령어 처리
        if (content.includes('[캠핑]') || content.includes('캠핑')) {
          console.log('캠핑 시작 명령어');
          
          await sessionRef.update({
            status: 'in_progress',
            mastodonStatusId: statusId,
            currentStage: 0
          });
          
          await replyToStatus(statusId, CAMPING_STAGES[0].message);
        }
        else if (content.includes('[만족]') || content.includes('만족')) {
          console.log('만족 명령어 - 현재 단계에서 완료');
          
          const stage = session.currentStage;
          
          await sessionRef.update({
            status: 'ready_to_complete',
            finalStage: stage,
            success: true,
            completedAt: Date.now()
          });
          
          await replyToStatus(statusId,
            `✅ 캠핑을 완료했어요!\n도달 단계: ${stage}\n\n관리자가 보상을 지급할 거예요!`);
        }
        else if (content.includes('[계속]') || content.includes('계속')) {
          console.log('계속 명령어');
          
          const currentStage = session.currentStage;
          
          if (currentStage === 4) {
            console.log('5단계 도전!');
            
            const success = checkCampingSuccess(4);
            
            if (success) {
              console.log('🎉 5단계 성공!');
              
              await sessionRef.update({
                status: 'ready_to_complete',
                finalStage: 5,
                success: true,
                isPerfect: true,
                completedAt: Date.now()
              });
              
              await replyToStatus(statusId,
                `🎊 대성공! 완벽한 떡볶이를 만들었어요!\n최고 단계 5 달성!\n\n관리자가 특별 보상을 지급할 거예요!`);
            } else {
              console.log('💥 5단계 실패');
              
              await sessionRef.update({
                status: 'ready_to_complete',
                finalStage: 5,
                success: false,
                completedAt: Date.now()
              });
              
              await replyToStatus(statusId,
                `💥 떡볶이가 타버렸어요...\n\n5단계 도전 실패!`);
            }
          }
          else if (currentStage < 4) {
            const success = checkCampingSuccess(currentStage);
            
            if (success) {
              const nextStage = currentStage + 1;
              console.log(`성공! 단계 진행: ${currentStage} → ${nextStage}`);
              
              await sessionRef.update({
                currentStage: nextStage
              });
              
              await replyToStatus(statusId, CAMPING_STAGES[nextStage].message);
            } else {
              console.log(`실패! 단계 ${currentStage}에서 실패`);
              
              await sessionRef.update({
                status: 'ready_to_complete',
                finalStage: currentStage,
                success: false,
                completedAt: Date.now()
              });
              
              await replyToStatus(statusId,
                `💥 떡볶이가 타버렸어요...\n\n단계 ${currentStage}에서 실패했습니다!`);
            }
          }
        }
        else {
          await replyToStatus(statusId,
            '❓ 알 수 없는 명령어예요.\n\n사용 가능한 명령어:\n[캠핑] - 캠핑 시작\n[만족] - 현재 단계에서 완료\n[계속] - 다음 단계로');
        }
      }
      
      console.log('==================== 멘션 확인 완료 ====================');
      return null;
      
    } catch (error) {
      console.error('==================== 에러 발생 ====================');
      console.error('에러:', error);
      return null;
    }
  });

exports.testNetwork = functions
  .region('asia-northeast3')
  .https.onRequest(async (req, res) => {
    try {
      const instance = await makeHttpRequest('/api/v1/instance');
      res.json({
        success: true,
        message: 'Native HTTP 연결 성공',
        instance: {
          title: instance.title,
          version: instance.version
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

exports.checkIP = functions
  .region('asia-northeast3')
  .https.onRequest(async (req, res) => {
    try {
      const https = require('https');
      const promise = new Promise((resolve, reject) => {
        https.get('https://api.ipify.org?format=json', (response) => {
          let data = '';
          response.on('data', chunk => data += chunk);
          response.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
      });
      
      const ipData = await promise;
      res.json({
        cloudFunctionIP: ipData.ip,
        message: '이 IP를 마스토돈 방화벽에 허용해야 합니다'
      });
    } catch (error) {
      res.json({ error: error.message });
    }
  });