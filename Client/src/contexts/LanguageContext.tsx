import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'vi' | 'en';

interface Translations {
  [key: string]: {
    vi: string;
    en: string;
  };
}

const translations: Translations = {
  // Auth & Login
  login: { vi: 'Đăng nhập', en: 'Login' },
  register: { vi: 'Đăng ký', en: 'Register' },
  username: { vi: 'Tên đăng nhập', en: 'Username' },
  password: { vi: 'Mật khẩu', en: 'Password' },
  enterUsername: { vi: 'Nhập tên đăng nhập', en: 'Enter username' },
  enterPassword: { vi: 'Nhập mật khẩu', en: 'Enter password' },
  yourNameSeen: { vi: 'Tên bạn bè sẽ thấy', en: 'Name friends will see' },
  processing: { vi: 'Đang xử lý...', en: 'Processing...' },
  playWithFriends: { vi: 'Chơi Mindustry & Minecraft cùng bạn bè', en: 'Play Mindustry & Minecraft with friends' },
  
  // Game Selection
  selectGame: { vi: 'Chọn game bạn muốn chơi', en: 'Select the game you want to play' },
  selectYourGame: { vi: 'Hãy chọn game để bắt đầu!', en: 'Choose your game to get started!' },
  continue: { vi: 'Tiếp tục', en: 'Continue' },
  roomsCommunityMaps: { vi: 'Phòng chơi, Cộng đồng, Maps/Mods', en: 'Rooms, Community, Maps/Mods' },
  roomsCommunitySchematics: { vi: 'Phòng chơi, Cộng đồng, Schematic/Logic/Map', en: 'Rooms, Community, Schematic/Logic/Map' },
  
  // Navigation
  rooms: { vi: 'Phòng chơi', en: 'Rooms' },
  community: { vi: 'Cộng đồng', en: 'Community' },
  friends: { vi: 'Bạn bè', en: 'Friends' },
  logout: { vi: 'Đăng xuất', en: 'Logout' },
  
  // Room Management
  createRoom: { vi: 'Tạo phòng', en: 'Create Room' },
  roomList: { vi: 'Danh sách phòng', en: 'Room List' },
  joinNow: { vi: 'Vào chơi ngay', en: 'Join Now' },
  maxPlayers: { vi: 'Số người', en: 'Max Players' },
  gameVersion: { vi: 'Phiên bản', en: 'Version' },
  roomName: { vi: 'Tên phòng', en: 'Room Name' },
  description: { vi: 'Mô tả', en: 'Description' },
  describeRoom: { vi: 'Mô tả về phòng của bạn', en: 'Describe your room' },
  exampleRoomName: { vi: 'VD: Survival với bạn bè', en: 'E.g: Survival with friends' },
  whenCreate: { vi: 'Khi bạn tạo phòng, bạn bè sẽ tự động thấy và có thể vào chơi ngay!', en: 'When you create a room, friends will automatically see it and can join right away!' },
  noRooms: { vi: 'Chưa có phòng nào', en: 'No rooms yet' },
  createFirst: { vi: 'Hãy tạo phòng đầu tiên!', en: 'Create the first room!' },
  playingNow: { vi: 'Đang chơi', en: 'Playing now' },
  officialServer: { vi: 'Server chính thức', en: 'Official Server' },
  officialServers: { vi: 'Server chính thức', en: 'Official Servers' },
  
  // Community
  minecraftCommunity: { vi: 'Cộng đồng Minecraft', en: 'Minecraft Community' },
  mindustryCommunity: { vi: 'Cộng đồng Mindustry', en: 'Mindustry Community' },
  shareAndConnect: { vi: 'Chia sẻ, thảo luận và kết nối với người chơi khác', en: 'Share, discuss and connect with other players' },
  newPost: { vi: 'Đăng bài mới', en: 'New Post' },
  posting: { vi: 'Đang đăng...', en: 'Posting...' },
  post: { vi: 'Đăng bài', en: 'Post' },
  cancel: { vi: 'Hủy', en: 'Cancel' },
  category: { vi: 'Danh mục', en: 'Category' },
  shareSomething: { vi: 'Chia sẻ điều gì đó với cộng đồng...', en: 'Share something with the community...' },
  addImage: { vi: 'Thêm ảnh (PNG/JPG)', en: 'Add image (PNG/JPG)' },
  noPosts: { vi: 'Chưa có bài đăng nào', en: 'No posts yet' },
  beFirst: { vi: 'Hãy là người đầu tiên chia sẻ!', en: 'Be the first to share!' },
  delete: { vi: 'Xóa', en: 'Delete' },
  confirmDelete: { vi: 'Bạn có chắc muốn xóa bài đăng này?', en: 'Are you sure you want to delete this post?' },
  noComments: { vi: 'Chưa có bình luận', en: 'No comments yet' },
  writeComment: { vi: 'Viết bình luận...', en: 'Write a comment...' },
  send: { vi: 'Gửi', en: 'Send' },
  
  // Time
  justNow: { vi: 'Vừa xong', en: 'Just now' },
  minutesAgo: { vi: 'phút trước', en: 'minutes ago' },
  hoursAgo: { vi: 'giờ trước', en: 'hours ago' },
  daysAgo: { vi: 'ngày trước', en: 'days ago' },
  
  // Categories
  anonymous: { vi: 'Ẩn danh', en: 'Anonymous' },
  all: { vi: 'Tất cả', en: 'All' },
  general: { vi: 'Chung', en: 'General' },
  builds: { vi: 'Công trình', en: 'Builds' },
  seeds: { vi: 'Seeds', en: 'Seeds' },
  modsAddons: { vi: 'Mods & Addons', en: 'Mods & Addons' },
  help: { vi: 'Hỏi đáp', en: 'Q&A' },
  servers: { vi: 'Server', en: 'Servers' },
  
  // Chat
  chat: { vi: 'Chat', en: 'Chat' },
  global: { vi: 'Chung', en: 'Global' },
  private: { vi: 'Riêng tư', en: 'Private' },
  groups: { vi: 'Nhóm', en: 'Groups' },
  selectFriend: { vi: 'Chọn bạn bè', en: 'Select friend' },
  selectPlayer: { vi: 'Chọn người chơi', en: 'Select player' },
  otherPlayers: { vi: 'Người chơi khác:', en: 'Other players:' },
  reconnecting: { vi: 'Đang kết nối lại...', en: 'Reconnecting...' },
  typeMessage: { vi: 'Nhập tin nhắn...', en: 'Type a message...' },
  noMessages: { vi: 'Chưa có tin nhắn nào', en: 'No messages yet' },
  
  // Profile
  profile: { vi: 'Hồ sơ', en: 'Profile' },
  editProfile: { vi: 'Chỉnh sửa hồ sơ', en: 'Edit Profile' },
  displayName: { vi: 'Tên hiển thị', en: 'Display Name' },
  bio: { vi: 'Giới thiệu', en: 'Bio' },
  save: { vi: 'Lưu', en: 'Save' },
  saving: { vi: 'Đang lưu...', en: 'Saving...' },
  addFriend: { vi: 'Kết bạn', en: 'Add Friend' },
  requestSent: { vi: 'Đã gửi lời mời', en: 'Request Sent' },
  alreadyFriend: { vi: 'Đã là bạn bè', en: 'Already Friends' },
  
  // Errors & Validation
  onlyPngJpg: { vi: 'Chỉ chấp nhận file PNG hoặc JPG', en: 'Only PNG or JPG files allowed' },
  fileTooLarge: { vi: 'File quá lớn. Tối đa 5MB', en: 'File too large. Max 5MB' },
  uploadFailed: { vi: 'Không thể tải ảnh lên', en: 'Failed to upload image' },
  
  // Friends
  friendList: { vi: 'Danh sách bạn bè', en: 'Friend List' },
  friendRequests: { vi: 'Lời mời kết bạn', en: 'Friend Requests' },
  searchUsers: { vi: 'Tìm người dùng', en: 'Search Users' },
  accept: { vi: 'Chấp nhận', en: 'Accept' },
  online: { vi: 'Trực tuyến', en: 'Online' },
  offline: { vi: 'Ngoại tuyến', en: 'Offline' },
  allPlayers: { vi: 'Tất cả người chơi', en: 'All Players' },
  searchPlayers: { vi: 'Tìm kiếm người chơi...', en: 'Search players...' },
  noPlayersFound: { vi: 'Không tìm thấy người chơi', en: 'No players found' },
  tryDifferentFilter: { vi: 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm', en: 'Try changing filter or search keywords' },
  dating: { vi: 'Hẹn hò', en: 'Dating' },
  
  // Groups
  createGroup: { vi: 'Tạo nhóm mới', en: 'Create New Group' },
  groupName: { vi: 'Tên nhóm', en: 'Group Name' },
  selectMembers: { vi: 'Chọn thành viên', en: 'Select Members' },
  noGroups: { vi: 'Chưa có nhóm nào', en: 'No groups yet' },
  createFirstGroup: { vi: 'Tạo nhóm đầu tiên!', en: 'Create your first group!' },
  members: { vi: 'thành viên', en: 'members' },
  
  // Notifications
  notifications: { vi: 'Thông báo', en: 'Notifications' },
  noNotifications: { vi: 'Không có thông báo mới', en: 'No new notifications' },
  
  // General
  loading: { vi: 'Đang tải...', en: 'Loading...' },
  connecting: { vi: 'Đang kết nối...', en: 'Connecting...' },
  close: { vi: 'Đóng', en: 'Close' },
  leaveRoom: { vi: 'Rời phòng', en: 'Leave Room' },
  players: { vi: 'người chơi', en: 'players' },
  creating: { vi: 'Đang tạo...', en: 'Creating...' },
  
  // Game Check
  gameNotInstalled: { vi: 'Chưa cài đặt game', en: 'Game not installed' },
  pleaseInstallGame: { vi: 'Vui lòng cài đặt', en: 'Please install' },
  downloadGame: { vi: 'Tải game', en: 'Download Game' },
  openGame: { vi: 'Mở game', en: 'Open Game' },
  openMindustry: { vi: 'Mở Mindustry', en: 'Open Mindustry' },
  openMinecraft: { vi: 'Mở Minecraft', en: 'Open Minecraft' },
  roomCreated: { vi: 'Phòng đã được tạo!', en: 'Room created!' },
  
  // Mindustry
  mindustryRooms: { vi: 'Phòng Mindustry', en: 'Mindustry Rooms' },
  createMindustryRoom: { vi: 'Tạo phòng Mindustry', en: 'Create Mindustry Room' },
  gameMode: { vi: 'Chế độ chơi', en: 'Game Mode' },
  mapName: { vi: 'Tên Map', en: 'Map Name' },
  port: { vi: 'Port', en: 'Port' },
  survival: { vi: 'Sinh tồn', en: 'Survival' },
  attack: { vi: 'Tấn công', en: 'Attack' },
  pvp: { vi: 'PvP', en: 'PvP' },
  sandbox: { vi: 'Sandbox', en: 'Sandbox' },
  
  // Official Server
  officialServerTitle: { vi: 'Server Mindustry Việt Nam chính thức', en: 'Official Vietnam Mindustry Server' },
  officialServerDesc: { vi: 'Chủ sở hữu ứng dụng này', en: 'Owner of this application' },
  joinOfficialServer: { vi: 'Tham gia qua server công khai trong game Mindustry', en: 'Join via public server in Mindustry game' },
  joinServer: { vi: 'Tham gia', en: 'Join Server' },
  visitWebsite: { vi: 'Truy cập website', en: 'Visit Website' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('app-language');
    return (saved as Language) || 'en';
  });

  useEffect(() => {
    localStorage.setItem('app-language', language);
    document.documentElement.setAttribute('lang', language);
  }, [language]);

  const t = (key: string): string => {
    const translation = translations[key];
    if (!translation) return key;
    return translation[language] || translation['vi'] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
