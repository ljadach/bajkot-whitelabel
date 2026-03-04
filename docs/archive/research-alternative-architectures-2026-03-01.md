# Alternative Architectures for Personalized AI Course Generation

**Date:** 2026-03-01
**Context:** AITutor currently uses a linear LLM pipeline: intake -> profile XML -> assessment -> playbook outline -> handbook generation. This report evaluates alternative architectures for generating personalized AI training courses.

---

## 1. RAG-Based Course Generation

### How It Works

Instead of generating course content purely from LLM context, a RAG approach embeds a corpus of educational materials (video transcripts, articles, exercises, reference docs) into a vector database. When generating content for a specific user profile, the system retrieves the most relevant chunks and uses them as context for LLM generation.

### Architecture

```
User Profile (XML) --> Embedding query
                          |
                    Vector DB Search
                          |
                  Top-K relevant chunks
                          |
              LLM generates course content
              (grounded in retrieved material)
```

### Vector Database Options

| Database                 | Type              | Strengths                                                                                                                     | Weakness                                 | Pricing                   |
| ------------------------ | ----------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------------- |
| **Convex Vector Search** | Built-in          | Zero infra overhead, namespaces for per-user isolation, importance weighting, native integration with existing Convex backend | Smaller ecosystem, less mature filtering | Included in Convex plan   |
| **Pinecone**             | Managed           | Sub-50ms queries, auto-scaling, Pinecone Assistant bundles chunking+embedding+search+reranking                                | Vendor lock-in, cost scales with volume  | Pay-per-use               |
| **Qdrant**               | Self-hosted/Cloud | Written in Rust (fast), strong metadata filtering, hybrid scoring                                                             | Self-hosting complexity                  | Open-source + cloud tiers |
| **Weaviate**             | Self-hosted/Cloud | Hybrid search (text + vector) built-in, modular LLM plugins                                                                   | Heavier resource usage                   | Open-source + cloud tiers |

### Coherence Problem

RAG's fundamental weakness for course generation: retrieved chunks come from different sources with different styles, levels, and assumptions. A chapter built from 15 different chunks will feel like a patchwork.

**Mitigations:**

- Post-retrieval LLM rewriting pass to unify voice and flow
- Hierarchical RAG: first retrieve at topic level, then at detail level
- Pre-chunking with pedagogical metadata (difficulty, prerequisites, learning objectives)
- Using RAG for _facts and examples_ while generating _narrative and structure_ from LLM

### Relevance to AITutor

**High relevance.** We already have a video corpus pipeline producing timestamped segments with descriptions and metadata. These segments are natural RAG candidates. The Convex RAG component (`@convex-dev/rag`) would integrate with zero infrastructure changes.

**Practical path:** Embed video segment descriptions + handbook content into Convex vector search. During handbook generation, retrieve segments matching the user's profile (tools, role, skill level) and feed them as grounding context. This replaces the current `loadAndPreselectCorpus` approach with semantic matching instead of tag-based filtering.

### Verdict

| Dimension                 | Rating                                                  |
| ------------------------- | ------------------------------------------------------- |
| Implementation complexity | **Low-Medium** (especially with Convex RAG component)   |
| Quality improvement       | **Medium** (better grounding, but coherence risk)       |
| Personalization depth     | **Medium** (profile-to-content matching via embeddings) |
| Maintenance burden        | **Low** (corpus auto-updates as segments are added)     |

---

## 2. Graph-Based Knowledge Modeling

### How It Works

Model the domain as a knowledge graph where nodes are concepts/skills and edges represent relationships (prerequisites, related-to, part-of, leads-to). User profile maps to a subgraph. Course generation becomes a graph traversal problem: find the optimal path from current state to target state.

### Architecture

```
Domain Knowledge Graph
  ├── Concepts (nodes): "Prompt Engineering", "Chain of Thought", "RAG"
  ├── Prerequisites (edges): "RAG" requires "Embeddings"
  ├── Skill levels (node attributes): beginner/intermediate/advanced
  └── Content mappings: concept -> video segments, exercises, readings

User Profile --> Map to graph position (known concepts, target concepts)
                    |
            Graph traversal (shortest path / optimal learning path)
                    |
            Ordered concept sequence
                    |
            LLM generates content for each concept
            (respecting prerequisites and user level)
```

### Research Frameworks

**FOKE (Forest of Knowledge and Education)** from Stanford-affiliated research introduces:

1. Hierarchical "knowledge forest" for structured domain representation
2. Multi-dimensional user profiling for learner modeling
3. Interactive prompt engineering for tailored learning guidance

**CourseKG** structures course information into knowledge graphs with precision teaching support.

**Squirrel AI** decomposes curricula into 10,000+ nano-level knowledge points with prerequisite graphs, using a Large Adaptive Model (LAM) with three layers: application, model, and data.

### Implementation Options

| Tool                       | Approach                                                   | Complexity              |
| -------------------------- | ---------------------------------------------------------- | ----------------------- |
| **Neo4j**                  | Full graph database, Cypher queries, mature ecosystem      | High (separate infra)   |
| **Custom graph in Convex** | Store nodes/edges as Convex documents, traverse in actions | Medium (no new infra)   |
| **LLM-generated graph**    | Have LLM build the prerequisite graph from course outline  | Low (but less reliable) |

### Custom Graph in Convex

A lightweight approach: define two tables (`knowledgeNodes` and `knowledgeEdges`) in the Convex schema. Nodes store concept name, description, difficulty level, mapped content IDs. Edges store relationship type (prerequisite, related, part-of). Graph traversal happens in Convex actions using topological sort.

This avoids Neo4j entirely while getting 80% of the value.

### Relevance to AITutor

**Medium-High relevance.** The current playbook generates a flat list of 5 cards (pages). A knowledge graph would:

- Ensure prerequisite ordering (don't teach RAG before explaining embeddings)
- Enable branching paths (different routes for beginners vs. advanced users)
- Power a "what to learn next" recommendation engine
- Map video segments to concepts for precise content matching

The AI tools domain is well-suited to graph modeling: tools have clear relationships, techniques build on each other, and proficiency levels are hierarchical.

### Verdict

| Dimension                 | Rating                                                |
| ------------------------- | ----------------------------------------------------- |
| Implementation complexity | **Medium** (custom Convex graph) to **High** (Neo4j)  |
| Quality improvement       | **High** (proper prerequisite ordering, no gaps)      |
| Personalization depth     | **High** (path through graph is unique per profile)   |
| Maintenance burden        | **Medium** (graph needs curation, but LLM can assist) |

---

## 3. Hybrid Pipeline Architectures

### 3A. Multi-Agent Review/Critique Loops

Instead of a single LLM call generating content, use multiple specialized agents:

```
Author Agent --> Draft content
                    |
Reviewer Agent --> Critique (accuracy, pedagogy, level-appropriateness)
                    |
Editor Agent --> Revise based on critique
                    |
Quality Gate --> Accept or loop back
```

Research shows this "peer review" pattern significantly improves output quality. The CodeCoR framework demonstrated that self-reflection scoring between generation and review stages creates effective circular feedback.

**For AITutor:** The handbook generation step (`generateHandbook`) could use this pattern:

1. **Planner agent**: outlines chapter structure from profile + corpus
2. **Writer agent**: generates content
3. **Pedagogy reviewer**: checks learning science alignment (Bloom's taxonomy progression, cognitive load)
4. **Style reviewer**: checks brand voice, formatting, engagement level
5. **Editor**: synthesizes reviews, revises

**Cost:** 3-5x LLM calls per chapter. At current scale, manageable. Latency increases significantly.

### 3B. Template + LLM Customization

Pre-define content templates with structural slots. LLM fills slots with personalized content rather than generating from scratch.

```
Template: "Chapter: {{TOOL_NAME}} for {{ROLE}}"
  - Section 1: What is {{TOOL_NAME}}? (200 words, {{LEVEL}} language)
  - Section 2: How {{ROLE}} professionals use {{TOOL_NAME}}
  - Section 3: Hands-on exercise matching {{ARTIFACTS}}
  - Section 4: Common mistakes at {{SKILL_LEVEL}} level

LLM fills each section independently, guided by template constraints.
```

**Advantages:** Consistent structure, faster generation, easier quality control.
**Disadvantages:** Less creative, can feel formulaic if templates are too rigid.

**For AITutor:** The current handbook prompt already has implicit templates (chapter structure mandates). Making them explicit and modular would improve consistency without major architectural change.

### 3C. Pre-Generated Content Pool + LLM Selection/Adaptation

Generate a large pool of content variants offline. At request time, LLM selects and adapts rather than generating from scratch.

```
Offline: Generate 50 lesson variants for "Prompt Engineering"
  - 5 difficulty levels x 5 role types x 2 content styles

Online: LLM selects best-match variant, adapts tone/examples for specific user

Result: 90% pre-generated (fast, tested) + 10% LLM-adapted (personalized)
```

**This is Google's "Learn Your Way" approach** at its core: transform existing textbook content into multiple representations (immersive text, slides, audio, mind maps, quizzes) using multi-step agentic workflows. Google tested this with 60 high school students and found 11% better retention compared to static content.

### Relevance to AITutor

**3A (Multi-agent):** High value for quality but adds latency and cost. Best applied selectively to high-stakes content (assessment report, final handbook) rather than every generation step.

**3B (Template):** Quick win. The current prompt engineering is already halfway there. Formalizing templates would reduce hallucination and improve consistency.

**3C (Content pool):** Most interesting for scale. Pre-generate handbook variants for common profile clusters, then adapt. Reduces per-user generation time from minutes to seconds.

### Verdict

| Variant              | Complexity     | Quality Gain | Latency Impact             |
| -------------------- | -------------- | ------------ | -------------------------- |
| Multi-agent review   | Medium         | High         | +200-400%                  |
| Template + LLM       | Low            | Medium       | -30% (less to generate)    |
| Content pool + adapt | High (upfront) | Medium-High  | -80% (mostly pre-computed) |

---

## 4. Adaptive Learning Systems

### Industry Approaches

**Duolingo:**

- Micro-lessons with spaced repetition
- Birdbrain ML model predicts probability of correct answer
- Content difficulty adjusts in real-time based on error patterns
- 41% revenue increase in 2025 attributed to AI personalization (Duolingo Max)

**Khan Academy (Khanmigo):**

- GPT-4 based tutor with Socratic method guardrails
- Does NOT give answers directly; asks guiding questions
- Personalization via "Khanmigo Interests" (maps user passions to teaching examples)
- Grew from 68K to 700K users in one year

**Squirrel AI:**

- Decomposes curricula into 10,000+ nano-level knowledge points
- Large Adaptive Model (LAM): 3-layer architecture (data, model, application)
- MCM graph: Mode of Thinking, Capability, Methodology
- 24 million students, 10 billion learning behavior data points
- Identifies specific conceptual gaps and builds personalized pathways in real-time

### Spaced Repetition Integration

**LECTOR algorithm** (2025): LLM-Enhanced Concept-based Test-Oriented Repetition.

- Extends classical forgetting curve with semantic interference effects
- LLM assesses semantic similarity between concepts (confusion risk)
- Achieved 90.2% success rate, beating SSP-MMC baseline (88.4%)
- Tracks per-learner profile: success rate, learning speed, retention, semantic sensitivity

**For AITutor:** The exercise submission system (`exerciseSubmissions` table) already tracks scores. Adding spaced repetition scheduling:

1. After exercise completion, schedule review based on score
2. Use LECTOR-style semantic similarity to group related concepts
3. Generate review exercises that target weak areas
4. Progressively increase difficulty as mastery grows

### Dynamic Difficulty Adjustment

The current system has static difficulty (set during intake via self-report + prompt scoring). Adaptive systems continuously adjust:

```
Exercise score < 60% --> Simplify next content, add scaffolding
Exercise score 60-80% --> Maintain level, vary examples
Exercise score > 80% --> Increase complexity, reduce scaffolding
```

This maps directly to AITutor's `chapterProgress` + `exerciseSubmissions` data.

### Relevance to AITutor

**High relevance, phased implementation.**

Phase 1: Use exercise scores to adjust subsequent chapter difficulty (low effort, existing data).
Phase 2: Add spaced repetition scheduling for review exercises (medium effort).
Phase 3: Real-time knowledge state tracking with concept-level mastery (high effort, needs knowledge graph).

### Verdict

| Feature                           | Complexity | Impact    | Data Required                   |
| --------------------------------- | ---------- | --------- | ------------------------------- |
| Score-based difficulty adjustment | Low        | Medium    | exerciseSubmissions (exists)    |
| Spaced repetition scheduling      | Medium     | High      | New scheduling table + cron     |
| Knowledge state tracking          | High       | Very High | Knowledge graph + behavior logs |
| Semantic confusion detection      | Medium     | Medium    | LLM calls on exercise pairs     |

---

## 5. Production Examples & Lessons Learned

### Google "Learn Your Way" (2025)

**Architecture:** LearnLM (pedagogy-infused model on Gemini 2.5 Pro) + multi-step agentic pipelines.

Key design choices:

- Two-step generation: personalize content, then transform into multiple modalities
- Some outputs (mind maps, timelines) use Gemini directly; others (narrated slides) use elaborate multi-agent pipelines
- Fine-tuned a dedicated model for educational illustrations (general image models failed)
- Tested with 60 students: 11% better retention vs. static content

**Lesson:** General-purpose models need pedagogical fine-tuning. Multi-modal output requires specialized sub-pipelines, not a single model call.

### Squirrel AI (Production since 2014)

**Architecture:** 3-layer LAM (data, model, application) + nano-level knowledge graph.

Key design choices:

- Decompose curriculum into 10,000+ atomic knowledge points
- Track 10 billion learning behaviors across 24 million students
- MCM graph captures not just knowledge but thinking modes and methodologies
- Content is expert-created but AI-adapted and AI-sequenced

**Lesson:** The graph granularity matters enormously. Coarse-grained graphs (50 topics) provide marginal benefit. Fine-grained graphs (10,000+ points) enable genuine personalization. But they require expert curation at scale.

### Khanmigo (Production since 2023)

**Architecture:** GPT-4 + custom prompts + content-specific guardrails.

Key design choices:

- Socratic method enforced via prompt engineering (never gives direct answers)
- Personalization through interest mapping, not content generation
- Existing Khan Academy content library serves as the knowledge base
- AI adapts _interaction style_, not the content itself

**Lesson:** You don't always need to generate content. Adapting _how_ existing content is presented and _how_ the tutor interacts can be more effective and much cheaper.

### Magic EdTech Agentic Architecture (2025)

**Architecture:** Three-layer agentic system:

1. Intelligent Learning Experience Layer (learner-facing)
2. Agentic AI Core (reasoning center)
3. Enterprise Systems Layer (data integration)

**Lesson:** Separating the interaction layer from the reasoning layer from the data layer enables independent scaling and testing.

### AWS Education RAG (Production reference)

**Architecture:** Transcribe lecture videos -> chunk transcripts -> embed in vector DB -> RAG for Q&A, summaries, quizzes.

**Lesson:** Video-to-text-to-embedding pipeline is proven and works well. This is essentially what AITutor's segment pipeline already does, minus the embedding step.

---

## 6. Comparative Analysis for AITutor

### Current Architecture

```
Intake Chat --> Profile XML --> Assessment Report --> Playbook Outline --> Handbook Chapters
     |              |                                       |                    |
  LLM call      LLM call                              LLM call             LLM call (x chapters)
```

Linear pipeline. Each step depends on previous output. No feedback loops. No retrieval. Profile XML is the only personalization vector.

### Recommended Evolution Path

Based on this research, the highest-impact changes ordered by effort/reward ratio:

#### Tier 1: Quick Wins (1-2 weeks each)

1. **Formalize handbook templates** (3B). Make chapter structure explicit and modular. Reduces hallucination, improves consistency. Minimal code change.

2. **Score-based difficulty adjustment**. Use `exerciseSubmissions` scores to adjust next chapter's complexity level. Add a `difficultyModifier` field to chapter generation context.

3. **Convex RAG for corpus matching**. Replace tag-based `loadAndPreselectCorpus` with semantic search via `@convex-dev/rag`. Embed video segment descriptions. Profile-to-content matching via embeddings instead of exact tag matches.

#### Tier 2: Medium Effort, High Impact (2-4 weeks each)

4. **Lightweight knowledge graph in Convex**. Two new tables: `knowledgeNodes`, `knowledgeEdges`. Model AI tool concepts and prerequisites. Use topological sort for learning path generation. Map existing video segments to nodes.

5. **Multi-agent review for handbooks**. Add a critique/revision loop to `generateHandbook`. Writer -> Reviewer -> Editor. 3x cost per chapter but measurably better output. Can be toggled via feature flag.

6. **Spaced repetition for exercises**. New `reviewSchedule` table. After exercise completion, schedule review at intervals based on score. Generate review exercises using LLM with LECTOR-style semantic awareness.

#### Tier 3: Strategic Investment (1-2 months)

7. **Pre-generated content pool**. Offline-generate handbook variants for top 20 profile clusters (role x tool x level). At request time, select closest variant and adapt. Reduces per-user latency from minutes to seconds.

8. **Full adaptive learning loop**. Continuous knowledge state tracking. Real-time difficulty adjustment. Requires knowledge graph (Tier 2.4) + exercise data + new learner state model.

### Architecture Comparison Matrix

| Architecture            | Quality     | Personalization | Latency  | Cost             | Complexity | Best For                         |
| ----------------------- | ----------- | --------------- | -------- | ---------------- | ---------- | -------------------------------- |
| Current linear pipeline | Medium      | Medium          | Medium   | Low              | Low        | MVP, proof of concept            |
| + RAG retrieval         | Medium-High | Medium-High     | Medium   | Low-Medium       | Low-Medium | Grounding content in real corpus |
| + Knowledge graph       | High        | High            | Medium   | Low              | Medium     | Proper learning paths            |
| + Multi-agent review    | High        | Medium          | High     | High             | Medium     | Content quality                  |
| + Template system       | Medium      | Medium          | Low      | Low              | Low        | Consistency at scale             |
| + Content pool          | Medium-High | Medium          | Very Low | Medium (upfront) | High       | High-traffic production          |
| + Adaptive learning     | Very High   | Very High       | Low      | Medium           | High       | Long-term engagement             |
| Full hybrid (all above) | Very High   | Very High       | Low      | High             | Very High  | Market leader                    |

---

## 7. Recommendation

The biggest insight from this research: **the winning systems don't pick one architecture -- they layer them.**

Squirrel AI uses knowledge graphs + adaptive algorithms + pre-built content. Google Learn Your Way uses multi-agent pipelines + multimodal generation + fine-tuned sub-models. Khanmigo uses existing content + LLM interaction adaptation + prompt engineering.

For AITutor's current stage (post-MVP, pre-scale), the optimal path is:

1. **Start with RAG** (Convex native, low friction, immediate quality improvement for video-enhanced content)
2. **Add templates** (formalize what's already implicit in prompts)
3. **Build the knowledge graph** (this becomes the backbone for everything else)
4. **Layer adaptive learning on top** (uses graph + exercise data)

The knowledge graph is the single most important architectural investment. Without it, personalization is shallow (profile matching). With it, personalization becomes structural (unique learning paths through a concept space).

---

## Sources

- [Personalized Learning Path Recommendation Based on Knowledge Graphs (Survey)](https://www.mdpi.com/2079-9292/15/1/238)
- [FOKE: Foundation Models + Knowledge Graphs for Education](https://arxiv.org/html/2405.03734v1)
- [LLM-Assisted Knowledge Graph for Higher Education](https://arxiv.org/html/2501.12300v1)
- [LECTOR: LLM-Enhanced Spaced Repetition](https://arxiv.org/html/2508.03275v1)
- [Google "Learn Your Way" Research Blog](https://research.google/blog/learn-your-way-reimagining-textbooks-with-generative-ai/)
- [Towards an AI-Augmented Textbook (Paper)](https://arxiv.org/abs/2509.13348)
- [Convex RAG Component](https://docs.convex.dev/agents/rag)
- [Convex RAG GitHub](https://github.com/get-convex/rag)
- [Architectures for Building Agentic AI](https://arxiv.org/pdf/2512.09458)
- [Multi-Agent LLM Systems Survey](https://dl.acm.org/doi/10.1145/3712003)
- [AI-Driven Decision Support for Online Learning](https://www.mdpi.com/1999-5903/17/9/383)
- [Knowledge Graph + LLM Programming Learning System](https://www.sciencedirect.com/science/article/pii/S2666920X25001663)
- [Agentic AI Workflows in Education (Magic EdTech)](https://www.magicedtech.com/blogs/building-intelligent-learning-systems-agentic-ai-workflows-in-action/)
- [AWS Education RAG Architecture](https://aws.amazon.com/blogs/publicsector/generative-ai-education-building-ai-solutions-using-course-lecture-content/)
- [Vector Database Comparison (Pinecone vs Qdrant vs Weaviate)](https://xenoss.io/blog/vector-database-comparison-pinecone-qdrant-weaviate)
- [Top Vector Databases for RAG](https://research.aimultiple.com/vector-database-for-rag/)
- [2026 Guide to Agentic Workflow Architectures](https://www.stack-ai.com/blog/the-2026-guide-to-agentic-workflow-architectures)
- [AI-Powered LMS Platforms 2026](https://www.cypherlearning.com/blog/business/top-7-ai-powered-lms-platforms-to-watch-in-2026)
- [Deep Knowledge Tracing for Personalized Learning](https://www.nature.com/articles/s41598-025-10497-x)
- [CourseKG: Educational Knowledge Graph](https://www.mdpi.com/2076-3417/14/7/2710)
