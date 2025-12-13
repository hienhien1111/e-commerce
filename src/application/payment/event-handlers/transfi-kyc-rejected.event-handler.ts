import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { PaymentKycRejectedEvent } from '@/domain/events/payment-kyc-rejected.event';
import type { PaymentUserRepositoryPort } from '../ports/transfi-user-repository.port';
import { TRANSFI_USER_REPOSITORY_PORT } from '../ports/transfi-user-repository.port';
import { KycStatus } from '@/domain/value-objects/kyc-status';

@EventsHandler(PaymentKycRejectedEvent)
export class PaymentKycRejectedEventHandler
  implements IEventHandler<PaymentKycRejectedEvent>
{
  private readonly logger = new Logger(PaymentKycRejectedEventHandler.name);

  constructor(
    @Inject(TRANSFI_USER_REPOSITORY_PORT)
    private readonly userRepository: PaymentUserRepositoryPort,
  ) {}

  async handle(event: PaymentKycRejectedEvent) {
    this.logger.log(
      `Handling PaymentKycRejectedEvent for user: ${event.transfiUserId}`,
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
      await this.userRepository.update(user.id, {
        kycStatus: KycStatus.REJECTED,
        metadata: {
          ...user.metadata,
          kycRejectionReason: event.rejectionReason,
          rejectedAt: event.rejectedAt,
        },
      });

      this.logger.log(`User ${event.transfiUserId} KYC rejected`);

      // TODO: Additional actions
      // - Send notification with rejection reason
      // - Provide instructions for re-submission
      // - Log for compliance/audit purposes
    } catch (error) {
      this.logger.error(
        `Error handling PaymentKycRejectedEvent: ${error}`,
        error.stack,
      );
      throw error;
    }
  }
}
