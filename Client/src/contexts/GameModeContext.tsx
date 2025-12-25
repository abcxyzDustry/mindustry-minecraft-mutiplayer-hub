import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type GameMode = 'minecraft' | 'mindustry';

interface GameModeContextType {
  gameMode: GameMode;
  setGameMode: (mode: GameMode) => void;
  toggleGameMode: () => void;
  gameName: string;
  gameIcon: string;
  primaryColor: string;
  gradientFrom: string;
  gradientTo: string;
}

const GameModeContext = createContext<GameModeContextType | undefined>(undefined);

const GAME_CONFIG = {
  minecraft: {
    name: 'Minecraft',
    icon: '🎮',
    primaryColor: 'minecraft-green',
    gradientFrom: 'from-green-500',
    gradientTo: 'to-emerald-600',
  },
  mindustry: {
    name: 'Mindustry',
    icon: '🏭',
    primaryColor: 'orange-500',
    gradientFrom: 'from-orange-500',
    gradientTo: 'to-amber-600',
  },
};

export function GameModeProvider({ children }: { children: ReactNode }) {
  const [gameMode, setGameMode] = useState<GameMode>('minecraft');

  useEffect(() => {
    const saved = localStorage.getItem('gameMode') as GameMode;
    if (saved && (saved === 'minecraft' || saved === 'mindustry')) {
      setGameMode(saved);
    }
  }, []);

  const handleSetGameMode = (mode: GameMode) => {
    setGameMode(mode);
    localStorage.setItem('gameMode', mode);
  };

  const toggleGameMode = () => {
    const newMode = gameMode === 'minecraft' ? 'mindustry' : 'minecraft';
    handleSetGameMode(newMode);
  };

  const config = GAME_CONFIG[gameMode];

  return (
    <GameModeContext.Provider
      value={{
        gameMode,
        setGameMode: handleSetGameMode,
        toggleGameMode,
        gameName: config.name,
        gameIcon: config.icon,
        primaryColor: config.primaryColor,
        gradientFrom: config.gradientFrom,
        gradientTo: config.gradientTo,
      }}
    >
      {children}
    </GameModeContext.Provider>
  );
}

export function useGameMode() {
  const context = useContext(GameModeContext);
  if (!context) {
    throw new Error('useGameMode must be used within GameModeProvider');
  }
  return context;
}
