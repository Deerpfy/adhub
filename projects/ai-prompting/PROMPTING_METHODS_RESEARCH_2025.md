# Kompletní katalog výzkumem podložených metod promptingu

**Verze**: 3.0 (Aktualizace Feb 2025)
**Datum**: 2025-12-21
**Celkem metod**: 29 (15 původních 2020-2023 + 10 nových 2024 + 4 nejnovější 2025)

---

## Přehled všech metod s doporučením pro AI modely

### Legenda vhodnosti pro AI modely

| Symbol | Význam |
|--------|--------|
| **Claude** | Optimální pro Anthropic Claude (XML tagy, extended thinking) |
| **GPT** | Optimální pro OpenAI GPT-4/o1 (Markdown, reasoning models) |
| **Gemini** | Optimální pro Google Gemini (dlouhý kontext, multimodal) |
| **All** | Funguje dobře na všech modelech |

---

## ČÁST 1: Původní metody (2020-2023)

### 1. Chain-of-Thought (CoT)
| Atribut | Hodnota |
|---------|---------|
| **Citace** | [Wei et al., Google Brain 2022](https://arxiv.org/abs/2201.11903) |
| **Zlepšení** | +39pp na GSM8K |
| **Nejlepší pro** | **All** - univerzální, funguje na všech modelech |
| **Kategorie** | Coding, Analysis, Academic, Data |
| **Poznámka** | Efektivní pouze u modelů ≥100B parametrů. Pro GPT o1/o3 a Claude 3.5+ již integrováno. |

### 2. Zero-Shot CoT
| Atribut | Hodnota |
|---------|---------|
| **Citace** | [Kojima et al., U.Tokyo + Google 2022](https://arxiv.org/abs/2205.11916) |
| **Zlepšení** | +61pp na MultiArith |
| **Nejlepší pro** | **All** |
| **Trigger** | "Let's think step by step" |
| **Poznámka** | Pro reasoning modely (o1, Claude thinking) přeskočit - mají vlastní mechanismus. |

### 3. Few-Shot Learning
| Atribut | Hodnota |
|---------|---------|
| **Citace** | [Brown et al., OpenAI GPT-3 2020](https://arxiv.org/abs/2005.14165) |
| **Zlepšení** | 0%→90% přesnost |
| **Nejlepší pro** | **All** |
| **Poznámka** | Základ pro in-context learning. 3-5 příkladů optimální. |

### 4. Tree of Thoughts (ToT)
| Atribut | Hodnota |
|---------|---------|
| **Citace** | [Yao et al., Princeton + DeepMind 2023](https://arxiv.org/abs/2305.10601) |
| **Zlepšení** | 4%→74% na Game of 24 |
| **Nejlepší pro** | **Claude** (XML struktura), **GPT** (o1 reasoning) |
| **Kategorie** | Coding, Analysis |
| **Poznámka** | Vyžaduje více API volání. Pro jednoduché úlohy overkill. |

### 5. Self-Consistency
| Atribut | Hodnota |
|---------|---------|
| **Citace** | [Wang et al., Google Research 2022](https://arxiv.org/abs/2203.11171) |
| **Zlepšení** | +17.9% GSM8K |
| **Nejlepší pro** | **All** |
| **Kategorie** | Coding, Analysis |
| **Poznámka** | Výpočetně náročné - vyžaduje 3-5 generací. |

### 6. ReAct
| Atribut | Hodnota |
|---------|---------|
| **Citace** | [Yao et al., Princeton + Google 2022](https://arxiv.org/abs/2210.03629) |
| **Zlepšení** | +34% ALFWorld |
| **Nejlepší pro** | **Claude** (artifacts, computer use), **GPT** (function calling) |
| **Kategorie** | Coding, Analysis, Agentic tasks |
| **Poznámka** | Základ pro AI agenty. Kombinuje reasoning s akcemi. |

### 7. RISEN Framework
| Atribut | Hodnota |
|---------|---------|
| **Citace** | Kyle Balmer |
| **Struktura** | Role-Instructions-Steps-End Goal-Narrowing |
| **Nejlepší pro** | **All** |
| **Kategorie** | General, Business, Customer Service |
| **Poznámka** | Praktický framework pro strukturované prompty. |

### 8. EmotionPrompt
| Atribut | Hodnota |
|---------|---------|
| **Citace** | [Li et al., Microsoft + CAS 2023](https://arxiv.org/abs/2307.11760) |
| **Zlepšení** | +8% instruction, +115% BIG-Bench |
| **Nejlepší pro** | **All** - funguje všude |
| **Poznámka** | **2025 Update**: Na moderních modelech (GPT-4o, Claude 3.5) efektivita klesá. Stále užitečné pro motivaci. |

### 9. Plan-and-Solve
| Atribut | Hodnota |
|---------|---------|
| **Citace** | [Wang et al., SUTD 2023](https://arxiv.org/abs/2305.04091) |
| **Zlepšení** | +5% vs Zero-Shot-CoT |
| **Nejlepší pro** | **All** |
| **Kategorie** | Coding, Data, Business |
| **Poznámka** | Zero-shot plánování před řešením. |

### 10. Self-Ask
| Atribut | Hodnota |
|---------|---------|
| **Citace** | [Press et al., UW + Meta AI 2022](https://arxiv.org/abs/2210.03350) |
| **Zlepšení** | Multi-hop QA |
| **Nejlepší pro** | **All** |
| **Kategorie** | Analysis, Explanation, Academic |
| **Poznámka** | Skvělé pro komplexní výzkumné otázky. |

### 11. PAL (Program-Aided Language)
| Atribut | Hodnota |
|---------|---------|
| **Citace** | [Gao et al., CMU 2022](https://arxiv.org/abs/2211.10435) |
| **Zlepšení** | +40% GSM-Hard, +15% GSM8K |
| **Nejlepší pro** | **Claude** (analysis tool), **GPT** (Code Interpreter) |
| **Kategorie** | Coding, Data, Math |
| **Poznámka** | Nejlepší pro matematické a výpočetní úlohy. |

### 12. Self-Refine
| Atribut | Hodnota |
|---------|---------|
| **Citace** | [Madaan et al., CMU + AI2 + Google 2023](https://arxiv.org/abs/2303.17651) |
| **Zlepšení** | ~20% avg improvement |
| **Nejlepší pro** | **All** |
| **Kategorie** | Creative, Academic, Marketing |
| **Poznámka** | Iterativní zlepšování bez dodatečného tréninku. |

### 13. Step-Back Prompting
| Atribut | Hodnota |
|---------|---------|
| **Citace** | [Zheng et al., Google DeepMind 2023](https://arxiv.org/abs/2310.06117) |
| **Zlepšení** | +27% TimeQA, +36% vs CoT |
| **Nejlepší pro** | **Gemini** (Google research), **Claude** |
| **Kategorie** | Analysis, Explanation, Academic, Summarization |
| **Poznámka** | Abstrakce k high-level principům před řešením. |

### 14. Analogical Prompting
| Atribut | Hodnota |
|---------|---------|
| **Citace** | [Yasunaga et al., DeepMind + Stanford 2023](https://arxiv.org/abs/2310.01714) |
| **Zlepšení** | +5% vs 0-shot CoT |
| **Nejlepší pro** | **Gemini**, **GPT** |
| **Kategorie** | Creative, Explanation, Marketing |
| **Poznámka** | LLM generuje vlastní příklady. 3-5 příkladů optimální. |

### 15. Rephrase & Respond (RaR)
| Atribut | Hodnota |
|---------|---------|
| **Citace** | [Deng et al., UCLA 2023](https://arxiv.org/abs/2311.04205) |
| **Zlepšení** | Redukce nejednoznačnosti |
| **Nejlepší pro** | **All** |
| **Kategorie** | General, Creative, Explanation, Email, Marketing |
| **Poznámka** | Přeformulování otázky před odpovědí. |

---

## ČÁST 2: Nové metody 2024-2025

### 16. Skeleton-of-Thought (SoT)
| Atribut | Hodnota |
|---------|---------|
| **Citace** | [Ning et al., Microsoft + Tsinghua, ICLR 2024](https://arxiv.org/abs/2307.15337) |
| **Zlepšení** | 2.39× rychlejší, 60% lepší kvalita |
| **Nejlepší pro** | **GPT** (parallel processing), **Claude** |
| **Kategorie** | General, Creative, Business, Email, Summarization |
| **Jak funguje** | Nejprve vytvoří kostru odpovědi, pak paralelně expanduje každý bod |
| **Omezení** | Nevhodné pro step-by-step reasoning (math, coding) |
| **Poznámka** | Ideální pro strukturované dokumenty, reporty, eseje. |

### 17. Graph of Thoughts (GoT)
| Atribut | Hodnota |
|---------|---------|
| **Citace** | [Besta et al., ETH Zürich, AAAI 2024](https://arxiv.org/abs/2308.09687) |
| **Zlepšení** | +62% na sorting, -31% nákladů vs ToT |
| **Nejlepší pro** | **Claude** (extended thinking), **GPT** (o1/o3) |
| **Kategorie** | Coding, Analysis, Academic, Data |
| **Jak funguje** | Myšlenky jako graf s větvením, kombinováním a backtrackingem |
| **Poznámka** | Nejpokročilejší reasoning framework. Vyžaduje orchestraci. |

### 18. Buffer of Thoughts (BoT)
| Atribut | Hodnota |
|---------|---------|
| **Citace** | [Yang et al., Peking + Stanford, NeurIPS 2024 Spotlight](https://arxiv.org/abs/2406.04271) |
| **Zlepšení** | +51% Checkmate-in-One, +20% Geometric Shapes |
| **Nejlepší pro** | **Claude**, **GPT** |
| **Kategorie** | Coding, Analysis, Academic, Data |
| **Jak funguje** | Meta-buffer s thought-templates, retrieval a instantiace |
| **Poznámka** | Pouze 12% nákladů oproti ToT/GoT. Skaluje s počtem řešených problémů. |

### 19. Thread of Thought (ThoT)
| Atribut | Hodnota |
|---------|---------|
| **Citace** | [Zhou et al., NAVER 2024](https://arxiv.org/abs/2311.08734) |
| **Zlepšení** | Signifikantní zlepšení na chaotických kontextech |
| **Nejlepší pro** | **Gemini** (1M context), **Claude** (200K) |
| **Kategorie** | Analysis, Explanation, Summarization |
| **Trigger** | "Walk me through this context in manageable parts step by step, summarizing and analyzing as we go" |
| **Jak funguje** | Segmentuje komplexní kontext, sumarizuje průběžně |
| **Poznámka** | Ideální pro RAG s mnoha dokumenty, dlouhé konverzace. |

### 20. System 2 Attention (S2A)
| Atribut | Hodnota |
|---------|---------|
| **Citace** | [Weston et al., Meta AI 2024](https://arxiv.org/abs/2311.11829) |
| **Zlepšení** | 62.8%→80.3% faktičnost, +10% GSM-IC |
| **Nejlepší pro** | **Claude**, **GPT** |
| **Kategorie** | Analysis, Academic, Summarization |
| **Jak funguje** | Přepíše kontext, odstraní irelevantní/zavádějící info |
| **Poznámka** | Inspirováno Kahnemanovým System 1/2 myšlením. Skvělé proti hallucinations. |

### 21. Meta-Prompting
| Atribut | Hodnota |
|---------|---------|
| **Citace** | [Suzgun et al., Stanford 2024](https://github.com/suzgunmirac/meta-prompting) |
| **Zlepšení** | +17.1% vs standard prompting |
| **Nejlepší pro** | **Claude** (multi-turn), **GPT** |
| **Kategorie** | Coding, Analysis, Business |
| **Jak funguje** | LLM jako dirigent orchestruje více "expertních" instancí |
| **Poznámka** | Jeden model, více expertních perspektiv. Ideální pro komplexní projekty. |

### 22. Reflexion
| Atribut | Hodnota |
|---------|---------|
| **Citace** | [Shinn et al., Princeton, NeurIPS 2023](https://arxiv.org/abs/2303.11366) |
| **Zlepšení** | SOTA na code generation benchmarks |
| **Nejlepší pro** | **Claude** (artifacts, memory), **GPT** |
| **Kategorie** | Coding, Creative, Marketing, Customer Service |
| **Jak funguje** | Verbal RL s episodickou pamětí, self-reflection loop |
| **Poznámka** | Základ pro self-improving agenty. 3 iterace obvykle stačí. |

### 23. Contrastive Chain-of-Thought
| Atribut | Hodnota |
|---------|---------|
| **Citace** | [Chia et al., Alibaba DAMO 2024](https://github.com/DAMO-NLP-SG/contrastive-cot) |
| **Zlepšení** | +17.8% přesnost (CD-CoT) |
| **Nejlepší pro** | **All** |
| **Kategorie** | Analysis, Academic, Translation |
| **Jak funguje** | Učení z pozitivních i negativních příkladů |
| **Poznámka** | Ukazuje CO dělat i CO NEDĚLAT. Redukuje běžné chyby. |

### 24. OPRO (Optimization by PROmpting)
| Atribut | Hodnota |
|---------|---------|
| **Citace** | [Yang et al., Google DeepMind 2024](https://arxiv.org/abs/2309.03409) |
| **Zlepšení** | +8% GSM8K, +50% BIG-Bench Hard |
| **Nejlepší pro** | **Gemini** (Google), **GPT**, **Claude** |
| **Kategorie** | General, Productivity |
| **Meta-prompt** | "Take a deep breath and work on this problem step by step" |
| **Jak funguje** | LLM iterativně optimalizuje vlastní prompty |
| **Poznámka** | Automatická prompt optimization. Nejlepší pro opakované úlohy. |

### 25. Confidence Calibration
| Atribut | Hodnota |
|---------|---------|
| **Citace** | [Xiong et al., ICLR 2024](https://arxiv.org/abs/2306.13063) |
| **Zlepšení** | Lepší kalibrace, redukce overconfidence |
| **Nejlepší pro** | **Claude** (honest by design), **GPT** |
| **Kategorie** | General, Analysis, Academic, Data, Business |
| **Jak funguje** | Explicitní vyjádření úrovně jistoty (0-100%) |
| **Poznámka** | LLMs jsou přirozeně overconfident (80-100%). Pomáhá identifikovat nejistoty. |

---

## ČÁST 3: Nejnovější metody 2025

### 26. Chain of Draft (CoD)
| Atribut | Hodnota |
|---------|---------|
| **Citace** | [Xu et al., Zoom Research Feb 2025](https://arxiv.org/abs/2502.18600) |
| **Zlepšení** | 80% redukce tokenů, 76.2% rychlejší inference, 91.1% přesnost |
| **Nejlepší pro** | **All** - univerzální optimalizace |
| **Kategorie** | General, Data, Summarization, Email, Business |
| **Trigger** | "Think step by step, but keep each thinking step to 5 words at most. Return answer after ####." |
| **Jak funguje** | Minimalistické reasoning - každý krok max ~5 slov |
| **Poznámka** | Nejefektivnější metoda 2025. Ideální pro produkci kde záleží na nákladech. |

### 27. Self-Discover
| Atribut | Hodnota |
|---------|---------|
| **Citace** | [Zhou et al., Google DeepMind 2024](https://deepmind.google/research/publications/64816/) |
| **Zlepšení** | +32% vs CoT, 10-40× méně compute než Self-Consistency |
| **Nejlepší pro** | **GPT**, **Claude**, **Gemini** |
| **Kategorie** | General, Coding, Analysis, Academic, Business |
| **Jak funguje** | LLM vybírá a adaptuje reasoning moduly (dekompozice, kritické myšlení, atd.) pro konkrétní úkol |
| **Poznámka** | Task-specific reasoning. Struktura jako JSON pro lepší interpretovatelnost. |

### 28. rStar MCTS
| Atribut | Hodnota |
|---------|---------|
| **Citace** | [rStar-Math, Microsoft + CMU Jan 2025](https://arxiv.org/abs/2501.04519) |
| **Zlepšení** | 7B model dosahuje 90% MATH (vs o1-preview 85.5%), 53.3% AIME |
| **Nejlepší pro** | **Claude**, **GPT**, malé modely (Llama, Mistral) |
| **Kategorie** | Coding, Data, Academic (zejména matematika) |
| **Jak funguje** | Monte Carlo Tree Search - generuje více cest, vyhodnocuje, vybírá nejlepší |
| **Poznámka** | Umožňuje malým modelům konkurovat velkým. GPU náročné. |

### 29. Slow Thinking (Extended Deliberation)
| Atribut | Hodnota |
|---------|---------|
| **Citace** | [DeepSeek R1](https://arxiv.org/abs/2501.12948), [OpenAI o1/o3](https://openai.com/o1/) 2025 |
| **Zlepšení** | Nativní v reasoning modelech - nejlepší pro komplexní problémy |
| **Nejlepší pro** | **GPT o1/o3** (nativní), **DeepSeek R1** (nativní), **Claude** (extended thinking) |
| **Kategorie** | Coding, Analysis, Academic (složité problémy) |
| **Trigger** | "Wait... let me think about this more carefully. Hmm, I should consider..." |
| **Jak funguje** | Rozšířená deliberace s váhacími značkami ("wait", "hmm", "let me reconsider") |
| **Poznámka** | ThinkPO studie: +8.6% math accuracy, +25.9% délka output. Použít jen pro složité problémy. |

---

## Matice doporučení: Metoda × AI Model (Aktualizováno 2025)

| Metoda | Claude | GPT-4/o1 | Gemini | Llama | DeepSeek |
|--------|--------|----------|--------|-------|----------|
| CoT | Nativní | o1 má | Ano | Ano | R1 má |
| Few-Shot | XML tagy | Markdown | Headers | Tokens | Markdown |
| ToT | Výborné | Výborné | Dobré | Dobré | Dobré |
| ReAct | Tools | Functions | Dobré | Omezené | Omezené |
| SoT | Výborné | Výborné | Výborné | Dobré | Dobré |
| GoT | Výborné | Výborné | Dobré | Omezené | Omezené |
| BoT | Výborné | Výborné | Dobré | Dobré | Dobré |
| ThoT | 200K ctx | 128K ctx | 1M ctx | 128K ctx | 64K ctx |
| S2A | Výborné | Výborné | Dobré | Dobré | Dobré |
| Meta-Prompt | Výborné | Výborné | Dobré | Omezené | Omezené |
| Reflexion | Artifacts | Memory | Omezené | Omezené | Omezené |
| Contrastive | Výborné | Výborné | Výborné | Výborné | Výborné |
| OPRO | Dobré | Dobré | Výborné | Dobré | Dobré |
| Confidence | Výborné | Dobré | Dobré | Dobré | Dobré |

---

## Doporučené kombinace metod

### Pro maximální kvalitu odpovědi
```
EmotionPrompt + CoT + Self-Consistency + Self-Refine
```

### Pro rychlost a strukturu
```
SoT + Confidence
```

### Pro komplexní analýzu
```
ThoT + S2A + GoT + Confidence
```

### Pro coding a debugging
```
PAL + Reflexion + Contrastive + Self-Refine
```

### Pro kreativní úlohy
```
EmotionPrompt + Analogical + Self-Refine + Reflexion
```

### Pro agentic tasks
```
ReAct + Reflexion + Meta-Prompting
```

---

## Zdroje a reference

### Původní papers (2020-2023)
1. [Chain-of-Thought Prompting](https://arxiv.org/abs/2201.11903) - Google Brain
2. [Zero-Shot CoT](https://arxiv.org/abs/2205.11916) - U.Tokyo + Google
3. [GPT-3 Few-Shot Learning](https://arxiv.org/abs/2005.14165) - OpenAI
4. [Tree of Thoughts](https://arxiv.org/abs/2305.10601) - Princeton + DeepMind
5. [Self-Consistency](https://arxiv.org/abs/2203.11171) - Google Research
6. [ReAct](https://arxiv.org/abs/2210.03629) - Princeton + Google
7. [EmotionPrompt](https://arxiv.org/abs/2307.11760) - Microsoft + CAS
8. [Plan-and-Solve](https://arxiv.org/abs/2305.04091) - SUTD
9. [Self-Ask](https://arxiv.org/abs/2210.03350) - UW + Meta AI
10. [PAL](https://arxiv.org/abs/2211.10435) - CMU
11. [Self-Refine](https://arxiv.org/abs/2303.17651) - CMU + AI2 + Google
12. [Step-Back Prompting](https://arxiv.org/abs/2310.06117) - Google DeepMind
13. [Analogical Prompting](https://arxiv.org/abs/2310.01714) - DeepMind + Stanford
14. [Rephrase & Respond](https://arxiv.org/abs/2311.04205) - UCLA

### Nové papers (2024-2025)
15. [Skeleton-of-Thought](https://arxiv.org/abs/2307.15337) - Microsoft + Tsinghua (ICLR 2024)
16. [Graph of Thoughts](https://arxiv.org/abs/2308.09687) - ETH Zürich (AAAI 2024)
17. [Buffer of Thoughts](https://arxiv.org/abs/2406.04271) - Peking + Stanford (NeurIPS 2024)
18. [Thread of Thought](https://arxiv.org/abs/2311.08734) - NAVER
19. [System 2 Attention](https://arxiv.org/abs/2311.11829) - Meta AI
20. [Meta-Prompting](https://arxiv.org/abs/2401.12954) - Stanford
21. [Reflexion](https://arxiv.org/abs/2303.11366) - Princeton (NeurIPS 2023)
22. [Contrastive CoT](https://github.com/DAMO-NLP-SG/contrastive-cot) - Alibaba DAMO
23. [OPRO](https://arxiv.org/abs/2309.03409) - Google DeepMind
24. [Confidence Calibration](https://arxiv.org/abs/2306.13063) - ICLR 2024

### Nejnovější papers (2025)
25. [Chain of Draft](https://arxiv.org/abs/2502.18600) - Zoom Research (Feb 2025)
26. [Self-Discover](https://deepmind.google/research/publications/64816/) - Google DeepMind
27. [rStar-Math](https://arxiv.org/abs/2501.04519) - Microsoft + CMU (Jan 2025)
28. [DeepSeek R1](https://arxiv.org/abs/2501.12948) - DeepSeek (Jan 2025)
29. [Thinking Preference Optimization](https://arxiv.org/abs/2502.13173) - Feb 2025

### Survey papers
- [The Prompt Report 2025](https://arxiv.org/abs/2406.06608) - 58 technik, 33 termínů
- [Efficient Prompting Survey](https://arxiv.org/abs/2404.01077) - Optimalizace a komprese
- [Systematic Survey of Prompt Engineering](https://arxiv.org/abs/2402.07927) - Kategorizace podle aplikací

---

*Tento dokument je průběžně aktualizován na základě nejnovějších výzkumů v oblasti LLM promptingu.*
