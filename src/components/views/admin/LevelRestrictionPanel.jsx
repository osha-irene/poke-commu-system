import React, { useState, useEffect } from 'react';
import { Lock, Unlock } from 'lucide-react';
import { ref, set, get } from 'firebase/database';
import { database } from '../../../firebase';

export default function LevelRestrictionPanel({ embedded = false, compact = false }) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [minLevel, setMinLevel] = useState(1);
  const [maxLevel, setMaxLevel] = useState(100);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settingsRef = ref(database, 'gameData/levelRestriction');
        const snapshot = await get(settingsRef);
        
        if (snapshot.exists()) {
          const data = snapshot.val();
          setIsEnabled(data.enabled || false);
          setMinLevel(data.minLevel || 1);
          setMaxLevel(data.maxLevel || 100);
        }
      } catch (error) {
        console.error('레벨 제한 설정 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleSave = async () => {
    if (minLevel < 1 || maxLevel > 100 || minLevel > maxLevel) {
      alert('올바른 레벨 범위를 입력해주세요! (최소: 1~100, 최소 ≤ 최대)');
      return;
    }

    try {
      const settingsRef = ref(database, 'gameData/levelRestriction');
      await set(settingsRef, {
        enabled: isEnabled,
        minLevel: minLevel,
        maxLevel: maxLevel,
        updatedAt: new Date().toISOString()
      });

      alert(`✅ 저장 완료!\n${isEnabled ? `Lv.${minLevel}~${maxLevel}로 제한됩니다.` : '제한이 해제되었습니다.'}`);
    } catch (error) {
      console.error('저장 실패:', error);
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  const containerClass = compact
    ? 'rounded-lg border border-lime-200 bg-white/40 p-4 flex flex-col gap-3'
    : embedded
      ? 'rounded-lg border border-lime-200 bg-white/40 p-5'
      : 'bg-white rounded-lg border-2 border-gray-200 p-6';

  if (loading) {
    return (
      <div className={containerClass}>
        <div className="text-center text-gray-500">로딩 중...</div>
      </div>
    );
  }

  if (compact) {
    return (
      <section className={containerClass}>
        <div className="flex items-center justify-between">
          <h4
            className="text-sm font-bold text-gray-800 flex items-center gap-1.5"
            title="모든 유저의 포켓몬 레벨 범위를 설정합니다"
          >
            {isEnabled ? (
              <Lock className="text-red-600 flex-shrink-0" size={16} />
            ) : (
              <Unlock className="text-gray-400 flex-shrink-0" size={16} />
            )}
            포켓몬 레벨 제한
          </h4>
          <button
            onClick={() => setIsEnabled(!isEnabled)}
            className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors ${
              isEnabled ? 'bg-red-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                isEnabled ? 'translate-x-5' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <input
            type="number"
            value={minLevel}
            onChange={(e) => setMinLevel(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
            disabled={!isEnabled}
            min="1"
            max="100"
            className={`w-full min-w-0 px-2 py-2 text-center text-base font-semibold border-2 rounded-lg focus:outline-none ${
              isEnabled
                ? 'border-gray-300 focus:border-indigo-500 bg-white'
                : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
            }`}
          />
          <span className="text-gray-400 flex-shrink-0">~</span>
          <input
            type="number"
            value={maxLevel}
            onChange={(e) => setMaxLevel(Math.max(1, Math.min(100, parseInt(e.target.value) || 100)))}
            disabled={!isEnabled}
            min="1"
            max="100"
            className={`w-full min-w-0 px-2 py-2 text-center text-base font-semibold border-2 rounded-lg focus:outline-none ${
              isEnabled
                ? 'border-gray-300 focus:border-indigo-500 bg-white'
                : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
            }`}
          />
        </div>

        <button
          onClick={handleSave}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors text-sm"
        >
          저장
        </button>

        <div className="text-xs text-gray-600">
          {isEnabled
            ? <>Lv.{minLevel} ~ Lv.{maxLevel} <span className="text-gray-400">({maxLevel - minLevel + 1}개)</span></>
            : '제한 없음'}
        </div>
      </section>
    );
  }

  return (
    <div className={containerClass}>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {isEnabled ? (
            <Lock className="text-red-600" size={24} />
          ) : (
            <Unlock className="text-gray-400" size={24} />
          )}
          <div>
            <h3 className="text-lg font-bold text-gray-800">포켓몬 레벨 제한</h3>
            <p className="text-xs text-gray-500">모든 유저의 포켓몬 레벨 범위를 설정합니다</p>
          </div>
        </div>

        <button
          onClick={() => setIsEnabled(!isEnabled)}
          className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
            isEnabled ? 'bg-red-500' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
              isEnabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* 레벨 범위 설정 */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-gray-700">최소</label>
          <input
            type="number"
            value={minLevel}
            onChange={(e) => setMinLevel(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
            disabled={!isEnabled}
            min="1"
            max="100"
            className={`w-20 px-2 py-1.5 text-center text-base font-semibold border-2 rounded-lg focus:outline-none ${
              isEnabled
                ? 'border-gray-300 focus:border-indigo-500 bg-white'
                : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
            }`}
          />
        </div>

        <span className="text-gray-400">~</span>

        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-gray-700">최대</label>
          <input
            type="number"
            value={maxLevel}
            onChange={(e) => setMaxLevel(Math.max(1, Math.min(100, parseInt(e.target.value) || 100)))}
            disabled={!isEnabled}
            min="1"
            max="100"
            className={`w-20 px-2 py-1.5 text-center text-base font-semibold border-2 rounded-lg focus:outline-none ${
              isEnabled
                ? 'border-gray-300 focus:border-indigo-500 bg-white'
                : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
            }`}
          />
        </div>
      </div>

      {/* 미리보기 & 저장 버튼 */}
      <div className="flex items-center justify-between">
        {isEnabled ? (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-2">
            <div className="text-sm text-indigo-600 font-semibold">
              Lv.{minLevel} ~ Lv.{maxLevel} <span className="text-xs">({maxLevel - minLevel + 1}개 레벨)</span>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-500">제한 없음</div>
        )}

        <button
          onClick={handleSave}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors"
        >
          저장
        </button>
      </div>
    </div>
  );
}
