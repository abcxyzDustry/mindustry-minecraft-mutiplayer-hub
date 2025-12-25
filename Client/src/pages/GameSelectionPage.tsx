
import { useState } from 'react';
import { useGameMode } from '../contexts/GameModeContext';
import { useLanguage } from '../contexts/LanguageContext';

interface GameSelectionPageProps {
  onContinue: () => void;
}

export default function GameSelectionPage({ onContinue }: GameSelectionPageProps) {
  const { gameMode, setGameMode } = useGameMode();
  const { t } = useLanguage();
  const [selectedGame, setSelectedGame] = useState<'minecraft' | 'mindustry' | null>(gameMode);

  const games = [
    {
      id: 'minecraft' as const,
      name: 'Minecraft',
      icon: '🎮',
      gradient: 'from-green-500 to-emerald-600',
      description: t('roomsCommunityMaps'),
      features: ['Multiplayer Rooms', 'Community Posts', 'Maps & Mods', 'Chat with Friends']
    },
    {
      id: 'mindustry' as const,
      name: 'Mindustry',
      icon: '🏭',
      gradient: 'from-orange-500 to-amber-600',
      description: t('roomsCommunitySchematics'),
      features: ['PvP & Co-op Rooms', 'Community Forum', 'Schematics & Logic', 'Official Servers']
    },
  ];

  const handleContinue = () => {
    if (selectedGame) {
      setGameMode(selectedGame);
      onContinue();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-3">{t('selectGame')}</h1>
          <p className="text-white/60 text-lg">{t('selectYourGame')}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {games.map((game) => (
            <button
              key={game.id}
              onClick={() => setSelectedGame(game.id)}
              className={`glass-card p-8 text-left transition-all duration-300 transform hover:scale-105 ${
                selectedGame === game.id
                  ? `ring-4 ring-offset-4 ring-offset-gray-900 bg-gradient-to-br ${game.gradient} ring-white/50`
                  : 'hover:bg-white/5'
              }`}
            >
              <div className="flex items-start gap-6">
                <div
                  className={`w-20 h-20 rounded-2xl flex items-center justify-center text-4xl ${
                    selectedGame === game.id
                      ? 'bg-white/20'
                      : `bg-gradient-to-br ${game.gradient}`
                  }`}
                >
                  {game.icon}
                </div>
                
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white mb-2">{game.name}</h2>
                  <p className="text-white/70 text-sm mb-4">{game.description}</p>
                  
                  <div className="space-y-2">
                    {game.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2 text-white/60 text-sm">
                        <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedGame === game.id && (
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        <div className="text-center">
          <button
            onClick={handleContinue}
            disabled={!selectedGame}
            className={`minecraft-btn px-12 py-4 text-lg font-bold ${
              !selectedGame ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {t('continue')} →
          </button>
        </div>
      </div>
    </div>
  );
}
