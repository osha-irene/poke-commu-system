// src/components/views/pokemon/detail-tabs/DetailTab.jsx
// 상세 정보 탭 (포획 정보, 성격, 좋아하는 맛)

import React from 'react';
import { 
  MapPin, 
  Calendar, 
  User,
  Cookie,
  Heart,
  Smile,
  TrendingUp,
  TrendingDown,
  Star
} from 'lucide-react';

// 성격별 맛 선호 데이터
const NATURE_FLAVORS = {
  // 공격 올림
  '고집': { up: '공격', down: '특공', like: '매운맛', dislike: '떫은맛' },
  '용감': { up: '공격', down: '스피드', like: '매운맛', dislike: '단맛' },
  '개구쟁이': { up: '공격', down: '특방', like: '매운맛', dislike: '쓴맛' },
  '청순': { up: '공격', down: '방어', like: '매운맛', dislike: '신맛' },
  // 방어 올림
  '대담': { up: '방어', down: '공격', like: '신맛', dislike: '매운맛' },
  '장난꾸러기': { up: '방어', down: '특공', like: '신맛', dislike: '떫은맛' },
  '촐랑': { up: '방어', down: '특방', like: '신맛', dislike: '쓴맛' },
  '느긋': { up: '방어', down: '스피드', like: '신맛', dislike: '단맛' },
  // 스피드 올림
  '겁쟁이': { up: '스피드', down: '공격', like: '단맛', dislike: '매운맛' },
  '성급': { up: '스피드', down: '방어', like: '단맛', dislike: '신맛' },
  '명랑': { up: '스피드', down: '특공', like: '단맛', dislike: '떫은맛' },
  '천진난만': { up: '스피드', down: '특방', like: '단맛', dislike: '쓴맛' },
  // 특공 올림
  '조심': { up: '특공', down: '공격', like: '떫은맛', dislike: '매운맛' },
  '온순': { up: '특공', down: '방어', like: '떫은맛', dislike: '신맛' },
  '덜렁': { up: '특공', down: '특방', like: '떫은맛', dislike: '쓴맛' },
  '냉정': { up: '특공', down: '스피드', like: '떫은맛', dislike: '단맛' },
  // 특방 올림
  '얌전': { up: '특방', down: '공격', like: '쓴맛', dislike: '매운맛' },
  '의젓': { up: '특방', down: '방어', like: '쓴맛', dislike: '신맛' },
  '신중': { up: '특방', down: '스피드', like: '쓴맛', dislike: '단맛' },
  '변덕': { up: '특방', down: '특공', like: '쓴맛', dislike: '떫은맛' },
  // 중립
  '노력': { up: null, down: null, like: null, dislike: null },
  '수줍음': { up: null, down: null, like: null, dislike: null },
  '성실': { up: null, down: null, like: null, dislike: null },
  '건방': { up: null, down: null, like: null, dislike: null },
  '무사태평': { up: null, down: null, like: null, dislike: null }
};

// 맛 아이콘 색상
const getFlavorStyle = (flavor) => {
  const styles = {
    '매운맛': { bg: 'bg-red-100', text: 'text-red-600', border: 'border-red-200' },
    '신맛': { bg: 'bg-yellow-100', text: 'text-yellow-600', border: 'border-yellow-200' },
    '단맛': { bg: 'bg-pink-100', text: 'text-pink-600', border: 'border-pink-200' },
    '쓴맛': { bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-200' },
    '떫은맛': { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' }
  };
  return styles[flavor] || { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' };
};

export default function DetailTab({ pokemon, gamePokedex, allItems, allPokemonMaster }) {
  const natureData = NATURE_FLAVORS[pokemon.nature] || null;

  // 포획 날짜 포맷
  const formatDate = (dateString) => {
    if (!dateString) return '알 수 없음';
    try {
      const date = new Date(dateString);
      return `${date.getFullYear()}.${(date.getMonth()+1).toString().padStart(2,'0')}.${date.getDate().toString().padStart(2,'0')}`;
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-4">
      {/* 포획 정보 */}
      <div className="bg-green-50 rounded-lg p-4 border border-green-200">
        <div className="flex items-center gap-2 mb-3">
          <MapPin size={16} className="text-green-600" />
          <h4 className="text-sm font-bold text-gray-700">포획 정보</h4>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          {/* 포획 장소 */}
          <div className="bg-white rounded-lg p-3 border border-green-100">
            <div className="flex items-center gap-1.5 mb-1">
              <MapPin size={12} className="text-green-500" />
              <span className="text-xs text-gray-500">포획 장소</span>
            </div>
            <div className="text-sm font-semibold text-gray-800">
              {pokemon.caughtLocation || pokemon.metLocation || '알 수 없음'}
            </div>
          </div>
          
          {/* 포획 날짜 */}
          <div className="bg-white rounded-lg p-3 border border-green-100">
            <div className="flex items-center gap-1.5 mb-1">
              <Calendar size={12} className="text-green-500" />
              <span className="text-xs text-gray-500">포획 날짜</span>
            </div>
            <div className="text-sm font-semibold text-gray-800">
              {formatDate(pokemon.caughtAt || pokemon.metDate)}
            </div>
          </div>
          
          {/* 원래 트레이너 */}
          <div className="bg-white rounded-lg p-3 border border-green-100">
            <div className="flex items-center gap-1.5 mb-1">
              <User size={12} className="text-green-500" />
              <span className="text-xs text-gray-500">원래 트레이너</span>
            </div>
            <div className="text-sm font-semibold text-gray-800">
              {pokemon.originalTrainer || pokemon.ot || '알 수 없음'}
            </div>
          </div>
          
          {/* 포획 레벨 */}
          <div className="bg-white rounded-lg p-3 border border-green-100">
            <div className="flex items-center gap-1.5 mb-1">
              <Star size={12} className="text-green-500" />
              <span className="text-xs text-gray-500">포획 레벨</span>
            </div>
            <div className="text-sm font-semibold text-gray-800">
              Lv. {pokemon.caughtLevel || pokemon.metLevel || '?'}
            </div>
          </div>
        </div>
      </div>

      {/* 성격 & 맛 선호 */}
      <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
        <div className="flex items-center gap-2 mb-3">
          <Smile size={16} className="text-yellow-600" />
          <h4 className="text-sm font-bold text-gray-700">성격 & 맛 선호</h4>
        </div>
        
        {pokemon.nature ? (
          <div className="space-y-3">
            {/* 성격 이름 & 효과 */}
            <div className="bg-white rounded-lg p-3 border border-yellow-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl font-bold text-yellow-700">{pokemon.nature}</span>
                {natureData && (natureData.up || natureData.down) && (
                  <div className="flex items-center gap-2 text-sm">
                    {natureData.up && (
                      <span className="flex items-center gap-0.5 text-red-500 font-semibold">
                        <TrendingUp size={14} />
                        {natureData.up}
                      </span>
                    )}
                    {natureData.down && (
                      <span className="flex items-center gap-0.5 text-blue-500 font-semibold">
                        <TrendingDown size={14} />
                        {natureData.down}
                      </span>
                    )}
                  </div>
                )}
              </div>
              
              {/* 중립 성격 */}
              {natureData && !natureData.up && !natureData.down && (
                <div className="text-xs text-gray-500">
                  스탯 보정 없음 (중립 성격)
                </div>
              )}
            </div>
            
            {/* 맛 선호 */}
            {natureData && (natureData.like || natureData.dislike) && (
              <div className="bg-white rounded-lg p-3 border border-yellow-100">
                <div className="flex items-center gap-2 mb-3">
                  <Cookie size={14} className="text-yellow-500" />
                  <span className="text-xs font-semibold text-gray-600">맛 선호</span>
                </div>
                
                <div className="flex gap-3">
                  {/* 좋아하는 맛 */}
                  {natureData.like && (
                    <div className="flex-1">
                      <div className="text-xs text-gray-400 mb-1">좋아함</div>
                      <div className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border ${
                        getFlavorStyle(natureData.like).bg
                      } ${getFlavorStyle(natureData.like).border}`}>
                        <Heart size={14} className={getFlavorStyle(natureData.like).text} fill="currentColor" />
                        <span className={`font-bold ${getFlavorStyle(natureData.like).text}`}>
                          {natureData.like}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* 싫어하는 맛 */}
                  {natureData.dislike && (
                    <div className="flex-1">
                      <div className="text-xs text-gray-400 mb-1">싫어함</div>
                      <div className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border bg-gray-50 border-gray-200">
                        <span className="text-gray-400 line-through font-semibold">
                          {natureData.dislike}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-gray-400 text-center py-4 bg-white rounded-lg border border-yellow-100">
            성격 정보 없음
          </div>
        )}
      </div>

      {/* 추가 정보 (있을 경우) */}
      {(pokemon.memo || pokemon.notes) && (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="text-xs text-gray-500 mb-2">메모</div>
          <div className="text-sm text-gray-700">
            {pokemon.memo || pokemon.notes}
          </div>
        </div>
      )}
    </div>
  );
}
