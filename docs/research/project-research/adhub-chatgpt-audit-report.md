# AdHub AI-Prompting Tool — ChatGPT Audit Report

> **Version:** 1.0.0
> **Last Updated:** 2026-03-08
> **Auditor:** AI Platform Analyst
> **Tool Path:** `projects/ai-prompting/index.html` + `projects/ai-prompting/app.js`

---

## Current State Analysis

### Tool Overview

The AdHub AI-Prompting tool is a React-based interactive prompt formatter that helps users build structured prompts for multiple AI platforms. The main logic resides in `app.js` (~7838 lines). The tool supports 8 target models: Claude, ChatGPT, Gemini, Llama, Mistral, Cohere, Grok, and DeepSeek.

### ChatGPT/GPT Current Implementation

The ChatGPT section uses the internal identifier `gpt` throughout the codebase. Key findings:

**1. Model Description (line 5508-5513)**
```javascript
{
  id: 'gpt',
  name: 'ChatGPT',
  color: '#10A37F',
  icon: '💚',
  desc: 'Markdown, literal instructions',
  features: ['web_browsing', 'dalle', 'code_interpreter', 'canvas', 'memory']
}
```
- **Issue:** Description says "Markdown, literal instructions" — this was accurate for GPT-4o/GPT-5 era but GPT-5.4 now explicitly recommends XML-style tags in prompt guidance.
- **Issue:** No mention of which GPT model version this targets.

**2. Token Limit (lines 2945-2949)**
```javascript
gpt: {
  name: 'ChatGPT',
  limit: 128000,
  warning: 100000
}
```
- **Issue:** Context window is set to 128K tokens. GPT-5.4 supports 1,050K tokens; even GPT-5 base supports 400K. This is severely outdated (reflects GPT-4o limits).

**3. Model Features (lines 543-568)**
```javascript
gpt: {
  web_browsing: { name: 'Web Browsing', ... },
  dalle: { name: 'DALL-E', ... },
  code_interpreter: { name: 'Code Interpreter', ... },
  canvas: { name: 'Canvas', ... },
  memory: { name: 'Memory', ... }
}
```
- **Issue:** Missing GPT-5+ features: Thinking mode, computer use, tool search, compaction, reasoning effort, apply_patch, shell tool, personality presets, shopping research.

**4. Prompt Formatter (lines 4583-4588)**
```javascript
gpt: {
  wrap: (tag, content) => `**${tag}:**\n${content}`,
  role: (role, p) => `${p.actAs} ${role}.`,
  section: (label, content) => `**${label}:**\n${content}`
}
```
- **Issue:** Uses only Markdown bold formatting (`**Section:**`). GPT-5.4 prompt guidance explicitly recommends XML-style tags like `<output_contract>`, `<structured_output_contract>`, `<dig_deeper_nudge>`. The formatter should offer XML-tagged output for GPT-5.4.

**5. Features Section Formatting (lines 4874-4878)**
```javascript
} else if (target === 'gpt') {
  sections.push({
    type: 'features',
    text: `## Special Instructions\n${featuresText}`
  });
}
```
- **Issue:** Uses `## Special Instructions` heading. GPT-5.4 pattern uses XML tags for model capabilities.

**6. Verify Model String (line 5172)**
```javascript
model: 'openai',
```
- **Observation:** The verify endpoint uses `'openai'` as model string — this is fine as a backend routing identifier but doesn't reflect specific GPT version.

**7. Verify UI Text (lines 5813, 5903, 5949)**
```javascript
t.verify?.modelValue || 'OpenAI (GPT-4o mini)'
```
- **Issue:** References `GPT-4o mini` as the verification model. GPT-4o mini has been deprecated. Should reference current model (e.g., `GPT-5 Nano` or `GPT-5 Mini`).

**8. Footer Citations (line 979)**
```javascript
footer: 'Methods based on: The Prompt Report (UMD, OpenAI, Stanford, 2025) • ...'
```
- **Observation:** Citations are from 2025 — still valid but could note GPT-5.4 prompt guidance (2026).

---

## Outdated Items

### Critical (Incorrect Information)

| # | Location | Current Value | Correct Value | Impact |
|---|---|---|---|---|
| 1 | `app.js:2945-2948` | Token limit: 128,000 / warning: 100,000 | Limit: 1,050,000 / warning: 800,000 (GPT-5.4); or 400,000 / 300,000 (GPT-5 base) | Token counter shows wrong limits; users may think they're exceeding context |
| 2 | `app.js:5813,5903,5949` | `'OpenAI (GPT-4o mini)'` | `'OpenAI (GPT-5 Mini)'` or `'OpenAI (GPT-5 Nano)'` | References deprecated model |
| 3 | `app.js:5512` | `desc: 'Markdown, literal instructions'` | `desc: 'XML tags + Markdown, structured contracts'` | Misleading format recommendation |

### Major (Missing Current Features)

| # | Location | Issue | Should Be |
|---|---|---|---|
| 4 | `app.js:543-568` | Only 5 features listed (web_browsing, dalle, code_interpreter, canvas, memory) | Add: thinking_mode, computer_use, tool_search, reasoning_effort, compaction, apply_patch, shell_tool |
| 5 | `app.js:4583-4588` | Formatter uses only Markdown bold | Should support XML-tag formatting for GPT-5.4 |
| 6 | `app.js:4874-4878` | Features use `## Special Instructions` | Should use XML tags or GPT-5.4 recommended patterns |

### Minor (Enhancements)

| # | Location | Issue | Recommendation |
|---|---|---|---|
| 7 | `app.js:5508` | No version indicator | Add model version info (e.g., "GPT-5.4" or version selector) |
| 8 | `app.js:896,1771` | `modelValue: 'OpenAI (GPT-4o mini)'` in translations | Update to current model name |
| 9 | Czech translations (line ~1995-2020) | GPT features list matches English (same 5 features) | Update Czech features to match English updates |

---

## Missing Items

### Features to Add (GPT-5.4 Era)

1. **Thinking Mode / Reasoning Effort** — GPT-5+ has configurable reasoning effort (none/low/medium/high/xhigh). The tool should include a reasoning effort selector when ChatGPT is the target.

2. **Computer Use** — GPT-5.4's native computer use capability (Playwright, screenshot reading, UI navigation). Should appear in the features list.

3. **Tool Search** — Deferred tool loading pattern. Relevant for agent-focused prompts.

4. **Compaction** — Context compaction for long agent sessions.

5. **XML Tag Support** — GPT-5.4 explicitly supports and recommends XML-style tags (`<output_contract>`, `<structured_output_contract>`, `<dig_deeper_nudge>`, `<empty_result_recovery>`). The formatter should use these patterns.

6. **Structured Output Contracts** — New GPT-5.4 prompt pattern for enforcing output format.

7. **Verification Loops** — GPT-5.4 pattern for adding completeness checks before finalizing.

8. **Initiative Nudges** — `dig_deeper_nudge` pattern for encouraging deeper analysis.

9. **Personality Presets** — GPT-5.1+ supports 8 personality options.

10. **Steerable Preamble** — Mid-response rationale capability.

---

## Proposed Changes (with code diffs)

### Change 1: Update Token Limits

**File:** `app.js`
**Lines:** 2945-2949
**Rationale:** GPT-5.4 supports 1,050,000 token context. Even GPT-5 base supports 400K. Current 128K reflects deprecated GPT-4o.

```javascript
// OLD
gpt: {
  name: 'ChatGPT',
  limit: 128000,
  warning: 100000
},

// NEW
gpt: {
  name: 'ChatGPT',
  limit: 1050000,
  warning: 800000
},
```

**Note:** If the tool wants to support pre-5.4 models, consider using the GPT-5 base 400K as a middle-ground default, or use the version selector (Change 8) to dynamically set limits.

### Change 2: Update Model Description

**File:** `app.js`
**Lines:** 5508-5513
**Rationale:** GPT-5.4 explicitly recommends XML tags in prompt guidance. "Markdown, literal instructions" is outdated.

```javascript
// OLD
{
  id: 'gpt',
  name: 'ChatGPT',
  color: '#10A37F',
  icon: '💚',
  desc: 'Markdown, literal instructions',
  features: ['web_browsing', 'dalle', 'code_interpreter', 'canvas', 'memory']
}

// NEW
{
  id: 'gpt',
  name: 'ChatGPT',
  color: '#10A37F',
  icon: '💚',
  desc: 'XML tags + Markdown, structured contracts',
  features: ['web_browsing', 'dalle', 'code_interpreter', 'canvas', 'memory', 'thinking_mode', 'computer_use', 'tool_search', 'reasoning_effort']
}
```

### Change 3: Update GPT Model Features (English)

**File:** `app.js`
**Lines:** 543-568
**Rationale:** Add GPT-5+ era features to the feature selector.

```javascript
// OLD
gpt: {
  web_browsing: {
    name: 'Web Browsing',
    desc: 'Search the web for information',
    promptTag: 'Search the web for current information.'
  },
  dalle: {
    name: 'DALL-E',
    desc: 'Generate images',
    promptTag: 'Generate an image using DALL-E.'
  },
  code_interpreter: {
    name: 'Code Interpreter',
    desc: 'Execute Python code',
    promptTag: 'Use Code Interpreter to execute code.'
  },
  canvas: {
    name: 'Canvas',
    desc: 'Collaborative editing mode',
    promptTag: 'Use Canvas for collaborative editing.'
  },
  memory: {
    name: 'Memory',
    desc: 'Remember context across chats',
    promptTag: 'Remember this for future conversations.'
  }
},

// NEW
gpt: {
  web_browsing: {
    name: 'Web Browsing',
    desc: 'Search the web for information',
    promptTag: 'Search the web for current information.'
  },
  dalle: {
    name: 'DALL-E',
    desc: 'Generate images',
    promptTag: 'Generate an image using DALL-E.'
  },
  code_interpreter: {
    name: 'Code Interpreter',
    desc: 'Execute Python code',
    promptTag: 'Use Code Interpreter to execute code.'
  },
  canvas: {
    name: 'Canvas',
    desc: 'Collaborative editing mode',
    promptTag: 'Use Canvas for collaborative editing.'
  },
  memory: {
    name: 'Memory',
    desc: 'Remember context across chats',
    promptTag: 'Remember this for future conversations.'
  },
  thinking_mode: {
    name: 'Thinking Mode',
    desc: 'Extended reasoning for complex problems',
    promptTag: 'Use extended thinking to reason through this step by step.'
  },
  computer_use: {
    name: 'Computer Use',
    desc: 'Native desktop/browser automation via Playwright',
    promptTag: 'Use computer use capabilities to interact with the application.'
  },
  tool_search: {
    name: 'Tool Search',
    desc: 'Deferred tool loading for large tool ecosystems',
    promptTag: 'Use tool search to find and load the appropriate tool.'
  },
  reasoning_effort: {
    name: 'Reasoning Effort',
    desc: 'Calibrate thinking depth (none/low/medium/high/xhigh)',
    promptTag: 'Calibrate reasoning effort based on task complexity.'
  }
},
```

### Change 4: Update GPT Model Features (Czech)

**File:** `app.js`
**Lines:** 1995-2020
**Rationale:** Czech translations must mirror English feature additions.

```javascript
// OLD
gpt: {
  web_browsing: {
    name: 'Prohlížení webu',
    desc: 'Vyhledávání informací na webu',
    promptTag: 'Vyhledej na webu aktuální informace.'
  },
  dalle: {
    name: 'DALL-E',
    desc: 'Generování obrázků',
    promptTag: 'Vygeneruj obrázek pomocí DALL-E.'
  },
  code_interpreter: {
    name: 'Interpret kódu',
    desc: 'Spouštění Python kódu',
    promptTag: 'Použij Interpret kódu pro spuštění kódu.'
  },
  canvas: {
    name: 'Plátno',
    desc: 'Režim spolupráce na editaci',
    promptTag: 'Použij Plátno pro spolupráci na editaci.'
  },
  memory: {
    name: 'Paměť',
    desc: 'Pamatování kontextu mezi chaty',
    promptTag: 'Zapamatuj si toto pro budoucí konverzace.'
  }
},

// NEW
gpt: {
  web_browsing: {
    name: 'Prohlížení webu',
    desc: 'Vyhledávání informací na webu',
    promptTag: 'Vyhledej na webu aktuální informace.'
  },
  dalle: {
    name: 'DALL-E',
    desc: 'Generování obrázků',
    promptTag: 'Vygeneruj obrázek pomocí DALL-E.'
  },
  code_interpreter: {
    name: 'Interpret kódu',
    desc: 'Spouštění Python kódu',
    promptTag: 'Použij Interpret kódu pro spuštění kódu.'
  },
  canvas: {
    name: 'Plátno',
    desc: 'Režim spolupráce na editaci',
    promptTag: 'Použij Plátno pro spolupráci na editaci.'
  },
  memory: {
    name: 'Paměť',
    desc: 'Pamatování kontextu mezi chaty',
    promptTag: 'Zapamatuj si toto pro budoucí konverzace.'
  },
  thinking_mode: {
    name: 'Režim myšlení',
    desc: 'Rozšířené uvažování pro složité problémy',
    promptTag: 'Použij rozšířené myšlení pro krok za krokem reasoning.'
  },
  computer_use: {
    name: 'Ovládání počítače',
    desc: 'Nativní automatizace desktopu/prohlížeče přes Playwright',
    promptTag: 'Použij ovládání počítače pro interakci s aplikací.'
  },
  tool_search: {
    name: 'Vyhledávání nástrojů',
    desc: 'Odložené načítání nástrojů pro velké ekosystémy',
    promptTag: 'Použij vyhledávání nástrojů pro nalezení správného nástroje.'
  },
  reasoning_effort: {
    name: 'Úroveň uvažování',
    desc: 'Kalibrace hloubky myšlení (none/low/medium/high/xhigh)',
    promptTag: 'Kalibruj úroveň uvažování podle složitosti úlohy.'
  }
},
```

### Change 5: Update Prompt Formatter for GPT-5.4 XML Support

**File:** `app.js`
**Lines:** 4583-4588
**Rationale:** GPT-5.4 prompt guidance explicitly recommends XML-style tags. The formatter should generate XML-tagged prompts instead of only Markdown bold.

```javascript
// OLD
gpt: {
  wrap: (tag, content) => `**${tag}:**\n${content}`,
  role: (role, p) => `${p.actAs} ${role}.`,
  section: (label, content) => `**${label}:**\n${content}`
},

// NEW
gpt: {
  wrap: (tag, content) => `<${tag.toLowerCase().replace(/\s+/g, '_')}>\n${content}\n</${tag.toLowerCase().replace(/\s+/g, '_')}>`,
  role: (role, p) => `<role>\n${p.actAs} ${role}.\n</role>`,
  section: (label, content) => `<${label.toLowerCase().replace(/\s+/g, '_')}>\n${content}\n</${label.toLowerCase().replace(/\s+/g, '_')}>`
},
```

**Alternative (preserving backward compat):** If the version selector is implemented (Change 8), the formatter could switch between Markdown (GPT-5/5.1) and XML (GPT-5.2+) based on selected version.

### Change 6: Update GPT Features Section Formatting

**File:** `app.js`
**Lines:** 4874-4878
**Rationale:** Align with GPT-5.4 XML tag patterns.

```javascript
// OLD
} else if (target === 'gpt') {
  sections.push({
    type: 'features',
    text: `## Special Instructions\n${featuresText}`
  });
}

// NEW
} else if (target === 'gpt') {
  sections.push({
    type: 'features',
    text: `<model_capabilities>\n${featuresText}\n</model_capabilities>`
  });
}
```

### Change 7: Update Verify Model References

**File:** `app.js`
**Lines:** 896, 1771, 5813, 5903, 5949
**Rationale:** GPT-4o mini is deprecated. Update to current model name.

```javascript
// OLD (in translations, lines 896 and 1771)
modelValue: 'OpenAI (GPT-4o mini)',

// NEW
modelValue: 'OpenAI (GPT-5 Mini)',

// OLD (in verify UI, lines 5813, 5903, 5949)
t.verify?.modelValue || 'OpenAI (GPT-4o mini)'

// NEW
t.verify?.modelValue || 'OpenAI (GPT-5 Mini)'
```

### Change 8: Add GPT Context Section with Output Contract Pattern

**File:** `app.js`
**Lines:** 4648-4678 (context section handler)
**Rationale:** GPT-5.4 benefits from XML-tagged context, similar to Claude's approach.

```javascript
// OLD (the else branch at line 4673-4677 handles GPT context)
} else {
  sections.push({
    type: 'context',
    text: f.section(p.context, fields.context)
  });
}

// NEW — Add explicit GPT branch before the else
} else if (target === 'gpt') {
  sections.push({
    type: 'context',
    text: `<context>\n${fields.context}\n</context>`
  });
} else {
  sections.push({
    type: 'context',
    text: f.section(p.context, fields.context)
  });
}
```

---

## Versioning UI Proposal

### Current State

The tool has no GPT version selector. The `gpt` target is treated as a single model without version-specific formatting.

### Proposed Design

Add a **model version dropdown** that appears when ChatGPT is selected as the target. This follows the existing UI pattern (the tool already has target-specific feature checkboxes).

#### Implementation Concept

```javascript
// Add to the GPT target configuration or as a separate state
const GPT_VERSIONS = {
  'gpt-5.4': {
    name: 'GPT-5.4 (Latest)',
    contextLimit: 1050000,
    contextWarning: 800000,
    formatStyle: 'xml',    // Use XML tags
    reasoningEffort: ['none', 'low', 'medium', 'high', 'xhigh'],
    features: ['web_browsing', 'dalle', 'code_interpreter', 'canvas', 'memory',
               'thinking_mode', 'computer_use', 'tool_search', 'reasoning_effort']
  },
  'gpt-5.2': {
    name: 'GPT-5.2',
    contextLimit: 400000,
    contextWarning: 300000,
    formatStyle: 'mixed',  // Markdown + XML
    reasoningEffort: ['none', 'low', 'medium', 'high'],
    features: ['web_browsing', 'dalle', 'code_interpreter', 'canvas', 'memory', 'thinking_mode']
  },
  'gpt-5': {
    name: 'GPT-5 / 5.1',
    contextLimit: 400000,
    contextWarning: 300000,
    formatStyle: 'markdown', // Markdown only
    reasoningEffort: ['none', 'minimal', 'low', 'medium', 'high'],
    features: ['web_browsing', 'dalle', 'code_interpreter', 'canvas', 'memory']
  }
};
```

#### UI Placement

- Render a small dropdown below the "ChatGPT" target button
- When version changes, dynamically update:
  - Token limit display (from `MODEL_TOKEN_LIMITS`)
  - Available features checkboxes
  - Formatter behavior (Markdown vs XML)
  - Reasoning effort options
- Default to `gpt-5.4` (latest)

#### Formatter Switching

```javascript
// In the formatters object, make GPT format dynamic
gpt: {
  wrap: (tag, content) => {
    if (gptVersion === 'gpt-5.4' || gptVersion === 'gpt-5.2') {
      return `<${tag.toLowerCase().replace(/\s+/g, '_')}>\n${content}\n</${tag.toLowerCase().replace(/\s+/g, '_')}>`;
    }
    return `**${tag}:**\n${content}`;
  },
  // ... similar for role and section
}
```

This is a **recommended enhancement** but not critical. The simpler approach (Changes 1-7) updates the tool to GPT-5.4 defaults, which covers the most common use case.

---

## Implementation Priority

### P0 — Critical (Apply immediately)

| Change | Description | Effort |
|---|---|---|
| Change 1 | Update token limits (128K → 1,050K) | 1 line |
| Change 7 | Update "GPT-4o mini" references to "GPT-5 Mini" | 5 occurrences |

### P1 — High (Apply in first update)

| Change | Description | Effort |
|---|---|---|
| Change 2 | Update model description and features list | ~20 lines |
| Change 3 | Add new GPT features (English) | ~30 lines |
| Change 4 | Add new GPT features (Czech) | ~30 lines |
| Change 5 | Update prompt formatter to XML tags | ~5 lines |
| Change 6 | Update features section formatting | ~3 lines |
| Change 8 | Add GPT XML context handling | ~6 lines |

### P2 — Enhancement (Apply when UI work is planned)

| Change | Description | Effort |
|---|---|---|
| Version Selector | Add GPT version dropdown with dynamic limits/formatting | ~80 lines |

### Total Estimated Impact

- **Files affected:** 1 (`app.js`)
- **Lines to change:** ~100 (P0+P1), ~180 with P2
- **Risk:** Low — all changes are additive or value updates. No structural changes to the tool.
- **Testing:** Verify token counter displays correctly, features render properly, generated prompts use correct formatting for each target.

---

## Appendix: Line Number Reference

| Line(s) | Content | Audit Status |
|---|---|---|
| 543-568 | GPT features (English) | OUTDATED — needs 4 new features |
| 896 | English verify model label | OUTDATED — says "GPT-4o mini" |
| 1771 | Czech verify model label | OUTDATED — says "GPT-4o mini" |
| 1995-2020 | GPT features (Czech) | OUTDATED — needs 4 new features |
| 2945-2949 | GPT token limits | CRITICAL — 128K should be 1,050K |
| 4583-4588 | GPT prompt formatter | OUTDATED — Markdown only, needs XML |
| 4874-4878 | GPT features section format | OUTDATED — uses Markdown heading |
| 5508-5513 | GPT target definition | OUTDATED — description and features |
| 5813, 5903, 5949 | Verify UI model label | OUTDATED — says "GPT-4o mini" |
