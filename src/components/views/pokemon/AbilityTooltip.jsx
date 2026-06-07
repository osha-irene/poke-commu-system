// src/components/views/pokemon/AbilityTooltip.jsx
// 특성 설명 툴팁 컴포넌트 - 한글 설명 지원

import React, { useState, useEffect } from 'react';
import { 
  Info, Star, Zap, Shield, Wind, Flame, Droplet, 
  Snowflake, Sun, Loader2 
} from 'lucide-react';
import { 
  getAbilityByName, 
  classifyAbilityEffect,
  fetchAbilityKoreanDescription 
} from '../../../utils/abilityUtils';

/**
 * 특성 효과 타입에 따른 아이콘 반환
 */
const getEffectIcon = (effectType) => {
  switch (effectType) {
    case 'weather_rain':
      return <Droplet size={14} className="text-blue-500" />;
    case 'weather_sun':
      return <Sun size={14} className="text-orange-500" />;
    case 'weather_sand':
      return <Wind size={14} className="text-yellow-700" />;
    case 'weather_hail':
      return <Snowflake size={14} className="text-cyan-500" />;
    case 'stat_attack':
    case 'damage':
      return <Zap size={14} className="text-red-500" />;
    case 'stat_defense':
    case 'immunity':
      return <Shield size={14} className="text-blue-600" />;
    case 'stat_speed':
      return <Wind size={14} className="text-green-500" />;
    case 'healing':
      return <Flame size={14} className="text-pink-500" />;
    default:
      return <Star size={14} className="text-purple-500" />;
  }
};

// 한글 설명 캐시 (메모리)
const koreanDescriptionCache = {};

/**
 * 특성 설명 툴팁 컴포넌트
 * @param {Object} props
 * @param {string} props.abilityName - 특성 이름 (한글 또는 영문)
 * @param {boolean} props.isHidden - 숨겨진 특성 여부
 * @param {string} props.className - 추가 CSS 클래스
 * @param {boolean} props.showIcon - 정보 아이콘 표시 여부
 * @param {string} props.size - 크기 ('sm' | 'md' | 'lg')
 * @param {boolean} props.fetchKorean - API에서 한글 설명 가져오기 여부
 */
export default function AbilityTooltip({ 
  abilityName, 
  isHidden = false, 
  className = '',
  showIcon = true,
  size = 'md',
  fetchKorean = true
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [koreanDescription, setKoreanDescription] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const abilityData = getAbilityByName(abilityName);
  const effectClass = classifyAbilityEffect(abilityName);
  
  // 한글 설명 가져오기
  useEffect(() => {
    if (!showTooltip || !fetchKorean || !abilityData) return;
    
    // 이미 한글 설명이 있으면 스킵
    if (abilityData.effectKo || abilityData.flavorTextKo || abilityData.shortEffectKo) {
      setKoreanDescription({
        effect: abilityData.effectKo || abilityData.flavorTextKo || abilityData.shortEffectKo
      });
      return;
    }
    
    // 캐시 확인
    if (koreanDescriptionCache[abilityData.id]) {
      setKoreanDescription(koreanDescriptionCache[abilityData.id]);
      return;
    }
    
    // API에서 가져오기
    const fetchDescription = async () => {
      setIsLoading(true);
      try {
        const data = await fetchAbilityKoreanDescription(abilityData.id);
        if (data) {
          koreanDescriptionCache[abilityData.id] = data;
          setKoreanDescription(data);
        }
      } catch (error) {
        console.error('Failed to fetch Korean description:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDescription();
  }, [showTooltip, fetchKorean, abilityData]);
  
  if (!abilityData) {
    return (
      <span className={`text-gray-500 ${className}`}>
        {abilityName || '없음'}
      </span>
    );
  }
  
  const handleMouseEnter = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top
    });
    setShowTooltip(true);
  };
  
  const handleMouseLeave = () => {
    setShowTooltip(false);
  };
  
  // 크기별 스타일
  const sizeStyles = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };
  
  // 기본/숨겨진 특성 스타일
  const baseStyle = isHidden 
    ? 'bg-yellow-50 border-yellow-400 text-yellow-700'
    : 'bg-indigo-50 border-indigo-200 text-indigo-700';
  
  // 표시할 설명 결정 (한글 우선)
  const getDisplayDescription = () => {
    // 1순위: API에서 가져온 한글 설명
    if (koreanDescription) {
      return koreanDescription.effectKo || 
             koreanDescription.flavorText || 
             koreanDescription.shortEffectKo;
    }
    
    // 2순위: abilities.json의 한글 설명
    if (abilityData.effectKo || abilityData.flavorTextKo || abilityData.shortEffectKo) {
      return abilityData.effectKo || abilityData.flavorTextKo || abilityData.shortEffectKo;
    }
    
    // 3순위: 영어 설명
    return abilityData.shortEffect || abilityData.effect || '설명 없음';
  };
  
  return (
    <div className="relative inline-block">
      <div
        className={`
          inline-flex items-center gap-1 px-2 py-1 rounded-lg border-2 
          cursor-help transition-all hover:shadow-md
          ${baseStyle} ${sizeStyles[size]} ${className}
        `}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* 효과 타입 아이콘 */}
        {getEffectIcon(effectClass.type)}
        
        {/* 특성 이름 */}
        <span className="font-bold">{abilityData.name}</span>
        
        {/* 숨겨진 특성 표시 */}
        {isHidden && (
          <Star size={12} className="text-yellow-500 fill-yellow-500" />
        )}
        
        {/* 정보 아이콘 */}
        {showIcon && (
          <Info size={12} className="text-gray-400" />
        )}
      </div>
      
      {/* 툴팁 */}
      {showTooltip && (
        <div 
          className="fixed z-[9999] pointer-events-none"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y - 10,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <div className={`
            max-w-xs p-3 rounded-lg shadow-xl border-2
            ${isHidden ? 'bg-yellow-50 border-yellow-300' : 'bg-white border-indigo-200'}
          `}>
            {/* 헤더 */}
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-200">
              {getEffectIcon(effectClass.type)}
              <div>
                <div className="font-bold text-gray-800">
                  {abilityData.name}
                </div>
                <div className="text-xs text-gray-500">
                  {abilityData.nameEn}
                </div>
              </div>
              {isHidden && (
                <span className="ml-auto text-xs bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full font-bold">
                  숨겨진 특성
                </span>
              )}
            </div>
            
            {/* 설명 */}
            <div className="text-xs text-gray-700 leading-relaxed min-h-[2rem]">
              {isLoading ? (
                <div className="flex items-center gap-2 text-gray-400">
                  <Loader2 size={12} className="animate-spin" />
                  <span>설명을 불러오는 중...</span>
                </div>
              ) : (
                getDisplayDescription()
              )}
            </div>
            
            {/* 세대 정보 */}
            {abilityData.generation && (
              <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-400">
                {abilityData.generation.replace('generation-', '').toUpperCase()}세대부터 등장
              </div>
            )}
          </div>
          
          {/* 툴팁 화살표 */}
          <div 
            className={`
              w-0 h-0 mx-auto
              border-l-[8px] border-l-transparent
              border-r-[8px] border-r-transparent
              border-t-[8px]
              ${isHidden ? 'border-t-yellow-300' : 'border-t-indigo-200'}
            `}
          />
        </div>
      )}
    </div>
  );
}
