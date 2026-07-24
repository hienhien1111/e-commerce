import { HttpStatus } from '@nestjs/common';
import { ApplicationError } from '@/application/shared/errors/application.error';
import { ApplicationErrorFilter } from './application-error.filter';

describe('ApplicationErrorFilter', () => {
  it.each([
    ['NOT_FOUND', HttpStatus.NOT_FOUND],
    ['CONFLICT', HttpStatus.CONFLICT],
    ['UNPROCESSABLE', HttpStatus.UNPROCESSABLE_ENTITY],
  ] as const)(
    'maps %s errors to a stable HTTP response',
    (kind, statusCode) => {
      const json = jest.fn();
      const status = jest.fn().mockReturnValue({ json });
      const host = {
        switchToHttp: () => ({ getResponse: () => ({ status }) }),
      };
      const error = new ApplicationError(
        'RESERVATION_FAILED',
        'Reservation failed',
        kind,
        false,
        { orderId: 'order-1' },
      );

      new ApplicationErrorFilter().catch(error, host as never);

      expect(status).toHaveBeenCalledWith(statusCode);
      expect(json).toHaveBeenCalledWith({
        statusCode,
        code: 'RESERVATION_FAILED',
        message: 'Reservation failed',
        retryable: false,
        details: { orderId: 'order-1' },
      });
    },
  );
});
