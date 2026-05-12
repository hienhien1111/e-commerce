import { z } from 'zod';

const intFromString = z
  .string()
  .regex(/^\d+$/, 'must be an integer')
  .transform((v) => parseInt(v, 10));

const optionalIntFromString = z
  .string()
  .regex(/^\d+$/, 'must be an integer')
  .transform((v) => parseInt(v, 10))
  .optional();

const csvStringList = z
  .string()
  .transform((v) =>
    v
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0),
  )
  .optional();

export const envSchema = z.object({
  // Runtime
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  APP_PORT: optionalIntFromString,
  PORT: optionalIntFromString,
  API_PREFIX: z.string().default('api'),
  APP_NAME: z.string().optional(),
  FRONTEND_DOMAIN: z.string().url().optional(),
  BACKEND_DOMAIN: z.string().url().optional(),

  // Security
  CORS_ORIGINS: csvStringList,
  THROTTLE_TTL_MS: optionalIntFromString,
  THROTTLE_LIMIT: optionalIntFromString,

  // Database (Prisma)
  DATABASE_URL: z
    .string()
    .url('DATABASE_URL must be a valid postgres:// URL')
    .refine(
      (url) => url.startsWith('postgres://') || url.startsWith('postgresql://'),
      'DATABASE_URL must start with postgres:// or postgresql://',
    ),

  // JWT
  AUTH_JWT_TOKEN_EXPIRES_IN: z.string().default('1d'),
  AUTH_REFRESH_TOKEN_EXPIRES_IN: z.string().default('30d'),
  AUTH_FORGOT_SECRET: z.string().min(32),
  AUTH_FORGOT_TOKEN_EXPIRES_IN: z.string().default('1h'),
  AUTH_CONFIRM_EMAIL_SECRET: z.string().min(32),
  AUTH_CONFIRM_EMAIL_TOKEN_EXPIRES_IN: z.string().default('1d'),

  ACCESS_JWT_PRIVATE_KEY: z.string().min(1, 'ACCESS_JWT_PRIVATE_KEY required'),
  ACCESS_JWT_PUBLIC_KEY: z.string().min(1, 'ACCESS_JWT_PUBLIC_KEY required'),
  REFRESH_JWT_PRIVATE_KEY: z
    .string()
    .min(1, 'REFRESH_JWT_PRIVATE_KEY required'),
  REFRESH_JWT_PUBLIC_KEY: z.string().min(1, 'REFRESH_JWT_PUBLIC_KEY required'),

  // WebAuthn
  WEBAUTHN_RP_ID: z.string().min(1),
  WEBAUTHN_RP_NAME: z.string().min(1),
  WEBAUTHN_ALLOWED_ORIGINS: z.string().min(1),
  WEBAUTHN_CHALLENGE_TTL_SEC: intFromString,

  // i18n
  APP_FALLBACK_LANGUAGE: z.string().default('en'),
  APP_HEADER_LANGUAGE: z.string().default('x-custom-lang'),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validate process.env at app boot. Throws a formatted error listing every
 * missing/invalid variable. Returns the parsed (typed, coerced) env object.
 */
export function validateEnv(rawEnv: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(rawEnv);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(
      `Invalid environment configuration:\n${issues}\n\n` +
        `Check your .env file against .env.example.`,
    );
  }
  return result.data;
}
