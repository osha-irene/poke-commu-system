// src/contexts/PokemonContext.js
import { createContext, useContext } from 'react';

// 창고 만들기
const PokemonContext = createContext();

// 창고 관리자 (Provider)
export function PokemonProvider({ children, value }) {
  return (
    <PokemonContext.Provider value={value}>
      {children}
    </PokemonContext.Provider>
  );
}

// 창고에서 꺼내 쓰는 Hook
export function usePokemonContext() {
  const context = useContext(PokemonContext);
  if (!context) {
    throw new Error('usePokemonContext는 PokemonProvider 안에서만 사용 가능합니다!');
  }
  return context;
}