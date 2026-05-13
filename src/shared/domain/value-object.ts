/**
 * ValueObject<T> — base class for immutable, equality-by-value types.
 *
 * Use for things like Email, Money, Address. NEVER use for entities — they
 * have identity (id) and equality-by-identity.
 *
 * Subclasses MUST validate invariants in the constructor and throw on
 * violation. Use a static factory `create(...)` to construct.
 */
export abstract class ValueObject<TProps> {
  protected readonly props: Readonly<TProps>;

  protected constructor(props: TProps) {
    this.props = Object.freeze({ ...props });
  }

  /** Structural equality. Two VOs are equal iff all props are equal. */
  equals(other?: ValueObject<TProps> | null): boolean {
    if (other === null || other === undefined) return false;
    if (other.constructor !== this.constructor) return false;
    return JSON.stringify(this.props) === JSON.stringify(other.props);
  }
}
