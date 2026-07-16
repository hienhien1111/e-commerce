import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/test-app.helper';
import { cleanDatabase } from './helpers/db.helper';
import {
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

    it('200 — sets HttpOnly session cookies for valid credentials', async () => {
      const cookies = await loginUser(app, user.email, user.password);

      expect(cookies.access).toStartWith('access_token=');
      expect(cookies.refresh).toStartWith('refresh_token=');
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
    let accessCookie: string;

    beforeAll(async () => {
      await registerUser(app, user);
      ({ access: accessCookie } = await loginUser(
        app,
        user.email,
        user.password,
      ));
    });

    it('200 — returns the current user with a valid access cookie', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/me')
        .set('Cookie', accessCookie)
        .expect(200);

      expect(response.body.email).toBe(user.email);
      expect(response.body.firstName).toBe(user.firstName);
    });

    it('401 — requires an access cookie', async () => {
      await request(app.getHttpServer()).get('/api/v1/me').expect(401);
    });

    it('401 — rejects an invalid access cookie', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/me')
        .set('Cookie', 'access_token=invalid-token')
        .expect(401);
    });
  });

  describe('POST /api/v1/refresh', () => {
    const user = createUser('refresh');

    beforeAll(async () => {
      await registerUser(app, user);
    });

    it('204 — rotates the session cookies', async () => {
      const cookies = await loginUser(app, user.email, user.password);
      const response = await request(app.getHttpServer())
        .post('/api/v1/refresh')
        .set('Cookie', cookies.refresh)
        .expect(204);

      expect(response.headers['set-cookie']).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/^access_token=.*HttpOnly/),
          expect.stringMatching(/^refresh_token=.*HttpOnly/),
        ]),
      );
    });

    it('401 — rejects an invalid refresh cookie', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/refresh')
        .set('Cookie', 'refresh_token=bad-refresh-token')
        .expect(401);
    });
  });

  describe('POST /api/v1/logout', () => {
    const user = createUser('logout');

    beforeAll(async () => {
      await registerUser(app, user);
    });

    it('204 — logs out an authenticated session', async () => {
      const cookies = await loginUser(app, user.email, user.password);

      const response = await request(app.getHttpServer())
        .post('/api/v1/logout')
        .set('Cookie', cookies.access)
        .expect(204);

      expect(response.headers['set-cookie']).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/^access_token=;/),
          expect.stringMatching(/^refresh_token=;/),
        ]),
      );
    });

    it('401 — requires an access cookie', async () => {
      await request(app.getHttpServer()).post('/api/v1/logout').expect(401);
    });
  });
});
