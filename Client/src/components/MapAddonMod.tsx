import { useState, useEffect, useRef } from 'react';

interface Author {
  id: number;
  displayName: string;
  avatar: string | null;
  isAdmin?: boolean;
}

interface MapAddon {
  id: number;
  title: string;
  description: string;
  type: string;
  imageUrl: string | null;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  downloadCount: number;
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

interface MapAddonModProps {
  userId: number;
  onViewProfile?: (userId: number) => void;
}

const TYPES = [
  { id: 'all', name: 'Tất cả', icon: '🌐', gradient: 'from-blue-500 to-purple-600' },
  { id: 'map', name: 'Maps', icon: '🗺️', gradient: 'from-green-500 to-emerald-600' },
  { id: 'addon', name: 'Addons', icon: '🔌', gradient: 'from-orange-500 to-red-600' },
  { id: 'mod', name: 'Mods', icon: '🔧', gradient: 'from-purple-500 to-pink-600' },
  { id: 'texture', name: 'Textures', icon: '🎨', gradient: 'from-cyan-500 to-blue-600' },
  { id: 'shader', name: 'Shaders', icon: '✨', gradient: 'from-rose-500 to-orange-600' },
];

export default function MapAddonMod({ userId, onViewProfile }: MapAddonModProps) {
  const [addons, setAddons] = useState<MapAddon[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('all');
  const [showNewAddon, setShowNewAddon] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newType, setNewType] = useState('map');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [expandedAddon, setExpandedAddon] = useState<number | null>(null);
  const [comments, setComments] = useState<Record<number, Comment[]>>({});
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAddons = async () => {
    try {
      const url = selectedType === 'all' 
        ? '/api/mapaddons' 
        : `/api/mapaddons?type=${selectedType}`;
      const res = await fetch(url, { credentials: 'include' });
      const data = await res.json();
      setAddons(data.addons || []);
    } catch (error) {
      console.error('Failed to fetch addons:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddons();
  }, [selectedType]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('Ảnh quá lớn. Tối đa 10MB');
      return;
    }

    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      alert('File quá lớn. Tối đa 100MB');
      return;
    }

    setSelectedFile(file);
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCreateAddon = async () => {
    if (!newTitle.trim() || !newDescription.trim()) return;
    setPosting(true);
    try {
      const formData = new FormData();
      formData.append('title', newTitle);
      formData.append('description', newDescription);
      formData.append('type', newType);
      if (selectedImage) {
        formData.append('image', selectedImage);
      }
      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      const res = await fetch('/api/mapaddons', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const data = await res.json();
      if (data.addon) {
        setAddons([data.addon, ...addons]);
        setNewTitle('');
        setNewDescription('');
        setSelectedImage(null);
        setImagePreview(null);
        setSelectedFile(null);
        setShowNewAddon(false);
      }
    } catch (error) {
      console.error('Failed to create addon:', error);
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (addonId: number, hasLiked: boolean) => {
    try {
      const method = hasLiked ? 'DELETE' : 'POST';
      const res = await fetch(`/api/mapaddons/${addonId}/like`, {
        method,
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setAddons(addons.map(a => 
          a.id === addonId 
            ? { ...a, hasLiked: !hasLiked, likesCount: data.likesCount }
            : a
        ));
      }
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  };

  const handleDownload = async (addon: MapAddon) => {
    if (!addon.fileUrl) return;
    
    try {
      await fetch(`/api/mapaddons/${addon.id}/download`, {
        method: 'POST',
        credentials: 'include',
      });
      
      setAddons(addons.map(a => 
        a.id === addon.id 
          ? { ...a, downloadCount: a.downloadCount + 1 }
          : a
      ));
      
      const link = document.createElement('a');
      link.href = addon.fileUrl;
      link.download = addon.fileName || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to track download:', error);
    }
  };

  const fetchComments = async (addonId: number) => {
    try {
      const res = await fetch(`/api/mapaddons/${addonId}/comments`, { credentials: 'include' });
      const data = await res.json();
      setComments(prev => ({ ...prev, [addonId]: data.comments || [] }));
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    }
  };

  const handleAddComment = async (addonId: number) => {
    if (!newComment.trim()) return;
    try {
      const res = await fetch(`/api/mapaddons/${addonId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: newComment }),
      });
      const data = await res.json();
      if (data.comment) {
        setComments(prev => ({
          ...prev,
          [addonId]: [...(prev[addonId] || []), data.comment],
        }));
        setAddons(addons.map(a => 
          a.id === addonId 
            ? { ...a, commentsCount: a.commentsCount + 1 }
            : a
        ));
        setNewComment('');
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const handleDeleteAddon = async (addonId: number) => {
    if (!confirm('Bạn có chắc muốn xóa bài đăng này?')) return;
    try {
      const res = await fetch(`/api/mapaddons/${addonId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setAddons(addons.filter(a => a.id !== addonId));
      }
    } catch (error) {
      console.error('Failed to delete addon:', error);
    }
  };

  const toggleComments = (addonId: number) => {
    if (expandedAddon === addonId) {
      setExpandedAddon(null);
    } else {
      setExpandedAddon(addonId);
      if (!comments[addonId]) {
        fetchComments(addonId);
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

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getTypeInfo = (typeId: string) => {
    return TYPES.find(t => t.id === typeId) || TYPES[1];
  };

  const filteredAddons = addons.filter(addon =>
    addon.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    addon.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {TYPES.map((type) => (
          <button
            key={type.id}
            onClick={() => setSelectedType(type.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
              selectedType === type.id
                ? `bg-gradient-to-r ${type.gradient} text-white shadow-lg`
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            <span>{type.icon}</span>
            <span className="text-sm font-medium">{type.name}</span>
          </button>
        ))}
      </div>

      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Tìm kiếm maps, addons, mods..."
        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-minecraft-green"
      />

      <button
        onClick={() => setShowNewAddon(true)}
        className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-500/90 hover:to-pink-600/90 text-white py-3 rounded-xl font-medium transition-all shadow-lg"
      >
        + Đăng Map/Addon/Mod mới
      </button>

      {showNewAddon && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 w-full max-w-md border border-white/10 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Đăng mới</h3>
              <button onClick={() => {
                setShowNewAddon(false);
                removeImage();
                removeFile();
              }} className="text-white/60 hover:text-white text-2xl">
                &times;
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-white/70 text-sm mb-2">Loại</label>
              <div className="flex flex-wrap gap-2">
                {TYPES.filter(t => t.id !== 'all').map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setNewType(type.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
                      newType === type.id
                        ? `bg-gradient-to-r ${type.gradient} text-white`
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    <span>{type.icon}</span>
                    <span>{type.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Tiêu đề..."
              className="w-full bg-black/30 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-minecraft-green/50 mb-4"
            />

            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Mô tả chi tiết..."
              className="w-full bg-black/30 border border-white/20 rounded-xl p-4 text-white placeholder-white/40 resize-none focus:outline-none focus:border-minecraft-green/50 h-24"
            />

            <div className="mt-4 space-y-3">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
              />

              {imagePreview ? (
                <div className="relative">
                  <img src={imagePreview} alt="Preview" className="w-full rounded-xl max-h-32 object-cover" />
                  <button
                    onClick={removeImage}
                    className="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-sm hover:bg-red-600 transition-all"
                  >
                    &times;
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => imageInputRef.current?.click()}
                  className="w-full py-2 rounded-xl border-2 border-dashed border-white/20 text-white/60 hover:border-minecraft-green/50 hover:text-minecraft-green transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Thêm ảnh xem trước
                </button>
              )}

              {selectedFile ? (
                <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl">
                  <div className="flex items-center gap-2 text-white/80 text-sm">
                    <span>📦</span>
                    <span className="truncate max-w-[200px]">{selectedFile.name}</span>
                    <span className="text-white/40">({formatFileSize(selectedFile.size)})</span>
                  </div>
                  <button onClick={removeFile} className="text-red-400 hover:text-red-300">
                    &times;
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2 rounded-xl border-2 border-dashed border-purple-500/50 text-purple-400 hover:border-purple-400 hover:text-purple-300 transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Tải lên file (tối đa 100MB)
                </button>
              )}
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowNewAddon(false);
                  removeImage();
                  removeFile();
                }}
                className="flex-1 py-3 rounded-xl bg-white/10 text-white/70 hover:bg-white/20 transition-all"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateAddon}
                disabled={!newTitle.trim() || !newDescription.trim() || posting}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 text-white font-medium disabled:opacity-50 transition-all"
              >
                {posting ? 'Đang đăng...' : 'Đăng'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredAddons.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🗺️</div>
          <p className="text-white/60">Chưa có nội dung nào</p>
          <p className="text-white/40 text-sm mt-1">Hãy là người đầu tiên chia sẻ!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAddons.map((addon) => {
            const typeInfo = getTypeInfo(addon.type);
            return (
              <div key={addon.id} className="glass-card p-4 rounded-2xl">
                <div className="flex items-start gap-3">
                  {addon.imageUrl ? (
                    <img 
                      src={addon.imageUrl} 
                      alt={addon.title} 
                      className="w-20 h-20 rounded-xl object-cover shrink-0"
                    />
                  ) : (
                    <div className={`w-20 h-20 rounded-xl bg-gradient-to-br ${typeInfo.gradient} flex items-center justify-center shrink-0`}>
                      <span className="text-3xl">{typeInfo.icon}</span>
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full bg-gradient-to-r ${typeInfo.gradient} text-white`}>
                        {typeInfo.icon} {typeInfo.name}
                      </span>
                      <span className="text-white/40 text-xs">
                        {formatTime(addon.createdAt)}
                      </span>
                    </div>

                    <h3 className="font-bold text-white text-lg mt-1">{addon.title}</h3>
                    
                    <div 
                      className="flex items-center gap-2 mt-1 cursor-pointer"
                      onClick={() => addon.author?.id && onViewProfile?.(addon.author.id)}
                    >
                      {addon.author?.avatar ? (
                        <img src={addon.author.avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-white text-xs">
                          {addon.author?.displayName?.charAt(0).toUpperCase() || '?'}
                        </div>
                      )}
                      <span className="text-white/60 text-sm hover:text-minecraft-green transition-colors">
                        {addon.author?.displayName || 'Ẩn danh'}
                        {addon.author?.isAdmin && <span className="text-red-500 text-xs ml-1">[Admin {addon.author?.username}]</span>}
                      </span>
                    </div>

                    <p className="text-white/70 mt-2 text-sm line-clamp-2">{addon.description}</p>

                    {addon.fileUrl && (
                      <div className="flex items-center gap-2 mt-3 bg-white/5 p-2 rounded-lg">
                        <span className="text-white/60 text-sm">📦 {addon.fileName || 'File'}</span>
                        <span className="text-white/40 text-xs">({formatFileSize(addon.fileSize)})</span>
                        <span className="text-white/40 text-xs ml-auto">⬇️ {addon.downloadCount}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-3 mt-4">
                      <button
                        onClick={() => handleLike(addon.id, addon.hasLiked)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                          addon.hasLiked 
                            ? 'bg-red-500/20 text-red-400' 
                            : 'bg-white/10 text-white/60 hover:bg-white/20'
                        }`}
                      >
                        <span>{addon.hasLiked ? '❤️' : '🤍'}</span>
                        <span className="text-sm">{addon.likesCount}</span>
                      </button>

                      <button
                        onClick={() => toggleComments(addon.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 transition-all"
                      >
                        <span>💬</span>
                        <span className="text-sm">{addon.commentsCount}</span>
                      </button>

                      {addon.fileUrl && (
                        <button
                          onClick={() => handleDownload(addon)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-600 text-white hover:opacity-90 transition-all"
                        >
                          <span>⬇️</span>
                          <span className="text-sm">Tải xuống</span>
                        </button>
                      )}

                      {addon.author?.id === userId && (
                        <button
                          onClick={() => handleDeleteAddon(addon.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all ml-auto"
                        >
                          <span>🗑️</span>
                        </button>
                      )}
                    </div>

                    {expandedAddon === addon.id && (
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <div className="space-y-3 max-h-60 overflow-y-auto">
                          {(comments[addon.id] || []).length === 0 ? (
                            <p className="text-white/40 text-sm text-center py-4">Chưa có bình luận</p>
                          ) : (
                            (comments[addon.id] || []).map((comment) => (
                              <div key={comment.id} className="flex gap-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                  {comment.author?.displayName?.charAt(0).toUpperCase() || '?'}
                                </div>
                                <div className="bg-white/5 rounded-xl px-3 py-2 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-white text-sm">
                                      {comment.author?.displayName || 'Ẩn danh'}
                                      {comment.author?.isAdmin && <span className="text-red-500 text-xs ml-1">[Admin {comment.author?.username}]</span>}
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
                            onKeyDown={(e) => e.key === 'Enter' && handleAddComment(addon.id)}
                            placeholder="Viết bình luận..."
                            className="flex-1 bg-black/30 border border-white/20 rounded-xl px-4 py-2 text-white text-sm placeholder-white/40 focus:outline-none focus:border-purple-500/50"
                          />
                          <button
                            onClick={() => handleAddComment(addon.id)}
                            disabled={!newComment.trim()}
                            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl text-sm font-medium disabled:opacity-50 transition-all"
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
