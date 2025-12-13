import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { CreateIndividualUserCommand } from './create-individual-user.command';
import { CreateIndividualUserResult } from './create-individual-user.result';
import type { TransfiApiPort } from '../../ports/transfi-api.port';
import { TRANSFI_API_PORT } from '../../ports/transfi-api.port';
import type { PaymentUserRepositoryPort } from '../../ports/transfi-user-repository.port';
import { TRANSFI_USER_REPOSITORY_PORT } from '../../ports/transfi-user-repository.port';
import { KycStatus } from '@/domain/value-objects/kyc-status';

@CommandHandler(CreateIndividualUserCommand)
export class CreateIndividualUserHandler
  implements ICommandHandler<CreateIndividualUserCommand>
{
  constructor(
    @Inject(TRANSFI_API_PORT)
    private readonly transfiApi: TransfiApiPort,
    @Inject(TRANSFI_USER_REPOSITORY_PORT)
    private readonly userRepository: PaymentUserRepositoryPort,
  ) {}

  async execute(
    command: CreateIndividualUserCommand,
  ): Promise<CreateIndividualUserResult> {
    const { dto } = command;

    const existingUser = await this.userRepository.findByUserId(dto.userId);
    if (existingUser) {
      throw new Error(
        `User with userId ${dto.userId} already has a Transfi account`,
      );
    }

    const transfiUserResponse = await this.transfiApi.createIndividualUser(dto);
    console.log(
      'TransFi API Response:',
      JSON.stringify(transfiUserResponse, null, 2),
    );

    const effectivePaymentUserId =
      (transfiUserResponse as any).transfiUserId ??
      (transfiUserResponse as any).userId;

    if (!transfiUserResponse || !effectivePaymentUserId) {
      throw new Error(
        'Failed to retrieve transfiUserId from TransFi API response',
      );
    }

    await this.userRepository.create({
      userId: dto.userId,
      transfiUserId: effectivePaymentUserId,
      userType: 'individual',
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      kycStatus: KycStatus.NOT_SUBMITTED,
    });

    return {
      ...transfiUserResponse,
      transfiUserId: effectivePaymentUserId,
    } as CreateIndividualUserResult;
  }
}
