import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { UsersService } from '../../src/users/users.service';

describe('api rate limit smoke', () => {
  let app: INestApplication;
  const originalHttpLimit = process.env.HTTP_RATE_LIMIT_MAX;

  beforeAll(async () => {
    process.env.HTTP_RATE_LIMIT_MAX = '1';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(UsersService)
      .useValue({
        getPublicProfile: async (username: string) => ({ username }),
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();

    if (originalHttpLimit === undefined) {
      delete process.env.HTTP_RATE_LIMIT_MAX;
      return;
    }

    process.env.HTTP_RATE_LIMIT_MAX = originalHttpLimit;
  });

  it('limits repeated requests on non-auth /api routes', async () => {
    const firstResponse = await request(app.getHttpServer()).get('/api/users/player');
    expect(firstResponse.status).toBe(200);

    const secondResponse = await request(app.getHttpServer()).get('/api/users/player');
    expect(secondResponse.status).toBe(429);
    expect(secondResponse.body).toEqual({
      error: {
        code: 'HTTP_RATE_LIMIT',
        message: 'Too many requests',
      },
    });
  });
});
