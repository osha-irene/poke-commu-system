import React from 'react';

export default function ProfileView({ trainer, caughtCount }) {
  const completion = Math.round((caughtCount / 151) * 100);
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="flex gap-8 mb-8">
          <div 
            className="w-48 h-48 bg-indigo-500 rounded-lg flex items-center justify-center text-8xl"
            style={{
              // backgroundImage: `url(${trainer.avatarUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            👦
          </div>
          <div className="flex-1">
            <h3 className="text-3xl font-bold mb-2">{trainer.name}</h3>
            <p className="text-gray-600 text-lg mb-6">포켓몬 트레이너</p>
            <button className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
              프로필 편집
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
            <div className="text-sm text-gray-600 mb-1">포획한 포켓몬</div>
            <div className="text-4xl font-bold text-blue-600">{caughtCount}마리</div>
          </div>
          <div className="bg-green-50 rounded-lg p-6 border border-green-200">
            <div className="text-sm text-gray-600 mb-1">도감 완성도</div>
            <div className="text-4xl font-bold text-green-600">{completion}%</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
            <div className="text-sm text-gray-600 mb-1">총 산책 횟수</div>
            <div className="text-4xl font-bold text-purple-600">47회</div>
          </div>
        </div>
      </div>
    </div>
  );
}