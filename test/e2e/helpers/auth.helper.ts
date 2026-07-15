import request from 'supertest';
import { INestApplication } from '@nestjs/common';

export interface TestAuthTokens {
  token: string;
  refreshToken: string;
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
 * Logs in and returns JWT tokens.
 */
export async function loginUser(
  app: INestApplication,
  email: string,
  password: string,
): Promise<TestAuthTokens> {
  const res = await request(app.getHttpServer())
    .post('/api/v1/email/login')
    .send({ email, password })
    .expect(200);

  return {
    token: res.body.token,
    refreshToken: res.body.refreshToken,
  };
}

/**
 * Shortcut: register then immediately login.
 */
export async function registerAndLogin(
  app: INestApplication,
  payload: RegisterPayload,
): Promise<TestAuthTokens> {
  await registerUser(app, payload);
  return loginUser(app, payload.email, payload.password);
}

/**
 * Returns Authorization header value for a given token.
 */
export function bearerHeader(token: string): string {
  return `Bearer ${token}`;
}
