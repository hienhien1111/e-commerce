export class OrderStatus {
  private constructor(private readonly _value: string) {}

  static readonly PENDING = new OrderStatus('pending');
  static readonly PROCESSING = new OrderStatus('processing');
  static readonly COMPLETED = new OrderStatus('completed');
  static readonly FAILED = new OrderStatus('failed');
  static readonly CANCELLED = new OrderStatus('cancelled');

  get value(): string {
    return this._value;
  }

  equals(other: OrderStatus): boolean {
    return this._value === other._value;
  }

  isCompleted(): boolean {
    return this._value === 'completed';
  }

  isFailed(): boolean {
    return this._value === 'failed';
  }

  isPending(): boolean {
    return this._value === 'pending';
  }

  static fromString(value: string): OrderStatus {
    switch (value) {
      case 'pending':
        return OrderStatus.PENDING;
      case 'processing':
        return OrderStatus.PROCESSING;
      case 'completed':
        return OrderStatus.COMPLETED;
      case 'failed':
        return OrderStatus.FAILED;
      case 'cancelled':
        return OrderStatus.CANCELLED;
      default:
        throw new Error(`Invalid order status: ${value}`);
    }
  }

  toString(): string {
    return this._value;
  }
}
