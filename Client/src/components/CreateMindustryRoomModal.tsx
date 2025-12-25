import { useState } from 'react';

interface CreateMindustryRoomModalProps {
  userId: number;
  onClose: () => void;
}

interface CreatedRoom {
  id: number;
  name: string;
  hostIp: string | null;
  hostPort: number;
}

const MINDUSTRY_VERSIONS = [
  { group: '2024 - Hiện tại', versions: ['v8build153', 'v8build152', 'v8build151', 'v8build150', 'v8build149', 'v8build148', 'v8build147', 'v8build146'] },
  { group: '2023', versions: ['v8build145', 'v8build144', 'v8build143', 'v8build142', 'v8build141', 'v8build140', 'v8build139', 'v8build138', 'v8build137', 'v8build136', 'v8build135', 'v8build134', 'v8build133'] },
  { group: '2022', versions: ['v8build132', 'v8build131', 'v8build130', 'v8build129', 'v8build128', 'v8build127', 'v8build126', 'v7build146', 'v7build145', 'v7build144'] },
  { group: '2021', versions: ['v7build143', 'v7build142', 'v7build141', 'v7build140', 'v7build139', 'v7build138', 'v7build137', 'v7build136', 'v7build135', 'v7build134', 'v7build133', 'v7build132', 'v7build131'] },
  { group: '2020', versions: ['v7build130', 'v7build129', 'v7build128', 'v7build127', 'v7build126', 'v7build125', 'v7build124', 'v7build123', 'v7build122', 'v7build121', 'v7build120', 'v6build109', 'v6build108'] },
  { group: '2019', versions: ['v6build107', 'v6build106', 'v6build105', 'v6build104', 'v6build103', 'v6build102', 'v6build101', 'v6build100', 'v5build99', 'v5build98', 'v5build97', 'v5build96', 'v5build95', 'v5build94', 'v5build93'] },
];

export default function CreateMindustryRoomModal({ userId, onClose }: CreateMindustryRoomModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [gameVersion, setGameVersion] = useState('v8build153');
  const [hostPort, setHostPort] = useState(6567);
  const [mapName, setMapName] = useState('');
  const [gameMode, setGameMode] = useState<'survival' | 'attack' | 'pvp' | 'sandbox'>('survival');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdRoom, setCreatedRoom] = useState<CreatedRoom | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name,
          description,
          maxPlayers,
          gameVersion,
          hostPort,
          gameType: 'mindustry',
          mapName,
          mindustryGameMode: gameMode,
        }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create room');
      }

      setCreatedRoom({
        id: data.room?.id || data.id,
        name: name,
        hostIp: data.room?.hostIp || null,
        hostPort: hostPort,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openMindustryApp = () => {
    window.location.href = 'mindustry://';
  };

  if (createdRoom) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-white/10 rounded-2xl w-full max-w-md p-6">
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Tạo phòng thành công!</h2>
            <p className="text-white/70 mb-6">Phòng "{createdRoom.name}" đã được tạo. Bạn có thể mở Mindustry để bắt đầu host game.</p>
            
            <div className="space-y-3">
              <button
                onClick={openMindustryApp}
                className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-xl hover:opacity-90 transition-all font-bold text-lg flex items-center justify-center gap-3"
              >
                <span className="text-2xl">🏭</span>
                Mở Mindustry
              </button>
              
              <button
                onClick={() => { setCreatedRoom(null); onClose(); }}
                className="w-full py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all"
              >
                Đóng
              </button>
            </div>
            
            <p className="text-white/40 text-xs mt-4">
              Nếu Mindustry không mở, hãy đảm bảo ứng dụng đã được cài đặt trên thiết bị của bạn.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-white/10 rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-amber-600 rounded-xl flex items-center justify-center">
              <span className="text-2xl">🏭</span>
            </div>
            <h2 className="text-xl font-bold text-white">Tạo phòng Mindustry</h2>
          </div>
          <button onClick={() => { setCreatedRoom(null); onClose(); }} className="text-white/60 hover:text-white">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-white/70 text-sm mb-2">Tên phòng *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-orange-500"
              placeholder="VD: Survival Map"
              required
            />
          </div>

          <div>
            <label className="block text-white/70 text-sm mb-2">Mô tả</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-orange-500 resize-none"
              placeholder="Mô tả về phòng của bạn"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-white/70 text-sm mb-2">Chế độ chơi</label>
            <div className="grid grid-cols-2 gap-2">
              {(['survival', 'attack', 'pvp', 'sandbox'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setGameMode(mode)}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    gameMode === mode
                      ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white'
                      : 'bg-white/10 text-white/60 hover:bg-white/20'
                  }`}
                >
                  {mode === 'survival' && '🛡️ Survival'}
                  {mode === 'attack' && '⚔️ Attack'}
                  {mode === 'pvp' && '🎯 PvP'}
                  {mode === 'sandbox' && '🏗️ Sandbox'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-white/70 text-sm mb-2">Tên Map (tùy chọn)</label>
            <input
              type="text"
              value={mapName}
              onChange={(e) => setMapName(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-orange-500"
              placeholder="VD: Glaciated Fields"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-white/70 text-sm mb-2">Số người tối đa</label>
              <select
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(Number(e.target.value))}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-orange-500"
              >
                {[2, 4, 6, 8, 10, 12, 16, 20, 24].map((n) => (
                  <option key={n} value={n} className="bg-gray-800">{n} người</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-white/70 text-sm mb-2">Version</label>
              <select
                value={gameVersion}
                onChange={(e) => setGameVersion(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-orange-500"
              >
                {MINDUSTRY_VERSIONS.map((group) => (
                  <optgroup key={group.group} label={group.group} className="bg-gray-800">
                    {group.versions.map((v) => (
                      <option key={v} value={v} className="bg-gray-800">{v}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-white/70 text-sm mb-2">Port (mặc định: 6567)</label>
            <input
              type="number"
              value={hostPort}
              onChange={(e) => setHostPort(Number(e.target.value))}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-orange-500"
              min={1024}
              max={65535}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-lg hover:opacity-90 transition-all disabled:opacity-50 font-medium"
            >
              {loading ? 'Đang tạo...' : 'Tạo phòng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
