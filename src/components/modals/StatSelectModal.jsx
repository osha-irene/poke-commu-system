import React, { useState } from 'react';
import { X } from 'lucide-react';

const CONDITION_OPTIONS = [
  { key: 'elegance', label: '우아함' },
  { key: 'beauty', label: '아름다움' },
  { key: 'cuteness', label: '귀여움' },
  { key: 'intelligence', label: '영리함' },
  { key: 'strength', label: '강인함' },
];

const EV_OPTIONS = [
  { key: 'hp', label: 'HP' },
  { key: 'attack', label: '공격' },
  { key: 'defense', label: '방어' },
  { key: 'specialAttack', label: '특수공격' },
  { key: 'specialDefense', label: '특수방어' },
  { key: 'speed', label: '스피드' },
];

const clampEffort = (value) => Math.min(252, Math.max(0, Number(value) || 0));

export default function StatSelectModal({
  type,
  amount,
  pokemonName,
  currentEffort = {},
  onSelect,
  onClose
}) {
  const isEffortEdit = type === 'effortEdit';
  const isCondition = type === 'conditionSelect';
  const options = isCondition ? CONDITION_OPTIONS : EV_OPTIONS;
  const label = isCondition ? '컨디션' : '노력치';
  const [effortValues, setEffortValues] = useState(() => Object.fromEntries(
    EV_OPTIONS.map(({ key }) => [key, clampEffort(currentEffort?.[key])])
  ));
  const effortTotal = Object.values(effortValues).reduce((sum, value) => sum + Number(value || 0), 0);

  const handleEffortSubmit = () => {
    if (effortTotal > 510) {
      alert('기초포인트 총합은 510을 초과할 수 없습니다.');
      return;
    }
    onSelect(effortValues);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-5 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-800 text-lg">
            {isEffortEdit ? '기초포인트 수정' : `${label} 항목 선택`}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        {isEffortEdit ? (
          <>
            <p className="text-base text-gray-500">
              {pokemonName}의 기초포인트 최종값을 입력하세요.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {EV_OPTIONS.map(({ key, label: optLabel }) => (
                <label key={key} className="text-sm font-semibold text-gray-700">
                  {optLabel}
                  <input
                    type="number"
                    min="0"
                    max="252"
                    value={effortValues[key]}
                    onChange={(event) => {
                      const nextValue = clampEffort(event.target.value);
                      setEffortValues(prev => ({ ...prev, [key]: nextValue }));
                    }}
                    className="mt-1 w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-base font-bold focus:border-indigo-400 focus:outline-none"
                  />
                </label>
              ))}
            </div>
            <div className={`text-sm font-bold ${effortTotal > 510 ? 'text-red-500' : 'text-gray-500'}`}>
              총합 {effortTotal} / 510
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gray-100 text-gray-600 font-semibold hover:bg-gray-200"
              >
                취소
              </button>
              <button
                onClick={handleEffortSubmit}
                className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
              >
                수정하기
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-base text-gray-500">
              {pokemonName}에게 어느 {label}을 +{amount} 올릴까요?
            </p>
            <div className="space-y-2">
              {options.map(({ key, label: optLabel }) => (
                <button
                  key={key}
                  onClick={() => onSelect(key)}
                  className="w-full py-2.5 px-4 rounded-xl border-2 border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 text-base font-semibold text-gray-700 transition-colors text-left"
                >
                  {optLabel} +{amount}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
