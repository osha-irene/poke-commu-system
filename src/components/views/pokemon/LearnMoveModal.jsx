export default function LevelUpMoveModal({
  pokemon,
  newLevel,
  learnableMoves = [],
  currentMoves = [],
  onLearn,
  onConfirm, // 호환성을 위해 추가
  onSkip
}) {
  const [selectedNewMove, setSelectedNewMove] = useState(learnableMoves[0]);
  const [selectedOldMove, setSelectedOldMove] = useState(null);

  const isFull = currentMoves.length >= 4;
  const hasSpace = currentMoves.length < 4;

  const handleConfirm = () => {
    if (isFull && !selectedOldMove) {
      alert('교체할 기술을 선택해주세요!');
      return;
    }
    
    console.log('=== 기술 교체 시작 ===');
    console.log('새 기술:', selectedNewMove);
    console.log('잊을 기술 ID:', selectedOldMove);
    console.log('현재 기술들:', currentMoves);
    console.log('=====================');
    
    // onLearn과 onConfirm 둘 다 지원
    const callback = onLearn || onConfirm;
    if (callback) {
      callback(selectedNewMove, selectedOldMove);
    } else {
      console.error('⚠️ onLearn 또는 onConfirm 콜백이 없습니다!');
      alert('오류: 기술을 배울 수 없습니다. 콘솔을 확인해주세요.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6 rounded-t-xl">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold mb-1">새로운 기술!</h2>
              <p className="text-indigo-100">
                {pokemon.nickname || pokemon.name}이(가) {newMove.name}을(를) 배우려고 합니다
              </p>
            </div>
            <button
              onClick={onCancel}
              className="text-white/80 hover:text-white"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* 새로운 기술 */}
          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-2">🆕 배울 기술</h3>
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-400 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg font-bold text-gray-800">{newMove.name}</span>
                <span
                  className="text-xs px-2 py-1 rounded font-bold text-white"
                  style={{ backgroundColor: TYPE_COLORS[newMove.type] || '#777' }}
                >
                  {newMove.type}
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-600">
                  {getCategoryIcon(newMove.category)}
                  {newMove.category}
                </span>
              </div>
              
              <div className="flex gap-4 text-sm">
                {newMove.power > 0 && (
                  <span className="text-gray-700">
                    <span className="font-semibold">위력:</span> {newMove.power}
                  </span>
                )}
                <span className="text-gray-700">
                  <span className="font-semibold">명중:</span> {newMove.accuracy}
                </span>
                <span className="text-gray-700">
                  <span className="font-semibold">PP:</span> {newMove.pp}
                </span>
              </div>

              {newMove.description && (
                <p className="text-sm text-gray-600 mt-2 border-t border-yellow-200 pt-2">
                  {newMove.description}
                </p>
              )}
            </div>
          </div>

          {/* 현재 기술 */}
          {isFull ? (
            <>
              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <AlertCircle size={20} />
                <p className="text-sm font-medium">
                  기술이 가득 찼습니다! 잊을 기술을 선택해주세요.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-2">현재 기술 (교체할 기술 선택)</h3>
                <div className="space-y-2">
                  {currentMoves.map((move) => (
                    <button
                      key={move.moveId}
                      onClick={() => setSelectedMoveToReplace(move.moveId)}
                      className={`w-full text-left border-2 rounded-lg p-3 transition-all ${
                        selectedMoveToReplace === move.moveId
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-200 hover:border-gray-400 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-gray-800">{move.name}</span>
                            <span
                              className="text-xs px-2 py-0.5 rounded font-bold text-white"
                              style={{ backgroundColor: TYPE_COLORS[move.type] || '#777' }}
                            >
                              {move.type}
                            </span>
                          </div>
                          <div className="flex gap-3 text-xs text-gray-600">
                            {move.power > 0 && <span>위력: {move.power}</span>}
                            <span>명중: {move.accuracy}</span>
                            <span>PP: {move.pp}</span>
                          </div>
                        </div>
                        {selectedMoveToReplace === move.moveId && (
                          <div className="flex-shrink-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center">
                            ✓
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                ✅ 빈 슬롯이 있어 바로 배울 수 있습니다! ({currentMoves.length}/4)
              </p>
            </div>
          )}

          {/* 버튼 */}

            <div className="flex gap-3">
            <button
                onClick={() => {
                console.log('🔘 기술 교체하기 버튼 클릭!');
                console.log('🔘 isFull:', isFull);
                console.log('🔘 selectedMoveToReplace:', selectedMoveToReplace);
                console.log('🔘 selectedNewMove:', selectedNewMove);
                handleConfirm();
                }}
                disabled={isFull && !selectedMoveToReplace}
                className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                isFull && !selectedMoveToReplace
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
            >
                {isFull ? '기술 교체하기' : '기술 배우기'}
            </button>
            <button
                onClick={() => {
                console.log('🔘 배우지 않기 버튼 클릭!');
                onCancel();
                }}
                className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300 transition-all"
            >
                배우지 않기
            </button>
            </div>
        </div>
      </div>
    </div>
  );
}