import { useState, useEffect, useRef } from 'react';

interface User {
  id: number;
  username: string;
  displayName: string;
  avatar?: string | null;
  bio?: string | null;
  isOnline?: boolean;
  isAdmin?: boolean;
  lastSeen?: Date;
}

interface Post {
  id: number;
  content: string;
  imageUrl: string | null;
  videoUrl: string | null;
  category: string;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
}

interface ProfileModalProps {
  userId: number;
  currentUserId: number;
  onClose: () => void;
  onViewPost?: (postId: number) => void;
}

export default function ProfileModal({ userId, currentUserId, onClose, onViewPost }: ProfileModalProps) {
  const [user, setUser] = useState<User | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [friendStatus, setFriendStatus] = useState<'none' | 'pending' | 'friends'>('none');
  const [sendingRequest, setSendingRequest] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'posts'>('info');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isOwnProfile = userId === currentUserId;

  useEffect(() => {
    fetchUser();
    fetchUserPosts();
    if (!isOwnProfile) {
      checkFriendStatus();
    }
  }, [userId]);

  const fetchUser = async () => {
    try {
      const res = await fetch(`/api/users/${userId}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setDisplayName(data.user.displayName);
        setBio(data.user.bio || '');
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPosts = async () => {
    try {
      const res = await fetch(`/api/users/${userId}/posts`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUserPosts(data.posts || []);
      }
    } catch (error) {
      console.error('Failed to fetch user posts:', error);
    }
  };

  const checkFriendStatus = async () => {
    try {
      const friendsRes = await fetch('/api/friends', { credentials: 'include' });
      if (friendsRes.ok) {
        const friendsData = await friendsRes.json();
        const isFriend = friendsData.friends?.some((f: any) => f.id === userId);
        if (isFriend) {
          setFriendStatus('friends');
          return;
        }
      }
      
      const requestsRes = await fetch('/api/friends/requests', { credentials: 'include' });
      if (requestsRes.ok) {
        const requestsData = await requestsRes.json();
        const hasPendingRequest = requestsData.requests?.some((r: any) => 
          (r.fromUserId === currentUserId && r.toUserId === userId) ||
          (r.fromUserId === userId && r.toUserId === currentUserId)
        );
        if (hasPendingRequest) {
          setFriendStatus('pending');
        }
      }
    } catch (error) {
      console.error('Failed to check friend status:', error);
    }
  };

  const handleSendFriendRequest = async () => {
    if (!user) return;
    setSendingRequest(true);
    try {
      const res = await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: user.username }),
      });
      if (res.ok) {
        setFriendStatus('pending');
      }
    } catch (error) {
      console.error('Failed to send friend request:', error);
    } finally {
      setSendingRequest(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      alert('Chỉ chấp nhận file PNG hoặc JPG');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File quá lớn. Tối đa 5MB');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const res = await fetch('/api/auth/upload-avatar', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setUser(prev => prev ? { ...prev, avatar: data.avatar } : null);
      } else {
        alert('Không thể tải ảnh lên');
      }
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      alert('Không thể tải ảnh lên');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ displayName, bio: bio || null }),
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays < 1) return 'Hôm nay';
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="glass-card w-full max-w-md p-6">
          <div className="text-center">
            <div className="w-10 h-10 border-3 border-minecraft-green border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="glass-card w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Hồ sơ</h2>
          <button onClick={onClose} className="text-white/60 hover:text-white">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col items-center">
            <div className="relative">
              {user.avatar ? (
                <img 
                  src={user.avatar} 
                  alt={user.displayName} 
                  className="w-24 h-24 rounded-full object-cover mb-3"
                  onError={(e) => {
                    console.error('Avatar load error:', user.avatar);
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-24 h-24 bg-minecraft-green/50 rounded-full flex items-center justify-center font-bold text-white text-3xl mb-3">
                  {user.displayName.charAt(0).toUpperCase()}
                </div>
              )}
              
              {isOwnProfile && isEditing && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute bottom-2 right-0 w-8 h-8 bg-minecraft-green rounded-full flex items-center justify-center hover:bg-minecraft-green/80 transition-all shadow-lg"
                >
                  {uploading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              )}
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              onChange={handleAvatarUpload}
              className="hidden"
            />

            {isOwnProfile && isEditing && (
              <p className="text-white/50 text-xs mt-1">Nhấn vào biểu tượng camera để đổi ảnh (PNG/JPG)</p>
            )}
          </div>

          {isEditing ? (
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white text-center text-xl font-bold focus:outline-none focus:border-minecraft-green"
            />
          ) : (
            <div className="text-center">
              <h3 className="text-white text-xl font-bold inline-flex items-center gap-2">
                {user.displayName}
                {user.isAdmin && (
                  <span className="text-red-500 text-sm font-bold">[Admin {user.username}]</span>
                )}
              </h3>
            </div>
          )}
          
          <p className="text-white/60 text-center text-sm">@{user.username}</p>

          {user.isOnline !== undefined && (
            <div className="flex justify-center">
              <span className={`text-xs px-3 py-1 rounded-full ${user.isOnline ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/50'}`}>
                {user.isOnline ? '🟢 Đang online' : '⚫ Offline'}
              </span>
            </div>
          )}

          <div className="flex gap-2 justify-center">
            <button
              onClick={() => setActiveTab('info')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'info'
                  ? 'bg-minecraft-green text-white'
                  : 'bg-white/10 text-white/60 hover:bg-white/20'
              }`}
            >
              Thông tin
            </button>
            <button
              onClick={() => setActiveTab('posts')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'posts'
                  ? 'bg-minecraft-green text-white'
                  : 'bg-white/10 text-white/60 hover:bg-white/20'
              }`}
            >
              Bài viết ({userPosts.length})
            </button>
          </div>

          {activeTab === 'info' ? (
            <>
              <div className="bg-white/5 p-4 rounded-lg">
                <h4 className="text-white/70 text-sm mb-2">Giới thiệu</h4>
                {isEditing ? (
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Viết vài dòng về bản thân..."
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-minecraft-green resize-none"
                    rows={3}
                  />
                ) : (
                  <p className="text-white">{user.bio || 'Chưa có giới thiệu'}</p>
                )}
              </div>

              {isOwnProfile ? (
                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 minecraft-btn disabled:opacity-50"
                      >
                        {saving ? 'Đang lưu...' : 'Lưu'}
                      </button>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          setDisplayName(user.displayName);
                          setBio(user.bio || '');
                        }}
                        className="flex-1 px-4 py-2 bg-white/10 rounded-lg text-white hover:bg-white/20"
                      >
                        Hủy
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="w-full minecraft-btn"
                    >
                      Chỉnh sửa hồ sơ
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex gap-2">
                  {friendStatus === 'none' && (
                    <button
                      onClick={handleSendFriendRequest}
                      disabled={sendingRequest}
                      className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white py-3 rounded-xl font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {sendingRequest ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Đang gửi...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                          </svg>
                          Kết bạn
                        </>
                      )}
                    </button>
                  )}
                  {friendStatus === 'pending' && (
                    <button
                      disabled
                      className="w-full bg-yellow-500/20 text-yellow-400 py-3 rounded-xl font-medium flex items-center justify-center gap-2 cursor-not-allowed"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Đã gửi lời mời
                    </button>
                  )}
                  {friendStatus === 'friends' && (
                    <button
                      disabled
                      className="w-full bg-green-500/20 text-green-400 py-3 rounded-xl font-medium flex items-center justify-center gap-2 cursor-not-allowed"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Đã là bạn bè
                    </button>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3">
              {userPosts.length === 0 ? (
                <div className="text-center py-6">
                  <div className="text-4xl mb-2">📝</div>
                  <p className="text-white/50 text-sm">Chưa có bài viết nào</p>
                </div>
              ) : (
                userPosts.map((post) => (
                  <div
                    key={post.id}
                    onClick={() => onViewPost && onViewPost(post.id)}
                    className="bg-white/5 p-3 rounded-xl hover:bg-white/10 transition-all cursor-pointer"
                  >
                    <p className="text-white text-sm line-clamp-2">{post.content}</p>
                    {(post.imageUrl || post.videoUrl) && (
                      <div className="mt-2">
                        {post.videoUrl ? (
                          <div className="w-full h-20 bg-black/30 rounded-lg flex items-center justify-center">
                            <span className="text-2xl">🎬</span>
                          </div>
                        ) : post.imageUrl ? (
                          <img src={post.imageUrl} alt="" className="w-full h-20 object-cover rounded-lg" />
                        ) : null}
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-white/40 text-xs">
                      <span>❤️ {post.likesCount}</span>
                      <span>💬 {post.commentsCount}</span>
                      <span className="ml-auto">{formatTime(post.createdAt)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
