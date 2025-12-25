import { useState, useEffect } from 'react';

interface DatingProfile {
  id: number;
  userId: number;
  displayName: string;
  age: number;
  gender: string;
  interests: string;
  lookingFor: string;
  bio: string | null;
  userAvatar: string | null;
  isOnline: boolean;
}

interface DatingProps {
  userId: number;
  onStartChat?: (targetUserId: number) => void;
}

export default function Dating({ userId, onStartChat }: DatingProps) {
  const [myProfile, setMyProfile] = useState<DatingProfile | null>(null);
  const [profiles, setProfiles] = useState<DatingProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<DatingProfile | null>(null);
  const [matching, setMatching] = useState(false);
  const [matchResult, setMatchResult] = useState<DatingProfile | null>(null);

  const [formData, setFormData] = useState({
    displayName: '',
    age: 18,
    gender: 'male',
    interests: '',
    lookingFor: '',
    bio: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [myProfileRes, profilesRes] = await Promise.all([
        fetch('/api/dating/my-profile', { credentials: 'include' }),
        fetch('/api/dating/profiles', { credentials: 'include' })
      ]);

      if (myProfileRes.ok) {
        const data = await myProfileRes.json();
        setMyProfile(data.profile);
      }

      if (profilesRes.ok) {
        const data = await profilesRes.json();
        setProfiles(data.profiles || []);
      }
    } catch (error) {
      console.error('Failed to fetch dating data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/dating/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        const data = await res.json();
        setMyProfile(data.profile);
        setShowCreateForm(false);
        fetchData();
      }
    } catch (error) {
      console.error('Failed to create dating profile:', error);
    }
  };

  const handleRandomMatch = async () => {
    setMatching(true);
    setMatchResult(null);
    try {
      const res = await fetch('/api/dating/random-match', {
        method: 'POST',
        credentials: 'include'
      });

      if (res.ok) {
        const data = await res.json();
        if (data.match) {
          setMatchResult(data.match);
        } else {
          alert('Không tìm thấy ai phù hợp vào lúc này. Hãy thử lại sau!');
        }
      }
    } catch (error) {
      console.error('Failed to random match:', error);
    } finally {
      setMatching(false);
    }
  };

  const handleChatNow = (targetUserId: number) => {
    if (onStartChat) {
      onStartChat(targetUserId);
    }
  };

  const getGenderLabel = (gender: string) => {
    switch (gender) {
      case 'male': return 'Nam';
      case 'female': return 'Nữ';
      default: return 'Khác';
    }
  };

  const getGenderIcon = (gender: string) => {
    switch (gender) {
      case 'male': return '♂️';
      case 'female': return '♀️';
      default: return '⚧️';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!myProfile && !showCreateForm) {
    return (
      <div className="text-center py-10">
        <div className="text-6xl mb-4">💕</div>
        <h2 className="text-2xl font-bold text-white mb-2">Hẹn hò</h2>
        <p className="text-white/60 mb-6">Tạo hồ sơ hẹn hò để tìm kiếm người phù hợp với bạn</p>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl font-medium transition-all shadow-lg"
        >
          Tạo hồ sơ hẹn hò
        </button>
      </div>
    );
  }

  if (showCreateForm) {
    return (
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Tạo hồ sơ hẹn hò</h2>
          <button
            onClick={() => setShowCreateForm(false)}
            className="text-white/60 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleCreateProfile} className="space-y-4">
          <div>
            <label className="block text-white/70 text-sm mb-1">Tên hiển thị</label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              placeholder="Tên của bạn"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-pink-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-white/70 text-sm mb-1">Tuổi</label>
              <input
                type="number"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || 18 })}
                min="18"
                max="100"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-pink-500"
                required
              />
            </div>
            <div>
              <label className="block text-white/70 text-sm mb-1">Giới tính</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-pink-500"
              >
                <option value="male">Nam</option>
                <option value="female">Nữ</option>
                <option value="other">Khác</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-white/70 text-sm mb-1">Sở thích</label>
            <input
              type="text"
              value={formData.interests}
              onChange={(e) => setFormData({ ...formData, interests: e.target.value })}
              placeholder="VD: Minecraft, chơi game, đọc sách..."
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-pink-500"
              required
            />
          </div>

          <div>
            <label className="block text-white/70 text-sm mb-1">Muốn tìm người như thế nào?</label>
            <input
              type="text"
              value={formData.lookingFor}
              onChange={(e) => setFormData({ ...formData, lookingFor: e.target.value })}
              placeholder="VD: Người vui vẻ, thân thiện, thích chơi game..."
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-pink-500"
              required
            />
          </div>

          <div>
            <label className="block text-white/70 text-sm mb-1">Giới thiệu bản thân (tùy chọn)</label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Viết vài dòng về bản thân..."
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-pink-500 resize-none"
              rows={3}
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl font-medium transition-all"
          >
            Tạo hồ sơ
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          💕 Hẹn hò
        </h2>
        <button
          onClick={handleRandomMatch}
          disabled={matching}
          className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-medium transition-all flex items-center gap-2 disabled:opacity-50"
        >
          {matching ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Đang tìm...
            </>
          ) : (
            <>
              🎲 Match ngẫu nhiên
            </>
          )}
        </button>
      </div>

      {matchResult && (
        <div className="glass-card p-6 border-2 border-pink-500/50 rounded-2xl bg-gradient-to-br from-pink-500/10 to-purple-500/10">
          <div className="text-center mb-4">
            <span className="text-3xl">🎉</span>
            <h3 className="text-xl font-bold text-white mt-2">Match thành công!</h3>
          </div>
          <div className="flex items-center gap-4">
            {matchResult.userAvatar ? (
              <img src={matchResult.userAvatar} alt="" className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white text-2xl font-bold">
                {matchResult.displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <h4 className="font-bold text-white text-lg">{matchResult.displayName}</h4>
              <p className="text-white/60 text-sm">{matchResult.age} tuổi • {getGenderIcon(matchResult.gender)} {getGenderLabel(matchResult.gender)}</p>
            </div>
            <button
              onClick={() => {
                handleChatNow(matchResult.userId);
                setMatchResult(null);
              }}
              className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium"
            >
              Chat ngay
            </button>
          </div>
        </div>
      )}

      {myProfile && (
        <div className="glass-card p-4 rounded-2xl border border-pink-500/30">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-sm text-pink-400 font-medium">Hồ sơ của bạn</span>
          </div>
          <div className="flex items-center gap-3">
            {myProfile.userAvatar ? (
              <img src={myProfile.userAvatar} alt="" className="w-12 h-12 rounded-full object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white font-bold">
                {myProfile.displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h4 className="font-medium text-white">{myProfile.displayName}</h4>
              <p className="text-white/60 text-sm">{myProfile.age} tuổi • {getGenderIcon(myProfile.gender)} {getGenderLabel(myProfile.gender)}</p>
            </div>
          </div>
          <div className="mt-3 space-y-1">
            <p className="text-white/70 text-sm"><span className="text-pink-400">Sở thích:</span> {myProfile.interests}</p>
            <p className="text-white/70 text-sm"><span className="text-pink-400">Tìm kiếm:</span> {myProfile.lookingFor}</p>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-white/70 text-sm mb-3">Người đang tìm kiếm ({profiles.length})</h3>
        {profiles.length === 0 ? (
          <div className="text-center py-10 glass-card rounded-2xl">
            <div className="text-4xl mb-2">😢</div>
            <p className="text-white/50">Chưa có ai đăng ký hẹn hò</p>
          </div>
        ) : (
          <div className="space-y-3">
            {profiles.map((profile) => (
              <div
                key={profile.id}
                className="glass-card p-4 rounded-2xl hover:bg-white/10 transition-all cursor-pointer"
                onClick={() => setSelectedProfile(profile)}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    {profile.userAvatar ? (
                      <img src={profile.userAvatar} alt="" className="w-14 h-14 rounded-full object-cover" />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white text-xl font-bold">
                        {profile.displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-900 ${
                      profile.isOnline ? 'bg-green-500' : 'bg-gray-500'
                    }`}></div>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-white">{profile.displayName}</h4>
                    <p className="text-white/60 text-sm">{profile.age} tuổi • {getGenderIcon(profile.gender)} {getGenderLabel(profile.gender)}</p>
                    <p className="text-white/40 text-xs mt-1 line-clamp-1">{profile.interests}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleChatNow(profile.userId);
                    }}
                    className="px-3 py-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl text-sm font-medium transition-all"
                  >
                    Chat
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedProfile && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 w-full max-w-md border border-white/10">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Hồ sơ hẹn hò</h3>
              <button
                onClick={() => setSelectedProfile(null)}
                className="text-white/60 hover:text-white text-2xl"
              >
                &times;
              </button>
            </div>

            <div className="text-center mb-6">
              {selectedProfile.userAvatar ? (
                <img src={selectedProfile.userAvatar} alt="" className="w-24 h-24 rounded-full object-cover mx-auto mb-3" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white text-3xl font-bold mx-auto mb-3">
                  {selectedProfile.displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <h4 className="text-xl font-bold text-white">{selectedProfile.displayName}</h4>
              <p className="text-white/60">{selectedProfile.age} tuổi • {getGenderIcon(selectedProfile.gender)} {getGenderLabel(selectedProfile.gender)}</p>
            </div>

            <div className="space-y-4">
              <div className="bg-white/5 rounded-xl p-4">
                <h5 className="text-pink-400 text-sm font-medium mb-1">Sở thích</h5>
                <p className="text-white">{selectedProfile.interests}</p>
              </div>

              <div className="bg-white/5 rounded-xl p-4">
                <h5 className="text-pink-400 text-sm font-medium mb-1">Muốn tìm</h5>
                <p className="text-white">{selectedProfile.lookingFor}</p>
              </div>

              {selectedProfile.bio && (
                <div className="bg-white/5 rounded-xl p-4">
                  <h5 className="text-pink-400 text-sm font-medium mb-1">Giới thiệu</h5>
                  <p className="text-white">{selectedProfile.bio}</p>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                handleChatNow(selectedProfile.userId);
                setSelectedProfile(null);
              }}
              className="w-full mt-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Chat ngay
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
