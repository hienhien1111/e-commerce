import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '@/app.module';

describe('AuthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/v1/auth/email/login (POST)', () => {
    it('should return 422 for invalid email', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/email/login')
        .send({
          email: 'invalid-email',
          password: 'password123',
        })
        .expect(422);
    });

    it('should return 422 for missing password', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/email/login')
        .send({
          email: 'test@example.com',
        })
        .expect(422);
    });

    it('should return 422 for invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/email/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword',
        })
        .expect(422);
    });
  });

  describe('/api/v1/auth/me (GET)', () => {
    it('should return 401 without token', () => {
      return request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
    });

    it('should return 401 with invalid token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });
});
