import React, { useState, useEffect } from 'react';
import { Tent, Users, Calendar, Star, Gift, TrendingUp, CheckCircle, XCircle, AlertCircle, Backpack, MessageCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { getDatabase, ref, get } from 'firebase/database';

export default function CampingView({ 
  trainer,
  campingSessions,
  userCampingData,
  isLoading,
  onStartCamping,
  canCampToday,
  isCampingDay,
  members
}) {
  const [selectedMode, setSelectedMode] = useState('solo');
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [mastodonAccount, setMastodonAccount] = useState('');
  const [isCheckingAccount, setIsCheckingAccount] = useState(true);

  const entryPokemon = trainer?.caughtPokemon?.slice(0, 6).filter(p => p) || [];
  const mySessions = campingSessions.filter(s => s.memberId === trainer?.id && s.status !== 'applied');

  // 마스토돈 계정 확인
  useEffect(() => {
    const checkMastodonAccount = async () => {
      if (!trainer?.id) return;
      
      try {
        const db = getDatabase();
        const accountRef = ref(db, `members/${trainer.id}/mastodonAccount`);
        const snapshot = await get(accountRef);
        
        if (snapshot.exists()) {
          setMastodonAccount(snapshot.val());
        }
      } catch (error) {
        console.error('마스토돈 계정 확인 실패:', error);
      } finally {
        setIsCheckingAccount(false);
      }
    };

    checkMastodonAccount();
  }, [trainer]);

  const handleStartCamping = async () => {
    // 1. 마스토돈 계정 확인
    if (!mastodonAccount) {
      alert('⚠️ 마스토돈 계정을 먼저 연결해주세요!\n\n프로필 > 설정 탭에서 연결할 수 있어요.');
      return;
    }

    // 2. 엔트리 포켓몬 확인
    if (entryPokemon.length === 0) {
      alert('엔트리에 포켓몬이 없습니다!');
      return;
    }

    // 3. 파트너 확인 (2인 캠핑인 경우)
    if (selectedMode === 'duo' && !selectedPartner) {
      alert('함께 캠핑할 파트너를 선택해주세요!');
      return;
    }

    // 4. 캠핑 시작
    const partner = selectedMode === 'duo' ? members[selectedPartner] : null;
    await onStartCamping(entryPokemon, partner?.id, partner?.name);

    // 5. 마스토돈 안내
    alert(`🏕️ 캠핑을 시작했어요!

이제 마스토돈에서 봇을 멘션해주세요:

@pokemonbot@poketodon.monster [캠핑]

예시:
@pokemonbot@poketodon.monster [캠핑]

봇이 1분마다 멘션을 확인해요!`);
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { text: '대기 중', color: 'bg-yellow-100 text-yellow-700', icon: Calendar },
      waiting_for_mastodon: { text: '마스토돈 대기', color: 'bg-orange-100 text-orange-700', icon: AlertCircle },
      in_progress: { text: '진행 중', color: 'bg-blue-100 text-blue-700', icon: TrendingUp },
      ready_to_complete: { text: '완료 대기', color: 'bg-purple-100 text-purple-700', icon: Star },
      completed: { text: '완료', color: 'bg-green-100 text-green-700', icon: CheckCircle },
      applied: { text: '보상 지급됨', color: 'bg-gray-100 text-gray-700', icon: Gift }
    };

    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${badge.color}`}>
        <Icon size={14} />
        {badge.text}
      </span>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">
      <div className="rounded-lg border-2 border-lime-300 bg-white/55 p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <Tent size={48} className="text-lime-700" />
          <div>
            <h1 className="text-3xl font-bold mb-2 text-green-950">캠핑하기</h1>
            <p className="text-green-800">포켓몬과 함께 캠핑을 떠나보세요!</p>
          </div>
        </div>
      </div>

      {/* 마스토돈 계정 미연결 경고 */}
      {!isCheckingAccount && !mastodonAccount && (
        <Card className="bg-red-50 border-2 border-red-300 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={24} className="text-red-600 flex-shrink-0 mt-1" />
            <div className="text-red-800 flex-1">
              <div className="font-bold mb-1">마스토돈 계정 연결 필요</div>
              <div className="text-sm mb-2">
                캠핑을 하려면 마스토돈 계정을 먼저 연결해야 해요!
              </div>
              <button
                onClick={() => {
                  // 프로필 탭으로 이동 (App.jsx에서 setCurrentTab 전달 필요)
                  alert('프로필 > 설정 탭으로 이동해서 마스토돈 계정을 연결해주세요!');
                }}
                className="text-sm bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                설정으로 이동
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* 마스토돈 계정 연결됨 표시 */}
      {!isCheckingAccount && mastodonAccount && (
        <Card className="bg-green-50 border-2 border-green-300 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle size={24} className="text-green-600 flex-shrink-0 mt-1" />
            <div className="text-green-800">
              <div className="font-bold mb-1">마스토돈 계정 연결됨</div>
              <div className="text-sm">
                연결된 계정: <span className="font-mono font-semibold">{mastodonAccount}</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {!canCampToday && !trainer?.isAdmin && !trainer?.isSuperAdmin && (
        <Card className="bg-yellow-50 border-2 border-yellow-300 p-4">
          <div className="flex items-start gap-3">
            <Calendar size={24} className="text-yellow-600 flex-shrink-0 mt-1" />
            <div className="text-yellow-800">
              <div className="font-bold mb-1">이번 주 캠핑 완료</div>
              <div className="text-sm">다음 캠핑은 다음 주에 가능합니다!</div>
            </div>
          </div>
        </Card>
      )}

      {!isCampingDay && canCampToday && !trainer?.isAdmin && !trainer?.isSuperAdmin && (
        <Card className="bg-blue-50 border-2 border-blue-300 p-4">
          <div className="flex items-start gap-3">
            <Calendar size={24} className="text-blue-600 flex-shrink-0 mt-1" />
            <div className="text-blue-800">
              <div className="font-bold mb-1">캠핑 가능일</div>
              <div className="text-sm">캠핑은 월요일과 화요일에만 가능합니다</div>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-6 space-y-6">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Tent size={24} />
          새로운 캠핑 시작
          {(trainer?.isAdmin || trainer?.isSuperAdmin) && (
            <span className="text-sm bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-semibold">
              관리자 무제한
            </span>
          )}
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setSelectedMode('solo')}
            className={`p-4 rounded-lg border-2 font-semibold transition-all ${
              selectedMode === 'solo'
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
            }`}
          >
            <Backpack size={32} className="mx-auto mb-2" />
            <div>혼자 캠핑</div>
            <div className="text-xs text-gray-500 mt-1">기본 성공률</div>
          </button>
          <button
            onClick={() => setSelectedMode('duo')}
            className={`p-4 rounded-lg border-2 font-semibold transition-all ${
              selectedMode === 'duo'
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
            }`}
          >
            <Users size={32} className="mx-auto mb-2" />
            <div>2인 캠핑</div>
            <div className="text-xs text-gray-500 mt-1">성공률 +15%</div>
          </button>
        </div>

        {selectedMode === 'duo' && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              캠핑 파트너 선택
            </label>
            <select
              value={selectedPartner || ''}
              onChange={(e) => setSelectedPartner(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">파트너를 선택하세요</option>
              {Object.entries(members || {})
                .filter(([id]) => id !== trainer?.id)
                .map(([id, member]) => (
                  <option key={id} value={id}>
                    {member.name}
                  </option>
                ))}
            </select>
          </div>
        )}

        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="text-sm font-semibold text-gray-700 mb-2">현재 엔트리</div>
          {entryPokemon.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {entryPokemon.map((pokemon, idx) => (
                <div key={idx} className="bg-white rounded-lg px-3 py-2 border border-gray-200 text-sm">
                  {pokemon.nickname || pokemon.name}
                  <span className="text-xs text-gray-500 ml-2">친밀도: {pokemon.friendship || 0}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500">엔트리에 포켓몬이 없습니다</div>
          )}
        </div>

        <Button
          variant="primary"
          size="lg"
          onClick={handleStartCamping}
          disabled={
            !mastodonAccount || 
            ((!canCampToday || !isCampingDay) && !trainer?.isAdmin && !trainer?.isSuperAdmin) || 
            isLoading
          }
          className="w-full"
        >
          <Tent size={20} />
          캠핑 시작하기
        </Button>
      </Card>

      {mySessions.length > 0 && (
        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <TrendingUp size={24} />
            내 캠핑 진행 상황
          </h2>

          <div className="space-y-3">
            {mySessions.map((session) => (
              <div key={session.firebaseKey} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusBadge(session.status)}
                      {session.isDuo && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                          <Users size={12} />
                          2인 캠핑
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      생성일: {new Date(session.createdAt).toLocaleDateString()}
                    </div>
                    {session.isDuo && (
                      <div className="text-sm text-gray-600">
                        파트너: {session.partnerName}
                      </div>
                    )}
                    {session.status === 'waiting_for_mastodon' && (
                      <div className="mt-2 text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded p-2">
                        <span className="inline-flex items-center gap-1">
                          <MessageCircle size={14} />
                          마스토돈에서 <span className="font-mono font-semibold">@pokemonbot@poketodon.monster [캠핑]</span>을 멘션해주세요!
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-700">단계 {session.currentStage}</div>
                    <div className="text-xs text-gray-500">진행 중</div>
                  </div>
                </div>

                {session.cookingSuccess !== undefined && (
                  <div className={`mt-3 p-3 rounded-lg border-2 ${
                    session.cookingSuccess 
                      ? 'bg-green-50 border-green-300' 
                      : 'bg-red-50 border-red-300'
                  }`}>
                    <div className="flex items-center gap-2 font-semibold">
                      {session.cookingSuccess ? (
                        <>
                          <CheckCircle size={20} className="text-green-600" />
                          <span className="text-green-700">요리 성공!</span>
                        </>
                      ) : (
                        <>
                          <XCircle size={20} className="text-red-600" />
                          <span className="text-red-700">요리 실패...</span>
                        </>
                      )}
                    </div>
                    {session.cookingSuccess && session.cookingResult && (
                      <div className="text-sm text-gray-700 mt-2">
                        친밀도 +{session.cookingResult.stageData.friendshipBonus}, 
                        경험치 +{session.cookingResult.stageData.expBonus}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {userCampingData && (
        <Card className="p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Star size={24} />
            캠핑 통계
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-700">{userCampingData.totalCampings || 0}</div>
              <div className="text-sm text-blue-600">총 캠핑 횟수</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-700">{userCampingData.bestStageReached || 0}</div>
              <div className="text-sm text-purple-600">최고 단계</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-700">
                {userCampingData.lastCampingDate ? '완료' : '미완료'}
              </div>
              <div className="text-sm text-green-600">이번 주 캠핑</div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
