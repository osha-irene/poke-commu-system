// src/components/views/admin/member/CaughtLocationModal.jsx
import React, { useState } from 'react';
import { X, MapPin } from 'lucide-react';

export default function CaughtLocationModal({ initialValue = '', regionNames = [], onConfirm, onClose }) {
  const [value, setValue] = useState(initialValue);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-lg p-4 w-full max-w-sm space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
          <h3 className="text-base font-bold flex items-center gap-2">
            <MapPin size={16} />
            만난 장소 입력
          </h3>
          <button onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-gray-500">
          장소를 입력하면 "특별한 만남" 대신 실제로 만난 장소로 기록됩니다. 비워두면 기존처럼 관리자 지급(특별한 만남)으로 처리됩니다.
        </p>

        <input
          type="text"
          list="caught-location-suggestions"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="예: 1번도로"
          className="w-full px-3 py-2 border rounded text-sm"
          autoFocus
        />
        <datalist id="caught-location-suggestions">
          {regionNames.map(name => (
            <option key={name} value={name} />
          ))}
        </datalist>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { onConfirm(''); onClose(); }}
            className="flex-1 bg-gray-100 text-gray-700 py-2 rounded font-semibold text-sm hover:bg-gray-200"
          >
            비우기
          </button>
          <button
            type="button"
            onClick={() => { onConfirm(value.trim()); onClose(); }}
            className="flex-1 bg-indigo-600 text-white py-2 rounded font-semibold text-sm hover:bg-indigo-700"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
