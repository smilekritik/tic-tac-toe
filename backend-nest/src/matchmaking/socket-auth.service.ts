import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TokenService } from '../auth/token.service';
import type { SocketUser } from './interfaces/socket-user.interface';

@Injectable()
export class SocketAuthService {
  constructor(
    private readonly tokenService: TokenService,
    private readonly prisma: PrismaService,
  ) {}

  async authenticate(token: unknown): Promise<SocketUser | null> {
    if (typeof token !== 'string' || !token.trim()) {
      return null;
    }

    try {
      const payload = this.tokenService.verifyAccessToken(token);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          username: true,
          role: true,
        },
      });

      if (!user) {
        return null;
      }

      return user;
    } catch {
      return null;
    }
  }
}
