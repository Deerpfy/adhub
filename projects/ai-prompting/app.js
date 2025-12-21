function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback
} = React;

// ==================== AVAILABLE LANGUAGES ====================
// Manual translations only - no API calls
// ==================== GEO-LOCATION BASED LANGUAGE DETECTION ====================
const GEO_CACHE_KEY = 'adhub_geo_country';
const GEO_CACHE_TIME_KEY = 'adhub_geo_cache_time';
const GEO_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const CZECH_COUNTRIES = ['CZ', 'SK'];
async function detectCountryFromIP() {
  const cachedCountry = localStorage.getItem(GEO_CACHE_KEY);
  const cacheTime = localStorage.getItem(GEO_CACHE_TIME_KEY);
  if (cachedCountry && cacheTime) {
    const age = Date.now() - parseInt(cacheTime, 10);
    if (age < GEO_CACHE_DURATION) {
      return cachedCountry;
    }
  }
  try {
    const response = await fetch('https://ipapi.co/country_code/', {
      method: 'GET',
      headers: {
        'Accept': 'text/plain'
      },
      signal: AbortSignal.timeout(5000)
    });
    if (response.ok) {
      const countryCode = (await response.text()).trim().toUpperCase();
      if (countryCode && countryCode.length === 2) {
        localStorage.setItem(GEO_CACHE_KEY, countryCode);
        localStorage.setItem(GEO_CACHE_TIME_KEY, Date.now().toString());
        return countryCode;
      }
    }
  } catch (e) {/* ignore */}
  try {
    const response = await fetch('http://ip-api.com/json/?fields=countryCode', {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    if (response.ok) {
      const data = await response.json();
      if (data.countryCode) {
        const countryCode = data.countryCode.toUpperCase();
        localStorage.setItem(GEO_CACHE_KEY, countryCode);
        localStorage.setItem(GEO_CACHE_TIME_KEY, Date.now().toString());
        return countryCode;
      }
    }
  } catch (e) {/* ignore */}
  return null;
}
async function initializeLanguageFromGeo() {
  const savedLang = localStorage.getItem('ai-prompt-lang');
  if (savedLang) return savedLang;
  const country = await detectCountryFromIP();
  if (country && CZECH_COUNTRIES.includes(country)) return 'cs';
  return navigator.language.startsWith('cs') ? 'cs' : 'en';
}
// ==================== END GEO-LOCATION ====================

const AVAILABLE_LANGUAGES = [{
  code: 'en',
  name: 'English',
  native: 'English',
  flag: '🇬🇧'
}, {
  code: 'cs',
  name: 'Czech',
  native: 'Čeština',
  flag: '🇨🇿'
}];

// Legacy alias for backward compatibility
const languages = AVAILABLE_LANGUAGES;

// ==================== BASE TRANSLATIONS (Manual - EN + CS) ====================
const BASE_TRANSLATIONS = {
  en: {
    title: 'AI Prompt Formatter',
    subtitle: 'Research-backed prompting techniques from 2025 studies • v2.0',
    version: 'v2.0',
    backToHub: 'Back to Hub',
    searchLanguage: 'Search language...',
    templates: {
      general: {
        name: 'General Task',
        desc: 'Flexible format for any task',
        context: ''
      },
      coding: {
        name: 'Coding Help',
        desc: 'Debug, write, or explain code',
        context: 'Focus on writing clean, efficient, and well-documented code. Include code comments where helpful.'
      },
      creative: {
        name: 'Creative Writing',
        desc: 'Stories, content, copywriting',
        context: 'Focus on creativity, engaging narrative, and vivid language. Be original and expressive.'
      },
      analysis: {
        name: 'Analysis',
        desc: 'Research, compare, evaluate',
        context: 'Provide thorough analysis with evidence-based reasoning. Consider multiple perspectives and cite sources where applicable.'
      },
      explanation: {
        name: 'Explanation',
        desc: 'Teach or clarify concepts',
        context: 'Explain clearly for the target audience. Use analogies and examples to make complex concepts accessible.'
      },
      // New categories from 2025 usage research
      email: {
        name: 'Professional Email',
        desc: 'Business communication, outreach',
        context: 'Write professional, clear, and effective email communication. Consider tone, structure, and call-to-action.'
      },
      academic: {
        name: 'Academic Writing',
        desc: 'Research papers, essays, citations',
        context: 'Follow academic standards. Use proper structure, citations, and evidence-based arguments.'
      },
      data: {
        name: 'Data & Spreadsheets',
        desc: 'Excel formulas, SQL, data analysis',
        context: 'Focus on accurate data manipulation. Provide formulas, queries, or scripts with clear explanations.'
      },
      marketing: {
        name: 'Marketing & SEO',
        desc: 'Ads, social media, SEO content',
        context: 'Create engaging, conversion-focused content. Optimize for target audience and platform requirements.'
      },
      summarization: {
        name: 'Summarization',
        desc: 'Condense documents, key points',
        context: 'Extract key information clearly and concisely. Maintain accuracy while reducing length.'
      },
      image_gen: {
        name: 'Image Generation',
        desc: 'DALL-E, Midjourney, Stable Diffusion',
        context: 'Craft detailed visual descriptions. Include style, mood, composition, and specific artistic elements.'
      },
      translation: {
        name: 'Translation',
        desc: 'Language translation, localization',
        context: 'Translate accurately while preserving meaning, tone, and cultural context.'
      },
      business: {
        name: 'Business Documents',
        desc: 'Reports, proposals, presentations',
        context: 'Create professional business documents with clear structure, data-driven insights, and actionable recommendations.'
      },
      customer_service: {
        name: 'Customer Service',
        desc: 'Support responses, FAQs',
        context: 'Provide helpful, empathetic, and solution-oriented customer responses.'
      },
      productivity: {
        name: 'Productivity',
        desc: 'Planning, organization, goals',
        context: 'Help with personal organization, goal setting, and task management. Be practical and actionable.'
      }
    },
    fields: {
      role: {
        label: 'Role / Persona',
        placeholder: 'e.g., an expert technical writer'
      },
      task: {
        label: 'Task',
        placeholder: 'e.g., Write documentation for a REST API endpoint'
      },
      context: {
        label: 'Context / Background',
        placeholder: 'e.g., This is for a fintech startup'
      },
      constraints: {
        label: 'Constraints / Requirements',
        placeholder: 'e.g., Keep it concise, use examples'
      },
      steps: {
        label: 'Steps to Follow',
        placeholder: 'Enter each step on a new line...'
      },
      outputFormat: {
        label: 'Output Format',
        placeholder: 'e.g., Markdown with headers and code blocks'
      },
      expectations: {
        label: 'Expectations / End Goal',
        placeholder: 'e.g., Clear, actionable documentation'
      },
      examples: {
        label: 'Examples (optional)',
        placeholder: 'e.g., Input: ... → Output: ...'
      },
      fewshot: {
        label: 'Few-Shot Examples (Input → Output)',
        placeholder: 'Input: ... → Output: ...'
      }
    },
    // Enhanced examples section translations
    examplesSection: {
      title: 'Examples with File Format',
      fileType: 'Data Format',
      fileTypes: {
        none: {
          name: 'Plain Text',
          desc: 'Simple text examples'
        },
        excel: {
          name: 'Excel/Spreadsheet',
          desc: 'Rows & columns structure'
        },
        csv: {
          name: 'CSV',
          desc: 'Comma-separated values'
        },
        json: {
          name: 'JSON',
          desc: 'Key-value pairs'
        },
        table: {
          name: 'Table',
          desc: 'Structured table format'
        }
      },
      params: {
        columnSeparator: 'Column separator',
        rowDescription: 'Row structure',
        headers: 'Column headers',
        headersPlaceholder: 'e.g., Name | Age | City'
      },
      addRow: 'Add row (+)',
      removeRow: 'Remove',
      rowPlaceholder: 'Example row data...',
      rowSeparatorHint: 'Use (+) button to add separated example rows',
      structurePreview: 'Structure preview'
    },
    methods: {
      title: 'Research-Backed Methods',
      active: 'method(s) active',
      recommended: 'Recommended',
      showAll: 'Show all',
      hideOthers: 'Hide others',
      bestFor: 'Best for this category',
      selectMethods: 'Select Methods',
      closeMethods: 'Done',
      clearAll: 'Clear All',
      groups: {
        reasoning: 'Reasoning & Thinking',
        efficiency: 'Efficiency & Speed',
        selfImprovement: 'Self-Improvement',
        inContext: 'In-Context Learning',
        structured: 'Structured & Agentic',
        quality: 'Output Quality'
      },
      cot: {
        name: 'Chain-of-Thought',
        citation: 'Google Brain 2022',
        tip: 'Best for math, logic, multi-step problems. +39pp on GSM8K.'
      },
      zeroshot: {
        name: 'Zero-Shot CoT',
        citation: 'U.Tokyo + Google 2022',
        tip: '"Let\'s think step by step" - no examples needed. +61pp on MultiArith.'
      },
      fewshot: {
        name: 'Few-Shot Learning',
        citation: 'OpenAI 2020',
        tip: 'Learn from 1-10 examples. Can improve accuracy 0%→90%.'
      },
      tot: {
        name: 'Tree of Thoughts',
        citation: 'Princeton + DeepMind 2023',
        tip: 'Explore multiple paths with backtracking. 4%→74% on Game of 24.'
      },
      selfconsistency: {
        name: 'Self-Consistency',
        citation: 'Google Research 2022',
        tip: 'Multiple reasoning paths, majority vote. +17.9% on GSM8K.'
      },
      react: {
        name: 'ReAct',
        citation: 'Princeton + Google 2022',
        tip: 'Thought-Action-Observation cycle for tool use. +34% on ALFWorld.'
      },
      risen: {
        name: 'RISEN Framework',
        citation: 'Kyle Balmer',
        tip: 'Role-Instructions-Steps-End Goal-Narrowing structure.'
      },
      emotion: {
        name: 'EmotionPrompt',
        citation: 'Microsoft + CAS 2023',
        tip: 'Emotional stimuli boost performance. +8% instruction, +115% BIG-Bench.'
      },
      plansolve: {
        name: 'Plan-and-Solve',
        citation: 'SUTD 2023',
        tip: 'Zero-shot planning before solving. +5% over Zero-Shot-CoT.'
      },
      selfask: {
        name: 'Self-Ask',
        citation: 'UW + Meta AI 2022',
        tip: 'Ask follow-up questions until solved. Great for multi-hop QA.'
      },
      pal: {
        name: 'PAL (Program-Aided)',
        citation: 'CMU 2022',
        tip: 'Generate code for calculations. +40% on GSM-Hard.'
      },
      selfrefine: {
        name: 'Self-Refine',
        citation: 'CMU + AI2 + Google 2023',
        tip: 'Generate→Feedback→Refine loop. ~20% avg improvement.'
      },
      stepback: {
        name: 'Step-Back Prompting',
        citation: 'Google DeepMind 2023',
        tip: 'Abstract to high-level principles first. +27% on TimeQA.'
      },
      analogical: {
        name: 'Analogical Prompting',
        citation: 'DeepMind + Stanford 2023',
        tip: 'Generate own relevant examples. +5% over 0-shot CoT.'
      },
      rar: {
        name: 'Rephrase & Respond',
        citation: 'UCLA 2023',
        tip: 'Rephrase question before answering. Reduces ambiguity.'
      },
      // === NEW 2024-2025 RESEARCH-BACKED METHODS ===
      sot: {
        name: 'Skeleton-of-Thought',
        citation: 'Microsoft + Tsinghua ICLR 2024',
        tip: 'Parallel answer generation. 2.39× faster, better for structured outputs.'
      },
      got: {
        name: 'Graph of Thoughts',
        citation: 'ETH Zürich AAAI 2024',
        tip: 'Non-linear reasoning with graph structure. +62% on sorting tasks.'
      },
      bot: {
        name: 'Buffer of Thoughts',
        citation: 'Peking + Stanford NeurIPS 2024',
        tip: 'Meta-cognitive templates for reasoning. +51% on Checkmate-in-One.'
      },
      thot: {
        name: 'Thread of Thought',
        citation: 'NAVER 2024',
        tip: 'Handles chaotic contexts. Segments and analyzes step by step.'
      },
      s2a: {
        name: 'System 2 Attention',
        citation: 'Meta AI 2024',
        tip: 'Filters irrelevant info from context. 62.8%→80.3% factuality.'
      },
      metaprompt: {
        name: 'Meta-Prompting',
        citation: 'Stanford 2024',
        tip: 'LLM as conductor + multi-expert system. +17.1% on complex tasks.'
      },
      reflexion: {
        name: 'Reflexion',
        citation: 'Princeton NeurIPS 2023',
        tip: 'Verbal reinforcement learning with memory. Self-improving agent.'
      },
      contrastive: {
        name: 'Contrastive CoT',
        citation: 'Alibaba DAMO 2024',
        tip: 'Learn from both correct AND incorrect examples. +17.8% accuracy.'
      },
      opro: {
        name: 'OPRO',
        citation: 'Google DeepMind 2024',
        tip: 'LLM optimizes its own prompts. +8% GSM8K, +50% BIG-Bench.'
      },
      confidence: {
        name: 'Confidence Calibration',
        citation: 'ICLR 2024',
        tip: 'Express uncertainty honestly. Calibrated confidence levels.'
      },
      // === 2025 CUTTING-EDGE METHODS ===
      cod: {
        name: 'Chain of Draft',
        citation: 'Zoom Research Feb 2025',
        tip: 'Minimal reasoning (~5 words/step). 80% less tokens, same accuracy.'
      },
      selfdiscover: {
        name: 'Self-Discover',
        citation: 'Google DeepMind 2024',
        tip: 'LLM discovers task-specific reasoning. +32% vs CoT, 10-40× less compute.'
      },
      rstar: {
        name: 'rStar MCTS',
        citation: 'Microsoft Jan 2025',
        tip: 'Monte Carlo Tree Search. 7B model rivals o1-preview on MATH (90%).'
      },
      slowthink: {
        name: 'Slow Thinking',
        citation: 'DeepSeek R1 / OpenAI o1 2025',
        tip: 'Extended deliberation with hesitation markers. For complex problems.'
      }
    },
    // Model-specific features (2025) - optional capabilities per AI model
    modelFeatures: {
      title: 'Model Features',
      subtitle: 'Optional model-specific capabilities',
      none: 'No special features',
      claude: {
        extended_thinking: {
          name: 'Extended Thinking',
          desc: 'Deep reasoning mode for complex problems',
          promptTag: 'Enable extended thinking for deep analysis.'
        },
        research: {
          name: 'Research (Web)',
          desc: 'Access real-time web information',
          promptTag: 'Use web search to find current information.'
        },
        artifacts: {
          name: 'Artifacts',
          desc: 'Create interactive components',
          promptTag: 'Create an artifact for this output.'
        },
        analysis: {
          name: 'Analysis Tool',
          desc: 'Execute code for data analysis',
          promptTag: 'Use the analysis tool to process data.'
        }
      },
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
      gemini: {
        google_search: {
          name: 'Google Search',
          desc: 'Real-time web search',
          promptTag: 'Search Google for current information.'
        },
        code_execution: {
          name: 'Code Execution',
          desc: 'Run Python code',
          promptTag: 'Execute code to solve this problem.'
        },
        deep_research: {
          name: 'Deep Research',
          desc: 'Comprehensive research mode',
          promptTag: 'Conduct deep research on this topic.'
        }
      },
      llama: {
        code_llama: {
          name: 'Code Mode',
          desc: 'Optimized for coding tasks',
          promptTag: 'Focus on code generation and analysis.'
        }
      },
      mistral: {
        code_mode: {
          name: 'Code Mode',
          desc: 'Optimized coding responses',
          promptTag: 'Optimize for code generation.'
        },
        function_calling: {
          name: 'Function Calling',
          desc: 'Structured tool use',
          promptTag: 'Use function calling for structured output.'
        }
      },
      cohere: {
        rag: {
          name: 'RAG Mode',
          desc: 'Retrieval-augmented generation',
          promptTag: 'Use retrieval-augmented generation.'
        },
        web_search: {
          name: 'Web Search',
          desc: 'Search for information',
          promptTag: 'Search the web for relevant information.'
        }
      },
      grok: {
        realtime: {
          name: 'Real-time Data',
          desc: 'Access live X/Twitter data',
          promptTag: 'Use real-time data from X/Twitter.'
        },
        think: {
          name: 'Think Mode',
          desc: 'Extended reasoning',
          promptTag: 'Enable deep thinking mode.'
        },
        deepsearch: {
          name: 'DeepSearch',
          desc: 'Comprehensive web search',
          promptTag: 'Use DeepSearch for comprehensive results.'
        }
      },
      deepseek: {
        deep_think: {
          name: 'Deep Think (R1)',
          desc: 'Advanced reasoning mode',
          promptTag: 'Enable Deep Think mode for complex reasoning.'
        },
        code_mode: {
          name: 'Code Mode',
          desc: 'Optimized for programming',
          promptTag: 'Focus on code generation and analysis.'
        },
        search: {
          name: 'Web Search',
          desc: 'Search for information',
          promptTag: 'Search the web for current information.'
        }
      },
      general: {}
    },
    // Extended sections for advanced prompting (inspired by web-analysis-prompt.md)
    extendedSections: {
      title: 'Extended Sections',
      subtitle: 'Advanced formatting options for specialized prompts',
      toggleShow: 'Show extended options',
      toggleHide: 'Hide extended options',
      // Analysis areas
      analysisAreas: {
        label: 'Analysis Areas',
        placeholder: 'e.g., Visual design, UI components, UX analysis...',
        options: {
          visual_design: {
            name: 'Visual Design',
            desc: 'Colors, typography, visual consistency'
          },
          ui_components: {
            name: 'UI Components',
            desc: 'Buttons, forms, navigation, modals'
          },
          ux_analysis: {
            name: 'UX Analysis',
            desc: 'User flow, accessibility, responsiveness'
          },
          content_analysis: {
            name: 'Content Analysis',
            desc: 'SEO, structure, multimedia'
          },
          technical_elements: {
            name: 'Technical Elements',
            desc: 'Animations, APIs, performance'
          },
          legal_compliance: {
            name: 'Legal Compliance',
            desc: 'GDPR, cookies, privacy policy'
          }
        }
      },
      // Technical output specification
      technicalOutput: {
        label: 'Technical Output',
        placeholder: 'Specify technical details to include...',
        options: {
          css: {
            name: 'CSS',
            desc: 'Styles, properties, values'
          },
          html: {
            name: 'HTML',
            desc: 'Structure, semantics, accessibility'
          },
          javascript: {
            name: 'JavaScript/TypeScript',
            desc: 'Functions, logic, interactions'
          },
          python: {
            name: 'Python',
            desc: 'Backend, scripts, automation'
          }
        }
      },
      // Priority rating
      priorityRating: {
        label: 'Priority Rating',
        placeholder: 'Rate recommendations by priority...',
        enabled: 'Enable priority ratings',
        levels: {
          critical: 'CRITICAL - Immediate fix required',
          high: 'HIGH - Important for functionality/UX',
          medium: 'MEDIUM - Quality improvement',
          low: 'LOW - Nice-to-have enhancement'
        }
      },
      // Focus areas
      focusAreas: {
        label: 'Focus Areas',
        primary: {
          label: 'Primary Focus',
          placeholder: 'e.g., e-commerce conversion, SEO, accessibility'
        },
        secondary: {
          label: 'Secondary Focus',
          placeholder: 'e.g., mobile UX, loading speed'
        },
        ignore: {
          label: 'Ignore',
          placeholder: 'e.g., backend aspects, content quality'
        }
      },
      // Target URL
      targetUrl: {
        label: 'Target URL',
        placeholder: 'https://example.com'
      },
      // Competitor comparison
      competitorComparison: {
        label: 'Competitor Comparison',
        placeholder: 'Enter competitor URLs...',
        addBtn: 'Add competitor',
        instruction: 'Compare key aspects with these competitors.'
      },
      // Final deliverables
      deliverables: {
        label: 'Final Deliverables',
        placeholder: 'e.g., Complete report, prioritized list, technical specs...',
        options: {
          report: 'Comprehensive analysis report',
          recommendations: 'Prioritized recommendations list',
          tech_specs: 'Technical specifications for developers',
          checklist: 'Implementation checklist'
        }
      },
      // Template-specific options
      emailStyle: {
        label: 'Email Style',
        options: {
          formal: 'Formal / Official',
          colleagues: 'Colleagues / Professional',
          friendly: 'Friendly / Casual',
          request: 'Request / Inquiry',
          complaint: 'Complaint / Issue',
          thankyou: 'Thank you / Appreciation'
        }
      },
      emailLanguage: {
        label: 'Output Language',
        placeholder: 'e.g., English, Czech, German...'
      },
      translationStyle: {
        label: 'Translation Style',
        options: {
          formal: 'Formal / Professional',
          literal: 'Literal / Word-by-word',
          natural: 'Natural word order',
          creative: 'Creative / Localized',
          technical: 'Technical / Precise'
        }
      },
      supportTone: {
        label: 'Response Tone',
        options: {
          marketing: 'Marketing (promotional, benefits-focused)',
          sales: 'Sales (persuasive, deal-oriented)',
          legal: 'Legal (formal, precise, disclaimers)',
          technical: 'Technical (detailed, step-by-step)',
          empathetic: 'Empathetic (understanding, supportive)'
        }
      }
    },
    database: {
      title: 'Saved Prompts',
      save: 'Save',
      load: 'Load',
      delete: 'Delete',
      duplicate: 'Duplicate',
      edit: 'Edit',
      export: 'Export JSON',
      import: 'Import JSON',
      noPrompts: 'No saved prompts yet',
      promptName: 'Prompt name',
      saveAs: 'Save prompt as...',
      confirmDelete: 'Delete this prompt?',
      imported: 'Prompts imported successfully!',
      exportedCount: 'prompts exported',
      savedCount: 'prompts saved',
      // Folders & Tags
      folders: {
        title: 'Folders',
        root: 'Root (No folder)',
        newFolder: 'New folder',
        editFolder: 'Edit folder',
        deleteFolder: 'Delete folder',
        folderName: 'Folder name',
        selectFolder: 'Select folder',
        noFolders: 'No folders yet',
        confirmDelete: 'Delete this folder? Prompts will be moved to root.',
        manage: 'Manage Folders'
      },
      tags: {
        title: 'Tags',
        newTag: 'New tag',
        editTag: 'Edit tag',
        deleteTag: 'Delete tag',
        tagName: 'Tag name',
        selectTags: 'Select tags',
        noTags: 'No tags yet',
        confirmDelete: 'Delete this tag? It will be removed from all prompts.',
        manage: 'Manage Tags',
        selectColor: 'Select color',
        filterByTag: 'Filter by tag',
        clearFilter: 'Clear filter',
        allTags: 'All tags'
      },
      organization: 'Organization'
    },
    share: {
      title: 'Share Prompt',
      subtitle: 'Share your prompt settings via code',
      codeLabel: 'Share Code',
      wordsLabel: 'Word Phrase (alternative)',
      urlLabel: 'Direct Link',
      copyCode: 'Copy Code',
      copyWords: 'Copy Words',
      copyUrl: 'Copy Link',
      importTitle: 'Import from Code',
      importPlaceholder: 'Paste share code here...',
      importBtn: 'Load Prompt',
      importSuccess: 'Prompt loaded successfully!',
      importError: 'Invalid share code',
      generating: 'Generating...',
      tip: 'Tip: The code contains all your settings. Share it via message or email!'
    },
    // Prompt verification feature - FREE, no API key required!
    // Uses Pollinations.ai - completely free, no registration needed
    verify: {
      title: 'Verify Prompt',
      button: 'Verify with AI',
      buttonShort: 'Verify',
      analyzing: 'AI is analyzing your prompt...',
      analyzingHint: 'Using free Pollinations.ai',
      result: 'AI Analysis',
      close: 'Close',
      retry: 'Retry',
      noPrompt: 'Create a prompt first to verify it',
      freeMode: '🆓 Free Mode',
      freeModeDesc: 'Works without registration!',
      apiSettings: 'Settings (Optional)',
      apiSettingsDesc: 'Optional settings',
      apiKey: 'API Key (optional)',
      apiKeyPlaceholder: 'Not required - works without key',
      apiKeyHelp: 'No API key needed! This feature is completely free.',
      hfLink: 'Pollinations.ai',
      saveSettings: 'Save',
      clearKey: 'Clear',
      keySaved: 'Settings saved!',
      keyCleared: 'Using free mode',
      errorGeneric: 'Error analyzing prompt. Please try again.',
      errorNetwork: 'Network error. Check your connection.',
      errorRateLimit: 'Service temporarily unavailable. Please try again.',
      understanding: 'How AI understands your prompt:',
      poweredBy: 'Powered by Pollinations.ai 🌸',
      modelInfo: 'Model Details',
      modelName: 'Model',
      modelValue: 'OpenAI (GPT-4o mini)',
      modelSettings: 'Settings',
      modelTemperature: 'Temperature: default',
      modelSeed: 'Seed: random',
      modelContext: 'Context: 128k tokens',
      prePrompt: `You are an expert prompt analyst. Analyze the following prompt and explain briefly:
1. **Task Understanding**: What task is being requested?
2. **Role/Persona**: What role should the AI take?
3. **Context**: What background information is provided?
4. **Constraints**: What requirements or limitations are specified?
5. **Expected Output**: What format/type of response is expected?

Be concise but clear. Use bullet points. Respond in the same language as the prompt.

Prompt to analyze:
`
    },
    // Tutorial/Guide feature translations
    tutorial: {
      title: 'Interactive Tutorial',
      button: 'Tutorial',
      buttonTooltip: 'Learn how to use AI Prompt Formatter',
      confirmTitle: 'Start Tutorial?',
      confirmMessage: 'Would you like to start an interactive tutorial that will guide you through creating your first prompt?',
      confirmStart: 'Start Tutorial',
      confirmCancel: 'Cancel',
      skipBtn: 'Skip',
      nextBtn: 'Next',
      prevBtn: 'Back',
      finishBtn: 'Finish',
      stepOf: 'Step {current} of {total}',
      steps: {
        welcome: {
          title: 'Welcome to AI Prompt Formatter!',
          content: 'This tutorial will guide you through creating an effective AI prompt. Follow along and learn how to use each section.'
        },
        template: {
          title: 'Choose a Template',
          content: 'First, select a template that matches your task. Templates provide optimized settings for different use cases like coding, creative writing, or analysis.'
        },
        aiModel: {
          title: 'Select AI Model',
          content: 'Choose which AI model you will use. Each model has different formatting preferences and special features.'
        },
        role: {
          title: 'Define the Role',
          content: 'Describe WHO the AI should be. For example: "an expert Python developer" or "a creative marketing specialist".'
        },
        task: {
          title: 'Describe Your Task',
          content: 'This is the most important field! Clearly describe WHAT you want the AI to do. Be specific and detailed.'
        },
        context: {
          title: 'Add Context',
          content: 'Provide background information that helps the AI understand the situation better.'
        },
        methods: {
          title: 'Choose Methods (Optional)',
          content: 'Select research-backed prompting methods like Chain-of-Thought for complex reasoning tasks.'
        },
        preview: {
          title: 'Review Your Prompt',
          content: 'Your formatted prompt appears here. Review it to ensure it captures your intent.'
        },
        actions: {
          title: 'Copy or Verify',
          content: 'Copy your prompt to clipboard, or click Verify to get AI feedback on your prompt quality!'
        }
      },
      completed: {
        title: 'Tutorial Complete!',
        message: 'You now know how to create effective AI prompts. Try it yourself!',
        tip: 'Tip: You can always restart this tutorial by clicking the tutorial button.'
      }
    },
    preview: 'Formatted Prompt',
    copy: 'Copy',
    copied: 'Copied!',
    placeholder: 'Fill in the fields to see your formatted prompt',
    chars: 'chars',
    optimizedFor: 'Optimized for',
    required: '*',
    newPrompt: 'New',
    footer: 'Methods based on: The Prompt Report (UMD, OpenAI, Stanford, 2025) • Wharton GenAI Labs • Google DeepMind • Princeton NLP',
    promptParts: {
      youAre: 'You are',
      actAs: 'Act as',
      role: 'Role',
      emotion: 'This task is very important to me. Your thorough and careful response will greatly help my work.',
      context: 'Background/Context',
      task: 'Task',
      cotInstructions: 'Think through this step-by-step:\n1. First, analyze the problem carefully\n2. Break it down into logical steps\n3. Show your reasoning for each step\n4. Then provide your final answer',
      cotSimple: "Let's think through this step-by-step. Show your reasoning at each stage before reaching a conclusion.",
      zeroshotTrigger: "Let's think step by step.",
      zeroshotSimple: "Let's approach this step by step, thinking through each part carefully before reaching a conclusion.",
      totExperts: "Imagine 3 different experts approaching this problem:\n- Expert 1: Takes a methodical, systematic approach\n- Expert 2: Looks for creative, unconventional solutions\n- Expert 3: Focuses on practical, efficient solutions\n\nEach expert shares one step of their thinking, then evaluates. If any approach seems wrong, abandon it and explore alternatives. Continue until reaching the best solution.",
      totSimple: "Consider 3 different approaches to this problem. For each, take one step, evaluate if it's promising, and continue the best paths while abandoning dead ends.",
      scVerify: 'Generate 3 independent solutions using different reasoning approaches. Then compare them and select the answer that appears most consistently across approaches, explaining why.',
      scSimple: 'Solve this problem 3 different ways, then compare your answers and explain which is most likely correct and why.',
      reactCycle: 'Follow this Thought-Action-Observation cycle:\n1. Thought: Reason about what you need to do next\n2. Action: Describe what action to take\n3. Observation: Note what you learned from the action\nRepeat until you have a complete solution.',
      reactSimple: 'For each step, state your Thought (reasoning), Action (what to do), and Observation (what you learned). Repeat this cycle until solved.',
      plansolveInstructions: "Let's first understand the problem, extract relevant variables and their corresponding numerals, and devise a plan. Then, let's carry out the plan, calculate intermediate variables (pay attention to correct numerical calculation and commonsense), solve the problem step by step, and show the answer.",
      plansolveSimple: "First, understand and plan. Then execute step by step, showing calculations and reasoning at each stage.",
      selfaskInstructions: "To answer this question, ask yourself follow-up questions and answer them:\n1. Are follow-up questions needed? If yes:\n2. Follow-up: [your question]\n3. Intermediate answer: [answer]\n4. Repeat until you can provide the final answer.",
      selfaskSimple: "Break this down by asking yourself follow-up questions. Answer each one before moving to the next, then provide the final answer.",
      palInstructions: "Solve this by writing Python code:\n1. Define the problem variables\n2. Write step-by-step calculations as code\n3. Use comments to explain your reasoning\n4. Print the final answer",
      palSimple: "Write Python code to solve this problem. Use variables, calculations, and comments to show your reasoning.",
      selfrefineInstructions: "Follow this iterative improvement process:\n1. GENERATE: Create your initial response\n2. FEEDBACK: Critique your response - what could be improved?\n3. REFINE: Create an improved version based on feedback\nRepeat the feedback-refine cycle until satisfied.",
      selfrefineSimple: "Generate a response, then critique it and improve it. Repeat until you're satisfied with the quality.",
      stepbackInstructions: "Before solving, step back and consider:\n1. What are the underlying principles or concepts relevant to this problem?\n2. What high-level approach or framework applies here?\n3. Now apply these principles to solve the specific problem.",
      stepbackSimple: "First identify the key principles and concepts, then apply them to solve this specific problem.",
      analogicalInstructions: "Before solving, recall similar problems:\n1. Think of 2-3 relevant problems you know how to solve\n2. Briefly describe each and its solution approach\n3. Apply the most relevant approach to the current problem",
      analogicalSimple: "Think of similar problems you've solved before, then apply the same approach here.",
      rarInstructions: "Rephrase and expand the question to ensure clarity, then respond to the rephrased version.",
      rarSimple: "First rephrase this question more clearly, then answer the rephrased version.",
      // === NEW 2024-2025 METHOD PROMPT PARTS ===
      sotInstructions: "Use Skeleton-of-Thought approach:\n1. SKELETON: First, outline the main points/sections of your answer as a brief skeleton\n2. PARALLEL EXPANSION: Then expand each point in detail\nThis enables faster, more structured responses.",
      sotSimple: "First create a skeleton outline of your answer, then expand each point in detail.",
      gotInstructions: "Use Graph-of-Thoughts reasoning:\n1. Generate multiple initial thoughts about this problem\n2. Evaluate each thought's validity and combine promising ones\n3. Refine and synthesize the best ideas into a coherent solution\n4. Backtrack if needed and explore alternative paths",
      gotSimple: "Explore multiple reasoning paths, combine the best ideas, and synthesize into a solution.",
      botInstructions: "Apply Buffer-of-Thoughts approach:\n1. Recall relevant problem-solving templates from similar challenges\n2. Identify the core problem type and applicable reasoning pattern\n3. Instantiate the template with specifics from this problem\n4. Execute the reasoning pattern step by step",
      botSimple: "Recall relevant problem-solving templates, then apply the most suitable one to this problem.",
      thotInstructions: "Use Thread-of-Thought for this complex context:\n1. Walk through the context in manageable parts step by step\n2. Summarize and analyze each segment as you go\n3. Extract key information relevant to the question\n4. Synthesize findings into a coherent answer",
      thotSimple: "Walk through this context step by step, summarizing and analyzing as you go, then answer.",
      s2aInstructions: "Apply System 2 Attention:\n1. First, rewrite the context removing any irrelevant or potentially biasing information\n2. Identify what truly matters for answering this question\n3. Now reason carefully based only on the relevant, filtered information",
      s2aSimple: "Filter out irrelevant information from the context, then answer based only on what matters.",
      metapromptInstructions: "Use Meta-Prompting approach:\n1. Break down this complex task into subtasks\n2. For each subtask, adopt the role of a relevant expert\n3. Have each expert solve their part independently\n4. Synthesize all expert contributions into a final answer\n5. Critically verify the integrated solution",
      metapromptSimple: "Break this into subtasks, solve each as a different expert, then synthesize the results.",
      reflexionInstructions: "Apply Reflexion for iterative improvement:\n1. Generate your initial response to the task\n2. Reflect: What worked well? What could be better? Any errors?\n3. Store these insights in your working memory\n4. Generate an improved response incorporating lessons learned\n5. Repeat until satisfied with quality",
      reflexionSimple: "Generate a response, reflect on what could be improved, then create a better version.",
      contrastiveInstructions: "Use Contrastive Chain-of-Thought:\n1. Consider the correct approach to this problem\n2. Also consider what would be an INCORRECT approach and why\n3. Contrast the two to clarify the right reasoning path\n4. Proceed with the correct approach, having learned from potential mistakes",
      contrastiveSimple: "Consider both correct and incorrect approaches, then use this contrast to solve correctly.",
      oproInstructions: "Apply OPRO (Optimization by Prompting):\n1. Consider: what phrasing would lead to the best response for this task?\n2. Take a deep breath and work on this problem step by step\n3. Let's think carefully about the problem and solve it together",
      oproSimple: "Take a deep breath and work on this problem step by step. Think carefully before answering.",
      confidenceInstructions: "Express calibrated confidence in your answer:\n1. Solve the problem using appropriate reasoning\n2. Assess your confidence level (0-100%) for each part of your answer\n3. Be honest about uncertainty - state what you're confident about and what you're less sure of\n4. If confidence is low, explain why and what information would help",
      confidenceSimple: "Provide your answer with an honest assessment of your confidence level (0-100%).",
      // === 2025 METHODS PROMPT PARTS ===
      codInstructions: "Use Chain of Draft - think step by step but keep each step to ~5 words maximum:\n1. [brief step 1]\n2. [brief step 2]\n...\n#### [final answer]\nBe concise. Each reasoning step should capture only the essential insight.",
      codSimple: "Think step by step, but keep each thinking step to 5 words at most. Return answer after ####.",
      selfdiscoverInstructions: "Self-discover the best reasoning approach:\n1. SELECT: Which reasoning modules apply? (decomposition, critical thinking, creative thinking, etc.)\n2. ADAPT: How should these modules be tailored to this specific task?\n3. IMPLEMENT: Create a step-by-step reasoning plan in JSON-like structure\n4. EXECUTE: Follow your discovered plan to solve the problem",
      selfdiscoverSimple: "First determine the best reasoning approach for this task, then apply it systematically.",
      rstarInstructions: "Apply systematic search reasoning:\n1. Generate multiple candidate solutions or approaches\n2. Evaluate each candidate's validity and promise\n3. Expand the most promising paths further\n4. Verify solutions through multiple reasoning trajectories\n5. Select the answer with highest confidence across paths",
      rstarSimple: "Generate multiple solution paths, evaluate each, and select the most validated answer.",
      slowthinkInstructions: "Engage in extended deliberation:\n- Wait... let me think about this more carefully\n- Hmm, I should consider multiple angles here\n- Let me reconsider and verify my reasoning\n- Actually, let me step back and think again\nTake your time. Thorough reasoning is more important than speed.",
      slowthinkSimple: "Take your time. Think deeply and carefully. Use 'wait', 'hmm', 'let me reconsider' as needed.",
      stepsFollow: 'Follow these steps',
      constraints: 'Requirements/Constraints',
      examplesIntro: 'Here are examples of the expected input-output format:',
      examplesFollow: 'Follow these patterns for your response.',
      fewshotIntro: 'Learn from these examples:',
      fewshotFollow: 'Apply the same pattern to the current task.',
      outputFormat: 'Expected Output Format',
      expectations: 'Expected Outcome'
    },
    checklist: {
      title: 'The X-Step Prompt Checklist',
      subtitle: 'Essential elements for crafting effective AI prompts',
      showColors: 'Show colors in output',
      steps: [{
        key: 'role',
        name: 'Role / Persona',
        desc: 'Define WHO the AI should be',
        example: '"You are an expert data scientist..."',
        color: 'purple',
        icon: 'User'
      }, {
        key: 'context',
        name: 'Context',
        desc: 'Provide background information',
        example: '"We are building a fintech app for..."',
        color: 'blue',
        icon: 'Info'
      }, {
        key: 'task',
        name: 'Task',
        desc: 'Clearly state WHAT you want done',
        example: '"Write a function that validates..."',
        color: 'green',
        icon: 'Target'
      }, {
        key: 'constraints',
        name: 'Constraints',
        desc: 'Set limits and requirements',
        example: '"Keep it under 100 lines, use TypeScript..."',
        color: 'orange',
        icon: 'Lock'
      }, {
        key: 'format',
        name: 'Output Format',
        desc: 'Specify HOW you want the response',
        example: '"Return as JSON with fields: name, value..."',
        color: 'pink',
        icon: 'FileText'
      }, {
        key: 'examples',
        name: 'Examples',
        desc: 'Show input→output patterns',
        example: '"Input: 5 → Output: 120 (factorial)"',
        color: 'yellow',
        icon: 'Lightbulb'
      }, {
        key: 'methods',
        name: 'Methods (optional)',
        desc: 'Add reasoning techniques (CoT, etc.)',
        example: '"Think step-by-step before answering..."',
        color: 'red',
        icon: 'Brain'
      }],
      tip: 'Not all steps are required. Minimum: Task. Recommended: Role + Task + Context + Format.',
      legend: 'Color Legend'
    },
    // ==================== AUTO-SAVE & DRAFT SYSTEM ====================
    autoSave: {
      status: {
        idle: '',
        saving: 'Saving...',
        saved: 'Saved',
        error: 'Save failed'
      },
      recovery: {
        title: 'Recover Draft?',
        message: 'We found an unsaved draft from your last session.',
        lastSaved: 'Last saved',
        recover: 'Recover',
        discard: 'Discard'
      },
      history: {
        title: 'Draft History',
        empty: 'No saved drafts',
        load: 'Load',
        clear: 'Clear History',
        clearConfirm: 'Clear all draft history?'
      },
      recovered: 'Draft recovered!',
      loaded: 'Draft loaded!',
      newPrompt: 'New prompt started'
    },
    // ==================== TOKEN COUNTER ====================
    tokens: {
      title: 'Token Estimation',
      count: 'Estimated tokens',
      limit: 'Model limit',
      usage: 'Usage',
      warning: 'Approaching limit',
      error: 'Exceeds limit',
      ok: 'Within limits',
      note: 'Estimates are approximate. Actual token count may vary by model.'
    },
    // ==================== PROMPT QUALITY SCORING ====================
    quality: {
      title: 'Prompt Quality',
      score: 'Score',
      grade: 'Grade',
      suggestions: 'Suggestions',
      suggestionKeys: {
        taskMissing: 'Add a task description - this is required',
        taskRequired: 'Expand your task description for clarity',
        taskMore: 'Add more detail to your task',
        roleMissing: 'Define a role for better results',
        roleMore: 'Expand the role description',
        contextMore: 'Add more context information',
        formatMissing: 'Specify the output format',
        formatMore: 'Add more format details',
        methodsMissing: 'Consider adding prompting methods',
        methodsMore: 'Try adding another method'
      }
    },
    // ==================== KEYBOARD SHORTCUTS ====================
    shortcuts: {
      title: 'Keyboard Shortcuts',
      save: 'Save prompt',
      copy: 'Copy to clipboard',
      verify: 'Verify with AI',
      newPrompt: 'New prompt',
      database: 'Open/close database',
      showHelp: 'Show shortcuts',
      close: 'Close modal'
    },
    // ==================== QUICK-START TEMPLATES ====================
    quickStart: {
      title: 'Quick-Start Templates',
      subtitle: 'Ready-to-use prompt templates for common tasks',
      use: 'Use Template',
      applied: 'Template applied!',
      templates: {
        blog_post: {
          name: 'Blog Post',
          desc: 'Write an engaging blog article'
        },
        debug_code: {
          name: 'Debug Code',
          desc: 'Find and fix bugs in your code'
        },
        data_analysis: {
          name: 'Data Analysis',
          desc: 'Analyze data and extract insights'
        },
        social_media: {
          name: 'Social Media',
          desc: 'Create social media content'
        },
        email_professional: {
          name: 'Professional Email',
          desc: 'Write business emails'
        }
      }
    }
  },
  cs: {
    title: 'AI Prompt Formátovač',
    subtitle: 'Techniky promptingu podložené výzkumem ze studií 2025 • v2.0',
    version: 'v2.0',
    backToHub: 'Zpět na Hub',
    searchLanguage: 'Hledat jazyk...',
    templates: {
      general: {
        name: 'Obecný úkol',
        desc: 'Flexibilní formát pro jakýkoli úkol',
        context: ''
      },
      coding: {
        name: 'Pomoc s kódem',
        desc: 'Ladění, psaní nebo vysvětlení kódu',
        context: 'Zaměř se na psaní čistého, efektivního a dobře zdokumentovaného kódu. Přidej komentáře tam, kde to pomůže.'
      },
      creative: {
        name: 'Kreativní psaní',
        desc: 'Příběhy, obsah, copywriting',
        context: 'Zaměř se na kreativitu, poutavý příběh a živý jazyk. Buď originální a expresivní.'
      },
      analysis: {
        name: 'Analýza',
        desc: 'Výzkum, porovnání, hodnocení',
        context: 'Poskytni důkladnou analýzu s argumentací založenou na důkazech. Zvaž více perspektiv a uveď zdroje, kde je to vhodné.'
      },
      explanation: {
        name: 'Vysvětlení',
        desc: 'Výuka nebo objasnění konceptů',
        context: 'Vysvětli jasně pro cílové publikum. Použij analogie a příklady, aby byly složité koncepty srozumitelné.'
      },
      // Nové kategorie z výzkumu využití 2025
      email: {
        name: 'Profesionální email',
        desc: 'Obchodní komunikace, oslovení',
        context: 'Piš profesionální, jasnou a efektivní emailovou komunikaci. Zvaž tón, strukturu a výzvu k akci.'
      },
      academic: {
        name: 'Akademické psaní',
        desc: 'Výzkumné práce, eseje, citace',
        context: 'Dodržuj akademické standardy. Používej správnou strukturu, citace a argumenty podložené důkazy.'
      },
      data: {
        name: 'Data a tabulky',
        desc: 'Excel vzorce, SQL, analýza dat',
        context: 'Zaměř se na přesnou práci s daty. Poskytni vzorce, dotazy nebo skripty s jasnými vysvětleními.'
      },
      marketing: {
        name: 'Marketing a SEO',
        desc: 'Reklamy, sociální sítě, SEO obsah',
        context: 'Vytvoř poutavý obsah zaměřený na konverzi. Optimalizuj pro cílové publikum a požadavky platformy.'
      },
      summarization: {
        name: 'Sumarizace',
        desc: 'Shrnutí dokumentů, klíčové body',
        context: 'Extrahuj klíčové informace jasně a stručně. Zachovej přesnost při zkrácení délky.'
      },
      image_gen: {
        name: 'Generování obrázků',
        desc: 'DALL-E, Midjourney, Stable Diffusion',
        context: 'Vytvoř detailní vizuální popisy. Zahrň styl, náladu, kompozici a specifické umělecké prvky.'
      },
      translation: {
        name: 'Překlad',
        desc: 'Jazykový překlad, lokalizace',
        context: 'Překládej přesně se zachováním významu, tónu a kulturního kontextu.'
      },
      business: {
        name: 'Obchodní dokumenty',
        desc: 'Reporty, návrhy, prezentace',
        context: 'Vytvoř profesionální obchodní dokumenty s jasnou strukturou, daty podloženými poznatky a akčními doporučeními.'
      },
      customer_service: {
        name: 'Zákaznická podpora',
        desc: 'Odpovědi podpory, FAQ',
        context: 'Poskytni užitečné, empatické a na řešení orientované odpovědi zákazníkům.'
      },
      productivity: {
        name: 'Produktivita',
        desc: 'Plánování, organizace, cíle',
        context: 'Pomoz s osobní organizací, stanovením cílů a správou úkolů. Buď praktický a akční.'
      }
    },
    fields: {
      role: {
        label: 'Role / Persona',
        placeholder: 'např. expert na technické psaní'
      },
      task: {
        label: 'Úkol',
        placeholder: 'např. Napiš dokumentaci pro REST API endpoint'
      },
      context: {
        label: 'Kontext / Pozadí',
        placeholder: 'např. Toto je pro fintech startup'
      },
      constraints: {
        label: 'Omezení / Požadavky',
        placeholder: 'např. Buď stručný, použij příklady'
      },
      steps: {
        label: 'Kroky k následování',
        placeholder: 'Zadej každý krok na nový řádek...'
      },
      outputFormat: {
        label: 'Formát výstupu',
        placeholder: 'např. Markdown s nadpisy a bloky kódu'
      },
      expectations: {
        label: 'Očekávání / Cíl',
        placeholder: 'např. Jasná, použitelná dokumentace'
      },
      examples: {
        label: 'Příklady (volitelné)',
        placeholder: 'např. Vstup: ... → Výstup: ...'
      },
      fewshot: {
        label: 'Few-Shot příklady (Vstup → Výstup)',
        placeholder: 'Vstup: ... → Výstup: ...'
      }
    },
    // Enhanced examples section translations (Czech)
    examplesSection: {
      title: 'Příklady s formátem souboru',
      fileType: 'Formát dat',
      fileTypes: {
        none: {
          name: 'Prostý text',
          desc: 'Jednoduché textové příklady'
        },
        excel: {
          name: 'Excel/Tabulka',
          desc: 'Struktura řádků a sloupců'
        },
        csv: {
          name: 'CSV',
          desc: 'Hodnoty oddělené čárkou'
        },
        json: {
          name: 'JSON',
          desc: 'Páry klíč-hodnota'
        },
        table: {
          name: 'Tabulka',
          desc: 'Strukturovaný tabulkový formát'
        }
      },
      params: {
        columnSeparator: 'Oddělovač sloupců',
        rowDescription: 'Struktura řádku',
        headers: 'Záhlaví sloupců',
        headersPlaceholder: 'např. Jméno | Věk | Město'
      },
      addRow: 'Přidat řádek (+)',
      removeRow: 'Odebrat',
      rowPlaceholder: 'Data příkladu řádku...',
      rowSeparatorHint: 'Použij tlačítko (+) pro přidání oddělených řádků příkladů',
      structurePreview: 'Náhled struktury'
    },
    methods: {
      title: 'Výzkumem podložené metody',
      active: 'aktivní metod(y)',
      recommended: 'Doporučené',
      showAll: 'Zobrazit všechny',
      hideOthers: 'Skrýt ostatní',
      bestFor: 'Nejlepší pro tuto kategorii',
      selectMethods: 'Vybrat metody',
      closeMethods: 'Hotovo',
      clearAll: 'Vymazat vše',
      groups: {
        reasoning: 'Uvažování & Myšlení',
        efficiency: 'Efektivita & Rychlost',
        selfImprovement: 'Sebe-zlepšování',
        inContext: 'Kontextové učení',
        structured: 'Strukturované & Agentní',
        quality: 'Kvalita výstupu'
      },
      cot: {
        name: 'Chain-of-Thought',
        citation: 'Google Brain 2022',
        tip: 'Nejlepší pro matematiku, logiku, vícekrokové problémy. +39pp na GSM8K.'
      },
      zeroshot: {
        name: 'Zero-Shot CoT',
        citation: 'U.Tokyo + Google 2022',
        tip: '"Pojďme přemýšlet krok za krokem" - bez příkladů. +61pp na MultiArith.'
      },
      fewshot: {
        name: 'Few-Shot Learning',
        citation: 'OpenAI 2020',
        tip: 'Učení z 1-10 příkladů. Může zlepšit přesnost 0%→90%.'
      },
      tot: {
        name: 'Tree of Thoughts',
        citation: 'Princeton + DeepMind 2023',
        tip: 'Prozkoumej více cest s návratem. 4%→74% na Game of 24.'
      },
      selfconsistency: {
        name: 'Self-Consistency',
        citation: 'Google Research 2022',
        tip: 'Více cest uvažování, většinové hlasování. +17.9% na GSM8K.'
      },
      react: {
        name: 'ReAct',
        citation: 'Princeton + Google 2022',
        tip: 'Cyklus Myšlenka-Akce-Pozorování pro použití nástrojů. +34% na ALFWorld.'
      },
      risen: {
        name: 'RISEN Framework',
        citation: 'Kyle Balmer',
        tip: 'Struktura Role-Instrukce-Kroky-Cíl-Zúžení.'
      },
      emotion: {
        name: 'EmotionPrompt',
        citation: 'Microsoft + CAS 2023',
        tip: 'Emoční stimuly zvyšují výkon. +8% instrukce, +115% BIG-Bench.'
      },
      plansolve: {
        name: 'Plan-and-Solve',
        citation: 'SUTD 2023',
        tip: 'Zero-shot plánování před řešením. +5% oproti Zero-Shot-CoT.'
      },
      selfask: {
        name: 'Self-Ask',
        citation: 'UW + Meta AI 2022',
        tip: 'Ptej se na doplňující otázky až do vyřešení. Skvělé pro multi-hop QA.'
      },
      pal: {
        name: 'PAL (Program-Aided)',
        citation: 'CMU 2022',
        tip: 'Generuj kód pro výpočty. +40% na GSM-Hard.'
      },
      selfrefine: {
        name: 'Self-Refine',
        citation: 'CMU + AI2 + Google 2023',
        tip: 'Smyčka Generuj→Zpětná vazba→Vylepši. ~20% průměrné zlepšení.'
      },
      stepback: {
        name: 'Step-Back Prompting',
        citation: 'Google DeepMind 2023',
        tip: 'Nejprve abstrahuj na vysokoúrovňové principy. +27% na TimeQA.'
      },
      analogical: {
        name: 'Analogical Prompting',
        citation: 'DeepMind + Stanford 2023',
        tip: 'Generuj vlastní relevantní příklady. +5% oproti 0-shot CoT.'
      },
      rar: {
        name: 'Rephrase & Respond',
        citation: 'UCLA 2023',
        tip: 'Přeformuluj otázku před odpovědí. Snižuje nejednoznačnost.'
      },
      // === NOVÉ METODY 2024-2025 PODLOŽENÉ VÝZKUMEM ===
      sot: {
        name: 'Skeleton-of-Thought',
        citation: 'Microsoft + Tsinghua ICLR 2024',
        tip: 'Paralelní generování odpovědi. 2.39× rychlejší, lepší pro strukturované výstupy.'
      },
      got: {
        name: 'Graph of Thoughts',
        citation: 'ETH Zürich AAAI 2024',
        tip: 'Nelineární uvažování s grafovou strukturou. +62% na třídících úlohách.'
      },
      bot: {
        name: 'Buffer of Thoughts',
        citation: 'Peking + Stanford NeurIPS 2024',
        tip: 'Meta-kognitivní šablony pro uvažování. +51% na Checkmate-in-One.'
      },
      thot: {
        name: 'Thread of Thought',
        citation: 'NAVER 2024',
        tip: 'Zvládá chaotické kontexty. Segmentuje a analyzuje krok za krokem.'
      },
      s2a: {
        name: 'System 2 Attention',
        citation: 'Meta AI 2024',
        tip: 'Filtruje irelevantní info z kontextu. 62.8%→80.3% faktičnost.'
      },
      metaprompt: {
        name: 'Meta-Prompting',
        citation: 'Stanford 2024',
        tip: 'LLM jako dirigent + multi-expertní systém. +17.1% na složitých úlohách.'
      },
      reflexion: {
        name: 'Reflexion',
        citation: 'Princeton NeurIPS 2023',
        tip: 'Verbální reinforcement learning s pamětí. Sebe-zlepšující agent.'
      },
      contrastive: {
        name: 'Contrastive CoT',
        citation: 'Alibaba DAMO 2024',
        tip: 'Učení ze správných I nesprávných příkladů. +17.8% přesnost.'
      },
      opro: {
        name: 'OPRO',
        citation: 'Google DeepMind 2024',
        tip: 'LLM optimalizuje vlastní prompty. +8% GSM8K, +50% BIG-Bench.'
      },
      confidence: {
        name: 'Confidence Calibration',
        citation: 'ICLR 2024',
        tip: 'Vyjadřuj nejistotu upřímně. Kalibrované úrovně jistoty.'
      },
      // === 2025 NEJNOVĚJŠÍ METODY ===
      cod: {
        name: 'Chain of Draft',
        citation: 'Zoom Research Feb 2025',
        tip: 'Minimální reasoning (~5 slov/krok). 80% méně tokenů, stejná přesnost.'
      },
      selfdiscover: {
        name: 'Self-Discover',
        citation: 'Google DeepMind 2024',
        tip: 'LLM objeví strukturu reasoning pro úkol. +32% vs CoT, 10-40× méně výpočtů.'
      },
      rstar: {
        name: 'rStar MCTS',
        citation: 'Microsoft Jan 2025',
        tip: 'Monte Carlo Tree Search. 7B model konkuruje o1-preview na MATH (90%).'
      },
      slowthink: {
        name: 'Slow Thinking',
        citation: 'DeepSeek R1 / OpenAI o1 2025',
        tip: 'Rozšířená deliberace s váhacími značkami. Pro složité problémy.'
      }
    },
    database: {
      title: 'Uložené prompty',
      save: 'Uložit',
      load: 'Načíst',
      delete: 'Smazat',
      duplicate: 'Duplikovat',
      edit: 'Upravit',
      export: 'Export JSON',
      import: 'Import JSON',
      noPrompts: 'Zatím žádné uložené prompty',
      promptName: 'Název promptu',
      saveAs: 'Uložit prompt jako...',
      confirmDelete: 'Smazat tento prompt?',
      imported: 'Prompty úspěšně importovány!',
      exportedCount: 'promptů exportováno',
      savedCount: 'promptů uloženo',
      // Složky & Tagy
      folders: {
        title: 'Složky',
        root: 'Kořen (bez složky)',
        newFolder: 'Nová složka',
        editFolder: 'Upravit složku',
        deleteFolder: 'Smazat složku',
        folderName: 'Název složky',
        selectFolder: 'Vybrat složku',
        noFolders: 'Zatím žádné složky',
        confirmDelete: 'Smazat tuto složku? Prompty budou přesunuty do kořene.',
        manage: 'Spravovat složky'
      },
      tags: {
        title: 'Tagy',
        newTag: 'Nový tag',
        editTag: 'Upravit tag',
        deleteTag: 'Smazat tag',
        tagName: 'Název tagu',
        selectTags: 'Vybrat tagy',
        noTags: 'Zatím žádné tagy',
        confirmDelete: 'Smazat tento tag? Bude odstraněn ze všech promptů.',
        manage: 'Spravovat tagy',
        selectColor: 'Vybrat barvu',
        filterByTag: 'Filtrovat podle tagu',
        clearFilter: 'Zrušit filtr',
        allTags: 'Všechny tagy'
      },
      organization: 'Organizace'
    },
    share: {
      title: 'Sdílet prompt',
      subtitle: 'Sdílej nastavení promptu pomocí kódu',
      codeLabel: 'Sdílecí kód',
      wordsLabel: 'Slovní fráze (alternativa)',
      urlLabel: 'Přímý odkaz',
      copyCode: 'Kopírovat kód',
      copyWords: 'Kopírovat slova',
      copyUrl: 'Kopírovat odkaz',
      importTitle: 'Import z kódu',
      importPlaceholder: 'Vlož sdílecí kód zde...',
      importBtn: 'Načíst prompt',
      importSuccess: 'Prompt úspěšně načten!',
      importError: 'Neplatný sdílecí kód',
      generating: 'Generuji...',
      tip: 'Tip: Kód obsahuje všechna tvá nastavení. Sdílej ho přes zprávu nebo email!'
    },
    // Funkce verifikace promptu - ZDARMA, bez API klíče!
    // Používá Pollinations.ai - kompletně zdarma, bez registrace
    verify: {
      title: 'Ověřit prompt',
      button: 'Ověřit pomocí AI',
      buttonShort: 'Ověřit',
      analyzing: 'AI analyzuje tvůj prompt...',
      analyzingHint: 'Používám bezplatné Pollinations.ai',
      result: 'AI Analýza',
      close: 'Zavřít',
      retry: 'Zkusit znovu',
      noPrompt: 'Nejprve vytvoř prompt k ověření',
      freeMode: '🆓 Bezplatný režim',
      freeModeDesc: 'Funguje bez registrace!',
      apiSettings: 'Nastavení (volitelné)',
      apiSettingsDesc: 'Volitelná nastavení',
      apiKey: 'API klíč (volitelný)',
      apiKeyPlaceholder: 'Není potřeba - funguje bez klíče',
      apiKeyHelp: 'API klíč není potřeba! Tato funkce je zcela zdarma.',
      hfLink: 'Pollinations.ai',
      saveSettings: 'Uložit',
      clearKey: 'Smazat',
      keySaved: 'Nastavení uloženo!',
      keyCleared: 'Používám bezplatný režim',
      errorGeneric: 'Chyba při analýze promptu. Zkus to znovu.',
      errorNetwork: 'Chyba sítě. Zkontroluj připojení.',
      errorRateLimit: 'Služba je dočasně nedostupná. Zkus to znovu.',
      understanding: 'Jak AI rozumí tvému promptu:',
      poweredBy: 'Poháněno Pollinations.ai 🌸',
      modelInfo: 'Detaily modelu',
      modelName: 'Model',
      modelValue: 'OpenAI (GPT-4o mini)',
      modelSettings: 'Nastavení',
      modelTemperature: 'Teplota: výchozí',
      modelSeed: 'Seed: náhodný',
      modelContext: 'Kontext: 128k tokenů',
      prePrompt: `Jsi expertní analytik promptů. Analyzuj následující prompt a stručně vysvětli:
1. **Pochopení úkolu**: Jaký úkol je požadován?
2. **Role/Persona**: Jakou roli by měla AI zaujmout?
3. **Kontext**: Jaké informace o pozadí jsou poskytnuty?
4. **Omezení**: Jaké požadavky nebo limity jsou specifikovány?
5. **Očekávaný výstup**: Jaký formát/typ odpovědi se očekává?

Buď stručný, ale jasný. Použij odrážky. Odpověz ve stejném jazyce jako prompt.

Prompt k analýze:
`
    },
    // Tutoriál/Průvodce - české překlady
    tutorial: {
      title: 'Interaktivní tutoriál',
      button: 'Tutoriál',
      buttonTooltip: 'Naučte se používat AI Prompt Formatter',
      confirmTitle: 'Spustit tutoriál?',
      confirmMessage: 'Chcete spustit interaktivní tutoriál, který vás provede vytvořením prvního promptu?',
      confirmStart: 'Spustit tutoriál',
      confirmCancel: 'Zrušit',
      skipBtn: 'Přeskočit',
      nextBtn: 'Další',
      prevBtn: 'Zpět',
      finishBtn: 'Dokončit',
      stepOf: 'Krok {current} z {total}',
      steps: {
        welcome: {
          title: 'Vítejte v AI Prompt Formatter!',
          content: 'Tento tutoriál vás provede vytvořením efektivního AI promptu. Sledujte a naučte se používat každou sekci.'
        },
        template: {
          title: 'Vyberte šablonu',
          content: 'Nejprve vyberte šablonu, která odpovídá vašemu úkolu. Šablony poskytují optimalizovaná nastavení pro různé případy použití.'
        },
        aiModel: {
          title: 'Vyberte AI model',
          content: 'Zvolte, který AI model budete používat. Každý model má jiné preferencí formátování a speciální funkce.'
        },
        role: {
          title: 'Definujte roli',
          content: 'Popište, KÝM by AI měla být. Například: "expert na Python" nebo "kreativní marketingový specialista".'
        },
        task: {
          title: 'Popište úkol',
          content: 'Toto je nejdůležitější pole! Jasně popište, CO má AI udělat. Buďte konkrétní a detailní.'
        },
        context: {
          title: 'Přidejte kontext',
          content: 'Poskytněte informace o pozadí, které pomohou AI lépe pochopit situaci.'
        },
        methods: {
          title: 'Vyberte metody (volitelné)',
          content: 'Vyberte výzkumem podložené metody promptingu jako Chain-of-Thought pro komplexní uvažování.'
        },
        preview: {
          title: 'Zkontrolujte prompt',
          content: 'Váš formátovaný prompt se zobrazuje zde. Zkontrolujte, zda zachycuje váš záměr.'
        },
        actions: {
          title: 'Kopírujte nebo ověřte',
          content: 'Zkopírujte prompt do schránky, nebo klikněte na Ověřit pro zpětnou vazbu od AI!'
        }
      },
      completed: {
        title: 'Tutoriál dokončen!',
        message: 'Nyní víte, jak vytvořit efektivní AI prompty. Vyzkoušejte to sami!',
        tip: 'Tip: Tutoriál můžete kdykoli spustit znovu kliknutím na tlačítko tutoriálu.'
      }
    },
    preview: 'Formátovaný prompt',
    copy: 'Kopírovat',
    copied: 'Zkopírováno!',
    placeholder: 'Vyplň pole pro zobrazení formátovaného promptu',
    chars: 'znaků',
    optimizedFor: 'Optimalizováno pro',
    required: '*',
    newPrompt: 'Nový',
    footer: 'Metody založeny na: The Prompt Report (UMD, OpenAI, Stanford, 2025) • Wharton GenAI Labs • Google DeepMind • Princeton NLP',
    promptParts: {
      youAre: 'Jsi',
      actAs: 'Chovej se jako',
      role: 'Role',
      emotion: 'Tento úkol je pro mě velmi důležitý. Tvá důkladná a pečlivá odpověď mi velmi pomůže v práci.',
      context: 'Pozadí/Kontext',
      task: 'Úkol',
      cotInstructions: 'Promysli si to krok za krokem:\n1. Nejprve pečlivě analyzuj problém\n2. Rozlož ho na logické kroky\n3. Ukaž své uvažování pro každý krok\n4. Pak poskytni svou finální odpověď',
      cotSimple: "Pojďme si to promyslet krok za krokem. Ukaž své uvažování v každé fázi před dosažením závěru.",
      zeroshotTrigger: "Pojďme přemýšlet krok za krokem.",
      zeroshotSimple: "Pojďme k tomu přistoupit krok za krokem, pečlivě promyslet každou část před dosažením závěru.",
      totExperts: "Představ si 3 různé experty přistupující k tomuto problému:\n- Expert 1: Používá metodický, systematický přístup\n- Expert 2: Hledá kreativní, nekonvenční řešení\n- Expert 3: Zaměřuje se na praktická, efektivní řešení\n\nKaždý expert sdílí jeden krok svého myšlení, pak hodnotí. Pokud se nějaký přístup zdá špatný, opusť ho a prozkoumej alternativy. Pokračuj až do nalezení nejlepšího řešení.",
      totSimple: "Zvaž 3 různé přístupy k tomuto problému. Pro každý udělej jeden krok, zhodnoť jestli je slibný, a pokračuj nejlepšími cestami zatímco opouštíš slepé uličky.",
      scVerify: 'Vygeneruj 3 nezávislá řešení pomocí různých přístupů uvažování. Pak je porovnej a vyber odpověď, která se objevuje nejčastěji napříč přístupy, a vysvětli proč.',
      scSimple: 'Vyřeš tento problém 3 různými způsoby, pak porovnej své odpovědi a vysvětli, která je nejpravděpodobněji správná a proč.',
      reactCycle: 'Následuj tento cyklus Myšlenka-Akce-Pozorování:\n1. Myšlenka: Rozmysli si, co musíš udělat dál\n2. Akce: Popiš, jakou akci provést\n3. Pozorování: Zaznamenej, co jsi se z akce naučil\nOpakuj až do kompletního řešení.',
      reactSimple: 'Pro každý krok uveď svou Myšlenku (uvažování), Akci (co udělat) a Pozorování (co ses naučil). Opakuj tento cyklus až do vyřešení.',
      plansolveInstructions: "Nejprve pochopme problém, extrahujme relevantní proměnné a jejich odpovídající číselné hodnoty, a sestavme plán. Pak proveďme plán, vypočítejme mezivýsledky (dávej pozor na správné numerické výpočty a zdravý rozum), řešme problém krok za krokem, a ukažme odpověď.",
      plansolveSimple: "Nejprve pochop a naplánuj. Pak proveď krok za krokem, ukazuj výpočty a uvažování v každé fázi.",
      selfaskInstructions: "Pro zodpovězení této otázky se ptej na doplňující otázky a odpovídej na ně:\n1. Jsou potřeba doplňující otázky? Pokud ano:\n2. Doplňující otázka: [tvá otázka]\n3. Mezivýsledná odpověď: [odpověď]\n4. Opakuj, dokud nemůžeš poskytnout finální odpověď.",
      selfaskSimple: "Rozlož to kladením doplňujících otázek sobě. Odpověz na každou před přechodem na další, pak poskytni finální odpověď.",
      palInstructions: "Vyřeš to napsáním Python kódu:\n1. Definuj proměnné problému\n2. Napiš výpočty krok za krokem jako kód\n3. Použij komentáře k vysvětlení svého uvažování\n4. Vypiš finální odpověď",
      palSimple: "Napiš Python kód k vyřešení tohoto problému. Použij proměnné, výpočty a komentáře k ukázání svého uvažování.",
      selfrefineInstructions: "Následuj tento iterativní proces zlepšování:\n1. GENERUJ: Vytvoř svou počáteční odpověď\n2. ZPĚTNÁ VAZBA: Zkritizuj svou odpověď - co by se dalo zlepšit?\n3. VYLEPŠI: Vytvoř vylepšenou verzi na základě zpětné vazby\nOpakuj cyklus zpětná vazba-vylepšení až do spokojenosti.",
      selfrefineSimple: "Vygeneruj odpověď, pak ji zkritizuj a vylepši. Opakuj až budeš spokojený s kvalitou.",
      stepbackInstructions: "Před řešením ustup a zvaž:\n1. Jaké jsou základní principy nebo koncepty relevantní pro tento problém?\n2. Jaký vysokoúrovňový přístup nebo framework zde platí?\n3. Nyní aplikuj tyto principy k vyřešení konkrétního problému.",
      stepbackSimple: "Nejprve identifikuj klíčové principy a koncepty, pak je aplikuj k vyřešení tohoto konkrétního problému.",
      analogicalInstructions: "Před řešením si vzpomeň na podobné problémy:\n1. Promysli 2-3 relevantní problémy, které umíš vyřešit\n2. Stručně popiš každý a jeho přístup k řešení\n3. Aplikuj nejrelevantnější přístup na současný problém",
      analogicalSimple: "Vzpomeň si na podobné problémy, které jsi řešil dříve, pak aplikuj stejný přístup zde.",
      rarInstructions: "Přeformuluj a rozšiř otázku pro zajištění jasnosti, pak odpověz na přeformulovanou verzi.",
      rarSimple: "Nejprve přeformuluj tuto otázku jasněji, pak odpověz na přeformulovanou verzi.",
      // === NOVÉ METODY 2024-2025 PROMPT PARTS ===
      sotInstructions: "Použij přístup Skeleton-of-Thought:\n1. KOSTRA: Nejprve načrtni hlavní body/sekce tvé odpovědi jako stručnou kostru\n2. PARALELNÍ ROZŠÍŘENÍ: Pak rozveď každý bod detailně\nToto umožňuje rychlejší, strukturovanější odpovědi.",
      sotSimple: "Nejprve vytvoř kostru osnovy své odpovědi, pak rozveď každý bod detailně.",
      gotInstructions: "Použij Graph-of-Thoughts uvažování:\n1. Vygeneruj několik počátečních myšlenek o tomto problému\n2. Zhodnoť validitu každé myšlenky a kombinuj slibné\n3. Vylepši a syntetizuj nejlepší nápady do koherentního řešení\n4. V případě potřeby se vrať a prozkoumej alternativní cesty",
      gotSimple: "Prozkoumej více cest uvažování, kombinuj nejlepší nápady a syntetizuj do řešení.",
      botInstructions: "Aplikuj přístup Buffer-of-Thoughts:\n1. Vzpomeň si na relevantní šablony řešení problémů z podobných výzev\n2. Identifikuj základní typ problému a aplikovatelný vzorec uvažování\n3. Instanciuj šablonu se specifiky z tohoto problému\n4. Proveď vzorec uvažování krok za krokem",
      botSimple: "Vzpomeň si na relevantní šablony řešení problémů, pak aplikuj nejvhodnější na tento problém.",
      thotInstructions: "Použij Thread-of-Thought pro tento složitý kontext:\n1. Projdi kontext po zvládnutelných částech krok za krokem\n2. Sumarizuj a analyzuj každý segment průběžně\n3. Extrahuj klíčové informace relevantní pro otázku\n4. Syntetizuj zjištění do koherentní odpovědi",
      thotSimple: "Projdi tento kontext krok za krokem, sumarizuj a analyzuj průběžně, pak odpověz.",
      s2aInstructions: "Aplikuj System 2 Attention:\n1. Nejprve přepiš kontext a odstraň irelevantní nebo potenciálně zavádějící informace\n2. Identifikuj, co skutečně záleží pro zodpovězení této otázky\n3. Nyní pečlivě uvažuj pouze na základě relevantních, filtrovaných informací",
      s2aSimple: "Odfiltruj irelevantní informace z kontextu, pak odpověz pouze na základě toho, co záleží.",
      metapromptInstructions: "Použij přístup Meta-Prompting:\n1. Rozlož tento složitý úkol na podúkoly\n2. Pro každý podúkol přijmi roli relevantního experta\n3. Nech každého experta vyřešit jeho část nezávisle\n4. Syntetizuj všechny expertní příspěvky do finální odpovědi\n5. Kriticky ověř integrované řešení",
      metapromptSimple: "Rozlož na podúkoly, vyřeš každý jako jiný expert, pak syntetizuj výsledky.",
      reflexionInstructions: "Aplikuj Reflexion pro iterativní zlepšování:\n1. Vygeneruj svou počáteční odpověď na úkol\n2. Reflektuj: Co fungovalo dobře? Co by mohlo být lepší? Nějaké chyby?\n3. Ulož tyto poznatky do své pracovní paměti\n4. Vygeneruj vylepšenou odpověď zahrnující naučené lekce\n5. Opakuj až do spokojenosti s kvalitou",
      reflexionSimple: "Vygeneruj odpověď, reflektuj co by mohlo být lepší, pak vytvoř lepší verzi.",
      contrastiveInstructions: "Použij Contrastive Chain-of-Thought:\n1. Zvaž správný přístup k tomuto problému\n2. Také zvaž, jaký by byl NESPRÁVNÝ přístup a proč\n3. Kontrastuj oba pro objasnění správné cesty uvažování\n4. Pokračuj se správným přístupem, poučen z potenciálních chyb",
      contrastiveSimple: "Zvaž jak správný, tak nesprávný přístup, pak použij tento kontrast k správnému řešení.",
      oproInstructions: "Aplikuj OPRO (Optimization by Prompting):\n1. Zvaž: jaká formulace by vedla k nejlepší odpovědi pro tento úkol?\n2. Zhluboka se nadechni a pracuj na tomto problému krok za krokem\n3. Pojďme o problému pečlivě přemýšlet a vyřešit ho společně",
      oproSimple: "Zhluboka se nadechni a pracuj na tomto problému krok za krokem. Před odpovědí pečlivě přemýšlej.",
      confidenceInstructions: "Vyjádři kalibrovanou jistotu ve své odpovědi:\n1. Vyřeš problém pomocí vhodného uvažování\n2. Zhodnoť svou úroveň jistoty (0-100%) pro každou část odpovědi\n3. Buď upřímný ohledně nejistoty - uveď, čím si jistý a čím méně\n4. Pokud je jistota nízká, vysvětli proč a jaké informace by pomohly",
      confidenceSimple: "Poskytni odpověď s upřímným hodnocením své úrovně jistoty (0-100%).",
      // === 2025 METODY PROMPT PARTS ===
      codInstructions: "Použij Chain of Draft - přemýšlej krok za krokem, ale každý krok max ~5 slov:\n1. [stručný krok 1]\n2. [stručný krok 2]\n...\n#### [finální odpověď]\nBuď stručný. Každý krok reasoning zachyť jen esenciální poznatek.",
      codSimple: "Přemýšlej krok za krokem, ale každý krok max 5 slov. Odpověď za ####.",
      selfdiscoverInstructions: "Sám objev nejlepší přístup k reasoning:\n1. VYBER: Které moduly reasoning platí? (dekompozice, kritické myšlení, kreativita, atd.)\n2. PŘIZPŮSOB: Jak by měly být tyto moduly upraveny pro tento konkrétní úkol?\n3. IMPLEMENTUJ: Vytvoř plán reasoning krok za krokem v JSON-like struktuře\n4. PROVEĎ: Následuj svůj objevený plán k vyřešení problému",
      selfdiscoverSimple: "Nejprve urči nejlepší přístup k reasoning pro tento úkol, pak ho systematicky aplikuj.",
      rstarInstructions: "Aplikuj systematické search reasoning:\n1. Vygeneruj více kandidátních řešení nebo přístupů\n2. Zhodnoť validitu a slibnost každého kandidáta\n3. Dále rozveď nejslibnější cesty\n4. Ověř řešení přes více trajektorií reasoning\n5. Vyber odpověď s nejvyšší jistotou napříč cestami",
      rstarSimple: "Vygeneruj více cest řešení, zhodnoť každou a vyber nejlépe validovanou odpověď.",
      slowthinkInstructions: "Zapoj se do rozšířené deliberace:\n- Počkej... nech mě o tom přemýšlet pečlivěji\n- Hmm, měl bych zvážit více úhlů pohledu\n- Nech mě přehodnotit a ověřit své uvažování\n- Vlastně, nech mě ustoupit a zamyslet se znovu\nNespěchej. Důkladné uvažování je důležitější než rychlost.",
      slowthinkSimple: "Nespěchej. Přemýšlej hluboce a pečlivě. Používej 'počkej', 'hmm', 'nech mě přehodnotit' dle potřeby.",
      stepsFollow: 'Následuj tyto kroky',
      constraints: 'Požadavky/Omezení',
      examplesIntro: 'Zde jsou příklady očekávaného formátu vstup-výstup:',
      examplesFollow: 'Následuj tyto vzory pro svou odpověď.',
      fewshotIntro: 'Uč se z těchto příkladů:',
      fewshotFollow: 'Aplikuj stejný vzor na současný úkol.',
      outputFormat: 'Očekávaný formát výstupu',
      expectations: 'Očekávaný výsledek'
    },
    // Funkce specifické pro modely (2025) - volitelné schopnosti pro každý AI model
    modelFeatures: {
      title: 'Funkce modelu',
      subtitle: 'Volitelné schopnosti specifické pro model',
      none: 'Žádné speciální funkce',
      claude: {
        extended_thinking: {
          name: 'Rozšířené myšlení',
          desc: 'Režim hlubokého uvažování pro složité problémy',
          promptTag: 'Zapni rozšířené myšlení pro hlubokou analýzu.'
        },
        research: {
          name: 'Výzkum (Web)',
          desc: 'Přístup k aktuálním informacím z webu',
          promptTag: 'Použij webové vyhledávání pro aktuální informace.'
        },
        artifacts: {
          name: 'Artefakty',
          desc: 'Vytvoření interaktivních komponent',
          promptTag: 'Vytvoř artefakt pro tento výstup.'
        },
        analysis: {
          name: 'Analytický nástroj',
          desc: 'Spouštění kódu pro analýzu dat',
          promptTag: 'Použij analytický nástroj pro zpracování dat.'
        }
      },
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
      gemini: {
        google_search: {
          name: 'Google vyhledávání',
          desc: 'Vyhledávání na webu v reálném čase',
          promptTag: 'Vyhledej na Googlu aktuální informace.'
        },
        code_execution: {
          name: 'Spouštění kódu',
          desc: 'Spouštění Python kódu',
          promptTag: 'Spusť kód k vyřešení tohoto problému.'
        },
        deep_research: {
          name: 'Hluboký výzkum',
          desc: 'Režim komplexního výzkumu',
          promptTag: 'Proveď hluboký výzkum na toto téma.'
        }
      },
      llama: {
        code_llama: {
          name: 'Režim kódu',
          desc: 'Optimalizováno pro úlohy s kódem',
          promptTag: 'Zaměř se na generování a analýzu kódu.'
        }
      },
      mistral: {
        code_mode: {
          name: 'Režim kódu',
          desc: 'Optimalizované odpovědi s kódem',
          promptTag: 'Optimalizuj pro generování kódu.'
        },
        function_calling: {
          name: 'Volání funkcí',
          desc: 'Strukturované použití nástrojů',
          promptTag: 'Použij volání funkcí pro strukturovaný výstup.'
        }
      },
      cohere: {
        rag: {
          name: 'RAG režim',
          desc: 'Generování s využitím vyhledávání',
          promptTag: 'Použij generování s využitím vyhledávání.'
        },
        web_search: {
          name: 'Webové vyhledávání',
          desc: 'Vyhledávání informací',
          promptTag: 'Vyhledej na webu relevantní informace.'
        }
      },
      grok: {
        realtime: {
          name: 'Data v reálném čase',
          desc: 'Přístup k živým datům z X/Twitter',
          promptTag: 'Použij data v reálném čase z X/Twitter.'
        },
        think: {
          name: 'Režim myšlení',
          desc: 'Rozšířené uvažování',
          promptTag: 'Zapni režim hlubokého myšlení.'
        },
        deepsearch: {
          name: 'DeepSearch',
          desc: 'Komplexní webové vyhledávání',
          promptTag: 'Použij DeepSearch pro komplexní výsledky.'
        }
      },
      deepseek: {
        deep_think: {
          name: 'Deep Think (R1)',
          desc: 'Pokročilý režim uvažování',
          promptTag: 'Zapni režim Deep Think pro složité uvažování.'
        },
        code_mode: {
          name: 'Režim kódu',
          desc: 'Optimalizováno pro programování',
          promptTag: 'Zaměř se na generování a analýzu kódu.'
        },
        search: {
          name: 'Webové vyhledávání',
          desc: 'Vyhledávání informací',
          promptTag: 'Vyhledej na webu aktuální informace.'
        }
      },
      general: {}
    },
    // Rozšířené sekce pro pokročilé prompty (inspirováno web-analysis-prompt.md)
    extendedSections: {
      title: 'Rozšířené sekce',
      subtitle: 'Pokročilé formátovací možnosti pro specializované prompty',
      toggleShow: 'Zobrazit rozšířené možnosti',
      toggleHide: 'Skrýt rozšířené možnosti',
      // Oblasti analýzy
      analysisAreas: {
        label: 'Oblasti analýzy',
        placeholder: 'např. Vizuální design, UI komponenty, UX analýza...',
        options: {
          visual_design: {
            name: 'Vizuální design',
            desc: 'Barvy, typografie, vizuální konzistence'
          },
          ui_components: {
            name: 'UI komponenty',
            desc: 'Tlačítka, formuláře, navigace, modály'
          },
          ux_analysis: {
            name: 'UX analýza',
            desc: 'User flow, přístupnost, responzivita'
          },
          content_analysis: {
            name: 'Analýza obsahu',
            desc: 'SEO, struktura, multimedia'
          },
          technical_elements: {
            name: 'Technické prvky',
            desc: 'Animace, API, výkon'
          },
          legal_compliance: {
            name: 'Právní soulad',
            desc: 'GDPR, cookies, ochrana soukromí'
          }
        }
      },
      // Technický výstup
      technicalOutput: {
        label: 'Technický výstup',
        placeholder: 'Specifikuj technické detaily k zahrnutí...',
        options: {
          css: {
            name: 'CSS',
            desc: 'Styly, vlastnosti, hodnoty'
          },
          html: {
            name: 'HTML',
            desc: 'Struktura, sémantika, přístupnost'
          },
          javascript: {
            name: 'JavaScript/TypeScript',
            desc: 'Funkce, logika, interakce'
          },
          python: {
            name: 'Python',
            desc: 'Backend, skripty, automatizace'
          }
        }
      },
      // Hodnocení priorit
      priorityRating: {
        label: 'Hodnocení priorit',
        placeholder: 'Ohodnoť doporučení podle priority...',
        enabled: 'Zapnout hodnocení priorit',
        levels: {
          critical: 'KRITICKÉ - Vyžaduje okamžitou opravu',
          high: 'VYSOKÁ - Důležité pro funkcionalitu/UX',
          medium: 'STŘEDNÍ - Zlepšení kvality',
          low: 'NÍZKÁ - Nice-to-have vylepšení'
        }
      },
      // Zaměření analýzy
      focusAreas: {
        label: 'Zaměření analýzy',
        primary: {
          label: 'Primární zaměření',
          placeholder: 'např. e-commerce konverze, SEO, přístupnost'
        },
        secondary: {
          label: 'Sekundární zaměření',
          placeholder: 'např. mobilní UX, rychlost načítání'
        },
        ignore: {
          label: 'Ignorovat',
          placeholder: 'např. backend aspekty, kvalita obsahu'
        }
      },
      // Cílová URL
      targetUrl: {
        label: 'Cílová URL',
        placeholder: 'https://example.com'
      },
      // Srovnání s konkurencí
      competitorComparison: {
        label: 'Srovnání s konkurencí',
        placeholder: 'Zadej URL konkurentů...',
        addBtn: 'Přidat konkurenta',
        instruction: 'Proveď srovnání klíčových aspektů s těmito konkurenty.'
      },
      // Finální výstupy
      deliverables: {
        label: 'Finální výstupy',
        placeholder: 'např. Kompletní zpráva, prioritizovaný seznam, technické specifikace...',
        options: {
          report: 'Kompletní analytická zpráva',
          recommendations: 'Prioritizovaný seznam doporučení',
          tech_specs: 'Technická specifikace pro programátory',
          checklist: 'Checklist pro implementaci'
        }
      },
      // Možnosti specifické pro šablony
      emailStyle: {
        label: 'Styl emailu',
        options: {
          formal: 'Formální / Oficiální',
          colleagues: 'Kolegové / Profesionální',
          friendly: 'Přátelský / Neformální',
          request: 'Žádost / Dotaz',
          complaint: 'Stížnost / Reklamace',
          thankyou: 'Poděkování / Ocenění'
        }
      },
      emailLanguage: {
        label: 'Jazyk výstupu',
        placeholder: 'např. Čeština, Angličtina, Němčina...'
      },
      translationStyle: {
        label: 'Styl překladu',
        options: {
          formal: 'Formální / Profesionální',
          literal: 'Doslovný / Slovo od slova',
          natural: 'Přirozený slovosled',
          creative: 'Kreativní / Lokalizovaný',
          technical: 'Technický / Přesný'
        }
      },
      supportTone: {
        label: 'Tón odpovědi',
        options: {
          marketing: 'Marketingový (propagační, výhody)',
          sales: 'Obchodní (přesvědčivý, nabídky)',
          legal: 'Právní (formální, přesný, upozornění)',
          technical: 'Technický (detailní, krok za krokem)',
          empathetic: 'Empatický (chápavý, podpůrný)'
        }
      }
    },
    checklist: {
      title: 'X-krokový kontrolní seznam promptu',
      subtitle: 'Základní prvky pro tvorbu efektivních AI promptů',
      showColors: 'Zobrazit barvy ve výstupu',
      steps: [{
        key: 'role',
        name: 'Role / Persona',
        desc: 'Definuj KÝM má být AI',
        example: '"Jsi expert na datovou vědu..."',
        color: 'purple',
        icon: 'User'
      }, {
        key: 'context',
        name: 'Kontext',
        desc: 'Poskytni informace o pozadí',
        example: '"Vytváříme fintech aplikaci pro..."',
        color: 'blue',
        icon: 'Info'
      }, {
        key: 'task',
        name: 'Úkol',
        desc: 'Jasně uveď CO chceš udělat',
        example: '"Napiš funkci, která validuje..."',
        color: 'green',
        icon: 'Target'
      }, {
        key: 'constraints',
        name: 'Omezení',
        desc: 'Nastav limity a požadavky',
        example: '"Drž to pod 100 řádků, použij TypeScript..."',
        color: 'orange',
        icon: 'Lock'
      }, {
        key: 'format',
        name: 'Formát výstupu',
        desc: 'Specifikuj JAK chceš odpověď',
        example: '"Vrať jako JSON s poli: name, value..."',
        color: 'pink',
        icon: 'FileText'
      }, {
        key: 'examples',
        name: 'Příklady',
        desc: 'Ukaž vzory vstup→výstup',
        example: '"Vstup: 5 → Výstup: 120 (faktoriál)"',
        color: 'yellow',
        icon: 'Lightbulb'
      }, {
        key: 'methods',
        name: 'Metody (volitelné)',
        desc: 'Přidej techniky uvažování (CoT, atd.)',
        example: '"Přemýšlej krok za krokem před odpovědí..."',
        color: 'red',
        icon: 'Brain'
      }],
      tip: 'Ne všechny kroky jsou povinné. Minimum: Úkol. Doporučeno: Role + Úkol + Kontext + Formát.',
      legend: 'Legenda barev'
    },
    // ==================== AUTO-SAVE & DRAFT SYSTEM ====================
    autoSave: {
      status: {
        idle: '',
        saving: 'Ukládám...',
        saved: 'Uloženo',
        error: 'Uložení selhalo'
      },
      recovery: {
        title: 'Obnovit koncept?',
        message: 'Našli jsme neuložený koncept z vaší poslední relace.',
        lastSaved: 'Naposledy uloženo',
        recover: 'Obnovit',
        discard: 'Zahodit'
      },
      history: {
        title: 'Historie konceptů',
        empty: 'Žádné uložené koncepty',
        load: 'Načíst',
        clear: 'Vymazat historii',
        clearConfirm: 'Vymazat celou historii konceptů?'
      },
      recovered: 'Koncept obnoven!',
      loaded: 'Koncept načten!',
      newPrompt: 'Nový prompt zahájen'
    },
    // ==================== TOKEN COUNTER ====================
    tokens: {
      title: 'Odhad tokenů',
      count: 'Odhadované tokeny',
      limit: 'Limit modelu',
      usage: 'Využití',
      warning: 'Blíží se limitu',
      error: 'Překračuje limit',
      ok: 'V mezích limitu',
      note: 'Odhady jsou přibližné. Skutečný počet tokenů se může lišit podle modelu.'
    },
    // ==================== PROMPT QUALITY SCORING ====================
    quality: {
      title: 'Kvalita promptu',
      score: 'Skóre',
      grade: 'Známka',
      suggestions: 'Návrhy',
      suggestionKeys: {
        taskMissing: 'Přidejte popis úkolu - toto je povinné',
        taskRequired: 'Rozšiřte popis úkolu pro větší jasnost',
        taskMore: 'Přidejte více detailů k úkolu',
        roleMissing: 'Definujte roli pro lepší výsledky',
        roleMore: 'Rozšiřte popis role',
        contextMore: 'Přidejte více kontextových informací',
        formatMissing: 'Specifikujte formát výstupu',
        formatMore: 'Přidejte více detailů formátu',
        methodsMissing: 'Zvažte přidání promptingových metod',
        methodsMore: 'Zkuste přidat další metodu'
      }
    },
    // ==================== KEYBOARD SHORTCUTS ====================
    shortcuts: {
      title: 'Klávesové zkratky',
      save: 'Uložit prompt',
      copy: 'Kopírovat do schránky',
      verify: 'Ověřit pomocí AI',
      newPrompt: 'Nový prompt',
      database: 'Otevřít/zavřít databázi',
      showHelp: 'Zobrazit zkratky',
      close: 'Zavřít okno'
    },
    // ==================== QUICK-START TEMPLATES ====================
    quickStart: {
      title: 'Rychlé šablony',
      subtitle: 'Připravené šablony promptů pro běžné úkoly',
      use: 'Použít šablonu',
      applied: 'Šablona aplikována!',
      templates: {
        blog_post: {
          name: 'Blogový článek',
          desc: 'Napište poutavý blogový článek'
        },
        debug_code: {
          name: 'Ladění kódu',
          desc: 'Najděte a opravte chyby v kódu'
        },
        data_analysis: {
          name: 'Analýza dat',
          desc: 'Analyzujte data a získejte poznatky'
        },
        social_media: {
          name: 'Sociální sítě',
          desc: 'Vytvořte obsah pro sociální sítě'
        },
        email_professional: {
          name: 'Profesionální email',
          desc: 'Napište obchodní emaily'
        }
      }
    }
  }
};

// ==================== TRANSLATION HELPER ====================
// Simple translation getter - uses manual translations only (no API)
const getTranslations = lang => {
  return BASE_TRANSLATIONS[lang] || BASE_TRANSLATIONS.en;
};

// ==================== ICON COMPONENT ====================
const Icon = ({
  name,
  size = 20,
  className = ""
}) => {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && lucide[name]) {
      ref.current.innerHTML = '';
      const svg = lucide.createElement(lucide[name]);
      svg.setAttribute('width', size);
      svg.setAttribute('height', size);
      ref.current.appendChild(svg);
    }
  }, [name, size]);
  return /*#__PURE__*/React.createElement("span", {
    ref: ref,
    className: `inline-flex items-center justify-center ${className}`
  });
};

// ==================== AI MODEL ICONS COMPONENT ====================
// Custom SVG icons for each AI model - designed in AdHub style
const AIModelIcon = ({
  model,
  size = 20,
  color = "currentColor"
}) => {
  const icons = {
    // Claude (Anthropic) - Stylized 'A' with neural network aesthetic
    claude: /*#__PURE__*/React.createElement("svg", {
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg"
    }, /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "10",
      fill: color,
      fillOpacity: "0.15"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M12 4C12 4 7 8 7 13C7 16 9 18 12 18C15 18 17 16 17 13C17 8 12 4 12 4Z",
      fill: color,
      fillOpacity: "0.3"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M12 6L8 16H10L11 13H13L14 16H16L12 6Z",
      fill: color
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "10",
      r: "1.5",
      fill: color,
      fillOpacity: "0.8"
    })),
    // ChatGPT (OpenAI) - Iconic spiral/flower pattern
    gpt: /*#__PURE__*/React.createElement("svg", {
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg"
    }, /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "10",
      fill: color,
      fillOpacity: "0.15"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M12 4C14.5 4 16.5 5.5 17.5 7.5C19.5 8.5 20.5 10.5 20 13C20.5 15.5 19 17.5 17 18.5C16 20.5 14 21.5 11.5 21C9 21.5 7 20 6 18C4 17 3 15 3.5 12.5C3 10 4.5 8 6.5 7C7.5 5 9.5 4 12 4Z",
      fill: color,
      fillOpacity: "0.2"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M12 7V12M12 12L16 10M12 12L16 15M12 12L8 15M12 12L8 10M12 12V17",
      stroke: color,
      strokeWidth: "1.5",
      strokeLinecap: "round"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "2",
      fill: color
    })),
    // Gemini (Google) - Twin stars representing Gemini constellation
    gemini: /*#__PURE__*/React.createElement("svg", {
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg"
    }, /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "10",
      fill: color,
      fillOpacity: "0.15"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M8 6L9.5 10L6 11L9.5 12L8 16L10 13L12 16L14 13L16 16L14.5 12L18 11L14.5 10L16 6L14 9L12 6L10 9L8 6Z",
      fill: color
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "8",
      cy: "8",
      r: "1.5",
      fill: color,
      fillOpacity: "0.6"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "16",
      cy: "8",
      r: "1.5",
      fill: color,
      fillOpacity: "0.6"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M8 18C8 18 10 16 12 16C14 16 16 18 16 18",
      stroke: color,
      strokeWidth: "1.5",
      strokeLinecap: "round"
    })),
    // Llama (Meta) - Stylized llama head silhouette
    llama: /*#__PURE__*/React.createElement("svg", {
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg"
    }, /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "10",
      fill: color,
      fillOpacity: "0.15"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M8 5C8 5 6 6 6 9C6 11 7 12 7 14C7 16 6 18 8 19C10 20 12 19 13 18C14 19 16 19 17 18C18 17 18 15 17 14C17 12 18 10 17 8C16 6 14 5 12 6C10 5 9 5 8 5Z",
      fill: color,
      fillOpacity: "0.3"
    }), /*#__PURE__*/React.createElement("ellipse", {
      cx: "10",
      cy: "5",
      rx: "1.5",
      ry: "2.5",
      fill: color
    }), /*#__PURE__*/React.createElement("ellipse", {
      cx: "14",
      cy: "5",
      rx: "1.5",
      ry: "2.5",
      fill: color
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "9",
      cy: "10",
      r: "1",
      fill: color
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "13",
      cy: "10",
      r: "1",
      fill: color
    }), /*#__PURE__*/React.createElement("ellipse", {
      cx: "11",
      cy: "13",
      rx: "2",
      ry: "1",
      fill: color,
      fillOpacity: "0.5"
    })),
    // Mistral - Wind spiral / tornado pattern
    mistral: /*#__PURE__*/React.createElement("svg", {
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg"
    }, /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "10",
      fill: color,
      fillOpacity: "0.15"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M6 8H14C16 8 17 9 17 10C17 11 16 12 14 12H8",
      stroke: color,
      strokeWidth: "2",
      strokeLinecap: "round"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M6 12H16C18 12 19 13 19 14C19 15 18 16 16 16H10",
      stroke: color,
      strokeWidth: "2",
      strokeLinecap: "round"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M6 16H12C14 16 15 17 15 18C15 19 14 20 12 20H8",
      stroke: color,
      strokeWidth: "2",
      strokeLinecap: "round"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "6",
      cy: "8",
      r: "1",
      fill: color
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "6",
      cy: "12",
      r: "1",
      fill: color
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "6",
      cy: "16",
      r: "1",
      fill: color
    })),
    // Cohere - Connected nodes showing coherence/connection
    cohere: /*#__PURE__*/React.createElement("svg", {
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg"
    }, /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "10",
      fill: color,
      fillOpacity: "0.15"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M12 6L17 9M12 6L7 9M12 6V11M17 9V15M17 9L12 11M7 9V15M7 9L12 11M17 15L12 18M7 15L12 18M12 11V18",
      stroke: color,
      strokeWidth: "1.5",
      strokeLinecap: "round"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "6",
      r: "2",
      fill: color
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "17",
      cy: "9",
      r: "2",
      fill: color
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "7",
      cy: "9",
      r: "2",
      fill: color
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "17",
      cy: "15",
      r: "2",
      fill: color
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "7",
      cy: "15",
      r: "2",
      fill: color
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "18",
      r: "2",
      fill: color
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "11",
      r: "1.5",
      fill: color,
      fillOpacity: "0.6"
    })),
    // Grok (xAI) - X symbol with lightning bolt
    grok: /*#__PURE__*/React.createElement("svg", {
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg"
    }, /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "10",
      fill: color,
      fillOpacity: "0.15"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M7 7L17 17M17 7L7 17",
      stroke: color,
      strokeWidth: "2.5",
      strokeLinecap: "round"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M12 4L10 10H14L12 16",
      stroke: "#FFD700",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    })),
    // DeepSeek - Magnifying glass with depth layers
    deepseek: /*#__PURE__*/React.createElement("svg", {
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg"
    }, /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "10",
      fill: color,
      fillOpacity: "0.15"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "10",
      cy: "10",
      r: "5",
      stroke: color,
      strokeWidth: "2"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M14 14L19 19",
      stroke: color,
      strokeWidth: "2.5",
      strokeLinecap: "round"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "10",
      cy: "10",
      r: "3",
      fill: color,
      fillOpacity: "0.2"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "10",
      cy: "10",
      r: "1.5",
      fill: color,
      fillOpacity: "0.4"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "10",
      cy: "10",
      r: "0.5",
      fill: color
    })),
    // General AI - Universal brain/circuit pattern
    general: /*#__PURE__*/React.createElement("svg", {
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg"
    }, /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "10",
      fill: color,
      fillOpacity: "0.15"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M12 4C8 4 5 7 5 11C5 13 6 15 7 16C7 17 7 18 7 19H10C10 18 10 17 10 16H14C14 17 14 18 14 19H17C17 18 17 17 17 16C18 15 19 13 19 11C19 7 16 4 12 4Z",
      fill: color,
      fillOpacity: "0.3"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "9",
      cy: "10",
      r: "1.5",
      fill: color
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "15",
      cy: "10",
      r: "1.5",
      fill: color
    }), /*#__PURE__*/React.createElement("path", {
      d: "M9 14C9 14 10.5 15 12 15C13.5 15 15 14 15 14",
      stroke: color,
      strokeWidth: "1.5",
      strokeLinecap: "round"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M12 4V2M7 6L5.5 4.5M17 6L18.5 4.5",
      stroke: color,
      strokeWidth: "1.5",
      strokeLinecap: "round"
    }))
  };
  return /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center justify-center"
  }, icons[model] || icons.general);
};

// ==================== AUTO-RESIZE TEXTAREA COMPONENT ====================
// Textarea s automatickým rozšířením podle obsahu a manuálním resize
const AutoResizeTextarea = ({
  value,
  onChange,
  placeholder,
  className = "",
  minRows = 2,
  maxRows = 8,
  ...props
}) => {
  const textareaRef = useRef(null);

  // Funkce pro automatické nastavení výšky
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';

    // Vypočítej min a max výšku na základě řádků
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 20;
    const paddingY = parseInt(getComputedStyle(textarea).paddingTop) + parseInt(getComputedStyle(textarea).paddingBottom) || 16;
    const minHeight = lineHeight * minRows + paddingY;
    const maxHeight = lineHeight * maxRows + paddingY;

    // Nastav novou výšku
    const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
    textarea.style.height = `${newHeight}px`;
  }, [minRows, maxRows]);

  // Adjustovat výšku při změně hodnoty
  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  // Adjustovat výšku při mount
  useEffect(() => {
    adjustHeight();
    // Také adjustovat při resize okna
    window.addEventListener('resize', adjustHeight);
    return () => window.removeEventListener('resize', adjustHeight);
  }, [adjustHeight]);
  const handleChange = e => {
    onChange(e);
    // Malé zpoždění pro správné měření
    setTimeout(adjustHeight, 0);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "resize-handle-container"
  }, /*#__PURE__*/React.createElement("textarea", _extends({
    ref: textareaRef,
    value: value,
    onChange: handleChange,
    placeholder: placeholder,
    className: `auto-resize-textarea ${className}`
  }, props)));
};

// ==================== LOCALSTORAGE DATABASE ====================
const DB_KEY = 'ai_prompt_formatter_db';
const FOLDERS_KEY = 'ai_prompt_formatter_folders';
const TAGS_KEY = 'ai_prompt_formatter_tags';

// ==================== AUTO-SAVE & DRAFT SYSTEM ====================
const AUTOSAVE_KEY = 'ai_prompt_formatter_autosave';
const AUTOSAVE_HISTORY_KEY = 'ai_prompt_formatter_autosave_history';
const AUTOSAVE_INTERVAL = 30000; // 30 seconds
const MAX_AUTOSAVE_SLOTS = 10;

// Load current auto-save draft
const loadAutosaveDraft = () => {
  try {
    const data = localStorage.getItem(AUTOSAVE_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

// Save current draft
const saveAutosaveDraft = draft => {
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({
      ...draft,
      savedAt: new Date().toISOString()
    }));
    return true;
  } catch {
    return false;
  }
};

// Clear auto-save draft
const clearAutosaveDraft = () => {
  localStorage.removeItem(AUTOSAVE_KEY);
};

// Load auto-save history (past drafts)
const loadAutosaveHistory = () => {
  try {
    const data = localStorage.getItem(AUTOSAVE_HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

// Add to auto-save history (max 10 slots)
const addToAutosaveHistory = draft => {
  try {
    const history = loadAutosaveHistory();
    const newEntry = {
      ...draft,
      id: Date.now().toString(),
      savedAt: new Date().toISOString()
    };
    // Add to beginning and limit to MAX_AUTOSAVE_SLOTS
    const updated = [newEntry, ...history].slice(0, MAX_AUTOSAVE_SLOTS);
    localStorage.setItem(AUTOSAVE_HISTORY_KEY, JSON.stringify(updated));
    return true;
  } catch {
    return false;
  }
};

// Clear auto-save history
const clearAutosaveHistory = () => {
  localStorage.removeItem(AUTOSAVE_HISTORY_KEY);
};

// ==================== TOKEN ESTIMATION ====================
// Approximate token count (rough estimate: ~4 chars per token for English)
const estimateTokens = text => {
  if (!text) return 0;
  // More accurate estimation: count words and characters
  const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
  const chars = text.length;
  // GPT-style tokenization: roughly 0.75 tokens per word for English
  // For mixed content (code, special chars), use character-based estimate
  const wordBasedTokens = Math.ceil(words * 1.3);
  const charBasedTokens = Math.ceil(chars / 4);
  return Math.max(wordBasedTokens, charBasedTokens);
};

// Model token limits (context windows)
const MODEL_TOKEN_LIMITS = {
  claude: {
    name: 'Claude',
    limit: 200000,
    warning: 150000
  },
  gpt: {
    name: 'ChatGPT',
    limit: 128000,
    warning: 100000
  },
  gemini: {
    name: 'Gemini',
    limit: 1000000,
    warning: 800000
  },
  llama: {
    name: 'Llama',
    limit: 128000,
    warning: 100000
  },
  mistral: {
    name: 'Mistral',
    limit: 32000,
    warning: 25000
  },
  cohere: {
    name: 'Cohere',
    limit: 128000,
    warning: 100000
  },
  grok: {
    name: 'Grok',
    limit: 128000,
    warning: 100000
  },
  deepseek: {
    name: 'DeepSeek',
    limit: 64000,
    warning: 50000
  },
  general: {
    name: 'General',
    limit: 32000,
    warning: 25000
  }
};

// ==================== PROMPT QUALITY SCORING ====================
const calculatePromptScore = (fields, methods, template, extendedFields) => {
  let score = 0;
  const maxScore = 100;
  const suggestions = [];

  // Core elements (60 points)
  // Task is most important (25 points)
  if (fields.task?.length > 50) {
    score += 25;
  } else if (fields.task?.length > 20) {
    score += 15;
    suggestions.push({
      type: 'task',
      priority: 'medium',
      key: 'taskMore'
    });
  } else if (fields.task?.length > 5) {
    score += 8;
    suggestions.push({
      type: 'task',
      priority: 'high',
      key: 'taskRequired'
    });
  } else {
    suggestions.push({
      type: 'task',
      priority: 'critical',
      key: 'taskMissing'
    });
  }

  // Role (15 points)
  if (fields.role?.length > 20) {
    score += 15;
  } else if (fields.role?.length > 5) {
    score += 8;
    suggestions.push({
      type: 'role',
      priority: 'low',
      key: 'roleMore'
    });
  } else {
    suggestions.push({
      type: 'role',
      priority: 'medium',
      key: 'roleMissing'
    });
  }

  // Context (10 points)
  if (fields.context?.length > 30) {
    score += 10;
  } else if (fields.context?.length > 10) {
    score += 5;
    suggestions.push({
      type: 'context',
      priority: 'low',
      key: 'contextMore'
    });
  }

  // Output Format (10 points)
  if (fields.outputFormat?.length > 10) {
    score += 10;
  } else if (fields.outputFormat?.length > 0) {
    score += 5;
    suggestions.push({
      type: 'format',
      priority: 'low',
      key: 'formatMore'
    });
  } else {
    suggestions.push({
      type: 'format',
      priority: 'medium',
      key: 'formatMissing'
    });
  }

  // Methods (20 points)
  if (methods.length >= 2) {
    score += 15;
  } else if (methods.length === 1) {
    score += 10;
    suggestions.push({
      type: 'methods',
      priority: 'low',
      key: 'methodsMore'
    });
  } else {
    suggestions.push({
      type: 'methods',
      priority: 'low',
      key: 'methodsMissing'
    });
  }

  // Bonus for using recommended methods for the template
  const recommendedMethods = METHOD_CATEGORIES[template] || [];
  const usesRecommended = methods.some(m => recommendedMethods.includes(m));
  if (usesRecommended) {
    score += 5;
  }

  // Advanced elements (20 points)
  // Constraints (10 points)
  if (fields.constraints?.length > 20) {
    score += 10;
  } else if (fields.constraints?.length > 0) {
    score += 5;
  }

  // Examples (10 points)
  if (fields.examples?.length > 20) {
    score += 10;
  } else if (fields.examples?.length > 0) {
    score += 5;
  }

  // Determine grade
  const finalScore = Math.min(score, maxScore);
  let grade, gradeColor;
  if (finalScore >= 80) {
    grade = 'A';
    gradeColor = '#22c55e'; // green
  } else if (finalScore >= 60) {
    grade = 'B';
    gradeColor = '#84cc16'; // lime
  } else if (finalScore >= 40) {
    grade = 'C';
    gradeColor = '#eab308'; // yellow
  } else if (finalScore >= 20) {
    grade = 'D';
    gradeColor = '#f97316'; // orange
  } else {
    grade = 'F';
    gradeColor = '#ef4444'; // red
  }
  return {
    score: finalScore,
    grade,
    gradeColor,
    suggestions: suggestions.slice(0, 3) // Top 3 suggestions
  };
};

// ==================== QUICK-START TEMPLATES ====================
const QUICKSTART_TEMPLATES = {
  blog_post: {
    icon: 'FileText',
    fields: {
      role: 'a professional content writer and SEO specialist',
      task: 'Write an engaging blog post about [TOPIC]. The post should be informative, well-structured, and optimized for search engines.',
      context: 'Target audience: [AUDIENCE]. The blog should maintain a [TONE] tone while providing actionable insights.',
      constraints: 'Length: 1000-1500 words. Include an attention-grabbing headline, subheadings, and a clear call-to-action.',
      outputFormat: 'Markdown format with:\n- Compelling headline\n- Introduction hook\n- 3-5 main sections with subheadings\n- Bullet points for key takeaways\n- Conclusion with CTA'
    },
    template: 'creative',
    methods: ['emotion', 'fewshot']
  },
  debug_code: {
    icon: 'Bug',
    fields: {
      role: 'an expert software engineer and debugging specialist',
      task: 'Debug the following [LANGUAGE] code. Identify the bug, explain why it occurs, and provide a corrected version.',
      context: 'The code is supposed to [EXPECTED_BEHAVIOR] but instead [ACTUAL_BEHAVIOR].',
      constraints: 'Explain the bug clearly. Provide the complete corrected code. Include comments explaining the fix.',
      outputFormat: '1. Bug identification\n2. Root cause explanation\n3. Corrected code with comments\n4. Prevention tips'
    },
    template: 'coding',
    methods: ['cot', 'pal']
  },
  data_analysis: {
    icon: 'BarChart',
    fields: {
      role: 'a data analyst and business intelligence expert',
      task: 'Analyze the provided data set and extract meaningful insights, trends, and recommendations.',
      context: 'This data represents [DATA_DESCRIPTION]. The goal is to [ANALYSIS_GOAL].',
      constraints: 'Focus on actionable insights. Use statistical reasoning. Highlight key patterns and anomalies.',
      outputFormat: '1. Executive Summary\n2. Key Findings (with data points)\n3. Trend Analysis\n4. Recommendations\n5. Next Steps'
    },
    template: 'analysis',
    methods: ['cot', 'stepback']
  },
  social_media: {
    icon: 'Share2',
    fields: {
      role: 'a social media marketing expert and copywriter',
      task: 'Create engaging social media content about [TOPIC] for [PLATFORM].',
      context: 'Brand voice: [BRAND_VOICE]. Target audience: [AUDIENCE]. Campaign goal: [GOAL].',
      constraints: 'Keep within platform character limits. Include relevant hashtags. Make it shareable and engaging.',
      outputFormat: '- Main post copy\n- Hashtags (5-10 relevant)\n- Call-to-action\n- Best posting time suggestion\n- Alternative versions (2-3)'
    },
    template: 'marketing',
    methods: ['emotion', 'analogical']
  },
  email_professional: {
    icon: 'Mail',
    fields: {
      role: 'a professional business communication specialist',
      task: 'Write a professional email to [RECIPIENT] regarding [SUBJECT].',
      context: 'Purpose: [PURPOSE]. Our relationship with the recipient is [RELATIONSHIP]. Desired outcome: [OUTCOME].',
      constraints: 'Keep it concise and professional. Clear subject line. Appropriate greeting and closing.',
      outputFormat: 'Subject: [Clear subject]\n\n[Greeting]\n\n[Body - 2-3 paragraphs]\n\n[Call to action]\n\n[Professional closing]'
    },
    template: 'email',
    methods: ['risen', 'emotion']
  }
};

// Predefined tag colors palette
const TAG_COLORS = [{
  id: 'red',
  hex: '#ef4444',
  name: 'Red'
}, {
  id: 'orange',
  hex: '#f97316',
  name: 'Orange'
}, {
  id: 'amber',
  hex: '#f59e0b',
  name: 'Amber'
}, {
  id: 'yellow',
  hex: '#eab308',
  name: 'Yellow'
}, {
  id: 'lime',
  hex: '#84cc16',
  name: 'Lime'
}, {
  id: 'green',
  hex: '#22c55e',
  name: 'Green'
}, {
  id: 'emerald',
  hex: '#10b981',
  name: 'Emerald'
}, {
  id: 'teal',
  hex: '#14b8a6',
  name: 'Teal'
}, {
  id: 'cyan',
  hex: '#06b6d4',
  name: 'Cyan'
}, {
  id: 'sky',
  hex: '#0ea5e9',
  name: 'Sky'
}, {
  id: 'blue',
  hex: '#3b82f6',
  name: 'Blue'
}, {
  id: 'indigo',
  hex: '#6366f1',
  name: 'Indigo'
}, {
  id: 'violet',
  hex: '#8b5cf6',
  name: 'Violet'
}, {
  id: 'purple',
  hex: '#a855f7',
  name: 'Purple'
}, {
  id: 'fuchsia',
  hex: '#d946ef',
  name: 'Fuchsia'
}, {
  id: 'pink',
  hex: '#ec4899',
  name: 'Pink'
}, {
  id: 'rose',
  hex: '#f43f5e',
  name: 'Rose'
}, {
  id: 'slate',
  hex: '#64748b',
  name: 'Slate'
}];

// Prompts database
const loadDatabase = () => {
  try {
    const data = localStorage.getItem(DB_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};
const saveDatabase = prompts => {
  localStorage.setItem(DB_KEY, JSON.stringify(prompts));
};

// Folders database
const loadFolders = () => {
  try {
    const data = localStorage.getItem(FOLDERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};
const saveFolders = folders => {
  localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
};

// Tags database
const loadTags = () => {
  try {
    const data = localStorage.getItem(TAGS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};
const saveTags = tags => {
  localStorage.setItem(TAGS_KEY, JSON.stringify(tags));
};

// ==================== SHARE CODE SYSTEM ====================
// Generate share code from prompt data (using LZ-String URI encoding)
const ALL_METHODS = ['cot', 'zeroshot', 'fewshot', 'tot', 'selfconsistency', 'react', 'risen', 'emotion', 'plansolve', 'selfask', 'pal', 'selfrefine', 'stepback', 'analogical', 'rar', 'sot', 'got', 'bot', 'thot', 's2a', 'metaprompt', 'reflexion', 'contrastive', 'opro', 'confidence', 'cod', 'selfdiscover', 'rstar', 'slowthink'];
// Template and target indices for share code encoding
const ALL_TEMPLATES = ['general', 'coding', 'creative', 'analysis', 'explanation', 'email', 'academic', 'data', 'marketing', 'summarization', 'image_gen', 'translation', 'business', 'customer_service', 'productivity'];
const ALL_TARGETS = ['claude', 'gpt', 'gemini', 'llama', 'mistral', 'cohere', 'general'];
const generateShareCode = promptData => {
  try {
    // Get all language codes from AVAILABLE_LANGUAGES
    const langs = AVAILABLE_LANGUAGES.map(l => l.code);
    const minimal = {
      t: ALL_TEMPLATES.indexOf(promptData.template),
      a: ALL_TARGETS.indexOf(promptData.target),
      m: promptData.selectedMethods.map(m => ALL_METHODS.indexOf(m)).filter(i => i >= 0),
      l: langs.indexOf(promptData.lang),
      f: promptData.fields,
      // Enhanced examples data
      eft: ['none', 'excel', 'csv', 'json', 'table'].indexOf(promptData.exampleFileType || 'none'),
      eh: promptData.exampleHeaders || '',
      er: promptData.exampleRows || [{
        id: 1,
        content: ''
      }],
      // Model-specific features
      sf: promptData.selectedFeatures || {},
      // Extended sections
      ext: promptData.extendedFields || {}
    };
    const json = JSON.stringify(minimal);
    return LZString.compressToEncodedURIComponent(json);
  } catch (e) {
    return null;
  }
};

// Decode share code to prompt data
const decodeShareCode = code => {
  try {
    const cleanCode = code.trim().replace(/\s+/g, '');
    const json = LZString.decompressFromEncodedURIComponent(cleanCode);
    if (!json) return null;
    const minimal = JSON.parse(json);
    const fileTypes = ['none', 'excel', 'csv', 'json', 'table'];
    // Get all language codes from AVAILABLE_LANGUAGES
    const langs = AVAILABLE_LANGUAGES.map(l => l.code);

    // Default extended fields structure
    const defaultExtended = {
      analysisAreas: [],
      technicalOutput: [],
      priorityRating: false,
      focusPrimary: '',
      focusSecondary: '',
      focusIgnore: '',
      targetUrl: '',
      competitors: [],
      deliverables: [],
      emailStyle: '',
      emailLanguage: '',
      translationStyle: '',
      supportTone: ''
    };
    return {
      template: ALL_TEMPLATES[minimal.t] || 'general',
      target: ALL_TARGETS[minimal.a] || 'claude',
      selectedMethods: (minimal.m || []).map(i => ALL_METHODS[i]).filter(Boolean),
      lang: langs[minimal.l] || 'en',
      fields: minimal.f || {
        role: '',
        task: '',
        context: '',
        constraints: '',
        outputFormat: '',
        examples: ''
      },
      // Enhanced examples data
      exampleFileType: fileTypes[minimal.eft] || 'none',
      exampleHeaders: minimal.eh || '',
      exampleRows: minimal.er || [{
        id: 1,
        content: ''
      }],
      // Model-specific features
      selectedFeatures: minimal.sf || {},
      // Extended sections (merge with defaults to ensure all keys exist)
      extendedFields: {
        ...defaultExtended,
        ...(minimal.ext || {})
      }
    };
  } catch (e) {
    return null;
  }
};

// Get shareable URL
const getShareURL = code => {
  const url = new URL(window.location.href);
  url.searchParams.set('share', code);
  return url.toString();
};

// Check URL for share code on load
const getShareCodeFromURL = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get('share');
};

// ==================== TEMPLATE ICONS ====================
// Extended with 10 new categories based on 2024-2025 AI usage research
const templateIcons = {
  general: 'FileText',
  coding: 'Code',
  creative: 'Pencil',
  analysis: 'Lightbulb',
  explanation: 'MessageSquare',
  // New categories from usage research (2025)
  email: 'Mail',
  // Professional Email & Communication - 5.5%+ usage
  academic: 'GraduationCap',
  // Academic & Research Writing - 2nd largest use case
  data: 'Table',
  // Data & Spreadsheet Tasks - 55% efficiency gains
  marketing: 'Megaphone',
  // Marketing & SEO Content - 77% industry adoption
  summarization: 'FileSearch',
  // Document Summarization
  image_gen: 'Image',
  // Image Generation Prompts - 2%→7% growth
  translation: 'Languages',
  // Translation & Language - 44% business interest
  business: 'Briefcase',
  // Business Documents & Reports
  customer_service: 'Headphones',
  // Customer Service Responses - 56% adoption
  productivity: 'ListTodo' // Personal Productivity & Planning - 70% non-work usage
};

// ==================== METHOD-CATEGORY MAPPING ====================
// Defines which methods are recommended for each prompt category
// Based on research: EmotionPrompt works everywhere, PAL is best for coding
// Updated 2024-2025: Added SoT, GoT, BoT, ThoT, S2A, Meta-Prompting, Reflexion, Contrastive, OPRO, Confidence
// Updated Feb 2025: Added CoD (Chain of Draft), Self-Discover, rStar, Slow Thinking
const METHOD_CATEGORIES = {
  general: ['emotion', 'fewshot', 'risen', 'rar', 'zeroshot', 'cot', 'sot', 'opro', 'confidence', 'cod', 'selfdiscover'],
  coding: ['emotion', 'pal', 'cot', 'fewshot', 'zeroshot', 'tot', 'selfconsistency', 'react', 'plansolve', 'selfrefine', 'got', 'bot', 'reflexion', 'metaprompt', 'selfdiscover', 'rstar', 'slowthink'],
  creative: ['emotion', 'fewshot', 'analogical', 'selfrefine', 'rar', 'sot', 'reflexion', 'cod'],
  analysis: ['emotion', 'fewshot', 'cot', 'zeroshot', 'tot', 'selfconsistency', 'react', 'plansolve', 'selfask', 'stepback', 'got', 's2a', 'thot', 'metaprompt', 'contrastive', 'confidence', 'selfdiscover', 'slowthink'],
  explanation: ['emotion', 'fewshot', 'zeroshot', 'selfask', 'stepback', 'analogical', 'rar', 'sot', 'thot', 'cod'],
  // New categories from 2025 research
  email: ['emotion', 'fewshot', 'rar', 'risen', 'sot', 'cod'],
  academic: ['emotion', 'fewshot', 'cot', 'selfask', 'stepback', 'selfrefine', 'got', 'bot', 's2a', 'contrastive', 'confidence', 'selfdiscover', 'rstar', 'slowthink'],
  data: ['emotion', 'pal', 'cot', 'fewshot', 'plansolve', 'got', 'bot', 'confidence', 'rstar', 'cod'],
  marketing: ['emotion', 'fewshot', 'analogical', 'selfrefine', 'rar', 'sot', 'reflexion', 'cod'],
  summarization: ['emotion', 'cot', 'zeroshot', 'stepback', 'thot', 's2a', 'sot', 'cod'],
  image_gen: ['fewshot', 'analogical', 'rar', 'sot'],
  translation: ['emotion', 'fewshot', 'rar', 'selfrefine', 'contrastive', 'cod'],
  business: ['emotion', 'fewshot', 'risen', 'cot', 'plansolve', 'sot', 'metaprompt', 'confidence', 'selfdiscover', 'cod'],
  customer_service: ['emotion', 'fewshot', 'rar', 'risen', 'reflexion', 'cod'],
  productivity: ['emotion', 'plansolve', 'risen', 'zeroshot', 'sot', 'opro', 'cod']
};

// Extended sections visibility per template category
// Defines which extended options appear for each template
const EXTENDED_SECTIONS_CONFIG = {
  general: {
    showTargetUrl: false,
    showAnalysisAreas: false,
    showTechnicalOutput: false,
    showPriority: true,
    showFocusAreas: false,
    showCompetitors: false,
    showDeliverables: true
  },
  coding: {
    showTargetUrl: false,
    showAnalysisAreas: false,
    showTechnicalOutput: true,
    showPriority: true,
    showFocusAreas: false,
    showCompetitors: false,
    showDeliverables: true,
    technicalOutputOptions: ['css', 'html', 'javascript', 'python'],
    deliverablesOptions: ['tech_specs', 'checklist']
  },
  creative: {
    showTargetUrl: false,
    showAnalysisAreas: false,
    showTechnicalOutput: false,
    showPriority: false,
    showFocusAreas: true,
    showCompetitors: false,
    showDeliverables: false
  },
  analysis: {
    showTargetUrl: true,
    showAnalysisAreas: true,
    showTechnicalOutput: true,
    showPriority: true,
    showFocusAreas: true,
    showCompetitors: true,
    showDeliverables: true,
    analysisAreasOptions: ['visual_design', 'ui_components', 'ux_analysis', 'content_analysis', 'technical_elements', 'legal_compliance']
  },
  explanation: {
    showTargetUrl: false,
    showAnalysisAreas: false,
    showTechnicalOutput: false,
    showPriority: false,
    showFocusAreas: true,
    showCompetitors: false,
    showDeliverables: false
  },
  email: {
    showTargetUrl: false,
    showAnalysisAreas: false,
    showTechnicalOutput: false,
    showPriority: false,
    showFocusAreas: false,
    showCompetitors: false,
    showDeliverables: false,
    // Template-specific
    showEmailStyle: true,
    showEmailLanguage: true
  },
  academic: {
    showTargetUrl: false,
    showAnalysisAreas: false,
    showTechnicalOutput: false,
    showPriority: true,
    showFocusAreas: true,
    showCompetitors: false,
    showDeliverables: true,
    deliverablesOptions: ['report', 'recommendations']
  },
  data: {
    showTargetUrl: false,
    showAnalysisAreas: false,
    showTechnicalOutput: true,
    showPriority: false,
    showFocusAreas: false,
    showCompetitors: false,
    showDeliverables: true,
    technicalOutputOptions: ['python', 'javascript'],
    deliverablesOptions: ['tech_specs', 'report']
  },
  marketing: {
    showTargetUrl: true,
    showAnalysisAreas: true,
    showTechnicalOutput: false,
    showPriority: true,
    showFocusAreas: true,
    showCompetitors: true,
    showDeliverables: true,
    analysisAreasOptions: ['content_analysis', 'ux_analysis'],
    deliverablesOptions: ['report', 'recommendations', 'checklist']
  },
  summarization: {
    showTargetUrl: false,
    showAnalysisAreas: false,
    showTechnicalOutput: false,
    showPriority: false,
    showFocusAreas: true,
    showCompetitors: false,
    showDeliverables: true,
    deliverablesOptions: ['report']
  },
  image_gen: {
    showTargetUrl: false,
    showAnalysisAreas: true,
    showTechnicalOutput: false,
    showPriority: false,
    showFocusAreas: true,
    showCompetitors: false,
    showDeliverables: false,
    analysisAreasOptions: ['visual_design']
  },
  translation: {
    showTargetUrl: false,
    showAnalysisAreas: false,
    showTechnicalOutput: false,
    showPriority: false,
    showFocusAreas: false,
    showCompetitors: false,
    showDeliverables: false,
    // Template-specific
    showTranslationStyle: true,
    showEmailLanguage: true // reuse for target language
  },
  business: {
    showTargetUrl: false,
    showAnalysisAreas: false,
    showTechnicalOutput: false,
    showPriority: true,
    showFocusAreas: true,
    showCompetitors: true,
    showDeliverables: true,
    deliverablesOptions: ['report', 'recommendations', 'checklist']
  },
  customer_service: {
    showTargetUrl: false,
    showAnalysisAreas: false,
    showTechnicalOutput: false,
    showPriority: false,
    showFocusAreas: false,
    showCompetitors: false,
    showDeliverables: false,
    // Template-specific
    showSupportTone: true
  },
  productivity: {
    showTargetUrl: false,
    showAnalysisAreas: false,
    showTechnicalOutput: false,
    showPriority: true,
    showFocusAreas: true,
    showCompetitors: false,
    showDeliverables: true,
    deliverablesOptions: ['checklist']
  }
};
const methodIcons = {
  cot: 'Brain',
  zeroshot: 'Sparkles',
  fewshot: 'Zap',
  tot: 'TreeDeciduous',
  selfconsistency: 'RefreshCw',
  react: 'GitBranch',
  risen: 'Target',
  emotion: 'Heart',
  plansolve: 'ClipboardList',
  selfask: 'HelpCircle',
  pal: 'Code2',
  selfrefine: 'RotateCw',
  stepback: 'ArrowLeftCircle',
  analogical: 'GitCompare',
  rar: 'MessageCircle',
  // === NEW 2024-2025 METHOD ICONS ===
  sot: 'Layers',             // Skeleton structure
  got: 'Share2',             // Graph network
  bot: 'Database',           // Buffer/memory storage
  thot: 'AlignJustify',      // Thread/segments
  s2a: 'Filter',             // Filtering attention
  metaprompt: 'Users',       // Multi-expert
  reflexion: 'History',      // Memory/reflection loop
  contrastive: 'Columns',    // Compare positive/negative
  opro: 'Sparkles',          // Optimization magic
  confidence: 'Gauge',       // Confidence meter
  // === 2025 METHOD ICONS ===
  cod: 'Zap',                // Fast/efficient
  selfdiscover: 'Compass',   // Self-navigation
  rstar: 'TreeDeciduous',    // Tree search (MCTS)
  slowthink: 'Clock'         // Deliberate thinking
};

// ==================== METHOD GROUPS (Categories) ====================
// Organize 29 methods into logical groups for better UI
const METHOD_GROUPS = {
  reasoning: {
    icon: 'Brain',
    methods: ['cot', 'zeroshot', 'tot', 'got', 'bot', 'thot', 's2a', 'stepback', 'selfask', 'slowthink']
  },
  efficiency: {
    icon: 'Zap',
    methods: ['cod', 'sot', 'selfdiscover', 'opro']
  },
  selfImprovement: {
    icon: 'RotateCw',
    methods: ['selfrefine', 'reflexion', 'selfconsistency', 'contrastive', 'rstar']
  },
  inContext: {
    icon: 'BookOpen',
    methods: ['fewshot', 'analogical', 'rar']
  },
  structured: {
    icon: 'Target',
    methods: ['risen', 'react', 'metaprompt', 'plansolve', 'pal']
  },
  quality: {
    icon: 'Award',
    methods: ['emotion', 'confidence']
  }
};

// ==================== MAIN APP ====================
const App = () => {
  const [lang, setLangState] = useState(() => localStorage.getItem('ai-prompt-lang') || 'en');
  const [template, setTemplate] = useState('general');
  const [target, setTarget] = useState('claude');
  const [copied, setCopied] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedMethods, setSelectedMethods] = useState([]);
  const [showMethodInfo, setShowMethodInfo] = useState(null);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [showDatabase, setShowDatabase] = useState(false);
  const [savedPrompts, setSavedPrompts] = useState([]);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [promptName, setPromptName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [notification, setNotification] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [shareData, setShareData] = useState(null);
  const [importCode, setImportCode] = useState('');
  const [showColors, setShowColors] = useState(true);
  const [showAllMethods, setShowAllMethods] = useState(false);
  const [showMethodsModal, setShowMethodsModal] = useState(false);
  const [expandedMethodGroup, setExpandedMethodGroup] = useState(null);

  // Model-specific features state - tracks which optional features are enabled for each model
  const [selectedFeatures, setSelectedFeatures] = useState({});

  // Verification feature states
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showApiSettingsModal, setShowApiSettingsModal] = useState(false);
  const [verifyResult, setVerifyResult] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [verifyStatus, setVerifyStatus] = useState(''); // Current status message
  const [verifyElapsed, setVerifyElapsed] = useState(0); // Elapsed time in seconds
  const [apiProvider, setApiProvider] = useState(() => localStorage.getItem('ai-prompt-api-provider') || 'gemini');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('ai-prompt-api-key') || '');
  const [tempApiKey, setTempApiKey] = useState('');

  // Tutorial feature states
  const [showTutorialConfirm, setShowTutorialConfirm] = useState(false);
  const [tutorialActive, setTutorialActive] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const prevTemplateRef = useRef(null);
  const prevTargetRef = useRef(null);
  const formattedPromptRef = useRef(''); // Ref for keyboard shortcuts

  // ==================== AUTO-SAVE & DRAFT SYSTEM STATES ====================
  const [autoSaveStatus, setAutoSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'error'
  const [lastAutoSave, setLastAutoSave] = useState(null);
  const [showDraftRecovery, setShowDraftRecovery] = useState(false);
  const [recoveryDraft, setRecoveryDraft] = useState(null);
  const [showDraftHistory, setShowDraftHistory] = useState(false);
  const [draftHistory, setDraftHistory] = useState([]);
  const autoSaveTimerRef = useRef(null);
  const lastSavedStateRef = useRef(null);

  // ==================== TOKEN COUNTER STATES ====================
  const [showTokenInfo, setShowTokenInfo] = useState(false);

  // ==================== KEYBOARD SHORTCUTS STATES ====================
  const [showShortcuts, setShowShortcuts] = useState(false);

  // ==================== QUICK-START TEMPLATES STATES ====================
  const [showQuickStart, setShowQuickStart] = useState(false);

  // Tutorial steps configuration
  const tutorialSteps = [{
    id: 'welcome',
    target: null,
    position: 'center'
  }, {
    id: 'template',
    target: 'template-selector',
    position: 'right'
  }, {
    id: 'aiModel',
    target: 'ai-model-selector',
    position: 'right'
  }, {
    id: 'role',
    target: 'field-role',
    position: 'right'
  }, {
    id: 'task',
    target: 'field-task',
    position: 'right'
  }, {
    id: 'context',
    target: 'field-context',
    position: 'right'
  }, {
    id: 'methods',
    target: 'methods-section',
    position: 'left'
  }, {
    id: 'preview',
    target: 'preview-section',
    position: 'left'
  }, {
    id: 'actions',
    target: 'action-buttons',
    position: 'bottom'
  }];
  const [fields, setFields] = useState({
    role: '',
    task: '',
    context: '',
    constraints: '',
    outputFormat: '',
    examples: ''
  });

  // Extended sections state - advanced formatting options
  const [showExtendedSections, setShowExtendedSections] = useState(false);
  const [extendedFields, setExtendedFields] = useState({
    // Analysis areas (checkboxes)
    analysisAreas: [],
    // Technical output (checkboxes)
    technicalOutput: [],
    // Priority rating enabled
    priorityRating: false,
    // Focus areas
    focusPrimary: '',
    focusSecondary: '',
    focusIgnore: '',
    // Target URL
    targetUrl: '',
    // Competitor URLs
    competitors: [],
    // Final deliverables (checkboxes)
    deliverables: [],
    // Template-specific options
    emailStyle: '',
    emailLanguage: '',
    translationStyle: '',
    supportTone: ''
  });
  const updateExtendedField = (key, value) => setExtendedFields(prev => ({
    ...prev,
    [key]: value
  }));
  const toggleExtendedArray = (key, value) => setExtendedFields(prev => ({
    ...prev,
    [key]: prev[key].includes(value) ? prev[key].filter(v => v !== value) : [...prev[key], value]
  }));

  // Enhanced examples state - supports structured data formats and multiple rows
  const [exampleFileType, setExampleFileType] = useState('none'); // none, excel, csv, json, table
  const [exampleHeaders, setExampleHeaders] = useState(''); // Column headers for structured formats
  const [exampleRows, setExampleRows] = useState([{
    id: 1,
    content: ''
  }]); // Dynamic rows with (+) separator

  // ==================== FOLDERS & TAGS STATE ====================
  // Folders and tags data
  const [folders, setFolders] = useState([]);
  const [tags, setTags] = useState([]);

  // Save modal - folder and tag selection
  const [selectedFolderId, setSelectedFolderId] = useState(null); // null = root
  const [selectedTagIds, setSelectedTagIds] = useState([]);

  // Database panel - navigation and filtering
  const [currentFolderId, setCurrentFolderId] = useState(null); // null = show all/root
  const [filterTagId, setFilterTagId] = useState(null); // null = no filter

  // Folder/Tag management modals
  const [showFolderManager, setShowFolderManager] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null); // {id, name, color} or null for new
  const [editingTag, setEditingTag] = useState(null); // {id, name, color} or null for new
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('blue');
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('blue');

  // Color picker visibility states
  const [showNewFolderColorPicker, setShowNewFolderColorPicker] = useState(false);
  const [showEditFolderColorPicker, setShowEditFolderColorPicker] = useState(false);
  const [showNewTagColorPicker, setShowNewTagColorPicker] = useState(false);
  const [showEditTagColorPicker, setShowEditTagColorPicker] = useState(false);

  // Checklist sidebar state - collapsed by default
  const [checklistExpanded, setChecklistExpanded] = useState(false);
  const [highlightedField, setHighlightedField] = useState(null);

  // Map checklist steps to form field IDs
  const stepToFieldMap = {
    role: 'field-role',
    context: 'field-context',
    task: 'field-task',
    constraints: 'field-constraints',
    format: 'field-outputFormat',
    examples: 'field-examples',
    methods: 'methods-section'
  };

  // Highlight field when clicking on checklist step
  const highlightField = stepKey => {
    const fieldId = stepToFieldMap[stepKey];
    if (fieldId) {
      setHighlightedField(fieldId);
      const element = document.getElementById(fieldId);
      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
      // Remove highlight after 3 seconds
      setTimeout(() => setHighlightedField(null), 3000);
    }
  };

  // Get translations for current language (direct lookup, no API)
  const t = getTranslations(lang);
  const selectedLang = AVAILABLE_LANGUAGES.find(l => l.code === lang);

  // Language change handler (simple, synchronous)
  const setLang = useCallback(newLang => {
    setShowLangDropdown(false);
    setLangState(newLang);
    localStorage.setItem('ai-prompt-lang', newLang);
  }, []);

  // Initialize language on mount (using IP geolocation)
  useEffect(() => {
    initializeLanguageFromGeo().then(initLang => {
      setLang(initLang);
    });
  }, []);

  // Load database on mount
  useEffect(() => {
    setSavedPrompts(loadDatabase());
    setFolders(loadFolders());
    setTags(loadTags());
  }, []);

  // ==================== AUTO-SAVE & DRAFT SYSTEM LOGIC ====================
  // Check for draft recovery on mount
  useEffect(() => {
    const draft = loadAutosaveDraft();
    if (draft && draft.fields) {
      // Check if there's meaningful content to recover
      const hasContent = Object.values(draft.fields).some(v => v && v.length > 0);
      if (hasContent) {
        setRecoveryDraft(draft);
        setShowDraftRecovery(true);
      }
    }
    // Load draft history
    setDraftHistory(loadAutosaveHistory());
  }, []);

  // Auto-save timer effect
  useEffect(() => {
    const performAutoSave = () => {
      // Only save if there's meaningful content
      const hasContent = Object.values(fields).some(v => v && v.length > 0);
      if (!hasContent) return;

      // Check if state has changed since last save
      const currentState = JSON.stringify({
        fields,
        template,
        target,
        selectedMethods,
        exampleFileType,
        exampleHeaders,
        exampleRows,
        selectedFeatures,
        extendedFields
      });
      if (currentState === lastSavedStateRef.current) return;
      setAutoSaveStatus('saving');
      const draft = {
        fields,
        template,
        target,
        selectedMethods,
        lang,
        exampleFileType,
        exampleHeaders,
        exampleRows,
        selectedFeatures,
        extendedFields
      };
      if (saveAutosaveDraft(draft)) {
        lastSavedStateRef.current = currentState;
        setLastAutoSave(new Date());
        setAutoSaveStatus('saved');
        // Also add to history periodically (every 5 minutes)
        const history = loadAutosaveHistory();
        const lastHistoryTime = history.length > 0 ? new Date(history[0].savedAt).getTime() : 0;
        if (Date.now() - lastHistoryTime > 300000) {
          // 5 minutes
          addToAutosaveHistory(draft);
          setDraftHistory(loadAutosaveHistory());
        }
        // Reset to idle after 3 seconds
        setTimeout(() => setAutoSaveStatus('idle'), 3000);
      } else {
        setAutoSaveStatus('error');
        setTimeout(() => setAutoSaveStatus('idle'), 3000);
      }
    };

    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current);
    }

    // Set up new timer
    autoSaveTimerRef.current = setInterval(performAutoSave, AUTOSAVE_INTERVAL);

    // Cleanup on unmount
    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [fields, template, target, selectedMethods, exampleFileType, exampleHeaders, exampleRows, selectedFeatures, extendedFields, lang]);

  // Immediate save on significant field changes (debounced)
  const saveOnChangeRef = useRef(null);
  useEffect(() => {
    const hasContent = Object.values(fields).some(v => v && v.length > 0);
    if (!hasContent) return;
    if (saveOnChangeRef.current) {
      clearTimeout(saveOnChangeRef.current);
    }
    saveOnChangeRef.current = setTimeout(() => {
      const currentState = JSON.stringify({
        fields,
        template,
        target,
        selectedMethods
      });
      if (currentState !== lastSavedStateRef.current) {
        const draft = {
          fields,
          template,
          target,
          selectedMethods,
          lang,
          exampleFileType,
          exampleHeaders,
          exampleRows,
          selectedFeatures,
          extendedFields
        };
        saveAutosaveDraft(draft);
        lastSavedStateRef.current = currentState;
        setLastAutoSave(new Date());
      }
    }, 2000); // 2 second debounce

    return () => {
      if (saveOnChangeRef.current) {
        clearTimeout(saveOnChangeRef.current);
      }
    };
  }, [fields]);

  // Recover draft function
  const recoverDraft = () => {
    if (recoveryDraft) {
      setTemplate(recoveryDraft.template || 'general');
      setTarget(recoveryDraft.target || 'claude');
      setFields(recoveryDraft.fields || {
        role: '',
        task: '',
        context: '',
        constraints: '',
        outputFormat: '',
        examples: ''
      });
      setSelectedMethods(recoveryDraft.selectedMethods || []);
      if (recoveryDraft.lang) setLang(recoveryDraft.lang);
      setExampleFileType(recoveryDraft.exampleFileType || 'none');
      setExampleHeaders(recoveryDraft.exampleHeaders || '');
      setExampleRows(recoveryDraft.exampleRows || [{
        id: 1,
        content: ''
      }]);
      setSelectedFeatures(recoveryDraft.selectedFeatures || {});
      setExtendedFields({
        ...extendedFields,
        ...(recoveryDraft.extendedFields || {})
      });
      showNotification(t.autoSave?.recovered || 'Draft recovered!');
    }
    setShowDraftRecovery(false);
    setRecoveryDraft(null);
  };

  // Dismiss draft recovery
  const dismissDraftRecovery = () => {
    setShowDraftRecovery(false);
    setRecoveryDraft(null);
    clearAutosaveDraft();
  };

  // Load draft from history
  const loadDraftFromHistory = draft => {
    setTemplate(draft.template || 'general');
    setTarget(draft.target || 'claude');
    setFields(draft.fields || {
      role: '',
      task: '',
      context: '',
      constraints: '',
      outputFormat: '',
      examples: ''
    });
    setSelectedMethods(draft.selectedMethods || []);
    if (draft.lang) setLang(draft.lang);
    setExampleFileType(draft.exampleFileType || 'none');
    setExampleHeaders(draft.exampleHeaders || '');
    setExampleRows(draft.exampleRows || [{
      id: 1,
      content: ''
    }]);
    setSelectedFeatures(draft.selectedFeatures || {});
    setExtendedFields({
      ...extendedFields,
      ...(draft.extendedFields || {})
    });
    setShowDraftHistory(false);
    showNotification(t.autoSave?.loaded || 'Draft loaded!');
  };

  // ==================== KEYBOARD SHORTCUTS ====================
  useEffect(() => {
    const handleKeyDown = e => {
      // Don't trigger if user is typing in an input/textarea
      const isTyping = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';

      // Ctrl/Cmd + S: Save prompt
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (formattedPromptRef.current && !saveModalOpen) {
          setSaveModalOpen(true);
        }
      }

      // Ctrl/Cmd + Enter: Verify with AI
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (formattedPromptRef.current && !verifyLoading) {
          verifyPromptWithAI();
        }
      }

      // Ctrl/Cmd + Shift + N: New prompt (reset form)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        resetForm();
        showNotification(t.autoSave?.newPrompt || 'New prompt started');
      }

      // Escape: Close modals
      if (e.key === 'Escape') {
        if (showShortcuts) setShowShortcuts(false);else if (showQuickStart) setShowQuickStart(false);else if (showDraftHistory) setShowDraftHistory(false);else if (showTokenInfo) setShowTokenInfo(false);else if (showVerifyModal) setShowVerifyModal(false);else if (saveModalOpen) setSaveModalOpen(false);else if (showShareModal) setShowShareModal(false);else if (showDatabase) setShowDatabase(false);
      }

      // Ctrl/Cmd + ?: Show shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setShowShortcuts(prev => !prev);
      }

      // Ctrl/Cmd + D: Open database
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && !isTyping) {
        e.preventDefault();
        setShowDatabase(prev => !prev);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [saveModalOpen, verifyLoading, showShortcuts, showQuickStart, showDraftHistory, showTokenInfo, showVerifyModal, showShareModal, showDatabase]);

  // ==================== PROMPT QUALITY SCORE (doesn't depend on formattedPrompt) ====================
  // Calculate prompt quality score
  const promptScore = useMemo(() => {
    return calculatePromptScore(fields, selectedMethods, template, extendedFields);
  }, [fields, selectedMethods, template, extendedFields]);

  // Get current model's token limits (doesn't depend on formattedPrompt)
  const currentModelLimits = useMemo(() => {
    return MODEL_TOKEN_LIMITS[target] || MODEL_TOKEN_LIMITS.general;
  }, [target]);

  // NOTE: tokenCount and tokenWarning are defined after formattedPrompt

  // ==================== QUICK-START TEMPLATE FUNCTIONS ====================
  const applyQuickStartTemplate = templateKey => {
    const quickTemplate = QUICKSTART_TEMPLATES[templateKey];
    if (!quickTemplate) return;
    setTemplate(quickTemplate.template || 'general');
    setFields({
      ...fields,
      ...quickTemplate.fields,
      examples: fields.examples || '' // Preserve existing examples
    });
    setSelectedMethods(quickTemplate.methods || []);
    setShowQuickStart(false);
    showNotification(t.quickStart?.applied || 'Template applied!');
  };

  // ==================== FOLDERS & TAGS CRUD FUNCTIONS ====================
  // Folder CRUD
  const addFolder = () => {
    if (!newFolderName.trim()) return;
    const folder = {
      id: Date.now().toString(),
      name: newFolderName.trim(),
      color: newFolderColor,
      createdAt: new Date().toISOString()
    };
    const updated = [...folders, folder];
    setFolders(updated);
    saveFolders(updated);
    setNewFolderName('');
    setNewFolderColor('blue');
    showNotification(t.database.folders.newFolder + ': ' + folder.name);
  };
  const updateFolder = (id, name, color) => {
    const updated = folders.map(f => f.id === id ? {
      ...f,
      name,
      color
    } : f);
    setFolders(updated);
    saveFolders(updated);
    setEditingFolder(null);
  };
  const deleteFolder = id => {
    // Move prompts from this folder to root
    const updatedPrompts = savedPrompts.map(p => p.folderId === id ? {
      ...p,
      folderId: null
    } : p);
    setSavedPrompts(updatedPrompts);
    saveDatabase(updatedPrompts);
    // Delete folder
    const updated = folders.filter(f => f.id !== id);
    setFolders(updated);
    saveFolders(updated);
    if (currentFolderId === id) setCurrentFolderId(null);
  };

  // Tag CRUD
  const addTag = () => {
    if (!newTagName.trim()) return;
    const tag = {
      id: Date.now().toString(),
      name: newTagName.trim(),
      color: newTagColor,
      createdAt: new Date().toISOString()
    };
    const updated = [...tags, tag];
    setTags(updated);
    saveTags(updated);
    setNewTagName('');
    setNewTagColor('blue');
    showNotification(t.database.tags.newTag + ': ' + tag.name);
  };
  const updateTag = (id, name, color) => {
    const updated = tags.map(t => t.id === id ? {
      ...t,
      name,
      color
    } : t);
    setTags(updated);
    saveTags(updated);
    setEditingTag(null);
  };
  const deleteTag = id => {
    // Remove tag from all prompts
    const updatedPrompts = savedPrompts.map(p => ({
      ...p,
      tags: (p.tags || []).filter(t => t !== id)
    }));
    setSavedPrompts(updatedPrompts);
    saveDatabase(updatedPrompts);
    // Delete tag
    const updated = tags.filter(t => t.id !== id);
    setTags(updated);
    saveTags(updated);
    if (filterTagId === id) setFilterTagId(null);
  };

  // Get filtered prompts based on current folder and tag filter
  const getFilteredPrompts = useMemo(() => {
    let filtered = savedPrompts;
    // Filter by folder
    if (currentFolderId !== null) {
      filtered = filtered.filter(p => p.folderId === currentFolderId);
    }
    // Filter by tag
    if (filterTagId !== null) {
      filtered = filtered.filter(p => (p.tags || []).includes(filterTagId));
    }
    return filtered;
  }, [savedPrompts, currentFolderId, filterTagId]);

  // Get prompts in root (no folder)
  const rootPrompts = useMemo(() => {
    return savedPrompts.filter(p => !p.folderId);
  }, [savedPrompts]);

  // Get tag color helper
  const getTagColor = colorId => {
    const color = TAG_COLORS.find(c => c.id === colorId);
    return color ? color.hex : '#64748b';
  };

  // Save language
  useEffect(() => {
    localStorage.setItem('ai-prompt-lang', lang);
  }, [lang]);

  // Auto-advance tutorial when user selects template
  useEffect(() => {
    // Only advance if template actually changed (not initial render)
    if (tutorialActive && tutorialSteps[tutorialStep]?.id === 'template' && prevTemplateRef.current !== null && prevTemplateRef.current !== template) {
      // User selected a template, advance to next step
      const timer = setTimeout(() => {
        setTutorialStep(prev => prev + 1);
        const nextTarget = tutorialSteps[tutorialStep + 1]?.target;
        if (nextTarget) {
          document.getElementById(nextTarget)?.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
        }
      }, 400);
      return () => clearTimeout(timer);
    }
    prevTemplateRef.current = template;
  }, [template, tutorialActive, tutorialStep]);

  // Auto-advance tutorial when user selects AI model
  useEffect(() => {
    // Only advance if target actually changed (not initial render)
    if (tutorialActive && tutorialSteps[tutorialStep]?.id === 'aiModel' && prevTargetRef.current !== null && prevTargetRef.current !== target) {
      // User selected an AI model, advance to next step
      const timer = setTimeout(() => {
        setTutorialStep(prev => prev + 1);
        const nextTarget = tutorialSteps[tutorialStep + 1]?.target;
        if (nextTarget) {
          document.getElementById(nextTarget)?.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
        }
      }, 400);
      return () => clearTimeout(timer);
    }
    prevTargetRef.current = target;
  }, [target, tutorialActive, tutorialStep]);

  // Auto-scroll to tutorial target element when step changes
  useEffect(() => {
    if (tutorialActive && tutorialStep > 0) {
      const currentTarget = tutorialSteps[tutorialStep]?.target;
      if (currentTarget) {
        const element = document.getElementById(currentTarget);
        if (element) {
          setTimeout(() => {
            element.scrollIntoView({
              behavior: 'smooth',
              block: 'center'
            });
          }, 100);
        }
      }
    }
  }, [tutorialStep, tutorialActive]);

  // Close color pickers when clicking outside
  useEffect(() => {
    const handleClickOutside = e => {
      if (!e.target.closest('.relative')) {
        setShowNewFolderColorPicker(false);
        setShowEditFolderColorPicker(false);
        setShowNewTagColorPicker(false);
        setShowEditTagColorPicker(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Reset color pickers when closing modals
  useEffect(() => {
    if (!showFolderManager) {
      setShowNewFolderColorPicker(false);
      setShowEditFolderColorPicker(false);
    }
  }, [showFolderManager]);
  useEffect(() => {
    if (!showTagManager) {
      setShowNewTagColorPicker(false);
      setShowEditTagColorPicker(false);
    }
  }, [showTagManager]);
  const showNotification = msg => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3000);
  };
  const updateField = (key, value) => setFields(prev => ({
    ...prev,
    [key]: value
  }));
  const toggleMethod = methodId => setSelectedMethods(prev => prev.includes(methodId) ? prev.filter(m => m !== methodId) : [...prev, methodId]);

  // Toggle model-specific features
  const toggleFeature = featureId => {
    setSelectedFeatures(prev => {
      const currentFeatures = prev[target] || [];
      const newFeatures = currentFeatures.includes(featureId) ? currentFeatures.filter(f => f !== featureId) : [...currentFeatures, featureId];
      return {
        ...prev,
        [target]: newFeatures
      };
    });
  };

  // Get features for current target model
  const currentModelFeatures = selectedFeatures[target] || [];

  // Helper functions for dynamic example rows
  const addExampleRow = () => {
    setExampleRows(prev => [...prev, {
      id: Date.now(),
      content: ''
    }]);
  };
  const removeExampleRow = id => {
    if (exampleRows.length > 1) {
      setExampleRows(prev => prev.filter(row => row.id !== id));
    }
  };
  const updateExampleRow = (id, content) => {
    setExampleRows(prev => prev.map(row => row.id === id ? {
      ...row,
      content
    } : row));
  };

  // Generate formatted examples based on file type and rows
  // Uses prompt engineering best practices (2025): clear structure, semantic separators
  const generateFormattedExamples = useMemo(() => {
    const hasContent = exampleRows.some(r => r.content.trim());
    if (!hasContent && !fields.examples) return '';

    // If using plain text (none), just use the original examples field
    if (exampleFileType === 'none') {
      // If we have structured rows, join them with clear separators
      if (exampleRows.some(r => r.content.trim())) {
        return exampleRows.filter(r => r.content.trim()).map((r, i) => `[Example ${i + 1}]\n${r.content}`).join('\n\n---\n\n'); // Clear visual separator that AI understands
      }
      return fields.examples;
    }

    // Build structured format based on file type
    const rows = exampleRows.filter(r => r.content.trim());
    const headers = exampleHeaders.trim();
    let formattedOutput = '';
    switch (exampleFileType) {
      case 'excel':
      case 'table':
        // Use ASCII table format for better AI comprehension
        if (headers) {
          const cols = headers.split('|').map(h => h.trim());
          const colWidth = Math.max(15, ...cols.map(c => c.length + 2));
          const separator = '+' + cols.map(() => '-'.repeat(colWidth)).join('+') + '+';
          formattedOutput = `Data structure: Table with ${cols.length} columns\n`;
          formattedOutput += `Columns: ${cols.join(' | ')}\n\n`;
          formattedOutput += separator + '\n';
          formattedOutput += '|' + cols.map(c => ` ${c.padEnd(colWidth - 1)}`).join('|') + '|\n';
          formattedOutput += separator + '\n';
          rows.forEach((row, idx) => {
            const values = row.content.split('|').map(v => v.trim());
            formattedOutput += '|' + values.map((v, i) => ` ${(v || '').padEnd(colWidth - 1)}`).join('|') + '|\n';
            if (idx < rows.length - 1) {
              formattedOutput += separator + '\n'; // Row separator
            }
          });
          formattedOutput += separator;
        } else {
          formattedOutput = 'Data rows:\n';
          rows.forEach((row, idx) => {
            formattedOutput += `Row ${idx + 1}: ${row.content}\n`;
            if (idx < rows.length - 1) {
              formattedOutput += '---\n'; // Visual row separator
            }
          });
        }
        break;
      case 'csv':
        formattedOutput = 'CSV format data:\n';
        if (headers) {
          formattedOutput += `Headers: ${headers.replace(/\|/g, ',')}\n`;
        }
        formattedOutput += 'Data:\n';
        rows.forEach((row, idx) => {
          formattedOutput += `${row.content.replace(/\|/g, ',')}\n`;
          if (idx < rows.length - 1) {
            formattedOutput += ''; // No extra separator for CSV
          }
        });
        break;
      case 'json':
        formattedOutput = 'JSON structured data:\n```json\n[\n';
        const jsonHeaders = headers ? headers.split('|').map(h => h.trim()) : [];
        rows.forEach((row, idx) => {
          const values = row.content.split('|').map(v => v.trim());
          if (jsonHeaders.length > 0) {
            const obj = {};
            jsonHeaders.forEach((h, i) => {
              obj[h] = values[i] || '';
            });
            formattedOutput += '  ' + JSON.stringify(obj);
          } else {
            formattedOutput += `  "${row.content}"`;
          }
          formattedOutput += idx < rows.length - 1 ? ',\n' : '\n';
        });
        formattedOutput += ']\n```';
        break;
      default:
        formattedOutput = rows.map(r => r.content).join('\n---\n');
    }
    return formattedOutput;
  }, [exampleFileType, exampleHeaders, exampleRows, fields.examples]);
  const selectedTemplate = t.templates[template];
  const TemplateIcon = templateIcons[template];

  // ==================== AI MODEL FORMATTERS ====================
  // Format helpers for different AI models based on 2025 research
  const formatters = {
    // Claude: XML tags, extended thinking support
    claude: {
      wrap: (tag, content) => `<${tag}>\n${content}\n</${tag}>`,
      role: (role, p) => `${p.youAre} ${role}.`,
      section: (label, content) => `<${label.toLowerCase().replace(/\s+/g, '_')}>\n${content}\n</${label.toLowerCase().replace(/\s+/g, '_')}>`
    },
    // GPT: Markdown structure, literal instructions
    gpt: {
      wrap: (tag, content) => `**${tag}:**\n${content}`,
      role: (role, p) => `${p.actAs} ${role}.`,
      section: (label, content) => `**${label}:**\n${content}`
    },
    // Gemini: XML or Markdown consistently, context first
    gemini: {
      wrap: (tag, content) => `## ${tag}\n${content}`,
      role: (role, p) => `# Role\nYou are ${role}.`,
      section: (label, content) => `## ${label}\n${content}`
    },
    // Llama: Special tokens format
    llama: {
      wrap: (tag, content) => `[${tag.toUpperCase()}]\n${content}\n[/${tag.toUpperCase()}]`,
      role: (role, p) => `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\nYou are ${role}.<|eot_id|>`,
      section: (label, content) => `[${label.toUpperCase()}]\n${content}`
    },
    // Mistral: [INST]/[/INST] tokens
    mistral: {
      wrap: (tag, content) => `[INST] ${tag}: ${content} [/INST]`,
      role: (role, p) => `[INST] You are ${role}. [/INST]`,
      section: (label, content) => `${label}: ${content}`
    },
    // Cohere: Task & Context, Style Guide format
    cohere: {
      wrap: (tag, content) => `## ${tag}\n${content}`,
      role: (role, p) => `## Task & Context\nYou are ${role}.`,
      section: (label, content) => `## ${label}\n${content}`
    },
    // General: Universal plain format
    general: {
      wrap: (tag, content) => `${tag}:\n${content}`,
      role: (role, p) => `${p.role}: ${role}`,
      section: (label, content) => `${label}: ${content}`
    }
  };

  // Get formatter for current target
  const fmt = formatters[target] || formatters.general;

  // Generate formatted prompt with color sections
  const promptSections = useMemo(() => {
    const sections = [];
    const p = t.promptParts;
    const f = formatters[target] || formatters.general;

    // Role section
    if (fields.role) {
      sections.push({
        type: 'role',
        text: f.role(fields.role, p)
      });
    }

    // Emotion prompt (works well across all models)
    if (selectedMethods.includes('emotion')) {
      sections.push({
        type: 'methods',
        text: p.emotion
      });
    }

    // Context section - Gemini prefers context first
    if (fields.context) {
      if (target === 'claude') {
        sections.push({
          type: 'context',
          text: `<context>\n${fields.context}\n</context>`
        });
      } else if (target === 'cohere') {
        sections.push({
          type: 'context',
          text: `## Task & Context\n${fields.context}`
        });
      } else if (target === 'gemini') {
        sections.push({
          type: 'context',
          text: `## Context\n${fields.context}\n\nBased on the information above:`
        });
      } else if (target === 'llama') {
        sections.push({
          type: 'context',
          text: `<|start_header_id|>user<|end_header_id|>\nContext: ${fields.context}<|eot_id|>`
        });
      } else if (target === 'mistral') {
        sections.push({
          type: 'context',
          text: `[INST] Context: ${fields.context} [/INST]`
        });
      } else {
        sections.push({
          type: 'context',
          text: f.section(p.context, fields.context)
        });
      }
    }

    // Task section
    if (fields.task) {
      if (target === 'claude') {
        sections.push({
          type: 'task',
          text: `<task>\n${fields.task}\n</task>`
        });
      } else if (target === 'llama') {
        sections.push({
          type: 'task',
          text: `<|start_header_id|>user<|end_header_id|>\n${fields.task}<|eot_id|><|start_header_id|>assistant<|end_header_id|>`
        });
      } else if (target === 'mistral') {
        sections.push({
          type: 'task',
          text: `[INST] ${fields.task} [/INST]`
        });
      } else if (target === 'cohere') {
        sections.push({
          type: 'task',
          text: `## Task & Context\n${fields.task}`
        });
      } else {
        sections.push({
          type: 'task',
          text: f.section(p.task, fields.task)
        });
      }
    }

    // Method-specific instructions
    const addMethodSection = (methodId, claudeTag, content, simpleContent) => {
      if (selectedMethods.includes(methodId)) {
        if (target === 'claude') {
          sections.push({
            type: 'methods',
            text: `<${claudeTag}>\n${content}\n</${claudeTag}>`
          });
        } else if (target === 'cohere') {
          sections.push({
            type: 'methods',
            text: `## Style Guide\n${simpleContent}`
          });
        } else {
          sections.push({
            type: 'methods',
            text: f.section(methodId.charAt(0).toUpperCase() + methodId.slice(1), simpleContent)
          });
        }
      }
    };
    addMethodSection('cot', 'instructions', p.cotInstructions, p.cotSimple);
    addMethodSection('zeroshot', 'thinking', p.zeroshotTrigger, p.zeroshotSimple);
    addMethodSection('tot', 'reasoning_approach', p.totExperts, p.totSimple);
    addMethodSection('selfconsistency', 'verification', p.scVerify, p.scSimple);
    addMethodSection('react', 'approach', p.reactCycle, p.reactSimple);
    addMethodSection('plansolve', 'planning', p.plansolveInstructions, p.plansolveSimple);
    addMethodSection('selfask', 'self_questioning', p.selfaskInstructions, p.selfaskSimple);
    addMethodSection('pal', 'code_solution', p.palInstructions, p.palSimple);
    addMethodSection('selfrefine', 'iterative_improvement', p.selfrefineInstructions, p.selfrefineSimple);
    addMethodSection('stepback', 'abstraction', p.stepbackInstructions, p.stepbackSimple);
    addMethodSection('analogical', 'analogical_reasoning', p.analogicalInstructions, p.analogicalSimple);
    addMethodSection('rar', 'clarification', p.rarInstructions, p.rarSimple);
    // === NEW 2024-2025 METHODS ===
    addMethodSection('sot', 'skeleton_approach', p.sotInstructions, p.sotSimple);
    addMethodSection('got', 'graph_reasoning', p.gotInstructions, p.gotSimple);
    addMethodSection('bot', 'buffer_templates', p.botInstructions, p.botSimple);
    addMethodSection('thot', 'thread_analysis', p.thotInstructions, p.thotSimple);
    addMethodSection('s2a', 'focused_attention', p.s2aInstructions, p.s2aSimple);
    addMethodSection('metaprompt', 'multi_expert', p.metapromptInstructions, p.metapromptSimple);
    addMethodSection('reflexion', 'reflection_loop', p.reflexionInstructions, p.reflexionSimple);
    addMethodSection('contrastive', 'contrastive_learning', p.contrastiveInstructions, p.contrastiveSimple);
    addMethodSection('opro', 'optimized_thinking', p.oproInstructions, p.oproSimple);
    addMethodSection('confidence', 'confidence_calibration', p.confidenceInstructions, p.confidenceSimple);
    // === 2025 METHODS ===
    addMethodSection('cod', 'efficient_reasoning', p.codInstructions, p.codSimple);
    addMethodSection('selfdiscover', 'task_discovery', p.selfdiscoverInstructions, p.selfdiscoverSimple);
    addMethodSection('rstar', 'search_reasoning', p.rstarInstructions, p.rstarSimple);
    addMethodSection('slowthink', 'deliberate_thinking', p.slowthinkInstructions, p.slowthinkSimple);

    // Constraints/Steps
    if (fields.constraints) {
      const steps = selectedMethods.includes('risen') ? fields.constraints.split('\n').map((s, i) => `${i + 1}. ${s}`).join('\n') : fields.constraints;
      const label = selectedMethods.includes('risen') ? p.stepsFollow : p.constraints;
      if (target === 'claude') {
        const tag = selectedMethods.includes('risen') ? 'steps' : 'constraints';
        sections.push({
          type: 'constraints',
          text: `<${tag}>\n${selectedMethods.includes('risen') ? label + ':\n' : ''}${steps}\n</${tag}>`
        });
      } else if (target === 'cohere') {
        sections.push({
          type: 'constraints',
          text: `## Style Guide\n${steps}`
        });
      } else {
        sections.push({
          type: 'constraints',
          text: f.section(label, steps)
        });
      }
    }

    // Examples section
    const examplesContent = generateFormattedExamples || fields.examples;
    if (examplesContent) {
      const intro = selectedMethods.includes('fewshot') ? `${p.examplesIntro}\n\n${examplesContent}\n\n${p.examplesFollow}` : examplesContent;
      if (target === 'claude') {
        sections.push({
          type: 'examples',
          text: `<examples>\n${intro}\n</examples>`
        });
      } else {
        sections.push({
          type: 'examples',
          text: f.section('Examples', intro)
        });
      }
    }

    // Output format
    if (fields.outputFormat) {
      const label = selectedMethods.includes('risen') ? p.expectations : p.outputFormat;
      if (target === 'claude') {
        const tag = selectedMethods.includes('risen') ? 'expectations' : 'output_format';
        sections.push({
          type: 'format',
          text: `<${tag}>\n${fields.outputFormat}\n</${tag}>`
        });
      } else if (target === 'cohere') {
        sections.push({
          type: 'format',
          text: `## Style Guide\nOutput format: ${fields.outputFormat}`
        });
      } else {
        sections.push({
          type: 'format',
          text: f.section(label, fields.outputFormat)
        });
      }
    }

    // Template-specific context/guidance
    const templateContext = t.templates[template]?.context;
    if (templateContext) {
      if (target === 'claude') {
        sections.push({
          type: 'template',
          text: `<approach>\n${templateContext}\n</approach>`
        });
      } else {
        sections.push({
          type: 'template',
          text: f.section('Approach', templateContext)
        });
      }
    }

    // Model-specific features (2025) - optional capabilities
    const activeFeatures = selectedFeatures[target] || [];
    if (activeFeatures.length > 0) {
      const featureTranslations = t.modelFeatures?.[target] || {};
      const featureInstructions = activeFeatures.map(featureId => featureTranslations[featureId]?.promptTag).filter(Boolean);
      if (featureInstructions.length > 0) {
        const featuresText = featureInstructions.join('\n');
        if (target === 'claude') {
          sections.push({
            type: 'features',
            text: `<model_capabilities>\n${featuresText}\n</model_capabilities>`
          });
        } else if (target === 'gpt') {
          sections.push({
            type: 'features',
            text: `## Special Instructions\n${featuresText}`
          });
        } else if (target === 'gemini') {
          sections.push({
            type: 'features',
            text: `## Model Features\n${featuresText}`
          });
        } else if (target === 'grok') {
          sections.push({
            type: 'features',
            text: `## Grok Capabilities\n${featuresText}`
          });
        } else if (target === 'deepseek') {
          sections.push({
            type: 'features',
            text: `## DeepSeek Features\n${featuresText}`
          });
        } else {
          sections.push({
            type: 'features',
            text: f.section('Model Features', featuresText)
          });
        }
      }
    }

    // ==================== EXTENDED SECTIONS ====================
    // Target URL
    if (extendedFields.targetUrl) {
      if (target === 'claude') {
        sections.push({
          type: 'extended',
          text: `<target_url>\n${extendedFields.targetUrl}\n</target_url>`
        });
      } else {
        sections.push({
          type: 'extended',
          text: f.section('Target URL', extendedFields.targetUrl)
        });
      }
    }

    // Analysis Areas
    if (extendedFields.analysisAreas.length > 0) {
      const extT = t.extendedSections?.analysisAreas?.options || {};
      const areasText = extendedFields.analysisAreas.map(key => {
        const opt = extT[key];
        return opt ? `- ${opt.name}: ${opt.desc}` : `- ${key}`;
      }).join('\n');
      if (target === 'claude') {
        sections.push({
          type: 'extended',
          text: `<analysis_areas>\n${areasText}\n</analysis_areas>`
        });
      } else {
        sections.push({
          type: 'extended',
          text: f.section('Analysis Areas', areasText)
        });
      }
    }

    // Technical Output
    if (extendedFields.technicalOutput.length > 0) {
      const techT = t.extendedSections?.technicalOutput?.options || {};
      const techText = extendedFields.technicalOutput.map(key => {
        const opt = techT[key];
        return opt ? `- ${opt.name}: ${opt.desc}` : `- ${key}`;
      }).join('\n');
      if (target === 'claude') {
        sections.push({
          type: 'extended',
          text: `<technical_output>\nInclude technical details for:\n${techText}\n</technical_output>`
        });
      } else {
        sections.push({
          type: 'extended',
          text: f.section('Technical Output', `Include technical details for:\n${techText}`)
        });
      }
    }

    // Priority Rating
    if (extendedFields.priorityRating) {
      const prioT = t.extendedSections?.priorityRating?.levels || {};
      const prioText = Object.entries(prioT).map(([key, label]) => `- ${label}`).join('\n');
      if (target === 'claude') {
        sections.push({
          type: 'extended',
          text: `<priority_rating>\nRate each recommendation with priority:\n${prioText}\n</priority_rating>`
        });
      } else {
        sections.push({
          type: 'extended',
          text: f.section('Priority Rating', `Rate each recommendation:\n${prioText}`)
        });
      }
    }

    // Focus Areas
    const hasFocus = extendedFields.focusPrimary || extendedFields.focusSecondary || extendedFields.focusIgnore;
    if (hasFocus) {
      const focusLines = [];
      if (extendedFields.focusPrimary) focusLines.push(`- Primary focus: ${extendedFields.focusPrimary}`);
      if (extendedFields.focusSecondary) focusLines.push(`- Secondary focus: ${extendedFields.focusSecondary}`);
      if (extendedFields.focusIgnore) focusLines.push(`- Ignore: ${extendedFields.focusIgnore}`);
      const focusText = focusLines.join('\n');
      if (target === 'claude') {
        sections.push({
          type: 'extended',
          text: `<focus_areas>\n${focusText}\n</focus_areas>`
        });
      } else {
        sections.push({
          type: 'extended',
          text: f.section('Focus Areas', focusText)
        });
      }
    }

    // Competitor Comparison
    const validCompetitors = extendedFields.competitors.filter(url => url.trim());
    if (validCompetitors.length > 0) {
      const compText = validCompetitors.map((url, i) => `- Competitor ${i + 1}: ${url}`).join('\n');
      const instruction = t.extendedSections?.competitorComparison?.instruction || 'Compare key aspects with these competitors.';
      if (target === 'claude') {
        sections.push({
          type: 'extended',
          text: `<competitor_comparison>\n${compText}\n${instruction}\n</competitor_comparison>`
        });
      } else {
        sections.push({
          type: 'extended',
          text: f.section('Competitor Comparison', `${compText}\n${instruction}`)
        });
      }
    }

    // Final Deliverables
    if (extendedFields.deliverables.length > 0) {
      const delT = t.extendedSections?.deliverables?.options || {};
      const delText = extendedFields.deliverables.map(key => {
        const label = delT[key];
        return label ? `- ${label}` : `- ${key}`;
      }).join('\n');
      if (target === 'claude') {
        sections.push({
          type: 'extended',
          text: `<final_deliverables>\n${delText}\n</final_deliverables>`
        });
      } else {
        sections.push({
          type: 'extended',
          text: f.section('Final Deliverables', delText)
        });
      }
    }

    // Email Style + Language
    if (extendedFields.emailStyle || extendedFields.emailLanguage) {
      const styleLabel = t.extendedSections?.emailStyle?.options?.[extendedFields.emailStyle] || extendedFields.emailStyle;
      const parts = [];
      if (extendedFields.emailStyle) parts.push(`Style: ${styleLabel}`);
      if (extendedFields.emailLanguage) parts.push(`Language: ${extendedFields.emailLanguage}`);
      const emailText = parts.join('\n');
      if (target === 'claude') {
        sections.push({
          type: 'extended',
          text: `<email_settings>\n${emailText}\n</email_settings>`
        });
      } else {
        sections.push({
          type: 'extended',
          text: f.section('Email Settings', emailText)
        });
      }
    }

    // Translation Style
    if (extendedFields.translationStyle) {
      const styleLabel = t.extendedSections?.translationStyle?.options?.[extendedFields.translationStyle] || extendedFields.translationStyle;
      if (target === 'claude') {
        sections.push({
          type: 'extended',
          text: `<translation_style>\n${styleLabel}\n</translation_style>`
        });
      } else {
        sections.push({
          type: 'extended',
          text: f.section('Translation Style', styleLabel)
        });
      }
    }

    // Support Tone
    if (extendedFields.supportTone) {
      const toneLabel = t.extendedSections?.supportTone?.options?.[extendedFields.supportTone] || extendedFields.supportTone;
      if (target === 'claude') {
        sections.push({
          type: 'extended',
          text: `<response_tone>\n${toneLabel}\n</response_tone>`
        });
      } else {
        sections.push({
          type: 'extended',
          text: f.section('Response Tone', toneLabel)
        });
      }
    }
    return sections;
  }, [fields, target, selectedMethods, t, template, generateFormattedExamples, selectedFeatures, extendedFields]);

  // Plain text version for copying
  const formattedPrompt = useMemo(() => {
    return promptSections.map(s => s.text).join('\n\n').trim();
  }, [promptSections]);

  // Update ref for keyboard shortcuts (avoid temporal dead zone)
  useEffect(() => {
    formattedPromptRef.current = formattedPrompt;
  }, [formattedPrompt]);

  // ==================== TOKEN COUNTER (depends on formattedPrompt) ====================
  // Calculate token count for current prompt
  const tokenCount = useMemo(() => {
    return estimateTokens(formattedPrompt);
  }, [formattedPrompt]);

  // Token warning status
  const tokenWarning = useMemo(() => {
    if (tokenCount >= currentModelLimits.limit) return 'error';
    if (tokenCount >= currentModelLimits.warning) return 'warning';
    return 'ok';
  }, [tokenCount, currentModelLimits]);

  // ==================== VERIFICATION API FUNCTIONS ====================
  // Verify prompt using FREE Pollinations.ai API (no key required!)
  // Completely free, supports CORS, works immediately without registration
  const verifyPromptWithAI = async () => {
    if (!formattedPrompt) {
      showNotification(t.verify?.noPrompt || 'Create a prompt first');
      return;
    }

    // Status messages based on language
    const statusMessages = lang === 'cs' ? {
      init: 'Připravuji požadavek...',
      connecting: 'Připojuji se k AI...',
      sending: 'Odesílám prompt...',
      waiting: 'AI analyzuje prompt...',
      processing: 'Zpracovávám odpověď...',
      done: 'Hotovo!'
    } : {
      init: 'Preparing request...',
      connecting: 'Connecting to AI...',
      sending: 'Sending prompt...',
      waiting: 'AI is analyzing...',
      processing: 'Processing response...',
      done: 'Done!'
    };
    setVerifyLoading(true);
    setVerifyError('');
    setVerifyResult('');
    setVerifyStatus(statusMessages.init);
    setVerifyElapsed(0);
    setShowVerifyModal(true);

    // Start elapsed time counter
    const startTime = Date.now();
    const timerInterval = setInterval(() => {
      setVerifyElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    const systemPrompt = t.verify?.systemPrompt || 'You are a helpful assistant that analyzes AI prompts. Provide a brief, structured analysis of the prompt quality, clarity, and suggestions for improvement.';
    const userPrompt = (t.verify?.prePrompt || 'Analyze this prompt:\n\n') + formattedPrompt;
    try {
      setVerifyStatus(statusMessages.connecting);

      // Small delay to show connecting status
      await new Promise(r => setTimeout(r, 300));
      setVerifyStatus(statusMessages.sending);

      // Pollinations.ai - completely FREE, no API key required, supports CORS
      const response = await fetch('https://text.pollinations.ai/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [{
            role: 'system',
            content: systemPrompt
          }, {
            role: 'user',
            content: userPrompt
          }],
          model: 'openai',
          seed: Math.floor(Math.random() * 1000000)
        })
      });
      setVerifyStatus(statusMessages.waiting);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      setVerifyStatus(statusMessages.processing);
      const result = await response.text();
      clearInterval(timerInterval);
      if (result) {
        setVerifyStatus(statusMessages.done);
        setVerifyResult(result);
        setVerifyLoading(false);
        return;
      }
      throw new Error('Empty response');
    } catch (error) {
      clearInterval(timerInterval);
      console.error('Pollinations API failed:', error.message);
      setVerifyError(t.verify?.errorGeneric || 'Error analyzing prompt. Please try again.');
      setVerifyLoading(false);
    }
  };

  // Save optional API key for higher limits
  const saveApiSettings = () => {
    const keyToSave = tempApiKey.trim();
    setApiKey(keyToSave);
    localStorage.setItem('ai-prompt-api-key', keyToSave);
    localStorage.setItem('ai-prompt-api-provider', apiProvider);
    setShowApiSettingsModal(false);
    if (keyToSave) {
      showNotification(t.verify?.keySaved || 'API key saved!');
    } else {
      showNotification(t.verify?.keyCleared || 'Using free mode');
    }
  };

  // Open API settings modal
  const openApiSettings = () => {
    setTempApiKey(apiKey);
    setShowApiSettingsModal(true);
  };
  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(formattedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Database functions
  const savePrompt = () => {
    if (!promptName.trim()) return;
    const existingPrompt = editingId ? savedPrompts.find(p => p.id === editingId) : null;
    const newPrompt = {
      id: editingId || Date.now().toString(),
      name: promptName,
      template,
      target,
      fields,
      selectedMethods,
      lang,
      // Include enhanced examples data
      exampleFileType,
      exampleHeaders,
      exampleRows,
      // Include model-specific features
      selectedFeatures,
      // Include extended sections
      extendedFields,
      // Include folder and tags
      folderId: selectedFolderId,
      tags: selectedTagIds,
      createdAt: existingPrompt?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    let updated;
    if (editingId) {
      updated = savedPrompts.map(p => p.id === editingId ? newPrompt : p);
    } else {
      updated = [...savedPrompts, newPrompt];
    }
    setSavedPrompts(updated);
    saveDatabase(updated);
    setSaveModalOpen(false);
    setPromptName('');
    setEditingId(null);
    // Reset folder/tag selection
    setSelectedFolderId(null);
    setSelectedTagIds([]);
    showNotification(`${updated.length} ${t.database.savedCount}`);
  };

  // Default extended fields structure for loading
  const defaultExtendedFields = {
    analysisAreas: [],
    technicalOutput: [],
    priorityRating: false,
    focusPrimary: '',
    focusSecondary: '',
    focusIgnore: '',
    targetUrl: '',
    competitors: [],
    deliverables: [],
    emailStyle: '',
    emailLanguage: '',
    translationStyle: '',
    supportTone: ''
  };
  const loadPrompt = prompt => {
    setTemplate(prompt.template || 'general');
    setTarget(prompt.target || 'claude');
    setFields(prompt.fields || {
      role: '',
      task: '',
      context: '',
      constraints: '',
      outputFormat: '',
      examples: ''
    });
    setSelectedMethods(prompt.selectedMethods || []);
    if (prompt.lang) setLang(prompt.lang);
    // Load enhanced examples data
    setExampleFileType(prompt.exampleFileType || 'none');
    setExampleHeaders(prompt.exampleHeaders || '');
    setExampleRows(prompt.exampleRows || [{
      id: 1,
      content: ''
    }]);
    // Load model-specific features
    setSelectedFeatures(prompt.selectedFeatures || {});
    // Load extended sections (merge with defaults to ensure all keys exist)
    setExtendedFields({
      ...defaultExtendedFields,
      ...(prompt.extendedFields || {})
    });
    setShowDatabase(false);
  };
  const deletePrompt = id => {
    const updated = savedPrompts.filter(p => p.id !== id);
    setSavedPrompts(updated);
    saveDatabase(updated);
  };
  const duplicatePrompt = prompt => {
    const newPrompt = {
      ...prompt,
      id: Date.now().toString(),
      name: `${prompt.name} (copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const updated = [...savedPrompts, newPrompt];
    setSavedPrompts(updated);
    saveDatabase(updated);
  };
  const editPrompt = prompt => {
    loadPrompt(prompt);
    setEditingId(prompt.id);
    setPromptName(prompt.name);
    // Load folder and tags
    setSelectedFolderId(prompt.folderId || null);
    setSelectedTagIds(prompt.tags || []);
    setSaveModalOpen(true);
    setShowDatabase(false);
  };
  const exportDatabase = () => {
    const dataStr = JSON.stringify(savedPrompts, null, 2);
    const blob = new Blob([dataStr], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prompts_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification(`${savedPrompts.length} ${t.database.exportedCount}`);
  };
  const importDatabase = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => {
      try {
        const imported = JSON.parse(event.target?.result);
        if (Array.isArray(imported)) {
          const merged = [...savedPrompts, ...imported.map(p => ({
            ...p,
            id: Date.now().toString() + Math.random()
          }))];
          setSavedPrompts(merged);
          saveDatabase(merged);
          showNotification(t.database.imported);
        }
      } catch {
        showNotification('Import failed');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };
  const resetForm = () => {
    setFields({
      role: '',
      task: '',
      context: '',
      constraints: '',
      outputFormat: '',
      examples: ''
    });
    setSelectedMethods([]);
    setEditingId(null);
    // Reset enhanced examples state
    setExampleFileType('none');
    setExampleHeaders('');
    setExampleRows([{
      id: 1,
      content: ''
    }]);
    // Reset extended sections
    setExtendedFields({
      analysisAreas: [],
      technicalOutput: [],
      priorityRating: false,
      focusPrimary: '',
      focusSecondary: '',
      focusIgnore: '',
      targetUrl: '',
      competitors: [],
      deliverables: [],
      emailStyle: '',
      emailLanguage: '',
      translationStyle: '',
      supportTone: ''
    });
    // Reset model-specific features
    setSelectedFeatures({});
  };

  // Share code functions
  const openShareModal = () => {
    const promptData = {
      template,
      target,
      selectedMethods,
      lang,
      fields,
      // Include enhanced examples data
      exampleFileType,
      exampleHeaders,
      exampleRows,
      // Include model-specific features
      selectedFeatures,
      // Include extended sections
      extendedFields
    };
    const code = generateShareCode(promptData);
    if (code) {
      setShareData({
        code: code,
        url: getShareURL(code)
      });
      setShowShareModal(true);
    }
  };
  const copyShareCode = async text => {
    await navigator.clipboard.writeText(text);
    showNotification(t.copied);
  };
  const importFromCode = () => {
    const decoded = decodeShareCode(importCode);
    if (decoded) {
      setTemplate(decoded.template);
      setTarget(decoded.target);
      setSelectedMethods(decoded.selectedMethods);
      setLang(decoded.lang);
      setFields(decoded.fields);
      // Load enhanced examples data
      setExampleFileType(decoded.exampleFileType || 'none');
      setExampleHeaders(decoded.exampleHeaders || '');
      setExampleRows(decoded.exampleRows || [{
        id: 1,
        content: ''
      }]);
      // Load model-specific features
      setSelectedFeatures(decoded.selectedFeatures || {});
      // Load extended sections
      setExtendedFields(decoded.extendedFields || defaultExtendedFields);
      setShowImportModal(false);
      setImportCode('');
      showNotification(t.share.importSuccess);
    } else {
      showNotification(t.share.importError);
    }
  };

  // Check for share code in URL on mount
  useEffect(() => {
    const urlCode = getShareCodeFromURL();
    if (urlCode) {
      const decoded = decodeShareCode(urlCode);
      if (decoded) {
        setTemplate(decoded.template);
        setTarget(decoded.target);
        setSelectedMethods(decoded.selectedMethods);
        setLang(decoded.lang);
        setFields(decoded.fields);
        // Load enhanced examples data
        setExampleFileType(decoded.exampleFileType || 'none');
        setExampleHeaders(decoded.exampleHeaders || '');
        setExampleRows(decoded.exampleRows || [{
          id: 1,
          content: ''
        }]);
        // Load model-specific features
        setSelectedFeatures(decoded.selectedFeatures || {});
        // Load extended sections
        setExtendedFields(decoded.extendedFields || defaultExtendedFields);
        showNotification(t.share.importSuccess);
        // Clean URL
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  // AI Models with their specific formatting preferences (based on 2025 research)
  // Each model has unique prompting requirements per the .md guide
  const aiTargets = [{
    id: 'claude',
    name: 'Claude',
    color: '#D97706',
    icon: '🧡',
    desc: 'XML tags, extended thinking',
    features: ['extended_thinking', 'research', 'artifacts', 'analysis']
  }, {
    id: 'gpt',
    name: 'ChatGPT',
    color: '#10A37F',
    icon: '💚',
    desc: 'Markdown, literal instructions',
    features: ['web_browsing', 'dalle', 'code_interpreter', 'canvas', 'memory']
  }, {
    id: 'gemini',
    name: 'Gemini',
    color: '#4285F4',
    icon: '💙',
    desc: 'XML or Markdown, context first',
    features: ['google_search', 'code_execution', 'deep_research']
  }, {
    id: 'llama',
    name: 'Llama',
    color: '#0668E1',
    icon: '🦙',
    desc: 'Special tokens format',
    features: ['code_llama']
  }, {
    id: 'mistral',
    name: 'Mistral',
    color: '#FF7000',
    icon: '🌪️',
    desc: '[INST] tokens, objective measures',
    features: ['code_mode', 'function_calling']
  }, {
    id: 'cohere',
    name: 'Cohere',
    color: '#D946EF',
    icon: '🔮',
    desc: 'Task & Context, Style Guide',
    features: ['rag', 'web_search']
  }, {
    id: 'grok',
    name: 'Grok',
    color: '#000000',
    icon: '⚡',
    desc: 'Real-time X data, Think mode',
    features: ['realtime', 'think', 'deepsearch']
  }, {
    id: 'deepseek',
    name: 'DeepSeek',
    color: '#4D6BFE',
    icon: '🔍',
    desc: 'Deep Think R1, Code',
    features: ['deep_think', 'code_mode', 'search']
  }, {
    id: 'general',
    name: 'Any AI',
    color: '#6B7280',
    icon: '🤖',
    desc: 'Universal format',
    features: []
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-6"
  }, notification && /*#__PURE__*/React.createElement("div", {
    className: "fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-pulse"
  }, notification), saveModalOpen && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50",
    onClick: () => setSaveModalOpen(false)
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-800 p-6 rounded-xl border border-slate-700 w-[420px] max-w-[95vw]",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-bold text-white mb-4"
  }, t.database.saveAs), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: promptName,
    onChange: e => setPromptName(e.target.value),
    placeholder: t.database.promptName,
    className: "w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white mb-4 focus:outline-none focus:ring-2 focus:ring-amber-500",
    autoFocus: true
  }), /*#__PURE__*/React.createElement("div", {
    className: "mb-4 p-3 bg-slate-700/50 rounded-lg border border-slate-600"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-400 mb-3 flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "FolderTree",
    size: 14
  }), t.database.organization), /*#__PURE__*/React.createElement("div", {
    className: "mb-3"
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-xs text-slate-400 mb-1 block"
  }, t.database.folders.selectFolder), /*#__PURE__*/React.createElement("select", {
    value: selectedFolderId || '',
    onChange: e => setSelectedFolderId(e.target.value || null),
    className: "w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, t.database.folders.root), folders.map(folder => /*#__PURE__*/React.createElement("option", {
    key: folder.id,
    value: folder.id
  }, folder.name)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-xs text-slate-400 mb-1 block"
  }, t.database.tags.selectTags), tags.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-500 italic"
  }, t.database.tags.noTags) : /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2"
  }, tags.map(tag => {
    const isSelected = selectedTagIds.includes(tag.id);
    const color = getTagColor(tag.color);
    return /*#__PURE__*/React.createElement("button", {
      key: tag.id,
      type: "button",
      onClick: () => setSelectedTagIds(prev => isSelected ? prev.filter(id => id !== tag.id) : [...prev, tag.id]),
      className: `px-2 py-1 rounded-full text-xs font-medium transition-all ${isSelected ? 'ring-2 ring-white ring-offset-1 ring-offset-slate-800' : 'opacity-60 hover:opacity-100'}`,
      style: {
        backgroundColor: `${color}30`,
        color: color,
        borderColor: color,
        borderWidth: '1px',
        borderStyle: 'solid'
      }
    }, tag.name);
  }))), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 mt-3 pt-3 border-t border-slate-600"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      setSaveModalOpen(false);
      setShowFolderManager(true);
    },
    className: "text-xs text-slate-400 hover:text-amber-400 flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "FolderPlus",
    size: 12
  }), t.database.folders.manage), /*#__PURE__*/React.createElement("span", {
    className: "text-slate-600"
  }, "|"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      setSaveModalOpen(false);
      setShowTagManager(true);
    },
    className: "text-xs text-slate-400 hover:text-amber-400 flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Tags",
    size: 12
  }), t.database.tags.manage))), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setSaveModalOpen(false);
      setSelectedFolderId(null);
      setSelectedTagIds([]);
    },
    className: "flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
  }, "Cancel"), /*#__PURE__*/React.createElement("button", {
    onClick: savePrompt,
    className: "flex-1 px-4 py-2 bg-amber-500 text-slate-900 rounded-lg hover:bg-amber-400 font-medium"
  }, t.database.save)))), showShareModal && shareData && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50",
    onClick: () => setShowShareModal(false)
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-800 p-5 rounded-xl border border-slate-700 w-[380px] max-w-[95vw]",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center mb-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-bold text-white flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Share2",
    size: 20,
    className: "text-amber-400"
  }), t.share.title), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowShareModal(false),
    className: "text-slate-400 hover:text-white"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "X",
    size: 20
  }))), /*#__PURE__*/React.createElement("div", {
    className: "mb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-slate-400"
  }, t.share.codeLabel, ":"), /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-slate-500"
  }, "(", shareData.code.length, " chars)")), /*#__PURE__*/React.createElement("div", {
    className: "p-3 bg-slate-900 border border-slate-600 rounded-lg font-mono text-xs text-amber-400 break-all max-h-24 overflow-y-auto select-all"
  }, shareData.code)), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2 mb-3"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => copyShareCode(shareData.code),
    className: "px-3 py-2.5 bg-amber-500 text-slate-900 rounded-lg hover:bg-amber-400 font-medium text-sm flex items-center justify-center gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Copy",
    size: 16
  }), " ", t.share.copyCode), /*#__PURE__*/React.createElement("button", {
    onClick: () => copyShareCode(shareData.url),
    className: "px-3 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 font-medium text-sm flex items-center justify-center gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Link",
    size: 16
  }), " ", t.share.copyUrl)), /*#__PURE__*/React.createElement("div", {
    className: "p-2 bg-slate-700/30 rounded-lg border border-slate-700/50"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-500 flex items-start gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Lightbulb",
    size: 12,
    className: "text-amber-400/70 flex-shrink-0 mt-0.5"
  }), t.share.tip)))), showImportModal && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50",
    onClick: () => setShowImportModal(false)
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-800 p-6 rounded-xl border border-slate-700 w-96",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center mb-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-bold text-white flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Download",
    size: 20,
    className: "text-amber-400"
  }), t.share.importTitle), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowImportModal(false),
    className: "text-slate-400 hover:text-white"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "X",
    size: 20
  }))), /*#__PURE__*/React.createElement("textarea", {
    value: importCode,
    onChange: e => setImportCode(e.target.value),
    placeholder: t.share.importPlaceholder,
    rows: 4,
    className: "w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white mb-4 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-sm resize-y min-h-[100px] max-h-[200px]",
    autoFocus: true
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowImportModal(false),
    className: "flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
  }, "Cancel"), /*#__PURE__*/React.createElement("button", {
    onClick: importFromCode,
    disabled: !importCode.trim(),
    className: "flex-1 px-4 py-2 bg-amber-500 text-slate-900 rounded-lg hover:bg-amber-400 font-medium disabled:opacity-50"
  }, t.share.importBtn)))), showApiSettingsModal && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/50 flex items-center justify-center z-[60]",
    onClick: () => setShowApiSettingsModal(false)
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-800 p-5 rounded-xl border border-slate-700 w-[400px] max-w-[95vw]",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center mb-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-bold text-white flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Info",
    size: 20,
    className: "text-amber-400"
  }), t.verify?.apiSettings || 'About Verification'), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowApiSettingsModal(false),
    className: "text-slate-400 hover:text-white"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "X",
    size: 20
  }))), /*#__PURE__*/React.createElement("div", {
    className: "mb-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 text-green-400 font-medium mb-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "CheckCircle",
    size: 18
  }), t.verify?.freeMode || '🆓 100% Free'), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-green-300/80"
  }, t.verify?.freeModeDesc || 'This feature is completely free!'), /*#__PURE__*/React.createElement("ul", {
    className: "text-xs text-slate-400 mt-3 space-y-1"
  }, /*#__PURE__*/React.createElement("li", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Check",
    size: 12,
    className: "text-green-400"
  }), lang === 'cs' ? 'Žádný API klíč není potřeba' : 'No API key required'), /*#__PURE__*/React.createElement("li", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Check",
    size: 12,
    className: "text-green-400"
  }), lang === 'cs' ? 'Žádná registrace' : 'No registration'), /*#__PURE__*/React.createElement("li", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Check",
    size: 12,
    className: "text-green-400"
  }), lang === 'cs' ? 'Neomezené použití' : 'Unlimited usage'))), /*#__PURE__*/React.createElement("div", {
    className: "mb-4 p-3 bg-slate-700/50 rounded-lg"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400 mb-2 flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Cpu",
    size: 12
  }), t.verify?.modelInfo || 'Model Details'), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-slate-400"
  }, t.verify?.modelName || 'Model', ":"), /*#__PURE__*/React.createElement("span", {
    className: "text-sm text-white font-medium"
  }, t.verify?.modelValue || 'OpenAI (GPT-4o mini)')), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2 mt-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "px-2 py-0.5 bg-slate-600/50 rounded text-xs text-slate-300"
  }, t.verify?.modelTemperature || 'Temperature: default'), /*#__PURE__*/React.createElement("span", {
    className: "px-2 py-0.5 bg-slate-600/50 rounded text-xs text-slate-300"
  }, t.verify?.modelSeed || 'Seed: random'), /*#__PURE__*/React.createElement("span", {
    className: "px-2 py-0.5 bg-slate-600/50 rounded text-xs text-slate-300"
  }, t.verify?.modelContext || 'Context: 128k tokens')))), /*#__PURE__*/React.createElement("div", {
    className: "p-3 bg-slate-700/50 rounded-lg text-center"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400 mb-2"
  }, lang === 'cs' ? 'Poháněno službou' : 'Powered by'), /*#__PURE__*/React.createElement("a", {
    href: "https://pollinations.ai",
    target: "_blank",
    rel: "noopener noreferrer",
    className: "text-amber-400 hover:text-amber-300 flex items-center justify-center gap-2 font-medium"
  }, "\uD83C\uDF38 Pollinations.ai", /*#__PURE__*/React.createElement(Icon, {
    name: "ExternalLink",
    size: 14
  }))), /*#__PURE__*/React.createElement("div", {
    className: "mt-4"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowApiSettingsModal(false),
    className: "w-full px-4 py-2.5 bg-amber-500 text-slate-900 rounded-lg hover:bg-amber-400 font-medium flex items-center justify-center gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Check",
    size: 18
  }), t.verify?.close || 'Close')))), showVerifyModal && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50",
    onClick: () => setShowVerifyModal(false)
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-800 p-5 rounded-xl border border-slate-700 w-[550px] max-w-[95vw] max-h-[85vh] flex flex-col",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center mb-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-bold text-white flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Brain",
    size: 20,
    className: "text-purple-400"
  }), t.verify?.result || 'AI Analysis'), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: openApiSettings,
    className: "p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg",
    title: t.verify?.apiSettings || 'API Settings'
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Settings",
    size: 18
  })), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowVerifyModal(false),
    className: "text-slate-400 hover:text-white"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "X",
    size: 20
  })))), verifyLoading && /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center justify-center py-10"
  }, /*#__PURE__*/React.createElement("div", {
    className: "relative mb-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-16 h-16 border-4 border-slate-600 border-t-amber-400 rounded-full animate-spin"
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 w-16 h-16 border-4 border-transparent border-t-amber-400/30 rounded-full animate-ping"
  })), /*#__PURE__*/React.createElement("p", {
    className: "text-slate-200 font-medium text-lg mb-2"
  }, verifyStatus), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 text-slate-400 text-sm mb-4"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Clock",
    size: 14
  }), /*#__PURE__*/React.createElement("span", null, verifyElapsed, "s")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 mt-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: `w-2 h-2 rounded-full transition-colors ${verifyStatus.includes('Připrav') || verifyStatus.includes('Prepar') ? 'bg-amber-400' : 'bg-slate-600'}`
  }), /*#__PURE__*/React.createElement("div", {
    className: `w-2 h-2 rounded-full transition-colors ${verifyStatus.includes('Připoj') || verifyStatus.includes('Connect') ? 'bg-amber-400' : 'bg-slate-600'}`
  }), /*#__PURE__*/React.createElement("div", {
    className: `w-2 h-2 rounded-full transition-colors ${verifyStatus.includes('Odesíl') || verifyStatus.includes('Send') ? 'bg-amber-400' : 'bg-slate-600'}`
  }), /*#__PURE__*/React.createElement("div", {
    className: `w-2 h-2 rounded-full transition-colors ${verifyStatus.includes('analyz') || verifyStatus.includes('analyz') ? 'bg-amber-400' : 'bg-slate-600'}`
  }), /*#__PURE__*/React.createElement("div", {
    className: `w-2 h-2 rounded-full transition-colors ${verifyStatus.includes('Zpracov') || verifyStatus.includes('Process') ? 'bg-amber-400' : 'bg-slate-600'}`
  })), /*#__PURE__*/React.createElement("div", {
    className: "mt-4 p-2 bg-slate-700/30 rounded-lg text-center"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400 flex items-center justify-center gap-1"
  }, "\uD83C\uDF38 Pollinations.ai"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-500 mt-1"
  }, t.verify?.modelValue || 'OpenAI (GPT-4o mini)'))), verifyError && !verifyLoading && /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center justify-center py-8"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "AlertCircle",
    size: 32,
    className: "text-red-400"
  })), /*#__PURE__*/React.createElement("p", {
    className: "text-red-400 mb-4 text-center"
  }, verifyError), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: openApiSettings,
    className: "px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Settings",
    size: 16
  }), t.verify?.apiSettings || 'Settings'), /*#__PURE__*/React.createElement("button", {
    onClick: verifyPromptWithAI,
    className: "px-4 py-2 bg-amber-500 text-slate-900 rounded-lg hover:bg-amber-400 font-medium flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "RefreshCw",
    size: 16
  }), t.verify?.retry || 'Retry'))), verifyResult && !verifyLoading && /*#__PURE__*/React.createElement("div", {
    className: "flex-1 overflow-y-auto"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-500 mb-2 flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Sparkles",
    size: 12
  }), t.verify?.understanding || 'How AI understands your prompt:'), /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-900/50 border border-slate-700 rounded-lg p-4 prose prose-invert prose-sm max-w-none"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-slate-200 text-sm whitespace-pre-wrap leading-relaxed",
    dangerouslySetInnerHTML: {
      __html: verifyResult.replace(/\*\*(.*?)\*\*/g, '<strong class="text-amber-400">$1</strong>').replace(/\n/g, '<br />')
    }
  }))), !verifyLoading && (verifyResult || verifyError) && /*#__PURE__*/React.createElement("div", {
    className: "mt-4 pt-4 border-t border-slate-700 flex justify-between items-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-slate-500 flex items-center gap-1"
  }, "\uD83C\uDF38 ", t.verify?.poweredBy || 'Powered by Pollinations.ai'), /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-slate-600 ml-5"
  }, t.verify?.modelValue || 'OpenAI (GPT-4o mini)')), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowVerifyModal(false),
    className: "px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
  }, t.verify?.close || 'Close')))), showDraftRecovery && recoveryDraft && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/60 flex items-center justify-center z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-800 p-6 rounded-xl border border-amber-500/50 w-96 shadow-2xl shadow-amber-500/20"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 mb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "History",
    size: 24,
    className: "text-amber-400"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-bold text-white"
  }, t.autoSave?.recovery?.title || 'Recover Draft?'), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400"
  }, t.autoSave?.recovery?.lastSaved || 'Last saved', ": ", recoveryDraft.savedAt ? new Date(recoveryDraft.savedAt).toLocaleString() : 'Unknown'))), /*#__PURE__*/React.createElement("p", {
    className: "text-slate-300 text-sm mb-4"
  }, t.autoSave?.recovery?.message || 'We found an unsaved draft from your last session.'), /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-900/50 border border-slate-700 rounded-lg p-3 mb-4 max-h-32 overflow-y-auto"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400 mb-1"
  }, t.fields?.task?.label || 'Task', ":"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-300 line-clamp-3"
  }, recoveryDraft.fields?.task || 'No task')), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-3"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: dismissDraftRecovery,
    className: "flex-1 px-4 py-2.5 bg-slate-700 text-white rounded-lg hover:bg-slate-600 font-medium"
  }, t.autoSave?.recovery?.discard || 'Discard'), /*#__PURE__*/React.createElement("button", {
    onClick: recoverDraft,
    className: "flex-1 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-900 rounded-lg hover:from-amber-400 hover:to-orange-400 font-medium flex items-center justify-center gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "RotateCcw",
    size: 16
  }), t.autoSave?.recovery?.recover || 'Recover')))), showDraftHistory && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/60 flex items-center justify-center z-50",
    onClick: () => setShowDraftHistory(false)
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-800 p-5 rounded-xl border border-slate-700 w-[420px] max-w-[95vw] max-h-[80vh] flex flex-col",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center mb-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-bold text-white flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "History",
    size: 20,
    className: "text-amber-400"
  }), t.autoSave?.history?.title || 'Draft History'), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowDraftHistory(false),
    className: "text-slate-400 hover:text-white"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "X",
    size: 20
  }))), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 overflow-y-auto space-y-2"
  }, draftHistory.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "text-center text-slate-500 py-8"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "FileX",
    size: 32,
    className: "mx-auto mb-2 opacity-50"
  }), /*#__PURE__*/React.createElement("p", null, t.autoSave?.history?.empty || 'No saved drafts')) : draftHistory.map(draft => /*#__PURE__*/React.createElement("div", {
    key: draft.id,
    className: "p-3 bg-slate-900/50 border border-slate-700 rounded-lg hover:border-amber-500/30 transition-colors"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-start mb-2"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-medium text-white line-clamp-1"
  }, draft.fields?.task?.substring(0, 50) || 'Untitled', draft.fields?.task?.length > 50 ? '...' : ''), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-500"
  }, new Date(draft.savedAt).toLocaleString())), /*#__PURE__*/React.createElement("button", {
    onClick: () => loadDraftFromHistory(draft),
    className: "px-3 py-1 bg-amber-500/20 text-amber-400 rounded hover:bg-amber-500/30 text-xs font-medium"
  }, t.autoSave?.history?.load || 'Load')), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 flex-wrap"
  }, draft.template && /*#__PURE__*/React.createElement("span", {
    className: "px-2 py-0.5 bg-slate-700 rounded text-xs text-slate-400"
  }, draft.template), draft.target && /*#__PURE__*/React.createElement("span", {
    className: "px-2 py-0.5 bg-slate-700 rounded text-xs text-slate-400"
  }, draft.target))))), draftHistory.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "mt-4 pt-4 border-t border-slate-700"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      clearAutosaveHistory();
      setDraftHistory([]);
    },
    className: "w-full px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 text-sm"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Trash2",
    size: 14,
    className: "inline mr-2"
  }), t.autoSave?.history?.clear || 'Clear History')))), showTokenInfo && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/60 flex items-center justify-center z-50",
    onClick: () => setShowTokenInfo(false)
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-800 p-5 rounded-xl border border-slate-700 w-[400px] max-w-[95vw]",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center mb-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-bold text-white flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "BarChart2",
    size: 20,
    className: "text-amber-400"
  }), t.quality?.title || 'Prompt Quality', " & ", t.tokens?.title || 'Tokens'), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowTokenInfo(false),
    className: "text-slate-400 hover:text-white"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "X",
    size: 20
  }))), /*#__PURE__*/React.createElement("div", {
    className: "mb-4 p-4 bg-slate-900/50 border border-slate-700 rounded-lg"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm text-slate-400"
  }, t.quality?.grade || 'Grade'), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-3xl font-bold",
    style: {
      color: promptScore.gradeColor
    }
  }, promptScore.grade), /*#__PURE__*/React.createElement("span", {
    className: "text-lg text-slate-400"
  }, promptScore.score, "/100"))), /*#__PURE__*/React.createElement("div", {
    className: "w-full h-2 bg-slate-700 rounded-full overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h-full transition-all duration-500",
    style: {
      width: `${promptScore.score}%`,
      backgroundColor: promptScore.gradeColor
    }
  })), promptScore.suggestions.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "mt-3 space-y-1"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-500"
  }, t.quality?.suggestions || 'Suggestions', ":"), promptScore.suggestions.map((s, i) => /*#__PURE__*/React.createElement("p", {
    key: i,
    className: "text-xs text-slate-400 flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Lightbulb",
    size: 10,
    className: "text-amber-400"
  }), t.quality?.suggestionKeys?.[s.key] || s.key)))), /*#__PURE__*/React.createElement("div", {
    className: "p-4 bg-slate-900/50 border border-slate-700 rounded-lg"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm text-slate-400"
  }, t.tokens?.count || 'Estimated tokens'), /*#__PURE__*/React.createElement("span", {
    className: `text-lg font-medium ${tokenWarning === 'error' ? 'text-red-400' : tokenWarning === 'warning' ? 'text-yellow-400' : 'text-green-400'}`
  }, "~", tokenCount.toLocaleString())), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm text-slate-400"
  }, t.tokens?.limit || 'Model limit', " (", currentModelLimits.name, ")"), /*#__PURE__*/React.createElement("span", {
    className: "text-sm text-slate-300"
  }, currentModelLimits.limit.toLocaleString())), /*#__PURE__*/React.createElement("div", {
    className: "w-full h-2 bg-slate-700 rounded-full overflow-hidden mb-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: `h-full transition-all duration-300 ${tokenWarning === 'error' ? 'bg-red-500' : tokenWarning === 'warning' ? 'bg-yellow-500' : 'bg-green-500'}`,
    style: {
      width: `${Math.min(tokenCount / currentModelLimits.limit * 100, 100)}%`
    }
  })), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-500"
  }, t.tokens?.note || 'Estimates are approximate. Actual token count may vary by model.')))), showShortcuts && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/60 flex items-center justify-center z-50",
    onClick: () => setShowShortcuts(false)
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-800 p-5 rounded-xl border border-slate-700 w-[380px] max-w-[95vw]",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center mb-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-bold text-white flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Keyboard",
    size: 20,
    className: "text-amber-400"
  }), t.shortcuts?.title || 'Keyboard Shortcuts'), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowShortcuts(false),
    className: "text-slate-400 hover:text-white"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "X",
    size: 20
  }))), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, [{
    keys: ['Ctrl', 'S'],
    action: t.shortcuts?.save || 'Save prompt'
  }, {
    keys: ['Ctrl', 'Enter'],
    action: t.shortcuts?.verify || 'Verify with AI'
  }, {
    keys: ['Ctrl', 'Shift', 'N'],
    action: t.shortcuts?.newPrompt || 'New prompt'
  }, {
    keys: ['Ctrl', 'D'],
    action: t.shortcuts?.database || 'Open/close database'
  }, {
    keys: ['Ctrl', '/'],
    action: t.shortcuts?.showHelp || 'Show shortcuts'
  }, {
    keys: ['Esc'],
    action: t.shortcuts?.close || 'Close modal'
  }].map((shortcut, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex gap-1"
  }, shortcut.keys.map((key, j) => /*#__PURE__*/React.createElement("span", {
    key: j,
    className: "px-2 py-1 bg-slate-700 border border-slate-600 rounded text-xs font-mono text-slate-300"
  }, key))), /*#__PURE__*/React.createElement("span", {
    className: "text-sm text-slate-400"
  }, shortcut.action)))))), showQuickStart && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/60 flex items-center justify-center z-50",
    onClick: () => setShowQuickStart(false)
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-800 p-5 rounded-xl border border-slate-700 w-[500px] max-w-[95vw] max-h-[80vh] flex flex-col",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center mb-2"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-bold text-white flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Zap",
    size: 20,
    className: "text-amber-400"
  }), t.quickStart?.title || 'Quick-Start Templates'), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowQuickStart(false),
    className: "text-slate-400 hover:text-white"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "X",
    size: 20
  }))), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-400 mb-4"
  }, t.quickStart?.subtitle || 'Ready-to-use prompt templates for common tasks'), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 overflow-y-auto space-y-2"
  }, Object.entries(QUICKSTART_TEMPLATES).map(([key, template]) => /*#__PURE__*/React.createElement("button", {
    key: key,
    onClick: () => applyQuickStartTemplate(key),
    className: "w-full p-4 bg-slate-900/50 border border-slate-700 rounded-lg hover:border-amber-500/50 hover:bg-slate-900/80 transition-all text-left group"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center flex-shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: template.icon,
    size: 20,
    className: "text-amber-400"
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-medium text-white group-hover:text-amber-400 transition-colors"
  }, t.quickStart?.templates?.[key]?.name || key.replace(/_/g, ' ')), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-500 line-clamp-2"
  }, t.quickStart?.templates?.[key]?.desc || template.fields.task.substring(0, 80)), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 mt-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "px-2 py-0.5 bg-slate-700 rounded text-xs text-slate-400"
  }, template.template), template.methods.slice(0, 2).map(m => /*#__PURE__*/React.createElement("span", {
    key: m,
    className: "px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs"
  }, m)))), /*#__PURE__*/React.createElement(Icon, {
    name: "ArrowRight",
    size: 16,
    className: "text-slate-600 group-hover:text-amber-400 transition-colors mt-2"
  }))))))), showTutorialConfirm && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/60 flex items-center justify-center z-50",
    onClick: () => setShowTutorialConfirm(false)
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-800 p-6 rounded-xl border border-amber-500/50 w-96 shadow-2xl shadow-amber-500/20",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 mb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "GraduationCap",
    size: 24,
    className: "text-amber-400"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-bold text-white"
  }, t.tutorial?.confirmTitle || 'Start Tutorial?'))), /*#__PURE__*/React.createElement("p", {
    className: "text-slate-300 text-sm mb-6"
  }, t.tutorial?.confirmMessage || 'Would you like to start an interactive tutorial that will guide you through creating your first prompt?'), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-3"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowTutorialConfirm(false),
    className: "flex-1 px-4 py-2.5 bg-slate-700 text-white rounded-lg hover:bg-slate-600 font-medium"
  }, t.tutorial?.confirmCancel || 'Cancel'), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setShowTutorialConfirm(false);
      setTutorialStep(0);
      setTutorialActive(true);
      // Reset form to show tutorial with clean slate
      setFields({
        role: '',
        task: '',
        context: '',
        constraints: '',
        outputFormat: '',
        examples: ''
      });
      setSelectedMethods([]);
    },
    className: "flex-1 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-900 rounded-lg hover:from-amber-400 hover:to-orange-400 font-medium flex items-center justify-center gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Play",
    size: 16
  }), t.tutorial?.confirmStart || 'Start Tutorial')))), tutorialActive && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "tutorial-overlay",
    onClick: () => setTutorialActive(false)
  }), (() => {
    const currentStep = tutorialSteps[tutorialStep];
    const stepData = t.tutorial?.steps?.[currentStep?.id] || {};
    const targetElement = currentStep?.target ? document.getElementById(currentStep.target) : null;
    const rect = targetElement?.getBoundingClientRect();

    // Calculate tooltip position with viewport bounds checking
    let tooltipStyle = {};
    let pointerStyle = {};
    const tooltipWidth = 320;
    const tooltipHeight = 250;
    if (currentStep?.position === 'center' || !rect) {
      tooltipStyle = {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      };
    } else {
      // Use fixed positioning relative to viewport
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      // Calculate center of target element in viewport
      const targetCenterY = rect.top + rect.height / 2;
      const targetCenterX = rect.left + rect.width / 2;

      // Determine best position based on available space
      let position = currentStep.position;

      // Check if there's enough space in the preferred position
      if (position === 'left' && rect.left < tooltipWidth + 40) {
        position = 'right';
      }
      if (position === 'right' && viewportWidth - rect.right < tooltipWidth + 40) {
        position = 'bottom';
      }
      switch (position) {
        case 'bottom':
          tooltipStyle = {
            position: 'fixed',
            top: `${Math.min(rect.bottom + 20, viewportHeight - tooltipHeight - 20)}px`,
            left: `${Math.max(20, Math.min(targetCenterX - tooltipWidth / 2, viewportWidth - tooltipWidth - 20))}px`
          };
          pointerStyle = {
            position: 'fixed',
            top: `${rect.bottom + 5}px`,
            left: `${targetCenterX}px`
          };
          break;
        case 'top':
          tooltipStyle = {
            position: 'fixed',
            top: `${Math.max(20, rect.top - tooltipHeight - 20)}px`,
            left: `${Math.max(20, Math.min(targetCenterX - tooltipWidth / 2, viewportWidth - tooltipWidth - 20))}px`
          };
          pointerStyle = {
            position: 'fixed',
            top: `${rect.top - 40}px`,
            left: `${targetCenterX}px`
          };
          break;
        case 'right':
          tooltipStyle = {
            position: 'fixed',
            top: `${Math.max(20, Math.min(targetCenterY - tooltipHeight / 2, viewportHeight - tooltipHeight - 20))}px`,
            left: `${rect.right + 20}px`
          };
          pointerStyle = {
            position: 'fixed',
            top: `${targetCenterY}px`,
            left: `${rect.right + 5}px`
          };
          break;
        case 'left':
          tooltipStyle = {
            position: 'fixed',
            top: `${Math.max(20, Math.min(targetCenterY - tooltipHeight / 2, viewportHeight - tooltipHeight - 20))}px`,
            left: `${Math.max(20, rect.left - tooltipWidth - 20)}px`
          };
          pointerStyle = {
            position: 'fixed',
            top: `${targetCenterY}px`,
            left: `${rect.left - 40}px`
          };
          break;
      }
    }
    return /*#__PURE__*/React.createElement(React.Fragment, null, currentStep?.position !== 'center' && rect && /*#__PURE__*/React.createElement("div", {
      className: "tutorial-pointer",
      style: pointerStyle
    }, "\uD83D\uDC46"), /*#__PURE__*/React.createElement("div", {
      className: "tutorial-tooltip",
      style: tooltipStyle
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-start gap-3 mb-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center flex-shrink-0"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "GraduationCap",
      size: 20,
      className: "text-amber-400"
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h4", {
      className: "text-white font-bold text-base"
    }, stepData.title || 'Tutorial'), /*#__PURE__*/React.createElement("p", {
      className: "text-slate-300 text-sm mt-1"
    }, stepData.content || ''))), /*#__PURE__*/React.createElement("div", {
      className: "tutorial-step-indicator"
    }, tutorialSteps.map((_, idx) => /*#__PURE__*/React.createElement("div", {
      key: idx,
      className: `tutorial-step-dot ${idx === tutorialStep ? 'active' : idx < tutorialStep ? 'completed' : ''}`
    }))), /*#__PURE__*/React.createElement("div", {
      className: "flex justify-between items-center mt-4 pt-3 border-t border-slate-700"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setTutorialActive(false),
      className: "text-xs text-slate-500 hover:text-slate-300"
    }, t.tutorial?.skipBtn || 'Skip'), /*#__PURE__*/React.createElement("div", {
      className: "flex gap-2"
    }, tutorialStep > 0 && /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        setTutorialStep(prev => prev - 1);
        const prevTarget = tutorialSteps[tutorialStep - 1]?.target;
        if (prevTarget) {
          document.getElementById(prevTarget)?.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
        }
      },
      className: "px-3 py-1.5 bg-slate-700 text-white rounded-lg text-sm hover:bg-slate-600"
    }, t.tutorial?.prevBtn || 'Back'), tutorialStep < tutorialSteps.length - 1 ? /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        setTutorialStep(prev => prev + 1);
        const nextTarget = tutorialSteps[tutorialStep + 1]?.target;
        if (nextTarget) {
          document.getElementById(nextTarget)?.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
        }
      },
      className: "px-3 py-1.5 bg-amber-500 text-slate-900 rounded-lg text-sm font-medium hover:bg-amber-400 flex items-center gap-1"
    }, t.tutorial?.nextBtn || 'Next', /*#__PURE__*/React.createElement(Icon, {
      name: "ChevronRight",
      size: 14
    })) : /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        setTutorialActive(false);
        // Fill in example data
        setFields({
          role: lang === 'cs' ? 'zkušený programátor v Pythonu' : 'an experienced Python developer',
          task: lang === 'cs' ? 'Napiš funkci, která kontroluje, zda je číslo prvočíslo. Funkce by měla být efektivní a dobře zdokumentovaná.' : 'Write a function that checks if a number is prime. The function should be efficient and well-documented.',
          context: lang === 'cs' ? 'Toto je pro vzdělávací projekt pro začátečníky.' : 'This is for an educational project for beginners.',
          constraints: '',
          outputFormat: '',
          examples: ''
        });
        setNotification(t.tutorial?.completed?.message || 'Tutorial completed!');
        setTimeout(() => setNotification(''), 3000);
      },
      className: "px-4 py-1.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-400 flex items-center gap-1"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "Check",
      size: 14
    }), t.tutorial?.finishBtn || 'Finish'))), /*#__PURE__*/React.createElement("div", {
      className: "text-center mt-2 text-xs text-slate-500"
    }, (t.tutorial?.stepOf || 'Step {current} of {total}').replace('{current}', tutorialStep + 1).replace('{total}', tutorialSteps.length))));
  })()), showDatabase && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50",
    onClick: () => setShowDatabase(false)
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-800 p-6 rounded-xl border border-slate-700 w-[700px] max-w-[95vw] max-h-[85vh] overflow-hidden flex flex-col",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center mb-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-bold text-white flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Database",
    size: 20,
    className: "text-amber-400"
  }), t.database.title, " (", savedPrompts.length, ")"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowDatabase(false),
    className: "text-slate-400 hover:text-white"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "X",
    size: 20
  }))), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 mb-4 flex-wrap"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: exportDatabase,
    disabled: savedPrompts.length === 0,
    className: "flex items-center gap-2 px-3 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 disabled:opacity-50 text-sm"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Download",
    size: 16
  }), " ", t.database.export), /*#__PURE__*/React.createElement("label", {
    className: "flex items-center gap-2 px-3 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 cursor-pointer text-sm"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Upload",
    size: 16
  }), " ", t.database.import, /*#__PURE__*/React.createElement("input", {
    type: "file",
    accept: ".json",
    onChange: importDatabase,
    className: "hidden"
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowFolderManager(true),
    className: "flex items-center gap-2 px-3 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 text-sm"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "FolderPlus",
    size: 16,
    className: "text-amber-400"
  }), " ", t.database.folders.manage), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowTagManager(true),
    className: "flex items-center gap-2 px-3 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 text-sm"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Tags",
    size: 16,
    className: "text-purple-400"
  }), " ", t.database.tags.manage)), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-4 flex-1 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-48 flex-shrink-0 overflow-y-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-400 mb-2 flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Folder",
    size: 12
  }), t.database.folders.title), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setCurrentFolderId(null),
    className: `w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${currentFolderId === null ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-slate-300 hover:bg-slate-700'}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "FolderOpen",
    size: 14
  }), t.database.folders.root, /*#__PURE__*/React.createElement("span", {
    className: "ml-auto text-xs text-slate-500"
  }, "(", rootPrompts.length, ")")), folders.map(folder => {
    const folderColor = getTagColor(folder.color);
    const count = savedPrompts.filter(p => p.folderId === folder.id).length;
    return /*#__PURE__*/React.createElement("button", {
      key: folder.id,
      onClick: () => setCurrentFolderId(folder.id),
      className: `w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${currentFolderId === folder.id ? 'bg-slate-600 text-white border border-slate-500' : 'text-slate-300 hover:bg-slate-700'}`
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "Folder",
      size: 14,
      style: {
        color: folderColor
      }
    }), /*#__PURE__*/React.createElement("span", {
      className: "truncate flex-1"
    }, folder.name), /*#__PURE__*/React.createElement("span", {
      className: "text-xs text-slate-500"
    }, "(", count, ")"));
  })), tags.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-400 mt-4 mb-2 flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Tags",
    size: 12
  }), t.database.tags.filterByTag), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1"
  }, filterTagId && /*#__PURE__*/React.createElement("button", {
    onClick: () => setFilterTagId(null),
    className: "w-full text-left px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:bg-slate-700 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "X",
    size: 12
  }), t.database.tags.clearFilter), tags.map(tag => {
    const color = getTagColor(tag.color);
    const isActive = filterTagId === tag.id;
    return /*#__PURE__*/React.createElement("button", {
      key: tag.id,
      onClick: () => setFilterTagId(isActive ? null : tag.id),
      className: `w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center gap-2 transition-colors ${isActive ? 'ring-1 ring-white' : 'hover:bg-slate-700'}`,
      style: {
        backgroundColor: `${color}20`,
        color: color
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "w-2 h-2 rounded-full",
      style: {
        backgroundColor: color
      }
    }), tag.name);
  })))), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 overflow-y-auto space-y-2"
  }, getFilteredPrompts.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "text-center text-slate-500 py-8"
  }, t.database.noPrompts) : getFilteredPrompts.map(prompt => {
    const promptTags = (prompt.tags || []).map(tagId => tags.find(t => t.id === tagId)).filter(Boolean);
    const folder = folders.find(f => f.id === prompt.folderId);
    return /*#__PURE__*/React.createElement("div", {
      key: prompt.id,
      className: "bg-slate-700/50 p-3 rounded-lg border border-slate-600"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex justify-between items-start mb-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex-1 min-w-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-white font-medium truncate"
    }, prompt.name), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 text-xs text-slate-400 mt-0.5"
    }, /*#__PURE__*/React.createElement("span", null, new Date(prompt.updatedAt).toLocaleDateString()), folder && /*#__PURE__*/React.createElement("span", {
      className: "flex items-center gap-1",
      style: {
        color: getTagColor(folder.color)
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "Folder",
      size: 10
    }), folder.name)), promptTags.length > 0 && /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap gap-1 mt-2"
    }, promptTags.map(tag => /*#__PURE__*/React.createElement("span", {
      key: tag.id,
      className: "px-1.5 py-0.5 rounded text-xs",
      style: {
        backgroundColor: `${getTagColor(tag.color)}25`,
        color: getTagColor(tag.color)
      }
    }, tag.name)))), /*#__PURE__*/React.createElement("div", {
      className: "flex gap-1 ml-2 flex-shrink-0"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => loadPrompt(prompt),
      className: "p-1.5 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30",
      title: t.database.load
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "FolderOpen",
      size: 14
    })), /*#__PURE__*/React.createElement("button", {
      onClick: () => editPrompt(prompt),
      className: "p-1.5 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30",
      title: t.database.edit
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "Edit3",
      size: 14
    })), /*#__PURE__*/React.createElement("button", {
      onClick: () => duplicatePrompt(prompt),
      className: "p-1.5 bg-amber-500/20 text-amber-400 rounded hover:bg-amber-500/30",
      title: t.database.duplicate
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "Copy",
      size: 14
    })), /*#__PURE__*/React.createElement("button", {
      onClick: () => deletePrompt(prompt.id),
      className: "p-1.5 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30",
      title: t.database.delete
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "Trash2",
      size: 14
    })))), /*#__PURE__*/React.createElement("div", {
      className: "text-xs text-slate-400 truncate"
    }, prompt.fields?.task?.substring(0, 80), "..."));
  }))))), showFolderManager && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50",
    onClick: () => setShowFolderManager(false)
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-800 p-6 rounded-xl border border-slate-700 w-[450px] max-w-[95vw] max-h-[80vh] overflow-hidden flex flex-col",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center mb-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-bold text-white flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "FolderPlus",
    size: 20,
    className: "text-amber-400"
  }), t.database.folders.manage), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowFolderManager(false),
    className: "text-slate-400 hover:text-white"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "X",
    size: 20
  }))), /*#__PURE__*/React.createElement("div", {
    className: "mb-4 p-3 bg-slate-700/50 rounded-lg border border-slate-600"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-400 mb-2"
  }, t.database.folders.newFolder), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: newFolderName,
    onChange: e => setNewFolderName(e.target.value),
    onKeyDown: e => e.key === 'Enter' && addFolder(),
    placeholder: t.database.folders.folderName,
    className: "flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
  }), /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setShowNewFolderColorPicker(!showNewFolderColorPicker),
    className: "w-10 h-10 rounded-lg border border-slate-600 flex items-center justify-center hover:border-slate-500 transition-colors",
    style: {
      backgroundColor: getTagColor(newFolderColor)
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Palette",
    size: 16,
    className: "text-white drop-shadow"
  })), showNewFolderColorPicker && /*#__PURE__*/React.createElement("div", {
    className: "absolute top-full mt-1 right-0 bg-slate-800 border border-slate-600 rounded-lg p-2 grid grid-cols-6 gap-1 z-20 w-40 shadow-xl",
    onClick: e => e.stopPropagation()
  }, TAG_COLORS.map(color => /*#__PURE__*/React.createElement("button", {
    key: color.id,
    type: "button",
    onClick: () => {
      setNewFolderColor(color.id);
      setShowNewFolderColorPicker(false);
    },
    className: `w-5 h-5 rounded hover:scale-110 transition-transform ${newFolderColor === color.id ? 'ring-2 ring-white' : ''}`,
    style: {
      backgroundColor: color.hex
    },
    title: color.name
  })))), /*#__PURE__*/React.createElement("button", {
    onClick: addFolder,
    disabled: !newFolderName.trim(),
    className: "px-4 py-2 bg-amber-500 text-slate-900 rounded-lg hover:bg-amber-400 disabled:opacity-50 font-medium text-sm"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Plus",
    size: 16
  })))), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 overflow-y-auto space-y-2"
  }, folders.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "text-center text-slate-500 py-8"
  }, t.database.folders.noFolders) : folders.map(folder => /*#__PURE__*/React.createElement("div", {
    key: folder.id,
    className: "flex items-center gap-2 p-3 bg-slate-700/50 rounded-lg border border-slate-600"
  }, editingFolder?.id === folder.id ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: editingFolder.name,
    onChange: e => setEditingFolder({
      ...editingFolder,
      name: e.target.value
    }),
    className: "flex-1 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm",
    autoFocus: true
  }), /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setShowEditFolderColorPicker(!showEditFolderColorPicker),
    className: "w-8 h-8 rounded border border-slate-600 hover:border-slate-500 transition-colors flex items-center justify-center",
    style: {
      backgroundColor: getTagColor(editingFolder.color)
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Palette",
    size: 12,
    className: "text-white drop-shadow"
  })), showEditFolderColorPicker && /*#__PURE__*/React.createElement("div", {
    className: "absolute top-full mt-1 right-0 bg-slate-800 border border-slate-600 rounded-lg p-2 grid grid-cols-6 gap-1 z-20 w-40 shadow-xl",
    onClick: e => e.stopPropagation()
  }, TAG_COLORS.map(color => /*#__PURE__*/React.createElement("button", {
    key: color.id,
    type: "button",
    onClick: () => {
      setEditingFolder({
        ...editingFolder,
        color: color.id
      });
      setShowEditFolderColorPicker(false);
    },
    className: `w-5 h-5 rounded hover:scale-110 transition-transform ${editingFolder.color === color.id ? 'ring-2 ring-white' : ''}`,
    style: {
      backgroundColor: color.hex
    }
  })))), /*#__PURE__*/React.createElement("button", {
    onClick: () => updateFolder(folder.id, editingFolder.name, editingFolder.color),
    className: "p-1.5 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Check",
    size: 14
  })), /*#__PURE__*/React.createElement("button", {
    onClick: () => setEditingFolder(null),
    className: "p-1.5 bg-slate-600 text-slate-400 rounded hover:bg-slate-500"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "X",
    size: 14
  }))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Icon, {
    name: "Folder",
    size: 18,
    style: {
      color: getTagColor(folder.color)
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "flex-1 text-white"
  }, folder.name), /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-slate-500"
  }, savedPrompts.filter(p => p.folderId === folder.id).length, " prompts"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setEditingFolder({
      id: folder.id,
      name: folder.name,
      color: folder.color
    }),
    className: "p-1.5 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Edit3",
    size: 14
  })), /*#__PURE__*/React.createElement("button", {
    onClick: () => deleteFolder(folder.id),
    className: "p-1.5 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Trash2",
    size: 14
  })))))))), showTagManager && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50",
    onClick: () => setShowTagManager(false)
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-800 p-6 rounded-xl border border-slate-700 w-[450px] max-w-[95vw] max-h-[80vh] overflow-hidden flex flex-col",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center mb-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-bold text-white flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Tags",
    size: 20,
    className: "text-purple-400"
  }), t.database.tags.manage), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowTagManager(false),
    className: "text-slate-400 hover:text-white"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "X",
    size: 20
  }))), /*#__PURE__*/React.createElement("div", {
    className: "mb-4 p-3 bg-slate-700/50 rounded-lg border border-slate-600"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-400 mb-2"
  }, t.database.tags.newTag), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: newTagName,
    onChange: e => setNewTagName(e.target.value),
    onKeyDown: e => e.key === 'Enter' && addTag(),
    placeholder: t.database.tags.tagName,
    className: "flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
  }), /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setShowNewTagColorPicker(!showNewTagColorPicker),
    className: "w-10 h-10 rounded-lg border border-slate-600 flex items-center justify-center hover:border-slate-500 transition-colors",
    style: {
      backgroundColor: getTagColor(newTagColor)
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Palette",
    size: 16,
    className: "text-white drop-shadow"
  })), showNewTagColorPicker && /*#__PURE__*/React.createElement("div", {
    className: "absolute top-full mt-1 right-0 bg-slate-800 border border-slate-600 rounded-lg p-2 grid grid-cols-6 gap-1 z-20 w-40 shadow-xl",
    onClick: e => e.stopPropagation()
  }, TAG_COLORS.map(color => /*#__PURE__*/React.createElement("button", {
    key: color.id,
    type: "button",
    onClick: () => {
      setNewTagColor(color.id);
      setShowNewTagColorPicker(false);
    },
    className: `w-5 h-5 rounded hover:scale-110 transition-transform ${newTagColor === color.id ? 'ring-2 ring-white' : ''}`,
    style: {
      backgroundColor: color.hex
    },
    title: color.name
  })))), /*#__PURE__*/React.createElement("button", {
    onClick: addTag,
    disabled: !newTagName.trim(),
    className: "px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-400 disabled:opacity-50 font-medium text-sm"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Plus",
    size: 16
  })))), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 overflow-y-auto space-y-2"
  }, tags.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "text-center text-slate-500 py-8"
  }, t.database.tags.noTags) : tags.map(tag => /*#__PURE__*/React.createElement("div", {
    key: tag.id,
    className: "flex items-center gap-2 p-3 bg-slate-700/50 rounded-lg border border-slate-600"
  }, editingTag?.id === tag.id ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: editingTag.name,
    onChange: e => setEditingTag({
      ...editingTag,
      name: e.target.value
    }),
    className: "flex-1 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm",
    autoFocus: true
  }), /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setShowEditTagColorPicker(!showEditTagColorPicker),
    className: "w-8 h-8 rounded border border-slate-600 hover:border-slate-500 transition-colors flex items-center justify-center",
    style: {
      backgroundColor: getTagColor(editingTag.color)
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Palette",
    size: 12,
    className: "text-white drop-shadow"
  })), showEditTagColorPicker && /*#__PURE__*/React.createElement("div", {
    className: "absolute top-full mt-1 right-0 bg-slate-800 border border-slate-600 rounded-lg p-2 grid grid-cols-6 gap-1 z-20 w-40 shadow-xl",
    onClick: e => e.stopPropagation()
  }, TAG_COLORS.map(color => /*#__PURE__*/React.createElement("button", {
    key: color.id,
    type: "button",
    onClick: () => {
      setEditingTag({
        ...editingTag,
        color: color.id
      });
      setShowEditTagColorPicker(false);
    },
    className: `w-5 h-5 rounded hover:scale-110 transition-transform ${editingTag.color === color.id ? 'ring-2 ring-white' : ''}`,
    style: {
      backgroundColor: color.hex
    }
  })))), /*#__PURE__*/React.createElement("button", {
    onClick: () => updateTag(tag.id, editingTag.name, editingTag.color),
    className: "p-1.5 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Check",
    size: 14
  })), /*#__PURE__*/React.createElement("button", {
    onClick: () => setEditingTag(null),
    className: "p-1.5 bg-slate-600 text-slate-400 rounded hover:bg-slate-500"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "X",
    size: 14
  }))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    className: "px-2 py-1 rounded-full text-xs font-medium",
    style: {
      backgroundColor: `${getTagColor(tag.color)}25`,
      color: getTagColor(tag.color),
      border: `1px solid ${getTagColor(tag.color)}`
    }
  }, tag.name), /*#__PURE__*/React.createElement("span", {
    className: "flex-1"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-slate-500"
  }, savedPrompts.filter(p => (p.tags || []).includes(tag.id)).length, " prompts"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setEditingTag({
      id: tag.id,
      name: tag.name,
      color: tag.color
    }),
    className: "p-1.5 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Edit3",
    size: 14
  })), /*#__PURE__*/React.createElement("button", {
    onClick: () => deleteTag(tag.id),
    className: "p-1.5 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Trash2",
    size: 14
  })))))))), /*#__PURE__*/React.createElement("div", {
    className: "max-w-7xl mx-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-4"
  }, /*#__PURE__*/React.createElement("a", {
    href: "../../index.html",
    className: "flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "ArrowLeft",
    size: 18
  }), /*#__PURE__*/React.createElement("span", {
    className: "hidden sm:inline"
  }, t.backToHub)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Sparkles",
    size: 24,
    className: "text-amber-400"
  }), /*#__PURE__*/React.createElement("h1", {
    className: "text-2xl font-bold text-white"
  }, t.title)), /*#__PURE__*/React.createElement("p", {
    className: "text-slate-400 text-sm"
  }, t.subtitle))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: resetForm,
    className: "flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white hover:bg-slate-700 text-sm"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Plus",
    size: 16,
    className: "text-slate-400"
  }), /*#__PURE__*/React.createElement("span", {
    className: "hidden sm:inline"
  }, t.newPrompt)), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setEditingId(null);
      setPromptName('');
      setSaveModalOpen(true);
    },
    disabled: !formattedPrompt,
    className: "flex items-center gap-2 px-3 py-2 bg-green-600 border border-green-500 rounded-lg text-white hover:bg-green-500 disabled:opacity-50 text-sm"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Save",
    size: 16
  }), /*#__PURE__*/React.createElement("span", {
    className: "hidden sm:inline"
  }, t.database.save)), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowTutorialConfirm(true),
    className: "flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/50 rounded-lg text-white hover:from-amber-500/30 hover:to-orange-500/30 transition-all",
    title: t.tutorial?.buttonTooltip || 'Tutorial'
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "GraduationCap",
    size: 16,
    className: "text-amber-400"
  }), /*#__PURE__*/React.createElement("span", {
    className: "hidden sm:inline text-sm text-amber-300"
  }, t.tutorial?.button || 'Tutorial')), /*#__PURE__*/React.createElement("button", {
    onClick: openShareModal,
    disabled: !formattedPrompt,
    className: "flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white hover:bg-slate-700 disabled:opacity-50",
    title: t.share.title
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Share2",
    size: 16,
    className: "text-green-400"
  })), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowImportModal(true),
    className: "flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white hover:bg-slate-700",
    title: t.share.importTitle
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Download",
    size: 16,
    className: "text-blue-400"
  })), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowQuickStart(true),
    className: "flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-lg text-white hover:from-amber-500/30 hover:to-orange-500/30",
    title: t.quickStart?.title || 'Quick-Start Templates'
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Zap",
    size: 16,
    className: "text-amber-400"
  }), /*#__PURE__*/React.createElement("span", {
    className: "hidden sm:inline text-sm text-amber-300"
  }, lang === 'cs' ? 'Šablony' : 'Templates')), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowDraftHistory(true),
    className: "flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white hover:bg-slate-700",
    title: t.autoSave?.history?.title || 'Draft History'
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "History",
    size: 16,
    className: "text-purple-400"
  }), draftHistory.length > 0 && /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-purple-400"
  }, draftHistory.length)), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowShortcuts(true),
    className: "hidden md:flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white hover:bg-slate-700",
    title: t.shortcuts?.title || 'Keyboard Shortcuts (Ctrl+/)'
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Keyboard",
    size: 16,
    className: "text-slate-400"
  })), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowDatabase(true),
    className: "flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white hover:bg-slate-700"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Database",
    size: 16,
    className: "text-amber-400"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-sm"
  }, savedPrompts.length)), autoSaveStatus !== 'idle' && /*#__PURE__*/React.createElement("div", {
    className: `flex items-center gap-1.5 px-2 py-1 rounded text-xs ${autoSaveStatus === 'saving' ? 'text-amber-400' : autoSaveStatus === 'saved' ? 'text-green-400' : 'text-red-400'}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: autoSaveStatus === 'saving' ? 'Loader2' : autoSaveStatus === 'saved' ? 'Check' : 'AlertCircle',
    size: 12,
    className: autoSaveStatus === 'saving' ? 'animate-spin' : ''
  }), /*#__PURE__*/React.createElement("span", null, t.autoSave?.status?.[autoSaveStatus] || autoSaveStatus)), /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowLangDropdown(!showLangDropdown),
    className: "flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white hover:bg-slate-700"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Globe",
    size: 16,
    className: "text-slate-400"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-lg"
  }, selectedLang?.flag), /*#__PURE__*/React.createElement("span", {
    className: "hidden sm:inline text-sm text-slate-300"
  }, selectedLang?.native), /*#__PURE__*/React.createElement(Icon, {
    name: "ChevronDown",
    size: 14,
    className: `transition-transform ${showLangDropdown ? 'rotate-180' : ''}`
  })), showLangDropdown && /*#__PURE__*/React.createElement("div", {
    className: "absolute top-full right-0 mt-1 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-30 overflow-hidden"
  }, AVAILABLE_LANGUAGES.map(l => /*#__PURE__*/React.createElement("button", {
    key: l.code,
    onClick: () => setLang(l.code),
    className: `w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-700 text-left ${lang === l.code ? 'bg-slate-700 border-l-2 border-amber-500' : ''}`
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-lg"
  }, l.flag), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-sm text-white truncate"
  }, l.native), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-400 truncate"
  }, l.name)))))))), t.checklist && /*#__PURE__*/React.createElement("div", {
    className: `hidden lg:block fixed bottom-0 left-1/2 -translate-x-1/2 z-40 transition-all duration-300 ${checklistExpanded ? 'translate-y-0' : 'translate-y-[calc(100%-52px)]'}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-800/98 backdrop-blur-sm border border-slate-700 border-b-0 rounded-t-xl shadow-2xl w-[800px] max-w-[95vw]"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setChecklistExpanded(!checklistExpanded),
    className: "w-full px-4 py-3 flex items-center justify-between hover:bg-slate-700/50 transition-colors rounded-t-xl"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "CheckSquare",
    size: 20,
    className: "text-amber-400"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-bold text-white"
  }, t.checklist.title), /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-slate-400 hidden sm:inline"
  }, lang === 'cs' ? '— Klikni na krok pro zvýraznění pole' : '— Click a step to highlight field')), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, !checklistExpanded && /*#__PURE__*/React.createElement("div", {
    className: "flex gap-1 mr-2"
  }, t.checklist.steps.map((step, idx) => /*#__PURE__*/React.createElement("div", {
    key: step.key,
    className: `w-5 h-5 rounded dot-${step.color} flex items-center justify-center text-white text-[9px] font-bold`,
    title: step.name
  }, idx + 1))), /*#__PURE__*/React.createElement(Icon, {
    name: checklistExpanded ? 'ChevronDown' : 'ChevronUp',
    size: 18,
    className: "text-slate-400"
  }))), checklistExpanded && /*#__PURE__*/React.createElement("div", {
    className: "px-4 pb-4"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400 mb-3"
  }, t.checklist.subtitle), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-3"
  }, t.checklist.steps.map((step, idx) => /*#__PURE__*/React.createElement("button", {
    key: step.key,
    onClick: () => {
      highlightField(step.key);
      setChecklistExpanded(false);
    },
    className: `text-left p-3 rounded-lg border bg-check-${step.color} hover:ring-2 hover:ring-white/30 hover:scale-[1.02] transition-all cursor-pointer`
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: `w-5 h-5 rounded-full dot-${step.color} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0`
  }, idx + 1), /*#__PURE__*/React.createElement("span", {
    className: `font-semibold text-xs text-check-${step.color}`
  }, step.name)), /*#__PURE__*/React.createElement("p", {
    className: "text-[10px] text-slate-300 leading-relaxed"
  }, step.desc)))), /*#__PURE__*/React.createElement("div", {
    className: "p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Lightbulb",
    size: 14,
    className: "text-amber-400 flex-shrink-0"
  }), /*#__PURE__*/React.createElement("p", {
    className: "text-[10px] text-amber-200"
  }, t.checklist.tip))))), /*#__PURE__*/React.createElement("div", {
    className: "grid lg:grid-cols-5 gap-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lg:col-span-2 space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    id: "template-selector",
    className: `relative ${tutorialActive && tutorialSteps[tutorialStep]?.target === 'template-selector' ? 'tutorial-highlight' : ''}`
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-medium text-slate-300 mb-1"
  }, lang === 'cs' ? 'Šablona / Kategorie' : 'Template / Category'), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowTemplates(!showTemplates),
    className: "w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: TemplateIcon,
    size: 16,
    className: "text-amber-400"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-sm"
  }, selectedTemplate?.name)), /*#__PURE__*/React.createElement(Icon, {
    name: "ChevronDown",
    size: 16,
    className: `transition-transform ${showTemplates ? 'rotate-180' : ''}`
  })), showTemplates && /*#__PURE__*/React.createElement("div", {
    className: "absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg overflow-hidden z-10 shadow-xl max-h-[400px] overflow-y-auto"
  }, Object.entries(t.templates).map(([key, val]) => /*#__PURE__*/React.createElement("button", {
    key: key,
    onClick: () => {
      setTemplate(key);
      setShowTemplates(false);
    },
    className: `w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-700 ${template === key ? 'bg-slate-700' : ''}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: templateIcons[key] || 'FileText',
    size: 16,
    className: "text-amber-400"
  }), /*#__PURE__*/React.createElement("div", {
    className: "text-left"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-white text-sm"
  }, val.name), /*#__PURE__*/React.createElement("div", {
    className: "text-slate-400 text-xs"
  }, val.desc)))))), /*#__PURE__*/React.createElement("div", {
    id: "ai-model-selector",
    className: `bg-slate-800/50 border border-slate-700 rounded-lg p-3 ${tutorialActive && tutorialSteps[tutorialStep]?.target === 'ai-model-selector' ? 'tutorial-highlight' : ''}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-medium text-slate-400 flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Cpu",
    size: 14,
    className: "text-amber-400"
  }), lang === 'cs' ? 'Optimalizovat pro AI model' : 'Optimize for AI model'), /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-slate-500"
  }, aiTargets.find(a => a.id === target)?.desc)), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-1.5"
  }, aiTargets.map(ai => /*#__PURE__*/React.createElement("button", {
    key: ai.id,
    onClick: () => setTarget(ai.id),
    className: `relative flex flex-col items-center justify-center p-2 rounded-lg transition-all ${target === ai.id ? 'ring-2 ring-offset-1 ring-offset-slate-800 shadow-lg' : 'hover:bg-slate-700/50 opacity-70 hover:opacity-100'}`,
    style: {
      backgroundColor: target === ai.id ? `${ai.color}20` : 'transparent',
      borderColor: target === ai.id ? ai.color : 'transparent',
      ringColor: target === ai.id ? ai.color : 'transparent'
    },
    title: ai.desc
  }, /*#__PURE__*/React.createElement("span", {
    className: "mb-0.5"
  }, /*#__PURE__*/React.createElement(AIModelIcon, {
    model: ai.id,
    size: 24,
    color: ai.color
  })), /*#__PURE__*/React.createElement("span", {
    className: `text-[10px] font-medium ${target === ai.id ? 'text-white' : 'text-slate-400'}`
  }, ai.name), target === ai.id && /*#__PURE__*/React.createElement("div", {
    className: "absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-500 border-2 border-slate-800"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Check",
    size: 8,
    className: "text-white absolute top-0.5 left-0.5"
  }))))), (() => {
    const currentTarget = aiTargets.find(a => a.id === target);
    const availableFeatures = currentTarget?.features || [];
    const featureTranslations = t.modelFeatures?.[target] || {};
    if (availableFeatures.length === 0) return null;
    return /*#__PURE__*/React.createElement("div", {
      className: "mt-3 pt-3 border-t border-slate-700/50"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 mb-2"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "Sparkles",
      size: 12,
      className: "text-amber-400"
    }), /*#__PURE__*/React.createElement("span", {
      className: "text-[10px] text-slate-400"
    }, t.modelFeatures?.title || 'Model Features'), currentModelFeatures.length > 0 && /*#__PURE__*/React.createElement("span", {
      className: "text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded"
    }, currentModelFeatures.length, " active")), /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap gap-1.5"
    }, availableFeatures.map(featureId => {
      const feature = featureTranslations[featureId];
      if (!feature) return null;
      const isActive = currentModelFeatures.includes(featureId);
      return /*#__PURE__*/React.createElement("button", {
        key: featureId,
        onClick: () => toggleFeature(featureId),
        className: `px-2 py-1 rounded text-[10px] font-medium transition-all ${isActive ? 'text-white shadow-sm' : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-slate-300'}`,
        style: {
          backgroundColor: isActive ? `${currentTarget.color}40` : undefined,
          borderColor: isActive ? currentTarget.color : 'transparent',
          border: isActive ? `1px solid ${currentTarget.color}` : '1px solid transparent'
        },
        title: feature.desc
      }, isActive && /*#__PURE__*/React.createElement(Icon, {
        name: "Check",
        size: 10,
        className: "inline mr-1"
      }), feature.name);
    })));
  })()), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, /*#__PURE__*/React.createElement("div", {
    id: "field-role",
    className: `${tutorialActive && tutorialSteps[tutorialStep]?.target === 'field-role' ? 'tutorial-highlight' : ''} ${highlightedField === 'field-role' ? 'checklist-highlight' : ''}`
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-medium text-slate-300 mb-1"
  }, t.fields.role.label), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: fields.role,
    onChange: e => updateField('role', e.target.value),
    placeholder: t.fields.role.placeholder,
    className: "w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-sm"
  })), /*#__PURE__*/React.createElement("div", {
    id: "field-task",
    className: `${tutorialActive && tutorialSteps[tutorialStep]?.target === 'field-task' ? 'tutorial-highlight' : ''} ${highlightedField === 'field-task' ? 'checklist-highlight' : ''}`
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-medium text-slate-300 mb-1"
  }, t.fields.task.label, " ", /*#__PURE__*/React.createElement("span", {
    className: "text-amber-400"
  }, t.required)), /*#__PURE__*/React.createElement(AutoResizeTextarea, {
    value: fields.task,
    onChange: e => updateField('task', e.target.value),
    placeholder: t.fields.task.placeholder,
    minRows: 2,
    maxRows: 6,
    className: "w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-sm"
  })), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    id: "field-context",
    className: `${tutorialActive && tutorialSteps[tutorialStep]?.target === 'field-context' ? 'tutorial-highlight' : ''} ${highlightedField === 'field-context' ? 'checklist-highlight' : ''}`
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-medium text-slate-300 mb-1"
  }, t.fields.context.label), /*#__PURE__*/React.createElement(AutoResizeTextarea, {
    value: fields.context,
    onChange: e => updateField('context', e.target.value),
    placeholder: t.fields.context.placeholder,
    minRows: 2,
    maxRows: 4,
    className: "w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-sm"
  })), /*#__PURE__*/React.createElement("div", {
    id: "field-constraints",
    className: `${tutorialActive && tutorialSteps[tutorialStep]?.target === 'field-constraints' ? 'tutorial-highlight' : ''} ${highlightedField === 'field-constraints' ? 'checklist-highlight' : ''}`
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-medium text-slate-300 mb-1"
  }, (selectedMethods.includes('risen') ? t.fields.steps : t.fields.constraints).label), /*#__PURE__*/React.createElement(AutoResizeTextarea, {
    value: fields.constraints,
    onChange: e => updateField('constraints', e.target.value),
    placeholder: (selectedMethods.includes('risen') ? t.fields.steps : t.fields.constraints).placeholder,
    minRows: 2,
    maxRows: 4,
    className: "w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-sm"
  }))), /*#__PURE__*/React.createElement("div", {
    id: "field-outputFormat",
    className: `${tutorialActive && tutorialSteps[tutorialStep]?.target === 'field-outputFormat' ? 'tutorial-highlight' : ''} ${highlightedField === 'field-outputFormat' ? 'checklist-highlight' : ''}`
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-medium text-slate-300 mb-1"
  }, (selectedMethods.includes('risen') ? t.fields.expectations : t.fields.outputFormat).label), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: fields.outputFormat,
    onChange: e => updateField('outputFormat', e.target.value),
    placeholder: (selectedMethods.includes('risen') ? t.fields.expectations : t.fields.outputFormat).placeholder,
    className: "w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-sm"
  })), /*#__PURE__*/React.createElement("div", {
    id: "field-examples",
    className: `bg-slate-800/50 border border-slate-700 rounded-lg p-2 ${highlightedField === 'field-examples' ? 'checklist-highlight' : ''}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-medium text-slate-300 flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Lightbulb",
    size: 14,
    className: "text-yellow-400"
  }), selectedMethods.includes('fewshot') ? t.fields.fewshot.label : t.fields.examples.label), /*#__PURE__*/React.createElement("select", {
    value: exampleFileType,
    onChange: e => setExampleFileType(e.target.value),
    className: "px-2 py-0.5 bg-slate-700 border border-slate-600 rounded text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
  }, t.examplesSection && Object.entries(t.examplesSection.fileTypes).map(([key, val]) => /*#__PURE__*/React.createElement("option", {
    key: key,
    value: key
  }, val.name)))), exampleFileType !== 'none' && /*#__PURE__*/React.createElement("div", {
    className: "mb-2"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: exampleHeaders,
    onChange: e => setExampleHeaders(e.target.value),
    placeholder: t.examplesSection?.params.headersPlaceholder || 'e.g., Name | Age | City',
    className: "w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
  })), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5"
  }, exampleRows.map((row, idx) => /*#__PURE__*/React.createElement("div", {
    key: row.id,
    className: "flex gap-1.5 items-start"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-slate-500 pt-1.5 w-4"
  }, idx + 1, "."), /*#__PURE__*/React.createElement("textarea", {
    value: row.content,
    onChange: e => updateExampleRow(row.id, e.target.value),
    placeholder: exampleFileType !== 'none' ? lang === 'cs' ? 'Data řádku...' : 'Row data...' : lang === 'cs' ? 'Příklad...' : 'Example...',
    rows: 1,
    className: "flex-1 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-y min-h-[28px] max-h-[100px]"
  }), exampleRows.length > 1 && /*#__PURE__*/React.createElement("button", {
    onClick: () => removeExampleRow(row.id),
    className: "p-1 text-red-400 hover:text-red-300 rounded"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "X",
    size: 12
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mt-1.5"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: addExampleRow,
    className: "flex items-center gap-1 px-2 py-0.5 bg-amber-500/20 border border-amber-500/30 rounded text-amber-400 hover:bg-amber-500/30 text-[10px]"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Plus",
    size: 10
  }), lang === 'cs' ? 'Řádek' : 'Row'), exampleFileType === 'none' && exampleRows.every(r => !r.content.trim()) && /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: fields.examples,
    onChange: e => updateField('examples', e.target.value),
    placeholder: lang === 'cs' ? 'nebo volný text...' : 'or free text...',
    className: "flex-1 px-2 py-0.5 bg-slate-700 border border-slate-600 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
  })), exampleFileType !== 'none' && exampleRows.some(r => r.content.trim()) && /*#__PURE__*/React.createElement("pre", {
    className: "mt-1.5 p-1.5 bg-slate-900 rounded text-[10px] text-green-400 overflow-x-auto whitespace-pre-wrap max-h-20 overflow-y-auto"
  }, generateFormattedExamples)), /*#__PURE__*/React.createElement("div", {
    className: "border border-slate-700 rounded-lg overflow-hidden"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowExtendedSections(!showExtendedSections),
    className: "w-full flex items-center justify-between px-2 py-1.5 bg-gradient-to-r from-purple-900/30 to-indigo-900/30 hover:from-purple-900/40 hover:to-indigo-900/40 transition-colors"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Settings2",
    size: 14,
    className: "text-purple-400"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-medium text-purple-300"
  }, t.extendedSections?.title || 'Extended Sections'), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-slate-500"
  }, "(", lang === 'cs' ? 'pokročilé' : 'advanced', ")")), /*#__PURE__*/React.createElement(Icon, {
    name: showExtendedSections ? 'ChevronUp' : 'ChevronDown',
    size: 14,
    className: "text-purple-400"
  })), showExtendedSections && (() => {
    const cfg = EXTENDED_SECTIONS_CONFIG[template] || EXTENDED_SECTIONS_CONFIG.general;
    const hasAnyOption = cfg.showTargetUrl || cfg.showAnalysisAreas || cfg.showTechnicalOutput || cfg.showPriority || cfg.showFocusAreas || cfg.showCompetitors || cfg.showDeliverables || cfg.showEmailStyle || cfg.showEmailLanguage || cfg.showTranslationStyle || cfg.showSupportTone;
    if (!hasAnyOption) {
      return /*#__PURE__*/React.createElement("div", {
        className: "p-3 bg-slate-800/50 text-center text-xs text-slate-500"
      }, lang === 'cs' ? 'Pro tuto šablonu nejsou k dispozici rozšířené možnosti.' : 'No extended options available for this template.');
    }
    const analysisOptions = cfg.analysisAreasOptions || Object.keys(t.extendedSections?.analysisAreas?.options || {});
    const techOptions = cfg.technicalOutputOptions || Object.keys(t.extendedSections?.technicalOutput?.options || {});
    const deliverOptions = cfg.deliverablesOptions || Object.keys(t.extendedSections?.deliverables?.options || {});
    return /*#__PURE__*/React.createElement("div", {
      className: "p-2 bg-slate-800/50 space-y-2"
    }, (cfg.showTargetUrl || cfg.showPriority) && /*#__PURE__*/React.createElement("div", {
      className: "flex gap-2"
    }, cfg.showTargetUrl && /*#__PURE__*/React.createElement("div", {
      className: "flex-1"
    }, /*#__PURE__*/React.createElement("input", {
      type: "url",
      value: extendedFields.targetUrl,
      onChange: e => updateExtendedField('targetUrl', e.target.value),
      placeholder: t.extendedSections?.targetUrl?.placeholder || 'https://example.com',
      className: "w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
    })), cfg.showPriority && /*#__PURE__*/React.createElement("label", {
      className: `flex items-center gap-1.5 px-2 py-1 rounded border cursor-pointer text-xs whitespace-nowrap ${extendedFields.priorityRating ? 'bg-orange-500/20 border-orange-500/50 text-orange-300' : 'bg-slate-700/50 border-slate-600 text-slate-300'}`
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: extendedFields.priorityRating,
      onChange: e => updateExtendedField('priorityRating', e.target.checked),
      className: "accent-orange-500 w-3 h-3"
    }), /*#__PURE__*/React.createElement(Icon, {
      name: "AlertTriangle",
      size: 10,
      className: "text-orange-400"
    }), lang === 'cs' ? 'Priority' : 'Priorities')), cfg.showAnalysisAreas && /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap gap-1"
    }, analysisOptions.map(key => {
      const opt = t.extendedSections?.analysisAreas?.options?.[key];
      if (!opt) return null;
      return /*#__PURE__*/React.createElement("label", {
        key: key,
        className: `flex items-center gap-1 px-1.5 py-0.5 rounded border cursor-pointer text-[10px] ${extendedFields.analysisAreas.includes(key) ? 'bg-purple-500/20 border-purple-500/50 text-purple-300' : 'bg-slate-700/50 border-slate-600 text-slate-300'}`
      }, /*#__PURE__*/React.createElement("input", {
        type: "checkbox",
        checked: extendedFields.analysisAreas.includes(key),
        onChange: () => toggleExtendedArray('analysisAreas', key),
        className: "accent-purple-500 w-2.5 h-2.5"
      }), opt.name);
    })), (cfg.showTechnicalOutput || cfg.showDeliverables) && /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap gap-1"
    }, cfg.showTechnicalOutput && techOptions.map(key => {
      const opt = t.extendedSections?.technicalOutput?.options?.[key];
      if (!opt) return null;
      return /*#__PURE__*/React.createElement("label", {
        key: key,
        className: `flex items-center gap-1 px-1.5 py-0.5 rounded border cursor-pointer text-[10px] ${extendedFields.technicalOutput.includes(key) ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300' : 'bg-slate-700/50 border-slate-600 text-slate-300'}`
      }, /*#__PURE__*/React.createElement("input", {
        type: "checkbox",
        checked: extendedFields.technicalOutput.includes(key),
        onChange: () => toggleExtendedArray('technicalOutput', key),
        className: "accent-cyan-500 w-2.5 h-2.5"
      }), opt.name);
    }), cfg.showDeliverables && deliverOptions.map(key => {
      const label = t.extendedSections?.deliverables?.options?.[key];
      if (!label) return null;
      const shortLabel = key === 'report' ? lang === 'cs' ? 'Zpráva' : 'Report' : key === 'recommendations' ? lang === 'cs' ? 'Dopor.' : 'Recs' : key === 'tech_specs' ? lang === 'cs' ? 'Spec.' : 'Specs' : 'Check';
      return /*#__PURE__*/React.createElement("label", {
        key: key,
        className: `flex items-center gap-1 px-1.5 py-0.5 rounded border cursor-pointer text-[10px] ${extendedFields.deliverables.includes(key) ? 'bg-green-500/20 border-green-500/50 text-green-300' : 'bg-slate-700/50 border-slate-600 text-slate-300'}`,
        title: label
      }, /*#__PURE__*/React.createElement("input", {
        type: "checkbox",
        checked: extendedFields.deliverables.includes(key),
        onChange: () => toggleExtendedArray('deliverables', key),
        className: "accent-green-500 w-2.5 h-2.5"
      }), shortLabel);
    })), cfg.showFocusAreas && /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-3 gap-1.5"
    }, /*#__PURE__*/React.createElement("input", {
      type: "text",
      value: extendedFields.focusPrimary,
      onChange: e => updateExtendedField('focusPrimary', e.target.value),
      placeholder: lang === 'cs' ? 'Primární...' : 'Primary...',
      className: "px-2 py-1 bg-slate-700 border border-green-700/50 rounded text-[10px] text-white placeholder-slate-500 focus:ring-1 focus:ring-green-500"
    }), /*#__PURE__*/React.createElement("input", {
      type: "text",
      value: extendedFields.focusSecondary,
      onChange: e => updateExtendedField('focusSecondary', e.target.value),
      placeholder: lang === 'cs' ? 'Sekundární...' : 'Secondary...',
      className: "px-2 py-1 bg-slate-700 border border-blue-700/50 rounded text-[10px] text-white placeholder-slate-500 focus:ring-1 focus:ring-blue-500"
    }), /*#__PURE__*/React.createElement("input", {
      type: "text",
      value: extendedFields.focusIgnore,
      onChange: e => updateExtendedField('focusIgnore', e.target.value),
      placeholder: lang === 'cs' ? 'Ignorovat...' : 'Ignore...',
      className: "px-2 py-1 bg-slate-700 border border-slate-600 rounded text-[10px] text-white placeholder-slate-500 focus:ring-1 focus:ring-slate-500"
    })), (cfg.showEmailStyle || cfg.showEmailLanguage) && /*#__PURE__*/React.createElement("div", {
      className: "flex gap-2"
    }, cfg.showEmailStyle && /*#__PURE__*/React.createElement("div", {
      className: "flex-1"
    }, /*#__PURE__*/React.createElement("select", {
      value: extendedFields.emailStyle,
      onChange: e => updateExtendedField('emailStyle', e.target.value),
      className: "w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-[10px] text-white focus:ring-1 focus:ring-pink-500"
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }, t.extendedSections?.emailStyle?.label || 'Email Style'), Object.entries(t.extendedSections?.emailStyle?.options || {}).map(([k, v]) => /*#__PURE__*/React.createElement("option", {
      key: k,
      value: k
    }, v)))), cfg.showEmailLanguage && /*#__PURE__*/React.createElement("div", {
      className: "flex-1"
    }, /*#__PURE__*/React.createElement("input", {
      type: "text",
      value: extendedFields.emailLanguage,
      onChange: e => updateExtendedField('emailLanguage', e.target.value),
      placeholder: t.extendedSections?.emailLanguage?.placeholder || 'Output language...',
      className: "w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-[10px] text-white placeholder-slate-500 focus:ring-1 focus:ring-pink-500"
    }))), cfg.showTranslationStyle && /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap gap-1"
    }, Object.entries(t.extendedSections?.translationStyle?.options || {}).map(([k, v]) => /*#__PURE__*/React.createElement("label", {
      key: k,
      className: `flex items-center gap-1 px-1.5 py-0.5 rounded border cursor-pointer text-[10px] ${extendedFields.translationStyle === k ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300' : 'bg-slate-700/50 border-slate-600 text-slate-300'}`
    }, /*#__PURE__*/React.createElement("input", {
      type: "radio",
      name: "translationStyle",
      value: k,
      checked: extendedFields.translationStyle === k,
      onChange: e => updateExtendedField('translationStyle', e.target.value),
      className: "accent-indigo-500 w-2.5 h-2.5"
    }), v.split(' /')[0]))), cfg.showSupportTone && /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap gap-1"
    }, Object.entries(t.extendedSections?.supportTone?.options || {}).map(([k, v]) => /*#__PURE__*/React.createElement("label", {
      key: k,
      className: `flex items-center gap-1 px-1.5 py-0.5 rounded border cursor-pointer text-[10px] ${extendedFields.supportTone === k ? 'bg-teal-500/20 border-teal-500/50 text-teal-300' : 'bg-slate-700/50 border-slate-600 text-slate-300'}`
    }, /*#__PURE__*/React.createElement("input", {
      type: "radio",
      name: "supportTone",
      value: k,
      checked: extendedFields.supportTone === k,
      onChange: e => updateExtendedField('supportTone', e.target.value),
      className: "accent-teal-500 w-2.5 h-2.5"
    }), v.split(' (')[0]))), cfg.showCompetitors && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between mb-1"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[10px] text-slate-400"
    }, t.extendedSections?.competitorComparison?.label || 'Competitors'), /*#__PURE__*/React.createElement("button", {
      onClick: () => updateExtendedField('competitors', [...extendedFields.competitors, '']),
      className: "flex items-center gap-0.5 px-1 py-0.5 bg-purple-500/20 border border-purple-500/30 rounded text-purple-400 text-[9px]"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "Plus",
      size: 8
    }), " ", lang === 'cs' ? 'Přidat' : 'Add')), extendedFields.competitors.length > 0 && /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap gap-1"
    }, extendedFields.competitors.map((url, idx) => /*#__PURE__*/React.createElement("div", {
      key: idx,
      className: "flex gap-1 flex-1 min-w-[150px]"
    }, /*#__PURE__*/React.createElement("input", {
      type: "url",
      value: url,
      onChange: e => {
        const nc = [...extendedFields.competitors];
        nc[idx] = e.target.value;
        updateExtendedField('competitors', nc);
      },
      placeholder: `URL ${idx + 1}`,
      className: "flex-1 px-1.5 py-0.5 bg-slate-700 border border-slate-600 rounded text-[10px] text-white placeholder-slate-500"
    }), /*#__PURE__*/React.createElement("button", {
      onClick: () => updateExtendedField('competitors', extendedFields.competitors.filter((_, i) => i !== idx)),
      className: "text-red-400 hover:text-red-300"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "X",
      size: 10
    })))))));
  })()))), /*#__PURE__*/React.createElement("div", {
    id: "methods-section",
    className: `lg:col-span-1 ${tutorialActive && tutorialSteps[tutorialStep]?.target === 'methods-section' ? 'tutorial-highlight' : ''} ${highlightedField === 'methods-section' ? 'checklist-highlight' : ''}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-sm font-medium text-slate-300"
  }, t.methods.title), /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-amber-400"
  }, selectedMethods.length > 0 && `${selectedMethods.length} ${t.methods.active}`)),

  /* Selected Methods Badges */
  selectedMethods.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-1.5 mb-3"
  }, selectedMethods.map(key => {
    const method = t.methods[key];
    if (!method) return null;
    return /*#__PURE__*/React.createElement("div", {
      key: key,
      className: "flex items-center gap-1 px-2 py-1 bg-amber-500/20 border border-amber-500/40 rounded-full text-amber-300 group"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: methodIcons[key],
      size: 12,
      className: "text-amber-400"
    }), /*#__PURE__*/React.createElement("span", {
      className: "text-xs font-medium"
    }, method.name), /*#__PURE__*/React.createElement("button", {
      onClick: () => toggleMethod(key),
      className: "ml-0.5 text-amber-400/60 hover:text-amber-300 transition-colors"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "X",
      size: 12
    })));
  })),

  /* Select Methods Button */
  /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowMethodsModal(true),
    className: "w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 rounded-lg text-amber-300 hover:border-amber-400 hover:text-amber-200 transition-all"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "FlaskConical",
    size: 18,
    className: "text-amber-400"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-medium"
  }, t.methods.selectMethods || 'Select Methods'), /*#__PURE__*/React.createElement("span", {
    className: "ml-auto text-xs text-amber-500/60"
  }, "29")),

  /* Clear All Button */
  selectedMethods.length > 0 && /*#__PURE__*/React.createElement("button", {
    onClick: () => setSelectedMethods([]),
    className: "w-full mt-2 flex items-center justify-center gap-1 px-3 py-1.5 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-400 hover:text-slate-300 hover:border-slate-600 text-xs transition-colors"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Trash2",
    size: 12
  }), t.methods.clearAll || 'Clear All'),

  /* Methods Modal */
  showMethodsModal && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4",
    onClick: e => e.target === e.currentTarget && setShowMethodsModal(false)
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-800 border border-slate-600 rounded-xl shadow-2xl w-[520px] max-h-[70vh] flex flex-col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-850 flex-shrink-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "FlaskConical",
    size: 20,
    className: "text-amber-400"
  }), /*#__PURE__*/React.createElement("h3", {
    className: "text-base font-semibold text-white"
  }, t.methods.title), /*#__PURE__*/React.createElement("span", {
    className: "text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full"
  }, selectedMethods.length, " ", t.methods.active)), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowMethodsModal(false),
    className: "flex items-center gap-1 px-3 py-1.5 bg-amber-500 text-slate-900 rounded-lg text-sm font-medium hover:bg-amber-400 transition-colors"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Check",
    size: 16
  }), t.methods.closeMethods || 'Done')),

  /* Modal Content - Categories */
  /*#__PURE__*/React.createElement("div", {
    className: "overflow-y-scroll flex-1 p-3 space-y-2",
    style: { scrollbarWidth: 'auto', scrollbarColor: '#64748b #1e293b' }
  }, Object.entries(METHOD_GROUPS).map(([groupKey, group]) => {
    const groupMethods = group.methods.filter(m => t.methods[m]);
    const selectedInGroup = groupMethods.filter(m => selectedMethods.includes(m)).length;
    const isExpanded = expandedMethodGroup === groupKey;

    return /*#__PURE__*/React.createElement("div", {
      key: groupKey,
      className: "border border-slate-700 rounded-lg overflow-hidden"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setExpandedMethodGroup(isExpanded ? null : groupKey),
      className: "w-full flex items-center justify-between px-4 py-3 bg-slate-750 hover:bg-slate-700 transition-colors"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-3"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: group.icon,
      size: 18,
      className: "text-amber-400"
    }), /*#__PURE__*/React.createElement("span", {
      className: "text-sm font-medium text-white"
    }, t.methods.groups?.[groupKey] || groupKey), /*#__PURE__*/React.createElement("span", {
      className: "text-xs text-slate-500"
    }, `(${groupMethods.length})`)), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2"
    }, selectedInGroup > 0 && /*#__PURE__*/React.createElement("span", {
      className: "text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full"
    }, selectedInGroup), /*#__PURE__*/React.createElement(Icon, {
      name: isExpanded ? "ChevronUp" : "ChevronDown",
      size: 16,
      className: "text-slate-400"
    }))),

    /* Expanded Methods List */
    isExpanded && /*#__PURE__*/React.createElement("div", {
      className: "px-3 py-2 bg-slate-800/50 border-t border-slate-700 grid grid-cols-2 gap-1.5"
    }, groupMethods.map(methodKey => {
      const method = t.methods[methodKey];
      if (!method) return null;
      const isSelected = selectedMethods.includes(methodKey);
      const isRecommended = METHOD_CATEGORIES[template]?.includes(methodKey);

      return /*#__PURE__*/React.createElement("button", {
        key: methodKey,
        onClick: () => toggleMethod(methodKey),
        className: `flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-left ${isSelected ? 'bg-amber-500/20 border-amber-500/50 text-amber-300' : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:border-slate-500'}`
      }, /*#__PURE__*/React.createElement("div", {
        className: `w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-amber-500 border-amber-500' : 'border-slate-500'}`
      }, isSelected && /*#__PURE__*/React.createElement(Icon, {
        name: "Check",
        size: 12,
        className: "text-slate-900"
      })), /*#__PURE__*/React.createElement(Icon, {
        name: methodIcons[methodKey],
        size: 14,
        className: isSelected ? 'text-amber-400' : 'text-slate-400'
      }), /*#__PURE__*/React.createElement("div", {
        className: "min-w-0 flex-1"
      }, /*#__PURE__*/React.createElement("div", {
        className: "text-xs font-medium truncate flex items-center gap-1"
      }, method.name, isRecommended && /*#__PURE__*/React.createElement("span", {
        className: "text-amber-400",
        title: t.methods.recommended
      }, "\u2605")), /*#__PURE__*/React.createElement("div", {
        className: "text-xs text-slate-500 truncate"
      }, method.citation)));
    })));
  }))))), /*#__PURE__*/React.createElement("div", {
    id: "preview-section",
    className: `lg:col-span-2 flex flex-col ${tutorialActive && tutorialSteps[tutorialStep]?.target === 'preview-section' ? 'tutorial-highlight' : ''}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-sm font-medium text-slate-300"
  }, t.preview), /*#__PURE__*/React.createElement("label", {
    className: "flex items-center gap-2 cursor-pointer"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: showColors,
    onChange: e => setShowColors(e.target.checked),
    className: "w-4 h-4 rounded border-slate-600 bg-slate-700 text-amber-500 focus:ring-amber-500/30"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-slate-400"
  }, t.checklist?.showColors))), /*#__PURE__*/React.createElement("div", {
    id: "action-buttons",
    className: `flex items-center gap-2 ${tutorialActive && tutorialSteps[tutorialStep]?.target === 'action-buttons' ? 'tutorial-highlight' : ''}`
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      copyToClipboard();
      if (tutorialActive && tutorialSteps[tutorialStep]?.id === 'actions') {
        setTimeout(() => {
          setTutorialActive(false);
          setNotification(t.tutorial?.completed?.message || 'Tutorial completed!');
          setTimeout(() => setNotification(''), 3000);
        }, 500);
      }
    },
    disabled: !formattedPrompt,
    className: `flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${formattedPrompt ? 'bg-amber-500 text-slate-900 hover:bg-amber-400' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: copied ? "Check" : "Copy",
    size: 16
  }), copied ? t.copied : t.copy), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      verifyPromptWithAI();
      if (tutorialActive && tutorialSteps[tutorialStep]?.id === 'actions') {
        setTimeout(() => {
          setTutorialActive(false);
          setNotification(t.tutorial?.completed?.message || 'Tutorial completed!');
          setTimeout(() => setNotification(''), 3000);
        }, 500);
      }
    },
    disabled: !formattedPrompt,
    className: `flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${formattedPrompt ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-500/25' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Brain",
    size: 16
  }), t.verify?.buttonShort || 'Verify', formattedPrompt && /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] bg-green-500/30 text-green-300 px-1.5 py-0.5 rounded"
  }, "FREE")))), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 bg-slate-800/50 border border-slate-700 rounded-lg p-4 overflow-auto min-h-[400px]"
  }, promptSections.length > 0 ? /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, promptSections.map((section, idx) => /*#__PURE__*/React.createElement("div", {
    key: idx,
    className: `rounded ${showColors ? `color-${section.type}` : ''}`
  }, /*#__PURE__*/React.createElement("pre", {
    className: "text-slate-200 text-sm whitespace-pre-wrap font-mono leading-relaxed"
  }, section.text)))) : /*#__PURE__*/React.createElement("div", {
    className: "h-full flex items-center justify-center text-slate-500 text-sm text-center px-4"
  }, t.placeholder)), formattedPrompt && /*#__PURE__*/React.createElement("div", {
    className: "mt-3 flex flex-wrap items-center justify-between gap-2 text-xs"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-slate-500"
  }, t.optimizedFor, " ", aiTargets.find(a => a.id === target)?.name), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowTokenInfo(true),
    className: "flex items-center gap-1.5 px-2 py-0.5 rounded-full transition-colors hover:bg-slate-700",
    style: {
      backgroundColor: `${promptScore.gradeColor}20`,
      border: `1px solid ${promptScore.gradeColor}40`
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-medium",
    style: {
      color: promptScore.gradeColor
    }
  }, promptScore.grade), /*#__PURE__*/React.createElement("span", {
    className: "text-slate-400"
  }, promptScore.score, "/100"))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowTokenInfo(true),
    className: `flex items-center gap-1.5 px-2 py-0.5 rounded transition-colors hover:bg-slate-700 ${tokenWarning === 'error' ? 'text-red-400 bg-red-500/10' : tokenWarning === 'warning' ? 'text-yellow-400 bg-yellow-500/10' : 'text-slate-400'}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Hash",
    size: 12
  }), /*#__PURE__*/React.createElement("span", null, "~", tokenCount.toLocaleString(), " tokens"), tokenWarning !== 'ok' && /*#__PURE__*/React.createElement(Icon, {
    name: tokenWarning === 'error' ? 'AlertCircle' : 'AlertTriangle',
    size: 12
  })), /*#__PURE__*/React.createElement("span", {
    className: "text-slate-500"
  }, formattedPrompt.length, " ", t.chars))))), /*#__PURE__*/React.createElement("div", {
    className: "mt-6 p-4 bg-slate-800/30 border border-slate-700/50 rounded-lg"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-500 text-center"
  }, t.footer))));
};

// Render app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(/*#__PURE__*/React.createElement(App, null));
