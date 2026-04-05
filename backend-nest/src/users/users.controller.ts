import { Controller, Get, Param } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('api/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':username')
  async getPublicProfile(@Param('username') username: string): Promise<Record<string, unknown>> {
    return this.usersService.getPublicProfile(username);
  }
}
