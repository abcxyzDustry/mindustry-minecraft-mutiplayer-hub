import type { User, InsertUser, Friendship, Message, McRoom, InsertMcRoom, RoomMember, CommunityPost, InsertCommunityPost, PostComment, InsertPostComment, PostLike, AdminNotification, InsertAdminNotification, UserNotification, MapAddon, InsertMapAddon, MapAddonComment, InsertMapAddonComment, PostNotification, InsertPostNotification, DatingProfile, InsertDatingProfile, DatingMatch, InsertDatingMatch } from "../shared/schema.js";
import bcrypt from "bcryptjs";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUserOnlineStatus(userId: number, isOnline: boolean): Promise<void>;
  updateUserProfile(userId: number, data: { displayName?: string; avatar?: string; bio?: string }): Promise<User | undefined>;
  updateUserAvatar(userId: number, avatar: string): Promise<User | undefined>;
  deleteUser(userId: number): Promise<void>;
  getAdminUser(): Promise<User | undefined>;

  getFriends(userId: number): Promise<User[]>;
  getFriendRequests(userId: number): Promise<Friendship[]>;
  sendFriendRequest(userId: number, friendId: number): Promise<Friendship>;
  acceptFriendRequest(friendshipId: number): Promise<void>;
  areFriends(userId: number, friendId: number): Promise<boolean>;

  getMessages(userId: number, friendId?: number): Promise<Message[]>;
  getGlobalMessages(): Promise<Message[]>;
  getRoomMessages(roomId: number): Promise<Message[]>;
  createMessage(senderId: number, content: string, receiverId?: number, roomId?: number, isGlobal?: boolean): Promise<Message>;

  getRooms(gameType?: string): Promise<McRoom[]>;
  getRoom(id: number): Promise<McRoom | undefined>;
  getFriendRooms(userId: number, gameType?: string): Promise<Array<McRoom & { hostName: string; hostAvatar: string | null }>>;
  createRoom(room: InsertMcRoom): Promise<McRoom>;
  updateRoom(id: number, data: Partial<McRoom>): Promise<void>;
  deleteRoom(id: number): Promise<void>;

  joinRoom(roomId: number, userId: number): Promise<McRoom | undefined>;
  leaveRoom(roomId: number, userId: number): Promise<McRoom | undefined>;
  getRoomMembers(roomId: number): Promise<User[]>;

  getPosts(category?: string, gameType?: string): Promise<CommunityPost[]>;
  getPost(id: number): Promise<CommunityPost | undefined>;
  createPost(post: InsertCommunityPost): Promise<CommunityPost>;
  deletePost(id: number): Promise<void>;

  getPostComments(postId: number): Promise<PostComment[]>;
  createComment(comment: InsertPostComment): Promise<PostComment>;

  likePost(postId: number, userId: number): Promise<void>;
  unlikePost(postId: number, userId: number): Promise<void>;
  hasLikedPost(postId: number, userId: number): Promise<boolean>;

  createAdminNotification(notification: InsertAdminNotification): Promise<AdminNotification>;
  getAdminNotifications(): Promise<AdminNotification[]>;
  getUserNotifications(userId: number): Promise<Array<AdminNotification & { isRead: boolean }>>;
  markNotificationRead(userId: number, notificationId: number): Promise<void>;
  getUnreadNotificationCount(userId: number): Promise<number>;

  getMapAddons(type?: string): Promise<MapAddon[]>;
  getMapAddon(id: number): Promise<MapAddon | undefined>;
  createMapAddon(addon: InsertMapAddon): Promise<MapAddon>;
  deleteMapAddon(id: number): Promise<void>;
  incrementDownloadCount(id: number): Promise<void>;
  getMapAddonComments(mapAddonId: number): Promise<MapAddonComment[]>;
  createMapAddonComment(comment: InsertMapAddonComment): Promise<MapAddonComment>;
  likeMapAddon(mapAddonId: number, userId: number): Promise<void>;
  unlikeMapAddon(mapAddonId: number, userId: number): Promise<void>;
  hasLikedMapAddon(mapAddonId: number, userId: number): Promise<boolean>;

  // User posts
  getUserPosts(userId: number): Promise<CommunityPost[]>;

  // Post notifications
  getPostNotifications(userId: number): Promise<PostNotification[]>;
  createPostNotification(notification: InsertPostNotification): Promise<PostNotification>;
  markPostNotificationRead(notificationId: number): Promise<void>;
  getPostNotificationCount(userId: number): Promise<number>;

  // Dating
  getDatingProfile(userId: number): Promise<DatingProfile | undefined>;
  getAllDatingProfiles(excludeUserId: number): Promise<DatingProfile[]>;
  createDatingProfile(profile: InsertDatingProfile): Promise<DatingProfile>;
  getRandomMatch(userId: number, lookingFor: string): Promise<DatingProfile | undefined>;
  createDatingMatch(match: InsertDatingMatch): Promise<DatingMatch>;
}

class ReplitDBStorage implements IStorage {
  private dbUrl: string;

  constructor() {
    this.dbUrl = process.env.REPLIT_DB_URL || "";
    this.ensureAdminExists();
  }

  private async ensureAdminExists() {
    if (!this.dbUrl) return; // Check if DB URL is available

    try {
      const response = await fetch(`${this.dbUrl}/username:admin`);
      const adminUserExists = response.status !== 404;

      if (!adminUserExists) {
        const nextId = (await this.get('counter:users') || 0) + 1;
        await this.set('counter:users', nextId);

        const hashedPassword = await bcrypt.hash('admin123', 10);
        const user: User = {
          id: nextId,
          username: 'admin',
          password: hashedPassword,
          displayName: 'Admin',
          avatar: null,
          bio: null,
          isOnline: false,
          isAdmin: true,
          lastSeen: new Date(),
          createdAt: new Date(),
        };

        await this.set(`user:${user.id}`, user);
        await this.set(`username:${user.username}`, user.id);
        console.log('[Storage] Default admin account created (username: admin, password: admin123)');
      }
    } catch (error) {
      console.error('[Storage] Failed to create admin account:', error);
    }
  }

  private async get(key: string): Promise<any> {
    try {
      const response = await fetch(`${this.dbUrl}/${encodeURIComponent(key)}`);
      if (response.status === 404) return null;
      const text = await response.text();
      return text ? JSON.parse(text) : null;
    } catch {
      return null;
    }
  }

  private async set(key: string, value: any): Promise<void> {
    await fetch(this.dbUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `${encodeURIComponent(key)}=${encodeURIComponent(JSON.stringify(value))}`
    });
  }

  private async delete(key: string): Promise<void> {
    await fetch(`${this.dbUrl}/${encodeURIComponent(key)}`, { method: 'DELETE' });
  }

  private async list(prefix: string): Promise<string[]> {
    const response = await fetch(`${this.dbUrl}?prefix=${encodeURIComponent(prefix)}`);
    const text = await response.text();
    return text ? text.split('\n').filter(k => k) : [];
  }

  async getUser(id: number): Promise<User | undefined> {
    return await this.get(`user:${id}`);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const userId = await this.get(`username:${username}`);
    return userId ? await this.getUser(userId) : undefined;
  }

  async getAllUsers(): Promise<User[]> {
    const userKeys = await this.list('user:');
    const users: User[] = [];

    for (const key of userKeys) {
      if (key.startsWith('user:') && !key.includes('username:')) {
        const user: User = await this.get(key);
        if (user) users.push(user);
      }
    }

    return users.sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const nextId = (await this.get('counter:users') || 0) + 1;
    await this.set('counter:users', nextId);

    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    const isAdminAccount = insertUser.username === 'abcxyz';
    const user: User = {
      id: nextId,
      username: insertUser.username,
      password: hashedPassword,
      displayName: isAdminAccount ? 'Admin' : insertUser.displayName,
      avatar: null,
      bio: null,
      isOnline: false,
      isAdmin: isAdminAccount,
      lastSeen: new Date(),
      createdAt: new Date(),
    };

    await this.set(`user:${user.id}`, user);
    await this.set(`username:${user.username}`, user.id);
    return user;
  }

  async updateUserOnlineStatus(userId: number, isOnline: boolean): Promise<void> {
    const user = await this.getUser(userId);
    if (user) {
      user.isOnline = isOnline;
      user.lastSeen = new Date();
      await this.set(`user:${userId}`, user);
    }
  }

  async updateUserProfile(userId: number, data: { displayName?: string; avatar?: string; bio?: string }): Promise<User | undefined> {
    const user = await this.getUser(userId);
    if (user) {
      if (data.displayName) user.displayName = data.displayName;
      if (data.avatar !== undefined) user.avatar = data.avatar;
      if (data.bio !== undefined) user.bio = data.bio;
      await this.set(`user:${userId}`, user);
      return user;
    }
    return undefined;
  }

  async updateUserAvatar(userId: number, avatar: string): Promise<User | undefined> {
    const user = await this.getUser(userId);
    if (user) {
      user.avatar = avatar;
      await this.set(`user:${userId}`, user);
      return user;
    }
    return undefined;
  }

  async deleteUser(userId: number): Promise<void> {
    const user = await this.getUser(userId);
    if (user) {
      await this.delete(`user:${userId}`);
      await this.delete(`username:${user.username}`);
    }
  }

  async getAdminUser(): Promise<User | undefined> {
    const users = await this.getAllUsers();
    return users.find(u => u.isAdmin === true);
  }

  async getFriends(userId: number): Promise<User[]> {
    const friendKeys = await this.list(`friendship:${userId}:`);
    const friends: User[] = [];

    for (const key of friendKeys) {
      const friendship: Friendship = await this.get(key);
      if (friendship && friendship.status === "accepted") {
        const friendId = friendship.userId === userId ? friendship.friendId : friendship.userId;
        const friend = await this.getUser(friendId);
        if (friend) friends.push(friend);
      }
    }
    return friends;
  }

  async getFriendRequests(userId: number): Promise<Friendship[]> {
    const keys = await this.list(`friendship:`);
    const requests: Friendship[] = [];

    for (const key of keys) {
      const friendship: Friendship = await this.get(key);
      if (friendship && friendship.friendId === userId && friendship.status === "pending") {
        requests.push(friendship);
      }
    }
    return requests;
  }

  async sendFriendRequest(userId: number, friendId: number): Promise<Friendship> {
    const nextId = (await this.get('counter:friendships') || 0) + 1;
    await this.set('counter:friendships', nextId);

    const friendship: Friendship = {
      id: nextId,
      userId,
      friendId,
      status: "pending",
      createdAt: new Date(),
    };

    await this.set(`friendship:${userId}:${friendId}`, friendship);
    await this.set(`friendship:${nextId}`, friendship);
    return friendship;
  }

  async acceptFriendRequest(friendshipId: number): Promise<void> {
    const friendship: Friendship = await this.get(`friendship:${friendshipId}`);
    if (friendship) {
      friendship.status = "accepted";
      await this.set(`friendship:${friendship.userId}:${friendship.friendId}`, friendship);
      await this.set(`friendship:${friendshipId}`, friendship);
    }
  }

  async areFriends(userId: number, friendId: number): Promise<boolean> {
    const friendship1: Friendship = await this.get(`friendship:${userId}:${friendId}`);
    const friendship2: Friendship = await this.get(`friendship:${friendId}:${userId}`);
    return (friendship1?.status === "accepted") || (friendship2?.status === "accepted");
  }

  async getMessages(userId: number, friendId?: number): Promise<Message[]> {
    const keys = await this.list('message:');
    const messages: Message[] = [];

    for (const key of keys) {
      const msg: Message = await this.get(key);
      if (msg) {
        if (friendId) {
          if ((msg.senderId === userId && msg.receiverId === friendId) ||
              (msg.senderId === friendId && msg.receiverId === userId)) {
            messages.push(msg);
          }
        } else if (msg.senderId === userId || msg.receiverId === userId) {
          messages.push(msg);
        }
      }
    }

    return messages.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()).slice(0, 100);
  }

  async getGlobalMessages(): Promise<Message[]> {
    const keys = await this.list('message:global:');
    const messages: Message[] = [];

    for (const key of keys) {
      const msg: Message = await this.get(key);
      if (msg) messages.push(msg);
    }

    return messages.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()).slice(0, 100);
  }

  async getRoomMessages(roomId: number): Promise<Message[]> {
    const keys = await this.list(`message:room:${roomId}:`);
    const messages: Message[] = [];

    for (const key of keys) {
      const msg: Message = await this.get(key);
      if (msg) messages.push(msg);
    }

    return messages.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()).slice(0, 100);
  }

  async createMessage(senderId: number, content: string, receiverId?: number, roomId?: number, isGlobal: boolean = false): Promise<Message> {
    const nextId = (await this.get('counter:messages') || 0) + 1;
    await this.set('counter:messages', nextId);

    const message: Message = {
      id: nextId,
      senderId,
      content,
      receiverId: receiverId || null,
      roomId: roomId || null,
      isGlobal,
      createdAt: new Date(),
    };

    if (isGlobal) {
      await this.set(`message:global:${nextId}`, message);
    } else if (roomId) {
      await this.set(`message:room:${roomId}:${nextId}`, message);
    } else {
      await this.set(`message:${nextId}`, message);
    }

    return message;
  }

  async getRooms(gameType?: string): Promise<McRoom[]> {
    const keys = await this.list('room:');
    const rooms: McRoom[] = [];

    for (const key of keys) {
      const room: McRoom = await this.get(key);
      if (room && room.isActive) {
        if (!gameType || room.gameType === gameType) {
          rooms.push(room);
        }
      }
    }

    return rooms.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async getRoom(id: number): Promise<McRoom | undefined> {
    return await this.get(`room:${id}`);
  }

  async getFriendRooms(userId: number, gameType?: string): Promise<Array<McRoom & { hostName: string; hostAvatar: string | null }>> {
    const friends = await this.getFriends(userId);
    const friendRooms: Array<McRoom & { hostName: string; hostAvatar: string | null }> = [];

    for (const friend of friends) {
      const rooms = await this.getRooms(gameType);
      for (const room of rooms) {
        if (room.hostId === friend.id && room.isActive) {
          friendRooms.push({
            ...room,
            hostName: friend.displayName,
            hostAvatar: friend.avatar,
          });
        }
      }
    }

    return friendRooms.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async createRoom(room: InsertMcRoom): Promise<McRoom> {
    const nextId = (await this.get('counter:rooms') || 0) + 1;
    await this.set('counter:rooms', nextId);

    const newRoom: McRoom = {
      id: nextId,
      hostId: room.hostId,
      name: room.name,
      description: room.description || null,
      hostIp: room.hostIp || null,
      hostPort: room.hostPort || 19132,
      maxPlayers: room.maxPlayers || 5,
      currentPlayers: 0,
      isActive: true,
      gameVersion: room.gameVersion || "1.21",
      gameType: room.gameType || "minecraft",
      mapName: room.mapName || null,
      mindustryGameMode: room.mindustryGameMode || null,
      createdAt: new Date(),
    };

    await this.set(`room:${newRoom.id}`, newRoom);
    return newRoom;
  }

  async updateRoom(id: number, data: Partial<McRoom>): Promise<void> {
    const room = await this.getRoom(id);
    if (room) {
      Object.assign(room, data);
      await this.set(`room:${id}`, room);
    }
  }

  async deleteRoom(id: number): Promise<void> {
    const room = await this.getRoom(id);
    if (room) {
      room.isActive = false;
      await this.set(`room:${id}`, room);
    }
  }

  async joinRoom(roomId: number, userId: number): Promise<McRoom | undefined> {
    const nextId = (await this.get('counter:members') || 0) + 1;
    await this.set('counter:members', nextId);

    const member: RoomMember = {
      id: nextId,
      roomId,
      userId,
      joinedAt: new Date(),
    };

    await this.set(`member:${roomId}:${userId}`, member);

    const room = await this.getRoom(roomId);
    if (room) {
      room.currentPlayers = (room.currentPlayers || 0) + 1;
      await this.set(`room:${roomId}`, room);
      return room;
    }
    return undefined;
  }

  async leaveRoom(roomId: number, userId: number): Promise<McRoom | undefined> {
    await this.delete(`member:${roomId}:${userId}`);

    const room = await this.getRoom(roomId);
    if (room && room.currentPlayers && room.currentPlayers > 0) {
      room.currentPlayers--;
      await this.set(`room:${roomId}`, room);
      return room;
    }
    return room;
  }

  async getRoomMembers(roomId: number): Promise<User[]> {
    const keys = await this.list(`member:${roomId}:`);
    const members: User[] = [];

    for (const key of keys) {
      const member: RoomMember = await this.get(key);
      if (member) {
        const user = await this.getUser(member.userId);
        if (user) members.push(user);
      }
    }

    return members;
  }

  async getPosts(category?: string, gameType?: string): Promise<CommunityPost[]> {
    const keys = await this.list('post:');
    const posts: CommunityPost[] = [];

    for (const key of keys) {
      if (key.startsWith('post:') && !key.includes(':comment:') && !key.includes(':like:')) {
        const post: CommunityPost = await this.get(key);
        if (post) {
          const categoryMatch = !category || post.category === category;
          const gameTypeMatch = !gameType || post.gameType === gameType;
          if (categoryMatch && gameTypeMatch) {
            posts.push(post);
          }
        }
      }
    }

    return posts.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async getPost(id: number): Promise<CommunityPost | undefined> {
    return await this.get(`post:${id}`);
  }

  async createPost(post: InsertCommunityPost): Promise<CommunityPost> {
    const nextId = (await this.get('counter:posts') || 0) + 1;
    await this.set('counter:posts', nextId);

    const newPost: CommunityPost = {
      id: nextId,
      authorId: post.authorId,
      content: post.content,
      imageUrl: post.imageUrl || null,
      videoUrl: (post as any).videoUrl || null,
      category: post.category || 'general',
      gameType: post.gameType || 'minecraft',
      likesCount: 0,
      commentsCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.set(`post:${newPost.id}`, newPost);
    return newPost;
  }

  async deletePost(id: number): Promise<void> {
    await this.delete(`post:${id}`);
    const commentKeys = await this.list(`post:${id}:comment:`);
    for (const key of commentKeys) {
      await this.delete(key);
    }
    const likeKeys = await this.list(`post:${id}:like:`);
    for (const key of likeKeys) {
      await this.delete(key);
    }
  }

  async getPostComments(postId: number): Promise<PostComment[]> {
    const keys = await this.list(`post:${postId}:comment:`);
    const comments: PostComment[] = [];

    for (const key of keys) {
      const comment: PostComment = await this.get(key);
      if (comment) comments.push(comment);
    }

    return comments.sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime());
  }

  async createComment(comment: InsertPostComment): Promise<PostComment> {
    const nextId = (await this.get('counter:comments') || 0) + 1;
    await this.set('counter:comments', nextId);

    const newComment: PostComment = {
      id: nextId,
      postId: comment.postId,
      authorId: comment.authorId,
      content: comment.content,
      createdAt: new Date(),
    };

    await this.set(`post:${comment.postId}:comment:${nextId}`, newComment);

    const post = await this.getPost(comment.postId);
    if (post) {
      post.commentsCount = (post.commentsCount || 0) + 1;
      await this.set(`post:${comment.postId}`, post);
    }

    return newComment;
  }

  async likePost(postId: number, userId: number): Promise<void> {
    const existingLike = await this.get(`post:${postId}:like:${userId}`);
    if (existingLike) return;

    const like: PostLike = {
      id: Date.now(),
      postId,
      userId,
      createdAt: new Date(),
    };

    await this.set(`post:${postId}:like:${userId}`, like);

    const post = await this.getPost(postId);
    if (post) {
      post.likesCount = (post.likesCount || 0) + 1;
      await this.set(`post:${postId}`, post);
    }
  }

  async unlikePost(postId: number, userId: number): Promise<void> {
    const existingLike = await this.get(`post:${postId}:like:${userId}`);
    if (!existingLike) return;

    await this.delete(`post:${postId}:like:${userId}`);

    const post = await this.getPost(postId);
    if (post && post.likesCount && post.likesCount > 0) {
      post.likesCount--;
      await this.set(`post:${postId}`, post);
    }
  }

  async hasLikedPost(postId: number, userId: number): Promise<boolean> {
    const like = await this.get(`post:${postId}:like:${userId}`);
    return !!like;
  }

  async createAdminNotification(notification: InsertAdminNotification): Promise<AdminNotification> {
    const nextId = (await this.get('counter:admin_notifications') || 0) + 1;
    await this.set('counter:admin_notifications', nextId);

    const newNotification: AdminNotification = {
      id: nextId,
      title: notification.title,
      content: notification.content,
      createdAt: new Date(),
    };

    await this.set(`admin_notification:${nextId}`, newNotification);

    const users = await this.getAllUsers();
    for (const user of users) {
      if (!user.isAdmin) {
        await this.set(`user_notification:${user.id}:${nextId}`, {
          userId: user.id,
          notificationId: nextId,
          isRead: false,
          createdAt: new Date(),
        });
      }
    }

    return newNotification;
  }

  async getAdminNotifications(): Promise<AdminNotification[]> {
    const keys = await this.list('admin_notification:');
    const notifications: AdminNotification[] = [];

    for (const key of keys) {
      const notification: AdminNotification = await this.get(key);
      if (notification) notifications.push(notification);
    }

    return notifications.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async getUserNotifications(userId: number): Promise<Array<AdminNotification & { isRead: boolean }>> {
    const keys = await this.list(`user_notification:${userId}:`);
    const notifications: Array<AdminNotification & { isRead: boolean }> = [];

    for (const key of keys) {
      const userNotif = await this.get(key);
      if (userNotif) {
        const notification = await this.get(`admin_notification:${userNotif.notificationId}`);
        if (notification) {
          notifications.push({
            ...notification,
            isRead: userNotif.isRead,
          });
        }
      }
    }

    return notifications.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async markNotificationRead(userId: number, notificationId: number): Promise<void> {
    const key = `user_notification:${userId}:${notificationId}`;
    const userNotif = await this.get(key);
    if (userNotif) {
      userNotif.isRead = true;
      await this.set(key, userNotif);
    }
  }

  async getUnreadNotificationCount(userId: number): Promise<number> {
    const keys = await this.list(`user_notification:${userId}:`);
    let count = 0;

    for (const key of keys) {
      const userNotif = await this.get(key);
      if (userNotif && !userNotif.isRead) {
        count++;
      }
    }

    return count;
  }

  async getMapAddons(type?: string): Promise<MapAddon[]> {
    const keys = await this.list('mapaddon:');
    const addons: MapAddon[] = [];

    for (const key of keys) {
      if (key.startsWith('mapaddon:') && !key.includes(':comment:') && !key.includes(':like:')) {
        const addon: MapAddon = await this.get(key);
        if (addon) {
          if (!type || addon.type === type) {
            addons.push(addon);
          }
        }
      }
    }

    return addons.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async getMapAddon(id: number): Promise<MapAddon | undefined> {
    return await this.get(`mapaddon:${id}`);
  }

  async createMapAddon(addon: InsertMapAddon): Promise<MapAddon> {
    const nextId = (await this.get('counter:mapaddons') || 0) + 1;
    await this.set('counter:mapaddons', nextId);

    const newAddon: MapAddon = {
      id: nextId,
      authorId: addon.authorId,
      title: addon.title,
      description: addon.description,
      type: addon.type,
      imageUrl: addon.imageUrl || null,
      fileUrl: addon.fileUrl || null,
      fileName: addon.fileName || null,
      fileSize: addon.fileSize || null,
      downloadCount: 0,
      likesCount: 0,
      commentsCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.set(`mapaddon:${newAddon.id}`, newAddon);
    return newAddon;
  }

  async deleteMapAddon(id: number): Promise<void> {
    await this.delete(`mapaddon:${id}`);
    const commentKeys = await this.list(`mapaddon:${id}:comment:`);
    for (const key of commentKeys) {
      await this.delete(key);
    }
    const likeKeys = await this.list(`mapaddon:${id}:like:`);
    for (const key of likeKeys) {
      await this.delete(key);
    }
  }

  async incrementDownloadCount(id: number): Promise<void> {
    const addon = await this.getMapAddon(id);
    if (addon) {
      addon.downloadCount = (addon.downloadCount || 0) + 1;
      await this.set(`mapaddon:${id}`, addon);
    }
  }

  async getMapAddonComments(mapAddonId: number): Promise<MapAddonComment[]> {
    const keys = await this.list(`mapaddon:${mapAddonId}:comment:`);
    const comments: MapAddonComment[] = [];

    for (const key of keys) {
      const comment: MapAddonComment = await this.get(key);
      if (comment) comments.push(comment);
    }

    return comments.sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime());
  }

  async createMapAddonComment(comment: InsertMapAddonComment): Promise<MapAddonComment> {
    const nextId = (await this.get('counter:mapaddon_comments') || 0) + 1;
    await this.set('counter:mapaddon_comments', nextId);

    const newComment: MapAddonComment = {
      id: nextId,
      mapAddonId: comment.mapAddonId,
      authorId: comment.authorId,
      content: comment.content,
      createdAt: new Date(),
    };

    await this.set(`mapaddon:${comment.mapAddonId}:comment:${nextId}`, newComment);

    const addon = await this.getMapAddon(comment.mapAddonId);
    if (addon) {
      addon.commentsCount = (addon.commentsCount || 0) + 1;
      await this.set(`mapaddon:${comment.mapAddonId}`, addon);
    }

    return newComment;
  }

  async likeMapAddon(mapAddonId: number, userId: number): Promise<void> {
    const existingLike = await this.get(`mapaddon:${mapAddonId}:like:${userId}`);
    if (existingLike) return;

    const like = {
      id: Date.now(),
      mapAddonId,
      userId,
      createdAt: new Date(),
    };

    await this.set(`mapaddon:${mapAddonId}:like:${userId}`, like);

    const addon = await this.getMapAddon(mapAddonId);
    if (addon) {
      addon.likesCount = (addon.likesCount || 0) + 1;
      await this.set(`mapaddon:${mapAddonId}`, addon);
    }
  }

  async unlikeMapAddon(mapAddonId: number, userId: number): Promise<void> {
    const existingLike = await this.get(`mapaddon:${mapAddonId}:like:${userId}`);
    if (!existingLike) return;

    await this.delete(`mapaddon:${mapAddonId}:like:${userId}`);

    const addon = await this.getMapAddon(mapAddonId);
    if (addon && addon.likesCount && addon.likesCount > 0) {
      addon.likesCount--;
      await this.set(`mapaddon:${mapAddonId}`, addon);
    }
  }

  async hasLikedMapAddon(mapAddonId: number, userId: number): Promise<boolean> {
    const like = await this.get(`mapaddon:${mapAddonId}:like:${userId}`);
    return !!like;
  }

  // User posts
  async getUserPosts(userId: number): Promise<CommunityPost[]> {
    const keys = await this.list('post:');
    const posts: CommunityPost[] = [];

    for (const key of keys) {
      if (key.startsWith('post:') && !key.includes(':comment:') && !key.includes(':like:')) {
        const post: CommunityPost = await this.get(key);
        if (post && post.authorId === userId) {
          posts.push(post);
        }
      }
    }

    return posts.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  // Post notifications
  async getPostNotifications(userId: number): Promise<PostNotification[]> {
    const keys = await this.list(`post_notification:${userId}:`);
    const notifications: PostNotification[] = [];

    for (const key of keys) {
      const notification: PostNotification = await this.get(key);
      if (notification) notifications.push(notification);
    }

    return notifications.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async createPostNotification(notification: InsertPostNotification): Promise<PostNotification> {
    const nextId = (await this.get('counter:post_notifications') || 0) + 1;
    await this.set('counter:post_notifications', nextId);

    const newNotification: PostNotification = {
      id: nextId,
      recipientId: notification.recipientId,
      actorId: notification.actorId,
      postId: notification.postId,
      type: notification.type,
      isRead: false,
      createdAt: new Date(),
    };

    await this.set(`post_notification:${notification.recipientId}:${nextId}`, newNotification);
    return newNotification;
  }

  async markPostNotificationRead(notificationId: number): Promise<void> {
    const keys = await this.list('post_notification:');
    for (const key of keys) {
      const notification: PostNotification = await this.get(key);
      if (notification && notification.id === notificationId) {
        notification.isRead = true;
        await this.set(key, notification);
        break;
      }
    }
  }

  async getPostNotificationCount(userId: number): Promise<number> {
    const keys = await this.list(`post_notification:${userId}:`);
    let count = 0;

    for (const key of keys) {
      const notification: PostNotification = await this.get(key);
      if (notification && !notification.isRead) {
        count++;
      }
    }

    return count;
  }

  // Dating
  async getDatingProfile(userId: number): Promise<DatingProfile | undefined> {
    return await this.get(`dating_profile:${userId}`);
  }

  async getAllDatingProfiles(excludeUserId: number): Promise<DatingProfile[]> {
    const keys = await this.list('dating_profile:');
    const profiles: DatingProfile[] = [];

    for (const key of keys) {
      const profile: DatingProfile = await this.get(key);
      if (profile && profile.userId !== excludeUserId) {
        profiles.push(profile);
      }
    }

    return profiles.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async createDatingProfile(profile: InsertDatingProfile): Promise<DatingProfile> {
    const nextId = (await this.get('counter:dating_profiles') || 0) + 1;
    await this.set('counter:dating_profiles', nextId);

    const newProfile: DatingProfile = {
      id: nextId,
      userId: profile.userId,
      displayName: profile.displayName,
      age: profile.age,
      gender: profile.gender,
      interests: profile.interests,
      lookingFor: profile.lookingFor,
      bio: profile.bio || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.set(`dating_profile:${profile.userId}`, newProfile);
    return newProfile;
  }

  async getRandomMatch(userId: number, lookingFor: string): Promise<DatingProfile | undefined> {
    const keys = await this.list('dating_profile:');
    const matchingProfiles: DatingProfile[] = [];

    for (const key of keys) {
      const profile: DatingProfile = await this.get(key);
      if (profile && profile.userId !== userId && profile.gender === lookingFor) {
        matchingProfiles.push(profile);
      }
    }

    if (matchingProfiles.length === 0) return undefined;
    const randomIndex = Math.floor(Math.random() * matchingProfiles.length);
    return matchingProfiles[randomIndex];
  }

  async createDatingMatch(match: InsertDatingMatch): Promise<DatingMatch> {
    const nextId = (await this.get('counter:dating_matches') || 0) + 1;
    await this.set('counter:dating_matches', nextId);

    const newMatch: DatingMatch = {
      id: nextId,
      userAId: match.userAId,
      userBId: match.userBId,
      status: match.status || 'matched',
      createdAt: new Date(),
    };

    await this.set(`dating_match:${nextId}`, newMatch);
    return newMatch;
  }
}

export const storage = new ReplitDBStorage();