# Mindustry & Minecraft Multiplayer Hub

## Overview
Ứng dụng hỗ trợ chơi Mindustry và Minecraft PE multiplayer với chat thời gian thực, tương tự Omlet Arcade. Cho phép người chơi kết nối với nhau mà không cần cùng mạng WiFi thông qua công nghệ P2P relay overlay.

## Tính năng chính
- **Multiplayer Minecraft PE**: Tạo phòng và kết nối với người chơi khác qua internet
- **Multiplayer Mindustry**: Hỗ trợ kết nối Mindustry qua P2P relay
- **Chat thời gian thực**: Nhắn tin với bạn bè và trong phòng game
- **Hệ thống kết bạn**: Thêm bạn, chat riêng tư, hiển thị tất cả users (online/offline)
- **P2P Relay**: Công nghệ NAT traversal cho kết nối multiplayer
- **Cross-platform**: Hỗ trợ Web, Android (Expo), Windows (Electron)
- **Upload ảnh Profile**: Upload ảnh PNG/JPG làm avatar (tối đa 5MB)
- **Upload Media Community**: Đăng bài kèm ảnh hoặc video (MP4, WebM, MOV - tối đa 50MB)
- **Map-Addon Tab**: Chia sẻ mods, maps, addons Minecraft với khả năng tải xuống
- **Admin Panel**: Tài khoản admin có panel quản lý riêng
- **Thông báo từ Admin**: Nhận thông báo trực tiếp từ admin qua biểu tượng chuông
- **Admin trong bạn bè**: Admin tự động hiển thị trong danh sách bạn bè với tag [admin] màu đỏ
- **Music Player**: Phát nhạc nền tự động sau khi đăng nhập (Web + Mobile)

## Kiến trúc

### Frontend Web (Client/)
- React + TypeScript + Vite
- Tailwind CSS cho styling
- WebSocket cho real-time communication

### Frontend Mobile (mobile/) - Expo React Native
- Expo SDK 52 + React Native
- Expo Router cho navigation
- React Native components
- AsyncStorage cho local storage

### Backend (server/)
- Node.js + Express
- WebSocket server cho chat và P2P signaling
- UDP relay cho Minecraft PE traffic
- Replit DB cho lưu trữ dữ liệu

### P2P Relay (server/p2p-relay.ts)
- Quản lý các relay room
- NAT traversal qua WebSocket signaling
- UDP packet forwarding cho game traffic

## Cấu trúc thư mục
```
├── Client/                 # Frontend React web app
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── hooks/          # Custom hooks (useAuth, useWebSocket)
│   │   ├── pages/          # Page components
│   │   └── styles/         # CSS styles
│   └── index.html
├── mobile/                 # Expo React Native app
│   ├── app/                # Expo Router screens
│   │   ├── (auth)/         # Auth screens
│   │   └── (main)/         # Main app screens
│   ├── components/         # React Native components
│   ├── hooks/              # Custom hooks
│   ├── constants/          # Colors, API config
│   ├── app.json            # Expo config
│   └── eas.json            # EAS Build config
├── server/                 # Backend Node.js
│   ├── index.ts            # Express server entry
│   ├── routes.ts           # API routes
│   ├── websocket.ts        # WebSocket handler
│   ├── p2p-relay.ts        # P2P relay service
│   └── storage.ts          # Database storage
├── shared/                 # Shared types/schemas
└── electron/               # Electron desktop app config
```

## Scripts - Web App
- `npm run dev` - Chạy development server
- `npm run build` - Build production

## Scripts - Mobile App (Expo)
- `cd mobile && npx expo start` - Chạy development với Expo Go
- `cd mobile && npx expo prebuild --clean` - Tạo native project
- `cd mobile && eas build --platform android --profile preview` - Build APK
- `cd mobile && eas build --platform ios --profile preview` - Build iOS

## Hướng dẫn kết nối Minecraft PE
1. Tạo phòng trong app
2. Trong Minecraft PE: Play > Servers > Add Server
3. Nhập Server Address và Port từ phòng đã tạo
4. Kết nối và chơi!

## Build Mobile APK (Expo)

### Cách 1: Test với Expo Go (Nhanh nhất)
1. Tải app Expo Go từ Play Store
2. Chạy `cd mobile && npx expo start`
3. Scan QR code

### Cách 2: Build APK với EAS Build
1. Cài EAS CLI: `npm install -g eas-cli`
2. Đăng nhập Expo: `eas login`
3. Username: haikieu, Password: 1111111111Ab@
4. Cấu hình: `cd mobile && eas build:configure`
5. Prebuild: `npx expo prebuild --clean`
6. Build APK: `eas build --platform android --profile preview`
7. Tải APK từ link Expo gửi về

Chi tiết xem file: `mobile/BUILD_GUIDE.md`

## Build Windows (Electron)
1. Chạy `npm run build:all`
2. `cd electron && npm install`
3. `npm run build:win`

## User Preferences
- Ngôn ngữ giao diện: Tiếng Việt / English (có thể chuyển đổi)
- Theme: Dark/Light mode (có thể chuyển đổi), mặc định Dark với màu Minecraft green (#5D8C3E)

## Recent Changes
- Dec 2024: Khởi tạo dự án với full stack React + Node.js
- Thêm P2P relay overlay cho Minecraft multiplayer
- **Dec 2024: Thêm Expo React Native mobile app**
  - Chuyển đổi từ Capacitor sang Expo
  - Hỗ trợ EAS Build để build APK trực tiếp
  - 4 màn hình chính: Home, Friends, Chat, Profile
- **Dec 04, 2025: Fix và cấu hình EAS Build**
  - Sửa lỗi file hình ảnh sai định dạng (JPG → PNG)
  - Cập nhật package versions cho SDK 52
  - Tạo keystore: `mobile/android/keystores/haikieu.mcmultiplayer.keystore`
  - Cấu hình local credentials cho EAS Build
  - projectId: `2f533126-7b5c-4df7-b244-b9b512b59820`
- **Dec 04, 2025: Thêm tính năng Deep Link cho Minecraft PE**
  - Web client: Thêm nút "Mở Minecraft & Kết nối ngay" sử dụng deep link
  - Mobile app: Cập nhật hàm `openMinecraftWithServer` với URL scheme đúng
  - Sử dụng URL scheme `minecraft:?addExternalServer=ServerName|IP:Port`
  - Tự động mở Minecraft PE và thêm server vào danh sách
  - Backend trả về `relayAddress` chính xác từ REPLIT_DEV_DOMAIN
- **Dec 04, 2025: Thêm tính năng Admin và Upload ảnh**
  - Upload ảnh Profile: Thay URL bằng file upload PNG/JPG
  - Upload ảnh Community: Đăng bài kèm ảnh trong cộng đồng
  - Admin account: username `abcxyz`, password `0796438068`
  - Admin Panel: Quản lý tài khoản, xóa user, gửi thông báo
  - Notification Bell: Nút chuông thông báo từ admin
  - Admin trong Friend List: Hiển thị với tag [admin] màu đỏ
  - Thêm bảng admin_notifications và user_notifications vào schema
- **Dec 04, 2025: Cải tiến UI/UX và tính năng mới**
  - Sửa lỗi hiển thị ảnh upload (thêm proxy cho /uploads)
  - Thêm nút chuyển đổi ngôn ngữ English/Tiếng Việt
  - Thêm nút chuyển đổi Dark/Light mode
  - Thêm gradient màu sắc cho tin nhắn chat
  - Thêm hiển thị logo trong header
  - Thêm tính năng Group Chat (lưu cục bộ)
  - Thêm click vào tác giả bài viết để xem profile và kết bạn
  - Tối ưu hóa cho iOS (safe areas, touch targets, viewport-fit)
- **Dec 07, 2025: Gỡ bỏ tính năng Floating Bubble**
  - Xóa tất cả code overlay/floating bubble khỏi Android app
  - Đơn giản hóa cấu hình và permissions
  - Fix vite proxy port từ 3002 sang 3001
- **Dec 06, 2025: Thêm tính năng Music Player**
  - **Web App**: Component MusicPlayer với 4 bài hát Alan Walker
  - **Mobile App**: MusicPlayer sử dụng expo-av cho audio playback
  - **Bài hát bao gồm**: Faded, Sing Me to Sleep, The Spectre, Headlights
  - **Tính năng**: Phát/tạm dừng, chuyển bài, thanh tiến trình, danh sách phát
  - **UI**: Nút mini ở góc phải dưới, mở rộng thành player đầy đủ
  - **Files MP3**: Lưu tại `Client/Public/music/` (Web) và `mobile/assets/music/` (Mobile)

## Build APK với EAS

### Lệnh build nhanh (đã cấu hình sẵn)
```bash
cd mobile && npx expo prebuild --clean && EAS_NO_VCS=1 eas build --platform android --profile preview --non-interactive --no-wait
```

### Theo dõi build
```bash
eas build:list --platform android --limit 1
```

### Build hiện tại (Dec 07, 2025)
- Build ID: `ca119828-37dd-44a9-887e-8c176852faa6`
- Link: https://expo.dev/accounts/haikieu/projects/mc-multiplayer-hub/builds/ca119828-37dd-44a9-887e-8c176852faa6
- Status: BUILDING ⏳

### Build trước (Dec 07, 2025)
- Build ID: `8f4d1b1e-1985-4fd0-9a4a-3aa71f96ad9e`
- **APK Download:** https://expo.dev/artifacts/eas/iGktb8VJL7D4becSdG6iWW.apk
- Status: FINISHED ✅

### Build cũ (Dec 05, 2025)
- Build ID: `35e5fae6-e9d7-47b6-ab44-4fa208ee81a6`
- **APK Download:** https://expo.dev/artifacts/eas/7E2rha3priXcaVnnSvNTHQ.apk

### Keystore Info
- Path: `mobile/android/keystores/haikieu.mcmultiplayer.keystore`
- Alias: `mcmultiplayer`
- Password: (stored securely in credentials.json - DO NOT COMMIT)
