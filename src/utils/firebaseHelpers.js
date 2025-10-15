// src/utils/firebaseHelpers.js
import { db } from '../firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore';

// ==================== 회원 관련 ====================

// 모든 회원 가져오기
export const getAllMembers = async () => {
  try {
    const membersRef = collection(db, 'members');
    const snapshot = await getDocs(membersRef);
    const members = {};
    
    snapshot.forEach((doc) => {
      members[doc.id] = doc.data();
    });
    
    console.log('✅ Firebase에서 회원 데이터 로드:', Object.keys(members).length, '명');
    return members;
  } catch (error) {
    console.error('❌ 회원 데이터 로드 실패:', error);
    return {};
  }
};

// 특정 회원 가져오기
export const getMember = async (userId) => {
  try {
    const memberRef = doc(db, 'members', userId);
    const snapshot = await getDoc(memberRef);
    
    if (snapshot.exists()) {
      return snapshot.data();
    }
    return null;
  } catch (error) {
    console.error('❌ 회원 데이터 가져오기 실패:', error);
    return null;
  }
};

// 회원 저장/업데이트
export const saveMember = async (userId, memberData) => {
  try {
    const memberRef = doc(db, 'members', userId);
    await setDoc(memberRef, {
      ...memberData,
      updatedAt: serverTimestamp()
    }, { merge: true });
    
    console.log('✅ 회원 데이터 저장 완료:', userId);
    return true;
  } catch (error) {
    console.error('❌ 회원 데이터 저장 실패:', error);
    return false;
  }
};

// 회원 삭제
export const deleteMember = async (userId) => {
  try {
    const memberRef = doc(db, 'members', userId);
    await deleteDoc(memberRef);
    console.log('✅ 회원 삭제 완료:', userId);
    return true;
  } catch (error) {
    console.error('❌ 회원 삭제 실패:', error);
    return false;
  }
};

// ==================== 게임 설정 관련 ====================

// 게임 설정 가져오기 (지역, 포켓덱스 등)
export const getGameConfig = async () => {
  try {
    const configRef = doc(db, 'gameConfig', 'main');
    const snapshot = await getDoc(configRef);
    
    if (snapshot.exists()) {
      console.log('✅ 게임 설정 로드 완료');
      return snapshot.data();
    }
    return null;
  } catch (error) {
    console.error('❌ 게임 설정 로드 실패:', error);
    return null;
  }
};

// 게임 설정 저장
export const saveGameConfig = async (configData) => {
  try {
    const configRef = doc(db, 'gameConfig', 'main');
    await setDoc(configRef, {
      ...configData,
      updatedAt: serverTimestamp()
    });
    
    console.log('✅ 게임 설정 저장 완료');
    return true;
  } catch (error) {
    console.error('❌ 게임 설정 저장 실패:', error);
    return false;
  }
};

// ==================== Q&A 게시판 관련 ====================

// 모든 게시글 가져오기
export const getAllPosts = async () => {
  try {
    const postsRef = collection(db, 'qnaPosts');
    const snapshot = await getDocs(postsRef);
    const posts = [];
    
    snapshot.forEach((doc) => {
      posts.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // 최신순 정렬
    posts.sort((a, b) => b.createdAt - a.createdAt);
    
    console.log('✅ 게시글 로드 완료:', posts.length, '개');
    return posts;
  } catch (error) {
    console.error('❌ 게시글 로드 실패:', error);
    return [];
  }
};

// 게시글 생성
export const createPost = async (postData) => {
  try {
    const postRef = doc(collection(db, 'qnaPosts'));
    await setDoc(postRef, {
      ...postData,
      id: postRef.id,
      createdAt: Date.now(),
      updatedAt: serverTimestamp()
    });
    
    console.log('✅ 게시글 생성 완료:', postRef.id);
    return postRef.id;
  } catch (error) {
    console.error('❌ 게시글 생성 실패:', error);
    return null;
  }
};

// 게시글 삭제
export const deletePost = async (postId) => {
  try {
    const postRef = doc(db, 'qnaPosts', postId);
    await deleteDoc(postRef);
    console.log('✅ 게시글 삭제 완료:', postId);
    return true;
  } catch (error) {
    console.error('❌ 게시글 삭제 실패:', error);
    return false;
  }
};

// 게시글 업데이트 (댓글 추가 등)
export const updatePost = async (postId, updates) => {
  try {
    const postRef = doc(db, 'qnaPosts', postId);
    await updateDoc(postRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    
    console.log('✅ 게시글 업데이트 완료:', postId);
    return true;
  } catch (error) {
    console.error('❌ 게시글 업데이트 실패:', error);
    return false;
  }
};

// ==================== 상점 데이터 관련 ====================

// 상점 데이터 가져오기
export const getShopData = async () => {
  try {
    const shopRef = doc(db, 'gameConfig', 'shop');
    const snapshot = await getDoc(shopRef);
    
    if (snapshot.exists()) {
      console.log('✅ 상점 데이터 로드 완료');
      return snapshot.data();
    }
    return null;
  } catch (error) {
    console.error('❌ 상점 데이터 로드 실패:', error);
    return null;
  }
};

// 상점 데이터 저장
export const saveShopData = async (shopData) => {
  try {
    const shopRef = doc(db, 'gameConfig', 'shop');
    await setDoc(shopRef, {
      ...shopData,
      updatedAt: serverTimestamp()
    });
    
    console.log('✅ 상점 데이터 저장 완료');
    return true;
  } catch (error) {
    console.error('❌ 상점 데이터 저장 실패:', error);
    return false;
  }
};

// ==================== 레시피 관련 ====================

// 모든 레시피 가져오기
export const getAllRecipes = async () => {
  try {
    const recipesRef = collection(db, 'recipes');
    const snapshot = await getDocs(recipesRef);
    const recipes = [];
    
    snapshot.forEach((doc) => {
      recipes.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log('✅ 레시피 로드 완료:', recipes.length, '개');
    return recipes;
  } catch (error) {
    console.error('❌ 레시피 로드 실패:', error);
    return [];
  }
};

// 레시피 저장
export const saveRecipe = async (recipeData) => {
  try {
    const recipeRef = doc(collection(db, 'recipes'));
    await setDoc(recipeRef, {
      ...recipeData,
      id: recipeRef.id,
      createdAt: serverTimestamp()
    });
    
    console.log('✅ 레시피 저장 완료:', recipeRef.id);
    return recipeRef.id;
  } catch (error) {
    console.error('❌ 레시피 저장 실패:', error);
    return null;
  }
};

// ==================== 발견한 레시피 (유저별) ====================

// 유저별 발견 레시피 가져오기
export const getDiscoveredRecipes = async (userId) => {
  try {
    const docRef = doc(db, 'discoveredRecipes', userId);
    const snapshot = await getDoc(docRef);
    
    if (snapshot.exists()) {
      return snapshot.data().recipes || [];
    }
    return [];
  } catch (error) {
    console.error('❌ 발견 레시피 로드 실패:', error);
    return [];
  }
};

// 발견 레시피 저장
export const saveDiscoveredRecipes = async (userId, recipes) => {
  try {
    const docRef = doc(db, 'discoveredRecipes', userId);
    await setDoc(docRef, {
      recipes,
      updatedAt: serverTimestamp()
    });
    
    console.log('✅ 발견 레시피 저장 완료:', userId);
    return true;
  } catch (error) {
    console.error('❌ 발견 레시피 저장 실패:', error);
    return false;
  }
};

// ==================== 유틸리티 ====================

// 현재 타임스탬프 (밀리초)
export const getCurrentTimestamp = () => Date.now();

// 배치 저장 (여러 문서 한번에)
export const batchSaveMembers = async (membersObject) => {
  try {
    const savePromises = Object.entries(membersObject).map(([userId, data]) => 
      saveMember(userId, data)
    );
    
    await Promise.all(savePromises);
    console.log('✅ 배치 저장 완료:', Object.keys(membersObject).length, '명');
    return true;
  } catch (error) {
    console.error('❌ 배치 저장 실패:', error);
    return false;
  }
};