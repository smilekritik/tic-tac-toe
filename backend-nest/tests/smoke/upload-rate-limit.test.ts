import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { TokenService } from '../../src/auth/token.service';
import { MeService } from '../../src/me/me.service';

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z0dQAAAAASUVORK5CYII=',
  'base64',
);

describe('upload rate limit smoke', () => {
  let app: INestApplication;
  let tokenService: TokenService;
  const originalUploadLimit = process.env.UPLOAD_RATE_LIMIT_MAX;

  beforeAll(async () => {
    process.env.UPLOAD_RATE_LIMIT_MAX = '1';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MeService)
      .useValue({
        uploadAvatar: async (userId: string) => ({ avatarPath: `/uploads/${userId}.png` }),
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();

    tokenService = app.get(TokenService);
  });

  afterAll(async () => {
    await app.close();

    if (originalUploadLimit === undefined) {
      delete process.env.UPLOAD_RATE_LIMIT_MAX;
      return;
    }

    process.env.UPLOAD_RATE_LIMIT_MAX = originalUploadLimit;
  });

  it('uses user-or-ip semantics for avatar upload limiting', async () => {
    const firstToken = tokenService.generateAccessToken({
      id: 'user-1',
      role: 'user',
    });
    const secondToken = tokenService.generateAccessToken({
      id: 'user-2',
      role: 'user',
    });

    const firstResponse = await request(app.getHttpServer())
      .post('/api/me/avatar')
      .set('Authorization', `Bearer ${firstToken}`)
      .attach('avatar', PNG_1X1, 'avatar.png');

    const secondResponse = await request(app.getHttpServer())
      .post('/api/me/avatar')
      .set('Authorization', `Bearer ${secondToken}`)
      .attach('avatar', PNG_1X1, 'avatar.png');

    expect(firstResponse.status).toBe(201);
    expect(firstResponse.body.avatarPath).toBe('/uploads/user-1.png');

    expect(secondResponse.status).toBe(201);
    expect(secondResponse.body.avatarPath).toBe('/uploads/user-2.png');
  });
});
