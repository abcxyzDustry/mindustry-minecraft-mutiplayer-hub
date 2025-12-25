import dgram from 'dgram';
import { WebSocket } from 'ws';

interface RelayPeer {
  peerId: string;
  ws: WebSocket;
  externalAddress?: string;
  externalPort?: number;
  internalAddress?: string;
  internalPort?: number;
  lastHeartbeat: number;
  udpEndpointDiscovered: boolean;
}

interface RelayRoom {
  roomId: number;
  hostPeerId: string;
  udpSocket: dgram.Socket;
  relayPort: number;
  peers: Map<string, RelayPeer>;
  endpointMap: Map<string, string>;
  createdAt: number;
  mcpePort: number;
}

class P2PRelayService {
  private rooms: Map<number, RelayRoom> = new Map();
  private peerToRoom: Map<string, number> = new Map();
  private addressToPeer: Map<string, { roomId: number; peerId: string }> = new Map();
  private basePort = 19132;
  private maxPort = 19200;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startHeartbeatMonitor();
  }

  private startHeartbeatMonitor() {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      this.rooms.forEach((room, roomId) => {
        room.peers.forEach((peer, peerId) => {
          if (now - peer.lastHeartbeat > 30000) {
            console.log(`Peer ${peerId} timed out in room ${roomId}`);
            this.removePeerFromRoom(roomId, peerId);
          }
        });

        if (room.peers.size === 0) {
          this.closeRoom(roomId);
        }
      });
    }, 10000);
  }

  private getAddressKey(address: string, port: number): string {
    return `${address}:${port}`;
  }

  createRoom(roomId: number, hostPeerId: string, hostWs: WebSocket, mcpePort: number = 19132): RelayRoom | null {
    if (this.rooms.has(roomId)) {
      console.log(`[MCPE] Room ${roomId} already exists, adding host ${hostPeerId}`);
      const existingRoom = this.rooms.get(roomId)!;
      existingRoom.peers.set(hostPeerId, {
        peerId: hostPeerId,
        ws: hostWs,
        lastHeartbeat: Date.now(),
        udpEndpointDiscovered: false,
      });
      this.peerToRoom.set(hostPeerId, roomId);
      return existingRoom;
    }

    const relayPort = this.findAvailablePort();
    if (!relayPort) {
      console.error('No available ports for relay');
      return null;
    }

    const udpSocket = dgram.createSocket({
      type: 'udp4',
      reuseAddr: true,
    });

    // Configure socket for Minecraft PE
    udpSocket.on('message', (msg, rinfo) => {
      this.handleUDPMessage(roomId, msg, rinfo);
    });

    udpSocket.on('error', (err) => {
      console.error(`[MCPE] UDP socket error for room ${roomId}:`, err);
      // Try to recover from errors
      if (err.message.includes('EADDRINUSE')) {
        console.log(`[MCPE] Port ${relayPort} in use, closing room ${roomId}`);
        this.closeRoom(roomId);
      }
    });

    udpSocket.on('listening', () => {
      const addr = udpSocket.address();
      console.log(`[MCPE] UDP relay for room ${roomId} listening on ${addr.address}:${addr.port}`);
      
      // Increase buffer sizes for Minecraft PE packets
      try {
        udpSocket.setRecvBufferSize(1024 * 1024); // 1MB
        udpSocket.setSendBufferSize(1024 * 1024); // 1MB
      } catch (e) {
        console.warn('[MCPE] Could not set buffer sizes:', e);
      }
    });

    try {
      udpSocket.bind(relayPort, '0.0.0.0');
    } catch (error) {
      console.error(`[MCPE] Failed to bind port ${relayPort}:`, error);
      udpSocket.close();
      return null;
    }

    const room: RelayRoom = {
      roomId,
      hostPeerId,
      udpSocket,
      relayPort,
      peers: new Map(),
      endpointMap: new Map(),
      createdAt: Date.now(),
      mcpePort,
    };

    room.peers.set(hostPeerId, {
      peerId: hostPeerId,
      ws: hostWs,
      lastHeartbeat: Date.now(),
      udpEndpointDiscovered: false,
    });

    this.rooms.set(roomId, room);
    this.peerToRoom.set(hostPeerId, roomId);

    console.log(`[MCPE] ========================================`);
    console.log(`[MCPE] Room ${roomId} created successfully`);
    console.log(`[MCPE] Relay Port: ${relayPort}`);
    console.log(`[MCPE] Minecraft PE Port: ${mcpePort}`);
    console.log(`[MCPE] Host Peer: ${hostPeerId}`);
    console.log(`[MCPE] ========================================`);

    return room;
  }

  joinRoom(roomId: number, peerId: string, peerWs: WebSocket): boolean {
    const room = this.rooms.get(roomId);
    if (!room) {
      console.error(`Room ${roomId} not found`);
      return false;
    }

    if (room.peers.has(peerId)) {
      const peer = room.peers.get(peerId)!;
      peer.ws = peerWs;
      peer.lastHeartbeat = Date.now();
      return true;
    }

    room.peers.set(peerId, {
      peerId,
      ws: peerWs,
      lastHeartbeat: Date.now(),
      udpEndpointDiscovered: false,
    });

    this.peerToRoom.set(peerId, roomId);

    this.notifyPeersUpdate(room);

    this.broadcastPeerList(room);

    console.log(`Peer ${peerId} joined room ${roomId}`);
    return true;
  }

  leaveRoom(roomId: number, peerId: string) {
    this.removePeerFromRoom(roomId, peerId);
  }

  private removePeerFromRoom(roomId: number, peerId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const peer = room.peers.get(peerId);
    if (peer && peer.externalAddress && peer.externalPort) {
      const addrKey = this.getAddressKey(peer.externalAddress, peer.externalPort);
      this.addressToPeer.delete(addrKey);
      room.endpointMap.delete(peerId);
    }

    room.peers.delete(peerId);
    this.peerToRoom.delete(peerId);

    if (room.peers.size === 0) {
      this.closeRoom(roomId);
    } else if (peerId === room.hostPeerId) {
      const newHost = room.peers.keys().next().value;
      if (newHost) {
        room.hostPeerId = newHost;
        this.notifyNewHost(room, newHost);
      }
    }

    this.notifyPeersUpdate(room);
  }

  private closeRoom(roomId: number) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    if (room.udpSocket) {
      room.udpSocket.close();
    }

    room.peers.forEach((peer, peerId) => {
      this.peerToRoom.delete(peerId);
      if (peer.externalAddress && peer.externalPort) {
        this.addressToPeer.delete(this.getAddressKey(peer.externalAddress, peer.externalPort));
      }
    });

    this.rooms.delete(roomId);
    console.log(`P2P Relay room ${roomId} closed`);
  }

  private handleUDPMessage(roomId: number, msg: Buffer, rinfo: dgram.RemoteInfo) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    // Minecraft PE uses RakNet protocol - verify packet structure
    if (msg.length < 1) return;

    const addressKey = this.getAddressKey(rinfo.address, rinfo.port);
    let senderPeerId: string | null = null;

    const peerMapping = this.addressToPeer.get(addressKey);
    if (peerMapping && peerMapping.roomId === roomId) {
      senderPeerId = peerMapping.peerId;
    }

    if (!senderPeerId) {
      for (const [peerId, peer] of room.peers) {
        if (!peer.udpEndpointDiscovered) {
          peer.externalAddress = rinfo.address;
          peer.externalPort = rinfo.port;
          peer.udpEndpointDiscovered = true;
          senderPeerId = peerId;
          
          this.addressToPeer.set(addressKey, { roomId, peerId });
          room.endpointMap.set(peerId, addressKey);
          
          console.log(`[MCPE] Discovered endpoint for peer ${peerId}: ${addressKey}`);
          
          this.broadcastEndpointUpdate(room, peerId, rinfo.address, rinfo.port);
          break;
        }
      }
    }

    if (senderPeerId) {
      const sender = room.peers.get(senderPeerId);
      if (sender) {
        sender.lastHeartbeat = Date.now();
      }
    }

    // Forward raw UDP packets to all peers except sender
    // This preserves Minecraft PE's RakNet protocol packets
    room.peers.forEach((peer, peerId) => {
      if (peerId === senderPeerId) return;
      
      if (peer.externalAddress && peer.externalPort) {
        // Direct UDP forwarding - fastest for Minecraft PE
        room.udpSocket.send(msg, 0, msg.length, peer.externalPort, peer.externalAddress, (err) => {
          if (err) {
            console.error(`[MCPE] Failed to forward UDP to ${peer.externalAddress}:${peer.externalPort}:`, err);
          }
        });
      } else if (peer.ws && peer.ws.readyState === WebSocket.OPEN) {
        // Fallback to WebSocket if UDP not available
        peer.ws.send(JSON.stringify({
          type: 'relay_udp_packet',
          payload: {
            roomId,
            data: msg.toString('base64'),
            sourceAddress: rinfo.address,
            sourcePort: rinfo.port,
            senderId: senderPeerId,
            timestamp: Date.now(),
          },
        }));
      }
    });
  }

  handleWebSocketMessage(peerId: string, ws: WebSocket, message: any) {
    const { type, payload } = message;

    switch (type) {
      case 'relay_create_room': {
        const room = this.createRoom(payload.roomId, peerId, ws, payload.mcpePort || 19132);
        if (room) {
          ws.send(JSON.stringify({
            type: 'relay_room_created',
            payload: {
              roomId: payload.roomId,
              relayPort: room.relayPort,
              peerId,
            },
          }));
        } else {
          ws.send(JSON.stringify({
            type: 'relay_error',
            payload: { error: 'Failed to create room' },
          }));
        }
        break;
      }

      case 'relay_join_room': {
        const joined = this.joinRoom(payload.roomId, peerId, ws);
        const joinedRoom = this.rooms.get(payload.roomId);
        ws.send(JSON.stringify({
          type: 'relay_room_joined',
          payload: {
            success: joined,
            roomId: payload.roomId,
            relayPort: joinedRoom?.relayPort,
            relayHost: process.env.REPLIT_DEV_DOMAIN || 'localhost',
            hostPeerId: joinedRoom?.hostPeerId,
            peers: joinedRoom ? Array.from(joinedRoom.peers.keys()) : [],
            endpoints: joinedRoom ? Object.fromEntries(joinedRoom.endpointMap) : {},
          },
        }));
        break;
      }

      case 'relay_leave_room': {
        this.leaveRoom(payload.roomId, peerId);
        ws.send(JSON.stringify({
          type: 'relay_room_left',
          payload: { roomId: payload.roomId },
        }));
        break;
      }

      case 'relay_heartbeat': {
        this.updateHeartbeat(peerId);
        ws.send(JSON.stringify({
          type: 'relay_heartbeat_ack',
          payload: { timestamp: Date.now() },
        }));
        break;
      }

      case 'relay_register_endpoint': {
        this.registerEndpoint(peerId, payload.address, payload.port);
        break;
      }

      case 'relay_send_to_peer': {
        this.sendToPeer(peerId, payload.targetPeerId, payload.data);
        break;
      }

      case 'relay_packet': {
        this.broadcastPacket(peerId, payload.data, payload.targetPeerId);
        break;
      }

      case 'relay_punch_hole': {
        this.initiateHolePunch(peerId, payload.targetPeerId);
        break;
      }

      case 'relay_signal':
        this.forwardSignal(peerId, payload.targetPeerId, payload.signal);
        break;

      case 'relay_update_udp_info':
        this.updatePeerEndpoint(peerId, payload.address, payload.port);
        break;
    }
  }

  private updateHeartbeat(peerId: string) {
    const roomId = this.peerToRoom.get(peerId);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (!room) return;

    const peer = room.peers.get(peerId);
    if (peer) {
      peer.lastHeartbeat = Date.now();
    }
  }

  private registerEndpoint(peerId: string, address: string, port: number) {
    const roomId = this.peerToRoom.get(peerId);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (!room) return;

    const peer = room.peers.get(peerId);
    if (peer) {
      if (peer.externalAddress && peer.externalPort) {
        this.addressToPeer.delete(this.getAddressKey(peer.externalAddress, peer.externalPort));
      }

      peer.externalAddress = address;
      peer.externalPort = port;
      peer.udpEndpointDiscovered = true;

      const addrKey = this.getAddressKey(address, port);
      this.addressToPeer.set(addrKey, { roomId, peerId });
      room.endpointMap.set(peerId, addrKey);

      console.log(`Registered endpoint for peer ${peerId}: ${addrKey}`);
      this.broadcastEndpointUpdate(room, peerId, address, port);
    }
  }

  private updatePeerEndpoint(peerId: string, address: string, port: number) {
    this.registerEndpoint(peerId, address, port);
  }

  private sendToPeer(senderId: string, targetPeerId: string, data: string) {
    const roomId = this.peerToRoom.get(senderId);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (!room) return;

    const targetPeer = room.peers.get(targetPeerId);
    if (!targetPeer) return;

    const packetData = Buffer.from(data, 'base64');

    if (targetPeer.externalAddress && targetPeer.externalPort) {
      // Send entire buffer for Minecraft PE RakNet packets
      room.udpSocket.send(packetData, 0, packetData.length, targetPeer.externalPort, targetPeer.externalAddress, (err) => {
        if (err) {
          console.error(`[MCPE] Failed to send to peer ${targetPeerId}:`, err);
        }
      });
    } else if (targetPeer.ws && targetPeer.ws.readyState === WebSocket.OPEN) {
      targetPeer.ws.send(JSON.stringify({
        type: 'relay_packet',
        payload: {
          senderId,
          data,
          timestamp: Date.now(),
        },
      }));
    }
  }

  private broadcastPacket(senderId: string, data: string, targetPeerId?: string) {
    const roomId = this.peerToRoom.get(senderId);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (!room) return;

    const packetData = Buffer.from(data, 'base64');

    if (targetPeerId) {
      this.sendToPeer(senderId, targetPeerId, data);
      return;
    }

    room.peers.forEach((peer, peerId) => {
      if (peerId === senderId) return;

      if (peer.externalAddress && peer.externalPort) {
        room.udpSocket.send(packetData, peer.externalPort, peer.externalAddress, (err) => {
          if (err) {
            console.error(`Failed to broadcast to peer ${peerId}:`, err);
          }
        });
      } else if (peer.ws && peer.ws.readyState === WebSocket.OPEN) {
        peer.ws.send(JSON.stringify({
          type: 'relay_packet',
          payload: {
            senderId,
            data,
            timestamp: Date.now(),
          },
        }));
      }
    });
  }

  private initiateHolePunch(senderId: string, targetPeerId: string) {
    const roomId = this.peerToRoom.get(senderId);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (!room) return;

    const senderPeer = room.peers.get(senderId);
    const targetPeer = room.peers.get(targetPeerId);

    if (!senderPeer || !targetPeer) return;

    if (senderPeer.ws && senderPeer.ws.readyState === WebSocket.OPEN && 
        targetPeer.externalAddress && targetPeer.externalPort) {
      senderPeer.ws.send(JSON.stringify({
        type: 'relay_punch_target',
        payload: {
          targetPeerId,
          address: targetPeer.externalAddress,
          port: targetPeer.externalPort,
        },
      }));
    }

    if (targetPeer.ws && targetPeer.ws.readyState === WebSocket.OPEN &&
        senderPeer.externalAddress && senderPeer.externalPort) {
      targetPeer.ws.send(JSON.stringify({
        type: 'relay_punch_target',
        payload: {
          targetPeerId: senderId,
          address: senderPeer.externalAddress,
          port: senderPeer.externalPort,
        },
      }));
    }
  }

  private forwardSignal(senderId: string, targetPeerId: string, signal: any) {
    const roomId = this.peerToRoom.get(senderId);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (!room) return;

    const targetPeer = room.peers.get(targetPeerId);
    if (targetPeer && targetPeer.ws.readyState === WebSocket.OPEN) {
      targetPeer.ws.send(JSON.stringify({
        type: 'relay_signal',
        payload: {
          senderId,
          signal,
        },
      }));
    }
  }

  private broadcastEndpointUpdate(room: RelayRoom, peerId: string, address: string, port: number) {
    room.peers.forEach((peer, id) => {
      if (id !== peerId && peer.ws && peer.ws.readyState === WebSocket.OPEN) {
        peer.ws.send(JSON.stringify({
          type: 'relay_endpoint_discovered',
          payload: {
            roomId: room.roomId,
            peerId,
            address,
            port,
          },
        }));
      }
    });
  }

  private broadcastPeerList(room: RelayRoom) {
    const peersList = Array.from(room.peers.keys());
    const endpoints: Record<string, string> = {};
    
    room.endpointMap.forEach((addr, peerId) => {
      endpoints[peerId] = addr;
    });

    room.peers.forEach((peer) => {
      if (peer.ws && peer.ws.readyState === WebSocket.OPEN) {
        peer.ws.send(JSON.stringify({
          type: 'relay_peer_list',
          payload: {
            roomId: room.roomId,
            peers: peersList,
            hostPeerId: room.hostPeerId,
            endpoints,
            relayPort: room.relayPort,
          },
        }));
      }
    });
  }

  private notifyPeersUpdate(room: RelayRoom) {
    this.broadcastPeerList(room);
  }

  private notifyNewHost(room: RelayRoom, newHostId: string) {
    room.peers.forEach((peer) => {
      if (peer.ws && peer.ws.readyState === WebSocket.OPEN) {
        peer.ws.send(JSON.stringify({
          type: 'relay_host_changed',
          payload: {
            roomId: room.roomId,
            newHostPeerId: newHostId,
          },
        }));
      }
    });
  }

  sendUDPPacket(roomId: number, data: Buffer, targetAddress: string, targetPort: number) {
    const room = this.rooms.get(roomId);
    if (!room || !room.udpSocket) return;

    room.udpSocket.send(data, targetPort, targetAddress, (err) => {
      if (err) {
        console.error(`Failed to send UDP packet:`, err);
      }
    });
  }

  private findAvailablePort(): number | null {
    for (let port = this.basePort; port <= this.maxPort; port++) {
      let isUsed = false;
      this.rooms.forEach((room) => {
        if (room.relayPort === port) {
          isUsed = true;
        }
      });
      if (!isUsed) {
        return port;
      }
    }
    return null;
  }

  getRoomInfo(roomId: number) {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const endpoints: Record<string, { address: string; port: number }> = {};
    room.peers.forEach((peer, peerId) => {
      if (peer.externalAddress && peer.externalPort) {
        endpoints[peerId] = {
          address: peer.externalAddress,
          port: peer.externalPort,
        };
      }
    });

    return {
      roomId: room.roomId,
      hostPeerId: room.hostPeerId,
      relayPort: room.relayPort,
      mcpePort: room.mcpePort,
      peerCount: room.peers.size,
      peers: Array.from(room.peers.keys()),
      endpoints,
      createdAt: room.createdAt,
    };
  }

  getAllRooms() {
    const roomsList: any[] = [];
    this.rooms.forEach((room, roomId) => {
      roomsList.push(this.getRoomInfo(roomId));
    });
    return roomsList;
  }

  cleanup() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.rooms.forEach((room, roomId) => {
      this.closeRoom(roomId);
    });
  }
}

export const p2pRelayService = new P2PRelayService();
