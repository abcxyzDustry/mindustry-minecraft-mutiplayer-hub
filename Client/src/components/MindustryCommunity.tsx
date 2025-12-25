import { useState, useEffect, useRef } from 'react';

interface Author {
  id: number;
  displayName: string;
  avatar: string | null;
  isAdmin?: boolean;
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
  author: Author | null;
  hasLiked: boolean;
}

interface Comment {
  id: number;
  content: string;
  createdAt: string;
  author: Author | null;
}

interface MindustryCommunityProps {
  userId: number;
  onViewProfile?: (userId: number) => void;
}

const CATEGORIES = [
  { id: 'all', name: 'Tất cả', icon: '🌐', gradient: 'from-orange-500 to-amber-600' },
  { id: 'general', name: 'Chung', icon: '💬', gradient: 'from-orange-500 to-red-600' },
  { id: 'builds', name: 'Công trình', icon: '🏭', gradient: 'from-amber-500 to-orange-600' },
  { id: 'logic', name: 'Logic', icon: '⚡', gradient: 'from-blue-500 to-cyan-600' },
  { id: 'schematic', name: 'Schematic', icon: '📐', gradient: 'from-purple-500 to-pink-600' },
  { id: 'help', name: 'Hỏi đáp', icon: '❓', gradient: 'from-cyan-500 to-blue-600' },
  { id: 'servers', name: 'Server', icon: '🎮', gradient: 'from-rose-500 to-orange-600' },
];

export default function MindustryCommunity({ userId, onViewProfile }: MindustryCommunityProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostCategory, setNewPostCategory] = useState('general');
  const [selectedMedia, setSelectedMedia] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [expandedPost, setExpandedPost] = useState<number | null>(null);
  const [comments, setComments] = useState<Record<number, Comment[]>>({});
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPosts = async () => {
    try {
      const params = new URLSearchParams();
      params.append('gameType', 'mindustry');
      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }
      const url = `/api/posts?${params.toString()}`;
      const res = await fetch(url, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
      } else {
        setPosts([]);
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [selectedCategory]);

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const imageTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const videoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];

    if (imageTypes.includes(file.type)) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Ảnh quá lớn. Tối đa 5MB');
        return;
      }
      setMediaType('image');
    } else if (videoTypes.includes(file.type)) {
      if (file.size > 50 * 1024 * 1024) {
        alert('Video quá lớn. Tối đa 50MB');
        return;
      }
      setMediaType('video');
    } else {
      alert('Chỉ chấp nhận file PNG, JPG, MP4, WebM hoặc MOV');
      return;
    }

    setSelectedMedia(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setMediaPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeMedia = () => {
    setSelectedMedia(null);
    setMediaPreview(null);
    setMediaType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) return;
    setPosting(true);
    try {
      const formData = new FormData();
      formData.append('content', newPostContent);
      formData.append('category', newPostCategory);
      formData.append('gameType', 'mindustry');
      if (selectedMedia) {
        formData.append('media', selectedMedia);
      }

      const res = await fetch('/api/posts', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const data = await res.json();
      if (data.post) {
        setPosts([data.post, ...posts]);
        setNewPostContent('');
        setSelectedMedia(null);
        setMediaPreview(null);
        setMediaType(null);
        setShowNewPost(false);
      }
    } catch (error) {
      console.error('Failed to create post:', error);
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (postId: number, hasLiked: boolean) => {
    try {
      const method = hasLiked ? 'DELETE' : 'POST';
      const res = await fetch(`/api/posts/${postId}/like`, {
        method,
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setPosts(posts.map(p => 
          p.id === postId 
            ? { ...p, hasLiked: !hasLiked, likesCount: data.likesCount }
            : p
        ));
      }
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  };

  const fetchComments = async (postId: number) => {
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, { credentials: 'include' });
      const data = await res.json();
      setComments(prev => ({ ...prev, [postId]: data.comments || [] }));
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    }
  };

  const handleAddComment = async (postId: number) => {
    if (!newComment.trim()) return;
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: newComment }),
      });
      const data = await res.json();
      if (data.comment) {
        setComments(prev => ({
          ...prev,
          [postId]: [...(prev[postId] || []), data.comment],
        }));
        setPosts(posts.map(p => 
          p.id === postId 
            ? { ...p, commentsCount: p.commentsCount + 1 }
            : p
        ));
        setNewComment('');
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const handleDeletePost = async (postId: number) => {
    if (!confirm('Bạn có chắc muốn xóa bài đăng này?')) return;
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setPosts(posts.filter(p => p.id !== postId));
      }
    } catch (error) {
      console.error('Failed to delete post:', error);
    }
  };

  const toggleComments = (postId: number) => {
    if (expandedPost === postId) {
      setExpandedPost(null);
    } else {
      setExpandedPost(postId);
      if (!comments[postId]) {
        fetchComments(postId);
      }
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
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };

  const getCategoryInfo = (categoryId: string) => {
    return CATEGORIES.find(c => c.id === categoryId) || CATEGORIES[1];
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
              selectedCategory === cat.id
                ? `bg-gradient-to-r ${cat.gradient} text-white shadow-lg`
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            <span>{cat.icon}</span>
            <span className="text-sm font-medium">{cat.name}</span>
          </button>
        ))}
      </div>

      <button
        onClick={() => setShowNewPost(true)}
        className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-500/90 hover:to-amber-600/90 text-white py-3 rounded-xl font-medium transition-all shadow-lg"
      >
        + Đăng bài mới
      </button>

      {showNewPost && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 w-full max-w-md border border-white/10 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Bài đăng mới - Mindustry</h3>
              <button onClick={() => {
                setShowNewPost(false);
                removeMedia();
              }} className="text-white/60 hover:text-white text-2xl">
                &times;
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-white/70 text-sm mb-2">Danh mục</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.filter(c => c.id !== 'all').map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setNewPostCategory(cat.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
                      newPostCategory === cat.id
                        ? `bg-gradient-to-r ${cat.gradient} text-white`
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              placeholder="Chia sẻ điều gì đó với cộng đồng Mindustry..."
              className="w-full bg-black/30 border border-white/20 rounded-xl p-4 text-white placeholder-white/40 resize-none focus:outline-none focus:border-orange-500/50 h-32"
            />

            <div className="mt-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,video/mp4,video/webm,video/quicktime"
                onChange={handleMediaSelect}
                className="hidden"
              />

              {mediaPreview ? (
                <div className="relative">
                  {mediaType === 'video' ? (
                    <video 
                      src={mediaPreview} 
                      className="w-full rounded-xl max-h-48 object-cover" 
                      controls
                    />
                  ) : (
                    <img 
                      src={mediaPreview} 
                      alt="Preview" 
                      className="w-full rounded-xl max-h-48 object-cover" 
                    />
                  )}
                  <button
                    onClick={removeMedia}
                    className="absolute top-2 right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-all"
                  >
                    &times;
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3 rounded-xl border-2 border-dashed border-white/20 text-white/60 hover:border-orange-500/50 hover:text-orange-400 transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Thêm ảnh/video
                </button>
              )}
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowNewPost(false);
                  removeMedia();
                }}
                className="flex-1 py-3 rounded-xl bg-white/10 text-white/70 hover:bg-white/20 transition-all"
              >
                Hủy
              </button>
              <button
                onClick={handleCreatePost}
                disabled={!newPostContent.trim() || posting}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 text-white font-medium disabled:opacity-50 transition-all"
              >
                {posting ? 'Đang đăng...' : 'Đăng bài'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🏭</div>
          <p className="text-white/60">Chưa có bài đăng nào</p>
          <p className="text-white/40 text-sm mt-1">Hãy là người đầu tiên chia sẻ về Mindustry!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => {
            const catInfo = getCategoryInfo(post.category);
            return (
              <div key={post.id} className="glass-card p-4 rounded-2xl border border-orange-500/20">
                <div className="flex items-start gap-3">
                  <div 
                    className={`cursor-pointer transition-transform hover:scale-105 ${post.author?.id ? '' : 'cursor-default'}`}
                    onClick={() => post.author?.id && onViewProfile?.(post.author.id)}
                  >
                    {post.author?.avatar ? (
                      <img 
                        src={post.author.avatar} 
                        alt={post.author.displayName} 
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-transparent hover:ring-orange-500 transition-all"
                      />
                    ) : (
                      <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${catInfo.gradient} flex items-center justify-center text-white font-bold text-lg`}>
                        {post.author?.displayName?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span 
                        className={`font-semibold text-white inline-flex items-center gap-1 ${post.author?.id ? 'cursor-pointer hover:text-orange-400 transition-colors' : ''}`}
                        onClick={() => post.author?.id && onViewProfile?.(post.author.id)}
                      >
                        {post.author?.displayName || 'Ẩn danh'}
                        {post.author?.isAdmin && (
                          <span className="text-red-500 text-xs font-bold">[Admin {post.author?.username}]</span>
                        )}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full bg-gradient-to-r ${catInfo.gradient} text-white`}>
                        {catInfo.icon} {catInfo.name}
                      </span>
                      <span className="text-white/40 text-xs">
                        {formatTime(post.createdAt)}
                      </span>
                    </div>

                    <p className="text-white/90 mt-2 whitespace-pre-wrap break-words">
                      {post.content}
                    </p>

                    {post.videoUrl && (
                      <video 
                        src={post.videoUrl}
                        controls
                        className="w-full rounded-xl max-h-96 mt-3"
                      />
                    )}

                    {post.imageUrl && !post.videoUrl && (
                      <img 
                        src={post.imageUrl}
                        alt="Post" 
                        className="w-full rounded-xl max-h-96 object-cover mt-3"
                      />
                    )}

                    <div className="flex items-center gap-4 mt-4">
                      <button
                        onClick={() => handleLike(post.id, post.hasLiked)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                          post.hasLiked 
                            ? 'bg-orange-500/20 text-orange-400' 
                            : 'bg-white/10 text-white/60 hover:bg-white/20'
                        }`}
                      >
                        <span>{post.hasLiked ? '❤️' : '🤍'}</span>
                        <span className="text-sm">{post.likesCount}</span>
                      </button>

                      <button
                        onClick={() => toggleComments(post.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 transition-all"
                      >
                        <span>💬</span>
                        <span className="text-sm">{post.commentsCount}</span>
                      </button>

                      {post.author?.id === userId && (
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all ml-auto"
                        >
                          <span>🗑️</span>
                          <span className="text-sm">Xóa</span>
                        </button>
                      )}
                    </div>

                    {expandedPost === post.id && (
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <div className="space-y-3 max-h-60 overflow-y-auto">
                          {(comments[post.id] || []).length === 0 ? (
                            <p className="text-white/40 text-sm text-center py-4">Chưa có bình luận</p>
                          ) : (
                            (comments[post.id] || []).map((comment) => (
                              <div key={comment.id} className="flex gap-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-600 to-amber-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                  {comment.author?.displayName?.charAt(0).toUpperCase() || '?'}
                                </div>
                                <div className="bg-white/5 rounded-xl px-3 py-2 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-white text-sm inline-flex items-center gap-1">
                                      {comment.author?.displayName || 'Ẩn danh'}
                                      {comment.author?.isAdmin && (
                                        <span className="text-red-500 text-xs font-bold">[Admin {comment.author?.username}]</span>
                                      )}
                                    </span>
                                    <span className="text-white/30 text-xs">
                                      {formatTime(comment.createdAt)}
                                    </span>
                                  </div>
                                  <p className="text-white/80 text-sm mt-0.5">{comment.content}</p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        <div className="flex gap-2 mt-3">
                          <input
                            type="text"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                            placeholder="Viết bình luận..."
                            className="flex-1 bg-black/30 border border-white/20 rounded-xl px-4 py-2 text-white text-sm placeholder-white/40 focus:outline-none focus:border-orange-500/50"
                          />
                          <button
                            onClick={() => handleAddComment(post.id)}
                            disabled={!newComment.trim()}
                            className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-xl text-sm font-medium disabled:opacity-50 transition-all"
                          >
                            Gửi
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
