# Phabora Feature Gap Analysis

**Date:** 2026-04-23  
**Purpose:** Identify missing features to reach competitor parity  
**Status:** Analysis Complete  

---

## Executive Summary

Phabora hiện tại đã build được **core AI Interview flow**. Tuy nhiên, để cạnh tranh với các đối thủ (Base E-Hiring, MISA AMIS, Spark Hire, etc.), cần bổ sung nhiều features quan trọng.

**Current State:** ~25% of planned features  
**Gap to MVP Competitor Parity:** ~40% more features needed  
**Gap to Full Parity:** ~75% more features needed  

---

## Current State Analysis

### ✅ What's Built

| Module | Feature | Status | Notes |
|--------|---------|--------|-------|
| **Auth** | Login | ✅ Done | Email/password |
| **Auth** | Signup | ✅ Done | Basic flow |
| **Auth** | Forgot Password | ✅ Done | Email reset |
| **Auth** | Role-based Access | ✅ Done | admin, hr, lead |
| **Interview** | Create Interview | ✅ Done | JD + CV + context |
| **Interview** | Generate Questions | ✅ Done | AI generates from JD/CV |
| **Interview** | Lead Review | ✅ Done | Edit/confirm questions |
| **Interview** | Send Link | ✅ Done | Token-based access |
| **Interview** | Interview Room | ✅ Done | Video + AI conversation |
| **Interview** | Recording | ✅ Done | Video chunks + merge |
| **Interview** | Transcription | ✅ Done | OpenAI Whisper |
| **Interview** | TTS Response | ✅ Done | OpenAI TTS |
| **Interview** | Scoring | ✅ Done | 5 dimensions |
| **Interview** | View Results | ✅ Done | Score card + recording |
| **Storage** | Video Storage | ✅ Done | Supabase + R2 |
| **Storage** | Retention Cleanup | ✅ Done | Auto-delete old recordings |
| **Landing** | Landing Page | ✅ Done | Hero, features, CTA |
| **Dashboard** | Basic Layout | ✅ Done | Sidebar, nav |
| **Dashboard** | Interview List | ✅ Done | View all interviews |

### Database Schema (Built)

```sql
-- Tables that exist:
✅ interviews
✅ interview_questions  
✅ interview_answers
✅ interview_recordings
✅ candidates (basic)
✅ user_roles
```

---

## Feature Gap Analysis

### 🔴 CRITICAL (Must have for MVP competitor parity)

#### 1. Multi-Language UI (i18n)

| Item | Status | Effort | Priority |
|------|--------|--------|----------|
| i18n framework (next-intl) | ❌ Missing | 2-3 days | P0 |
| English translations | ❌ Missing | 2-3 days | P0 |
| Language switcher | ❌ Missing | 0.5 day | P0 |
| Interview language selection | ⚠️ Partial (DB has field) | 1 day | P0 |

**Competitors:** All have multi-language  
**Impact:** Cannot enter US market without English  

#### 2. Pipeline/Kanban View

| Item | Status | Effort | Priority |
|------|--------|--------|----------|
| Kanban board component | ❌ Missing | 3-4 days | P0 |
| Drag-drop functionality | ❌ Missing | 2 days | P0 |
| Status transitions | ❌ Missing | 1 day | P0 |
| Filters (by job, date, status) | ❌ Missing | 1-2 days | P0 |
| Bulk actions | ❌ Missing | 1 day | P1 |

**Competitors:** Base E-Hiring, SHiring, Spark Hire all have this  
**Impact:** HR cannot manage multiple candidates efficiently  

#### 3. Candidate Management

| Item | Status | Effort | Priority |
|------|--------|--------|----------|
| Candidate list view | ❌ Missing | 2 days | P0 |
| Candidate detail page | ❌ Missing | 2 days | P0 |
| Candidate search | ❌ Missing | 1 day | P0 |
| Candidate notes/tags | ❌ Missing | 1 day | P1 |
| Interview history per candidate | ❌ Missing | 1 day | P0 |
| Merge duplicate candidates | ❌ Missing | 2 days | P2 |

**Competitors:** All ATS have this  
**Impact:** Cannot track candidates across multiple interviews  

#### 4. Job/Position Management

| Item | Status | Effort | Priority |
|------|--------|--------|----------|
| Jobs table | ❌ Missing | DB + API: 2 days | P0 |
| Create/edit job | ❌ Missing | 2 days | P0 |
| Job list view | ❌ Missing | 1 day | P0 |
| Link interviews to jobs | ❌ Missing | 1 day | P0 |
| Job status (open/closed/draft) | ❌ Missing | 0.5 day | P0 |
| Job templates | ❌ Missing | 2 days | P1 |

**Competitors:** All ATS have jobs as core entity  
**Impact:** Cannot organize interviews by position  

#### 5. Email Notifications

| Item | Status | Effort | Priority |
|------|--------|--------|----------|
| Email service (Resend) | ⚠️ Partial setup | 1 day | P0 |
| Interview invitation email | ❌ Missing | 1 day | P0 |
| Reminder emails | ❌ Missing | 1 day | P1 |
| Completion notification | ❌ Missing | 0.5 day | P0 |
| Email templates (customizable) | ❌ Missing | 2 days | P1 |

**Competitors:** All have email automation  
**Impact:** Manual process to notify candidates  

#### 6. Settings & Configuration

| Item | Status | Effort | Priority |
|------|--------|--------|----------|
| User profile settings | ❌ Missing | 1 day | P0 |
| Company settings | ❌ Missing | 1-2 days | P0 |
| Notification preferences | ❌ Missing | 1 day | P1 |
| Team/user management | ❌ Missing | 2-3 days | P0 |
| Invite team members | ❌ Missing | 2 days | P0 |

**Competitors:** All SaaS have settings  
**Impact:** Cannot configure or invite team  

---

### 🟡 IMPORTANT (Need for competitive advantage)

#### 7. CV Parsing & Scoring

| Item | Status | Effort | Priority |
|------|--------|--------|----------|
| CV upload (PDF, DOCX) | ⚠️ Partial (interview has cv_text) | 1 day | P1 |
| CV parsing (extract structured) | ❌ Missing | 3-4 days | P1 |
| CV scoring algorithm | ❌ Missing | 3-4 days | P1 |
| 5-dimension scoring display | ❌ Missing | 2 days | P1 |
| Scoring rules configuration | ❌ Missing | 2-3 days | P2 |

**Competitors:** MISA AMIS, SHiring have AI CV scoring  
**Impact:** Cannot auto-filter candidates before interview  

#### 8. JD Writer (AI)

| Item | Status | Effort | Priority |
|------|--------|--------|----------|
| JD creation page | ❌ Missing | 2 days | P1 |
| AI JD generation | ❌ Missing | 2-3 days | P1 |
| JD templates (YAML) | ❌ Missing | 2 days | P1 |
| JD editing/versioning | ❌ Missing | 2-3 days | P2 |
| DOCX export | ❌ Missing | 1-2 days | P2 |
| Huly integration | ❌ Missing | 3-4 days | P2 |

**Competitors:** TurboHire has this  
**Impact:** Unique differentiator not yet built  

#### 9. Analytics & Reporting

| Item | Status | Effort | Priority |
|------|--------|--------|----------|
| Dashboard overview stats | ❌ Missing | 2 days | P1 |
| Interview analytics | ❌ Missing | 2-3 days | P1 |
| Time-to-hire metrics | ❌ Missing | 1-2 days | P2 |
| Conversion funnel | ❌ Missing | 2 days | P2 |
| Export reports | ❌ Missing | 1-2 days | P2 |

**Competitors:** Ashby, Greenhouse strong here  
**Impact:** Cannot demonstrate ROI to customers  

#### 10. Anti-Cheat / Integrity

| Item | Status | Effort | Priority |
|------|--------|--------|----------|
| Eye tracking (MediaPipe) | ❌ Missing | 3-4 days | P1 |
| Tab switch detection | ❌ Missing | 1 day | P1 |
| Response timing analysis | ❌ Missing | 1-2 days | P1 |
| LLM pattern detection | ❌ Missing | 2-3 days | P2 |
| Integrity score calculation | ⚠️ Field exists, logic missing | 2 days | P1 |

**Competitors:** HireVue has proctoring  
**Impact:** Key differentiator not yet built  

---

### 🟢 NICE TO HAVE (Phase 2-3)

#### 11. Onboarding Hub

| Item | Status | Effort | Priority |
|------|--------|--------|----------|
| Onboarding checklists | ❌ Missing | 3-4 days | P2 |
| Task assignment | ❌ Missing | 2-3 days | P2 |
| Progress tracking | ❌ Missing | 2 days | P2 |
| Document collection | ❌ Missing | 2-3 days | P2 |
| Learning paths | ❌ Missing | 3-4 days | P3 |

**Competitors:** Zappyhire, Paradox have this  
**Impact:** Full lifecycle differentiator  

#### 12. Knowledge Base (RAG)

| Item | Status | Effort | Priority |
|------|--------|--------|----------|
| Document upload | ❌ Missing | 2 days | P2 |
| Chunking + embedding | ❌ Missing | 3-4 days | P2 |
| RAG query API | ❌ Missing | 2-3 days | P2 |
| Chat widget | ❌ Missing | 2-3 days | P2 |
| Policy AI bot | ❌ Missing | 2-3 days | P3 |

**Competitors:** No one has this (unique)  
**Impact:** Retention/stickiness feature  

#### 13. Integrations

| Item | Status | Effort | Priority |
|------|--------|--------|----------|
| Calendar integration | ❌ Missing | 3-4 days | P2 |
| Slack notifications | ❌ Missing | 2 days | P2 |
| ATS import/export | ❌ Missing | 3-4 days | P2 |
| Webhook system | ❌ Missing | 2-3 days | P2 |
| Zapier connector | ❌ Missing | 3-4 days | P3 |

**Competitors:** Most have integrations  
**Impact:** Enterprise requirement  

#### 14. Chrome Extension (Sourcing)

| Item | Status | Effort | Priority |
|------|--------|--------|----------|
| Extension manifest | ❌ Missing | 1 day | P3 |
| LinkedIn scraper | ❌ Missing | 3-4 days | P3 |
| TopCV scraper | ❌ Missing | 2-3 days | P3 |
| Quick add candidate | ❌ Missing | 2 days | P3 |

**Competitors:** Hiretual, Gem have this  
**Impact:** Sourcing differentiator  

#### 15. Billing & Subscription

| Item | Status | Effort | Priority |
|------|--------|--------|----------|
| Stripe integration | ❌ Missing | 3-4 days | P1 (for US) |
| Vietnam payment (VNPay/MoMo) | ❌ Missing | 3-4 days | P1 (for VN) |
| Subscription management | ❌ Missing | 2-3 days | P1 |
| Usage tracking | ❌ Missing | 2 days | P1 |
| Invoicing | ❌ Missing | 2 days | P2 |

**Competitors:** All SaaS need this  
**Impact:** Cannot charge customers without it  

---

## Feature Matrix: Phabora vs Competitors

| Feature | Phabora | Base E-Hiring | MISA AMIS | Spark Hire | HireVue |
|---------|---------|---------------|-----------|------------|---------|
| **Auth & Roles** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Multi-language** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Job Management** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Pipeline/Kanban** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Candidate Management** | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| **CV Parsing** | ❌ | ✅ | ✅ | ⚠️ | ✅ |
| **CV Scoring** | ❌ | ⚠️ | ✅ | ❌ | ✅ |
| **JD Writer (AI)** | ❌ | ❌ | ⚠️ | ❌ | ❌ |
| **AI Interview** | ✅ | ❌ | ❌ | ⚠️ async | ✅ |
| **Live Video AI** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Recording/Playback** | ✅ | ⚠️ | ⚠️ | ✅ | ✅ |
| **AI Scoring** | ✅ | ❌ | ✅ | ⚠️ | ✅ |
| **Anti-cheat** | ❌ | ❌ | ❌ | ❌ | ⚠️ |
| **Email Automation** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Analytics** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Team Management** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Settings** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Billing/Payments** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Onboarding Hub** | ❌ | ❌ | ⚠️ | ❌ | ⚠️ |
| **Knowledge Base** | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Integrations** | ❌ | ✅ | ✅ | ✅ | ✅ |

**Legend:** ✅ Full | ⚠️ Partial | ❌ Missing

---

## Prioritized Roadmap

### Phase 1: MVP Competitor Parity (6-8 weeks)

**Goal:** Có đủ features để bán được cho khách đầu tiên

| Week | Features | Effort |
|------|----------|--------|
| **Week 1-2** | Multi-language (i18n EN+VI) | 5 days |
| **Week 2-3** | Job Management (CRUD, link to interviews) | 5 days |
| **Week 3-4** | Candidate Management (list, detail, search) | 5 days |
| **Week 4-5** | Pipeline/Kanban View | 5 days |
| **Week 5-6** | Email Notifications (invitation, completion) | 4 days |
| **Week 6-7** | Settings (user, company, team invite) | 5 days |
| **Week 7-8** | Billing (Stripe for US, VNPay for VN) | 6 days |

**Total:** ~35 days of dev work

### Phase 2: Competitive Advantage (4-6 weeks)

**Goal:** Unique features không ai có

| Week | Features | Effort |
|------|----------|--------|
| **Week 1-2** | CV Parsing & Scoring | 7 days |
| **Week 2-3** | JD Writer (AI) | 5 days |
| **Week 3-4** | Anti-cheat / Integrity | 6 days |
| **Week 4-5** | Analytics Dashboard | 5 days |
| **Week 5-6** | Buffer / Polish | 5 days |

**Total:** ~28 days of dev work

### Phase 3: Full Platform (6-8 weeks)

**Goal:** Full lifecycle, enterprise-ready

| Week | Features | Effort |
|------|----------|--------|
| **Week 1-3** | Onboarding Hub | 10 days |
| **Week 3-5** | Knowledge Base (RAG) | 10 days |
| **Week 5-7** | Integrations (Calendar, Slack, Webhooks) | 8 days |
| **Week 7-8** | Chrome Extension | 6 days |

**Total:** ~34 days of dev work

---

## Effort Summary

| Phase | Features | Days | Calendar Time |
|-------|----------|------|---------------|
| Phase 1 (MVP) | 7 feature groups | ~35 days | 6-8 weeks |
| Phase 2 (Advantage) | 5 feature groups | ~28 days | 4-6 weeks |
| Phase 3 (Full) | 4 feature groups | ~34 days | 6-8 weeks |
| **Total** | **16 feature groups** | **~97 days** | **16-22 weeks** |

**Note:** Estimates assume 1 senior developer. Parallelize with 2 devs = ~50% faster.

---

## Quick Wins (Can ship in < 1 week)

| Feature | Effort | Impact |
|---------|--------|--------|
| Dashboard stats (interview count, completion rate) | 2 days | High |
| Candidate list view (basic) | 2 days | High |
| Email invitation (Resend) | 2 days | High |
| Language switcher (UI only) | 1 day | Medium |
| Interview status badges | 0.5 day | Medium |
| Export interview results (PDF) | 2 days | Medium |

---

## Database Schema Needed

### New Tables Required

```sql
-- Jobs/Positions
CREATE TABLE jobs (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  department TEXT,
  location TEXT,
  jd_text TEXT,
  status TEXT DEFAULT 'draft', -- draft, open, closed
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Link interviews to jobs
ALTER TABLE interviews ADD COLUMN job_id UUID REFERENCES jobs(id);

-- Team/Organization
CREATE TABLE organizations (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  plan TEXT DEFAULT 'free', -- free, starter, growth, business
  billing_email TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE organization_members (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES auth.users(id),
  role TEXT NOT NULL, -- owner, admin, hr, lead, member
  invited_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ
);

-- Subscriptions & Usage
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  plan TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  stripe_subscription_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ
);

CREATE TABLE usage_records (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  type TEXT NOT NULL, -- interview, cv_parse, jd_generate
  count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Email Templates
CREATE TABLE email_templates (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  type TEXT NOT NULL, -- invitation, reminder, completion, rejection
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false
);

-- CV Scores (separate from interview scores)
CREATE TABLE cv_scores (
  id UUID PRIMARY KEY,
  candidate_id UUID REFERENCES candidates(id),
  job_id UUID REFERENCES jobs(id),
  technical_score INTEGER,
  experience_score INTEGER,
  project_relevance_score INTEGER,
  education_score INTEGER,
  soft_signals_score INTEGER,
  total_score INTEGER,
  parsed_cv JSONB,
  scored_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Conclusion

### Để đạt MVP Competitor Parity cần:

1. **Multi-language (i18n)** — Cannot enter US without English
2. **Job Management** — Core entity missing
3. **Pipeline/Kanban** — HR workflow essential
4. **Candidate Management** — Track across interviews
5. **Email Automation** — Cannot notify candidates
6. **Settings & Team** — Cannot invite users
7. **Billing** — Cannot charge customers

### Unique Advantages (đã có hoặc sắp có):

1. ✅ **Live AI Video Interview** — No one else has this
2. ❌ **JD Writer** — Need to build (Phase 2)
3. ❌ **Anti-cheat/Integrity** — Need to build (Phase 2)
4. ❌ **Knowledge Base** — Need to build (Phase 3)

### Recommended Focus:

**Tuần 1-8:** Ship Phase 1 (MVP Parity)  
**Tuần 9-14:** Ship Phase 2 (Competitive Advantage)  
**Tuần 15+:** Ship Phase 3 based on customer feedback

---

*Analysis by Mary (Business Analyst) via BMAD workflow*
