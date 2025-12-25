import { useState } from 'react';
import { useGameMode } from '../contexts/GameModeContext';

export default function GameModeSwitcher() {
  const { gameMode, setGameMode, gameName, gameIcon } = useGameMode();
  const [showMenu, setShowMenu] = useState(false);

  const games = [
    { id: 'minecraft' as const, name: 'Minecraft', icon: '🎮', gradient: 'from-green-500 to-emerald-600' },
    { id: 'mindustry' as const, name: 'Mindustry', icon: '🏭', gradient: 'from-orange-500 to-amber-600' },
  ];

  return (
    <>
      <button
        onClick={() => setShowMenu(true)}
        className={`fixed bottom-4 left-4 z-40 w-14 h-14 rounded-full shadow-2xl transition-all hover:scale-110 flex items-center justify-center bg-gradient-to-br ${
          gameMode === 'minecraft' ? 'from-green-500 to-emerald-600' : 'from-orange-500 to-amber-600'
        } border-2 border-white/20`}
        title={`Đang chơi: ${gameName}`}
      >
        <span className="text-2xl">{gameIcon}</span>
      </button>

      {showMenu && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end justify-center z-50 p-4">
          <div 
            className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl w-full max-w-md border border-white/10 overflow-hidden animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-white/10">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">Chọn Game</h3>
                <button 
                  onClick={() => setShowMenu(false)}
                  className="text-white/60 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>
              <p className="text-white/50 text-sm mt-1">Chuyển đổi giữa các game multiplayer hub</p>
            </div>

            <div className="p-4 space-y-3">
              {games.map((game) => (
                <button
                  key={game.id}
                  onClick={() => {
                    setGameMode(game.id);
                    setShowMenu(false);
                  }}
                  className={`w-full p-4 rounded-xl flex items-center gap-4 transition-all ${
                    gameMode === game.id
                      ? `bg-gradient-to-r ${game.gradient} shadow-lg`
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                    gameMode === game.id ? 'bg-white/20' : `bg-gradient-to-r ${game.gradient}`
                  }`}>
                    <span className="text-3xl">{game.icon}</span>
                  </div>
                  <div className="flex-1 text-left">
                    <h4 className="font-bold text-white text-lg">{game.name}</h4>
                    <p className="text-white/70 text-sm">
                      {game.id === 'minecraft' ? 'Phòng chơi, Cộng đồng, Maps/Mods' : 'Phòng chơi, Cộng đồng, Schematic/Logic/Map'}
                    </p>
                  </div>
                  {gameMode === game.id && (
                    <div className="w-6 h-6 rounded-full bg-white/30 flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>

            <div className="p-4 border-t border-white/10 bg-white/5">
              <p className="text-white/40 text-xs text-center">
                💡 Mỗi game có phòng chơi, cộng đồng và nội dung riêng biệt
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
