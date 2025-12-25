import { useState, useEffect, useCallback, useRef } from 'react';

interface Message {
  id: number;
  senderId: number;
  senderName: string;
  content: string;
  receiverId?: number;
  roomId?: number;
  gameMode?: 'minecraft' | 'mindustry';
  createdAt: string;
}

interface FriendRoom {
  id: number;
  hostId: number;
  name: string;
  description?: string;
  hostName: string;
  hostAvatar?: string;
  currentPlayers: number;
  maxPlayers: number;
  gameVersion: string;
}

export function useWebSocket(userId: number | null) {
  const [connected, setConnected] = useState(false);
  const [globalMessages, setGlobalMessages] = useState<Message[]>([]);
  const [privateMessages, setPrivateMessages] = useState<Map<number, Message[]>>(new Map());
  const [roomMessages, setRoomMessages] = useState<Map<number, Message[]>>(new Map());
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());
  const [friendRooms, setFriendRooms] = useState<FriendRoom[]>([]);
  const [roomPresence, setRoomPresence] = useState<Map<number, { currentPlayers: number; maxPlayers: number }>>(new Map());
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!userId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      setConnected(true);
      socket.send(JSON.stringify({ type: 'auth', payload: { userId } }));
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleMessage(data);
    };

    socket.onclose = () => {
      setConnected(false);
    };

    wsRef.current = socket;

    return () => {
      socket.close();
    };
  }, [userId]);

  const handleMessage = (data: any) => {
    switch (data.type) {
      case 'global_message':
        if (data.payload.gameMode) {
          setGlobalMessages(prev => [...prev, data.payload]);
        }
        break;

      case 'private_message':
        const otherId = data.payload.senderId === userId ? data.payload.receiverId : data.payload.senderId;
        setPrivateMessages(prev => {
          const newMap = new Map(prev);
          const existing = newMap.get(otherId) || [];
          newMap.set(otherId, [...existing, data.payload]);
          return newMap;
        });
        break;

      case 'room_message':
        setRoomMessages(prev => {
          const newMap = new Map(prev);
          const existing = newMap.get(data.payload.roomId) || [];
          newMap.set(data.payload.roomId, [...existing, data.payload]);
          return newMap;
        });
        break;

      case 'user_status':
        setOnlineUsers(prev => {
          const newSet = new Set(prev);
          if (data.payload.isOnline) {
            newSet.add(data.payload.userId);
          } else {
            newSet.delete(data.payload.userId);
          }
          return newSet;
        });
        break;

      case 'room_updated':
      case 'room_created':
      case 'room_deleted':
        window.dispatchEvent(new CustomEvent('roomsChanged'));
        break;

      case 'room_presence':
        setRoomPresence(prev => {
          const newMap = new Map(prev);
          newMap.set(data.payload.roomId, {
            currentPlayers: data.payload.currentPlayers,
            maxPlayers: data.payload.maxPlayers,
          });
          return newMap;
        });
        window.dispatchEvent(new CustomEvent('roomsChanged'));
        break;

      case 'friend_room_online':
        setFriendRooms(prev => {
          const exists = prev.find(r => r.id === data.payload.room.id);
          if (exists) return prev;
          return [...prev, data.payload.room];
        });
        break;

      case 'friend_room_offline':
        setFriendRooms(prev => prev.filter(r => r.id !== data.payload.roomId));
        break;
    }
  };

  const sendGlobalMessage = useCallback((content: string, gameMode?: 'minecraft' | 'mindustry') => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'global_message',
        payload: { content, gameMode },
      }));
    }
  }, []);

  const sendPrivateMessage = useCallback((receiverId: number, content: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'private_message',
        payload: { receiverId, content },
      }));
    }
  }, []);

  const sendRoomMessage = useCallback((roomId: number, content: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'room_message',
        payload: { roomId, content },
      }));
    }
  }, []);

  const joinRoom = useCallback((roomId: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'join_room',
        payload: { roomId },
      }));
    }
  }, []);

  const leaveRoom = useCallback((roomId: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'leave_room',
        payload: { roomId },
      }));
    }
  }, []);

  const startUDPRelay = useCallback((roomId: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'start_udp_relay',
        payload: { roomId },
      }));
    }
  }, []);

  const joinUDPRelay = useCallback((roomId: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'join_udp_relay',
        payload: { roomId },
      }));
    }
  }, []);

  const sendUDPPacket = useCallback((roomId: number, data: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'udp_packet',
        payload: { roomId, data },
      }));
    }
  }, []);

  const createP2PRoom = useCallback((roomId: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'relay_create_room',
        payload: { roomId },
      }));
    }
  }, []);

  const joinP2PRoom = useCallback((roomId: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'relay_join_room',
        payload: { roomId },
      }));
    }
  }, []);

  const leaveP2PRoom = useCallback((roomId: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'relay_leave_room',
        payload: { roomId },
      }));
    }
  }, []);

  const sendP2PHeartbeat = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'relay_heartbeat',
        payload: {},
      }));
    }
  }, []);

  const sendP2PPacket = useCallback((roomId: number, data: string, targetPeerId?: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'relay_packet',
        payload: { roomId, data, targetPeerId },
      }));
    }
  }, []);

  const sendP2PSignal = useCallback((targetPeerId: string, signal: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'relay_signal',
        payload: { targetPeerId, signal },
      }));
    }
  }, []);

  return {
    connected,
    globalMessages,
    privateMessages,
    roomMessages,
    onlineUsers,
    friendRooms,
    roomPresence,
    sendGlobalMessage,
    sendPrivateMessage,
    sendRoomMessage,
    joinRoom,
    leaveRoom,
    startUDPRelay,
    joinUDPRelay,
    sendUDPPacket,
    createP2PRoom,
    joinP2PRoom,
    leaveP2PRoom,
    sendP2PHeartbeat,
    sendP2PPacket,
    sendP2PSignal,
    ws: wsRef.current,
  };
}
