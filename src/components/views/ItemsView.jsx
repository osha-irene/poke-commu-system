
import React, { useState } from 'react';
import { ShoppingCart } from 'lucide-react';

export default function ItemsView({ items = [], allItems = [], isSuperAdmin = false, onSellItem }) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sellMode, setSellMode] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [sellCount, setSellCount] = useState(1);

  // items.json에서 상세 정보 가져오기
  const getItemDetails = (item) => {
    const itemData = allItems.find(i => 
      i.id === item.itemId || 
      i.name === item.name || 
      i.nameEn?.toLowerCase().includes(item.name.toLowerCase())
    );
    
    return {
      name: item.name,
      description: itemData?.effect?.replace(/\n/g, ' ') || '유용한 아이템',
      imageUrl: item.imageUrl || itemData?.spriteUrl || '/images/items/default.png',
      cost: itemData?.cost || 0,
      sellPrice: itemData?.sellPrice || 0,
      category: itemData?.category || 'misc',
      canSell: itemData?.canSell ?? true
    };
  };

  // 카테고리 정의
  const categories = [
    { id: 'all', name: '전체', icon: '📦', color: 'bg-gray-100 text-gray-700' },
    { id: 'ball', name: '포획', icon: '⚾', color: 'bg-red-100 text-red-700' },
    { id: 'medicine', name: '회복', icon: '💊', color: 'bg-green-100 text-green-700' },
    { id: 'vitamin', name: '영양', icon: '💪', color: 'bg-purple-100 text-purple-700' },
    { id: 'berry', name: '나무열매', icon: '🍇', color: 'bg-pink-100 text-pink-700' },
    { id: 'battle', name: '배틀', icon: '⚔️', color: 'bg-orange-100 text-orange-700' },
    { id: 'key', name: '중요', icon: '🔑', color: 'bg-yellow-100 text-yellow-700' },
    { id: 'misc', name: '기타', icon: '✨', color: 'bg-blue-100 text-blue-700' }
  ];

  // 카테고리별 색상
  const getCategoryColor = (category) => {
    if (category?.includes('ball')) return 'bg-red-50 border-red-200';
    if (category?.includes('medicine')) return 'bg-green-50 border-green-200';
    if (category?.includes('vitamin')) return 'bg-purple-50 border-purple-200';
    if (category?.includes('berry')) return 'bg-pink-50 border-pink-200';
    if (category?.includes('battle')) return 'bg-orange-50 border-orange-200';
    if (category?.includes('key')) return 'bg-yellow-50 border-yellow-200';
    return 'bg-gray-50 border-gray-200';
  };

  const getCategoryBadge = (category) => {
    if (category?.includes('ball')) return { text: '포획', color: 'bg-red-100 text-red-700' };
    if (category?.includes('medicine')) return { text: '회복', color: 'bg-green-100 text-green-700' };
    if (category?.includes('vitamin')) return { text: '영양', color: 'bg-purple-100 text-purple-700' };
    if (category?.includes('berry')) return { text: '나무열매', color: 'bg-pink-100 text-pink-700' };
    if (category?.includes('battle')) return { text: '배틀', color: 'bg-orange-100 text-orange-700' };
    if (category?.includes('key')) return { text: '중요', color: 'bg-yellow-100 text-yellow-700' };
    return { text: '기타', color: 'bg-gray-100 text-gray-700' };
  };

  // 카테고리별 필터링
  const filteredItems = items.filter(item => {
    if (selectedCategory === 'all') return true;
    const details = getItemDetails(item);
    return details.category?.includes(selectedCategory);
  });

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-800">보유 아이템</h3>
            {isSuperAdmin && (
              <p className="text-sm text-yellow-600 font-semibold mt-1">
                ⭐ 슈퍼 관리자: 아이템 무한 사용 가능
              </p>
            )}
          </div>
          <div className="text-sm text-gray-500">
            총 {items.reduce((sum, item) => sum + item.count, 0)}개
          </div>
        </div>
        
        <div className="space-y-3">
          {items.map((item, i) => {
            const details = getItemDetails(item);
            const categoryColor = getCategoryColor(details.category);
            const badge = getCategoryBadge(details.category);
            
            return (
              <div 
                key={i} 
                className={`flex items-center justify-between rounded-lg p-5 border hover:shadow-md transition-all ${categoryColor}`}
              >
                <div className="flex items-center gap-4 flex-1">
                  {/* 아이템 이미지 */}
                  <div 
                    className="w-20 h-20 flex-shrink-0 bg-white rounded-lg p-2 border border-gray-200 flex items-center justify-center"
                  >
                    <img 
                      src={details.imageUrl}
                      alt={details.name}
                      className="w-15 h-15"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="font-bold text-lg text-gray-800">{details.name}</div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${badge.color}`}>
                        {badge.text}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 line-clamp-2">{details.description}</div>
                    {details.cost > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        💰 가격: ₽{details.cost.toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="text-3xl font-bold text-indigo-600 ml-4">
                  {isSuperAdmin ? '∞' : `×${item.count}`}
                </div>
              </div>
            );
          })}
          
          {items.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <div className="text-6xl mb-4">🎒</div>
              <p>보유한 아이템이 없습니다</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}