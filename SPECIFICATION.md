

# Project Specification: Painless EBM AI Tutor

**Version:** 3.1.0 (Master Architecture, Trial Protocol & Testing Specification)  
**Target Audience:** Medical Students, Residents, and Clinical Fellows  
**Pedagogical Knowledge Base:** 9-Domain Clinical Research Framework (*How to Read a Paper* paradigm + Dans *Painless EBM* Rigor)  
**Deployment Target:** Vercel (Frontend PWA) + Supabase (Database, Storage & Edge Gateway)

---

## 1. Executive Summary & Core Purpose

The **Painless EBM AI Tutor** is an interactive, Socratic educational web platform designed to train medical trainees to systematically appraise clinical research across **nine distinct genres of medical publications**.

Rather than passively summarizing papers or applying a generic drug trial checklist to non-trial literature, the platform acts as an **attending clinical epidemiology tutor on rounds**:
- **Adaptive Quality Frameworks:** Automatically selects the appropriate international quality standard (CONSORT, MRC, STARD, PRISMA, AGREE II, CHEERS, CASP, CROSS, or SQUIRE 2.0) based on the paper's genre.
- **Socratic Intake & Classification Debate:** If a trainee selects a category different from the AI's inference, the AI engages in a Socratic debate requiring the trainee to defend their classification using clinical reasoning.
- **Dual-Reference Left Pane:** Allows students to flip between the **PDF paper** and the **Appraisal Framework Checklist** (acting as a built-in EBM Tackle Box).
- **Grounded Evidence Citation:** Verbatim quotations from the paper linked to interactive jump buttons (`[📍 Jump to Page X]`) that automatically navigate the PDF canvas.
- **60/40 Responsive Architecture:** Seamless split-screen workbench on desktop; context-aware auto-switching with thumb-zone inputs on mobile.
- **EBM Coin Economy & Quota Throttling:** 50 starter coins, 2 coins per chat turn, and a 50-coin upload fee that serves as a freemium monetization paywall.
- **Research Trial Ready:** Built-in protocol protection with 0-coin defaults to eliminate the "incognito bypass" in randomized educational trials.

---

## 2. Pedagogical Engine: The 9 Research Categories

When an article is selected or uploaded, the system enforces the specific sequential appraisal framework for that genre:

| # | Research Category | International Quality Standard | Socratic Focus Areas |
| :---: | :--- | :--- | :--- |
| **1** | **Drug Trials & Simple Interventions** | **CONSORT / Dans** | Randomization sequence, allocation concealment, baseline similarity, triple blinding, ITT, drop-out sensitivity, ARR/NNT. |
| **2** | **Complex Interventions** | **MRC Framework** | Theoretical mechanisms, implementation fidelity, contextual tailoring, non-linear effects, process evaluations. |
| **3** | **Diagnostic & Screening Tests** | **STARD / QUADAS-2** | Reference standard validity, independent verification, spectrum bias, sensitivity/specificity, likelihood ratios, post-test probability. |
| **4** | **Systematic Reviews & Meta-Analyses** | **PRISMA / AMSTAR-2** | Sensible question, exhaustive search (publication bias), primary study appraisal, heterogeneity ($\chi^2, I^2$), forest plot interpretation. |
| **5** | **Papers That Tell You What to Do (Guidelines)** | **AGREE II** | Scope and clinical purpose, stakeholder/patient involvement, systematic evidence synthesis, explicit link to recommendations, COI. |
| **6** | **Papers That Tell You What Things Cost (Economic Analyses)** | **CHEERS Checklist** | Perspective (societal vs. health system), competing comparators, time horizon/discounting, incremental cost-effectiveness ratio (ICER), sensitivity models. |
| **7** | **Papers That Go Beyond Numbers (Qualitative Research)** | **CASP / COREQ** | Qualitative design rationale, theoretical framework, researcher reflexivity (bias), purposive sampling, data saturation, thematic coding. |
| **8** | **Questionnaire & Survey Research** | **CROSS / CHERRIES** | Construct validity, item generation/piloting, reliability (Cronbach's $\alpha$), response rate thresholds, non-response/selection bias. |
| **9** | **Quality Improvement (QI) Case Studies** | **SQUIRE 2.0** | Local healthcare context, problem rationale, operational measures over time (SPC/run charts), iterative PDSA test cycles, sustainability. |

---

## 3. Data Structure: Expert-Critiqued Exemplar (Working Placeholder)

The database holds curated landmark papers with expert critiques under `practice_library.expert_annotated_critique` (`jsonb`). 

> **Developer Note on Schema Evolution:**  
> This JSON structure is a **working placeholder (v0.1-draft)**. It is structured as an extensible dictionary to support ongoing curation across all 9 domains without breaking database migrations:

```json
{
  "$schema_draft": "v0.1-placeholder",
  "category_id": 1,
  "category_name": "Drug treatments and simple interventions",
  "framework_used": "CONSORT / Dans Therapy Framework",
  "overall_expert_verdict": "Valid with minor caveats",
  "pedagogical_pearls": [
    "Look out for surrogate outcome substitution in Table 2.",
    "Do not confuse computer sequence generation with allocation concealment."
  ],
  "steps": [
    {
      "step_index": 1,
      "criterion_key": "randomization",
      "criterion_title": "Random Sequence Generation",
      "expert_verdict": "Adequate / Low Risk",
      "expert_commentary": "Computer-generated central sequence used with variable block sizes.",
      "cited_evidence": {
        "page": 3,
        "section": "Methods - Randomisation",
        "quote": "Random sequence was generated off-site using block sizes of 4 and 6."
      },
      "common_student_pitfalls": [
        "Confusing sequence generation with physical allocation concealment."
      ]
    }
  ],
  "custom_metadata": {}
}


[ Start Application ]
                         │
        ┌────────────────┴────────────────┐
        ▼                                 ▼
[ Practice Library ]              [ Upload Custom PDF ]
(Free / 0 Coins)                  (Deducts 50 Coins)
        │                                 │
        │                                 ▼
        │                    [ AI Pre-Scans PDF ]
        │                    Infers primary category (1 to 9)
        │                                 │
        │                                 ▼
        │                 [ Category Selection Screen ]
        │                 Displays 9 category options.
        │                 AI's recommendation highlighted.
        │                                 │
        │                 ┌───────────────┴───────────────┐
        │                 ▼                               ▼
        │         [ Student Agrees ]             [ Student Disagrees ]
        │         Taps recommended.              Taps different category.
        │                 │                               │
        │                 │                               ▼
        │                 │                    [ Socratic Debate Mode ]
        │                 │                    AI: "Why do you think it is X
        │                 │                         instead of Y?"
        │                 │                               │
        │                 │                    Student inputs rationale
        │                 │                               │
        │                 │              ┌────────────────┴────────────────┐
        │                 │              ▼                                 ▼
        │                 │      [ Student Persuades AI ]       [ AI Clarifies Misconception ]
        │                 │      AI: "Great catch! Let's        AI: "Here is why that's a
        │                 │           use Framework X."              trap... Do you agree?"
        │                 │              │                                 │
        └─────────────────┬──────────────┴─────────────────────────────────┘
                          ▼
             [ Lock in Framework 1 to 9 ]
             Sequential Socratic Dialogue Begins (Step 1)



The Primary Anchor Rule for Hybrid Papers
If a study combines multiple genres (e.g., an RCT with an embedded cost-effectiveness model in Table 4), multi-category status is not assumed by default. The AI prompts the trainee to choose a single primary lens:
"This trial contains an embedded Cost-Effectiveness Model (Category 6) alongside the primary Randomized Trial (Category 1). Which lens are you presenting at Journal Club today: clinical efficacy (CONSORT) or economic evaluation (CHEERS)?"
5. UI Architecture: Optimized for 60% Mobile / 40% Desktop
5.1 Desktop Experience (40% of Users) — Split-Screen Workbench
Left Pane (55–60%): Dual-Tab Container:
[ 📄 Paper ] Tab: Full Mozilla PDF.js canvas with page navigation, zoom, and text-highlight layer.
[ 📋 Framework ] Tab: Interactive checklist showing the active quality framework (e.g., SQUIRE 2.0), definitions, "what to look for" cheat sheets, and live step progress (✓ Completed, ▶ In Progress, ○ Pending).
Right Pane (40–45%): Socratic Chat interface with model telemetry badge, message stream, quick-action pills, and justification input bar.
5.2 Mobile Experience (60% of Users) — Context-Aware Switcher
Single Full-Width View: Phone displays 100% width edge-to-edge view with a sticky bottom navigation bar: [ 📄 Paper ], [ 📋 Framework ], [ 💬 Tutor (Badge) ].
Context-Aware Auto-Switching: Tapping [📍 View Evidence: Page X] inside the Chat automatically flips to the [📄 Paper] tab, scrolls to Page 3, and highlights the sentence.
Floating Quick-Return: A floating button appears on the mobile PDF pane: [ 💬 Return to Tutor (Step 2) ➔ ], taking the student straight back to the chat with the keyboard open.
Dynamic Fit-to-Width PDF Scaling: PDF scale automatically calculates as (window.innerWidth - 20) / viewport.width so 2-column medical articles never clip horizontally.
Keyboard Collisions Guard: Meta tag configured with interactive-widget=resizes-content to prevent the software keyboard from pushing navigation off-screen.
6. Token Economy: "EBM Coins" & Monetization Strategy
To protect free cloud API quotas and establish a sustainable monetization model:
6.1 Coin Rules
Starting Balance: Every user begins with 50 EBM Coins.
Chat Turns: Deducts 2 Coins per message sent to the AI tutor.
Custom PDF Upload: Deducts 50 Coins upfront.
Practice Library Entry: 0 Coins (Completely Free) to allow frictionless onboarding.
6.2 The Monetization Conversion Funnel
Showrooming: Students freely explore the Practice Library using their 50 starter coins (~25 chat messages). They experience the attending-level Socratic coaching with grounded snippets.
The High-Urgency Gate: When preparing for a real hospital Journal Club, the resident uploads their own paper. The upload burns the 50 starter coins.
The Micro-Transaction: The resident is prompted to top up their wallet to complete the critique ($1.99 for 50 coins, $4.99 for 150 coins, $12.99 for 500 coins).
6.3 Safeguards & Fallbacks
Auto-Refund on Parse Failures: If a scanned PDF cannot be parsed by OCR, the 50 coins are immediately refunded.
Session Re-Entry: A user is never charged 50 coins twice for the same paper; re-opening an active session only consumes the standard 2 coins per chat turn.
Formatted Abstract Fallback (<40% Threshold): If an uploaded paper has 
<
40
%
<40%
 empirical data (e.g., an editorial or narrative piece), it is not excluded. Instead, it renders an Enhanced Clinical Review Card with full abstract typography and key takeaways so the student receives tangible value for their coins.
7. Research Trial Protocol & Contamination Defense
To evaluate educational efficacy via an RCT (Group A: App vs. Group B: Textbook + PDFs):
7.1 Solution 1: Defense Against the "Incognito Hack"
The Vulnerability: If new/guest browsers automatically receive 50 coins, a Group B student could open an Incognito tab, receive 50 guest coins, and use the AI tutor.
The Absolute Defense (Solution 1):
Default the wallet balance for all new/unrecognized devices to 0 Coins.
Only participant records explicitly pre-seeded for Group A (STUDENT-A01 to A20) receive 50 coins.
If a Group B student opens Incognito: The backend detects an unknown device and assigns 0 Coins.
If they enter their code (STUDENT-B01): Their balance is 0 Coins, and "Buy Coins" is hidden.
Link sharing and incognito circumvention are completely neutralized with zero code bloat.
7.2 The Friday Crossover
On Friday at 5:00 PM (following the in-person paper critique exam), a single SQL query in Supabase credits Group B participants with 50 coins, granting them full post-trial access.
8. AI Model Orchestration & Multi-Tier Fallback
To prevent rate-limit interruptions, the ebm-tutor edge function implements a 3-tier cascade:
Primary Model: gemini-3.5-flash-lite (fastest, lowest latency).
Secondary Model: gemini-3.5-flash (triggered automatically if Lite returns HTTP 429 Quota Exceeded).
Tertiary Fallback: Pollinations.ai (keyless fallback if Google API quota is exhausted).
Active Model Telemetry: Every tutor response outputs a model_used parameter displayed in the chat header and on message bubbles.
9. Testing & Quality Assurance Protocol
To protect trial data integrity and maintain application stability, testing is categorized across backend and frontend tiers:
9.1 Backend Testing (Deno Native Test Runner)
Unit Tests:
LLM Fallback Cascade: Simulates HTTP 429 errors from primary Gemini models to verify seamless failover to secondary models and Pollinations.
Clinical Completeness Score: Evaluates mock JSON data sets to ensure empirical RCTs pass 
≥
40
%
≥40%
 while sparse reviews/editorials trigger the fallback reader card.
JSON Sanitizer: Validates markdown fence stripping (cleanJsonString()).
Keyword Profiling: Verifies stop-word removal and relevance scoring (computeRelevanceScore()).
Integration Tests:
Atomic Coin Deductions: Tests concurrent execution of the deduct_coins stored procedure ensuring balances never drop below zero.
Incognito Defense: Verifies that unrecognized device IDs default to 0 Coins.
Database Caching: Confirms sub-100ms response times for previously generated PMIDs.
9.2 Frontend Testing (Browser-based PWA Validation)
Unit & State Machine Tests:
Sequential Pacing: Verifies that students cannot bypass steps in the appraisal state machine.
Stance Pill Pre-filling: Confirms quick-action pills properly format input strings.
Integration / E2E Smoke Tests:
PDF.js Evidence Jump: Verifies page navigation and text-layer coordinate matching when clicking citation buttons.
Responsive Layouts: Confirms Bulma breakpoints switch between desktop split-pane and mobile tab switcher.

10. Detailed Coding Milestones & Checkpoints
[Milestone 1: Core Foundation & Split-Screen UX] ───────────► COMPLETED ✅
[Milestone 2: 9-Category Engine & Socratic Debate] ────────► CURRENT FOCUS 🟡
[Milestone 3: EBM Coin Economy & Wallet Mechanics] ────────► UPCOMING ⚪
[Milestone 4: Mobile Adaptive UX & Framework Tab] ─────────► UPCOMING ⚪
[Milestone 5: Research Trial Gating & Study Analytics] ────► UPCOMING ⚪
[Milestone 6: Automated Testing Suite Implementation] ─────► UPCOMING ⚪

Milestone 1: Core Foundation & Split-Screen UX (Status: Complete ✅)

Vanilla JS + Bulma CSS PWA architecture deployed on Vercel.

Mozilla PDF.js canvas with text-layer rendering and zoom/page controls.

Supabase PostgreSQL database schema and study-papers storage bucket.

Multi-tier AI fallback engine (gemini-3.5-flash-lite 
→
→
 gemini-3.5-flash 
→
→
 Pollinations.ai).

Active model telemetry badge displayed in chat interface.

Local PDF drag-and-drop / file upload loader.
Milestone 2: 9-Category Engine & Socratic Debate (Status: Current Focus 🟡)

Checkpoint 2.1: 9-Category Practice Library UI:
Update the Practice Library modal with category filtering tabs for all 9 domains (Drug Trials, Complex Interventions, Diagnostic Tests, Systematic Reviews, Guidelines, Economic Analyses, Qualitative Research, Questionnaire Research, Quality Improvement).

Checkpoint 2.2: Socratic Classification Intake:
Implement the post-upload AI pre-scan that infers paper category and displays the 9-button selection grid with the AI recommendation highlighted.

Checkpoint 2.3: Classification Debate Loop:
Add Socratic negotiation logic in ebm-tutor: if the student selects an alternative category, the AI asks for justification and either accepts persuasive clinical reasoning or clarifies misconceptions.

Checkpoint 2.4: Seed Exemplars with Draft JSON:
Seed initial practice library records with the working placeholder JSON schema across Categories 1, 2, 3, 5, and 9.
Milestone 3: EBM Coin Economy & Wallet Mechanics (Status: Upcoming ⚪)

Checkpoint 3.1: Wallet Table & RPC Functions:
Deploy user_wallets table in Supabase with atomic deduct_coins stored procedure.

Checkpoint 3.2: 0-Coin Default (Solution 1 Anti-Hack):
Set default balance for unknown/guest devices to 0 coins; seed 50 coins exclusively into Group A participant accounts.

Checkpoint 3.3: Edge Function Coin Gates:
Add 2-coin deduction check to chat_turn and 50-coin deduction check to deduct_coins_for_upload.

Checkpoint 3.4: Coin UI & Buy Modal Placeholder:
Add real-time coin balance badge in the navbar, upload fee confirmation alert, and placeholder Stripe top-up modal ($1.99 / $4.99 / $12.99).

Checkpoint 3.5: Failed Upload Auto-Refund:
Ensure unreadable PDFs or API errors trigger an automatic 50-coin wallet refund.
Milestone 4: Mobile Adaptive UX & Framework Tab (Status: Upcoming ⚪)

Checkpoint 4.1: Left Pane Framework Tab:
Add Bulma .tabs on left pane ([📄 Paper] and [📋 Framework]).

Checkpoint 4.2: Dynamic Checklist Viewer:
Build the interactive checklist renderer displaying the active framework questions with live step indicators (✓ Completed, ▶ In Progress, ○ Pending).

Checkpoint 4.3: Mobile Context Switcher:
Implement responsive 100% full-width view on screens 
≤
768
p
x
≤768px
 with sticky bottom navigation tabs.

Checkpoint 4.4: Context-Aware Auto-Slide & Return:
Tapping [📍 View Evidence: Page X] auto-flips from Chat tab to Paper tab; floating button on Paper tab returns student to active question.

Checkpoint 4.5: Dynamic Fit-to-Width PDF Scaling:
Ensure mobile PDF canvas renders at (window.innerWidth - 20) / viewport.width.

Checkpoint 4.6: Formatted Abstract Fallback:
Render papers with 
<
40
%
<40%
 empirical data as formatted Clinical Review Cards with full abstract typography and takeaways.
Milestone 5: Research Trial Gating & Study Analytics (Status: Upcoming ⚪)

Checkpoint 5.1: Participant Code Gate:
Activate participant login gate (STUDENT-A... / STUDENT-B...) prior to trial launch.

Checkpoint 5.2: Telemetry Logger:
Record timestamps per step, hint clicks, and message counts in user_interactions.

Checkpoint 5.3: Crossover Activation Script:
Prepare automated SQL script to credit Group B with 50 coins upon trial conclusion on Friday.

Checkpoint 5.4: Analytics CSV Export:
Provide administrative query to export session transcripts, student scores, and durations for statistical analysis.
Milestone 6: Automated Testing Suite Implementation (Status: Upcoming ⚪)

Checkpoint 6.1: Native Deno Test Setup:
Create supabase/functions/ebm-tutor/ebm_tutor_test.ts to test fallback cascades, JSON sanitizers, and completeness scoring.

Checkpoint 6.2: Frontend Test Runner (tests/runner.html):
Create browser-executable test suite verifying state machine transitions and pill inputs.
11. Developer Rules of Engagement
Zero Heavy Build Steps: Maintain pure HTML5, Vanilla JavaScript (ES6+), and CDN-linked CSS. Never introduce Node/npm bundlers (Webpack, Vite) into the frontend repository.
Schema Extensibility: Treat expert_annotated_critique as an evolving JSON dictionary. Never write hardcoded database constraints that depend on a rigid critique schema during this iterative development phase.
Strict Secret Hygiene: GEMINI_API_KEY and SUPABASE_SERVICE_ROLE_KEY reside strictly inside Supabase Edge Function Secrets. Client files only consume the public anon key.
Thumb-Zone Accessibility: On mobile screens (
≤
768
p
x), all interactive controls and quick pills must have a minimum touch target of 
44
×
44
44×44
 pixels and sit within the lower 30% of the viewport.




 painless-ebm-tutor/
├── .env                  <-- Local environment variables (git-ignored, never pushed to GitHub)
├── .gitignore            <-- Ignores .env, .DS_Store, node_modules, etc.
├── SPECIFICATION.md      <-- Master system specification & research protocol document
├── vercel.json           <-- Vercel static routing & CORS header configuration
├── manifest.json         <-- PWA configuration (app name, theme colors, icons)
├── sw.js                 <-- PWA Service Worker for offline/cached asset loading
├── index.html            <-- Main application UI (Bulma CSS split-screen layout & modals)
├── api/
│   └── config.js         <-- Vercel Serverless function that delivers env keys securely to the browser
├── css/
│   └── style.css         <-- Custom dark clinical styling, chat bubbles, and mobile overrides
├── js/
│   ├── config.js         <-- Initializes Supabase client using dynamic /api/config response
│   ├── pdf-viewer.js     <-- Mozilla PDF.js controller (canvas rendering, zoom, and quote highlighting)
│   └── app.js            <-- Core application logic (Wallet economy, Socratic engine, tabs, and library)
└── tests/
    ├── runner.html       <-- Browser test runner page powered by QUnit CDN
    └── test-state-machine.js <-- Unit & integration tests for frontend state, pills, and device IDs