import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { AppConfigService } from '../../src/config/app-config.service';
import { buildOpenApiDocument } from '../../src/docs/openapi';

describe('openapi smoke', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('generates a non-empty OpenAPI spec', () => {
    const config = app.get(AppConfigService);
    const document = buildOpenApiDocument(app, config);

    expect(document.openapi).toBe('3.0.0');
    expect(Object.keys(document.paths || {})).not.toHaveLength(0);
    expect(document.paths['/api/auth/login']).toBeDefined();
    expect(document.paths['/api/game/active']).toBeDefined();
  });
});
