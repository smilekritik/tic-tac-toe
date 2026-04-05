import 'reflect-metadata';
import fs from 'node:fs';
import path from 'node:path';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';
import { generateHtml, loadWebSocketDocs } from './docs/asyncapi-generator';
import { buildOpenApiDocument } from './docs/openapi';
import { AppLoggerService } from './logger/logger.service';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: false,
  });
  const config = app.get(AppConfigService);
  const logger = app.get(AppLoggerService);
  const prisma = app.get(PrismaService);

  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  app.enableCors({
    origin: config.frontendUrl,
    credentials: true,
  });
  app.use(cookieParser());

  const swaggerDocument = buildOpenApiDocument(app, config);
  SwaggerModule.setup('api-docs', app, swaggerDocument, {
    customSiteTitle: 'Tic-Tac-Toe API Docs',
  });
  const http = app.getHttpAdapter().getInstance();
  http.get('/api-docs.json', (_req: unknown, res: { json: (body: unknown) => void }) => {
    res.json(swaggerDocument);
  });
  http.get('/asyncapi-docs', (_req: unknown, res: { send: (body: unknown) => void; status: (code: number) => { send: (body: string) => void } }) => {
    try {
      const sections = loadWebSocketDocs();
      const html = generateHtml(sections, `ws://localhost:${config.port}`);
      res.send(html);
    } catch {
      res.status(500).send('Error generating documentation');
    }
  });
  http.get('/asyncapi-docs.css', (_req: unknown, res: { type: (value: string) => void; send: (body: unknown) => void }) => {
    res.type('text/css');
    res.send(fs.readFileSync(path.join(__dirname, 'docs', 'asyncapi-docs.css'), 'utf8'));
  });
  http.get('/asyncapi-docs.js', (_req: unknown, res: { type: (value: string) => void; send: (body: unknown) => void }) => {
    res.type('application/javascript');
    res.send(fs.readFileSync(path.join(__dirname, 'docs', 'asyncapi-docs.js'), 'utf8'));
  });

  try {
    await prisma.$connect();
    logger.getLogger('app').info({ event: 'db_connected' }, 'Database connected');
  } catch (error) {
    logger.getLogger('app').error(
      {
        event: 'db_error',
        message: error instanceof Error ? error.message : 'Unknown database error',
      },
      'Database connection error',
    );
    process.exit(1);
  }

  await app.listen(config.port);
  logger.getLogger('app').info(
    {
      event: 'server_start',
      port: config.port,
    },
    'Server started',
  );
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
