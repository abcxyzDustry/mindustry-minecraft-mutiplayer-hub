import { useState, useEffect, useRef } from 'react';
import { useGameMode } from '../contexts/GameModeContext';

interface User {
  id: number;
  username: string;
  displayName: string;
}

interface Room {
  id: number;
  name: string;
  hostId: number;
  hostName: string;
  hostIp: string | null;
  hostPort: number;
  maxPlayers: number;
  currentPlayers: number;
  isActive: boolean;
  gameVersion: string;
}

interface ChatBubbleProps {
  user: User;
  ws: {
    connected: boolean;
    globalMessages: any[];
    privateMessages: Map<number, any[]>;
    roomMessages: Map<number, any[]>;
    sendGlobalMessage: (content: string, gameMode?: 'minecraft' | 'mindustry') => void;
    sendPrivateMessage: (receiverId: number, content: string) => void;
    sendRoomMessage: (roomId: number, content: string) => void;
    ws: WebSocket | null;
  };
}

type ChatMode = 'global' | 'private' | 'group' | 'servers';

interface ChatGroup {
  id: string;
  name: string;
  members: number[];
  messages: any[];
}

export default function ChatBubble({ user, ws }: ChatBubbleProps) {
  const { gameMode: currentGameMode, gradientFrom, gradientTo } = useGameMode();
  const [expanded, setExpanded] = useState(false);
  const [message, setMessage] = useState('');
  const [chatMode, setChatMode] = useState<ChatMode>('global');
  const [selectedFriend, setSelectedFriend] = useState<number | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null);
  const [friends, setFriends] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchFriends();
    fetchAllUsers();
    fetchRooms();
    loadChatHistory();
    loadGroups();
  }, [currentGameMode]);

  const fetchRooms = async () => {
    try {
      const res = await fetch(`/api/rooms?gameType=${currentGameMode}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setRooms(data.rooms || []);
      }
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
    }
  };

  const loadGroups = () => {
    const savedGroups = localStorage.getItem(`chat-groups-${user.id}-${currentGameMode}`);
    if (savedGroups) {
      setGroups(JSON.parse(savedGroups));
    }
  };

  const saveGroups = (newGroups: ChatGroup[]) => {
    localStorage.setItem(`chat-groups-${user.id}-${currentGameMode}`, JSON.stringify(newGroups));
    setGroups(newGroups);
  };

  const createGroup = () => {
    if (!newGroupName.trim() || selectedMembers.length === 0) return;
    
    const newGroup: ChatGroup = {
      id: `group-${Date.now()}`,
      name: newGroupName.trim(),
      members: [user.id, ...selectedMembers],
      messages: [],
    };
    
    const updatedGroups = [...groups, newGroup];
    saveGroups(updatedGroups);
    setNewGroupName('');
    setSelectedMembers([]);
    setShowCreateGroup(false);
    setSelectedGroup(newGroup.id);
  };

  const toggleMemberSelection = (memberId: number) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ws.globalMessages, ws.privateMessages, ws.roomMessages]);

  useEffect(() => {
    if (!expanded && ws.globalMessages.length > 0) {
      setUnreadCount(prev => prev + 1);
    }
  }, [ws.globalMessages.length]);

  const fetchFriends = async () => {
    try {
      const res = await fetch('/api/friends', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setFriends(data.friends);
      }
    } catch (error) {
      console.error('Failed to fetch friends:', error);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const res = await fetch('/api/users', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setAllUsers(data.users);
      }
    } catch (error) {
      console.error('Failed to fetch all users:', error);
    }
  };

  const loadChatHistory = async () => {
    try {
      const globalRes = await fetch('/api/messages/global', { credentials: 'include' });
      if (globalRes.ok) {
        const globalData = await globalRes.json();
        console.log('Global messages loaded:', globalData.messages?.length || 0);
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  };

  useEffect(() => {
    if (!ws.ws) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'global_message' || data.type === 'private_message') {
          if (!expanded) {
            setUnreadCount(prev => prev + 1);
          }
        }
      } catch (error) {
        console.error('Error handling message:', error);
      }
    };

    ws.ws.addEventListener('message', handleMessage);
    return () => ws.ws?.removeEventListener('message', handleMessage);
  }, [ws.ws, user.id, expanded]);

  const handleSend = () => {
    if (!message.trim()) return;

    if (chatMode === 'global') {
      ws.sendGlobalMessage(message, currentGameMode as 'minecraft' | 'mindustry');
    } else if (chatMode === 'private' && selectedFriend) {
      ws.sendPrivateMessage(selectedFriend, message);
    } else if (chatMode === 'servers' && selectedRoom) {
      ws.sendRoomMessage(selectedRoom, message);
    } else if (chatMode === 'group' && selectedGroup) {
      const groupIndex = groups.findIndex(g => g.id === selectedGroup);
      if (groupIndex !== -1) {
        const newMessage = {
          id: Date.now(),
          senderId: user.id,
          senderName: user.displayName,
          content: message.trim(),
          timestamp: new Date().toISOString(),
        };
        const updatedGroups = [...groups];
        updatedGroups[groupIndex] = {
          ...updatedGroups[groupIndex],
          messages: [...updatedGroups[groupIndex].messages, newMessage],
        };
        saveGroups(updatedGroups);
      }
    }
    setMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getCurrentMessages = () => {
    if (chatMode === 'global') {
      const allMessages = ws.globalMessages || [];
      return allMessages.filter((msg: any) => msg.gameMode === currentGameMode);
    } else if (chatMode === 'private' && selectedFriend) {
      return ws.privateMessages.get(selectedFriend) || [];
    } else if (chatMode === 'servers' && selectedRoom) {
      return ws.roomMessages.get(selectedRoom) || [];
    } else if (chatMode === 'group' && selectedGroup) {
      const group = groups.find(g => g.id === selectedGroup);
      return group?.messages || [];
    }
    return [];
  };

  const handleExpand = () => {
    setExpanded(!expanded);
    if (!expanded) {
      setUnreadCount(0);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  if (!expanded) {
    return (
      <button
        onClick={handleExpand}
        className="floating-bubble"
      >
        <div className="relative">
          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
      </button>
    );
  }

  return (
    <div className="floating-bubble expanded">
      <div className="chat-container w-full h-full p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-white">Chat</h3>
          <button onClick={handleExpand} className="text-white/60 hover:text-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex gap-1 mb-3 flex-wrap">
          <button
            onClick={() => setChatMode('global')}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all min-w-[60px] ${
              chatMode === 'global' ? `bg-gradient-to-r ${gradientFrom} ${gradientTo} text-white` : 'bg-white/10 text-white/60'
            }`}
          >
            {currentGameMode === 'minecraft' ? '⛏️' : '🏭'} Chung
          </button>
          <button
            onClick={() => setChatMode('private')}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all min-w-[60px] ${
              chatMode === 'private' ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white' : 'bg-white/10 text-white/60'
            }`}
          >
            Riêng tư
          </button>
          <button
            onClick={() => {
              setChatMode('servers');
              fetchRooms();
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all min-w-[60px] ${
              chatMode === 'servers' ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white' : 'bg-white/10 text-white/60'
            }`}
          >
            Servers
          </button>
          <button
            onClick={() => setChatMode('group')}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all min-w-[60px] ${
              chatMode === 'group' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' : 'bg-white/10 text-white/60'
            }`}
          >
            Nhóm
          </button>
        </div>

        {chatMode === 'private' && (
          <div className="mb-3">
            <select
              value={selectedFriend || ''}
              onChange={(e) => setSelectedFriend(Number(e.target.value) || null)}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none"
            >
              <option value="" className="bg-gray-800">Chọn bạn bè</option>
              {friends.map((f) => (
                <option key={f.id} value={f.id} className="bg-gray-800">
                  {f.displayName}
                </option>
              ))}
            </select>
          </div>
        )}

        {chatMode === 'servers' && (
          <div className="mb-3">
            {rooms.length === 0 ? (
              <p className="text-white/40 text-xs text-center py-2">Không có server nào đang hoạt động</p>
            ) : (
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {rooms.filter(r => r.isActive).map((room) => (
                  <button
                    key={room.id}
                    onClick={() => setSelectedRoom(room.id)}
                    className={`w-full p-2 rounded-lg text-left transition-all ${
                      selectedRoom === room.id 
                        ? 'bg-gradient-to-r from-orange-500/30 to-red-500/30 border border-orange-500/50' 
                        : 'bg-white/5 hover:bg-white/10 border border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white text-sm font-medium">{room.name}</p>
                        <p className="text-white/50 text-xs">Host: {room.hostName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-minecraft-green text-xs">{room.currentPlayers}/{room.maxPlayers}</p>
                        <p className="text-white/40 text-xs">{room.gameVersion}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {chatMode === 'global' && (
          <div className="mb-3">
            <p className="text-white/60 text-sm mb-1">Gửi tin nhắn đến:</p>
            <select
              value={selectedFriend || ''}
              onChange={(e) => setSelectedFriend(Number(e.target.value) || null)}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none"
            >
              <option value="" className="bg-gray-800">Tất cả (Chat chung)</option>
              {allUsers.map((u) => (
                <option key={u.id} value={u.id} className="bg-gray-800">
                  {u.displayName} (@{u.username})
                </option>
              ))}
            </select>
          </div>
        )}

        {chatMode === 'group' && (
          <div className="mb-3">
            {!showCreateGroup ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <select
                    value={selectedGroup || ''}
                    onChange={(e) => setSelectedGroup(e.target.value || null)}
                    className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none"
                  >
                    <option value="" className="bg-gray-800">Chọn nhóm</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id} className="bg-gray-800">
                        {g.name} ({g.members.length} thành viên)
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setShowCreateGroup(true)}
                    className="px-3 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg text-white text-sm"
                  >
                    +
                  </button>
                </div>
                {groups.length === 0 && (
                  <p className="text-white/40 text-xs text-center">Chưa có nhóm nào. Tạo nhóm mới!</p>
                )}
              </div>
            ) : (
              <div className="space-y-2 bg-white/5 p-3 rounded-lg">
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Tên nhóm..."
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder-white/40 focus:outline-none"
                />
                <p className="text-white/60 text-xs">Chọn thành viên:</p>
                <div className="max-h-24 overflow-y-auto space-y-1">
                  {friends.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => toggleMemberSelection(f.id)}
                      className={`w-full px-2 py-1 rounded text-left text-sm transition-all ${
                        selectedMembers.includes(f.id) 
                          ? 'bg-purple-500/30 text-white' 
                          : 'bg-white/5 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      {f.displayName}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowCreateGroup(false);
                      setNewGroupName('');
                      setSelectedMembers([]);
                    }}
                    className="flex-1 py-2 bg-white/10 rounded-lg text-white/60 text-sm"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={createGroup}
                    disabled={!newGroupName.trim() || selectedMembers.length === 0}
                    className="flex-1 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg text-white text-sm disabled:opacity-50"
                  >
                    Tạo
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-2 mb-3 max-h-48 min-h-32 bg-black/20 rounded-lg p-2">
          {getCurrentMessages().length === 0 ? (
            <p className="text-white/40 text-xs text-center py-8">
              {chatMode === 'servers' && !selectedRoom 
                ? 'Chọn một server để xem tin nhắn' 
                : 'Chưa có tin nhắn nào'}
            </p>
          ) : (
            getCurrentMessages().map((msg: any, index: number) => (
              <div
                key={msg.id || index}
                className={`flex ${msg.senderId === user.id ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 ${
                    msg.senderId === user.id
                      ? `bg-gradient-to-r ${gradientFrom} ${gradientTo} text-white`
                      : 'bg-white/10 text-white'
                  }`}
                >
                  {msg.senderId !== user.id && (
                    <p className="text-xs text-white/60 mb-0.5">{msg.senderName}</p>
                  )}
                  <p className="text-sm break-words">{msg.content}</p>
                  <p className="text-xs text-white/40 mt-0.5">
                    {formatTime(msg.timestamp || msg.createdAt)}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              chatMode === 'servers' && !selectedRoom 
                ? 'Chọn server trước...' 
                : 'Nhập tin nhắn...'
            }
            disabled={chatMode === 'servers' && !selectedRoom}
            className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder-white/40 focus:outline-none disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!message.trim() || (chatMode === 'servers' && !selectedRoom)}
            className={`px-4 py-2 bg-gradient-to-r ${gradientFrom} ${gradientTo} rounded-lg text-white text-sm disabled:opacity-50 transition-all`}
          >
            Gửi
          </button>
        </div>
      </div>
    </div>
  );
}
