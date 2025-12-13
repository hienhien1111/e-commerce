import { Module, Global } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';

import authConfig from '@/infrastructure/config/auth.config';
import webauthnConfig from '@/infrastructure/config/webauthn.config';

import { UserEntity } from '@/infrastructure/persistence/entities/user.entity';
import { SessionEntity } from '@/infrastructure/persistence/entities/session.entity';
import { WebAuthnCredentialEntity } from '@/infrastructure/persistence/entities/webauthn-credential.entity';

import { AuthController } from '@/presentation/http/controllers/auth.controller';
import { UserController } from '@/presentation/http/controllers/user.controller';
import { WebAuthnController } from '@/presentation/http/controllers/webauthn.controller';
import { WellKnownController } from '@/presentation/http/controllers/well-known.controller';

import { JwtStrategy } from '@/infrastructure/strategies/jwt.strategy';
import { JwtRefreshStrategy } from '@/infrastructure/strategies/jwt-refresh.strategy';
import { AnonymousStrategy } from '@/infrastructure/strategies/anonymous.strategy';

import { PasswordHasherModule } from '@/infrastructure/providers/password-hasher.module';
import { JwtTokenProvider } from '@/infrastructure/providers/jwt-token-provider';
import { InMemoryChallengeStore } from '@/infrastructure/providers/in-memory-challenge-store';

import { TypeOrmUserRepository } from '@/infrastructure/persistence/repositories/user.repository';
import { TypeOrmSessionRepository } from '@/infrastructure/persistence/repositories/session.repository';
import { WebAuthnCredentialRepositoryImpl } from '@/infrastructure/persistence/repositories/webauthn-credential.repository.impl';

import { LoginStrategyResolver } from '@/application/identity/factories/auth-strategy.factory';
import { EmailPasswordLoginStrategy } from '@/application/identity/strategies/email-password-auth.strategy';
import { WebAuthnLoginStrategy } from '@/application/identity/strategies/passkey-auth.strategy';

import { LoginHandler } from '@/application/identity/commands/login';
import { RegisterHandler } from '@/application/identity/commands/register';
import {
  ConfirmEmailHandler,
  ConfirmNewEmailHandler,
} from '@/application/identity/commands/confirm-email';
import { ForgotPasswordHandler } from '@/application/identity/commands/forgot-password';
import { ResetPasswordHandler } from '@/application/identity/commands/reset-password';
import { RefreshTokenHandler } from '@/application/identity/commands/refresh-token';
import { LogoutHandler } from '@/application/identity/commands/logout';
import { UpdateUserHandler } from '@/application/identity/commands/update-user';
import { DeleteUserHandler } from '@/application/identity/commands/delete-user';
import { CreateUserHandler } from '@/application/identity/commands/create-user';
import { GetUserHandler } from '@/application/identity/queries/get-user';
import { GetUsersHandler } from '@/application/identity/queries/get-users';
import { GetMeHandler } from '@/application/identity/queries/get-me';

import { GenerateRegistrationOptionsHandler } from '@/application/identity/commands/webauthn/generate-registration-options';
import { VerifyRegistrationHandler } from '@/application/identity/commands/webauthn/verify-registration';
import { GenerateAuthenticationOptionsHandler } from '@/application/identity/commands/webauthn/generate-authentication-options';
import { RevokeCredentialHandler } from '@/application/identity/commands/webauthn/revoke-credential';
import { GetUserCredentialsHandler } from '@/application/identity/queries/webauthn/get-user-credentials';

import { UserRegisteredEventHandler } from '@/application/identity/event-handlers/user-registered.event.handler';
import { EmailConfirmedEventHandler } from '@/application/identity/event-handlers/email-confirmed.event.handler';
import { UserLoggedInEventHandler } from '@/application/identity/event-handlers/user-logged-in.event.handler';

import { TOKEN_PORT } from '@/application/identity/ports/token/token.port.token';
import { USER_REPOSITORY_PORT } from '@/application/identity/ports/user/user.repository.port.token';
import { SESSION_REPOSITORY_PORT } from '@/application/identity/ports/session/session.repository.port.token';
import { WEBAUTHN_CREDENTIAL_REPOSITORY_PORT } from '@/application/identity/ports/webauthn/webauthn-credential.repository.port.token';
import { CHALLENGE_STORE_PORT } from '@/application/identity/ports/webauthn/challenge-store.port.token';

const CommandHandlers = [
  LoginHandler,
  RegisterHandler,
  ConfirmEmailHandler,
  ConfirmNewEmailHandler,
  ForgotPasswordHandler,
  ResetPasswordHandler,
  RefreshTokenHandler,
  LogoutHandler,
  UpdateUserHandler,
  DeleteUserHandler,
  CreateUserHandler,
  GenerateRegistrationOptionsHandler,
  VerifyRegistrationHandler,
  GenerateAuthenticationOptionsHandler,
  RevokeCredentialHandler,
];

const QueryHandlers = [
  GetUserHandler,
  GetUsersHandler,
  GetMeHandler,
  GetUserCredentialsHandler,
];

const EventHandlers = [
  UserRegisteredEventHandler,
  EmailConfirmedEventHandler,
  UserLoggedInEventHandler,
];

@Global()
@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([
      UserEntity,
      SessionEntity,
      WebAuthnCredentialEntity,
    ]),
    ConfigModule.forFeature(authConfig),
    ConfigModule.forFeature(webauthnConfig),
    PassportModule,
    JwtModule.register({}),
    PasswordHasherModule,
  ],
  controllers: [
    AuthController,
    UserController,
    WebAuthnController,
    WellKnownController,
  ],
  providers: [
    JwtStrategy,
    JwtRefreshStrategy,
    AnonymousStrategy,

    LoginStrategyResolver,
    EmailPasswordLoginStrategy,
    WebAuthnLoginStrategy,

    JwtTokenProvider,
    InMemoryChallengeStore,

    TypeOrmUserRepository,
    TypeOrmSessionRepository,
    WebAuthnCredentialRepositoryImpl,

    ...CommandHandlers,
    ...QueryHandlers,
    ...EventHandlers,

    {
      provide: TOKEN_PORT,
      useExisting: JwtTokenProvider,
    },
    {
      provide: SESSION_REPOSITORY_PORT,
      useExisting: TypeOrmSessionRepository,
    },
    {
      provide: USER_REPOSITORY_PORT,
      useExisting: TypeOrmUserRepository,
    },
    {
      provide: WEBAUTHN_CREDENTIAL_REPOSITORY_PORT,
      useExisting: WebAuthnCredentialRepositoryImpl,
    },
    {
      provide: CHALLENGE_STORE_PORT,
      useExisting: InMemoryChallengeStore,
    },
  ],
  exports: [
    TOKEN_PORT,
    USER_REPOSITORY_PORT,
    SESSION_REPOSITORY_PORT,
    WEBAUTHN_CREDENTIAL_REPOSITORY_PORT,
    CHALLENGE_STORE_PORT,
  ],
})
export class IdentityModule {}
