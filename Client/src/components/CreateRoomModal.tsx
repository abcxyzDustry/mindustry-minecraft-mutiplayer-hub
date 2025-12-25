import { useState } from 'react';

interface CreateRoomModalProps {
  userId: number;
  onClose: () => void;
}

const MINECRAFT_VERSIONS = [
  { group: '2024 - Hiện tại', versions: ['1.21.51', '1.21.50', '1.21.44', '1.21.43', '1.21.41', '1.21.40', '1.21.31', '1.21.30', '1.21.22', '1.21.21', '1.21.20', '1.21.2', '1.21.1', '1.21.0'] },
  { group: '2023', versions: ['1.20.81', '1.20.80', '1.20.73', '1.20.72', '1.20.71', '1.20.70', '1.20.62', '1.20.61', '1.20.60', '1.20.51', '1.20.50', '1.20.41', '1.20.40', '1.20.32', '1.20.31', '1.20.30', '1.20.15', '1.20.14', '1.20.13', '1.20.12', '1.20.10', '1.20.1', '1.20.0'] },
  { group: '2022', versions: ['1.19.83', '1.19.80', '1.19.73', '1.19.72', '1.19.71', '1.19.70', '1.19.63', '1.19.62', '1.19.60', '1.19.51', '1.19.50', '1.19.41', '1.19.40', '1.19.31', '1.19.30', '1.19.22', '1.19.21', '1.19.20', '1.19.11', '1.19.10', '1.19.2', '1.19.0'] },
  { group: '2021', versions: ['1.18.33', '1.18.32', '1.18.31', '1.18.30', '1.18.12', '1.18.11', '1.18.10', '1.18.2', '1.18.1', '1.18.0', '1.17.41', '1.17.40', '1.17.34', '1.17.33', '1.17.32', '1.17.31', '1.17.30', '1.17.11', '1.17.10', '1.17.2', '1.17.1', '1.17.0'] },
  { group: '2020', versions: ['1.16.221', '1.16.220', '1.16.210', '1.16.201', '1.16.200', '1.16.101', '1.16.100', '1.16.62', '1.16.61', '1.16.60', '1.16.42', '1.16.40', '1.16.21', '1.16.20', '1.16.10', '1.16.1', '1.16.0'] },
  { group: '2019', versions: ['1.15.0', '1.14.60', '1.14.41', '1.14.30', '1.14.25', '1.14.20', '1.14.1', '1.14.0', '1.13.3', '1.13.2', '1.13.1', '1.13.0', '1.12.1', '1.12.0'] },
  { group: '2018', versions: ['1.11.4', '1.11.3', '1.11.2', '1.11.1', '1.11.0', '1.10.0', '1.9.0', '1.8.1', '1.8.0', '1.7.1', '1.7.0', '1.6.2', '1.6.1', '1.6.0', '1.5.3', '1.5.2', '1.5.1', '1.5.0'] },
  { group: '2017', versions: ['1.4.4', '1.4.3', '1.4.2', '1.4.1', '1.4.0', '1.3.0', '1.2.16', '1.2.15', '1.2.14', '1.2.13', '1.2.11', '1.2.10', '1.2.9', '1.2.8', '1.2.6', '1.2.5', '1.2.3', '1.2.2', '1.2.1', '1.2.0', '1.1.7', '1.1.5', '1.1.4', '1.1.3', '1.1.2', '1.1.1', '1.1.0'] },
  { group: '2016', versions: ['1.0.9', '1.0.8', '1.0.7', '1.0.6', '1.0.5', '1.0.4', '1.0.3', '1.0.2', '1.0.0', '0.16.2', '0.16.1', '0.16.0', '0.15.10', '0.15.9', '0.15.8', '0.15.7', '0.15.6', '0.15.4', '0.15.3', '0.15.2', '0.15.1', '0.15.0', '0.14.3', '0.14.2', '0.14.1', '0.14.0'] },
  { group: '2015', versions: ['0.13.2', '0.13.1', '0.13.0', '0.12.3', '0.12.2', '0.12.1', '0.12.0', '0.11.1', '0.11.0', '0.10.5', '0.10.4', '0.10.0', '0.9.5', '0.9.4', '0.9.2', '0.9.1', '0.9.0'] },
  { group: '2014', versions: ['0.8.1', '0.8.0', '0.7.6', '0.7.5', '0.7.4', '0.7.3', '0.7.2', '0.7.1', '0.7.0', '0.6.1', '0.6.0'] },
  { group: '2013', versions: ['0.5.0', '0.4.0', '0.3.3', '0.3.2', '0.3.0', '0.2.2', '0.2.1', '0.2.0'] },
  { group: '2011-2012', versions: ['0.1.3', '0.1.2', '0.1.1', '0.1.0'] },
];

export default function CreateRoomModal({ userId, onClose }: CreateRoomModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(5);
  const [gameVersion, setGameVersion] = useState('1.21.51');
  const [hostPort, setHostPort] = useState(19132);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create room');
      }

      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="glass-card w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Tạo phòng Minecraft</h2>
          <button onClick={onClose} className="text-white/60 hover:text-white">
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
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-minecraft-green"
              placeholder="VD: Survival World"
              required
            />
          </div>

          <div>
            <label className="block text-white/70 text-sm mb-2">Mô tả</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-minecraft-green resize-none"
              placeholder="Mô tả về phòng của bạn"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-white/70 text-sm mb-2">Số người tối đa</label>
              <select
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(Number(e.target.value))}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-minecraft-green"
              >
                {[2, 3, 4, 5, 6, 8, 10].map((n) => (
                  <option key={n} value={n} className="bg-gray-800">{n} người</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-white/70 text-sm mb-2">Version</label>
              <select
                value={gameVersion}
                onChange={(e) => setGameVersion(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-minecraft-green"
              >
                {MINECRAFT_VERSIONS.map((group) => (
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
            <label className="block text-white/70 text-sm mb-2">Port (mặc định: 19132)</label>
            <input
              type="number"
              value={hostPort}
              onChange={(e) => setHostPort(Number(e.target.value))}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-minecraft-green"
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
              className="flex-1 minecraft-btn disabled:opacity-50"
            >
              {loading ? 'Đang tạo...' : 'Tạo phòng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
