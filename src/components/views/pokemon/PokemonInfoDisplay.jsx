// 포켓몬 정보 표시 컴포넌트 예시
const PokemonInfoDisplay = ({ pokemon }) => {
  const getGenderIcon = (gender) => {
    if (gender === 'male') return '♂';
    if (gender === 'female') return '♀';
    return '⚪';
  };
  
  const getGenderColor = (gender) => {
    if (gender === 'male') return 'text-blue-600';
    if (gender === 'female') return 'text-pink-600';
    return 'text-gray-400';
  };
  
  const getSizeColor = (rank) => {
    const colors = {
      'XXXS': 'text-purple-700 font-extrabold',
      'XXS': 'text-purple-600 font-bold',
      'XS': 'text-blue-600',
      'M': 'text-gray-600',
      'XL': 'text-orange-600',
      'XXL': 'text-red-600 font-bold',
      'XXXL': 'text-red-700 font-extrabold'
    };
    return colors[rank] || 'text-gray-600';
  };
  
  const getSizeRarity = (rank) => {
    if (rank === 'XXXS' || rank === 'XXXL') return '✨ 극희귀';
    if (rank === 'XXS' || rank === 'XXL') return '⭐ 희귀';
    if (rank === 'XS' || rank === 'XL') return '🔹 레어';
    return '일반';
  };
  
  return (
    <div className="bg-white rounded-lg p-4 shadow-lg">
      {/* 기본 정보 */}
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-xl font-bold">{pokemon.nickname || pokemon.name}</h3>
        {pokemon.gender && pokemon.gender !== 'none' && (
          <span className={`text-2xl font-bold ${getGenderColor(pokemon.gender)}`}>
            {getGenderIcon(pokemon.gender)}
          </span>
        )}
        {pokemon.isShiny && (
          <span className="text-xl">✨</span>
        )}
      </div>
      
      {/* 크기 정보 */}
      <div className="space-y-2 text-sm mb-3 bg-gray-50 rounded-lg p-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">크기 등급</span>
          <div className="flex items-center gap-2">
            <span className={`font-bold text-lg ${getSizeColor(pokemon.sizeRank)}`}>
              {pokemon.sizeRank}
            </span>
            <span className="text-xs text-gray-500">
              {getSizeRarity(pokemon.sizeRank)}
            </span>
          </div>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-600">키</span>
          <span className="font-semibold">
            {(pokemon.height / 10).toFixed(1)}m
            {pokemon.heightVariation && (
              <span className="text-xs text-gray-500 ml-1">
                ({pokemon.heightVariation}%)
              </span>
            )}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-600">몸무게</span>
          <span className="font-semibold">
            {(pokemon.weight / 10).toFixed(1)}kg
            {pokemon.weightVariation && (
              <span className="text-xs text-gray-500 ml-1">
                ({pokemon.weightVariation}%)
              </span>
            )}
          </span>
        </div>
      </div>
      
      {/* 특성 */}
      <div className={`rounded-lg p-3 border-2 ${
        pokemon.isHiddenAbility 
          ? 'bg-yellow-50 border-yellow-400' 
          : 'bg-indigo-50 border-indigo-200'
      }`}>
        <div className="text-xs text-gray-600 mb-1 flex items-center gap-1">
          특성
          {pokemon.isHiddenAbility && (
            <span className="text-yellow-600 font-bold">⭐ 숨겨진 특성</span>
          )}
        </div>
        <div className={`font-bold ${
          pokemon.isHiddenAbility ? 'text-yellow-700' : 'text-indigo-700'
        }`}>
          {pokemon.ability || '없음'}
        </div>
      </div>
    </div>
  );
};