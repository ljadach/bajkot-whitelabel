# Research: Claude Agent SDK & Agent-Based Course Generation

Data: 1 marca 2026
Kontekst: Rozpoznanie architektury agentowej do budowy pipeline'u generowania spersonalizowanych kursów AI

---

## 1. Claude Agent SDK

### Czym jest

Claude Agent SDK (dawniej Claude Code SDK) to biblioteka programistyczna w Pythonie i TypeScript, ktora daje programistyczny dostep do tego samego silnika agentowego, ktory napedza Claude Code. Agent dostaje komputer, a nie tylko prompt -- ma bezposredni dostep do terminala, systemu plikow i internetu.

Petla agenta: **zbierz kontekst -> podejmij dzialanie -> zweryfikuj wynik -> powtorz**.

### Instalacja i quickstart

```bash
# TypeScript
npm install @anthropic-ai/claude-agent-sdk

# Python
pip install claude-agent-sdk
```

```python
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions

async def main():
    async for message in query(
        prompt="Find and fix the bug in auth.py",
        options=ClaudeAgentOptions(allowed_tools=["Read", "Edit", "Bash"]),
    ):
        print(message)

asyncio.run(main())
```

### Wbudowane narzedzia

| Narzedzie     | Co robi                                              |
|---------------|------------------------------------------------------|
| **Read**      | Czyta dowolny plik w working directory               |
| **Write**     | Tworzy nowe pliki                                    |
| **Edit**      | Precyzyjne edycje istniejacych plikow                |
| **Bash**      | Uruchamia komendy terminala, skrypty, git             |
| **Glob**      | Szuka plikow po wzorcu (`**/*.ts`, `src/**/*.py`)     |
| **Grep**      | Przeszukuje zawartosc plikow regexem                 |
| **WebSearch** | Szuka w internecie (aktualne informacje)              |
| **WebFetch**  | Pobiera i parsuje zawartosc stron www                |
| **AskUserQuestion** | Zadaje uzytkownikowi pytania wyjasniajace       |
| **Task**      | Deleguje prace do subagentow                         |

### Kluczowe cechy

- **Hooki** -- callbacki na `PreToolUse`, `PostToolUse`, `Stop`, `SessionStart`, `SessionEnd` itd. Pozwalaja logowac, blokowac, transformowac zachowanie agenta.
- **Sesje** -- mozna wznawiaj sesje (`resume: sessionId`) i forkuwac je do eksploracji alternatyw.
- **Permission modes** -- `acceptEdits` (auto-akceptuj edycje plikow), `bypassPermissions` (pelny autopilot), default (pytaj o pozwolenie).
- **Agent Skills** -- pakiety `.claude/skills/SKILL.md` w formacie YAML+Markdown. Open standard (agentskills.io). Zaadoptowane przez VS Code, Cursor, GitHub, Goose, Amp. Progressive disclosure -- zajmuja malo tokenow w kontekscie az nie sa potrzebne.
- **MCP** -- pelna integracja z Model Context Protocol (200+ serwerow).
- **Structured output** -- gwarantowany JSON zgodny z JSON Schema (Zod/Pydantic).

Zrodla:
- [Agent SDK overview](https://platform.claude.com/docs/en/agent-sdk/overview)
- [Agent SDK quickstart](https://platform.claude.com/docs/en/agent-sdk/quickstart)
- [GitHub: claude-agent-sdk-typescript](https://github.com/anthropics/claude-agent-sdk-typescript)
- [GitHub: claude-agent-sdk-python](https://github.com/anthropics/claude-agent-sdk-python)
- [GitHub: claude-agent-sdk-demos](https://github.com/anthropics/claude-agent-sdk-demos)

---

## 2. Tool Use w agentach Claude

### Co agent moze robic

Agent moze uzyc **wszystkich** wbudowanych narzedzi wymienionych wyzej. Kluczowe dla generowania kursow:

1. **WebSearch + WebFetch** -- agent moze sam szukac w internecie, pobierac strony i wyciagac informacje. To rozwazuje problem "aktualnej wiedzy" z naszego audytu.
2. **Read/Write/Edit** -- agent moze budowac pliki (np. Markdown handbooki) bezposrednio w systemie plikow.
3. **Bash** -- agent moze uruchamiac skrypty walidacyjne, lintery, testy.
4. **Grep/Glob** -- agent moze przeszukiwac wygenerowane wczesniej pliki (np. szukac duplikatow, sprawdzac spojnosc).

### Custom tools

Mozna dodac wlasne narzedzia:
- Przez **MCP servery** (standardowy protokol)
- Przez **hooki** (PreToolUse/PostToolUse do walidacji)
- Przez **pluginy** (programmatyczna rozszerzalnosc)

Zrodla:
- [Anthropic engineering: advanced tool use](https://www.anthropic.com/engineering/advanced-tool-use)
- [Agent Skills overview](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)

---

## 3. Sandboxed Execution

### Opcje sandboxowania

Agent SDK wspiera wiele podejsc do izolacji:

| Podejscie                          | Opis                                                                 |
|------------------------------------|----------------------------------------------------------------------|
| **OS-level sandbox (natywny)**     | Linux bubblewrap, macOS seatbelt. Izolacja systemu plikow + sieci.   |
| **Docker/gVisor/Firecracker**      | Rekomendacja Anthropic dla multi-tenant: per-task ephemeral container. |
| **Claude Code on the Web**         | Izolowany sandbox w chmurze, pelny dostep do serwera.                |
| **Cloudflare Sandbox**             | Cloudflare Workers + Claude Agent SDK.                               |
| **Vercel Sandbox**                 | Sandbox runtime z Vercel.                                            |
| **Daytona**                        | Dev environment sandbox dla agentow.                                 |

### Filesystem isolation

- Agent ma read+write do working directory i jego podkatalogow
- Read-only do reszty systemu (z wylaczeniami np. `/etc/shadow`)
- Siec ograniczona do approved destinations

### Sandbox runtime (open source)

Anthropic opublikowal `sandbox-runtime` jako open-source npm package. Redukuje permission prompts o 84%.

**Kluczowe dla nas:** Agent moze pracowac w sandboxie, budujac pliki (handbooki, cwiczenia, metadane) w izolowanym katalogu, z dostepem do internetu (web search) ale bez ryzyka naruszenia systemu.

Zrodla:
- [Anthropic engineering: Claude Code sandboxing](https://www.anthropic.com/engineering/claude-code-sandboxing)
- [Sandboxing docs](https://code.claude.com/docs/en/sandboxing)
- [GitHub: sandbox-runtime](https://github.com/anthropic-experimental/sandbox-runtime)
- [Cloudflare Sandbox + Agent SDK](https://developers.cloudflare.com/sandbox/tutorials/claude-code/)
- [Vercel Sandbox + Agent SDK](https://vercel.com/kb/guide/using-vercel-sandbox-claude-agent-sdk)

---

## 4. Multi-Agent Orchestration

### Subagenci (oficjalne SDK)

Subagenci to lightweight workers ktore raportuja do glownego agenta:

```python
options=ClaudeAgentOptions(
    allowed_tools=["Read", "Glob", "Grep", "Task"],
    agents={
        "code-reviewer": AgentDefinition(
            description="Expert code reviewer for quality and security reviews.",
            prompt="Analyze code quality and suggest improvements.",
            tools=["Read", "Glob", "Grep"],
        )
    },
)
```

- Subagent dostaje wlasny kontekst, narzedzia i prompt
- `parent_tool_use_id` pozwala sledzic ktore wiadomosci naleza do jakiego subagenta
- Glowny agent deleguje przez `Task` tool

### Agent Teams (eksperymentalne)

Wlaczane przez `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`:
- Jeden session jako "team lead" koordynuje prace
- Teammates pracuja niezaleznie w swoich kontekstach
- Moga komunikowac sie bezposrednio miedzy soba
- Roznica vs subagenci: **subagenci** sa szybcy, fokusowani, raportuja do przodu; **teams** wspoldziela ustalenia, kwestionuja sie nawzajem, koordynuja samodzielnie

### Swarm orchestration

Odkryty za feature flagami w styczniu 2026. Pattern "mayor agent" rozbija zadanie i spawnuje wyspecjalizowanych agentow.

**Relevance dla course generation:**

Pipeline 3-agentowy:
1. **Research Agent** -- uzywa WebSearch/WebFetch do zbierania aktualnej wiedzy, buduje "source pack"
2. **Content Agent** -- pisze handbook na podstawie source pack, profilu, planu
3. **QA Agent** -- waliduje output (plan adherence, style, freshness, personalizacja)

Albo 5-agentowy z wiekszym granularity:
1. **Planner** -- tworzy outline z mapowaniem do profilu
2. **Researcher** -- zbiera zrodla per modul
3. **Writer** -- pisze handbooki
4. **Video Curator** -- dobiera segmenty video z korpusu
5. **Quality Gate** -- waliduje calosciowo

Zrodla:
- [Agent teams docs](https://code.claude.com/docs/en/agent-teams)
- [Claude Sub-Agents delegation](https://www.theaistack.dev/p/orchestrating-claude-sub-agents)
- [Shipyard: multi-agent orchestration 2026](https://shipyard.build/blog/claude-code-multi-agent/)

---

## 5. Structured Output i Content Generation

### Structured outputs

SDK gwarantuje output zgodny z JSON Schema:

```typescript
const schema = {
  type: "object",
  properties: {
    chapters: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          content_markdown: { type: "string" },
          key_takeaways: { type: "array", items: { type: "string" } },
          sources: { type: "array", items: { type: "object", properties: {
            url: { type: "string" },
            title: { type: "string" },
            accessed_date: { type: "string" }
          }}}
        },
        required: ["title", "content_markdown"]
      }
    },
    metadata: {
      type: "object",
      properties: {
        plan_alignment: { type: "boolean" },
        tools_referenced: { type: "array", items: { type: "string" } },
        assessment_refs: { type: "array", items: { type: "string" } }
      }
    }
  }
};
```

Kompiluje schema do gramatyki i **ogranicza generowanie tokenow** podczas inferencji. Nie polega na promptingu.

### Long-form content

- Context window: do 1M tokenow (beta, tier 4+)
- Standard: 200K tokenow
- Wystarczajace do generowania handbook'ow z pelnym kontekstem (profil + plan + source pack + style guide + video corpus)

### Sesje i ciaglosc

- `resume: sessionId` pozwala agentowi kontynuowac z pelnym kontekstem
- Moze pamietac pliki odczytane, analizy wykonane, decyzje podjete
- Idealne do pipeline'u: etap 1 tworzy plan, etap 2 (ta sama sesja) pisze treści

Zrodla:
- [Structured outputs in Agent SDK](https://platform.claude.com/docs/en/agent-sdk/structured-outputs)
- [Structured outputs API](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- [Increase output consistency](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/increase-consistency)

---

## 6. Computer Use / Browser Use

### Mozliwosci

- **Claude for Chrome** (sierpien 2025) -- rozszerzenie Chrome do sterowania przegladarka
- **Computer Use API** -- Claude steruje myszka i klawiatura (screenshot-based)
- **Playwright MCP** -- headless browser automation przez MCP server

### Web research w Agent SDK

Bardziej praktyczne niz computer use:
- **WebSearch** -- wbudowane, server-side, szybkie, $10/1000 wyszukiwan
- **WebFetch** -- pobiera i parsuje strony, bez dodatkowych kosztow (tylko tokeny)

**Dla course generation web search + web fetch to wystarczajace.** Computer use jest overkill -- wolniejszy, drozszy, mniej niezawodny.

Zrodla:
- [Web search tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool)
- [Claude for Chrome](https://techcrunch.com/2025/08/26/anthropic-launches-a-claude-ai-agent-that-lives-in-chrome/)
- [Anthropic: computer use](https://www.anthropic.com/news/3-5-models-and-computer-use)

---

## 7. Pricing -- analiza kosztow

### Tabela cen modeli (USD per milion tokenow)

| Model           | Input   | Output   | Batch Input | Batch Output | Cache Read | Cache Write (5m) |
|-----------------|---------|----------|-------------|--------------|------------|------------------|
| Opus 4.6        | $5      | $25      | $2.50       | $12.50       | $0.50      | $6.25            |
| Opus 4.5        | $5      | $25      | $2.50       | $12.50       | $0.50      | $6.25            |
| Sonnet 4.6      | $3      | $15      | $1.50       | $7.50        | $0.30      | $3.75            |
| Haiku 4.5       | $1      | $5       | $0.50       | $2.50        | $0.10      | $1.25            |

### Mechanizmy oszczedzania

1. **Batch API** -- 50% zuzycia na input i output. Asynchroniczne przetwarzanie. Idealne do generowania kursow (nie potrzebujemy real-time).
2. **Prompt caching** -- cache read 0.1x ceny bazowej = 90% oszczednosci. System prompt + style guide + editorial guide moga byc cachowane.
3. **Stacking** -- Batch + Cache = do 95% oszczednosci vs standard.

### Web search pricing

- $10 per 1000 wyszukiwan
- WebFetch: bez dodatkowych kosztow (tylko tokeny)

### Szacunek kosztu per kurs (6 modulow)

Zakladajac Sonnet 4.6, Batch API:

| Etap                    | Input tokens | Output tokens | Koszt          |
|-------------------------|-------------|---------------|----------------|
| Playbook generation     | ~10K        | ~5K           | ~$0.05         |
| Research (6x WebSearch) | ~30K        | ~10K          | ~$0.06 + $0.06 search |
| 6x Handbook generation  | ~120K       | ~60K          | ~$0.63         |
| 6x QA validation        | ~60K        | ~10K          | ~$0.17         |
| 18x Exercise generation | ~90K        | ~45K          | ~$0.47         |
| **Total per course**    |             |               | **~$1.44**     |

Z prompt caching (system prompt ~2K tokenow reused 30+ razy): mozliwe zejscie do ~$1.00/kurs.

Zrodla:
- [Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- [Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)

---

## 8. MCP (Model Context Protocol)

### Czym jest

Open-source standard laczenia aplikacji AI z zewnetrznymi systemami. Host-Client-Server architektura:
- **Host** = aplikacja AI (np. Claude Code, nasz agent)
- **Client** = lacznik MCP
- **Server** = dostawca narzedzi (baza danych, API, przeglądarka)

### Integracja z Agent SDK

```python
options=ClaudeAgentOptions(
    mcp_servers={
        "playwright": {"command": "npx", "args": ["@playwright/mcp@latest"]},
        "github": {"command": "npx", "args": ["@modelcontextprotocol/server-github"]},
    }
)
```

### Relevantne MCP servery dla course generation

| Serwer                 | Uzycie w pipeline                                    |
|------------------------|------------------------------------------------------|
| **Brave Search**       | Alternatywne web search                              |
| **Playwright**         | Browser automation (jesli web search nie wystarczy)   |
| **GitHub**             | Pobieranie danych z repozytoriow (przyklady kodu)    |
| **Filesystem**         | Kontrolowany dostep do systemu plikow                |
| **PostgreSQL/SQLite**  | Zapis wynikow, cache zrodel                          |
| **Custom MCP**         | Wlasny serwer np. do Convex queries, Cloudflare Stream |

### Tool Search

Gdy narzedzia MCP przekraczaja 10% okna kontekstowego, Claude automatycznie wlacza Tool Search -- laduje narzedzia on-demand zamiast preloadowac wszystkie.

Zrodla:
- [MCP official site](https://modelcontextprotocol.io/)
- [MCP in Claude Code](https://code.claude.com/docs/en/mcp)
- [MCP servers registry](https://github.com/modelcontextprotocol/servers)

---

## 9. Inne frameworki agentowe

### Porownanie

| Framework           | Architektura            | Best for                         | Jezyk          | Dojrzalosc |
|---------------------|------------------------|----------------------------------|----------------|------------|
| **Claude Agent SDK** | Agent loop + tools      | Prace z plikami, kodem, web      | Python, TS     | Production |
| **LangGraph**       | Graph-based workflows   | Zlozone orchestracje, routing    | Python, TS     | Production |
| **CrewAI**          | Role-based teams        | Content pipelines, jasne role    | Python         | Production |
| **AutoGen**         | Conversational agents   | Dialog agentow, brainstorming    | Python         | Preview    |
| **Semantic Kernel** | Microsoft Agent Framework | Enterprise, Azure, .NET          | Python, C#     | GA Q1 2026 |

### LangGraph

- Graf stanu z wezlami (agenci) i krawedziami (przejscia)
- Silny w zlozonych orkiestracjach z wieloma decision pointami
- Parallel processing, conditional routing
- Wiecej boilerplate'u ale wieksza kontrola

### CrewAI

- Role-based: Researcher, Writer, Editor pracuja w step-by-step process
- YAML-driven konfiguracja
- Doskonaly do content production pipelines
- Wbudowane wsparcie dla common business workflow patterns

### Microsoft Agent Framework (Semantic Kernel + AutoGen)

- Public preview od pazdziernika 2025
- GA planowane na Q1 2026
- .NET + Python, natywna integracja Azure AI Foundry
- 27K+ stars na GitHubie
- Orkiestracja wielu agentow, shared memory, agent-to-agent communication

### Rekomendacja

Dla naszego use case (content generation pipeline):

**Primary: Claude Agent SDK** -- mamy juz cala architekture na Claude, Agent SDK daje nam natywny dostep do tych samych narzedzi. WebSearch/WebFetch rozwiazuja problem "aktualnej wiedzy". Structured outputs rozwiazuja problem walidacji.

**Complementary: LangGraph** -- jesli potrzebujemy bardziej zlozonego routingu (np. "jesli QA nie przejdzie -> wylij do repair agenta -> jesli nadal nie przejdzie -> eskaluj do czlowieka"). LangGraph nie jest potrzebny na start, ale moze byc warty rozwazenia przy scale'u.

**Nie rekomenduje: CrewAI/AutoGen** -- dodatkowa warstwa abstrakcji, ktora nie daje nam nic czego Agent SDK nie ma. Dodaje complexity bez proporcjonalnej wartosci.

Zrodla:
- [DataCamp: CrewAI vs LangGraph vs AutoGen](https://www.datacamp.com/tutorial/crewai-vs-langgraph-vs-autogen)
- [Turing: AI Agent Frameworks 2026](https://www.turing.com/resources/ai-agent-frameworks)
- [Semantic Kernel Agent Framework](https://learn.microsoft.com/en-us/semantic-kernel/frameworks/agent/)

---

## 10. Agent-Based Content Generation -- przyklady produkcyjne

### Stan rynku

Sektor AI-powered course creation rozwija sie dynamicznie:

- **Open eLMS AI** -- generuje calosciowe kursy z jednego zdania/dokumentu. Redukcja czasu produkcji o 89% bez spadku zaangazowania.
- **DISCO** -- Learning Design Agent generuje moduly, quizy, question banks w minuty. W 2026 integracja z agent orchestration.
- **Mindsmith** -- generative AI + intuitive platform do szybkiego przejscia concept-to-course.

### Wspolne patterny

1. **Single-prompt generation** -- jedno wywolanie LLM tworzy caly modul. Szybkie ale niskiej jakosci.
2. **Pipeline generation** -- wieloetapowy proces (plan -> research -> write -> review). Wolniejszy ale lepszy.
3. **Agent-based generation** -- agent ma autonomie w zbieraniu informacji, pisaniu, walidacji. Najnowsze podejscie.

### Nasze przewagi vs rynek

- **Gleboki profil learner** (intake conversation, skill verification, assessment)
- **Personalizacja na poziomie handbooka** (tools, role, constraints, negative preferences)
- **Video-enhanced content** z realnym korpusu
- **Pipeline z gate'ami jakosci** (wdrazane)

Zrodla:
- [Learning News: AI Agents Course Creation](https://learningnews.com/news/open-elms/2025/how-ai-agents-are-transforming-course-creation-the-one-click-future-of-elearning)
- [DISCO: AI Agents for Education 2026](https://www.disco.co/blog/ai-agents-for-education-2026)
- [eLearning Trendz: AI-Driven Course Creation 2026](https://www.elearningtrendz.com/blog/creating-ai-generated-courses/)

---

## 11. Proponowana architektura agentowa dla AITutor

### Docelowy pipeline

```
                    ┌─────────────────┐
                    │   Orchestrator   │
                    │  (Main Agent)    │
                    └────────┬────────┘
                             │
            ┌────────────────┼────────────────┐
            │                │                │
    ┌───────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐
    │  Research     │  │  Content    │  │  QA Gate    │
    │  Subagent     │  │  Subagent   │  │  Subagent   │
    │              │  │             │  │             │
    │ WebSearch    │  │ Write       │  │ Read        │
    │ WebFetch     │  │ Edit        │  │ Grep        │
    │ Read/Write   │  │ Read        │  │ Bash        │
    └──────────────┘  └─────────────┘  └─────────────┘
```

### Etapy

1. **Orchestrator** otrzymuje: profil XML, assessment, plan outline, editorial guide, video corpus
2. **Research Subagent** per modul:
   - WebSearch dla aktualnych informacji o narzędziach/technikach z planu
   - WebFetch dla oficjalnych dokumentacji
   - Buduje `source_pack.json` z cytowaniami i datami
   - Zapisuje w sandboxie: `./research/{module_id}/source_pack.json`
3. **Content Subagent** per modul:
   - Czyta source_pack + profil + plan + style guide
   - Generuje handbook jako structured output (Markdown + metadata)
   - Zapisuje: `./content/{module_id}/handbook.md` + `metadata.json`
4. **QA Gate Subagent** per modul:
   - Czyta handbook + metadata
   - Uruchamia walidacje (Bash: linter, style checker)
   - Sprawdza: plan adherence, personalization, freshness, style
   - Zwraca: `qa_result.json` z pass/fail + issues
5. **Orchestrator** decyduje:
   - pass -> publikuj modul
   - fail -> wyslij do Content Subagent z feedbackiem QA
   - 3x fail -> eskaluj do czlowieka

### Implementacja z Agent SDK

```python
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions, AgentDefinition

async def generate_course(profile_xml, assessment, plan, style_guide):
    async for message in query(
        prompt=f"""Generate a complete 6-module course.

Profile: {profile_xml}
Assessment: {assessment}
Plan: {plan}
Style Guide: {style_guide}

For each module:
1. Use the researcher agent to gather current sources
2. Use the writer agent to create the handbook
3. Use the qa-gate agent to validate quality
4. If QA fails, retry with the writer agent (max 3 retries)

Write all outputs to ./output/{{module_id}}/""",
        options=ClaudeAgentOptions(
            allowed_tools=["Read", "Write", "Bash", "Glob", "Grep", "Task"],
            agents={
                "researcher": AgentDefinition(
                    description="Research specialist. Finds current, accurate sources for course content.",
                    prompt="""You are a research agent. For the given topic:
1. Use WebSearch to find 3-5 current sources (prefer official docs)
2. Use WebFetch to extract key information
3. Write a source_pack.json with: title, url, key_facts, accessed_date
4. Focus on accuracy and recency (2025-2026 sources preferred)""",
                    tools=["WebSearch", "WebFetch", "Read", "Write"],
                ),
                "writer": AgentDefinition(
                    description="Content writer. Creates personalized handbook chapters.",
                    prompt="""You are a content writer for AI training handbooks.
Follow the editorial style guide strictly.
Personalize to the learner's tools, role, and skill level.
Include practical prompt templates with {{PLACEHOLDER}} syntax.
Reference the assessment findings.
Output structured markdown with metadata.""",
                    tools=["Read", "Write", "Edit"],
                ),
                "qa-gate": AgentDefinition(
                    description="Quality assurance. Validates handbook quality.",
                    prompt="""You are a QA validator. Check:
1. Plan adherence (title match, topic coverage)
2. Personalization (tools, role, constraints referenced)
3. Freshness (claims have sources with dates)
4. Style compliance (editorial guide rules)
5. Template density (min 1 prompt template per chapter)
Output: qa_result.json with pass/fail and detailed issues.""",
                    tools=["Read", "Write", "Grep", "Bash"],
                ),
            },
            output_format={
                "type": "json_schema",
                "schema": {
                    "type": "object",
                    "properties": {
                        "modules": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "module_id": {"type": "string"},
                                    "title": {"type": "string"},
                                    "qa_passed": {"type": "boolean"},
                                    "qa_score": {"type": "number"},
                                    "retries": {"type": "number"},
                                    "sources_count": {"type": "number"},
                                },
                                "required": ["module_id", "title", "qa_passed"]
                            }
                        },
                        "overall_quality_score": {"type": "number"},
                        "generation_summary": {"type": "string"}
                    },
                    "required": ["modules", "overall_quality_score"]
                }
            },
        ),
    ):
        if hasattr(message, "result"):
            return message
```

### Alternatywa: Batch API pipeline (bez agentow)

Jesli pelna autonomia agenta to za duzo na start, mozna uzyc Batch API:

1. Batch 1: 6x research prompt -> 6x source_pack
2. Batch 2: 6x handbook prompt (z source_pack) -> 6x handbook
3. Batch 3: 6x QA prompt -> 6x qa_result
4. Logika retry w kodzie (nie w agencie)

50% tańsze, ale wolniejsze (async) i wymaga więcej kodu orkiestracji.

---

## 12. Limitacje i ryzyka

### Agent SDK

- **Koszty tokenow** -- agent moze "myslec" duzo zanim dojdzie do wyniku. MaxTurns ogranicza, ale nie eliminuje.
- **Niedeterminizm** -- ten sam prompt moze dac rozne wyniki. Structured output pomaga ale nie gwarantuje jakosci tresci.
- **Debugowanie** -- agentowa petla jest trudniejsza do debugowania niz linear pipeline.
- **Rate limits** -- przy 30 kursach rownoczesnie mozna trafic w limity API.

### Sandboxing

- **macOS seatbelt** jest mniej dojrzaly niz Linux bubblewrap
- **Sieciowa izolacja** -- konfiguracja allowed domains wymaga utrzymania

### Multi-agent

- **Koszt komunikacji** -- kazdy subagent ma wlasny kontekst = dodatkowe tokeny
- **Koordynacja** -- orchestrator musi umiec obsluzyc failures subagentow
- **Visibility** -- trudniej sledzic co robi kazdy subagent (hooki pomagaja)

### Web Search

- **Nie zawsze aktualne** -- web search nie gwarantuje najswiezszych wynikow
- **Jakosc zrodel** -- agent moze znalezc slabe zrodla; potrzebna heurystyka filtrowania
- **Rate** -- $10/1000 searches przy 6 searches/kurs = $0.06/kurs (tanie)

---

## 13. Wnioski i rekomendacje

### Na teraz (Q1 2026)

1. **Zostac na obecnym pipeline** (Convex actions + LLM client), ale:
   - Dodac WebSearch/WebFetch do handbook generation (juz mamy `:online` ale bez wymuszania zrodel)
   - Dodac structured output validation (Zod w Convex)
   - Dodac QA gate jako oddzielny krok w pipeline
   - Uzyc Batch API dla non-real-time generation

2. **Prototypowac Agent SDK osobno:**
   - Zbudowac proof-of-concept: 1 modul generowany przez 3-subagent pipeline
   - Porownac jakosc vs obecny pipeline
   - Zmierzyc koszty i czas

### Na Q2 2026

3. **Jesli PoC pokaze przewage**, migrować pipeline kursow na Agent SDK:
   - Orchestrator jako Convex action ktory odpala Agent SDK
   - Subagenci pracuja w sandboxie
   - Wyniki zapisywane do Convex przez custom MCP server lub hooki
   - QA gate jako hard requirement

4. **Rozwazyc custom MCP server** dla:
   - Convex queries (profil, assessment, plan)
   - Cloudflare Stream (video corpus)
   - Langfuse (observability)

### Kluczowe decyzje architektoniczne

| Decyzja                          | Rekomendacja                        | Dlaczego                                           |
|----------------------------------|-------------------------------------|-----------------------------------------------------|
| Framework                        | Claude Agent SDK                    | Natywny, te same narzedzia co Claude Code            |
| Model do content generation      | Sonnet 4.6 (batch)                  | 3x tańszy od Opus, wystarczająca jakość              |
| Model do QA                      | Haiku 4.5 (batch)                   | Cheapest, wystarczy do walidacji                     |
| Model do research                | Sonnet 4.6 (standard)               | Potrzebuje WebSearch (batch nie wspiera?)            |
| Sandbox                          | Docker per-task                      | Izolacja, reproducibility, cleanup                   |
| Output format                    | Structured JSON + Markdown           | Walidowalny, parseable, renderovable                 |
| QA approach                      | Subagent + Zod validation            | Agent sprawdza semantyke, Zod sprawdza ksztalt       |
| Observability                    | Hooki -> Langfuse                    | Kazdy tool call logowany, koszty trackowane          |
| Retry strategy                   | Max 3 retries, then human escalation | Zapobiega infinite loops i runaway costs              |
