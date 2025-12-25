import { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { useWebSocket } from './hooks/useWebSocket';
import { useGameMode } from './contexts/GameModeContext';
import AuthPage from './pages/AuthPage';
import GameSelectionPage from './pages/GameSelectionPage';
import HomePage from './pages/HomePage';
import ChatBubble from './components/ChatBubble';
import MusicPlayer from './components/MusicPlayer';
import GameModeSwitcher from './components/GameModeSwitcher';

function App() {
  const { user, loading, login, register, logout } = useAuth();
  const { gameMode } = useGameMode();
  const ws = useWebSocket(user?.id || null);
  const [showGameSelection, setShowGameSelection] = useState(false);

  // Check if user needs to select a game (first time login)
  useEffect(() => {
    if (user && !gameMode) {
      setShowGameSelection(true);
    }
  }, [user, gameMode]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-minecraft-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/70">Đang kết nối...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage onLogin={login} onRegister={register} />;
  }

  if (showGameSelection) {
    return <GameSelectionPage onContinue={() => setShowGameSelection(false)} />;
  }

  return (
    <div className="min-h-screen">
      <HomePage user={user} onLogout={logout} ws={ws} />
      <ChatBubble user={user} ws={ws} />
      <MusicPlayer />
      <GameModeSwitcher />
    </div>
  );
}

export default App;
