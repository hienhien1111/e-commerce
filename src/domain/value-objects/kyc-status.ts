export class KycStatus {
  private constructor(private readonly _value: string) {}

  static readonly NOT_SUBMITTED = new KycStatus('not_submitted');
  static readonly PENDING = new KycStatus('pending');
  static readonly APPROVED = new KycStatus('approved');
  static readonly REJECTED = new KycStatus('rejected');

  get value(): string {
    return this._value;
  }

  equals(other: KycStatus): boolean {
    return this._value === other._value;
  }

  static fromString(value: string): KycStatus {
    switch (value) {
      case 'not_submitted':
        return KycStatus.NOT_SUBMITTED;
      case 'pending':
        return KycStatus.PENDING;
      case 'approved':
        return KycStatus.APPROVED;
      case 'rejected':
        return KycStatus.REJECTED;
      default:
        throw new Error(`Invalid KYC status: ${value}`);
    }
  }

  toString(): string {
    return this._value;
  }
}
