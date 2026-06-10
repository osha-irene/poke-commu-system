// src/components/views/pokemon/detail-tabs/StatsTab.jsx
// 스탯/컨디션/노력치/특성/친밀도/크기 탭

import React, { useState } from 'react';
import { 
  TrendingUp, Activity, Dumbbell, BarChart3, 
  Heart, Ruler, Star, Sparkles
} from 'lucide-react';
import { 
  RadarChart, 
  Radar, 
  PolarGrid, 
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer
} from 'recharts';
import { getAbilityByName } from '../../../../utils/abilityUtils';

// 크기 등급별 색상
const getSizeColor = (rank) => {
  const colors = {
    'XXXS': 'text-purple-700 bg-purple-100 border-purple-300',
    'XXS': 'text-purple-600 bg-purple-50 border-purple-200',
    'XS': 'text-blue-600 bg-blue-50 border-blue-200',
    'M': 'text-gray-600 bg-gray-50 border-gray-200',
    'XL': 'text-orange-600 bg-orange-50 border-orange-200',
    'XXL': 'text-red-600 bg-red-50 border-red-200',
    'XXXL': 'text-red-700 bg-red-100 border-red-300'
  };
  return colors[rank] || 'text-gray-600 bg-gray-50 border-gray-200';
};

const getSizeRarity = (rank) => {
  const rarities = {
    'XXXS': { icon: Sparkles, text: '극희귀' },
    'XXXL': { icon: Sparkles, text: '극희귀' },
    'XXS': { icon: Star, text: '희귀' },
    'XXL': { icon: Star, text: '희귀' },
    'XS': { icon: null, text: '레어' },
    'XL': { icon: null, text: '레어' }
  };
  return rarities[rank] || { icon: null, text: '일반' };
};

export default function StatsTab({ pokemon, allPokemonMaster = [] }) {
  const [hoveredValue, setHoveredValue] = useState(null);
  const [tooltipType, setTooltipType] = useState('');
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  // 특성 데이터
  const abilityData = getAbilityByName(pokemon.ability);
  
  const rarity = getSizeRarity(pokemon.sizeRank);
  const RarityIcon = rarity.icon;
  
  // 컨디션 데이터
  const conditionData = [
    { subject: '근사함', A: pokemon.condition?.elegance || 0, fullMark: 100 },
    { subject: '아름다움', A: pokemon.condition?.beauty || 0, fullMark: 100 },
    { subject: '귀여움', A: pokemon.condition?.cuteness || 0, fullMark: 100 },
    { subject: '슬기로움', A: pokemon.condition?.intelligence || 0, fullMark: 100 },
    { subject: '강인함', A: pokemon.condition?.strength || 0, fullMark: 100 }
  ];

  // 노력치 데이터
  const effortData = [
    { subject: 'HP', A: pokemon.effort?.hp || 0, fullMark: 255 },
    { subject: '공격', A: pokemon.effort?.attack || 0, fullMark: 255 },
    { subject: '방어', A: pokemon.effort?.defense || 0, fullMark: 255 },
    { subject: '특공', A: pokemon.effort?.specialAttack || 0, fullMark: 255 },
    { subject: '특방', A: pokemon.effort?.specialDefense || 0, fullMark: 255 },
    { subject: '스피드', A: pokemon.effort?.speed || 0, fullMark: 255 }
  ];
  
  // 개체값 데이터 (있으면)
  const ivData = pokemon.iv ? [
    { name: 'HP', value: pokemon.iv.hp || 0 },
    { name: '공격', value: pokemon.iv.attack || 0 },
    { name: '방어', value: pokemon.iv.defense || 0 },
    { name: '특공', value: pokemon.iv.specialAttack || 0 },
    { name: '특방', value: pokemon.iv.specialDefense || 0 },
    { name: '스피드', value: pokemon.iv.speed || 0 }
  ] : null;
  
  // 총 노력치 계산
  const totalEffort = Object.values(pokemon.effort || {}).reduce((sum, val) => sum + (val || 0), 0);

  // 레이더 차트 틱 렌더링
  const renderTick = (tickProps, dataArray, color) => {
    const { x, y, payload, textAnchor } = tickProps;
    const item = dataArray.find(d => d.subject === payload.value);
    
    return (
      <text
        x={x}
        y={y}
        textAnchor={textAnchor}
        fill={color}
        fontSize={9}
        fontWeight={600}
        style={{ cursor: 'pointer' }}
        onMouseEnter={(e) => {
          if (e?.target) {
            const rect = e.target.getBoundingClientRect();
            setHoveredValue(item?.A || 0);
            setTooltipType(dataArray === conditionData ? 'condition' : 'effort');
            setMousePos({ 
              x: rect.left + rect.width / 2,
              y: rect.top
            });
          }
        }}
        onMouseLeave={() => {
          setHoveredValue(null);
          setTooltipType('');
        }}
      >
        {payload.value}
      </text>
    );
  };

  // 한글 특성 설명 가져오기
  const getAbilityDescription = () => {
    if (!abilityData) return '특성 정보 없음';
    return abilityData.effectKo || 
           abilityData.flavorTextKo || 
           abilityData.shortEffectKo || 
           abilityData.shortEffect || 
           abilityData.effect || 
           '설명 없음';
  };

  return (
    <div className="space-y-4">
      {/* 특성 (인라인 표시) */}
      {pokemon.ability && (
        <div className={`rounded-lg p-3 border ${
          pokemon.isHiddenAbility 
            ? 'bg-yellow-50 border-yellow-200' 
            : 'bg-purple-50 border-purple-200'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <Star size={14} className={pokemon.isHiddenAbility ? 'text-yellow-500' : 'text-purple-500'} />
            <span className="text-sm font-bold text-gray-700">특성</span>
            <span className={`text-sm font-bold ${
              pokemon.isHiddenAbility ? 'text-yellow-700' : 'text-purple-700'
            }`}>
              {abilityData?.name || pokemon.ability}
            </span>
            {pokemon.isHiddenAbility && (
              <span className="text-xs bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded font-bold">
                숨겨진 특성
              </span>
            )}
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            {getAbilityDescription()}
          </p>
        </div>
      )}

      {/* 크기 & 친밀도 */}
      <div className="grid grid-cols-2 gap-3">
        {/* 크기 정보 */}
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
          <div className="flex items-center gap-1.5 mb-2">
            <Ruler size={14} className="text-blue-500" />
            <span className="text-xs font-semibold text-gray-700">크기</span>
            {pokemon.sizeRank && (
              <span className={`ml-auto text-xs px-1.5 py-0.5 rounded border font-bold ${getSizeColor(pokemon.sizeRank)}`}>
                {pokemon.sizeRank}
              </span>
            )}
          </div>
          
          {pokemon.sizeRank ? (
            <div className="space-y-1.5">
              {/* 희귀도 */}
              {pokemon.sizeRank && rarity.text !== '일반' && (
                <div className={`flex items-center gap-1 text-xs ${
                  pokemon.sizeRank?.includes('XXX') ? 'text-purple-600' : 'text-yellow-600'
                }`}>
                  {RarityIcon && <RarityIcon size={10} />}
                  {rarity.text}
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-gray-400">정보 없음</div>
          )}
        </div>
        
        {/* 친밀도 */}
        <div className="bg-pink-50 rounded-lg p-3 border border-pink-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Heart size={14} className="text-pink-500" />
              <span className="text-xs font-semibold text-gray-700">친밀도</span>
            </div>
            <span className="text-xs font-bold text-pink-600">
              {pokemon.friendship || 0} / 255
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
            <div 
              className="bg-gradient-to-r from-pink-400 to-pink-600 h-2.5 rounded-full transition-all" 
              style={{ width: `${((pokemon.friendship || 0) / 255) * 100}%` }} 
            />
          </div>
          <div className="text-xs text-gray-500 text-center">
            {pokemon.friendship >= 220 ? '최고로 좋음' :
             pokemon.friendship >= 160 ? '매우 좋음' :
             pokemon.friendship >= 100 ? '좋음' :
             pokemon.friendship >= 50 ? '보통' : '낯설어함'}
          </div>
        </div>
      </div>
      
      {/* 개체값 (IV) */}
      {ivData && (
        <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-200">
          <div className="flex items-center gap-1 mb-3">
            <TrendingUp size={14} className="text-indigo-500" />
            <span className="text-xs font-semibold text-gray-700">개체값 (IV)</span>
            <span className="ml-auto text-xs text-indigo-600 font-bold">
              총합: {ivData.reduce((sum, item) => sum + item.value, 0)}/186
            </span>
          </div>
          <div className="grid grid-cols-6 gap-1">
            {ivData.map((stat) => (
              <div key={stat.name} className="text-center">
                <div className="text-xs text-gray-500 mb-1">{stat.name}</div>
                <div className={`text-sm font-bold ${
                  stat.value >= 30 ? 'text-indigo-600' :
                  stat.value >= 20 ? 'text-blue-500' :
                  stat.value >= 10 ? 'text-gray-600' : 'text-gray-400'
                }`}>
                  {stat.value}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                  <div 
                    className="bg-indigo-500 h-1 rounded-full"
                    style={{ width: `${(stat.value / 31) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* 레이더 차트들 */}
      <div className="grid grid-cols-2 gap-3">
        {/* 컨디션 */}
        <div 
          className="bg-purple-50 rounded-lg p-3 border border-purple-200"
          onMouseLeave={() => {
            setHoveredValue(null);
            setTooltipType('');
          }}
        >
          <div className="flex items-center gap-1 mb-2">
            <BarChart3 size={14} className="text-purple-500" />
            <span className="text-xs font-semibold text-gray-700">컨디션</span>
          </div>
          <div className="w-full h-32 relative">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={conditionData} tabIndex={-1}>
                <PolarGrid 
                  stroke="#9333EA"
                  strokeWidth={1.5}
                  strokeOpacity={0.3}
                  radialLines={false}
                />
                <PolarAngleAxis 
                  dataKey="subject" 
                  tick={(props) => renderTick(props, conditionData, '#581C87')}
                />
                <PolarRadiusAxis 
                  angle={90}
                  domain={[0, 100]}
                  tick={false}
                />
                <Radar 
                  dataKey="A" 
                  stroke="#A855F7"
                  strokeWidth={1} 
                  fill="#A855F7" 
                  fillOpacity={0.6}
                  activeDot={false}
                  dot={false}
                />
              </RadarChart>
            </ResponsiveContainer>
            
            {hoveredValue !== null && tooltipType === 'condition' && (
              <div 
                className="fixed z-50 pointer-events-none"
                style={{ 
                  left: mousePos.x,
                  top: mousePos.y - 35,
                  transform: 'translateX(-50%)'
                }}
              >
                <div className="px-2 py-1 rounded text-white text-xs font-semibold bg-purple-500">
                  {hoveredValue}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 노력치 */}
        <div 
          className="bg-blue-50 rounded-lg p-3 border border-blue-200"
          onMouseLeave={() => {
            setHoveredValue(null);
            setTooltipType('');
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1">
              <Dumbbell size={14} className="text-blue-500" />
              <span className="text-xs font-semibold text-gray-700">노력치</span>
            </div>
            <span className="text-xs text-blue-600 font-bold">
              {totalEffort}/510
            </span>
          </div>
          <div className="w-full h-32 relative">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={effortData}>
                <PolarGrid 
                  stroke="#2563EB"
                  strokeWidth={1.5}
                  strokeOpacity={0.3}
                  radialLines={false}
                  gridType="polygon"
                />
                <PolarAngleAxis 
                  dataKey="subject" 
                  tick={(props) => renderTick(props, effortData, '#1E3A8A')}
                />
                <PolarRadiusAxis 
                  angle={90}
                  domain={[0, 255]}
                  tickCount={5}
                  tick={false}
                />
                <Radar 
                  dataKey="A" 
                  stroke="#3B82F6"
                  strokeWidth={1} 
                  fill="#3B82F6" 
                  fillOpacity={0.6}
                  activeDot={false}
                  dot={false}
                />
              </RadarChart>
            </ResponsiveContainer>
            
            {hoveredValue !== null && tooltipType === 'effort' && (
              <div 
                className="fixed z-50 pointer-events-none"
                style={{ 
                  left: mousePos.x,
                  top: mousePos.y - 35,
                  transform: 'translateX(-50%)'
                }}
              >
                <div className="px-2 py-1 rounded text-white text-xs font-semibold bg-blue-500">
                  {hoveredValue}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* 성격 */}
      {pokemon.nature && (
        <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-yellow-600" />
              <span className="text-xs font-semibold text-gray-700">성격</span>
              <span className="text-sm font-bold text-yellow-700">{pokemon.nature}</span>
            </div>
            {pokemon.natureEffect && (
              <span className="text-xs text-gray-500">
                {pokemon.natureEffect.up && <span className="text-red-500">+{pokemon.natureEffect.up}</span>}
                {pokemon.natureEffect.up && pokemon.natureEffect.down && ' / '}
                {pokemon.natureEffect.down && <span className="text-blue-500">-{pokemon.natureEffect.down}</span>}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
