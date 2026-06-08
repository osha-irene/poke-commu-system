// src/hooks/game/useRecipes.js
// 요리 시스템

import { useState, useEffect } from 'react';
import { ref, get, set } from 'firebase/database';
import { database } from '../../firebase';
import recipesData from '../../data/recipes.json';

export const useRecipes = (currentUser, updateCurrentUser) => {
  const [recipes, setRecipes] = useState([]);
  const [discoveredRecipes, setDiscoveredRecipes] = useState({});

  // Firebase에서 레시피 데이터 로드
  useEffect(() => {
    const loadRecipes = async () => {
      try {
        const recipesRef = ref(database, 'gameData/recipes');
        const snapshot = await get(recipesRef);
        
        if (snapshot.exists()) {
          setRecipes(snapshot.val());
        } else {
          // 초기 데이터 설정
          const allRecipes = [
            ...(recipesData.recipes || []),
            ...(recipesData.statBasedRecipes || [])
          ];
          await set(recipesRef, allRecipes);
          setRecipes(allRecipes);
        }
      } catch (error) {
        console.error('레시피 로드 실패:', error);
        // 폴백: JSON 파일 사용
        const allRecipes = [
          ...(recipesData.recipes || []),
          ...(recipesData.statBasedRecipes || [])
        ];
        setRecipes(allRecipes);
      }
    };

    const loadDiscoveredRecipes = async () => {
      try {
        const discoveredRef = ref(database, 'gameData/discoveredRecipes');
        const snapshot = await get(discoveredRef);
        
        if (snapshot.exists()) {
          setDiscoveredRecipes(snapshot.val());
        }
      } catch (error) {
        console.error('발견된 레시피 로드 실패:', error);
      }
    };

    loadRecipes();
    loadDiscoveredRecipes();
  }, []);

  // 레시피 생성 (관리자)
  const createRecipe = async (recipeData) => {
    if (!currentUser?.isAdmin) return false;
    
    const newRecipes = [...recipes, recipeData];
    setRecipes(newRecipes);
    
    try {
      const recipesRef = ref(database, 'gameData/recipes');
      await set(recipesRef, newRecipes);
      alert(`✅ 레시피 "${recipeData.name}"이(가) 등록되었습니다!`);
      return true;
    } catch (error) {
      console.error('레시피 저장 실패:', error);
      alert('레시피 저장 중 오류가 발생했습니다.');
      return false;
    }
  };

  // 레시피 삭제 (관리자)
  const deleteRecipe = async (recipeId) => {
    if (!currentUser?.isAdmin) return false;
    
    const updatedRecipes = recipes.filter(recipe => recipe.id !== recipeId);
    setRecipes(updatedRecipes);
    
    try {
      const recipesRef = ref(database, 'gameData/recipes');
      await set(recipesRef, updatedRecipes);
      return true;
    } catch (error) {
      console.error('레시피 삭제 실패:', error);
      return false;
    }
  };

  // 레시피 발견
  const discoverRecipe = async (recipeId) => {
    if (!currentUser) return false;
    
    const userDiscovered = discoveredRecipes[currentUser.id] || [];
    
    if (!userDiscovered.includes(recipeId)) {
      const updated = {
        ...discoveredRecipes,
        [currentUser.id]: [...userDiscovered, recipeId]
      };
      setDiscoveredRecipes(updated);
      
      try {
        const discoveredRef = ref(database, 'gameData/discoveredRecipes');
        await set(discoveredRef, updated);
      } catch (error) {
        console.error('발견된 레시피 저장 실패:', error);
      }
      
      return true;
    }
    return false;
  };

  // 요리하기
  const cookRecipe = (recipe, usedIngredients) => {
    if (!currentUser) return false;
    
    console.log('🍳 요리 시작:', recipe.name);
    console.log('📦 사용 재료:', usedIngredients);
    
    // 재료 확인
    const hasAllIngredients = usedIngredients.every(ing => {
      const userItem = currentUser.inventory.find(i => i.name === ing.name);
      return userItem && userItem.count >= ing.count;
    });
    
    if (!hasAllIngredients) {
      alert('재료가 부족합니다!');
      return false;
    }
    
    // 재료 소모
    let newInventory = [...currentUser.inventory];
    usedIngredients.forEach(ing => {
      newInventory = newInventory.map(item => 
        item.name === ing.name 
          ? { ...item, count: item.count - ing.count }
          : item
      ).filter(item => item.count > 0);
    });
    
    // 결과물 추가
    const resultItem = recipe.result;
    const existingResult = newInventory.find(i => i.name === resultItem.name);
    
    if (existingResult) {
      newInventory = newInventory.map(item =>
        item.name === resultItem.name
          ? { ...item, count: item.count + 1 }
          : item
      );
    } else {
      newInventory.push({
        itemId: `cooked_${Date.now()}`,
        name: resultItem.name,
        count: 1,
        imageUrl: resultItem.spriteUrl || '/images/items/default.png',
        pocket: resultItem.pocket,
        effect: resultItem.effect,
        friendshipBoost: resultItem.friendshipBoost || 0,
        conditionBoost: resultItem.conditionBoost || {},
        canSell: true,
        canUse: true,
        isCooked: true
      });
    }
    
    const cookedAt = Date.now();
    const cookingHistoryEntry = {
      id: `cooked_${cookedAt}`,
      itemName: resultItem.name,
      imageUrl: resultItem.spriteUrl || '/images/items/default.png',
      recipeId: recipe.id,
      recipeName: recipe.name,
      cookedAt
    };

    updateCurrentUser({
      inventory: newInventory,
      cookingHistory: [
        cookingHistoryEntry,
        ...((currentUser.cookingHistory || []).filter(Boolean))
      ].slice(0, 10)
    });
    
    // 레시피 발견 처리
    const isNewRecipe = discoverRecipe(recipe.id);
    
    if (isNewRecipe) {
      alert(`🎉 새로운 레시피를 발견했습니다!\n\n"${recipe.name}"이(가) 레시피 도감에 등록되었습니다.`);
    } else {
      alert(`✅ ${resultItem.name}을(를) 만들었습니다!`);
    }
    
    return true;
  };

  // 재료 스탯 업데이트 (추후 구현)
  const updateIngredientStats = (ingredientName, stats) => {
    console.log('재료 스탯 업데이트:', ingredientName, stats);
  };

  return {
    recipes,
    discoveredRecipes: discoveredRecipes[currentUser?.id] || [],
    createRecipe,
    deleteRecipe,
    discoverRecipe,
    cookRecipe,
    updateIngredientStats
  };
};

export default useRecipes;