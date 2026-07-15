import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/test-app.helper';
import { cleanDatabase } from './helpers/db.helper';
import {
  bearerHeader,
  loginUser,
  registerUser,
  type RegisterPayload,
} from './helpers/auth.helper';

const createUser = (prefix: string): RegisterPayload => ({
  email: `${prefix}-${randomUUID()}@example.com`,
  password: 'Test@1234',
  firstName: 'Test',
  lastName: 'User',
});

describe('Auth E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
    await cleanDatabase(app);
  });

  afterAll(async () => {
    await cleanDatabase(app);
    await app.close();
  });

  describe('POST /api/v1/email/register', () => {
    it('204 — registers successfully', async () => {
      await registerUser(app, createUser('register'));
    });

    it('422 — rejects a duplicate email', async () => {
      const user = createUser('duplicate');
      await registerUser(app, user);

      await request(app.getHttpServer())
        .post('/api/v1/email/register')
        .send(user)
        .expect(422);
    });

    it('422 — rejects an invalid email format', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/email/register')
        .send({ ...createUser('invalid-email'), email: 'not-an-email' })
        .expect(422);
    });

    it('422 — requires a password', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/email/register')
        .send({ email: createUser('missing-password').email })
        .expect(422);
    });
  });

  describe('POST /api/v1/email/login', () => {
    const user = createUser('login');

    beforeAll(async () => {
      await registerUser(app, user);
    });

    it('200 — returns tokens for valid credentials', async () => {
      const tokens = await loginUser(app, user.email, user.password);

      expect(tokens.token).toBeTruthy();
      expect(tokens.refreshToken).toBeTruthy();
    });

    it('422 — rejects a wrong password', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/email/login')
        .send({ email: user.email, password: 'wrong-password' })
        .expect(422);
    });

    it('422 — rejects a non-existent email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/email/login')
        .send({ email: createUser('ghost').email, password: 'Test@1234' })
        .expect(422);
    });

    it('422 — rejects an invalid email format', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/email/login')
        .send({ email: 'bad', password: 'Test@1234' })
        .expect(422);
    });
  });

  describe('GET /api/v1/me', () => {
    const user = createUser('me');
    let accessToken: string;

    beforeAll(async () => {
      await registerUser(app, user);
      ({ token: accessToken } = await loginUser(
        app,
        user.email,
        user.password,
      ));
    });

    it('200 — returns the current user with a valid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/me')
        .set('Authorization', bearerHeader(accessToken))
        .expect(200);

      expect(response.body.email).toBe(user.email);
      expect(response.body.firstName).toBe(user.firstName);
    });

    it('401 — requires a token', async () => {
      await request(app.getHttpServer()).get('/api/v1/me').expect(401);
    });

    it('401 — rejects an invalid token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('POST /api/v1/refresh', () => {
    const user = createUser('refresh');

    beforeAll(async () => {
      await registerUser(app, user);
    });

    it('200 — returns a replacement access token', async () => {
      const tokens = await loginUser(app, user.email, user.password);
      const response = await request(app.getHttpServer())
        .post('/api/v1/refresh')
        .set('Authorization', bearerHeader(tokens.refreshToken))
        .expect(200);

      expect(response.body.token).toBeTruthy();
      expect(response.body.refreshToken).toBeTruthy();
    });

    it('401 — rejects an invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/refresh')
        .set('Authorization', 'Bearer bad-refresh-token')
        .expect(401);
    });
  });

  describe('POST /api/v1/logout', () => {
    const user = createUser('logout');

    beforeAll(async () => {
      await registerUser(app, user);
    });

    it('204 — logs out an authenticated session', async () => {
      const tokens = await loginUser(app, user.email, user.password);

      await request(app.getHttpServer())
        .post('/api/v1/logout')
        .set('Authorization', bearerHeader(tokens.token))
        .expect(204);
    });

    it('401 — requires a token', async () => {
      await request(app.getHttpServer()).post('/api/v1/logout').expect(401);
    });
  });
});
