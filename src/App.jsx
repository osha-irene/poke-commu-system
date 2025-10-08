import React from 'react';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import MapView from './components/views/MapView';
import PokedexView from './components/views/PokedexView';
import PokemonView from './components/views/PokemonView';
import ItemsView from './components/views/ItemsView';
import ProfileView from './components/views/ProfileView';
import AdminView from './components/views/AdminView';
import EncounterModal from './components/modals/EncounterModal';
import useGameState from './hooks/useGameState';

export default function App() {
  const {
    currentTab,
    setCurrentTab,
    isAdmin,
    setIsAdmin,
    trainer,
    caughtPokemon,
    items,
    encounterPokemon,
    handleRegionClick,
    handleCloseEncounter,
    handleCatchSuccess
  } = useGameState();

  return (
    <div className="h-screen flex bg-gray-50">
      <Sidebar 
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        isAdmin={isAdmin}
        setIsAdmin={setIsAdmin}
        trainer={trainer}
      />

      <div className="flex-1 flex flex-col">
        <Header currentTab={currentTab} trainer={trainer} />

        <main className="flex-1 overflow-auto p-8">
          {currentTab === 'map' && <MapView onRegionClick={handleRegionClick} />}
          {currentTab === 'pokedex' && <PokedexView caughtPokemon={caughtPokemon} />}
          {currentTab === 'pokemon' && <PokemonView caughtPokemon={caughtPokemon} />}
          {currentTab === 'items' && <ItemsView items={items} />}
          {currentTab === 'profile' && <ProfileView trainer={trainer} caughtCount={caughtPokemon.length} />}
          {currentTab === 'admin' && <AdminView />}
        </main>
      </div>

      {encounterPokemon && (
        <EncounterModal 
          pokemon={encounterPokemon} 
          onClose={handleCloseEncounter}
          onCatchSuccess={handleCatchSuccess}
          items={items}
        />
      )}
    </div>
  );
}