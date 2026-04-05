import type { Request } from 'express';

export type AuthenticatedUser = {
  sub?: string;
  id?: string;
  role?: string;
};

export type AuthenticatedRequest = Request & {
  requestId?: string;
  user?: AuthenticatedUser;
};
