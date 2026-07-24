import { CommerceQueueService } from '@/infrastructure/messaging/commerce-queue.service';
import { CommerceEventType } from '@/infrastructure/messaging/commerce-event.constants';

const paymentId = '019f8e71-e000-7000-8000-000000000001';
const orderId = '019f8e71-e000-7000-8000-000000000002';
const eventId = '019f8e71-e000-7000-8000-000000000003';

const job = {
  name: CommerceEventType.REFUND_RECONCILIATION_REQUESTED,
  data: { outboxId: eventId },
};
const message = {
  id: eventId,
  aggregateId: paymentId,
  eventType: CommerceEventType.REFUND_RECONCILIATION_REQUESTED,
  payload: { paymentId, orderId, reason: 'LATE_PAYMENT' },
};
const prepared = {
  id: '019f8e71-e000-7000-8000-000000000004',
  paymentId,
  orderId,
  providerOrderId: 'momo-order-1',
  providerTransId: '123456789',
  providerRefundOrderId: 'refund-order-1',
  requestId: 'refund-request-1',
  amount: { toNumber: () => 100_000 },
};

function setup() {
  const outbox = {
    begin: jest.fn().mockResolvedValue(message),
    complete: jest.fn(),
    fail: jest.fn(),
  };
  const refunds = {
    prepare: jest.fn().mockResolvedValue(prepared),
    succeed: jest.fn(),
    fail: jest.fn(),
  };
  const gateway = {
    queryTransaction: jest.fn(),
    refund: jest.fn(),
  };
  const metric = () => ({ inc: jest.fn(), set: jest.fn() });
  const metrics = Array.from({ length: 6 }, metric);
  const service = new CommerceQueueService(
    outbox as never,
    {} as never,
    refunds as never,
    gateway as never,
    metrics[0] as never,
    metrics[1] as never,
    metrics[2] as never,
    metrics[3] as never,
    metrics[4] as never,
    metrics[5] as never,
  );
  const process = (
    service as unknown as { process: (value: unknown) => Promise<void> }
  ).process.bind(service);
  return { process, outbox, refunds, gateway };
}

describe('CommerceQueueService refund reconciliation', () => {
  it('queries before refund and treats an existing full refund as success', async () => {
    const { process, outbox, refunds, gateway } = setup();
    gateway.queryTransaction.mockResolvedValue({
      resultCode: 0,
      message: 'Successful.',
      refundedAmount: 100_000,
    });

    await process(job);

    expect(gateway.refund).not.toHaveBeenCalled();
    expect(refunds.succeed).toHaveBeenCalledWith(prepared.id);
    expect(outbox.complete).toHaveBeenCalledWith(eventId);
  });

  it('records retryable timeouts and moves the payment to failed at dead-letter', async () => {
    const { process, outbox, refunds, gateway } = setup();
    gateway.queryTransaction.mockRejectedValue(new Error('MoMo timeout'));
    outbox.fail.mockResolvedValue({ attempts: 10, deadLetter: true });

    await process(job);

    expect(refunds.fail).toHaveBeenCalledWith(paymentId, 'MoMo timeout', true);
    expect(outbox.complete).not.toHaveBeenCalled();
  });
});
