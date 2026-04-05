import type { Socket } from 'socket.io';
import type { SocketUser } from './socket-user.interface';

export type AuthenticatedSocket = Socket & {
  data: {
    user?: SocketUser;
  };
};
