import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';
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

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Tic-Tac-Toe API')
    .setDescription('NestJS migration backend for the Tic-Tac-Toe platform.')
    .setVersion('1.1.0')
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-docs', app, swaggerDocument, {
    customSiteTitle: 'Tic-Tac-Toe API Docs',
  });
  app.getHttpAdapter().getInstance().get('/api-docs.json', (_req: unknown, res: { json: (body: unknown) => void }) => {
    res.json(swaggerDocument);
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
