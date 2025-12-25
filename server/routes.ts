import { Router, Request, Response, NextFunction } from "express";
import { storage } from "./storage.js";
import bcrypt from "bcryptjs";
import { broadcastFriendRoomOnline, broadcastFriendRoomOffline, broadcastRoomPresence } from "./websocket.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), 'uploads', 'avatars');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer configuration for avatar uploads
const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (_req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only PNG and JPG images are allowed'));
    }
  },
});

// Community posts upload directory
const postsUploadDir = path.join(process.cwd(), 'uploads', 'posts');
if (!fs.existsSync(postsUploadDir)) {
  fs.mkdirSync(postsUploadDir, { recursive: true });
}

const postMediaStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, postsUploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const uploadPostMedia = multer({
  storage: postMediaStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit for video
  fileFilter: (_req, file, cb) => {
    const imageTypes = /jpeg|jpg|png/;
    const videoTypes = /mp4|webm|mov|quicktime/;
    const extname = path.extname(file.originalname).toLowerCase();
    const isImage = imageTypes.test(extname) && imageTypes.test(file.mimetype);
    const isVideo = videoTypes.test(extname) || videoTypes.test(file.mimetype) || file.mimetype === 'video/quicktime';
    if (isImage || isVideo) {
      cb(null, true);
    } else {
      cb(new Error('Only PNG, JPG, MP4, WebM, and MOV files are allowed'));
    }
  },
});

// Map-Addon uploads directory
const mapAddonUploadDir = path.join(process.cwd(), 'uploads', 'mapaddons');
if (!fs.existsSync(mapAddonUploadDir)) {
  fs.mkdirSync(mapAddonUploadDir, { recursive: true });
}

const mapAddonStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, mapAddonUploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  },
});

const uploadMapAddon = multer({
  storage: mapAddonStorage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit for map/addon files
});

const uploadMapAddonFields = uploadMapAddon.fields([
  { name: 'image', maxCount: 1 },
  { name: 'file', maxCount: 1 },
]);

declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

router.post("/auth/register", async (req, res) => {
  try {
    const { username, password, displayName } = req.body;

    const existing = await storage.getUserByUsername(username);
    if (existing) {
      return res.status(400).json({ error: "Username already exists" });
    }

    const user = await storage.createUser({
      username,
      password,
      displayName: displayName || username
    });

    req.session.userId = user.id;
    res.json({ user: { id: user.id, username: user.username, displayName: user.displayName } });
  } catch (error) {
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await storage.getUserByUsername(username);
    if (!user) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    await storage.updateUserOnlineStatus(user.id, true);
    req.session.userId = user.id;
    res.json({ user: { id: user.id, username: user.username, displayName: user.displayName } });
  } catch (error) {
    res.status(500).json({ error: "Login failed" });
  }
});

router.post("/auth/logout", requireAuth, async (req, res) => {
  if (req.session.userId) {
    await storage.updateUserOnlineStatus(req.session.userId, false);
  }
  req.session.destroy(() => {});
  res.json({ success: true });
});

router.get("/auth/me", requireAuth, async (req, res) => {
  const user = await storage.getUser(req.session.userId!);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  res.json({ user: { id: user.id, username: user.username, displayName: user.displayName, avatar: user.avatar, bio: user.bio, isAdmin: user.isAdmin } });
});

router.put("/auth/profile", requireAuth, async (req, res) => {
  try {
    const { displayName, avatar, bio } = req.body;
    const user = await storage.updateUserProfile(req.session.userId!, { displayName, avatar, bio });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ user: { id: user.id, username: user.username, displayName: user.displayName, avatar: user.avatar, bio: user.bio } });
  } catch (error) {
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// Endpoint for uploading avatar
router.post("/auth/upload-avatar", requireAuth, uploadAvatar.single('avatar'), async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No avatar file uploaded" });
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    console.log('[Avatar] Upload successful');
    console.log('[Avatar] File path:', req.file.path);
    console.log('[Avatar] Avatar URL:', avatarUrl);

    const updatedUser = await storage.updateUserAvatar(req.session.userId, avatarUrl);
    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }
    
    console.log('[Avatar] Updated user avatar:', updatedUser.avatar);
    res.json({ 
      success: true,
      avatar: avatarUrl,
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        displayName: updatedUser.displayName,
        avatar: avatarUrl
      }
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ error: "Failed to upload avatar" });
  }
});


router.get("/users/:id", requireAuth, async (req, res) => {
  const user = await storage.getUser(parseInt(req.params.id));
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  res.json({ user: { id: user.id, username: user.username, displayName: user.displayName, avatar: user.avatar, bio: user.bio, isOnline: user.isOnline, lastSeen: user.lastSeen } });
});

router.get("/friends", requireAuth, async (req, res) => {
  const friends = await storage.getFriends(req.session.userId!);
  res.json({ friends: friends.map(f => ({ id: f.id, username: f.username, displayName: f.displayName, isOnline: f.isOnline })) });
});

router.get("/friends/requests", requireAuth, async (req, res) => {
  const requests = await storage.getFriendRequests(req.session.userId!);
  res.json({ requests });
});

router.get("/users", requireAuth, async (req, res) => {
  try {
    const users = await storage.getAllUsers();
    const currentUserId = req.session.userId!;
    const filteredUsers = users
      .filter(u => u.id !== currentUserId)
      .map(u => ({ id: u.id, username: u.username, displayName: u.displayName, isOnline: u.isOnline }));
    res.json({ users: filteredUsers });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

router.get("/all-users", requireAuth, async (req, res) => {
  try {
    const users = await storage.getAllUsers();
    const filteredUsers = users.map(u => ({ 
      id: u.id, 
      username: u.username, 
      displayName: u.displayName, 
      isOnline: u.isOnline,
      avatar: u.avatar,
      isAdmin: u.isAdmin 
    }));
    res.json({ users: filteredUsers });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch all users" });
  }
});

router.get("/users/search", requireAuth, async (req, res) => {
  const users = await storage.getAllUsers();
  const currentUserId = req.session.userId!;
  const friends = await storage.getFriends(currentUserId);
  const friendIds = new Set(friends.map(f => f.id));

  const availableUsers = users
    .filter(u => u.id !== currentUserId && !friendIds.has(u.id))
    .map(u => ({ id: u.id, username: u.username, displayName: u.displayName, isOnline: u.isOnline }));

  res.json({ users: availableUsers });
});

router.post("/friends/request", requireAuth, async (req, res) => {
  try {
    const { username } = req.body;
    const friend = await storage.getUserByUsername(username);
    if (!friend) {
      return res.status(404).json({ error: "User not found" });
    }
    const friendship = await storage.sendFriendRequest(req.session.userId!, friend.id);
    res.json({ friendship });
  } catch (error) {
    res.status(500).json({ error: "Failed to send request" });
  }
});

router.post("/friends/accept/:id", requireAuth, async (req, res) => {
  await storage.acceptFriendRequest(parseInt(req.params.id));
  res.json({ success: true });
});

router.get("/messages/global", requireAuth, async (req, res) => {
  const messages = await storage.getGlobalMessages();
  res.json({ messages });
});

router.get("/messages/:friendId", requireAuth, async (req, res) => {
  const messages = await storage.getMessages(req.session.userId!, parseInt(req.params.friendId));
  res.json({ messages });
});

router.get("/rooms", requireAuth, async (req, res) => {
  const gameType = req.query.gameType as string | undefined;
  const rooms = await storage.getRooms(gameType);
  const domain = process.env.REPLIT_DEV_DOMAIN || process.env.DOMAIN || 'localhost';
  const roomsWithHost = await Promise.all(rooms.map(async (room) => {
    const host = await storage.getUser(room.hostId);
    return {
      ...room,
      hostName: host?.displayName || 'Unknown',
      hostAvatar: host?.avatar || null,
      relayAddress: `${domain}:${room.hostPort || 19132}`,
    };
  }));
  res.json({ rooms: roomsWithHost });
});

router.get("/rooms/friends", requireAuth, async (req, res) => {
  try {
    const gameType = req.query.gameType as string | undefined;
    const friendRooms = await storage.getFriendRooms(req.session.userId!, gameType);
    const domain = process.env.REPLIT_DEV_DOMAIN || process.env.DOMAIN || 'localhost';
    const roomsWithRelay = await Promise.all(friendRooms.map(async (room) => {
      const host = await storage.getUser(room.hostId);
      return {
        ...room,
        hostName: host?.displayName || 'Unknown',
        hostAvatar: host?.avatar || null,
        relayAddress: `${domain}:${room.hostPort || 19132}`,
      };
    }));
    res.json({ rooms: roomsWithRelay });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch friend rooms" });
  }
});

router.get("/rooms/:id", requireAuth, async (req, res) => {
  const room = await storage.getRoom(parseInt(req.params.id));
  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }
  const host = await storage.getUser(room.hostId);
  const domain = process.env.REPLIT_DEV_DOMAIN || process.env.DOMAIN || 'localhost';
  const relayAddress = `${domain}:${room.hostPort || 19132}`;
  res.json({
    room: {
      ...room,
      hostName: host?.displayName || 'Unknown',
      hostAvatar: host?.avatar || null,
      relayAddress,
    }
  });
});

router.post("/rooms", requireAuth, async (req, res) => {
  try {
    const { name, description, maxPlayers, gameVersion, hostPort, gameType, mapName, mindustryGameMode } = req.body;
    const room = await storage.createRoom({
      hostId: req.session.userId!,
      name,
      description,
      maxPlayers: maxPlayers || 5,
      gameVersion: gameVersion || "1.20",
      hostPort: hostPort || 19132,
      gameType: gameType || "minecraft",
      mapName: mapName || null,
      mindustryGameMode: mindustryGameMode || null,
    });

    const hostUser = await storage.getUser(req.session.userId!);
    if (hostUser) {
      await broadcastFriendRoomOnline(room, hostUser);
    }

    res.json({ room });
  } catch (error) {
    res.status(500).json({ error: "Failed to create room" });
  }
});

router.post("/rooms/:id/join", requireAuth, async (req, res) => {
  try {
    const room = await storage.joinRoom(parseInt(req.params.id), req.session.userId!);
    if (room) {
      broadcastRoomPresence(room.id, room.currentPlayers || 0, room.maxPlayers || 5);
    }
    res.json({ success: true, room });
  } catch (error) {
    res.status(500).json({ error: "Failed to join room" });
  }
});

router.post("/rooms/:id/leave", requireAuth, async (req, res) => {
  try {
    const room = await storage.leaveRoom(parseInt(req.params.id), req.session.userId!);
    if (room) {
      broadcastRoomPresence(room.id, room.currentPlayers || 0, room.maxPlayers || 5);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to leave room" });
  }
});

router.delete("/rooms/:id", requireAuth, async (req, res) => {
  const room = await storage.getRoom(parseInt(req.params.id));
  if (!room || room.hostId !== req.session.userId) {
    return res.status(403).json({ error: "Not authorized" });
  }
  await storage.deleteRoom(parseInt(req.params.id));
  await broadcastFriendRoomOffline(room.id, room.hostId);
  res.json({ success: true });
});

router.get("/rooms/:id/members", requireAuth, async (req, res) => {
  const members = await storage.getRoomMembers(parseInt(req.params.id));
  res.json({ members: members.map(m => ({ id: m.id, username: m.username, displayName: m.displayName })) });
});

router.get("/posts", requireAuth, async (req, res) => {
  try {
    const category = req.query.category as string | undefined;
    const gameType = req.query.gameType as string | undefined;
    const posts = await storage.getPosts(category, gameType);
    const postsWithAuthors = await Promise.all(posts.map(async (post) => {
      const author = await storage.getUser(post.authorId);
      const hasLiked = await storage.hasLikedPost(post.id, req.session.userId!);
      return {
        ...post,
        author: author ? { id: author.id, displayName: author.displayName, avatar: author.avatar, isAdmin: author.isAdmin } : null,
        hasLiked,
      };
    }));
    res.json({ posts: postsWithAuthors });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

router.get("/posts/:id", requireAuth, async (req, res) => {
  try {
    const post = await storage.getPost(parseInt(req.params.id));
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }
    const author = await storage.getUser(post.authorId);
    const hasLiked = await storage.hasLikedPost(post.id, req.session.userId!);
    res.json({
      post: {
        ...post,
        author: author ? { id: author.id, displayName: author.displayName, avatar: author.avatar } : null,
        hasLiked,
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch post" });
  }
});

router.post("/posts", requireAuth, uploadPostMedia.single('media'), async (req, res) => {
  try {
    const { content, category, gameType } = req.body;
    let imageUrl = null;
    let videoUrl = null;

    if (req.file) {
      const ext = path.extname(req.file.filename).toLowerCase();
      const mediaUrl = `/uploads/posts/${req.file.filename}`;
      
      if (['.mp4', '.webm', '.mov'].includes(ext)) {
        videoUrl = mediaUrl;
        console.log('[Posts] Video uploaded successfully');
      } else {
        imageUrl = mediaUrl;
        console.log('[Posts] Image uploaded successfully');
      }
      console.log('[Posts] File path:', req.file.path);
      console.log('[Posts] Media URL:', mediaUrl);
    }

    const post = await storage.createPost({
      authorId: req.session.userId!,
      content,
      imageUrl,
      videoUrl,
      category: category || 'general',
      gameType: gameType || 'minecraft',
    });
    const author = await storage.getUser(req.session.userId!);
    console.log('[Posts] Created post with imageUrl:', post.imageUrl, 'videoUrl:', post.videoUrl);
    res.json({
      post: {
        ...post,
        author: author ? { id: author.id, displayName: author.displayName, avatar: author.avatar, isAdmin: author.isAdmin } : null,
        hasLiked: false,
      }
    });
  } catch (error) {
    console.error('Failed to create post:', error);
    res.status(500).json({ error: "Failed to create post" });
  }
});

router.delete("/posts/:id", requireAuth, async (req, res) => {
  try {
    const post = await storage.getPost(parseInt(req.params.id));
    if (!post || post.authorId !== req.session.userId) {
      return res.status(403).json({ error: "Not authorized" });
    }
    await storage.deletePost(parseInt(req.params.id));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete post" });
  }
});

router.get("/posts/:id/comments", requireAuth, async (req, res) => {
  try {
    const comments = await storage.getPostComments(parseInt(req.params.id));
    const commentsWithAuthors = await Promise.all(comments.map(async (comment) => {
      const author = await storage.getUser(comment.authorId);
      return {
        ...comment,
        author: author ? { id: author.id, displayName: author.displayName, avatar: author.avatar, isAdmin: author.isAdmin } : null,
      };
    }));
    res.json({ comments: commentsWithAuthors });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

router.post("/posts/:id/comments", requireAuth, async (req, res) => {
  try {
    const { content } = req.body;
    const postId = parseInt(req.params.id);
    const comment = await storage.createComment({
      postId,
      authorId: req.session.userId!,
      content,
    });
    
    // Create notification for post author
    const post = await storage.getPost(postId);
    if (post && post.authorId !== req.session.userId!) {
      await storage.createPostNotification({
        recipientId: post.authorId,
        actorId: req.session.userId!,
        postId,
        type: 'comment',
      });
    }
    
    const author = await storage.getUser(req.session.userId!);
    res.json({
      comment: {
        ...comment,
        author: author ? { id: author.id, displayName: author.displayName, avatar: author.avatar } : null,
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to create comment" });
  }
});

router.post("/posts/:id/like", requireAuth, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    await storage.likePost(postId, req.session.userId!);
    const post = await storage.getPost(postId);
    
    // Create notification for post author
    if (post && post.authorId !== req.session.userId!) {
      await storage.createPostNotification({
        recipientId: post.authorId,
        actorId: req.session.userId!,
        postId,
        type: 'like',
      });
    }
    
    res.json({ success: true, likesCount: post?.likesCount || 0 });
  } catch (error) {
    res.status(500).json({ error: "Failed to like post" });
  }
});

router.delete("/posts/:id/like", requireAuth, async (req, res) => {
  try {
    await storage.unlikePost(parseInt(req.params.id), req.session.userId!);
    const post = await storage.getPost(parseInt(req.params.id));
    res.json({ success: true, likesCount: post?.likesCount || 0 });
  } catch (error) {
    res.status(500).json({ error: "Failed to unlike post" });
  }
});

// Placeholder for Changelog
// This would typically involve fetching changelog data from storage or a file
router.get("/changelog", requireAuth, async (req, res) => {
  try {
    // In a real application, you'd fetch this from a database or a file
    const changelogEntries = [
      { version: "1.1.0", date: "2023-10-27", updates: ["Added new gradient themes.", "Improved iOS compatibility.", "Enabled image uploads for profile and community posts."] },
      { version: "1.0.0", date: "2023-10-01", updates: ["Initial release."] },
    ];
    res.json({ changelog: changelogEntries });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch changelog" });
  }
});

// Admin middleware
const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const user = await storage.getUser(req.session.userId);
  if (!user || !user.isAdmin) {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

// Admin routes
router.get("/admin/users", requireAdmin, async (req, res) => {
  try {
    const users = await storage.getAllUsers();
    res.json({ 
      users: users.map(u => ({
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        avatar: u.avatar,
        isOnline: u.isOnline,
        isAdmin: u.isAdmin,
        createdAt: u.createdAt,
        lastSeen: u.lastSeen,
      })),
      total: users.length
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

router.delete("/admin/users/:id", requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    if (user.isAdmin) {
      return res.status(403).json({ error: "Cannot delete admin account" });
    }
    await storage.deleteUser(userId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete user" });
  }
});

router.post("/admin/notifications", requireAdmin, async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: "Title and content are required" });
    }
    const notification = await storage.createAdminNotification({ title, content });
    res.json({ notification });
  } catch (error) {
    res.status(500).json({ error: "Failed to create notification" });
  }
});

router.get("/admin/notifications", requireAdmin, async (req, res) => {
  try {
    const notifications = await storage.getAdminNotifications();
    res.json({ notifications });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// User notification routes
router.get("/notifications", requireAuth, async (req, res) => {
  try {
    const notifications = await storage.getUserNotifications(req.session.userId!);
    res.json({ notifications });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

router.get("/notifications/unread-count", requireAuth, async (req, res) => {
  try {
    const count = await storage.getUnreadNotificationCount(req.session.userId!);
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: "Failed to get unread count" });
  }
});

router.post("/notifications/:id/read", requireAuth, async (req, res) => {
  try {
    await storage.markNotificationRead(req.session.userId!, parseInt(req.params.id));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to mark notification as read" });
  }
});

// Get admin user info (for friend list)
router.get("/admin-user", requireAuth, async (req, res) => {
  try {
    const admin = await storage.getAdminUser();
    if (!admin) {
      return res.json({ admin: null });
    }
    res.json({ 
      admin: { 
        id: admin.id, 
        username: admin.username, 
        displayName: admin.displayName,
        avatar: admin.avatar,
        isOnline: admin.isOnline,
        isAdmin: true
      } 
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to get admin user" });
  }
});

// Map-Addon routes
router.get("/mapaddons", requireAuth, async (req, res) => {
  try {
    const type = req.query.type as string | undefined;
    const addons = await storage.getMapAddons(type);
    const addonsWithAuthors = await Promise.all(addons.map(async (addon) => {
      const author = await storage.getUser(addon.authorId);
      const hasLiked = await storage.hasLikedMapAddon(addon.id, req.session.userId!);
      return {
        ...addon,
        author: author ? { id: author.id, displayName: author.displayName, avatar: author.avatar, isAdmin: author.isAdmin } : null,
        hasLiked,
      };
    }));
    res.json({ addons: addonsWithAuthors });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch map addons" });
  }
});

router.get("/mapaddons/:id", requireAuth, async (req, res) => {
  try {
    const addon = await storage.getMapAddon(parseInt(req.params.id));
    if (!addon) {
      return res.status(404).json({ error: "Map addon not found" });
    }
    const author = await storage.getUser(addon.authorId);
    const hasLiked = await storage.hasLikedMapAddon(addon.id, req.session.userId!);
    res.json({
      addon: {
        ...addon,
        author: author ? { id: author.id, displayName: author.displayName, avatar: author.avatar } : null,
        hasLiked,
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch map addon" });
  }
});

router.post("/mapaddons", requireAuth, uploadMapAddonFields, async (req, res) => {
  try {
    const { title, description, type } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    
    let imageUrl = null;
    let fileUrl = null;
    let fileName = null;
    let fileSize = null;

    if (files.image && files.image[0]) {
      imageUrl = `/uploads/mapaddons/${files.image[0].filename}`;
    }

    if (files.file && files.file[0]) {
      fileUrl = `/uploads/mapaddons/${files.file[0].filename}`;
      fileName = files.file[0].originalname;
      fileSize = files.file[0].size;
    }

    const addon = await storage.createMapAddon({
      authorId: req.session.userId!,
      title,
      description,
      type,
      imageUrl,
      fileUrl,
      fileName,
      fileSize,
    });

    const author = await storage.getUser(req.session.userId!);
    res.json({
      addon: {
        ...addon,
        author: author ? { id: author.id, displayName: author.displayName, avatar: author.avatar, isAdmin: author.isAdmin } : null,
        hasLiked: false,
      }
    });
  } catch (error) {
    console.error('Failed to create map addon:', error);
    res.status(500).json({ error: "Failed to create map addon" });
  }
});

router.delete("/mapaddons/:id", requireAuth, async (req, res) => {
  try {
    const addon = await storage.getMapAddon(parseInt(req.params.id));
    if (!addon || addon.authorId !== req.session.userId) {
      return res.status(403).json({ error: "Not authorized" });
    }
    await storage.deleteMapAddon(parseInt(req.params.id));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete map addon" });
  }
});

router.post("/mapaddons/:id/download", requireAuth, async (req, res) => {
  try {
    await storage.incrementDownloadCount(parseInt(req.params.id));
    const addon = await storage.getMapAddon(parseInt(req.params.id));
    res.json({ success: true, downloadCount: addon?.downloadCount || 0 });
  } catch (error) {
    res.status(500).json({ error: "Failed to track download" });
  }
});

router.get("/mapaddons/:id/comments", requireAuth, async (req, res) => {
  try {
    const comments = await storage.getMapAddonComments(parseInt(req.params.id));
    const commentsWithAuthors = await Promise.all(comments.map(async (comment) => {
      const author = await storage.getUser(comment.authorId);
      return {
        ...comment,
        author: author ? { id: author.id, displayName: author.displayName, avatar: author.avatar, isAdmin: author.isAdmin } : null,
      };
    }));
    res.json({ comments: commentsWithAuthors });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

router.post("/mapaddons/:id/comments", requireAuth, async (req, res) => {
  try {
    const { content } = req.body;
    const comment = await storage.createMapAddonComment({
      mapAddonId: parseInt(req.params.id),
      authorId: req.session.userId!,
      content,
    });
    const author = await storage.getUser(req.session.userId!);
    res.json({
      comment: {
        ...comment,
        author: author ? { id: author.id, displayName: author.displayName, avatar: author.avatar } : null,
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to create comment" });
  }
});

router.post("/mapaddons/:id/like", requireAuth, async (req, res) => {
  try {
    await storage.likeMapAddon(parseInt(req.params.id), req.session.userId!);
    const addon = await storage.getMapAddon(parseInt(req.params.id));
    res.json({ success: true, likesCount: addon?.likesCount || 0 });
  } catch (error) {
    res.status(500).json({ error: "Failed to like" });
  }
});

router.delete("/mapaddons/:id/like", requireAuth, async (req, res) => {
  try {
    await storage.unlikeMapAddon(parseInt(req.params.id), req.session.userId!);
    const addon = await storage.getMapAddon(parseInt(req.params.id));
    res.json({ success: true, likesCount: addon?.likesCount || 0 });
  } catch (error) {
    res.status(500).json({ error: "Failed to unlike" });
  }
});

// User posts route
router.get("/users/:id/posts", requireAuth, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const posts = await storage.getUserPosts(userId);
    const postsWithAuthors = await Promise.all(posts.map(async (post) => {
      const author = await storage.getUser(post.authorId);
      const hasLiked = await storage.hasLikedPost(post.id, req.session.userId!);
      return {
        ...post,
        author: author ? { id: author.id, displayName: author.displayName, avatar: author.avatar, isAdmin: author.isAdmin } : null,
        hasLiked,
      };
    }));
    res.json({ posts: postsWithAuthors });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch user posts" });
  }
});

// Post notifications routes
router.get("/notifications/posts", requireAuth, async (req, res) => {
  try {
    const notifications = await storage.getPostNotifications(req.session.userId!);
    const notificationsWithDetails = await Promise.all(notifications.map(async (notif) => {
      const actor = await storage.getUser(notif.actorId);
      const post = await storage.getPost(notif.postId);
      return {
        ...notif,
        actor: actor ? { id: actor.id, displayName: actor.displayName, avatar: actor.avatar } : null,
        post: post ? { id: post.id, content: post.content.substring(0, 50) } : null,
      };
    }));
    res.json({ notifications: notificationsWithDetails });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch post notifications" });
  }
});

router.get("/notifications/all", requireAuth, async (req, res) => {
  try {
    const adminNotifications = await storage.getUserNotifications(req.session.userId!);
    const postNotifications = await storage.getPostNotifications(req.session.userId!);
    
    const postNotificationsWithDetails = await Promise.all(postNotifications.map(async (notif) => {
      const actor = await storage.getUser(notif.actorId);
      const post = await storage.getPost(notif.postId);
      return {
        id: notif.id,
        type: 'post',
        notifType: notif.type,
        isRead: notif.isRead,
        createdAt: notif.createdAt,
        actor: actor ? { id: actor.id, displayName: actor.displayName, avatar: actor.avatar } : null,
        post: post ? { id: post.id, content: post.content.substring(0, 50) } : null,
      };
    }));

    const adminNotificationsFormatted = adminNotifications.map(notif => ({
      id: notif.id,
      type: 'admin',
      title: notif.title,
      content: notif.content,
      isRead: notif.isRead,
      createdAt: notif.createdAt,
    }));

    const allNotifications = [...postNotificationsWithDetails, ...adminNotificationsFormatted]
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());

    const unreadAdminCount = await storage.getUnreadNotificationCount(req.session.userId!);
    const unreadPostCount = await storage.getPostNotificationCount(req.session.userId!);

    res.json({ 
      notifications: allNotifications,
      unreadCount: unreadAdminCount + unreadPostCount
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch all notifications" });
  }
});

router.post("/notifications/post/:id/read", requireAuth, async (req, res) => {
  try {
    await storage.markPostNotificationRead(parseInt(req.params.id));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to mark notification as read" });
  }
});

// Dating routes
router.get("/dating/my-profile", requireAuth, async (req, res) => {
  try {
    const profile = await storage.getDatingProfile(req.session.userId!);
    res.json({ profile: profile || null });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch dating profile" });
  }
});

router.get("/dating/profiles", requireAuth, async (req, res) => {
  try {
    const profiles = await storage.getAllDatingProfiles(req.session.userId!);
    const profilesWithUsers = await Promise.all(profiles.map(async (profile) => {
      const user = await storage.getUser(profile.userId);
      return {
        ...profile,
        user: user ? { id: user.id, displayName: user.displayName, avatar: user.avatar } : null,
      };
    }));
    res.json({ profiles: profilesWithUsers });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch dating profiles" });
  }
});

router.post("/dating/profile", requireAuth, async (req, res) => {
  try {
    const { displayName, age, gender, interests, lookingFor, bio } = req.body;
    
    const existingProfile = await storage.getDatingProfile(req.session.userId!);
    if (existingProfile) {
      return res.status(400).json({ error: "Dating profile already exists" });
    }

    const profile = await storage.createDatingProfile({
      userId: req.session.userId!,
      displayName,
      age: parseInt(age),
      gender,
      interests,
      lookingFor,
      bio,
    });
    res.json({ profile });
  } catch (error) {
    res.status(500).json({ error: "Failed to create dating profile" });
  }
});

router.post("/dating/random-match", requireAuth, async (req, res) => {
  try {
    const myProfile = await storage.getDatingProfile(req.session.userId!);
    if (!myProfile) {
      return res.status(400).json({ error: "You need a dating profile first" });
    }

    const matchedProfile = await storage.getRandomMatch(req.session.userId!, myProfile.lookingFor);
    if (!matchedProfile) {
      return res.status(404).json({ error: "No matching profiles found" });
    }

    const match = await storage.createDatingMatch({
      userAId: req.session.userId!,
      userBId: matchedProfile.userId,
      status: 'matched',
    });

    const matchedUser = await storage.getUser(matchedProfile.userId);
    res.json({ 
      match,
      matchedProfile: {
        ...matchedProfile,
        user: matchedUser ? { id: matchedUser.id, displayName: matchedUser.displayName, avatar: matchedUser.avatar } : null,
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to find random match" });
  }
});

export default router;