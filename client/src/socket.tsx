import { io, Socket } from 'socket.io-client';
import { getToken } from './api';

let socket: Socket | null = null;

/** Lazily create the socket, authenticated with the in-memory JWT. */
export function getSocket(): Socket {
  if (!socket) {
    socket = io('/', { auth: { token: getToken() }, autoConnect: true });
  }
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
