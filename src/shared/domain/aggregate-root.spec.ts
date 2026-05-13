import { AggregateRoot } from './aggregate-root';
import { BaseDomainEvent } from './domain-event';

class TestRegisteredEvent extends BaseDomainEvent {
  constructor(public readonly aggregateId: string) {
    super();
  }
}

class TestAggregate extends AggregateRoot {
  static create(id: string): TestAggregate {
    const agg = new TestAggregate(id);
    agg.addDomainEvent(new TestRegisteredEvent(id));
    return agg;
  }

  doSomething() {
    this.touch();
    this.addDomainEvent(new TestRegisteredEvent(this.id));
  }
}

describe('AggregateRoot', () => {
  it('exposes id, createdAt, updatedAt', () => {
    const before = Date.now();
    const agg = TestAggregate.create('abc');
    const after = Date.now();
    expect(agg.id).toBe('abc');
    expect(agg.createdAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(agg.createdAt.getTime()).toBeLessThanOrEqual(after);
    expect(agg.updatedAt).toBeInstanceOf(Date);
  });

  it('buffers domain events emitted during construction', () => {
    const agg = TestAggregate.create('xyz');
    const events = agg.peekDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(TestRegisteredEvent);
  });

  it('pullDomainEvents() drains the buffer', () => {
    const agg = TestAggregate.create('xyz');
    const drained = agg.pullDomainEvents();
    expect(drained).toHaveLength(1);
    expect(agg.peekDomainEvents()).toHaveLength(0);
  });

  it('accumulates multiple events across mutations', () => {
    const agg = TestAggregate.create('xyz');
    agg.doSomething();
    agg.doSomething();
    expect(agg.peekDomainEvents()).toHaveLength(3);
  });

  it('touch() updates updatedAt', async () => {
    const agg = TestAggregate.create('xyz');
    const initial = agg.updatedAt.getTime();
    await new Promise((r) => setTimeout(r, 5));
    agg.doSomething();
    expect(agg.updatedAt.getTime()).toBeGreaterThan(initial);
  });

  it('clearDomainEvents() discards without dispatching', () => {
    const agg = TestAggregate.create('xyz');
    agg.clearDomainEvents();
    expect(agg.peekDomainEvents()).toHaveLength(0);
  });
});
