import { pgTable, text, serial, integer, boolean, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  displayName: text("display_name").notNull(),
  avatar: text("avatar"),
  bio: text("bio"),
  isOnline: boolean("is_online").default(false),
  isAdmin: boolean("is_admin").default(false),
  lastSeen: timestamp("last_seen").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const adminNotifications = pgTable("admin_notifications", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userNotifications = pgTable("user_notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  notificationId: integer("notification_id").notNull().references(() => adminNotifications.id),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const friendships = pgTable("friendships", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  friendId: integer("friend_id").notNull().references(() => users.id),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull().references(() => users.id),
  receiverId: integer("receiver_id").references(() => users.id),
  roomId: integer("room_id").references(() => mcRooms.id),
  content: text("content").notNull(),
  isGlobal: boolean("is_global").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const mcRooms = pgTable("mc_rooms", {
  id: serial("id").primaryKey(),
  hostId: integer("host_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  hostIp: text("host_ip"),
  hostPort: integer("host_port").default(19132),
  maxPlayers: integer("max_players").default(5),
  currentPlayers: integer("current_players").default(0),
  isActive: boolean("is_active").default(true),
  gameVersion: text("game_version").default("1.20"),
  gameType: text("game_type").default("minecraft"),
  mapName: text("map_name"),
  mindustryGameMode: text("mindustry_game_mode"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const roomMembers = pgTable("room_members", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").notNull().references(() => mcRooms.id),
  userId: integer("user_id").notNull().references(() => users.id),
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  sentMessages: many(messages, { relationName: "sentMessages" }),
  receivedMessages: many(messages, { relationName: "receivedMessages" }),
  hostedRooms: many(mcRooms),
  friendships: many(friendships, { relationName: "userFriendships" }),
  roomMemberships: many(roomMembers),
}));

export const friendshipsRelations = relations(friendships, ({ one }) => ({
  user: one(users, { fields: [friendships.userId], references: [users.id], relationName: "userFriendships" }),
  friend: one(users, { fields: [friendships.friendId], references: [users.id] }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, { fields: [messages.senderId], references: [users.id], relationName: "sentMessages" }),
  receiver: one(users, { fields: [messages.receiverId], references: [users.id], relationName: "receivedMessages" }),
  room: one(mcRooms, { fields: [messages.roomId], references: [mcRooms.id] }),
}));

export const mcRoomsRelations = relations(mcRooms, ({ one, many }) => ({
  host: one(users, { fields: [mcRooms.hostId], references: [users.id] }),
  members: many(roomMembers),
  messages: many(messages),
}));

export const roomMembersRelations = relations(roomMembers, ({ one }) => ({
  room: one(mcRooms, { fields: [roomMembers.roomId], references: [mcRooms.id] }),
  user: one(users, { fields: [roomMembers.userId], references: [users.id] }),
}));

export const communityPosts = pgTable("community_posts", {
  id: serial("id").primaryKey(),
  authorId: integer("author_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  videoUrl: text("video_url"),
  category: text("category").default("general"),
  gameType: text("game_type").default("minecraft"),
  likesCount: integer("likes_count").default(0),
  commentsCount: integer("comments_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const mapAddons = pgTable("map_addons", {
  id: serial("id").primaryKey(),
  authorId: integer("author_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(),
  imageUrl: text("image_url"),
  fileUrl: text("file_url"),
  fileName: text("file_name"),
  fileSize: integer("file_size"),
  downloadCount: integer("download_count").default(0),
  likesCount: integer("likes_count").default(0),
  commentsCount: integer("comments_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const mapAddonLikes = pgTable("map_addon_likes", {
  id: serial("id").primaryKey(),
  mapAddonId: integer("map_addon_id").notNull().references(() => mapAddons.id),
  userId: integer("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const mapAddonComments = pgTable("map_addon_comments", {
  id: serial("id").primaryKey(),
  mapAddonId: integer("map_addon_id").notNull().references(() => mapAddons.id),
  authorId: integer("author_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const postComments = pgTable("post_comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => communityPosts.id),
  authorId: integer("author_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const postLikes = pgTable("post_likes", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => communityPosts.id),
  userId: integer("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const communityPostsRelations = relations(communityPosts, ({ one, many }) => ({
  author: one(users, { fields: [communityPosts.authorId], references: [users.id] }),
  comments: many(postComments),
  likes: many(postLikes),
}));

export const postCommentsRelations = relations(postComments, ({ one }) => ({
  post: one(communityPosts, { fields: [postComments.postId], references: [communityPosts.id] }),
  author: one(users, { fields: [postComments.authorId], references: [users.id] }),
}));

export const postLikesRelations = relations(postLikes, ({ one }) => ({
  post: one(communityPosts, { fields: [postLikes.postId], references: [communityPosts.id] }),
  user: one(users, { fields: [postLikes.userId], references: [users.id] }),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Friendship = typeof friendships.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type McRoom = typeof mcRooms.$inferSelect;
export type InsertMcRoom = typeof mcRooms.$inferInsert;
export type RoomMember = typeof roomMembers.$inferSelect;
export type CommunityPost = typeof communityPosts.$inferSelect;
export type InsertCommunityPost = typeof communityPosts.$inferInsert;
export type PostComment = typeof postComments.$inferSelect;
export type InsertPostComment = typeof postComments.$inferInsert;
export type PostLike = typeof postLikes.$inferSelect;
export type AdminNotification = typeof adminNotifications.$inferSelect;
export type InsertAdminNotification = typeof adminNotifications.$inferInsert;
export type UserNotification = typeof userNotifications.$inferSelect;
export type MapAddon = typeof mapAddons.$inferSelect;
export type InsertMapAddon = typeof mapAddons.$inferInsert;
export type MapAddonLike = typeof mapAddonLikes.$inferSelect;
export type MapAddonComment = typeof mapAddonComments.$inferSelect;
export type InsertMapAddonComment = typeof mapAddonComments.$inferInsert;

// Post Notifications - thông báo khi có người like/comment bài viết
export const postNotifications = pgTable("post_notifications", {
  id: serial("id").primaryKey(),
  recipientId: integer("recipient_id").notNull().references(() => users.id),
  actorId: integer("actor_id").notNull().references(() => users.id),
  postId: integer("post_id").notNull().references(() => communityPosts.id),
  type: text("type").notNull(), // 'like' or 'comment'
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const postNotificationsRelations = relations(postNotifications, ({ one }) => ({
  recipient: one(users, { fields: [postNotifications.recipientId], references: [users.id] }),
  actor: one(users, { fields: [postNotifications.actorId], references: [users.id] }),
  post: one(communityPosts, { fields: [postNotifications.postId], references: [communityPosts.id] }),
}));

// Dating Profiles - hồ sơ hẹn hò
export const datingProfiles = pgTable("dating_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => users.id),
  displayName: text("display_name").notNull(),
  age: integer("age").notNull(),
  gender: text("gender").notNull(), // 'male', 'female', 'other'
  interests: text("interests").notNull(),
  lookingFor: text("looking_for").notNull(),
  bio: text("bio"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const datingProfilesRelations = relations(datingProfiles, ({ one }) => ({
  user: one(users, { fields: [datingProfiles.userId], references: [users.id] }),
}));

// Dating Matches - lịch sử match
export const datingMatches = pgTable("dating_matches", {
  id: serial("id").primaryKey(),
  userAId: integer("user_a_id").notNull().references(() => users.id),
  userBId: integer("user_b_id").notNull().references(() => users.id),
  status: text("status").default("matched"), // 'matched', 'chatting', 'ended'
  createdAt: timestamp("created_at").defaultNow(),
});

export const datingMatchesRelations = relations(datingMatches, ({ one }) => ({
  userA: one(users, { fields: [datingMatches.userAId], references: [users.id], relationName: "userAMatches" }),
  userB: one(users, { fields: [datingMatches.userBId], references: [users.id], relationName: "userBMatches" }),
}));

export type PostNotification = typeof postNotifications.$inferSelect;
export type InsertPostNotification = typeof postNotifications.$inferInsert;
export type DatingProfile = typeof datingProfiles.$inferSelect;
export type InsertDatingProfile = typeof datingProfiles.$inferInsert;
export type DatingMatch = typeof datingMatches.$inferSelect;
export type InsertDatingMatch = typeof datingMatches.$inferInsert;