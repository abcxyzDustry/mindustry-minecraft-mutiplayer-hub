import { useState, useEffect } from 'react';

interface User {
  id: number;
  username: string;
  displayName: string;
  avatar: string | null;
  isOnline: boolean;
  isAdmin: boolean;
  createdAt: string;
  lastSeen: string;
}

interface Notification {
  id: number;
  title: string;
  content: string;
  createdAt: string;
}

interface AdminPanelProps {
  onClose: () => void;
}

export default function AdminPanel({ onClose }: AdminPanelProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'notifications'>('users');
  const [newNotifTitle, setNewNotifTitle] = useState('');
  const [newNotifContent, setNewNotifContent] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, notifsRes] = await Promise.all([
        fetch('/api/admin/users', { credentials: 'include' }),
        fetch('/api/admin/notifications', { credentials: 'include' }),
      ]);

      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.users || []);
      }
      if (notifsRes.ok) {
        const data = await notifsRes.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: number, username: string) => {
    if (!confirm(`Bạn có chắc muốn xóa tài khoản "${username}"?`)) return;

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (res.ok) {
        setUsers(users.filter(u => u.id !== userId));
      } else {
        const data = await res.json();
        alert(data.error || 'Không thể xóa tài khoản');
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('Không thể xóa tài khoản');
    }
  };

  const handleSendNotification = async () => {
    if (!newNotifTitle.trim() || !newNotifContent.trim()) return;

    setSending(true);
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: newNotifTitle, content: newNotifContent }),
      });

      if (res.ok) {
        const data = await res.json();
        setNotifications([data.notification, ...notifications]);
        setNewNotifTitle('');
        setNewNotifContent('');
        alert('Thông báo đã được gửi đến tất cả người dùng!');
      }
    } catch (error) {
      console.error('Failed to send notification:', error);
      alert('Không thể gửi thông báo');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredUsers = users.filter(user =>
    user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-white/10 flex flex-col">
        <div className="p-4 border-b border-white/10 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Admin Panel</h2>
              <p className="text-white/50 text-sm">Quản lý ứng dụng</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white text-2xl">
            &times;
          </button>
        </div>

        <div className="flex border-b border-white/10">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 py-3 text-sm font-medium transition-all ${
              activeTab === 'users'
                ? 'bg-white/10 text-white border-b-2 border-minecraft-green'
                : 'text-white/60 hover:bg-white/5'
            }`}
          >
            👥 Quản lý tài khoản ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex-1 py-3 text-sm font-medium transition-all ${
              activeTab === 'notifications'
                ? 'bg-white/10 text-white border-b-2 border-minecraft-green'
                : 'text-white/60 hover:bg-white/5'
            }`}
          >
            🔔 Gửi thông báo
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-10 h-10 border-4 border-minecraft-green border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : activeTab === 'users' ? (
            <div className="space-y-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm tài khoản..."
                className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-minecraft-green"
              />

              <div className="space-y-2">
                {filteredUsers.length === 0 ? (
                  <p className="text-center text-white/50 py-8">Không tìm thấy tài khoản</p>
                ) : (
                  filteredUsers.map((user) => (
                    <div key={user.id} className="bg-white/5 rounded-xl p-4 flex items-center gap-4">
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
                        {user.isOnline && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800"></div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-white truncate">{user.displayName}</h4>
                          {user.isAdmin && (
                            <span className="text-red-500 text-xs font-bold">[Admin {user.username}]</span>
                          )}
                        </div>
                        <p className="text-white/50 text-sm">@{user.username}</p>
                        <p className="text-white/30 text-xs">
                          Tham gia: {formatTime(user.createdAt)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded ${
                          user.isOnline ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/50'
                        }`}>
                          {user.isOnline ? 'Online' : 'Offline'}
                        </span>
                        
                        {!user.isAdmin && (
                          <button
                            onClick={() => handleDeleteUser(user.id, user.username)}
                            className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition-all"
                          >
                            Xóa
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-white/5 rounded-xl p-4 space-y-4">
                <h3 className="font-medium text-white">Gửi thông báo mới</h3>
                <input
                  type="text"
                  value={newNotifTitle}
                  onChange={(e) => setNewNotifTitle(e.target.value)}
                  placeholder="Tiêu đề thông báo"
                  className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-minecraft-green"
                />
                <textarea
                  value={newNotifContent}
                  onChange={(e) => setNewNotifContent(e.target.value)}
                  placeholder="Nội dung thông báo..."
                  rows={4}
                  className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-minecraft-green resize-none"
                />
                <button
                  onClick={handleSendNotification}
                  disabled={!newNotifTitle.trim() || !newNotifContent.trim() || sending}
                  className="w-full py-3 bg-gradient-to-r from-minecraft-green to-emerald-500 text-white rounded-xl font-medium disabled:opacity-50 transition-all"
                >
                  {sending ? 'Đang gửi...' : '📣 Gửi thông báo đến tất cả người dùng'}
                </button>
              </div>

              <div>
                <h3 className="font-medium text-white mb-3">Lịch sử thông báo</h3>
                <div className="space-y-2">
                  {notifications.length === 0 ? (
                    <p className="text-center text-white/50 py-8">Chưa có thông báo nào</p>
                  ) : (
                    notifications.map((notif) => (
                      <div key={notif.id} className="bg-white/5 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-white">{notif.title}</h4>
                          <span className="text-white/30 text-xs">{formatTime(notif.createdAt)}</span>
                        </div>
                        <p className="text-white/70 text-sm">{notif.content}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
