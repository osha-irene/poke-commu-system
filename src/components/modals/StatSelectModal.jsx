import React from 'react';
import { X } from 'lucide-react';

const CONDITION_OPTIONS = [
  { key: 'elegance', label: '우아함' },
  { key: 'beauty',   label: '아름다움' },
  { key: 'cuteness', label: '귀여움' },
  { key: 'intelligence', label: '영리함' },
  { key: 'strength', label: '강인함' },
];

const EV_OPTIONS = [
  { key: 'hp',             label: 'HP' },
  { key: 'attack',         label: '공격' },
  { key: 'defense',        label: '방어' },
  { key: 'specialAttack',  label: '특수공격' },
  { key: 'specialDefense', label: '특수방어' },
  { key: 'speed',          label: '스피드' },
];

export default function StatSelectModal({ type, amount, pokemonName, onSelect, onClose }) {
  const isCondition = type === 'conditionSelect';
  const options = isCondition ? CONDITION_OPTIONS : EV_OPTIONS;
  const label = isCondition ? '컨디션' : '노력치';

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
          <h3 className="font-bold text-gray-800 text-base">
            {label} 항목 선택
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>
        <p className="text-sm text-gray-500">
          {pokemonName}에게 어느 {label}을 +{amount} 올릴까요?
        </p>
        <div className="space-y-2">
          {options.map(({ key, label: optLabel }) => (
            <button
              key={key}
              onClick={() => onSelect(key)}
              className="w-full py-2.5 px-4 rounded-xl border-2 border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 text-sm font-semibold text-gray-700 transition-colors text-left"
            >
              {optLabel} +{amount}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
