import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedUser } from '@/infrastructure/strategies/jwt.strategy';

/**
 * Reads `request.user` populated by a Passport strategy. The generic type
 * parameter lets the caller name the exact shape produced by the guard in
 * scope — e.g. `AuthenticatedUser` for `AuthGuard('jwt')`,
 * `JwtRefreshPayloadType` for `AuthGuard('jwt-refresh')`.
 */
export const CurrentUser = createParamDecorator(
  <T = AuthenticatedUser>(_: unknown, ctx: ExecutionContext): T => {
    return ctx.switchToHttp().getRequest<{ user: T }>().user;
  },
);
