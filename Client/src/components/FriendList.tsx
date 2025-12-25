import { useState, useEffect } from 'react';
import ProfileModal from './ProfileModal';
import Dating from './Dating';

interface Friend {
  id: number;
  username: string;
  displayName: string;
  isOnline: boolean;
  avatar?: string | null;
  isAdmin?: boolean;
}

interface FriendRequest {
  id: number;
  userId: number;
  friendId: number;
  status: string;
}

interface AllUser {
  id: number;
  username: string;
  displayName: string;
  isOnline: boolean;
  avatar?: string | null;
  isAdmin?: boolean;
}

type FilterType = 'all' | 'online' | 'offline' | 'admin' | 'friends';
type ViewMode = 'friends' | 'dating';

interface FriendListProps {
  userId: number;
  ws: any;
  onStartChat?: (targetUserId: number) => void;
}

export default function FriendList({ userId, ws, onStartChat }: FriendListProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [allUsers, setAllUsers] = useState<AllUser[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friendUsername, setFriendUsername] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [addError, setAddError] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('friends');

  useEffect(() => {
    fetchData();
    
    if (ws && ws.ws) {
      ws.ws.addEventListener('message', handleWSMessage);
      return () => ws.ws?.removeEventListener('message', handleWSMessage);
    }
  }, [ws]);

  const handleWSMessage = (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'friend_request' || data.type === 'friend_accepted' || data.type === 'user_status') {
        fetchData();
      }
    } catch (error) {
      console.error('WS message error:', error);
    }
  };

  const fetchData = async () => {
    try {
      const [friendsRes, requestsRes, allUsersRes] = await Promise.all([
        fetch('/api/friends', { credentials: 'include' }),
        fetch('/api/friends/requests', { credentials: 'include' }),
        fetch('/api/all-users', { credentials: 'include' }),
      ]);

      const friendsData = await friendsRes.json();
      const requestsData = await requestsRes.json();
      const allUsersData = await allUsersRes.json();

      setFriends(friendsData.friends || []);
      setRequests(requestsData.requests || []);
      setAllUsers(allUsersData.users || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');

    try {
      const res = await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: friendUsername }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send request');
      }

      setFriendUsername('');
      setShowAddFriend(false);
      fetchData();
    } catch (err: any) {
      setAddError(err.message);
    }
  };

  const handleSendRequest = async (username: string) => {
    try {
      const res = await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send request');
      }

      fetchData();
    } catch (error) {
      console.error('Failed to send request:', error);
    }
  };

  const handleAcceptRequest = async (requestId: number) => {
    try {
      await fetch(`/api/friends/accept/${requestId}`, {
        method: 'POST',
        credentials: 'include',
      });
      fetchData();
    } catch (error) {
      console.error('Failed to accept request:', error);
    }
  };

  const friendIds = new Set(friends.map(f => f.id));

  const filteredUsers = allUsers.filter(user => {
    if (user.id === userId) return false;

    const matchesSearch = user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    switch (activeFilter) {
      case 'online':
        return user.isOnline;
      case 'offline':
        return !user.isOnline;
      case 'admin':
        return user.isAdmin;
      case 'friends':
        return friendIds.has(user.id);
      default:
        return true;
    }
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (a.isAdmin && !b.isAdmin) return -1;
    if (!a.isAdmin && b.isAdmin) return 1;
    if (a.isOnline && !b.isOnline) return -1;
    if (!a.isOnline && b.isOnline) return 1;
    return a.displayName.localeCompare(b.displayName);
  });

  const onlineCount = allUsers.filter(u => u.id !== userId && u.isOnline).length;
  const offlineCount = allUsers.filter(u => u.id !== userId && !u.isOnline).length;
  const adminCount = allUsers.filter(u => u.id !== userId && u.isAdmin).length;
  const totalCount = allUsers.filter(u => u.id !== userId).length;

  const filters: { id: FilterType; name: string; count: number; gradient: string }[] = [
    { id: 'all', name: 'Tất cả', count: totalCount, gradient: 'from-blue-500 to-purple-600' },
    { id: 'online', name: 'Online', count: onlineCount, gradient: 'from-green-500 to-emerald-600' },
    { id: 'offline', name: 'Offline', count: offlineCount, gradient: 'from-gray-500 to-gray-600' },
    { id: 'admin', name: 'Admin', count: adminCount, gradient: 'from-red-500 to-orange-600' },
    { id: 'friends', name: 'Bạn bè', count: friends.length, gradient: 'from-pink-500 to-rose-600' },
  ];

  if (loading) {
    return (
      <div className="text-center py-10">
        <div className="w-10 h-10 border-3 border-minecraft-green border-t-transparent rounded-full animate-spin mx-auto"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setViewMode('friends')}
          className={`flex-1 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
            viewMode === 'friends'
              ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
              : 'bg-white/10 text-white/60 hover:bg-white/20'
          }`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Bạn bè
        </button>
        <button
          onClick={() => setViewMode('dating')}
          className={`flex-1 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
            viewMode === 'dating'
              ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white'
              : 'bg-white/10 text-white/60 hover:bg-white/20'
          }`}
        >
          💕 Hẹn hò
        </button>
      </div>

      {viewMode === 'dating' ? (
        <Dating userId={userId} onStartChat={onStartChat} />
      ) : (
        <>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white">Tất cả người chơi ({totalCount})</h3>
            <button
              onClick={() => setShowAddFriend(!showAddFriend)}
              className="minecraft-btn text-sm py-2"
            >
              {showAddFriend ? '✕ Đóng' : '+ Thêm bạn'}
            </button>
          </div>

          {showAddFriend && (
            <div className="glass-card p-4 mb-4">
              <form onSubmit={handleAddFriend} className="flex gap-2">
                <input
                  type="text"
                  value={friendUsername}
                  onChange={(e) => setFriendUsername(e.target.value)}
                  placeholder="Tên đăng nhập của bạn bè"
                  className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-minecraft-green"
                />
                <button type="submit" className="minecraft-btn py-2">
                  Gửi
                </button>
              </form>
              {addError && (
                <p className="text-red-400 text-sm mt-2">{addError}</p>
              )}
            </div>
          )}

          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
            {filters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                  activeFilter === filter.id
                    ? `bg-gradient-to-r ${filter.gradient} text-white shadow-lg`
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                <span className="text-sm font-medium">{filter.name}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeFilter === filter.id ? 'bg-white/20' : 'bg-white/10'
                }`}>
                  {filter.count}
                </span>
              </button>
            ))}
          </div>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm người chơi..."
            className="w-full px-4 py-2 mb-4 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-minecraft-green"
          />

          {requests.length > 0 && (
            <div className="mb-4">
              <h4 className="text-white/70 text-sm mb-2">Lời mời kết bạn ({requests.length})</h4>
              <div className="space-y-2">
                {requests.map((req) => (
                  <div key={req.id} className="glass-card p-3 flex justify-between items-center">
                    <span className="text-white">User #{req.userId}</span>
                    <button
                      onClick={() => handleAcceptRequest(req.id)}
                      className="px-3 py-1 bg-minecraft-green rounded-lg text-sm"
                    >
                      Chấp nhận
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {sortedUsers.length === 0 ? (
            <div className="text-center py-10 glass-card">
              <div className="w-16 h-16 mx-auto mb-4 bg-white/10 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-white/60">Không tìm thấy người chơi</p>
              <p className="text-white/40 text-sm mt-1">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sortedUsers.map((user) => (
                <div 
                  key={user.id} 
                  className={`glass-card p-4 flex items-center gap-3 cursor-pointer hover:bg-white/10 transition-all ${
                    user.isAdmin ? 'border border-red-500/30' : ''
                  }`}
                  onClick={() => setSelectedUserId(user.id)}
                >
                  <div className="relative">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.displayName} className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white ${
                        user.isAdmin ? 'bg-gradient-to-br from-red-500 to-orange-600' : 'bg-minecraft-green/50'
                      }`}>
                        {user.displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-900 ${
                      user.isOnline ? 'bg-green-500' : 'bg-gray-500'
                    }`}></div>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-white flex items-center gap-2">
                      {user.displayName}
                      {user.isAdmin && (
                        <span className="text-red-500 text-xs font-bold">[Admin {user.username}]</span>
                      )}
                      {friendIds.has(user.id) && (
                        <span className="text-pink-400 text-xs font-medium">[Bạn bè]</span>
                      )}
                    </h4>
                    <p className="text-white/50 text-sm">@{user.username}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded ${user.isOnline ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/50'}`}>
                      {user.isOnline ? 'Online' : 'Offline'}
                    </span>
                    {!friendIds.has(user.id) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSendRequest(user.username);
                        }}
                        className="px-3 py-1 bg-minecraft-green hover:bg-minecraft-green/80 rounded-lg text-sm text-white transition-all"
                      >
                        Kết bạn
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {selectedUserId && (
        <ProfileModal
          userId={selectedUserId}
          currentUserId={userId}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </div>
  );
}
