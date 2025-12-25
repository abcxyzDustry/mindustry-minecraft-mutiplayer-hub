
import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import { storage } from "./storage.js";
import dgram from "dgram";
import { p2pRelayService } from "./p2p-relay.js";

interface WSClient {
  ws: WebSocket;
  userId: number;
  username: string;
  roomId?: number;
}

interface UDPRelay {
  roomId: number;
  hostSocket: dgram.Socket;
  hostPort: number;
  clients: Map<number, { ws: WebSocket; address?: string; port?: number }>;
}

const clients = new Map<WebSocket, WSClient>();
const userSockets = new Map<number, WebSocket>();
const udpRelays = new Map<number, UDPRelay>();

export function getUserSockets() {
  return userSockets;
}

export async function broadcastFriendRoomOnline(room: any, hostUser: any) {
  const friends = await storage.getFriends(room.hostId);
  const roomData = {
    type: "friend_room_online",
    payload: {
      room: {
        ...room,
        hostName: hostUser.displayName,
        hostAvatar: hostUser.avatar,
      }
    }
  };
  
  friends.forEach(friend => {
    const friendWs = userSockets.get(friend.id);
    if (friendWs && friendWs.readyState === WebSocket.OPEN) {
      friendWs.send(JSON.stringify(roomData));
    }
  });
}

export async function broadcastFriendRoomOffline(roomId: number, hostId: number) {
  const friends = await storage.getFriends(hostId);
  const data = {
    type: "friend_room_offline",
    payload: { roomId }
  };
  
  friends.forEach(friend => {
    const friendWs = userSockets.get(friend.id);
    if (friendWs && friendWs.readyState === WebSocket.OPEN) {
      friendWs.send(JSON.stringify(data));
    }
  });
}

export function broadcastRoomPresence(roomId: number, currentPlayers: number, maxPlayers: number) {
  const data = JSON.stringify({
    type: "room_presence",
    payload: { roomId, currentPlayers, maxPlayers }
  });
  
  clients.forEach((client) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(data);
    }
  });
}

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws) => {
    console.log("New WebSocket connection");

    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString());
        await handleMessage(ws, message);
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });

    ws.on("close", () => {
      const client = clients.get(ws);
      if (client) {
        storage.updateUserOnlineStatus(client.userId, false);
        userSockets.delete(client.userId);
        clients.delete(ws);
        broadcastUserStatus(client.userId, false);
        
        // Cleanup UDP relay if host disconnects
        if (client.roomId) {
          const relay = udpRelays.get(client.roomId);
          if (relay && relay.clients.has(client.userId)) {
            relay.clients.delete(client.userId);
            if (relay.clients.size === 0) {
              relay.hostSocket.close();
              udpRelays.delete(client.roomId);
              console.log(`UDP relay closed for room ${client.roomId}`);
            }
          }
        }
      }
    });
  });

  return wss;
}

async function handleMessage(ws: WebSocket, message: any) {
  const { type, payload } = message;

  switch (type) {
    case "auth": {
      const user = await storage.getUser(payload.userId);
      if (user) {
        clients.set(ws, { ws, userId: user.id, username: user.username });
        userSockets.set(user.id, ws);
        await storage.updateUserOnlineStatus(user.id, true);
        broadcastUserStatus(user.id, true);
        ws.send(JSON.stringify({ type: "auth_success", payload: { userId: user.id } }));
      }
      break;
    }

    case "global_message": {
      const client = clients.get(ws);
      if (client && payload.gameMode && (payload.gameMode === 'minecraft' || payload.gameMode === 'mindustry')) {
        const msg = await storage.createMessage(client.userId, payload.content, undefined, undefined, true);
        const user = await storage.getUser(client.userId);
        broadcast({
          type: "global_message",
          payload: {
            id: msg.id,
            senderId: client.userId,
            senderName: user?.displayName || client.username,
            content: payload.content,
            gameMode: payload.gameMode,
            createdAt: msg.createdAt,
          },
        });
      }
      break;
    }

    case "private_message": {
      const client = clients.get(ws);
      if (client) {
        const msg = await storage.createMessage(client.userId, payload.content, payload.receiverId);
        const user = await storage.getUser(client.userId);
        const messageData = {
          type: "private_message",
          payload: {
            id: msg.id,
            senderId: client.userId,
            senderName: user?.displayName || client.username,
            receiverId: payload.receiverId,
            content: payload.content,
            createdAt: msg.createdAt,
          },
        };
        
        ws.send(JSON.stringify(messageData));
        
        const receiverWs = userSockets.get(payload.receiverId);
        if (receiverWs && receiverWs.readyState === WebSocket.OPEN) {
          receiverWs.send(JSON.stringify(messageData));
        }
      }
      break;
    }

    case "room_message": {
      const client = clients.get(ws);
      if (client && payload.roomId) {
        const msg = await storage.createMessage(client.userId, payload.content, undefined, payload.roomId);
        const user = await storage.getUser(client.userId);
        const members = await storage.getRoomMembers(payload.roomId);
        
        const messageData = {
          type: "room_message",
          payload: {
            id: msg.id,
            roomId: payload.roomId,
            senderId: client.userId,
            senderName: user?.displayName || client.username,
            content: payload.content,
            createdAt: msg.createdAt,
          },
        };

        members.forEach((member) => {
          const memberWs = userSockets.get(member.id);
          if (memberWs && memberWs.readyState === WebSocket.OPEN) {
            memberWs.send(JSON.stringify(messageData));
          }
        });
      }
      break;
    }

    case "join_room": {
      const client = clients.get(ws);
      if (client) {
        client.roomId = payload.roomId;
        clients.set(ws, client);
        
        const room = await storage.getRoom(payload.roomId);
        broadcast({
          type: "room_updated",
          payload: { room },
        });
        
        broadcastToRoom(payload.roomId, {
          type: "user_joined_room",
          payload: { userId: client.userId, username: client.username, roomId: payload.roomId },
        });
      }
      break;
    }

    case "leave_room": {
      const client = clients.get(ws);
      if (client && client.roomId) {
        const roomId = client.roomId;
        client.roomId = undefined;
        clients.set(ws, client);
        
        const room = await storage.getRoom(roomId);
        broadcast({
          type: "room_updated",
          payload: { room },
        });
        
        broadcastToRoom(roomId, {
          type: "user_left_room",
          payload: { userId: client.userId, username: client.username, roomId },
        });
      }
      break;
    }

    case "start_udp_relay": {
      const client = clients.get(ws);
      if (client && payload.roomId) {
        const relay = startUDPRelay(payload.roomId, client.userId);
        ws.send(JSON.stringify({
          type: "udp_relay_started",
          payload: {
            roomId: payload.roomId,
            relayPort: relay.hostPort,
          },
        }));
      }
      break;
    }

    case "join_udp_relay": {
      const client = clients.get(ws);
      if (client && payload.roomId) {
        const relay = udpRelays.get(payload.roomId);
        if (relay) {
          relay.clients.set(client.userId, { ws });
          ws.send(JSON.stringify({
            type: "udp_relay_joined",
            payload: { roomId: payload.roomId },
          }));
        }
      }
      break;
    }

    case "udp_packet": {
      const client = clients.get(ws);
      if (client && payload.roomId) {
        const relay = udpRelays.get(payload.roomId);
        if (relay) {
          const packetData = Buffer.from(payload.data, 'base64');
          
          // Forward to all other clients in the room
          relay.clients.forEach((clientData, userId) => {
            if (userId !== client.userId && clientData.ws.readyState === WebSocket.OPEN) {
              clientData.ws.send(JSON.stringify({
                type: "udp_packet",
                payload: {
                  roomId: payload.roomId,
                  senderId: client.userId,
                  data: payload.data,
                },
              }));
            }
          });
        }
      }
      break;
    }

    case "room_created": {
      broadcast({
        type: "room_created",
        payload: payload,
      });
      break;
    }

    case "room_deleted": {
      const relay = udpRelays.get(payload.roomId);
      if (relay) {
        relay.hostSocket.close();
        udpRelays.delete(payload.roomId);
      }
      broadcast({
        type: "room_deleted",
        payload: payload,
      });
      break;
    }

    case "relay_create_room":
    case "relay_join_room":
    case "relay_leave_room":
    case "relay_heartbeat":
    case "relay_packet":
    case "relay_signal":
    case "relay_update_udp_info":
    case "relay_register_endpoint":
    case "relay_send_to_peer":
    case "relay_punch_hole": {
      const client = clients.get(ws);
      if (client) {
        p2pRelayService.handleWebSocketMessage(
          `user_${client.userId}`,
          ws,
          message
        );
      }
      break;
    }

    case "relay_send_udp": {
      const client = clients.get(ws);
      if (client && payload.roomId && payload.data) {
        const data = Buffer.from(payload.data, 'base64');
        p2pRelayService.sendUDPPacket(
          payload.roomId,
          data,
          payload.targetAddress || '127.0.0.1',
          payload.targetPort || 19132
        );
      }
      break;
    }

    case "get_relay_info": {
      const roomInfo = p2pRelayService.getRoomInfo(payload.roomId);
      ws.send(JSON.stringify({
        type: "relay_info",
        payload: roomInfo,
      }));
      break;
    }
  }
}

function startUDPRelay(roomId: number, hostUserId: number): UDPRelay {
  const existingRelay = udpRelays.get(roomId);
  if (existingRelay) {
    return existingRelay;
  }

  const socket = dgram.createSocket('udp4');
  const port = 19132 + roomId; // Dynamic port based on room ID

  socket.bind(port, '0.0.0.0');

  socket.on('message', (msg, rinfo) => {
    const relay = udpRelays.get(roomId);
    if (relay) {
      const data = msg.toString('base64');
      relay.clients.forEach((client, userId) => {
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(JSON.stringify({
            type: "udp_packet",
            payload: {
              roomId,
              data,
              address: rinfo.address,
              port: rinfo.port,
            },
          }));
        }
      });
    }
  });

  const relay: UDPRelay = {
    roomId,
    hostSocket: socket,
    hostPort: port,
    clients: new Map(),
  };

  udpRelays.set(roomId, relay);
  console.log(`UDP relay started for room ${roomId} on port ${port}`);

  return relay;
}

function broadcast(message: any) {
  const data = JSON.stringify(message);
  clients.forEach((client) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(data);
    }
  });
}

function broadcastToRoom(roomId: number, message: any) {
  const data = JSON.stringify(message);
  clients.forEach((client) => {
    if (client.roomId === roomId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(data);
    }
  });
}

function broadcastUserStatus(userId: number, isOnline: boolean) {
  broadcast({
    type: "user_status",
    payload: { userId, isOnline },
  });
}
