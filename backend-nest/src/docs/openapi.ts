import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppConfigService } from '../config/app-config.service';
import { OPENAPI_EXTRA_MODELS } from './openapi.models';

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
    .addTag('Uploads', 'Uploaded file delivery')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Access token for protected API routes.',
      },
      'bearerAuth',
    )
    .addCookieAuth(
      'refreshToken',
      {
        type: 'apiKey',
        in: 'cookie',
        name: 'refreshToken',
        description: 'Refresh token cookie used by /api/auth/refresh.',
      },
      'cookieAuth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig, {
    extraModels: [...OPENAPI_EXTRA_MODELS],
  });

  document.openapi = '3.1.0';
  document.components ??= {};
  document.components.responses = {
    ...(document.components.responses || {}),
    Unauthorized: {
      description: 'Unauthorized - Invalid or missing token',
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/ErrorEnvelopeDto',
          },
        },
      },
    },
    Forbidden: {
      description: 'Forbidden - Insufficient permissions',
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/ErrorEnvelopeDto',
          },
        },
      },
    },
    NotFound: {
      description: 'Resource not found',
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/ErrorEnvelopeDto',
          },
        },
      },
    },
    ValidationError: {
      description: 'Validation error',
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/ValidationErrorEnvelopeDto',
          },
        },
      },
    },
  };

  return document;
}
