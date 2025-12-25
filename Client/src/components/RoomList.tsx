import { useState, useEffect } from 'react';
import { useGameMode } from '../contexts/GameModeContext';

interface Room {
  id: number;
  name: string;
  description: string | null;
  hostId: number;
  maxPlayers: number;
  currentPlayers: number;
  gameVersion: string;
  hostPort: number;
  isActive: boolean;
  hostName?: string;
  hostIp?: string;
  relayAddress?: string;
  gameType?: string;
  mapName?: string;
  mindustryGameMode?: string;
}

const generateMinecraftDeepLink = (room: Room, type: 'add' | 'connect' = 'add') => {
  let serverAddress = window.location.hostname;
  let port = room.hostPort || 19132;
  
  if (room.relayAddress) {
    const parts = room.relayAddress.split(':');
    serverAddress = parts[0];
    if (parts[1]) {
      port = parseInt(parts[1], 10) || port;
    }
  }
  
  const serverName = encodeURIComponent(room.name);
  
  if (type === 'connect') {
    return `minecraft:?serverAddress=${serverAddress}&serverPort=${port}`;
  }
  return `minecraft:?addExternalServer=${serverName}|${serverAddress}:${port}`;
};

const openMinecraft = (room: Room) => {
  const deepLink = generateMinecraftDeepLink(room, 'add');
  window.location.href = deepLink;
};

interface RoomListProps {
  userId: number;
  ws: any;
}

export default function RoomList({ userId, ws }: RoomListProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<number | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const { gameMode } = useGameMode();

  const fetchRooms = async () => {
    try {
      const res = await fetch(`/api/rooms?gameType=${gameMode}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setRooms(data.rooms);
      }
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 10000);
    
    const handleRoomsChanged = () => fetchRooms();
    window.addEventListener('roomsChanged', handleRoomsChanged);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('roomsChanged', handleRoomsChanged);
    };
  }, [gameMode]);

  const handleJoin = async (room: Room) => {
    setJoining(room.id);
    try {
      const res = await fetch(`/api/rooms/${room.id}/join`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        ws.joinRoom(room.id);
        setSelectedRoom(room);
      }
    } catch (error) {
      console.error('Failed to join room:', error);
    } finally {
      setJoining(null);
    }
  };

  const openMindustry = (room: Room) => {
    const serverAddress = room.relayAddress?.split(':')[0] || window.location.hostname;
    const port = room.relayAddress?.split(':')[1] || room.hostPort || 6567;
    
    // Mindustry deep link format
    const mindustryUrl = `mindustry://connect/${serverAddress}:${port}`;
    window.location.href = mindustryUrl;
  };

  const handleQuickJoin = async (room: Room) => {
    setJoining(room.id);
    try {
      const res = await fetch(`/api/rooms/${room.id}/join`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        ws.joinRoom(room.id);
        
        // Mở game tương ứng với deep link
        if (room.gameType === 'mindustry') {
          openMindustry(room);
        } else {
          openMinecraft(room);
        }
        
        setSelectedRoom(room);
      }
    } catch (error) {
      console.error('Failed to join room:', error);
    } finally {
      setJoining(null);
    }
  };

  const handleLeave = async () => {
    if (!selectedRoom) return;
    try {
      await fetch(`/api/rooms/${selectedRoom.id}/leave`, {
        method: 'POST',
        credentials: 'include',
      });
      ws.leaveRoom(selectedRoom.id);
      setSelectedRoom(null);
      fetchRooms();
    } catch (error) {
      console.error('Failed to leave room:', error);
    }
  };

  const handleDelete = async (roomId: number) => {
    try {
      await fetch(`/api/rooms/${roomId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      fetchRooms();
    } catch (error) {
      console.error('Failed to delete room:', error);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-10">
        <div className="w-10 h-10 border-3 border-minecraft-green border-t-transparent rounded-full animate-spin mx-auto"></div>
      </div>
    );
  }

  if (selectedRoom) {
    const isMindustry = selectedRoom.gameType === 'mindustry';
    
    return (
      <div className="glass-card p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold text-white">{selectedRoom.name}</h3>
            <p className="text-white/60 text-sm">{selectedRoom.description}</p>
          </div>
          <button
            onClick={handleLeave}
            className="px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30"
          >
            Rời phòng
          </button>
        </div>

        {!isMindustry && (
          <>
            <button
              onClick={() => openMinecraft(selectedRoom)}
              className="w-full py-4 mb-4 bg-gradient-to-r from-green-600 to-minecraft-green rounded-xl font-bold text-white text-lg flex items-center justify-center gap-3 hover:from-green-500 hover:to-minecraft-green/90 transition-all shadow-lg shadow-green-500/20"
            >
              <span className="text-2xl">🎮</span>
              <span>Mở Minecraft & Kết nối ngay</span>
            </button>

            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-4">
              <h4 className="text-green-300 text-sm font-bold mb-3 flex items-center gap-2">
                🎮 Hướng dẫn kết nối Minecraft (P2P Relay)
              </h4>
              
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2 mb-3">
                <p className="text-blue-200 text-xs">
                  ✨ <strong>Không cần cấu hình port!</strong> Server relay tự động xử lý mọi thứ.
                </p>
              </div>
              
              <div className="space-y-3">
                <div className="bg-green-500/20 rounded-lg p-3">
                  <p className="text-green-200 text-xs font-semibold mb-2">👤 Nếu bạn là HOST (tạo phòng):</p>
                  <ol className="text-white/80 text-xs space-y-1 ml-4 list-decimal">
                    <li>Bấm nút "Mở Minecraft" ở trên</li>
                    <li>Mở game Minecraft</li>
                    <li>Vào <span className="text-green-300 font-medium">Play → Tạo thế giới mới</span></li>
                    <li>✅</li>
                  </ol>
                </div>
                
                <div className="bg-blue-500/20 rounded-lg p-3">
                  <p className="text-blue-200 text-xs font-semibold mb-2">👥 Nếu bạn THAM GIA phòng:</p>
                  <ol className="text-white/80 text-xs space-y-1 ml-4 list-decimal">
                    <li>Bấm nút "Mở Minecraft" ở trên</li>
                    <li>Minecraft sẽ tự động mở và thêm server</li>
                    <li>Vào <span className="text-blue-300 font-medium">Play → Servers</span></li>
                    <li>✅ Chọn server và tham gia - kết nối tự động!</li>
                  </ol>
                </div>
              </div>
            </div>
          </>
        )}

        {isMindustry && (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 mb-4">
            <h4 className="text-orange-300 text-sm font-bold mb-3 flex items-center gap-2">
              🏭 Hướng dẫn kết nối Mindustry (P2P Relay)
            </h4>
            
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2 mb-3">
              <p className="text-blue-200 text-xs">
                ✨ <strong>Không cần cấu hình port!</strong> Server relay tự động xử lý mọi thứ.
              </p>
            </div>
            
            <div className="space-y-3">
              <div className="bg-orange-500/20 rounded-lg p-3">
                <p className="text-orange-200 text-xs font-semibold mb-2">👤 Nếu bạn là HOST (tạo phòng):</p>
                <ol className="text-white/80 text-xs space-y-1 ml-4 list-decimal">
                  <li>Mở game Mindustry</li>
                  <li>Vào <span className="text-orange-300 font-medium">Play → Host Game</span></li>
                  <li>Chọn map và mode, sau đó tạo phòng</li>
                  <li>✅ Xong! Server relay sẽ tự động chuyển tiếp kết nối</li>
                </ol>
              </div>
              
              <div className="bg-green-500/20 rounded-lg p-3">
                <p className="text-green-200 text-xs font-semibold mb-2">👥 Nếu bạn THAM GIA phòng:</p>
                <ol className="text-white/80 text-xs space-y-1 ml-4 list-decimal">
                  <li>Mở game Mindustry</li>
                  <li>Vào <span className="text-green-300 font-medium">Play → Join Game</span></li>
                  <li>Phòng sẽ hiển thị trong <span className="text-green-300 font-medium">danh sách LAN</span></li>
                  <li>✅ Bấm vào phòng để tham gia - kết nối tự động!</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white/5 rounded-xl p-4 mb-4">
          {!isMindustry && (
            <>
              <h4 className="font-medium text-minecraft-green mb-2">🎮 Kết nối P2P Relay</h4>
              
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-3">
                <p className="text-blue-300 text-xs font-medium mb-2 flex items-center gap-2">
                  <span>ℹ️</span>
                  <span>Hệ thống P2P Relay - Không cần cấu hình gì!</span>
                </p>
                <div className="text-white/70 text-xs space-y-2">
                  <p>
                    ✅ <strong>Không cần port forwarding</strong> - Server relay sẽ tự động chuyển tiếp dữ liệu
                  </p>
                  <p>
                    ✅ <strong>Không cần cấu hình router</strong> - Chỉ cần mở game và chơi
                  </p>
                  <p>
                    ✅ <strong>Hoạt động qua mọi mạng</strong> - Mobile data, WiFi, LAN đều được
                  </p>
                  <div className="mt-2 pt-2 border-t border-white/10">
                    <p className="text-white/50 italic">
                      Server relay làm cầu nối giữa Host và người chơi, tất cả dữ liệu game được chuyển tiếp tự động.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-black/40 rounded-lg p-3 border border-minecraft-green/20 mb-3">
                <div className="grid grid-cols-[80px_1fr] gap-2 text-xs">
                  <span className="text-white/60">Address:</span>
                  <span className="text-minecraft-green font-mono break-all">{selectedRoom.relayAddress?.split(':')[0] || window.location.hostname}</span>
                  
                  <span className="text-white/60">Port:</span>
                  <span className="text-minecraft-green font-mono">{selectedRoom.relayAddress?.split(':')[1] || selectedRoom.hostPort}</span>
                  
                  <span className="text-white/60">Type:</span>
                  <span className="text-blue-300">P2P Relay</span>
                </div>
              </div>
            </>
          )}
          
          {isMindustry && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <p className="text-blue-300 text-xs font-medium mb-2">ℹ️ Hệ thống P2P Relay</p>
              <p className="text-white/70 text-xs mb-2">
                Phòng này sử dụng công nghệ P2P relay. Không cần cấu hình port forwarding, 
                phòng sẽ tự động hiển thị trong danh sách LAN của Mindustry.
              </p>
              {selectedRoom.mapName && (
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/10">
                  <span className="text-white/60 text-xs">Map:</span>
                  <span className="text-orange-300 text-xs">{selectedRoom.mapName}</span>
                  {selectedRoom.mindustryGameMode && (
                    <>
                      <span className="text-white/40">•</span>
                      <span className="text-white/60 text-xs">Mode:</span>
                      <span className="text-orange-300 text-xs capitalize">{selectedRoom.mindustryGameMode}</span>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-2 mt-3">
            <p className="text-yellow-200 text-xs">
              ⚠️ Đảm bảo cả host và bạn đều online để kết nối hoạt động
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-white/60 text-sm">
          <span className="online-indicator"></span>
          <span>{selectedRoom.currentPlayers}/{selectedRoom.maxPlayers} người chơi</span>
          <span className="mx-2">|</span>
          <span>Version: {selectedRoom.gameVersion}</span>
        </div>
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="text-center py-10 glass-card">
        <div className="w-16 h-16 mx-auto mb-4 bg-white/10 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <p className="text-white/60">Chưa có phòng nào</p>
        <p className="text-white/40 text-sm mt-1">Hãy tạo phòng đầu tiên!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rooms.map((room) => (
        <div key={room.id} className="room-card">
          <div className="flex justify-between items-start">
            <div className="flex-1">
                <h3 className="font-semibold text-white">{room.name}</h3>
                <p className="text-sm text-white/60">{room.description}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-white/50">
                  <span>Host: {room.hostName}</span>
                  <span>{room.currentPlayers}/{room.maxPlayers} người</span>
                  <span>v{room.gameVersion}</span>
                </div>
                <div className="mt-2 p-2 bg-gradient-to-r from-blue-500/10 to-minecraft-green/10 border border-blue-500/20 rounded text-xs">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    <p className="text-white/80 font-medium">P2P Relay Active</p>
                  </div>
                  <p className="text-white/60">Port: <span className="text-minecraft-green font-mono">{room.hostPort}</span></p>
                </div>
              </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleQuickJoin(room)}
                disabled={joining === room.id || room.currentPlayers >= room.maxPlayers}
                className="minecraft-btn text-sm py-2 disabled:opacity-50 flex items-center gap-2"
              >
                {joining === room.id ? '...' : (
                  <>
                    <span>🎮</span>
                    <span>Chơi ngay</span>
                  </>
                )}
              </button>
              <div className="flex gap-2">
                {room.hostId === userId && (
                  <button
                    onClick={() => handleDelete(room.id)}
                    className="px-3 py-1 bg-red-500/20 text-red-300 rounded-lg text-xs hover:bg-red-500/30"
                  >
                    Xóa
                  </button>
                )}
                <button
                  onClick={() => handleJoin(room)}
                  disabled={joining === room.id || room.currentPlayers >= room.maxPlayers}
                  className="px-3 py-1 bg-white/10 text-white/70 rounded-lg text-xs hover:bg-white/20 disabled:opacity-50"
                >
                  Chi tiết
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}