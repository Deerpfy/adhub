# ChatGPT / GPT-5 Model Family Documentation

> **Version:** 1.0.0
> **Last Updated:** 2026-03-08
> **Coverage:** GPT-5 through GPT-5.4 (August 2025 – March 2026)

---

## Table of Contents

1. [GPT-5 (Base)](#gpt-5-base)
2. [GPT-5.1](#gpt-51)
3. [GPT-5.2](#gpt-52)
4. [GPT-5.3](#gpt-53)
5. [GPT-5.4](#gpt-54)
6. [GPT-5.4 Extended Features](#gpt-54-extended-features)
7. [Version Comparison Table](#version-comparison-table)
8. [Prompt Formatting Evolution](#prompt-formatting-evolution)
9. [References](#references)

---

## GPT-5 (Base)

### Release Date and Availability

- **Released:** August 7, 2025
- **ChatGPT:** Free for all users (with limits); Plus users get higher limits; Pro users get unlimited access including GPT-5 Pro
- **API:** Available as `gpt-5`, `gpt-5-mini`, `gpt-5-nano`

### Key Features and Capabilities

- **Unified architecture:** A single system with an intelligent router that decides when to respond quickly (Instant mode) vs. think longer (Thinking mode)
- **Benchmark performance:** 94.6% on AIME 2025 (math), 74.9% on SWE-bench Verified (coding), 84.2% on MMMU (multimodal), 46.2% on HealthBench Hard
- **Reduced hallucinations:** ~45% fewer factual errors than GPT-4o with web search; ~80% fewer than o3 when thinking
- **Efficiency:** Better than o3 with 50–80% fewer output tokens across visual reasoning, agentic coding, and scientific problem solving
- **Verbosity control:** Configurable as `high`, `medium`, or `low`
- **Model routing pattern:** OpenAI recommends using nano/mini for easy requests and escalating to full GPT-5 for complex queries

### Model Variants

| Model | API String | Use Case |
|---|---|---|
| GPT-5 | `gpt-5` | Flagship reasoning model |
| GPT-5 Mini | `gpt-5-mini` | Faster, cost-efficient for well-defined tasks |
| GPT-5 Nano | `gpt-5-nano` | Fastest, cheapest; summarization and classification |
| GPT-5 Pro | `gpt-5-pro` | Highest capability tier (Pro plan) |
| GPT-5 Chat | `gpt-5-chat` | ChatGPT-optimized variant |

### Context Window

| Variant | Context Window | Max Output |
|---|---|---|
| GPT-5 | 400K tokens | 128K tokens |
| GPT-5 Mini | 400K tokens | 128K tokens |
| GPT-5 Nano | 400K tokens | 128K tokens |
| GPT-5 Thinking (ChatGPT) | 196K tokens | — |

### Reasoning / Thinking Modes

- **Instant mode:** Fast responses for straightforward queries
- **Thinking mode:** Extended reasoning for complex problems
- **Reasoning effort parameter:** `minimal` / `low` / `medium` (default) / `high`
- `minimal` is the fastest option, best for latency-sensitive use cases
- Real-time router automatically selects mode based on conversation type, complexity, tool needs, and explicit intent
- **Verbosity parameter:** Separate from reasoning effort — controls output length (`low` / `medium` / `high`)
- **Knowledge cutoff:** September 30, 2024 (mini/nano: May 31, 2024)

### Tool Use / Agent Capabilities

- Web browsing
- DALL-E image generation
- Code Interpreter (Python execution)
- Canvas (collaborative editing)
- Memory (cross-chat context retention)
- **Freeform function calling:** Can emit raw executable content (Python, Bash, SQL) — not limited to rigid tool calls
- **`allowed_tools` parameter:** Restrict model to a subset of defined tools

### API Details

- **Snapshot strings:** `gpt-5-2025-08-07`, `gpt-5-mini-2025-08-07`, `gpt-5-nano-2025-08-07`
- **Pricing:** GPT-5: $1.25 / $10.00 per 1M tokens (input/output); GPT-5 Mini: $0.25 / $2.00; GPT-5 Nano: $0.05 / $0.40
- **Cached input discount:** 90%

### Deprecated / Retired by This Version

- GPT-4o was initially removed as default but restored after user backlash (#Keep4o)
- o3-mini, o4-mini continued alongside GPT-5 family temporarily
- GPT-4o, GPT-4.1, GPT-4.1 mini, and o4-mini formally retired from ChatGPT on February 13, 2026

---

## GPT-5.1

### Release Date and Availability

- **Released:** November 12, 2025 (Instant + Thinking); November 19, 2025 (two additional variants)
- **ChatGPT:** Rolled out to Pro, Plus, Go, Business first; then free and logged-out users. Enterprise/Edu got 7-day early access
- **API:** Released November 13, 2025

### Key Features and Capabilities

- **Personality system:** 8 personality options — Default, Friendly (renamed from Listener), Efficient (renamed from Robot), Professional, Candid, Quirky, plus two more
- **Warmer conversational tone:** Direct response to user feedback that GPT-5 was "flat" and "uncreative"
- **Adaptive reasoning:** GPT-5.1 Instant can now use adaptive reasoning to decide when to think before responding; 88% reduction in tokens for simplest 10% of tasks
- **Shopping research:** New capability for product research and recommendations
- **Multimodal improvements:** Enhanced image and document understanding

### Model Variants

| Model | API String | Description |
|---|---|---|
| GPT-5.1 Instant | `gpt-5.1` | Warmer, more conversational default model |
| GPT-5.1 Thinking | `gpt-5.1` (with reasoning) | Advanced reasoning, adapts speed to complexity |
| GPT-5.1 Auto | — | Routes queries to best-suited model |
| GPT-5.1 Codex | `gpt-5.1-codex` | Coding-optimized |
| GPT-5.1 Codex Mini | `gpt-5.1-codex-mini` | Lighter coding variant |
| GPT-5.1 Codex Max | `gpt-5.1-codex-max` | Frontier agentic coding, compaction, 1M context |

### Context Window

- **API:** 400K tokens (same as GPT-5 base); 128K max output
- **ChatGPT Instant:** ~128K tokens; **ChatGPT Thinking:** ~196K tokens
- **Codex-Max:** 1,050,000 tokens (compaction-enabled, Responses API only)
- Extended prompt caching: up to 24-hour cache retention (new)
- **Knowledge cutoff:** September 30, 2024 (same as GPT-5)

### Reasoning / Thinking Modes

- **Reasoning effort:** `none` (default) / `low` / `medium` / `high`
- `none` is new — model never uses reasoning tokens, behaves like a non-reasoning model but retains GPT-5.1 intelligence
- Changed default from `medium` (GPT-5) to `none` (GPT-5.1)
- Adaptive reasoning in Instant mode — model decides when to engage deeper thinking
- Dynamic thinking time: ~2x faster on simple tasks, ~2x slower on hardest tasks vs GPT-5

### Tool Use / Agent Capabilities

- **apply_patch tool:** New tool for more reliable code editing
- **Shell tool:** Lets the model run shell commands
- All GPT-5 base tools carried forward

### API Details

- **Model strings:** `gpt-5.1`, `gpt-5.1-chat-latest`, `gpt-5.1-codex`, `gpt-5.1-codex-mini`, `gpt-5.1-codex-max`
- **Pricing:** $1.25 / $10.00 per 1M tokens (input/output) — same as GPT-5; cached: $0.125 (90% discount)
- **Note:** "Instant" and "Thinking" are ChatGPT product labels, not API model IDs; reasoning is controlled via `reasoning_effort` on the unified `gpt-5.1` model

### Deprecated / Retired

- GPT-5 (Instant, Thinking, and Pro) retired from ChatGPT on February 13, 2026
- GPT-5.1 became sole default model after rollout

---

## GPT-5.2

### Release Date and Availability

- **Released:** December 10–11, 2025
- **ChatGPT:** Available across Instant, Thinking, and Pro tiers
- **API:** Available as `gpt-5.2`, `gpt-5.2-pro`, `gpt-5.2-codex`
- **Knowledge cutoff:** August 2025

### Key Features and Capabilities

- **Vision improvements:** Strongest vision model at release; halved error rates on chart reasoning and software interface understanding
- **Science & Math:** GPQA Diamond: 93.2% (Pro), 92.4% (Thinking); FrontierMath Tier 1–3: 40.3% (new SOTA)
- **Reduced hallucinations:** 30% fewer errors than GPT-5.1 Thinking on de-identified ChatGPT queries
- **Long-context reasoning:** New state of the art; near-perfect recall across 256K tokens
- **xhigh reasoning effort:** New highest reasoning tier (for Codex variant)
- **Compaction:** Context compaction for longer agent trajectories (Codex variant)
- **Improved coding:** Stronger performance on large code changes, Windows environments
- **Cybersecurity capabilities:** Significantly stronger (Codex variant)

### Model Variants

| Model | API String | Description |
|---|---|---|
| GPT-5.2 Instant | `gpt-5.2` | Default fast model |
| GPT-5.2 Thinking | `gpt-5.2` (with reasoning) | Deep reasoning model |
| GPT-5.2 Pro | `gpt-5.2-pro` | Highest capability (Pro/Enterprise) |
| GPT-5.2 Codex | `gpt-5.2-codex` | Agentic coding optimized |

### Context Window

- **400K tokens** context window with near-perfect recall across 256K tokens
- 128K max output tokens

### Reasoning / Thinking Modes

- **GPT-5.2:** `none` (default), `low`, `medium`, `high`
- **GPT-5.2 Codex:** `low`, `medium`, `high`, `xhigh` (new)
- ChatGPT thinking levels: Standard and Extended for Plus/Business; Light and Heavy additional options for Pro users

### Tool Use / Agent Capabilities

- Function calling, structured outputs, streaming, prompt caching
- Improved agentic tool-calling
- All previous tools carried forward

### API Details

- **Model strings:** `gpt-5.2`, `gpt-5.2-chat-latest`, `gpt-5.2-pro`, `gpt-5.2-codex`
- **Pricing:** GPT-5.2: $1.75 / $14.00 per 1M tokens (input/output); Pro: $21.00 / $168.00
- **Cached input:** $0.175 per 1M tokens (90% discount)

### Deprecated / Retired

- GPT-5.2 Thinking retirement scheduled for June 5, 2026 (3 months after GPT-5.4 launch)
- GPT-5.2 Instant replaced by GPT-5.3 Instant on March 3, 2026

---

## GPT-5.3

### GPT-5.3-Codex

#### Release Date and Availability

- **Released:** ~February 5, 2026
- **API:** Available as `gpt-5.3-codex`
- **Codex:** Primary model for agentic coding

#### Key Features and Capabilities

- **Combined training stacks:** First model combining Codex and GPT-5 training data
- **Self-bootstrapping:** First model that was instrumental in creating itself — used early versions to debug its own training, manage deployment, and diagnose test results
- **~25% faster** than GPT-5.2-Codex
- **State-of-the-art:** Top performance on SWE-Bench Pro
- **Frontier coding + reasoning:** Combines best of GPT-5.2-Codex coding and GPT-5.2 reasoning

#### Reasoning Effort

- `low`, `medium`, `high`, `xhigh`
- All evaluations run with `xhigh` reasoning effort

#### Tool Use

- Function calling, structured outputs, streaming, prompt caching

#### API Details

- **Model string:** `gpt-5.3-codex`
- **Pricing:** Not separately listed; follows Codex pricing tiers

### GPT-5.3 Instant

#### Release Date and Availability

- **Released:** March 3, 2026
- **ChatGPT:** Default model for all users, replacing GPT-5.2 Instant

#### Key Features and Capabilities

- **"Anti-Cringe" update:** Significantly reduces unnecessary refusals and moralizing preambles
- **Natural conversational style:** Cuts back on phrases like "Stop. Take a breath" — more direct and natural tone
- **Hallucination reduction:** 26.8% reduction for web queries; 19.7% for internal knowledge
- **Improved vision precision** and web search synthesis
- **Safety trade-off:** Some safety controls moved to product layer (e.g., graphic violence filtering dropped from 85.2% to 78.1%)

#### Context Window

- **400K tokens** — 3x larger than GPT-5.2 Instant's 128K

#### Reasoning Modes

- No deep multi-step reasoning (Instant mode only)
- Adaptive reasoning for when to think harder

#### API Details

- **Model string:** `gpt-5.3-chat-latest`
- **Migration deadline:** GPT-5.2 Instant users have until June 3, 2026

#### Benchmarks

- GPQA: 92.4%
- MMLU: 90.1%

---

## GPT-5.4

### Release Date and Availability

- **Released:** March 5, 2026
- **ChatGPT:** Available to Plus, Team, and Pro users; appears as "GPT-5.4 Thinking"
- **API:** Available as `gpt-5.4`; Codex integration included
- **Snapshot:** `gpt-5.4-2026-03-05`

### Key Features and Capabilities

- **Unifies Codex and GPT lines:** First mainline model incorporating frontier coding capabilities of GPT-5.3-Codex
- **Native computer use:** First general-purpose model with native computer-use capabilities
- **1M token context window:** Largest context in GPT family (922K input, 128K output)
- **Tool search:** Dynamic tool definition lookup — 47% token reduction
- **Compaction:** First mainline model trained for compaction
- **Improved instruction following:** Especially in block-structured and modular prompts
- **XML-style tags:** Explicitly supported in prompt guidance
- **Skills support:** Experimental Codex skills (e.g., Playwright Interactive)
- **Steerable preamble:** Mid-response rationale before tool calls
- **Phase field:** Prevents early stopping on long-running tasks
- **ChatGPT for Excel add-in:** Spreadsheet automation for Enterprise

### Model Variants

| Model | API String | Description |
|---|---|---|
| GPT-5.4 | `gpt-5.4` | Flagship model |
| GPT-5.4 Thinking | `gpt-5.4` (ChatGPT) | Reasoning variant in ChatGPT |
| GPT-5.4 Pro | `gpt-5.4-pro` | Highest capability (Pro/Enterprise) |

### Context Window

- **1,050,000 tokens total** (1M context window)
- Standard pricing up to 272K input tokens
- 2x input pricing and 1.5x output pricing above 272K

### Reasoning / Thinking Modes

- **Effort levels:** `none`, `low`, `medium`, `high`, `xhigh`
- **Guidance:** Use `none` for execution-heavy workloads (workflow steps, field extraction, short transforms); use `medium`+ for research-heavy workloads (long-context synthesis, multi-document review, strategy writing)
- Treat reasoning effort as a "last-mile tuning knob," not the primary quality lever

### Tool Use / Agent Capabilities

- **Tool search:** Deferred tool loading — model looks up definitions only when needed
- **Computer use:** Reads screenshots, writes Playwright code, clicks/types/navigates
- **Function calling:** Full support with structured outputs
- **Compaction:** For longer agent trajectories
- **Skills:** Experimental Codex skills (Playwright Interactive)
- **Preamble messages:** "Before you call a tool, explain why you are calling it"

### API Details

- **Model strings:** `gpt-5.4`, `gpt-5.4-pro`, `gpt-5.4-2026-03-05`
- **Pricing:** GPT-5.4: $2.50 / $15.00 per 1M tokens (input/output); cached: $0.25; Pro: $30.00 / $180.00
- **Responses API:** Chain-of-thought passing between turns; phase field support

### Benchmarks

- OSWorld-Verified: 75.0% (exceeds human 72.4%, up from GPT-5.2's 47.3%)
- GDPval: 83%
- 33% fewer false claims than GPT-5.2; 18% fewer overall errors
- Excel benchmark: 87.3% (vs GPT-5.2's 68.4%)

### Safety

- **Classified as "High cyber capability"** under Preparedness Framework — first model with mitigations for High capability in Cybersecurity
- CoT controllability: GPT-5.4 Thinking has low ability to obfuscate reasoning (positive safety property)
- Asynchronous message-level blocking for high-risk requests on ZDR surfaces
- Trusted Access for Cyber (TAC) program
- Deception less likely in Thinking mode — CoT monitoring remains effective

### Deprecated / Retired

- GPT-5.2 Thinking: retired June 5, 2026 (3-month legacy access)
- GPT-5.4 is the recommended replacement for all GPT-5.2 use cases

---

## GPT-5.4 Extended Features

### 1. Tool Search and Deferred Tool Loading

Tool Search lets the model look up tool definitions only when needed, rather than including all definitions in the system prompt. This reduces total token usage by 47% while maintaining the same accuracy. Particularly valuable for large tool ecosystems where listing all tools upfront would consume significant context.

### 2. Native Computer Use Capabilities

GPT-5.4 is the first general-purpose model with native computer-use capabilities. It can:
- Read screenshots and understand UI elements
- Write and execute Playwright code for browser automation
- Click buttons, type text, and navigate interfaces like a human
- Operate across applications for complex workflows
- On OSWorld-Verified desktop navigation benchmark: 75.0% (exceeding human 72.4%)

The Codex experimental skill "Playwright (Interactive)" demonstrates the model visually debugging web and Electron apps.

### 3. 1M Context Window Usage and Pricing

- **Total context:** 1,050,000 tokens (922K input + 128K output)
- **Standard pricing tier:** Up to 272K input tokens at base rates
- **Extended pricing tier:** Above 272K input tokens billed at 2x input and 1.5x output rates
- In Codex: Configure via `model_context_window` and `model_auto_compact_token_limit`
- The 1M window enables agents to plan, execute, and verify tasks across long horizons

### 4. Compaction (Server-Side and Client-Side)

GPT-5.4 is the first mainline model trained to support compaction, which enables:
- Longer agent trajectories while preserving key context
- Multi-turn conversations without hitting context limits or performance degradation
- In the Responses API: compact after major milestones, treat compacted items as opaque state, keep prompts functionally identical after compaction

### 5. Skills Support in Responses API

- Experimental support for Codex skills
- First demonstration: "Playwright (Interactive)" skill for visually debugging web apps
- Skills allow the model to test applications it's building in real-time
- Combines computer-use and coding capabilities

### 6. Steerable Mid-Response Preamble

- Developer instruction enables preamble messages: e.g., "Before you call a tool, explain why you are calling it"
- The model prepends a concise rationale to each tool call
- The Responses API includes a `phase` field to prevent early stopping during preambles
- `phase` is recommended for long-running or tool-heavy agents with commentary before tool calls

### 7. ChatGPT for Excel Add-in

- New Enterprise feature for spreadsheet task automation
- Junior investment banking analyst benchmark: GPT-5.4 scores 87.3% (vs GPT-5.2's 68.4%)
- Also includes Google Sheets financial plugin support

### 8. Reasoning Effort Calibration

| Effort Level | Recommended For |
|---|---|
| `none` | Action-selection, workflow steps, field extraction, support triage, short structured transforms |
| `low` | Simple classification, straightforward formatting |
| `medium` | Nuanced interpretation, moderate synthesis |
| `high` | Research, multi-document review, conflict resolution |
| `xhigh` | Complex coding tasks, frontier reasoning, strategy writing |

**Key principle:** Reasoning effort is a "last-mile tuning knob" — stronger prompts, clear output contracts, and verification loops are more effective than simply increasing effort.

### 9. Prompt Guidance Patterns

#### Verification Loops
Once a workflow appears complete, add a lightweight verification step before returning or taking an irreversible action. Catches requirement misses, grounding issues, and format drift.

#### Structured Output Contracts
`<output_contract>`: Return exactly the requested sections, in order. Apply length limits only to intended sections. If a format is required (JSON, Markdown, SQL, XML), output only that format.

`<structured_output_contract>`: For parse-sensitive formats — output only the requested format, no prose or markdown fences, validate balanced brackets, don't invent tables or fields.

#### Initiative Nudges (`<dig_deeper_nudge>`)
"Don't stop at the first plausible answer. Look for second-order issues, edge cases, and missing constraints. If the task is safety or accuracy critical, perform at least one verification step."

#### Empty Result Recovery (`<empty_result_recovery>`)
If a lookup returns empty/partial/narrow results, try at least one fallback: alternate query wording, broader filters, prerequisite lookup, or alternate source.

#### Tool Persistence
Keep tool definitions consistent across turns. Use compaction-aware patterns.

#### Completeness Checks
Before finalizing, verify the output satisfies every requirement in the prompt.

### 10. Safety and Cybersecurity Checks

- **Preparedness Framework classification:** "High cyber capability" — first model with mitigations at this level
- **Canary thresholds met:** Cannot rule out High-level cyber capabilities
- **Mitigations:** Asynchronous message-level blocks, Trusted Access for Cyber (TAC), monitoring systems
- **CoT controllability:** Low ability to obfuscate reasoning = positive safety signal
- **ZDR (Zero Data Retention):** Asynchronous classifiers block high-risk cyber content
- **Open-source evaluation:** CoT controllability evaluation released publicly

---

## Version Comparison Table

| Feature | GPT-5 | GPT-5.1 | GPT-5.2 | GPT-5.3 Codex | GPT-5.3 Instant | GPT-5.4 |
|---|---|---|---|---|---|---|
| **Release Date** | Aug 7, 2025 | Nov 12, 2025 | Dec 10, 2025 | ~Feb 5, 2026 | Mar 3, 2026 | Mar 5, 2026 |
| **Context Window** | 400K | 400K | 400K | 256K | 400K | 1,050K |
| **API Model String** | `gpt-5` | `gpt-5.1` | `gpt-5.2` | `gpt-5.3-codex` | `gpt-5.3-chat-latest` | `gpt-5.4` |
| **Reasoning Effort** | minimal/low/medium (default)/high | none (default)/low/medium/high | none/low/medium/high (xhigh Codex) | low/medium/high/xhigh | Adaptive (Instant) | none/low/medium/high/xhigh |
| **Thinking Mode** | Yes (router) | Yes (adaptive) | Yes (3 tiers) | Yes | No (Instant only) | Yes |
| **Computer Use** | No | No | No | No | No | Yes (native) |
| **Tool Search** | No | No | No | No | No | Yes |
| **Compaction** | No | No | Codex only | Yes | No | Yes (mainline) |
| **XML Tags in Prompts** | Supported | Supported | Supported | Supported | Supported | Explicitly recommended |
| **Personality Options** | Basic | 8 presets | Inherited | N/A | "Anti-cringe" tone | Personality adherence |
| **Key New Feature** | Unified model | Personality + Adaptive | Vision + Long context | Agentic coding | Natural tone | Computer use + 1M ctx |
| **Pricing (in/out $/1M)** | $1.25 / $10 | $1.25 / $10 | $1.75 / $14 | Codex tier | — | $2.50 / $15 |
| **Pro Pricing (in/out)** | — | — | $21 / $168 | — | — | $30 / $180 |
| **Deprecated By** | GPT-5.1 | GPT-5.2 | GPT-5.4 | GPT-5.4 | — | Current flagship |

---

## Prompt Formatting Evolution

### Structure Preferences

| Version | Preferred Format | Details |
|---|---|---|
| GPT-5 | Markdown headings + bold | `**Section:**` blocks; clear, literal instructions |
| GPT-5.1 | Markdown headings + bold | Same as GPT-5; personality customization via presets |
| GPT-5.2 | Markdown + XML emerging | XML tags supported; Codex variant benefits from structured prompts |
| GPT-5.3 | Markdown + XML | XML-tagged scaffolding for agents (e.g., `<user_updates_spec>`) |
| GPT-5.4 | XML tags explicitly recommended | `<output_contract>`, `<structured_output_contract>`, `<dig_deeper_nudge>`, `<empty_result_recovery>` patterns |

### System Prompt vs Developer Message vs User Message

- **GPT-5 – GPT-5.2:** System messages supported; developer messages introduced in API
- **GPT-5.4:** Behavior is "steerable via developer messages" — developer messages are the primary control surface for API developers. Developer messages configure safety behavior for different risk tolerance levels.

### Reasoning Effort and Thinking Mode Instructions

| Version | Approach |
|---|---|
| GPT-5 | Automatic router (Instant vs Thinking); `reasoning_effort`: minimal/low/medium (default)/high; separate `verbosity` parameter |
| GPT-5.1 | Adaptive reasoning; `reasoning_effort`: none (default)/low/medium/high; `none` = never uses reasoning tokens |
| GPT-5.2 | Explicit effort tiers (none/low/medium/high); `xhigh` for Codex; ChatGPT toggle (Standard/Extended/Light/Heavy) |
| GPT-5.3-Codex | Full effort range: low/medium/high/xhigh |
| GPT-5.4 | Full range: none/low/medium/high/xhigh; treat as "last-mile tuning knob"; calibrate by task type |

### Tool / Function Calling Format Changes

| Version | Changes |
|---|---|
| GPT-5 | Standard function calling; web browsing, DALL-E, Code Interpreter |
| GPT-5.1 | Added `apply_patch` tool and `shell` tool |
| GPT-5.2 | Improved agentic tool-calling; function calling + structured outputs + streaming + prompt caching |
| GPT-5.3-Codex | Same tool capabilities; faster execution |
| GPT-5.4 | **Tool search** (deferred loading — 47% token reduction); preamble messages before tool calls; `phase` field for multi-step flows |

### Output Format Control

| Version | Capabilities |
|---|---|
| GPT-5 | `response_format` for JSON mode; structured outputs |
| GPT-5.1 | Same; added prompt caching (24h retention) |
| GPT-5.2 | Enhanced structured outputs; streaming support |
| GPT-5.4 | `<output_contract>` pattern for strict format control; `<structured_output_contract>` for parse-sensitive formats (SQL, JSON, XML); explicit format-only output rules |

### Few-Shot Example Formatting

- **GPT-5 – GPT-5.2:** Standard few-shot examples in user/assistant message pairs work well
- **GPT-5.4:** Few-shot still effective; XML-tagged examples recommended for complex tasks. Cursor's testing showed XML specs like `<[instruction]_spec>` improved instruction adherence.

### Constraint Handling and Instruction Adherence

| Version | Approach |
|---|---|
| GPT-5 | Literal instruction following; explicit constraints |
| GPT-5.1 | Better adaptive behavior; personality affects interpretation |
| GPT-5.2 | Strong instruction following in long contexts |
| GPT-5.4 | **Best-in-class instruction adherence** in modular, skill-based, and block-structured prompts when output contract is explicit. Verification loops recommended. Initiative nudges (`dig_deeper_nudge`) for deeper analysis. |

### Key Prompt Formatting Best Practices by Version

#### GPT-5 / GPT-5.1
```
**Role:** You are an expert analyst.

**Context:** [background information]

**Task:** [specific instruction]

**Output Format:** [expected format]
```

#### GPT-5.2+
```
**Role:** You are an expert analyst.

<context>
[background information]
</context>

**Task:** [specific instruction]

<output_format>
[expected format specification]
</output_format>
```

#### GPT-5.4 (Current Best Practice)
```
<role>
You are an expert analyst specializing in [domain].
</role>

<context>
[background information]
</context>

<task>
[specific instruction]
</task>

<output_contract>
Return exactly the sections requested, in the requested order.
If a format is required (JSON, Markdown), output only that format.
</output_contract>

<dig_deeper_nudge>
Don't stop at the first plausible answer. Look for second-order issues,
edge cases, and missing constraints.
</dig_deeper_nudge>
```

---

## References

### Official OpenAI Sources

1. [Introducing GPT-5](https://openai.com/index/introducing-gpt-5/) — OpenAI blog, August 2025
2. [GPT-5.1: A smarter, more conversational ChatGPT](https://openai.com/index/gpt-5-1/) — OpenAI blog, November 2025
3. [Introducing GPT-5.1 for developers](https://openai.com/index/gpt-5-1-for-developers/) — OpenAI blog, November 2025
4. [Introducing GPT-5.2](https://openai.com/index/introducing-gpt-5-2/) — OpenAI blog, December 2025
5. [Introducing GPT-5.2-Codex](https://openai.com/index/introducing-gpt-5-2-codex/) — OpenAI blog, December 2025
6. [GPT-5.3 Instant: Smoother, more useful everyday conversations](https://openai.com/index/gpt-5-3-instant/) — OpenAI blog, March 2026
7. [Introducing GPT-5.3-Codex](https://openai.com/index/introducing-gpt-5-3-codex/) — OpenAI blog, February 2026
8. [Introducing GPT-5.4](https://openai.com/index/introducing-gpt-5-4/) — OpenAI blog, March 2026
9. [Prompt guidance for GPT-5.4](https://developers.openai.com/api/docs/guides/prompt-guidance/) — OpenAI API docs
10. [Using GPT-5.4](https://developers.openai.com/api/docs/guides/latest-model/) — OpenAI API docs
11. [GPT-5.4 Model](https://developers.openai.com/api/docs/models/gpt-5.4) — OpenAI API docs
12. [GPT-5 Model](https://platform.openai.com/docs/models/gpt-5) — OpenAI API docs
13. [GPT-5.1 Model](https://platform.openai.com/docs/models/gpt-5.1) — OpenAI API docs
14. [GPT-5.2 Model](https://platform.openai.com/docs/models/gpt-5.2) — OpenAI API docs
15. [OpenAI Pricing](https://developers.openai.com/api/docs/pricing) — OpenAI API docs
16. [ChatGPT Release Notes](https://help.openai.com/en/articles/6825453-chatgpt-release-notes) — OpenAI Help Center
17. [Model Release Notes](https://help.openai.com/en/articles/9624314-model-release-notes) — OpenAI Help Center
18. [Retiring GPT-4o and other models](https://openai.com/index/retiring-gpt-4o-and-older-models/) — OpenAI blog
19. [GPT-5.4 Thinking System Card](https://deploymentsafety.openai.com/gpt-5-4-thinking/introduction) — OpenAI Safety
20. [Deprecations](https://developers.openai.com/api/docs/deprecations) — OpenAI API docs
21. [GPT-5 prompting guide](https://cookbook.openai.com/examples/gpt-5/gpt-5_prompting_guide) — OpenAI Cookbook
22. [GPT-5.2 Prompting Guide](https://cookbook.openai.com/examples/gpt-5/gpt-5-2_prompting_guide) — OpenAI Cookbook
23. [GPT-5.3 and GPT-5.2 in ChatGPT](https://help.openai.com/en/articles/11909943-gpt-53-and-52-in-chatgpt) — OpenAI Help Center

### Third-Party Sources

24. [GPT-5 — Wikipedia](https://en.wikipedia.org/wiki/GPT-5)
25. [GPT-5.1 — Wikipedia](https://en.wikipedia.org/wiki/GPT-5.1)
26. [OpenAI launches GPT-5.4](https://techcrunch.com/2026/03/05/openai-launches-gpt-5-4-with-pro-and-thinking-versions/) — TechCrunch, March 2026
27. [OpenAI launches GPT-5.4 with native computer use](https://venturebeat.com/technology/openai-launches-gpt-5-4-with-native-computer-use-mode-financial-plugins-for) — VentureBeat, March 2026
28. [GPT-5.3 Instant Review](https://www.nxcode.io/resources/news/gpt-5-3-instant-anti-cringe-update-review-2026) — NxCode
29. [OpenAI GPT-5 Model Guide](https://www.nxcode.io/resources/news/openai-gpt-5-model-guide-which-to-use-2026) — NxCode
30. [GPT-5.3-Codex System Card](https://cdn.openai.com/pdf/23eca107-a9b1-4d2c-b156-7deb4fbc697c/GPT-5-3-Codex-System-Card-02.pdf) — OpenAI PDF
