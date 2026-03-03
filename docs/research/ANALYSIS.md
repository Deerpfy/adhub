---
title: BetterGuard Website Redesign Analysis
version: 1.0.0
last_updated: 2026-02-28
status: current
---

# BetterGuard Website Redesign Analysis

## Executive Summary

This document provides a comprehensive analysis of the current BetterGuard website (welcome.blade.php) and outlines the proposed Apple-inspired redesign strategy. The analysis covers: current page section mapping, Apple design principles applicable to each section, SEO/GEO requirements, and the recommended new page architecture.

---

## A. Current Page Section Map

### Section Inventory (welcome.blade.php)

| # | Section ID | Lines | Content Type | Visual Weight | Current Purpose | Problems Identified |
|---|------------|-------|--------------|---------------|-----------------|---------------------|
| 1 | `#hero` | 319-410 | Hero with animated BG, logo, tagline, CTAs | High | Brand introduction, primary CTA | Good structure, but social proof badge ("Trusted by our developers") is generic and lacks specific metrics |
| 2 | `#features` | 413-540 | 6 premium feature cards (3x2 grid) | High | Showcase core value propositions | Cards are well-designed but ordering may not be optimal for conversion; "Why this matters?" badges add cognitive load |
| 3 | `#protections` | 542-784 | 18+ method cards with category tabs | High | Technical feature showcase | Too dense; all 18 methods on landing page overwhelms users; violates Apple's progressive disclosure principle |
| 4 | `#why-betterguard` | 786-870 | 4 value proposition cards + trust badges | Medium | Competitive positioning, SEO | Placement after protections is suboptimal; should be earlier for conversion |
| 5 | `#ai-threat` | 872-918 | AI threat section with research citations | Medium | Thought leadership, differentiation | Good content but lacks visual elements; text-heavy compared to Apple standards |
| 6 | `#pricing` | 920-1139 | 3-tier pricing with toggle | High | Conversion | Detailed pricing on landing page; Apple pattern defers pricing to dedicated page |
| 7 | `#how-it-works` | 1141-1202 | 3-step process cards | Medium | Simplify perceived complexity | Good but could benefit from larger step numbers and cleaner visual hierarchy |
| 8 | `#faq` | 1204-1313 | 12 FAQ cards (3-column grid) | Medium-High | Address objections, SEO | Has FAQ schema in partials/structured-data.blade.php but FAQ section itself lacks JSON-LD per-question structure; cards don't use accordion pattern |
| 9 | `#roadmap` | 1315-1355 | 4 roadmap items (4-column grid) | Medium | Build confidence in product future | Items may expose internal timelines; needs filtering for public-safe content |
| 10 | Footer | 1368-1445 | Multi-column links, copyright | Low | Navigation safety net, SEO | Current footer is functional but could be more comprehensive; sitemap coverage incomplete |
| 11 | Cookie Banner | 1447-1491 | GDPR consent | Low | Compliance | Functional, follows best practices |
| 12 | Mobile Sticky CTA | 1359-1366 | Bottom fixed CTA | High (mobile) | Mobile conversion | Good pattern |

### Current Section Order (Top to Bottom)

1. Navigation (sticky)
2. Hero (60vh+)
3. Features (6 cards)
4. Protections (18+ cards with tabs)
5. Why Developers Choose (4 cards)
6. AI Threat Section
7. Pricing (3 tiers)
8. How It Works (3 steps)
9. FAQ (12 cards)
10. Roadmap (4 items)
11. Footer
12. Cookie Banner

### Empty Space Problem

The class `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10` appears in multiple sections. The specific problem area mentioned in the task is likely the hero section's inner container which has generous padding but could use stronger visual elements or trust signals to fill the space meaningfully.

---

## B. Apple Design Principles Applicable to Each Section

### Principle Reference (from docs/apple-website/)

| Principle | Description | Application |
|-----------|-------------|-------------|
| **Progressive Disclosure** | Tease → Reveal → Detail → Action | Replace 18-method grid with category overview linking to sub-pages |
| **Product-as-Hero** | Large product imagery dominates hero | Add visual representation of obfuscated code or protection concept |
| **Emotional → Technical Gradient** | Hero emotional, deep scroll technical | Hero stays brand-focused; technical details move to sub-pages |
| **Whitespace as Signal** | 1:3 content to whitespace ratio | Increase section padding; reduce card density per row |
| **Short Declarative Headlines** | 2-5 word headlines | Review all H2s for brevity |
| **Deferred Pricing** | Price mentioned late or on dedicated page | Move detailed pricing to /pricing, keep teaser on welcome |
| **Multi-Column Footer** | 5+ organized link groups, 50+ links | Expand footer with complete sitemap coverage |
| **Sticky Section Architecture** | Sections pin during scroll | Consider for feature showcase sections |
| **Dark/Light Alternation** | Sections alternate background | Already implemented with gradient sections |

### Per-Section Apple Principle Application

| Section | Primary Applicable Principle | Recommended Change |
|---------|------------------------------|-------------------|
| Hero | Product-as-Hero, Short Headlines | Add hero visual; shorten tagline |
| Features | Whitespace, Progressive Disclosure | Reduce to 6 key cards; generous padding |
| Protections | Progressive Disclosure | Replace with 4 category cards linking to sub-pages |
| Why Developers | Emotional Positioning | Move earlier (after hero or features) |
| AI Threat | Product-as-Hero | Add large visual/illustration |
| Pricing | Deferred Pricing | Move to dedicated /pricing page; show teaser here |
| How It Works | Large Typography | Increase step number size; clean icons |
| FAQ | Structured Content | Keep but add accordion behavior; ensure JSON-LD |
| Roadmap | Progressive Disclosure | Show 2-3 highlights; move full roadmap to sub-page |
| Footer | Multi-Column Safety Net | Expand to 5+ columns with complete sitemap |

---

## C. SEO/GEO Requirements Affecting Structure

### From AI_SEARCH_LANDSCAPE.md

**Current State**: BetterGuard has **0/7 visibility** across all tested AI search queries.

**Critical Actions**:
1. Get listed on NotPrab/.NET-Obfuscator GitHub (canonical reference list)
2. Create "Best .NET Obfuscators 2026" style content
3. Build "Alternative to X" pages for competitors

### From GEO_STRATEGY.md

**Content Structure Requirements**:
- Self-contained 200-500 token chunks per section
- Statistics with source attribution (+40% visibility)
- Question-format H2/H3 headings for FAQ sections
- Authoritative third-person tone

**Schema Markup Requirements**:
- `SoftwareApplication` - already implemented
- `Organization` - already implemented
- `FAQPage` - already implemented (partial needs update)
- `BreadcrumbList` - already implemented
- Add per-page schemas for sub-pages

**Technical Requirements**:
- Allow AI crawler access (GPTBot, Google-Extended, PerplexityBot, etc.)
- Plain HTML rendering (not JavaScript-dependent)
- `Last-Modified` headers
- Semantic HTML tags

### Sitemap Requirements (from docs/business/)

Complete sitemap should include:
- Product pages (Features, Protections by category)
- Pricing page
- Documentation/Help
- Legal pages (Terms, Privacy, Cookies)
- Company/About
- Contact/Support
- Blog (future)
- Roadmap (public)

---

## D. Proposed New Page Architecture

### Multi-Page Structure (Apple Sub-Site Model)

```
/                           → welcome.blade.php (redesigned landing)
/pricing                    → pricing.blade.php (full pricing comparison)
/roadmap                    → roadmap.blade.php (visual timeline)
/methods/                   → methods category overview (optional)
/methods/code-protection    → code-flow-protection.blade.php
/methods/data-encryption    → data-encryption.blade.php
/methods/binary-hardening   → binary-hardening.blade.php
/methods/runtime-defense    → runtime-defense.blade.php
```

### Method Categories (Grouping 18+ Methods)

| Category | Methods Included | Category Page |
|----------|------------------|---------------|
| **Code Flow Protection** | Control Flow, Reference Proxy, Junk Code | /methods/code-protection |
| **Data Encryption** | Constants, Argon2, Resources | /methods/data-encryption |
| **Binary Hardening** | Renaming, Type Scrambler, Invalid Metadata, Anti-ILDasm, Packer | /methods/binary-hardening |
| **Runtime Defense** | Anti-Debug, Anti-Tamper, Anti-Dump, Memory Protection | /methods/runtime-defense |

### Welcome Page (Redesigned) Structure

1. **Navigation** - Sticky, semi-transparent, links to sub-pages
2. **Hero** - Product-focused with visual, short tagline, 2 CTAs
3. **Features** - 6 premium cards (reordered by value)
4. **Category Showcase** - 4 category cards (replacing 18 method cards)
5. **Why Developers Choose** - (moved up) Social proof, value props
6. **AI Threat Section** - With visual placeholder
7. **How It Works** - Apple-style numbered steps
8. **Pricing Teaser** - Tier names + key differentiator + CTA to /pricing
9. **Coming Soon** - 2-3 roadmap highlights + link to /roadmap
10. **FAQ** - With accordion behavior and JSON-LD
11. **Pre-Footer Sitemap** - Organized link columns
12. **Footer** - Compact copyright, legal, social

### Shared Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `footer.blade.php` | components/ | Reusable across all pages |
| `navigation.blade.php` | layouts/ | Already exists, update for sub-pages |
| `seo-meta.blade.php` | partials/ | Per-page meta, already parameterized |
| `structured-data.blade.php` | partials/ | Per-page schema extension needed |

---

## E. Recommended Section Ordering (Conversion + SEO)

### Optimal Order Based on Apple Principles + Conversion Research

| Position | Section | Rationale |
|----------|---------|-----------|
| 1 | Navigation | Entry point, persistent |
| 2 | Hero | Brand impression, primary CTA |
| 3 | Why Developers Choose | Social proof early increases trust; E-E-A-T signals |
| 4 | Features (6 cards) | Value proposition after trust established |
| 5 | Category Showcase | Progressive disclosure; tease depth without overwhelming |
| 6 | AI Threat | Differentiation, thought leadership |
| 7 | How It Works | Reduce perceived complexity before pricing |
| 8 | Pricing Teaser | Conversion point with clear CTA |
| 9 | Coming Soon | Build confidence in product future |
| 10 | FAQ | Address remaining objections; SEO value |
| 11 | Pre-Footer Sitemap | Crawlable internal links; SEO |
| 12 | Footer | Legal, copyright, compact |

### Feature Card Value Ranking (for reordering)

Based on PRICING_STRATEGY.md feature-value analysis and competitive differentiation:

| Rank | Feature | Rationale |
|------|---------|-----------|
| 1 | **Argon2 Encryption** | Unique differentiator; no competitor has this |
| 2 | **Control Flow Obfuscation** | Highest-impact protection; core value |
| 3 | **Packer** | Enterprise-tier exclusive; strong protection |
| 4 | **Anti-Tamper Protection** | High perceived value; runtime security |
| 5 | **Cloud Platform** | Convenience differentiator; SaaS model |
| 6 | **Easy to Use** | Reduces friction; appeals to indie developers |

Current order: Advanced Protection, Easy to Use, Fast Obfuscation, Packer, Argon2 Encryption, Cloud Platform

**Recommended order**: Argon2 Encryption, Control Flow (Advanced Protection), Packer, Anti-Tamper (merge with existing), Cloud Platform, Easy to Use

---

## F. Pricing Display Rules

From PRICING_STRATEGY.md:

### Prices to Display

| Tier | Monthly | Annual | Annual Savings |
|------|---------|--------|----------------|
| Basic | $19/mo | $179/yr ($14.92/mo) | Save 21% |
| Pro | $49/mo | $469/yr ($39.08/mo) | Save 20% |
| Enterprise | $79/mo | $749/yr ($62.42/mo) | Save 21% |

### Features per Tier

| Tier | Protections | SaaS Jobs/mo | Key Differentiator |
|------|-------------|--------------|-------------------|
| Basic | 6 (Normal) | 10 | Essential protection for indie devs |
| Pro | 11 (Aggressive) | 50 | Professional security for teams |
| Enterprise | All 18+ (Maximum) | Unlimited | Maximum protection for organizations |

### Perpetual Licenses (for /pricing page)

| Tier | Price | Updates Included |
|------|-------|------------------|
| Basic | $299 | 2 years |
| Pro | $599 | 2 years |
| Enterprise | $799 | 2 years |

---

## G. Roadmap Items - Public vs Internal

### Safe for Public Display

| Item | Quarter | Description |
|------|---------|-------------|
| BetterManager Agents | Q2 2026 | Server-side obfuscation for CI/CD |
| Custom Integrity Signing | Q2 2026 | BG-Sign technology |
| V1 Public Launch | Q3 2026 | Stable release with new GUI |
| Code Virtualization | Q4 2026 | Advanced protection research |

### Keep Internal (Do Not Publish)

- Specific AV detection rate targets
- Internal team size and resource allocation
- Competitor pricing comparison details
- Revenue projections and financial metrics
- Risk register and mitigation strategies
- Model routing and agent team configurations
- Specific implementation details for protections

---

## H. Footer Architecture Design

### Apple-Style Footer Structure

```
[Pre-Footer Sitemap Section]
┌─────────────────────────────────────────────────────────────┐
│ Product          │ Protection       │ Resources       │ Company           │
│ ─────────────    │ ─────────────    │ ─────────────   │ ─────────────     │
│ Features         │ Code Protection  │ Documentation   │ About Us          │
│ Pricing          │ Data Encryption  │ FAQ             │ Contact           │
│ How It Works     │ Binary Hardening │ Roadmap         │ Support           │
│ Why BetterGuard  │ Runtime Defense  │ Blog (future)   │ Status            │
└─────────────────────────────────────────────────────────────┘

[Compact Footer]
┌─────────────────────────────────────────────────────────────┐
│ © 2024-2026 SZEINER s.r.o. | Terms | Privacy | Cookies      │
│                                              [Social Icons] │
└─────────────────────────────────────────────────────────────┘
```

### Footer Link Categories

1. **Product**: Features, Pricing, How It Works, Why BetterGuard
2. **Protection Methods**: Code Protection, Data Encryption, Binary Hardening, Runtime Defense
3. **Resources**: Documentation, FAQ, Roadmap, Blog
4. **Company**: About, Contact, Support, Status
5. **Legal**: Terms of Service, Privacy Policy, Cookie Policy

---

## I. Implementation Checklist

### Phase 1: Analysis (COMPLETE)
- [x] Read Apple design documentation
- [x] Map current welcome.blade.php sections
- [x] Read strategy documents (pricing, roadmap, SEO)
- [x] Output consolidated analysis

### Phase 2: Architecture Design
- [ ] Create footer Blade component
- [ ] Design navigation updates for sub-pages
- [ ] Define route structure for new pages
- [ ] Create layout extension pattern

### Phase 3: Welcome Page Redesign
- [ ] Reorder feature cards by value ranking
- [ ] Replace 18+ method section with category cards
- [ ] Move "Why Developers Choose" section up
- [ ] Add visual placeholder to AI Threat section
- [ ] Replace pricing section with teaser
- [ ] Redesign How It Works with Apple styling
- [ ] Add accordion to FAQ section
- [ ] Replace roadmap section with highlights
- [ ] Implement pre-footer sitemap section
- [ ] Extract and implement footer component

### Phase 4: Sub-Page Creation
- [ ] Create pricing.blade.php
- [ ] Create roadmap.blade.php
- [ ] Create method category pages (4)
- [ ] Register routes with middleware
- [ ] Add per-page SEO meta and schema

### Phase 5: SEO/GEO Audit
- [ ] Verify heading hierarchy per page
- [ ] Add/update meta titles and descriptions
- [ ] Verify schema markup
- [ ] Test internal linking structure
- [ ] Verify AI crawler access in robots.txt

---

## J. Pass/Fail Verification Criteria

### PASS Conditions
- [ ] Phase 1 analysis document exists (this file)
- [ ] Every section from original welcome.blade.php accounted for
- [ ] All new .blade.php files extend correct layout with middleware
- [ ] Footer appears as shared Blade component
- [ ] All prices match PRICING_STRATEGY.md exactly
- [ ] No internal/confidential roadmap items on public pages
- [ ] FAQ section includes valid JSON-LD FAQPage
- [ ] Every page has proper H1, meta title, meta description
- [ ] All internal links use Laravel route() or url() helpers
- [ ] Feature cards reordered with value ranking justification
- [ ] 18+ methods section replaced with category overview
- [ ] Sitemap coverage in footer matches business docs
- [ ] No new CSS framework or JS library introduced

### FAIL Conditions
- [ ] Code written before Phase 1 analysis complete
- [ ] Any .blade.php file lacks middleware when welcome/dashboard have it
- [ ] Pricing displayed that doesn't exist in PRICING_STRATEGY.md
- [ ] Apple assets/logos/brand elements copied into BetterGuard
- [ ] Existing functionality removed without relocation
- [ ] Hardcoded URLs instead of Laravel route helpers
