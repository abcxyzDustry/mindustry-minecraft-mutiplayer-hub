import { useState, useEffect } from 'react';
import RoomList from '../components/RoomList';
import FriendList from '../components/FriendList';
import Community from '../components/Community';
import MapAddonMod from '../components/MapAddonMod';
import MindustryCommunity from '../components/MindustryCommunity';
import MindustrySchematic from '../components/MindustrySchematic';
import MindustryOfficialServers from '../components/MindustryOfficialServers';
import CreateRoomModal from '../components/CreateRoomModal';
import CreateMindustryRoomModal from '../components/CreateMindustryRoomModal';
import ProfileModal from '../components/ProfileModal';
import NotificationBell from '../components/NotificationBell';
import AdminPanel from '../components/AdminPanel';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useGameMode } from '../contexts/GameModeContext';

interface User {
  id: number;
  username: string;
  displayName: string;
  avatar?: string | null;
  bio?: string | null;
  isAdmin?: boolean;
}

interface HomePageProps {
  user: User;
  onLogout: () => void;
  ws: any;
}

export default function HomePage({ user, onLogout, ws }: HomePageProps) {
  const [activeTab, setActiveTab] = useState<'rooms' | 'community' | 'mapaddons' | 'friends' | 'officialServers'>('rooms');
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [viewingUserId, setViewingUserId] = useState<number | null>(null);
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { gameMode, gameName, gameIcon, gradientFrom, gradientTo } = useGameMode();

  useEffect(() => {
    checkAdminStatus();
  }, [user.id]);

  useEffect(() => {
    if (activeTab === 'officialServers' && gameMode !== 'mindustry') {
      setActiveTab('rooms');
    }
  }, [gameMode, activeTab]);

  const checkAdminStatus = async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setIsAdmin(data.user?.isAdmin || false);
      }
    } catch (error) {
      console.error('Failed to check admin status:', error);
    }
  };

  const handleViewProfile = (userId: number) => {
    setViewingUserId(userId);
    setShowProfile(true);
  };

  const tabs = [
    { id: 'rooms', name: t('rooms'), icon: gameIcon, gradient: `${gradientFrom} ${gradientTo}` },
    ...(gameMode === 'mindustry' ? [{ id: 'officialServers', name: 'Official', icon: '🏭', gradient: 'from-amber-500 to-orange-600' }] : []),
    { id: 'community', name: t('community'), icon: '👥', gradient: 'from-purple-500 to-pink-600' },
    { id: 'mapaddons', name: gameMode === 'minecraft' ? 'Maps/Mods' : 'Schematics/Logic', icon: gameMode === 'minecraft' ? '🗺️' : '📐', gradient: gameMode === 'minecraft' ? 'from-orange-500 to-red-600' : 'from-amber-500 to-orange-600' },
    { id: 'friends', name: t('friends'), icon: '💬', gradient: 'from-blue-500 to-cyan-600' },
  ];

  return (
    <div className="min-h-screen pb-20">
      <header className="bg-gradient-to-r from-gray-900/90 via-gray-800/90 to-gray-900/90 backdrop-blur-lg mx-4 mt-4 p-4 rounded-2xl border border-white/10 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 bg-gradient-to-br ${gradientFrom} ${gradientTo} rounded-xl flex items-center justify-center shadow-lg`}>
            <span className="text-xl">{gameIcon}</span>
          </div>
          <div 
            className="flex items-center gap-3 cursor-pointer hover:bg-white/5 p-2 rounded-lg transition-all"
            onClick={() => {
              setViewingUserId(user.id);
              setShowProfile(true);
            }}
          >
            {user.avatar ? (
              <img src={user.avatar} alt={user.displayName} className={`w-10 h-10 rounded-full object-cover ring-2 ${gameMode === 'minecraft' ? 'ring-minecraft-green' : 'ring-orange-500'}`} />
            ) : (
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-lg ${
                isAdmin ? 'bg-gradient-to-br from-red-500 to-orange-600' : `bg-gradient-to-br ${gradientFrom} ${gradientTo}`
              }`}>
                {user.displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="hidden sm:block">
              <h2 className="font-semibold text-white text-sm flex items-center gap-2">
                {user.displayName}
                {isAdmin && <span className="text-red-500 text-xs font-bold">[Admin {user.username}]</span>}
              </h2>
              <p className="text-xs text-white/60">@{user.username}</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => setLanguage(language === 'vi' ? 'en' : 'vi')}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/10"
            title={language === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
          >
            <span className="text-sm font-medium text-white">{language === 'vi' ? '🇻🇳' : '🇺🇸'}</span>
          </button>
          
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/10"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? (
              <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
          
          <NotificationBell userId={user.id} />
          
          {isAdmin && (
            <button
              onClick={() => setShowAdminPanel(true)}
              className="p-2 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-600/20 hover:from-red-500/30 hover:to-orange-600/30 transition-all border border-red-500/30"
              title="Admin Panel"
            >
              <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          )}
          
          <button
            onClick={onLogout}
            className="px-3 py-2 bg-white/10 rounded-xl text-white/70 hover:bg-white/20 transition-all border border-white/10 text-sm"
          >
            {t('logout')}
          </button>
        </div>
      </header>

      <div className="mx-4 mt-4">
        <div className="flex gap-2 mb-4 bg-black/20 p-1.5 rounded-2xl">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                activeTab === tab.id 
                  ? `bg-gradient-to-r ${tab.gradient} text-white shadow-lg` 
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span className="hidden sm:inline">{tab.name}</span>
            </button>
          ))}
        </div>

        {activeTab === 'rooms' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <span className="text-2xl">{gameIcon}</span> Danh sách phòng {gameName}
              </h3>
              <button
                onClick={() => setShowCreateRoom(true)}
                className={`bg-gradient-to-r ${gradientFrom} ${gradientTo} hover:opacity-90 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-lg transition-all`}
              >
                + Tạo phòng
              </button>
            </div>
            <RoomList userId={user.id} ws={ws} />
          </div>
        )}

        {activeTab === 'community' && (
          <div>
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <span className="text-2xl">👥</span> {gameName} Community
              </h3>
              <p className="text-white/50 text-sm mt-1">{t('shareAndConnect')}</p>
            </div>
            {gameMode === 'minecraft' ? (
              <Community userId={user.id} onViewProfile={handleViewProfile} />
            ) : (
              <MindustryCommunity userId={user.id} onViewProfile={handleViewProfile} />
            )}
          </div>
        )}

        {activeTab === 'mapaddons' && (
          <div>
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <span className="text-2xl">{gameMode === 'minecraft' ? '🗺️' : '📐'}</span> {gameMode === 'minecraft' ? 'Maps, Addons & Mods' : 'Schematics, Logic & Blueprints'}
              </h3>
              <p className="text-white/50 text-sm mt-1">
                {gameMode === 'minecraft' 
                  ? 'Chia sẻ và tải về maps, addons, mods cho Minecraft PE'
                  : 'Chia sẻ và tải về schematics, logic, blueprints cho Mindustry'}
              </p>
            </div>
            {gameMode === 'minecraft' ? (
              <MapAddonMod userId={user.id} onViewProfile={handleViewProfile} />
            ) : (
              <MindustrySchematic userId={user.id} onViewProfile={handleViewProfile} />
            )}
          </div>
        )}

        {activeTab === 'friends' && (
          <FriendList userId={user.id} ws={ws} />
        )}

        {activeTab === 'officialServers' && gameMode === 'mindustry' && (
          <MindustryOfficialServers />
        )}
      </div>

      {showCreateRoom && (
        gameMode === 'minecraft' ? (
          <CreateRoomModal
            userId={user.id}
            onClose={() => setShowCreateRoom(false)}
          />
        ) : (
          <CreateMindustryRoomModal
            userId={user.id}
            onClose={() => setShowCreateRoom(false)}
          />
        )
      )}

      {showProfile && viewingUserId && (
        <ProfileModal
          userId={viewingUserId}
          currentUserId={user.id}
          onClose={() => {
            setShowProfile(false);
            setViewingUserId(null);
          }}
        />
      )}

      {showAdminPanel && (
        <AdminPanel onClose={() => setShowAdminPanel(false)} />
      )}
    </div>
  );
}
