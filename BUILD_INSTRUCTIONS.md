
# 🚀 Hướng Dẫn Build Ứng Dụng

## 📱 Mobile App (Android/iOS)

### Yêu cầu:
- Tài khoản Expo (miễn phí): https://expo.dev
- EAS CLI

### Build Android APK:
```bash
cd mobile
npm install -g eas-cli
eas login
eas build:configure  # Chỉ cần chạy 1 lần
eas build --platform android --profile preview
```

### Build iOS:
```bash
eas build --platform ios --profile preview
```

Chi tiết xem: `mobile/BUILD_GUIDE.md`

---

## 💻 Desktop App (Windows/Mac/Linux)

### Yêu cầu:
- Node.js 20+
- npm/yarn

### Cài đặt dependencies:
```bash
cd electron
npm install
npm install electron electron-builder -D
```

### Build Windows:
```bash
npm run build:win
```

### Build MacOS:
```bash
npm run build:mac
```

### Build Linux:
```bash
npm run build:linux
```

File output sẽ ở: `electron/release/`

---

## 🌐 Web App

Web app tự động chạy trên Replit khi bạn nhấn Run.

Để build production:
```bash
npm run build
```

---

## 📝 Lưu ý quan trọng:

1. **P2P Relay**: Ứng dụng sử dụng P2P relay, không cần cấu hình port forwarding
2. **Server**: Backend server cần chạy để các app hoạt động
3. **Cấu hình API**: 
   - Mobile app: Sửa `mobile/constants/Api.ts`
   - Desktop app: Tự động dùng localhost khi dev
