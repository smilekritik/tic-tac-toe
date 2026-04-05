import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppConfigService } from '../config/app-config.service';

export function buildOpenApiDocument(app: INestApplication, config: AppConfigService) {
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Tic-Tac-Toe API')
    .setDescription('REST API for Tic-Tac-Toe game platform. Real-time game events use Socket.IO (see separate documentation).')
    .setVersion('1.1.0')
    .addServer(`http://localhost:${config.port}`, 'Development server')
    .addTag('Auth', 'Authentication and authorization')
    .addTag('Me', 'Current user profile and settings')
    .addTag('Users', 'Public user profiles')
    .addTag('Matches', 'Match history and details')
    .addTag('Leaderboard', 'Ranked mode leaderboard')
    .addTag('Game', 'Game-related HTTP endpoints (matchmaking via Socket.IO)')
    .addTag('Health', 'Operational health checks')
    .addBearerAuth()
    .build();

  return SwaggerModule.createDocument(app, swaggerConfig);
}
