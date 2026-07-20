import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { EMAIL_PORT } from '@/application/identity/ports/email/email.port.token';
import { InMemoryEmail } from './in-memory-email';

export interface TestAuthCookies {
  access: string;
  refresh: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

/**
 * Registers a new user and returns 204 (no body).
 */
export async function registerUser(
  app: INestApplication,
  payload: RegisterPayload,
): Promise<void> {
  await request(app.getHttpServer())
    .post('/api/v1/email/register')
    .send({
      email: payload.email,
      password: payload.password,
      firstName: payload.firstName ?? 'Test',
      lastName: payload.lastName ?? 'User',
    })
    .expect(204);
}

/**
 * Logs in and returns the HttpOnly session cookies.
 */
export async function loginUser(
  app: INestApplication,
  email: string,
  password: string,
): Promise<TestAuthCookies> {
  const res = await request(app.getHttpServer())
    .post('/api/v1/email/login')
    .send({ email, password })
    .expect(200);

  const cookies = res.headers['set-cookie'] ?? [];
  const access = cookies.find((cookie) => cookie.startsWith('access_token='));
  const refresh = cookies.find((cookie) => cookie.startsWith('refresh_token='));

  if (!access || !refresh) {
    throw new Error('Login response did not set both auth cookies');
  }

  return {
    access: access.split(';', 1)[0],
    refresh: refresh.split(';', 1)[0],
  };
}

export async function confirmUserEmail(
  app: INestApplication,
  email: string,
): Promise<void> {
  const mailbox = app.get<InMemoryEmail>(EMAIL_PORT);
  await request(app.getHttpServer())
    .post('/api/v1/email/confirm')
    .send({ hash: mailbox.latestTokenFor(email) })
    .expect(204);
}

/**
 * Shortcut: register then immediately login.
 */
export async function registerAndLogin(
  app: INestApplication,
  payload: RegisterPayload,
): Promise<TestAuthCookies> {
  await registerUser(app, payload);
  await confirmUserEmail(app, payload.email);
  return loginUser(app, payload.email, payload.password);
}
