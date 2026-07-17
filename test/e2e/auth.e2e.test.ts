import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/test-app.helper';
import { cleanDatabase } from './helpers/db.helper';
import {
  confirmUserEmail,
  loginUser,
  registerUser,
  type RegisterPayload,
} from './helpers/auth.helper';
import { FILE_STORAGE_PORT } from '@/application/identity/ports/file-storage/file-storage.port.token';
import { InMemoryFileStorage } from './helpers/in-memory-file-storage';
import { EMAIL_PORT } from '@/application/identity/ports/email/email.port.token';
import { InMemoryEmail } from './helpers/in-memory-email';

const createUser = (prefix: string): RegisterPayload => ({
  email: `${prefix}-${randomUUID()}@example.com`,
  password: 'Test@1234',
  firstName: 'Test',
  lastName: 'User',
});

describe('Auth E2E', () => {
  let app: INestApplication;
  const pngFile = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL4XQAAAABJRU5ErkJggg==',
    'base64',
  );

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
    const verifiedUser = createUser('verified-login');
    const unverifiedUser = createUser('unverified-login');

    beforeAll(async () => {
      await registerUser(app, verifiedUser);
      await confirmUserEmail(app, verifiedUser.email);
      await registerUser(app, unverifiedUser);
    });

    it('422 — blocks an unverified email/password account', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/email/login')
        .send({
          email: unverifiedUser.email,
          password: unverifiedUser.password,
        })
        .expect(422);

      expect(response.body.errors.email).toBe('emailNotVerified');
    });

    it('200 — sets HttpOnly session cookies for valid credentials', async () => {
      const cookies = await loginUser(
        app,
        verifiedUser.email,
        verifiedUser.password,
      );

      expect(cookies.access).toStartWith('access_token=');
      expect(cookies.refresh).toStartWith('refresh_token=');
    });

    it('422 — rejects a wrong password', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/email/login')
        .send({ email: verifiedUser.email, password: 'wrong-password' })
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
      await confirmUserEmail(app, user.email);
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

  describe('PATCH /api/v1/me', () => {
    const user = createUser('profile');
    let accessCookie: string;

    beforeAll(async () => {
      await registerUser(app, user);
      await confirmUserEmail(app, user.email);
      ({ access: accessCookie } = await loginUser(
        app,
        user.email,
        user.password,
      ));
    });

    it('200 — updates profile names and normalizes a Vietnamese mobile number', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/v1/me')
        .set('Cookie', accessCookie)
        .send({
          firstName: 'Updated',
          lastName: 'Customer',
          phone: '0901 234-567',
        })
        .expect(200);

      expect(response.body).toMatchObject({
        firstName: 'Updated',
        lastName: 'Customer',
        phone: '0901234567',
      });
    });

    it('422 — rejects an invalid phone number', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/me')
        .set('Cookie', accessCookie)
        .send({ phone: '0123456789' })
        .expect(422);
    });

    it('200 — clears the phone number with null', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/v1/me')
        .set('Cookie', accessCookie)
        .send({ phone: null })
        .expect(200);

      expect(response.body.phone).toBeNull();
    });

    it('does not allow PATCH /me to change an email directly', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/v1/me')
        .set('Cookie', accessCookie)
        .send({ email: 'bypass@example.com' })
        .expect(200);

      expect(response.body.email).toBe(user.email);
    });
  });

  describe('POST /api/v1/me/avatar', () => {
    const user = createUser('avatar');
    let accessCookie: string;
    let fileStorage: InMemoryFileStorage;

    beforeAll(async () => {
      await registerUser(app, user);
      await confirmUserEmail(app, user.email);
      ({ access: accessCookie } = await loginUser(
        app,
        user.email,
        user.password,
      ));
      fileStorage = app.get<InMemoryFileStorage>(FILE_STORAGE_PORT);
    });

    it('401 — requires an access cookie', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/me/avatar')
        .attach('file', pngFile, {
          filename: 'avatar.png',
          contentType: 'image/png',
        })
        .expect(401);
    });

    it('400 — requires an avatar file', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/me/avatar')
        .set('Cookie', accessCookie)
        .expect(400);
    });

    it('400 — rejects unsupported image types', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/me/avatar')
        .set('Cookie', accessCookie)
        .attach('file', Buffer.from('gif'), {
          filename: 'avatar.gif',
          contentType: 'image/gif',
        })
        .expect(400);
    });

    it('413 — rejects an avatar larger than 2 MiB', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/me/avatar')
        .set('Cookie', accessCookie)
        .attach('file', Buffer.alloc(2 * 1024 * 1024 + 1), {
          filename: 'avatar.png',
          contentType: 'image/png',
        })
        .expect(413);
    });

    it('200 — uploads a PNG avatar and returns its public URL', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/me/avatar')
        .set('Cookie', accessCookie)
        .attach('file', pngFile, {
          filename: 'avatar.png',
          contentType: 'image/png',
        })
        .expect(200);

      expect(response.body.avatarUrl).toMatch(/^https:\/\/storage\.test\//);
      expect(response.body).not.toHaveProperty('avatarPublicId');
      expect(fileStorage.uploads.at(-1)?.folder).toMatch(/^avatars\//);
    });

    it('200 — accepts a JPEG avatar', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/me/avatar')
        .set('Cookie', accessCookie)
        .attach('file', pngFile, {
          filename: 'avatar.jpeg',
          contentType: 'image/jpeg',
        })
        .expect(200);
    });

    it('200 — replaces the avatar and deletes the old storage asset', async () => {
      const previousAvatar = fileStorage.uploads.at(-1)?.file;
      expect(previousAvatar).toBeDefined();

      await request(app.getHttpServer())
        .post('/api/v1/me/avatar')
        .set('Cookie', accessCookie)
        .attach('file', pngFile, {
          filename: 'replacement.png',
          contentType: 'image/png',
        })
        .expect(200);

      expect(fileStorage.deletedPublicIds).toContain(previousAvatar?.publicId);
    });
  });

  describe('POST /api/v1/refresh', () => {
    const user = createUser('refresh');

    beforeAll(async () => {
      await registerUser(app, user);
      await confirmUserEmail(app, user.email);
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
      await confirmUserEmail(app, user.email);
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

  describe('email lifecycle', () => {
    it('sends verification email and rejects a token with the wrong purpose', async () => {
      const user = createUser('verification-link');
      const mailbox = app.get<InMemoryEmail>(EMAIL_PORT);

      await registerUser(app, user);
      const verificationToken = mailbox.latestTokenFor(user.email);

      await request(app.getHttpServer())
        .post('/api/v1/reset/password')
        .send({ hash: verificationToken, password: 'Changed@1234' })
        .expect(422);

      await request(app.getHttpServer())
        .post('/api/v1/email/confirm')
        .send({ hash: verificationToken })
        .expect(204);
      await loginUser(app, user.email, user.password);
    });

    it('always acknowledges unknown email resend and reset requests', async () => {
      const unknownEmail = createUser('unknown-email').email;

      await request(app.getHttpServer())
        .post('/api/v1/email/confirm/resend')
        .send({ email: unknownEmail })
        .expect(204);
      await request(app.getHttpServer())
        .post('/api/v1/forgot/password')
        .send({ email: unknownEmail })
        .expect(204);
    });

    it('resets a password and revokes both existing session cookies', async () => {
      const user = createUser('password-reset');
      const mailbox = app.get<InMemoryEmail>(EMAIL_PORT);
      await registerUser(app, user);
      await confirmUserEmail(app, user.email);
      const cookies = await loginUser(app, user.email, user.password);

      await request(app.getHttpServer())
        .post('/api/v1/forgot/password')
        .send({ email: user.email })
        .expect(204);
      await request(app.getHttpServer())
        .post('/api/v1/reset/password')
        .send({
          hash: mailbox.latestTokenFor(user.email),
          password: 'NewPassword@123',
        })
        .expect(204);

      await request(app.getHttpServer())
        .get('/api/v1/me')
        .set('Cookie', cookies.access)
        .expect(401);
      await request(app.getHttpServer())
        .post('/api/v1/refresh')
        .set('Cookie', cookies.refresh)
        .expect(401);
      await loginUser(app, user.email, 'NewPassword@123');
    });

    it('confirms an email change then requires login again', async () => {
      const user = createUser('email-change');
      const newEmail = `changed-${randomUUID()}@example.com`;
      const mailbox = app.get<InMemoryEmail>(EMAIL_PORT);
      await registerUser(app, user);
      await confirmUserEmail(app, user.email);
      const cookies = await loginUser(app, user.email, user.password);

      await request(app.getHttpServer())
        .post('/api/v1/me/email-change')
        .set('Cookie', cookies.access)
        .send({ email: newEmail, currentPassword: user.password })
        .expect(204);
      await request(app.getHttpServer())
        .post('/api/v1/email/confirm/new')
        .send({ hash: mailbox.latestTokenFor(newEmail) })
        .expect(204);

      await request(app.getHttpServer())
        .get('/api/v1/me')
        .set('Cookie', cookies.access)
        .expect(401);
      await request(app.getHttpServer())
        .post('/api/v1/refresh')
        .set('Cookie', cookies.refresh)
        .expect(401);
      await loginUser(app, newEmail, user.password);
    });
  });
});
