import { useState } from 'react';

export default function MindustryOfficialServers() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const servers = [
    {
      id: 1,
      name: 'abcxyz server',
      image: '/IMG_3419.png',
      description: 'Server Mindustry Việt Nam chính thức cũng như là Chủ sở hữu ứng dụng này',
      website: 'https://abcxyzdustry.github.io/abcxyz-donate/',
    },
  ];

  return (
    <div>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <span className="text-2xl">🏭</span> Official Mindustry Servers
        </h3>
        <p className="text-white/50 text-sm mt-1">Server chính thức được quản lý bởi abcxyz</p>
      </div>

      <div className="space-y-4">
        {servers.map((server) => (
          <div
            key={server.id}
            className="glass-card p-6 rounded-2xl border border-orange-500/20 hover:border-orange-500/40 transition-all"
          >
            <div className="flex items-start gap-4 mb-4">
              <img 
                src={server.image} 
                alt={server.name} 
                className="w-20 h-20 rounded-xl object-cover shadow-lg cursor-pointer hover:scale-105 transition-transform"
                onClick={() => setSelectedImage(server.image)}
              />
              <div className="flex-1">
                <h4 className="text-white font-bold text-xl mb-1">{server.name}</h4>
                <p className="text-white/70 text-sm mb-3">{server.description}</p>
                <a
                  href={server.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:opacity-90 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg transition-all"
                >
                  <span>🌐</span> Truy cập Website
                </a>
              </div>
            </div>
            
            <div 
              className="w-full rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setSelectedImage(server.image)}
            >
              <img
                src={server.image}
                alt={server.name}
                className="w-full h-auto object-contain"
                onError={(e) => {
                  e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="400"%3E%3Crect width="800" height="400" fill="%23333"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" fill="%23666" font-size="24"%3ENo Image Available%3C/text%3E%3C/svg%3E';
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/95 z-[60] flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 text-white/80 hover:text-white text-4xl z-10"
          >
            &times;
          </button>
          <img
            src={selectedImage}
            alt="Full size"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
