import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface AuthPageProps {
  onLogin: (username: string, password: string) => Promise<any>;
  onRegister: (username: string, password: string, displayName: string) => Promise<any>;
}

export default function AuthPage({ onLogin, onRegister }: AuthPageProps) {
  const { t } = useLanguage();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await onLogin(username, password);
      } else {
        await onRegister(username, password, displayName || username);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-card w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-minecraft-green rounded-2xl flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-12 h-12">
              <rect x="20" y="20" width="25" height="25" fill="#3D5C2E"/>
              <rect x="55" y="20" width="25" height="25" fill="#3D5C2E"/>
              <rect x="20" y="55" width="25" height="25" fill="#3D5C2E"/>
              <rect x="55" y="55" width="25" height="25" fill="#3D5C2E"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Mindustry & Minecraft Hub</h1>
          <p className="text-white/60 mt-2">{t('playWithFriends')}</p>
        </div>

        <div className="flex mb-6">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-3 rounded-l-lg font-medium transition-all ${
              isLogin ? 'bg-minecraft-green text-white' : 'bg-white/10 text-white/60'
            }`}
          >
            {t('login')}
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-3 rounded-r-lg font-medium transition-all ${
              !isLogin ? 'bg-minecraft-green text-white' : 'bg-white/10 text-white/60'
            }`}
          >
            {t('register')}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-white/70 text-sm mb-2">{t('username')}</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-minecraft-green"
              placeholder={t('enterUsername')}
              autoComplete="username"
              required
            />
          </div>

          {!isLogin && (
            <div>
              <label className="block text-white/70 text-sm mb-2">{t('displayName')}</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-minecraft-green"
                placeholder={t('yourNameSeen')}
              />
            </div>
          )}

          <div>
            <label className="block text-white/70 text-sm mb-2">{t('password')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-minecraft-green"
              placeholder={t('enterPassword')}
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="minecraft-btn w-full disabled:opacity-50"
          >
            {loading ? t('processing') : (isLogin ? t('login') : t('register'))}
          </button>
        </form>
      </div>
    </div>
  );
}
