# Aggregate Design Guide

## Core Principles

- **Invariants drive boundaries**: Only group entities that must be consistent together
- **Small aggregates**: Keep them focused (1-3 entities max)
- **Reference by ID**: Aggregates reference each other by ID, not object references
- **One transaction per aggregate**: Modify only one aggregate per transaction

---

## Aggregate Map

```
┌─────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION DOMAIN                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐              │
│  │   User   │    │ Session  │    │ WebAuthn │              │
│  │(Standalone)│  │(Standalone)│  │Credential│              │
│  └──────────┘    └──────────┘    │(Standalone)│              │
│      │              │              └──────────┘              │
│      └──────────────┴──────────────────┘                    │
│              (all reference User by ID)                     │
│                                                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      IDENTITY DOMAIN                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐                                            │
│  │ UserProfile  │  (Standalone, references User by ID)       │
│  └──────────────┘                                            │
│                                                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      FINANCIAL DOMAIN                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │ Account  │    │TradingAccount│    │PaymentAccount│      │
│  │(Standalone)│  │(Standalone) │    │(Standalone)  │      │
│  └──────────┘    └──────────────┘    └──────────────┘      │
│      │                  │                    │              │
│      └──────────────────┴────────────────────┘              │
│              (all reference User by ID)                     │
│                                                               │
│  ┌──────────────────────┐                                   │
│  │InvestmentTransaction │  (Standalone, Immutable Log)     │
│  └──────────────────────┘                                   │
│                                                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                        KYC DOMAIN                           │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐                                        │
│  │ KYCVerification  │  (Root - ONLY aggregate with children) │
│  ├──────────────────┤                                        │
│  │  ┌────────────┐  │                                        │
│  │  │KycSession │  │  (owned entity)                        │
│  │  └────────────┘  │                                        │
│  │  ┌────────────┐  │                                        │
│  │  │KycDocument│  │  (owned entity)                        │
│  │  └────────────┘  │                                        │
│  └──────────────────┘                                        │
│         │                                                     │
│         └── references User by ID                            │
│                                                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    AUTHORIZATION DOMAIN                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────┐    ┌────────────┐                              │
│  │  Role    │    │Permission  │  (both Standalone)           │
│  │(Standalone)│  │(Standalone)│                              │
│  └──────────┘    └────────────┘                              │
│      │                │                                      │
│      └────────────────┘                                      │
│         (via role_permissions join table)                   │
│                                                               │
│  ┌──────────┐                                                │
│  │UserRoles │  (join table: user_id + role_id)              │
│  └──────────┘                                                │
│                                                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    GAMIFICATION DOMAIN                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────┐    ┌──────────────────┐                        │
│  │  Streak  │    │UserStreakProgress│                       │
│  │(Standalone)│  │  (Standalone)   │                        │
│  └──────────┘    └──────────────────┘                        │
│      │                  │                                     │
│      └──────────────────┘                                     │
│         (references by ID)                                   │
│                                                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      BANKING DOMAIN                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐                                            │
│  │ BankAccount  │  (Standalone, references User by ID)      │
│  └──────────────┘                                            │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Detailed Aggregate Design

### 1. User Aggregate (Auth Only)

**Root**: User

**Boundary**:

```
User (Root - standalone)
```

**Invariants**:

- Email must be unique
- State transitions: active → suspended → deleted
- Password must meet complexity requirements

**Why standalone**:

- Auth is checked on every request (hot path)
- No invariants require Sessions or Profile to be consistent with User
- Better performance without locking conflicts

**References**:

- None (other aggregates reference User by userId)

**Module**: `auth`

---

### 2. UserProfile Aggregate (Identity)

**Root**: UserProfile

**Boundary**:

```
UserProfile (Root - standalone)
```

**Invariants**:

- Phone must be valid format
- Date of birth: user must be 18+
- Country code must be valid ISO

**Why separate from User**:

- Profile changes don't affect authentication
- Different access patterns (rarely loaded)
- Can be extended with preferences without affecting auth

**References**:

- userId → User

**Module**: `identity`

---

### 3. Session Aggregate

**Root**: Session

**Boundary**:

```
Session (Root - standalone)
```

**Invariants**:

- Must have valid expiration
- Hash must be unique
- Belongs to active user

**Why separate**:

- Sessions are created/destroyed frequently
- No invariants with User or Profile
- Can be stored in Redis separately

**References**:

- userId → User

**Module**: `auth`

---

### 4. WebAuthnCredential Aggregate

**Root**: WebAuthnCredential

**Boundary**:

```
WebAuthnCredential (Root - standalone)
```

**Invariants**:

- credential_id must be unique
- Counter must only increase (anti-cloning)
- Must belong to verified user

**Why separate**:

- Independent lifecycle
- Counter check is separate transaction
- No invariants with Sessions

**References**:

- userId → User

**Module**: `auth`

---

### 5. Account Aggregate (Internal Balance)

**Root**: Account

**Boundary**:

```
Account (Root - standalone)
```

**Invariants**:

- Balance cannot go negative
- One account per user
- Currency must be valid

**Why critical**:

- Financial data requires ACID guarantees
- Balance updates are atomic
- High contention (needs optimistic locking)

**References**:

- userId → User

**Module**: `accounts`

---

### 6. TradingAccount Aggregate

**Root**: TradingAccount

**Boundary**:

```
TradingAccount (Root - standalone)
```

**Invariants**:

- Status transitions: pending → active → suspended → closed
- API key must be encrypted
- Account number unique per provider

**Why separate**:

- External provider integration
- Multiple accounts per user
- Independent lifecycle

**References**:

- userId → User

**Module**: `trading`

---

### 7. PaymentAccount Aggregate

**Root**: PaymentAccount

**Boundary**:

```
PaymentAccount (Root - standalone)
```

**Invariants**:

- Status transitions valid
- Currency matches provider requirements
- Account ID unique per provider

**Why separate**:

- External provider integration
- Multiple accounts per user
- Independent lifecycle

**References**:

- userId → User

**Module**: `payments`

---

### 8. InvestmentTransaction Aggregate

**Root**: InvestmentTransaction (renamed from InvestmentHistory)

**Boundary**:

```
InvestmentTransaction (Root - standalone, immutable)
```

**Invariants**:

- Amount must be positive
- Status transitions: pending → processing → completed/failed/cancelled
- **Immutable once completed** (audit trail)
- Must reference valid tradingAccountId OR paymentAccountId

**Why separate**:

- Transaction log (append-only)
- No modifications after completion
- Financial audit requirements

**References**:

- userId → User
- tradingAccountId → TradingAccount
- paymentAccountId → PaymentAccount

**Module**: `investments`

---

### 9. KYCVerification Aggregate ✅ (ONLY Aggregate with Children)

**Root**: KYCVerification

**Boundary**:

```
KYCVerification (Root)
├── KYCSession (Entity)
└── KYCDocument[] (Entities)
```

**Invariants**:

- Status transitions: pending → in_progress → verified/failed/rejected
- Sessions must be in sequence
- Documents must belong to verification
- Confidence scores 0-100
- Cannot have multiple active verifications per user

**Why together**:

- Complete KYC workflow is one unit
- Documents/sessions meaningless without verification
- All must be consistent

**References**:

- userId → User

**Module**: `kyc`

---

### 10. BankAccount Aggregate

**Root**: BankAccount

**Boundary**:

```
BankAccount (Root - standalone)
```

**Invariants**:

- Only one primary account per user
- Must be verified before withdrawal
- Account number unique per bank

**Why separate**:

- External bank integration
- Multiple accounts per user
- Independent verification process

**References**:

- userId → User

**Module**: `banking`

---

### 11. Streak Aggregate (System-Level)

**Root**: Streak

**Boundary**:

```
Streak (Root - standalone)
```

**Invariants**:

- Duration must be positive
- Target amount must be positive (if specified)
- Must be active to track progress

**Why separate**:

- System-level configuration
- Multiple users participate
- Independent management

**References**:

- None (standalone)

**Module**: `gamification`

---

### 12. UserStreakProgress Aggregate

**Root**: UserStreakProgress

**Boundary**:

```
UserStreakProgress (Root - standalone)
```

**Invariants**:

- Current streak ≥ 0
- Total invested ≥ 0
- Reward claimed only once
- Last investment date valid

**Why separate**:

- User-specific tracking
- Independent from Streak definition
- Can be reset independently

**References**:

- userId → User
- streakId → Streak

**Module**: `gamification`

---

### 13. Role Aggregate

**Root**: Role

**Boundary**:

```
Role (Root - standalone)
```

**Invariants**:

- Name must be unique
- Cannot delete if assigned to users
- System roles immutable

**Why separate**:

- System-level configuration
- Shared across many users

**References**:

- permissionIds[] → Permission (via junction table)

**Module**: `auth`

---

### 14. Permission Aggregate

**Root**: Permission

**Boundary**:

```
Permission (Root - standalone)
```

**Invariants**:

- Name must be unique
- Format: action:resource
- Action/resource must be valid enums

**Why separate**:

- System-level configuration
- Shared across many roles

**References**:

- None (standalone)

**Module**: `auth`

---

## ❌ NOT Aggregates (Read Models / Projections)

### PortfolioHolding (Read Model)

**Why not an aggregate**:

- Derived from InvestmentTransaction
- No business invariants to enforce
- Can be rebuilt from history
- Eventually consistent with external APIs

**Implementation**:

```typescript
// Projection/View in trading module
interface PortfolioHolding {
  userId: string;
  symbol: string;
  quantity: number; // SUM(buy) - SUM(sell)
  averagePrice: number; // Calculated
  currentPrice: number; // From external API
  // All computed, no invariants
}
```

### UserFavorite (Simple Entity, not aggregate)

**Why not an aggregate**:

- No complex invariants
- Just a junction table (many-to-many)
- Can be part of User aggregate or standalone table

### Notification

**Type**: Entity (owned by User) OR Domain Event

**Why not an aggregate**:

- Immutable, no invariants to enforce
- Can be stored as part of User or as event

---

## Summary Comparison

| Original Design                     | Issue                         | Corrected                            |
| ----------------------------------- | ----------------------------- | ------------------------------------ |
| User + Profile + Session + WebAuthn | Too large, no real invariants | Split into 4 separate aggregates     |
| PortfolioHolding as aggregate       | No invariants, derived data   | Read model / projection              |
| Notification as aggregate           | Immutable, no invariants      | Entity owned by User OR domain event |

---

## Quick Reference Table

| Aggregate Root            | Child Entities          | Key Invariant                   | Module         |
| ------------------------- | ----------------------- | ------------------------------- | -------------- |
| **User**                  | -                       | Email unique, state transitions | `auth`         |
| **UserProfile**           | -                       | Phone valid, age 18+            | `identity`     |
| **Session**               | -                       | Hash unique, expires            | `auth`         |
| **WebAuthnCredential**    | -                       | Counter only increases          | `auth`         |
| **Account**               | -                       | Balance ≥ 0, one per user       | `accounts`     |
| **TradingAccount**        | -                       | Status transitions valid        | `trading`      |
| **PaymentAccount**        | -                       | Status transitions valid        | `payments`     |
| **InvestmentTransaction** | -                       | Immutable when completed        | `investments`  |
| **KycVerification**       | KycSession, KycDocument | Status sequence valid           | `kyc`          |
| **BankAccount**           | -                       | One primary per user            | `banking`      |
| **Streak**                | -                       | Duration > 0                    | `gamification` |
| **UserStreakProgress**    | -                       | Progress ≥ 0                    | `gamification` |
| **Role**                  | -                       | Name unique                     | `auth`         |
| **Permission**            | -                       | Name unique, format valid       | `auth`         |

---

## Design Rules

### ✅ DO

1. **Keep aggregates small** (1-3 entities max)
2. **One transaction = One aggregate**
3. **Reference by ID only** (not object references)
4. **Invariants drive boundaries** (what MUST change together?)

### ❌ DON'T

1. **Don't bundle unrelated entities** (User + Session + Profile)
2. **Don't make read models aggregates** (PortfolioHolding)
3. **Don't modify multiple aggregates in one transaction**
4. **Don't hold object references** to other aggregates

---

## Cross-Aggregate Communication

```
User → Account: Domain Event (UserCreated → CreateAccount)
Account → InvestmentTransaction: Domain Event (BalanceUpdated)
KYC → User: Domain Event (KycVerified → ActivateUser)
```

**Never:** Direct aggregate-to-aggregate method calls  
**Always:** Domain Events or Application Services

---

## Module Organization

```
src/
├── auth/              # User, Session, WebAuthn, Role, Permission
├── identity/          # UserProfile
├── accounts/          # Account (internal balance)
├── trading/           # TradingAccount
├── payments/          # PaymentAccount
├── investments/       # InvestmentTransaction
├── kyc/               # KycVerification + children
├── banking/           # BankAccount
└── gamification/     # Streak, UserStreakProgress
```

---

## Key Takeaways

1. **Invariants drive boundaries**: Don't group entities just because they're "related"
2. **Small aggregates scale**: 1-3 entities max per aggregate
3. **Read models ≠ aggregates**: Derived data doesn't need aggregate protection
4. **One transaction per aggregate**: This is non-negotiable for scalability
5. **Reference by ID**: Aggregates should not hold references to other aggregates

> **Ask yourself:** "What business rule requires these entities to change together atomically?"

If the answer is **"none"**, they shouldn't be in the same aggregate!
