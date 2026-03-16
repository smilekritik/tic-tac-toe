const swaggerJsdoc = require('swagger-jsdoc');
const env = require('../config/env');

const options = {
  definition: {
    openapi: '3.1.0',
    info: {
      title: 'Tic-Tac-Toe API',
      version: '1.0.0',
      description: 'REST API for Tic-Tac-Toe game platform. Real-time game events use Socket.IO (see separate documentation).',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: `http://localhost:${env.port}`,
        description: 'Development server',
      },
    ],
    tags: [
      { name: 'Auth', description: 'Authentication and authorization' },
      { name: 'Me', description: 'Current user profile and settings' },
      { name: 'Users', description: 'User management' },
      { name: 'Game', description: 'Game-related HTTP endpoints (matchmaking via Socket.IO)' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'refreshToken',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            username: { type: 'string' },
            emailVerified: { type: 'boolean' },
            role: { type: 'string', enum: ['user', 'admin', 'superadmin'] },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        UserProfile: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            avatarPath: { type: 'string', nullable: true },
            preferredLanguage: { type: 'string', default: 'en' },
            chatEnabledDefault: { type: 'boolean', default: true },
            publicProfileEnabled: { type: 'boolean', default: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        UserRating: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            gameModeId: { type: 'string', format: 'uuid' },
            eloRating: { type: 'integer', default: 1000 },
            gamesPlayed: { type: 'integer', default: 0 },
            wins: { type: 'integer', default: 0 },
            losses: { type: 'integer', default: 0 },
            draws: { type: 'integer', default: 0 },
            winStreak: { type: 'integer', default: 0 },
            maxWinStreak: { type: 'integer', default: 0 },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        GameMode: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            code: { type: 'string' },
            name: { type: 'string' },
            isRanked: { type: 'boolean' },
            isEnabled: { type: 'boolean' },
          },
        },
        Match: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            gameModeId: { type: 'string', format: 'uuid' },
            matchType: { type: 'string', enum: ['ranked', 'casual', 'private'] },
            playerXId: { type: 'string', format: 'uuid' },
            playerOId: { type: 'string', format: 'uuid' },
            winnerId: { type: 'string', format: 'uuid', nullable: true },
            status: { type: 'string', enum: ['waiting', 'active', 'finished'] },
            resultType: { type: 'string', enum: ['win', 'draw', 'timeout', 'abandon'], nullable: true },
            startedAt: { type: 'string', format: 'date-time', nullable: true },
            finishedAt: { type: 'string', format: 'date-time', nullable: true },
            durationSeconds: { type: 'integer', nullable: true },
            ratingDeltaX: { type: 'integer', nullable: true },
            ratingDeltaO: { type: 'integer', nullable: true },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            details: { type: 'object', nullable: true },
          },
        },
      },
      responses: {
        Unauthorized: {
          description: 'Unauthorized - Invalid or missing token',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        Forbidden: {
          description: 'Forbidden - Insufficient permissions',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
      },
    },
  },
  apis: ['./src/modules/**/*.routes.js', './src/docs/routes/*.yaml'],
};

const specs = swaggerJsdoc(options);

module.exports = specs;
