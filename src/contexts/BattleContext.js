import React, { createContext, useContext } from 'react';

const BattleContext = createContext();

export function BattleProvider({ children, value }) {
  return <BattleContext.Provider value={value}>{children}</BattleContext.Provider>;
}

export function useBattleContext() {
  const context = useContext(BattleContext);
  if (!context) {
    throw new Error('useBattleContext must be used within BattleProvider');
  }
  return context;
}