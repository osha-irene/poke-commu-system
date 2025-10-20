import React, { useState } from 'react';
import { Tent, Play, CheckCircle, XCircle, Gift, Trash2, Users, TrendingUp, AlertCircle } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';

export default function CampingAdminPanel({
  campingSessions = [],
  onProgressSession,
  onCompleteCooking,
  onApplyResults,
  onDeleteSession
}) {
  const [selectedSession, setSelectedSession] = useState(null);

  const pendingSessions = campingSessions.filter(s => s.status === 'pending');
  const inProgressSessions = campingSessions.filter(s => s.status === 'in_progress');
  const readyToCompleteSessions = campingSessions.filter(s => s.status === 'ready_to_complete');
  const completedSessions = campingSessions.filter(s => s.status === 'completed');

  const handleProgress = (sessionKey, choice) => {
    onProgressSession(sessionKey, choice);
  };

  const handleComplete = (sessionKey, success) => {
    onCompleteCooking(sessionKey, success);
  };

  const SessionCard = ({ session }) => {
    const isExpanded = selectedSession === session.firebaseKey;

    return (
      <div className="bg-white rounded-lg border-2 border-gray-200 p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-bold text-gray-800">{session.memberName}</span>
              {session.isDuo && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                  <Users size={12} />
                  + {session.partnerName}
                </span>
              )}
            </div>
            <div className="text-sm text-gray-600">
              생성: {new Date(session.createdAt).toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">
              ID: {session.id}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-700">단계 {session.currentStage}</div>
            <div className="text-xs text-gray-500">{session.status}</div>
          </div>
        </div>

        <button
          onClick={() => setSelectedSession(isExpanded ? null : session.firebaseKey)}
          className="w-full py-2 px-3 bg-gray-100 hover:bg-gray-200 rounded text-sm font-semibold transition-colors"
        >
          {isExpanded ? '접기' : '상세 보기'}
        </button>

        {isExpanded && (
          <div className="bg-gray-50 rounded-lg p-3 space-y-3">
            <div>
              <div className="text-xs font-semibold text-gray-700 mb-1">엔트리 포켓몬</div>
              <div className="flex flex-wrap gap-2">
                {session.entryPokemon.filter(p => p).map((pokemon, idx) => (
                  <span key={idx} className="bg-white px-2 py-1 rounded text-xs border border-gray-200">
                    {pokemon.name}
                  </span>
                ))}
              </div>
            </div>

            {session.status === 'pending' && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-700">캠핑 시작</div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleProgress(session.firebaseKey, 'continue')}
                  className="w-full"
                >
                  <Play size={16} />
                  1단계 진행
                </Button>
              </div>
            )}

            {session.status === 'in_progress' && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-700">요리 진행</div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="warning"
                    size="sm"
                    onClick={() => handleProgress(session.firebaseKey, 'satisfy')}
                  >
                    만족
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleProgress(session.firebaseKey, 'continue')}
                  >
                    계속 {session.currentStage + 1}
                  </Button>
                </div>
              </div>
            )}

            {session.status === 'ready_to_complete' && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-700">요리 결과</div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleComplete(session.firebaseKey, false)}
                  >
                    <XCircle size={16} />
                    실패
                  </Button>
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => handleComplete(session.firebaseKey, true)}
                  >
                    <CheckCircle size={16} />
                    성공
                  </Button>
                </div>
              </div>
            )}

            {session.status === 'completed' && (
              <div className="space-y-2">
                {session.cookingSuccess ? (
                  <div className="bg-green-50 border border-green-300 rounded p-2 text-sm">
                    <div className="font-semibold text-green-700 flex items-center gap-2">
                      <CheckCircle size={16} />
                      요리 성공!
                    </div>
                    <div className="text-green-600 text-xs mt-1">
                      친밀도 +{session.cookingResult?.stageData?.friendshipBonus}, 
                      경험치 +{session.cookingResult?.stageData?.expBonus}
                    </div>
                  </div>
                ) : (
                  <div className="bg-red-50 border border-red-300 rounded p-2 text-sm">
                    <div className="font-semibold text-red-700 flex items-center gap-2">
                      <XCircle size={16} />
                      요리 실패
                    </div>
                  </div>
                )}
                <Button
                  variant="success"
                  size="sm"
                  onClick={() => onApplyResults(session.firebaseKey)}
                  className="w-full"
                >
                  <Gift size={16} />
                  회원에게 결과 반영
                </Button>
              </div>
            )}

            <div className="pt-2 border-t border-gray-200">
              <Button
                variant="danger"
                size="sm"
                onClick={() => onDeleteSession(session.firebaseKey)}
                className="w-full"
              >
                <Trash2 size={16} />
                세션 삭제
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg p-6 shadow-xl">
        <div className="flex items-center gap-4">
          <Tent size={48} />
          <div>
            <h1 className="text-3xl font-bold mb-2">캠핑 관리</h1>
            <p className="text-green-100">진행 중인 캠핑 세션을 관리합니다</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4 bg-yellow-50 border-2 border-yellow-300">
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-700">{pendingSessions.length}</div>
            <div className="text-sm text-yellow-600 font-semibold">대기 중</div>
          </div>
        </Card>
        <Card className="p-4 bg-blue-50 border-2 border-blue-300">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-700">{inProgressSessions.length}</div>
            <div className="text-sm text-blue-600 font-semibold">진행 중</div>
          </div>
        </Card>
        <Card className="p-4 bg-purple-50 border-2 border-purple-300">
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-700">{readyToCompleteSessions.length}</div>
            <div className="text-sm text-purple-600 font-semibold">완료 대기</div>
          </div>
        </Card>
        <Card className="p-4 bg-green-50 border-2 border-green-300">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-700">{completedSessions.length}</div>
            <div className="text-sm text-green-600 font-semibold">완료됨</div>
          </div>
        </Card>
      </div>

      {pendingSessions.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <AlertCircle size={24} />
            대기 중인 세션
          </h2>
          <div className="space-y-3">
            {pendingSessions.map(session => (
              <SessionCard key={session.firebaseKey} session={session} />
            ))}
          </div>
        </Card>
      )}

      {inProgressSessions.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp size={24} />
            진행 중인 세션
          </h2>
          <div className="space-y-3">
            {inProgressSessions.map(session => (
              <SessionCard key={session.firebaseKey} session={session} />
            ))}
          </div>
        </Card>
      )}

      {readyToCompleteSessions.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <CheckCircle size={24} />
            완료 대기 중인 세션
          </h2>
          <div className="space-y-3">
            {readyToCompleteSessions.map(session => (
              <SessionCard key={session.firebaseKey} session={session} />
            ))}
          </div>
        </Card>
      )}

      {completedSessions.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Gift size={24} />
            완료된 세션
          </h2>
          <div className="space-y-3">
            {completedSessions.map(session => (
              <SessionCard key={session.firebaseKey} session={session} />
            ))}
          </div>
        </Card>
      )}

      {campingSessions.length === 0 && (
        <Card className="p-6 text-center">
          <Tent size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">진행 중인 캠핑 세션이 없습니다</p>
        </Card>
      )}
    </div>
  );
}