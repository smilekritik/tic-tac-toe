import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';

@ApiTags('Users')
@Controller('api/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':username')
  @ApiOperation({ summary: 'Get public profile by username' })
  @ApiParam({ name: 'username', description: 'Public username.' })
  @ApiOkResponse({ description: 'Returns public profile data if profile visibility allows it.' })
  async getPublicProfile(@Param('username') username: string): Promise<Record<string, unknown>> {
    return this.usersService.getPublicProfile(username);
  }
}
