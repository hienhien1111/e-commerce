/**
 * Application-layer command payload types — plain TS, no HTTP/Swagger decorators.
 * Presentation DTOs (with class-validator) are structurally compatible and may be
 * passed directly into commands; their decorators apply at the HTTP boundary only.
 */

import type { Role } from '@/domain/entities/role';

export interface CreateUserPayload {
  email: string | null;
  password?: string;
  provider?: string;
  socialId?: string | null;
  firstName: string | null;
  lastName: string | null;
  role?: Pick<Role, 'id'> | null;
}

export interface UpdateUserPayload {
  email?: string | null;
  password?: string;
  provider?: string;
  socialId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  role?: Pick<Role, 'id'> | null;
}

export interface EmailLoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}
