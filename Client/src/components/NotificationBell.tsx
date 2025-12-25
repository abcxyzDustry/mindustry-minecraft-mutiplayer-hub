import { useState, useEffect } from 'react';

interface AdminNotification {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  isRead: boolean;
  type: 'admin';
}

interface PostNotification {
  id: number;
  type: 'like' | 'comment';
  actorName: string;
  actorAvatar: string | null;
  postId: number;
  postContent: string;
  createdAt: string;
  isRead: boolean;
  notificationType: 'post';
}

type Notification = AdminNotification | PostNotification;

interface NotificationBellProps {
  userId: number;
  onNavigateToPost?: (postId: number) => void;
}

export default function NotificationBell({ userId, onNavigateToPost }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'admin' | 'post'>('all');

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  const fetchUnreadCount = async () => {
    try {
      const res = await fetch('/api/notifications/unread-count', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count);
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications/all', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    if (!showDropdown) {
      fetchNotifications();
    }
    setShowDropdown(!showDropdown);
  };

  const handleMarkAsRead = async (notif: Notification, isPost: boolean) => {
    try {
      const endpoint = isPost 
        ? `/api/notifications/post/${notif.id}/read`
        : `/api/notifications/${notif.id}/read`;
      
      await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
      });
      setNotifications(notifications.map(n => 
        n.id === notif.id && ('notificationType' in n ? n.notificationType === 'post' : true) === isPost
          ? { ...n, isRead: true } 
          : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handlePostNotificationClick = (notif: PostNotification) => {
    if (!notif.isRead) {
      handleMarkAsRead(notif, true);
    }
    if (onNavigateToPost) {
      onNavigateToPost(notif.postId);
      setShowDropdown(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút`;
    if (diffHours < 24) return `${diffHours} giờ`;
    if (diffDays < 7) return `${diffDays} ngày`;
    return date.toLocaleDateString('vi-VN');
  };

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'all') return true;
    if (activeTab === 'admin') return !('notificationType' in n);
    if (activeTab === 'post') return 'notificationType' in n && n.notificationType === 'post';
    return true;
  });

  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        className="relative p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all"
      >
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)}></div>
          <div className="absolute right-0 top-full mt-2 w-80 bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl border border-white/10 shadow-2xl z-50 overflow-hidden">
            <div className="p-3 border-b border-white/10">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-white">Thông báo</h3>
                {unreadCount > 0 && (
                  <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
                    {unreadCount} mới
                  </span>
                )}
              </div>
              <div className="flex gap-1">
                {[
                  { id: 'all', name: 'Tất cả' },
                  { id: 'admin', name: 'Admin' },
                  { id: 'post', name: 'Bài viết' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-3 py-1 text-xs rounded-full transition-all ${
                      activeTab === tab.id
                        ? 'bg-minecraft-green text-white'
                        : 'bg-white/10 text-white/60 hover:bg-white/20'
                    }`}
                  >
                    {tab.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-minecraft-green border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="text-4xl mb-2">🔔</div>
                  <p className="text-white/50 text-sm">Chưa có thông báo</p>
                </div>
              ) : (
                filteredNotifications.map((notif, index) => {
                  const isPostNotif = 'notificationType' in notif && notif.notificationType === 'post';
                  
                  if (isPostNotif) {
                    const postNotif = notif as PostNotification;
                    return (
                      <div
                        key={`post-${postNotif.id}`}
                        onClick={() => handlePostNotificationClick(postNotif)}
                        className={`p-3 border-b border-white/5 cursor-pointer transition-all ${
                          postNotif.isRead ? 'bg-transparent hover:bg-white/5' : 'bg-pink-500/10 hover:bg-pink-500/20'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {postNotif.actorAvatar ? (
                            <img src={postNotif.actorAvatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white text-xs font-bold">
                              {postNotif.actorName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-white text-sm">
                                <span className="font-medium">{postNotif.actorName}</span>
                                {' '}
                                {postNotif.type === 'like' ? 'đã thích' : 'đã bình luận'} bài viết của bạn
                              </p>
                              <span className="text-white/30 text-xs shrink-0">{formatTime(postNotif.createdAt)}</span>
                            </div>
                            <p className="text-white/40 text-xs mt-1 line-clamp-1">{postNotif.postContent}</p>
                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    const adminNotif = notif as AdminNotification;
                    return (
                      <div
                        key={`admin-${adminNotif.id}`}
                        onClick={() => !adminNotif.isRead && handleMarkAsRead(adminNotif, false)}
                        className={`p-3 border-b border-white/5 cursor-pointer transition-all ${
                          adminNotif.isRead ? 'bg-transparent' : 'bg-minecraft-green/10 hover:bg-minecraft-green/20'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                            adminNotif.isRead ? 'bg-white/20' : 'bg-minecraft-green'
                          }`}></div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="font-medium text-white text-sm truncate">{adminNotif.title}</h4>
                              <span className="text-white/30 text-xs shrink-0">{formatTime(adminNotif.createdAt)}</span>
                            </div>
                            <p className="text-white/60 text-sm mt-1 line-clamp-2">{adminNotif.content}</p>
                          </div>
                        </div>
                      </div>
                    );
                  }
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
