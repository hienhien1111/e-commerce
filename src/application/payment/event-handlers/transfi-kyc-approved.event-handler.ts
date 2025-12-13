import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { PaymentKycApprovedEvent } from '@/domain/events/payment-kyc-approved.event';
import type { PaymentUserRepositoryPort } from '../ports/transfi-user-repository.port';
import { TRANSFI_USER_REPOSITORY_PORT } from '../ports/transfi-user-repository.port';
import { KycStatus } from '@/domain/value-objects/kyc-status';

@EventsHandler(PaymentKycApprovedEvent)
export class PaymentKycApprovedEventHandler
  implements IEventHandler<PaymentKycApprovedEvent>
{
  private readonly logger = new Logger(PaymentKycApprovedEventHandler.name);

  constructor(
    @Inject(TRANSFI_USER_REPOSITORY_PORT)
    private readonly userRepository: PaymentUserRepositoryPort,
  ) {}

  async handle(event: PaymentKycApprovedEvent) {
    this.logger.log(
      `Handling PaymentKycApprovedEvent for user: ${event.transfiUserId}`,
    );

    try {
      // Find user in local database
      const user = await this.userRepository.findByPaymentUserId(
        event.transfiUserId,
      );

      if (!user) {
        this.logger.warn(
          `User ${event.transfiUserId} not found in local database`,
        );
        return;
      }

      // Update KYC status
      const kycLevel = event.kycLevel
        ? parseInt(event.kycLevel, 10) || user.kycLevel
        : user.kycLevel;

      await this.userRepository.update(user.id, {
        kycStatus: KycStatus.APPROVED,
        kycLevel,
      });

      this.logger.log(
        `User ${event.transfiUserId} KYC approved with level ${event.kycLevel}`,
      );

      // TODO: Additional actions
      // - Send congratulations notification
      // - Unlock premium features
      // - Award KYC completion bonus
      // - Update user permissions
    } catch (error) {
      this.logger.error(
        `Error handling PaymentKycApprovedEvent: ${error}`,
        error.stack,
      );
      throw error;
    }
  }
}
