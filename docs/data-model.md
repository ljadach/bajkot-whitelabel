# Model danych AITutor

Pragmatyczna analiza schematu Convex z perspektywy seniora.

## TL;DR

Aplikacja ma **24 tabele** podzielone na 7 domen:
- **Core flow** (userProfiles, courses, courseDocuments, sessionTokens)
- **Gamifikacja** (exercises, exerciseSubmissions, userPoints)
- **Progress tracking** (chapterProgress, activityLog)
- **Learning instruments** (learnerArtifacts)
- **Organizacje** (organizations, organizationMembers, organizationInvites)
- **Content pipeline** (pipelineVideos, videoSegments, knowledgeCorpora, adminConfig, adminAuditLog)
- **Lead capture** (leads, contactSubmissions)

Plus tabele pomocnicze: config, rateLimits, llmLogs, backendLogs.

## Architektura: XML jako źródło prawdy

**To jest najciekawsza decyzja architektoniczna.**

Profil użytkownika (`userProfiles.profileXml`) to XML - nie JSON, nie relacyjne pola. LLM generuje i modyfikuje ten XML bezpośrednio podczas intake. Struktura:

```xml
<profile version="1.0">
  <tools><tool>ChatGPT</tool><tool>Claude</tool></tools>
  <role>Product Manager</role>
  <seniority>Senior</seniority>
  <artifacts><artifact>prezentacje</artifact></artifacts>
  <needs><need>lepsze prompty</need></needs>
  <skillsSelfReport prompting="3" evaluation="2" />
  <constraints time_per_week="5h" language="pl" />
</profile>
```

**Dlaczego XML?**
- LLM lepiej radzi sobie z XML niż z JSON (mniej halucynacji z cudzysłowami)
- Łatwiejsze partial updates - możesz podmienić jeden tag
- Struktura jest semi-schematyczna - nowe pola bez migracji

**Konsekwencja:** Pole `profileState` to JSON derivowany z XML (one-way mapping). UI czyta JSON, ale source of truth to XML.

## Główne tabele

### userProfiles - serce aplikacji

```
userProfiles
├── clerkUserId (string) - identyfikator z Clerk
├── currentStep (string) - "welcome" → "chat" → "verification" → ... → "complete"
├── chatHistory (array) - historia konwersacji intake
├── profileXml (string) - CANONICAL SOURCE OF TRUTH
├── profileState (string) - JSON cache dla UI
├── skillVerification - wynik testu promptowania
├── inferredAiFluency - AI-wyliczony poziom
├── trainingOutline (array) - karty planu (edytowalne)
├── planOutline (string) - JSON outline
├── planFull (string) - JSON deep guidance
├── assessmentReport (string) - Markdown raport
├── quickTip - wskazówka z Google Search grounding
├── paymentStatus, stripeSessionId - płatności
├── organizationId - opcjonalne powiązanie z org
├── learningStats - totalTimeSpentMinutes, streakDays, etc.
└── toolPreferences - konfiguracja learning instruments (glossator, workbench tabs, etc.)
```

**Obserwacje:**
- Dużo pól `v.optional(v.string())` które są tak naprawdę JSON - to code smell, ale działa
- `trainingOutline` to array obiektów, `planOutline` to JSON string - niespójność
- `skillVerification` ma zarówno `performanceScore` jak i `selfAssessment` - dual-track assessment

**Index:** `by_clerk_user`, `by_organization`

### courseDocuments - generowane podręczniki

```
courseDocuments
├── clerkUserId, profileId - powiązania
├── pageIndex (number) - 0-based, mapuje na planOutline
├── pageTitle (string)
├── status - "pending" | "generating" | "completed" | "failed"
├── handbook - 3 rozdziały (chapter1, chapter2, chapter3)
│   └── każdy: title, content (Markdown), imagePlaceholder
└── error, generatedAt, createdAt
```

**Ciekawe:** `imagePlaceholder` z `model: "google-nano-banana"` - placeholder na przyszłą generację obrazów. Nazwa modelu sugeruje mockowanie.

### chatMessage - struktura wiadomości

```typescript
{
  id: string,
  type: 'question' | 'answer',
  content: string,
  widgetType?: 'single-select' | 'multi-select' | 'likert' | 'free-text',
  options?: string[],
  answer?: string | string[] | number,
  timestamp: number
}
```

To jest dobrze przemyślane - pytania mogą mieć różne widgety UI, odpowiedzi mogą być różnych typów.

## Gamifikacja (Feature 1)

```
exercises ←──────── exerciseSubmissions
    │                      │
    └── courseDocumentId   └── clerkUserId
                           └── exerciseId
                                  │
                                  ▼
                            userPoints (agregat)
```

- Ćwiczenia per rozdział: `prompt_improvement`, `problem_solving`, `reflection`
- Submissions trzymają `score` (0-100) i `pointsAwarded`
- `userPoints` to denormalizowany agregat - totalPoints, exercisesCompleted

**Potencjalny problem:** Brak transakcji w Convex - przy zapisie submission i update userPoints może być race condition. Trzeba to robić w jednej mutacji.

## Progress Tracking (Feature 2)

```
chapterProgress - status per rozdział (not_started → in_progress → completed)
activityLog - event sourcing dla UI (chapter_started, chapter_completed, etc.)
```

Plus `learningStats` zagnieżdżone w `userProfiles` - totalTimeSpentMinutes, streakDays.

**Obserwacja:** `activityLog` to append-only log. Dobry pattern dla analytics, ale będzie rósł bez limitu. Brak widocznego cleanup.

## Organizacje (Feature 3)

Klasyczny multi-tenant:

```
organizations
├── name, slug
├── ownerId (clerkUserId)
└── settings (allowPublicJoin, maxMembers)

organizationMembers
├── organizationId → organizations
├── clerkUserId
├── role: 'admin' | 'manager' | 'member'
└── displayName, joinedAt, invitedBy

organizationInvites
├── email, inviteToken
├── status: 'pending' | 'accepted' | 'expired'
└── expiresAt (7 dni)
```

**Dobrze:** Invite flow z tokenem i expiration. Role-based access.

**Brak:** Nie widzę enforcement ról w kodzie - to pewnie w query/mutation guards.

## Tabele pomocnicze

### rateLimits - sliding window

```
rateLimits
├── clerkUserId
├── actionType ('llm_call', 'profile_update', etc.)
├── calls (array timestamps)
└── windowStart
```

Sliding window w Convex bez TTL - będzie wymagać periodic cleanup.

### llmLogs, backendLogs - debugging

Capture wszystkich LLM calls i console.log. Index by_timestamp dla backendLogs.

**Uwaga:** `llmLogs` ma `sessionId` jako legacy field do migracji. Dług techniczny.

### sessionTokens - URL sharing

```
sessionTokens
├── clerkUserId
├── shareToken (UUID)
├── expiresAt (30 dni)
```

Pozwala dzielić się sesją przez URL bez logowania.

## Courses (multi-course support)

```
courses
├── clerkUserId, profileId - powiązania
├── title, description
├── status - "draft" | "active" | "completed" | "archived"
├── moduleCount (number) - ilość modułów
└── createdAt, updatedAt
```

**Index:** `by_clerk_user`, `by_profile`, `by_clerk_user_and_status`

courseDocuments ma opcjonalny `courseId` → courses (backward-compatible).

## Content Pipeline (Admin)

```
pipelineVideos
├── fileName, fileHash - dedup
├── sourceUrl, googleDriveFileId - źródło
├── durationSeconds, fileSizeBytes
├── status - "new" | "processing" | "processed" | "failed"
├── toolDetected, uiVersion - co LLM wykrył w wideo
├── cloudflareStreamUid - Cloudflare Stream
└── addedBy, processedAt, createdAt

videoSegments
├── videoId → pipelineVideos
├── startSeconds, endSeconds
├── description - co się dzieje w segmencie
├── metadata (JSON) - clicks, UI elements
├── enabled (boolean) - toggle do corpus
├── tags (array) - redacted, check_again, unsure, custom
└── order, createdAt

knowledgeCorpora
├── version, name
├── videoIds (array) - źródłowe wideo
├── tagFilter {mode, tags} - filtr segmentów
├── segmentCount
├── content (string) - merged YAML-like corpus
├── segments (JSON) - structured CorpusSegment[] dla preselection
└── createdBy, createdAt

adminConfig
├── key, value
└── updatedBy, updatedAt

adminAuditLog
├── actor - clerkUserId
├── action - 'config.set', 'video.add', etc.
├── target, details (JSON)
└── timestamp
```

## Learning Instruments (Lem Parchment)

```
learnerArtifacts
├── clerkUserId, courseDocumentId, courseId
├── chapterNumber (1-3, or 0 for module-level tools)
├── toolId - glossator, skeletonKey, contrapositor, timeBridge, conceptRadar, reflectionGate
├── content (JSON) - payload per tool
├── score (0-100), feedback
└── createdAt, updatedAt
```

**Index:** `by_user_document`, `by_user_document_tool`, `by_user_and_course`

## Lead Capture

```
leads
├── name, email, phone, organization, role
├── message (optional)
├── segment - "business" | "edu" | "executive"
├── language, createdAt

contactSubmissions
├── name, email
├── inquiryType - "enterprise_sales" | "technical_support" | "partnerships" | "press_media" | "general"
├── question, language, createdAt
```

## Co działa dobrze

1. **XML jako canonical source** - nieoczywiste, ale pragmatyczne dla LLM workflow
2. **Dual-track skill assessment** - self-report + performance test
3. **Incremental content generation** - courseDocuments generowane per page
4. **Event sourcing w activityLog** - dobre dla analytics i UI progress
5. **Indexes na wszystkich query patterns** - widać że ktoś myślał

## Co pachnie

1. **JSON strings zamiast obiektów** - `planOutline`, `planFull`, `profileState` to stringified JSON. Tracisz type safety i query możliwości.

2. **Brak soft delete** - permanentne usuwanie. Dla RODO ok, ale utrudnia debugging.

3. **`google-nano-banana`** - hardcoded mock model name. Tech debt czekający na cleanup.

4. **Inconsistent field naming** - `clerkUserId` vs `ownerId` (który też jest clerkUserId).

5. **No versioning na handbook** - jeśli regenerujesz, tracisz poprzednią wersję.

6. **activityLog bez retention** - będzie rósł w nieskończoność.

## Relacje (ERD tekstowy)

```
userProfiles ──1:N──→ courses ──1:N──→ courseDocuments ──1:N──→ exercises
     │                                      │                      │
     │                                      ├──1:N──→ chapterProgress
     │                                      │
     │                                      └──1:N──→ learnerArtifacts
     │
     └────────────────────────────────────────────→ exerciseSubmissions
                                                   │
                                                   ▼
                                              userPoints

userProfiles ──N:1──→ organizations ──1:N──→ organizationMembers
                           │
                           └──1:N──→ organizationInvites

pipelineVideos ──1:N──→ videoSegments ──N:M──→ knowledgeCorpora

leads (standalone)     contactSubmissions (standalone)
```

## Podsumowanie

Model jest **pragmatyczny, nie piekny**. Widac iteracyjny rozwoj — nowe features doklejane do istniejacej struktury. XML-as-source-of-truth to odwazna decyzja, ktora sie oplaca przy LLM workflows.

24 tabele, 7 domen, 3 warstwy (core flow, content pipeline, learning instruments).

Najwieksze ryzyka:
- JSON-in-strings ogranicza query mozliwosci
- Brak cleanup dla logow i rate limits
- Race conditions przy aktualizacji userPoints
- `learnerArtifacts.content` to kolejny JSON-in-string (payload per tool)

Ale generalnie — dziala, jest zrozumiale, ma sensowne indexy.
