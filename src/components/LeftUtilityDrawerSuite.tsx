import { useMemo, useState } from 'react';
import {
  Activity,
  Bot,
  Boxes,
  Brain,
  Bug,
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  Cloud,
  Code2,
  Cpu,
  Database,
  FileArchive,
  FileCode2,
  FileText,
  FolderGit2,
  Gauge,
  GitBranch,
  GitCompare,
  Globe,
  History,
  Image as ImageIcon,
  KeyRound,
  Layers,
  LayoutGrid,
  Lock,
  Mic,
  MicOff,
  MonitorSmartphone,
  Network,
  Palette,
  Paperclip,
  Play,
  Rocket,
  Scale,
  Search,
  Server,
  Share2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Smartphone,
  Sparkles,
  Terminal,
  Upload,
  Wand2,
  Webhook,
  Workflow,
  Wrench,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { DevPlatformSubTab } from './DeveloperPlatformWorkspace';
import type { StudioModuleId } from './StudioModuleWorkspace';

export type DrawerExecutionIntent = 'auto' | 'app' | 'video' | 'image' | 'audio' | 'analyze';
export type DrawerActiveModal =
  | 'knowledge'
  | 'history'
  | 'github'
  | 'timeline'
  | 'share'
  | 'analytics'
  | null;
export type DrawerThemePreset = 'neon_dark' | 'midnight_blue' | 'minimal_mono' | 'solar_light';
export type DrawerPersona = 'architect' | 'developer' | 'designer' | 'strategist' | 'writer';

interface UtilityRowItem {
  id: string;
  label: string;
  description: string;
  badge: 'Tool' | 'Open' | 'Active';
  icon: LucideIcon;
  iconColor: string;
  devSubTab?: DevPlatformSubTab;
  modal?: Exclude<DrawerActiveModal, null>;
  customAction?: () => void;
  keywords?: string;
}

interface LeftUtilityDrawerSuiteProps {
  isOpen: boolean;
  onClose: () => void;
  isTyping: boolean;
  isListening: boolean;
  activeDevSubTab: DevPlatformSubTab;
  activeStudioModule: StudioModuleId;
  webSearchEnabled: boolean;
  setWebSearchEnabled: (val: boolean) => void;
  webScrapeUrl: string;
  setWebScrapeUrl: (val: string) => void;
  projectContextEnabled: boolean;
  setProjectContextEnabled: (val: boolean) => void;
  projectContextTarget: string;
  setProjectContextTarget: (val: string) => void;
  projectContextRepoUrl: string;
  setProjectContextRepoUrl: (val: string) => void;
  dualModelCompareEnabled: boolean;
  setDualModelCompareEnabled: (val: boolean) => void;
  selectedPersona: DrawerPersona;
  setSelectedPersona: (val: DrawerPersona) => void;
  intent: DrawerExecutionIntent;
  setIntent: (val: DrawerExecutionIntent) => void;
  selectedModel: string;
  setSelectedModel: (val: string) => void;
  themePreset: DrawerThemePreset;
  onApplyThemePreset: (preset: DrawerThemePreset) => void;
  onTriggerPhotoUpload: () => void;
  onTriggerFileUpload: () => void;
  onTriggerCameraCapture: () => void;
  onToggleVoiceInput: () => void;
  onTriggerInstantVoiceToCode: () => void;
  onOpenDevTool: (subTab: DevPlatformSubTab, label: string) => void;
  onOpenModal: (modal: Exclude<DrawerActiveModal, null>) => void;
  onNotice: (msg: string) => void;
}

type CategoryId = 'core_ai' | 'dev_ide' | 'platform_infra';

export function LeftUtilityDrawerSuite({
  isOpen,
  onClose,
  isTyping,
  isListening,
  activeDevSubTab,
  activeStudioModule,
  webSearchEnabled,
  setWebSearchEnabled,
  webScrapeUrl,
  setWebScrapeUrl,
  projectContextEnabled,
  setProjectContextEnabled,
  projectContextTarget,
  setProjectContextTarget,
  projectContextRepoUrl,
  setProjectContextRepoUrl,
  dualModelCompareEnabled,
  setDualModelCompareEnabled,
  selectedPersona,
  setSelectedPersona,
  intent,
  setIntent,
  selectedModel,
  setSelectedModel,
  themePreset,
  onApplyThemePreset,
  onTriggerPhotoUpload,
  onTriggerFileUpload,
  onTriggerCameraCapture,
  onToggleVoiceInput,
  onTriggerInstantVoiceToCode,
  onOpenDevTool,
  onOpenModal,
  onNotice,
}: LeftUtilityDrawerSuiteProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<CategoryId, boolean>>({
    core_ai: true,
    dev_ide: true,
    platform_infra: true,
  });

  const toggleSection = (id: CategoryId) => {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const coreAiItems: UtilityRowItem[] = useMemo(
    () => [
      {
        id: 'token_memory_optimizer',
        label: 'Token Memory & Context Window Optimizer',
        description: 'Rolling memory buffers & smart token trimming for long conversations',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'token_memory_optimizer'
            ? 'Active'
            : 'Tool',
        icon: Brain,
        iconColor: 'text-amber-400',
        devSubTab: 'token_memory_optimizer',
      },
      {
        id: 'multimodal_stream_engine',
        label: 'Real-Time Multi-Modal Streaming Engine',
        description: 'Zero-latency token-by-token streaming for text, code, and media',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'multimodal_stream_engine'
            ? 'Active'
            : 'Tool',
        icon: Zap,
        iconColor: 'text-emerald-400',
        devSubTab: 'multimodal_stream_engine',
      },
      {
        id: 'agentic_task_chaining',
        label: 'Agentic Task Chaining & Sub-Agent DAG',
        description: 'Decompose complex engineering prompts into parallel sub-agent pipelines',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'agentic_task_chaining'
            ? 'Active'
            : 'Tool',
        icon: Workflow,
        iconColor: 'text-cyan-400',
        devSubTab: 'agentic_task_chaining',
      },
      {
        id: 'dynamic_function_calling',
        label: 'Dynamic Function Calling & Tool Executor',
        description: 'Native tool-use layer for autonomous API, web, and DB execution',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'dynamic_function_calling'
            ? 'Active'
            : 'Tool',
        icon: Wrench,
        iconColor: 'text-indigo-400',
        devSubTab: 'dynamic_function_calling',
      },
      {
        id: 'self_correction_loop',
        label: 'Self-Correction & Auto-Debugging Loop',
        description: 'Autonomous test, lint, and self-healing code verification cycle',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'self_correction_loop'
            ? 'Active'
            : 'Tool',
        icon: Bug,
        iconColor: 'text-rose-400',
        devSubTab: 'self_correction_loop',
      },
      {
        id: 'codebase_rag_engine',
        label: 'Codebase RAG & Vector Semantic Search',
        description: 'High-speed local repository embeddings for deep contextual awareness',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'codebase_rag_engine'
            ? 'Active'
            : 'Tool',
        icon: Database,
        iconColor: 'text-sky-400',
        devSubTab: 'codebase_rag_engine',
      },
      {
        id: 'ai_guardrails_enforcer',
        label: 'AI Guardrails & Zero-Trust Security Firewall',
        description: 'Real-time filtering against credential leaks and injection payloads',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'ai_guardrails_enforcer'
            ? 'Active'
            : 'Tool',
        icon: ShieldCheck,
        iconColor: 'text-emerald-400',
        devSubTab: 'ai_guardrails_enforcer',
      },
      {
        id: 'adaptive_persona_engine',
        label: 'Adaptive System Prompt & Persona Engine',
        description: 'Dynamic system instruction tuner for domain expertise & tone',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'adaptive_persona_engine'
            ? 'Active'
            : 'Tool',
        icon: Bot,
        iconColor: 'text-purple-400',
        devSubTab: 'adaptive_persona_engine',
      },
      {
        id: 'intelligent_model_router',
        label: 'Intelligent Model Router & Token Optimizer',
        description: 'Assigns queries to the most cost-effective and capable model tier',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'intelligent_model_router'
            ? 'Active'
            : 'Tool',
        icon: Cpu,
        iconColor: 'text-amber-400',
        devSubTab: 'intelligent_model_router',
      },
      {
        id: 'stateful_session_persistence',
        label: 'Stateful Session & Workspace Artifact Sync',
        description: 'Continuous state synchronization for chats, snapshots, and active tabs',
        badge:
          activeStudioModule === 'dev_platform' &&
          activeDevSubTab === 'stateful_session_persistence'
            ? 'Active'
            : 'Tool',
        icon: Layers,
        iconColor: 'text-teal-400',
        devSubTab: 'stateful_session_persistence',
      },
      {
        id: 'pillar_context_window',
        label: 'Foundational Pillar: Context Window Buffer',
        description: 'Smart token trimming and rolling memory buffers for long-turn sessions',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'pillar_context_window'
            ? 'Active'
            : 'Tool',
        icon: Brain,
        iconColor: 'text-orange-400',
        devSubTab: 'pillar_context_window',
      },
      {
        id: 'pillar_multimodal_stream',
        label: 'Foundational Pillar: Multi-Modal Stream',
        description: 'Zero-latency token-by-token streaming for text, code, and UI elements',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'pillar_multimodal_stream'
            ? 'Active'
            : 'Tool',
        icon: Zap,
        iconColor: 'text-amber-400',
        devSubTab: 'pillar_multimodal_stream',
      },
      {
        id: 'pillar_native_tools',
        label: 'Foundational Pillar: Native Tool Execution',
        description: 'Automated integration layer for external APIs, CLI, and DB queries',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'pillar_native_tools'
            ? 'Active'
            : 'Tool',
        icon: Wrench,
        iconColor: 'text-cyan-400',
        devSubTab: 'pillar_native_tools',
      },
      {
        id: 'pillar_local_rag',
        label: 'Foundational Pillar: Local RAG & Document Engine',
        description: 'Semantic search and vector indexing for uploaded repository files',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'pillar_local_rag'
            ? 'Active'
            : 'Tool',
        icon: FileText,
        iconColor: 'text-sky-400',
        devSubTab: 'pillar_local_rag',
      },
      {
        id: 'pillar_auto_refactor',
        label: 'Foundational Pillar: Auto-Refactoring Loop',
        description: 'Autonomous execution loop where generated code is syntax-checked & fixed',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'pillar_auto_refactor'
            ? 'Active'
            : 'Tool',
        icon: Sparkles,
        iconColor: 'text-emerald-400',
        devSubTab: 'pillar_auto_refactor',
      },
      {
        id: 'pillar_task_decomposition',
        label: 'Foundational Pillar: Task Decomposition Planner',
        description: 'AI planner breaking complex requests into step-by-step sub-agent pipelines',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'pillar_task_decomposition'
            ? 'Active'
            : 'Tool',
        icon: Workflow,
        iconColor: 'text-indigo-400',
        devSubTab: 'pillar_task_decomposition',
      },
      {
        id: 'pillar_safety_guardrails',
        label: 'Foundational Pillar: Safety & Credential Guard',
        description: 'Security filter blocking API key leaks, code injection, and unsafe scripts',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'pillar_safety_guardrails'
            ? 'Active'
            : 'Tool',
        icon: Shield,
        iconColor: 'text-rose-400',
        devSubTab: 'pillar_safety_guardrails',
      },
      {
        id: 'pillar_model_budget_router',
        label: 'Foundational Pillar: Smart Model Budget Router',
        description: 'Dynamic routing engine assigning queries across fast & heavy models',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'pillar_model_budget_router'
            ? 'Active'
            : 'Tool',
        icon: Scale,
        iconColor: 'text-amber-400',
        devSubTab: 'pillar_model_budget_router',
      },
      {
        id: 'pillar_snapshot_manager',
        label: 'Foundational Pillar: Artifact Snapshot Manager',
        description: 'Auto-saving workspace state, chat history, and generated file trees',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'pillar_snapshot_manager'
            ? 'Active'
            : 'Tool',
        icon: History,
        iconColor: 'text-teal-400',
        devSubTab: 'pillar_snapshot_manager',
      },
      {
        id: 'pillar_finetune_exporter',
        label: 'Foundational Pillar: Fine-Tuning Dataset Exporter',
        description: 'Export clean prompt-response pairs into JSONL datasets for LLM training',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'pillar_finetune_exporter'
            ? 'Active'
            : 'Tool',
        icon: Database,
        iconColor: 'text-fuchsia-400',
        devSubTab: 'pillar_finetune_exporter',
      },
    ],
    [activeDevSubTab, activeStudioModule],
  );

  const devIdeItems: UtilityRowItem[] = useMemo(
    () => [
      {
        id: 'terminal_cli',
        label: 'Terminal & CLI Execution',
        description: 'Interactive shell runner for npm, git, build scripts, and diagnostics',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'terminal_cli'
            ? 'Active'
            : 'Open',
        icon: Terminal,
        iconColor: 'text-emerald-400',
        devSubTab: 'terminal_cli',
        keywords: 'terminal cli bash shell command console',
      },
      {
        id: 'erd_sql_builder',
        label: 'SQL Builder & Database Visualizer',
        description: 'Interactive ERD schema designer and visual SQL query generator',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'erd_sql_builder'
            ? 'Active'
            : 'Tool',
        icon: Database,
        iconColor: 'text-sky-400',
        devSubTab: 'erd_sql_builder',
        keywords: 'sql builder database erd schema postgres query',
      },
      {
        id: 'diff_viewer',
        label: 'Git Diff Viewer (Side-by-Side)',
        description: 'Inspect line-by-line additions, deletions, and patch hunks before merging',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'diff_viewer'
            ? 'Active'
            : 'Open',
        icon: GitCompare,
        iconColor: 'text-amber-400',
        devSubTab: 'diff_viewer',
        keywords: 'git diff viewer compare changes patch',
      },
      {
        id: 'api_db_playground',
        label: 'API Playground & REST/GraphQL Tester',
        description: 'Send live HTTP requests, inspect headers, and test database queries',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'api_db_playground'
            ? 'Active'
            : 'Open',
        icon: Play,
        iconColor: 'text-cyan-400',
        devSubTab: 'api_db_playground',
        keywords: 'api playground rest http request postman test',
      },
      {
        id: 'architect',
        label: 'Multi-File Architecture & ZIP Exporter',
        description: 'Generate full-stack repository trees and export production ZIP bundles',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'architect'
            ? 'Active'
            : 'Open',
        icon: Boxes,
        iconColor: 'text-indigo-400',
        devSubTab: 'architect',
      },
      {
        id: 'bug_fixer',
        label: 'Auto-Bug Fixer & Runtime Debugger',
        description: 'Paste stack traces or broken snippets for instant AST-verified patches',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'bug_fixer'
            ? 'Active'
            : 'Tool',
        icon: Bug,
        iconColor: 'text-rose-400',
        devSubTab: 'bug_fixer',
      },
      {
        id: 'mermaid_diagram',
        label: 'Visual Mermaid.js Flowchart Studio',
        description: 'Render sequence diagrams, ERDs, and system architecture graphs',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'mermaid_diagram'
            ? 'Active'
            : 'Tool',
        icon: Network,
        iconColor: 'text-purple-400',
        devSubTab: 'mermaid_diagram',
      },
      {
        id: 'multi_model',
        label: 'Multi-Model Benchmark Arena',
        description: 'Compare Gemini, Claude, and DeepSeek outputs side-by-side',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'multi_model'
            ? 'Active'
            : 'Open',
        icon: Scale,
        iconColor: 'text-amber-400',
        devSubTab: 'multi_model',
      },
      {
        id: 'doc_rag',
        label: 'Document & PDF RAG Q&A Engine',
        description: 'Query technical specifications and PDFs with cited answers',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'doc_rag'
            ? 'Active'
            : 'Tool',
        icon: FileText,
        iconColor: 'text-teal-400',
        devSubTab: 'doc_rag',
      },
      {
        id: 'design_to_code',
        label: 'Design-to-Code (React + Tailwind)',
        description: 'Transform wireframe specs and UI tokens into responsive React components',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'design_to_code'
            ? 'Active'
            : 'Tool',
        icon: Palette,
        iconColor: 'text-pink-400',
        devSubTab: 'design_to_code',
      },
      {
        id: 'i18n_localization',
        label: 'App Localization Engine (i18n)',
        description: 'Translate UI locale dictionaries across 12+ global languages',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'i18n_localization'
            ? 'Active'
            : 'Tool',
        icon: Globe,
        iconColor: 'text-sky-400',
        devSubTab: 'i18n_localization',
      },
      {
        id: 'seo_metadata',
        label: 'Automated SEO & OpenGraph Generator',
        description: 'Generate JSON-LD structured data, meta tags, and social cards',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'seo_metadata'
            ? 'Active'
            : 'Tool',
        icon: Sparkles,
        iconColor: 'text-emerald-400',
        devSubTab: 'seo_metadata',
      },
      {
        id: 'regex_cron_builder',
        label: 'Regex & Cron Expression Builder',
        description: 'Synthesize and test regular expressions and cron schedules visually',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'regex_cron_builder'
            ? 'Active'
            : 'Tool',
        icon: Code2,
        iconColor: 'text-amber-400',
        devSubTab: 'regex_cron_builder',
      },
      {
        id: 'code_annotator',
        label: 'Code Annotator & Line-by-Line Explainer',
        description: 'Add JSDoc comments and architectural walkthroughs to complex code',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'code_annotator'
            ? 'Active'
            : 'Tool',
        icon: FileCode2,
        iconColor: 'text-cyan-400',
        devSubTab: 'code_annotator',
      },
      {
        id: 'github_sync',
        label: 'Automated GitHub PR Generator',
        description: 'Draft pull request summaries, branch diffs, and review checklists',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'github_sync'
            ? 'Active'
            : 'Open',
        icon: FolderGit2,
        iconColor: 'text-indigo-400',
        devSubTab: 'github_sync',
      },
      {
        id: 'shadcn_playground',
        label: 'Interactive Shadcn UI Component Library',
        description: 'Preview and copy accessible Radix + Tailwind UI primitives',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'shadcn_playground'
            ? 'Active'
            : 'Open',
        icon: LayoutGrid,
        iconColor: 'text-fuchsia-400',
        devSubTab: 'shadcn_playground',
      },
      {
        id: 'web_automation_agent',
        label: 'Autonomous Web Automation Bot',
        description: 'Build headless browser scraping and E2E workflow scripts',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'web_automation_agent'
            ? 'Active'
            : 'Tool',
        icon: Bot,
        iconColor: 'text-emerald-400',
        devSubTab: 'web_automation_agent',
      },
      {
        id: 'mock_data_generator',
        label: 'Mock Data & TypeScript Schema Generator',
        description: 'Generate realistic JSON fixtures and Zod schemas on demand',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'mock_data_generator'
            ? 'Active'
            : 'Tool',
        icon: Database,
        iconColor: 'text-amber-400',
        devSubTab: 'mock_data_generator',
      },
      {
        id: 'big_o_optimizer',
        label: 'Code Performance & Big-O Optimizer',
        description: 'Analyze algorithmic complexity and refactor O(n²) bottlenecks',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'big_o_optimizer'
            ? 'Active'
            : 'Tool',
        icon: Gauge,
        iconColor: 'text-rose-400',
        devSubTab: 'big_o_optimizer',
      },
      {
        id: 'file_pinning_context',
        label: 'File Pinning & Multi-File Context Manager',
        description: 'Pin specific repository files into persistent LLM memory',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'file_pinning_context'
            ? 'Active'
            : 'Open',
        icon: Layers,
        iconColor: 'text-sky-400',
        devSubTab: 'file_pinning_context',
      },
      {
        id: 'voice_to_code',
        label: 'Voice-to-Code Dictation Studio',
        description: 'Convert natural spoken instructions into typed TypeScript modules',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'voice_to_code'
            ? 'Active'
            : 'Tool',
        icon: Mic,
        iconColor: 'text-emerald-400',
        devSubTab: 'voice_to_code',
      },
      {
        id: 'micro_agent_builder',
        label: 'Custom Micro-Agent Builder',
        description: 'Configure specialized autonomous agents with custom system prompts',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'micro_agent_builder'
            ? 'Active'
            : 'Tool',
        icon: Bot,
        iconColor: 'text-purple-400',
        devSubTab: 'micro_agent_builder',
      },
      {
        id: 'live_collab_sandbox',
        label: 'Multi-User Live Collaboration Sandbox',
        description: 'Real-time shared workspace rooms and synchronized code editing',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'live_collab_sandbox'
            ? 'Active'
            : 'Open',
        icon: Share2,
        iconColor: 'text-indigo-400',
        devSubTab: 'live_collab_sandbox',
      },
      {
        id: 'auto_docs_readme',
        label: 'Auto Documentation & README Generator',
        description: 'Synthesize comprehensive architecture docs and API references',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'auto_docs_readme'
            ? 'Active'
            : 'Tool',
        icon: FileText,
        iconColor: 'text-teal-400',
        devSubTab: 'auto_docs_readme',
      },
      {
        id: 'commit_changelog_engine',
        label: 'Automated Commit & Changelog Engine',
        description: 'Generate Conventional Commits and semantic release notes',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'commit_changelog_engine'
            ? 'Active'
            : 'Tool',
        icon: GitBranch,
        iconColor: 'text-amber-400',
        devSubTab: 'commit_changelog_engine',
      },
      {
        id: 'css_motion_studio',
        label: 'CSS & Framer Motion Animation Studio',
        description: 'Design spring physics, keyframes, and micro-interaction transitions',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'css_motion_studio'
            ? 'Active'
            : 'Tool',
        icon: Sparkles,
        iconColor: 'text-fuchsia-400',
        devSubTab: 'css_motion_studio',
      },
      {
        id: 'crash_recovery_guard',
        label: 'Smart Crash & Error Boundary Fixer',
        description: 'Wrap React trees in resilient fault-tolerant recovery boundaries',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'crash_recovery_guard'
            ? 'Active'
            : 'Tool',
        icon: ShieldAlert,
        iconColor: 'text-rose-400',
        devSubTab: 'crash_recovery_guard',
      },
      {
        id: 'prompt_optimizer',
        label: 'AI Prompt Optimizer Studio',
        description: 'Transform brief ideas into structured architectural specifications',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'prompt_optimizer'
            ? 'Active'
            : 'Tool',
        icon: Wand2,
        iconColor: 'text-amber-400',
        devSubTab: 'prompt_optimizer',
      },
      {
        id: 'openapi_swagger_gen',
        label: 'OpenAPI 3.1 / Swagger Specification Gen',
        description: 'Generate complete REST API contracts and interactive Swagger specs',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'openapi_swagger_gen'
            ? 'Active'
            : 'Tool',
        icon: FileCode2,
        iconColor: 'text-emerald-400',
        devSubTab: 'openapi_swagger_gen',
      },
      {
        id: 'offline_draft_engine',
        label: 'Offline Caching & Local Draft Vault',
        description: 'Persist prompts, code snapshots, and drafts in local storage',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'offline_draft_engine'
            ? 'Active'
            : 'Open',
        icon: Layers,
        iconColor: 'text-sky-400',
        devSubTab: 'offline_draft_engine',
      },
      {
        id: 'voice_to_ui_layout',
        label: 'AI Voice-to-UI Layout Engine',
        description: 'Speak layout requirements to generate responsive Tailwind grids',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'voice_to_ui_layout'
            ? 'Active'
            : 'Tool',
        icon: LayoutGrid,
        iconColor: 'text-cyan-400',
        devSubTab: 'voice_to_ui_layout',
      },
      {
        id: 'e2e_test_generator',
        label: 'E2E Test Suite Generator (Playwright/Cypress)',
        description: 'Generate automated browser assertions and integration test specs',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'e2e_test_generator'
            ? 'Active'
            : 'Tool',
        icon: Check,
        iconColor: 'text-emerald-400',
        devSubTab: 'e2e_test_generator',
      },
      {
        id: 'code_complexity_graph',
        label: 'Visual Code Complexity & Call Graph',
        description: 'Inspect cyclomatic complexity and module dependency trees',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'code_complexity_graph'
            ? 'Active'
            : 'Tool',
        icon: Network,
        iconColor: 'text-purple-400',
        devSubTab: 'code_complexity_graph',
      },
      {
        id: 'smart_data_extractor',
        label: 'Smart Data Extractor & Regex Parser',
        description: 'Extract structured JSON tables from unstructured logs and text',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'smart_data_extractor'
            ? 'Active'
            : 'Tool',
        icon: Code2,
        iconColor: 'text-amber-400',
        devSubTab: 'smart_data_extractor',
      },
      {
        id: 'state_management_inspector',
        label: 'State Management Inspector (Zustand/Redux)',
        description: 'Visualize store mutations, selectors, and React state transitions',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'state_management_inspector'
            ? 'Active'
            : 'Open',
        icon: Sliders,
        iconColor: 'text-sky-400',
        devSubTab: 'state_management_inspector',
      },
      {
        id: 'a11y_contrast_auditor',
        label: 'Accessibility (a11y) & WCAG Contrast Auditor',
        description: 'Verify ARIA roles, keyboard navigation, and contrast ratios',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'a11y_contrast_auditor'
            ? 'Active'
            : 'Tool',
        icon: ShieldCheck,
        iconColor: 'text-teal-400',
        devSubTab: 'a11y_contrast_auditor',
      },
      {
        id: 'release_changelog_automator',
        label: 'Product Release & Changelog Automator',
        description: 'Compile semantic versioning notes and deployment announcements',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'release_changelog_automator'
            ? 'Active'
            : 'Tool',
        icon: Rocket,
        iconColor: 'text-indigo-400',
        devSubTab: 'release_changelog_automator',
      },
      {
        id: 'finetune_dataset_gen',
        label: 'AI Fine-Tuning Dataset Generator (.JSONL)',
        description: 'Curate and validate instruction-tuning pairs for custom models',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'finetune_dataset_gen'
            ? 'Active'
            : 'Tool',
        icon: Database,
        iconColor: 'text-amber-400',
        devSubTab: 'finetune_dataset_gen',
      },
      {
        id: 'graphql_schema_builder',
        label: 'GraphQL Schema & Resolver Builder',
        description: 'Design typed GraphQL SDL schemas, queries, mutations, and resolvers',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'graphql_schema_builder'
            ? 'Active'
            : 'Tool',
        icon: Network,
        iconColor: 'text-pink-400',
        devSubTab: 'graphql_schema_builder',
      },
      {
        id: 'semantic_code_search',
        label: 'Semantic Code Search Engine',
        description: 'Natural language search across functions, hooks, and API routes',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'semantic_code_search'
            ? 'Active'
            : 'Open',
        icon: Search,
        iconColor: 'text-cyan-400',
        devSubTab: 'semantic_code_search',
      },
      {
        id: 'feature_flag_manager',
        label: 'Dynamic Feature Flag & A/B Rollout Manager',
        description: 'Toggle progressive rollouts, canary targets, and experiment flags',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'feature_flag_manager'
            ? 'Active'
            : 'Open',
        icon: Sliders,
        iconColor: 'text-emerald-400',
        devSubTab: 'feature_flag_manager',
      },
      {
        id: 'automated_pr_reviewer',
        label: 'Automated Pull Request Security & Style Reviewer',
        description: 'Line-by-line static analysis and architectural PR feedback',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'automated_pr_reviewer'
            ? 'Active'
            : 'Tool',
        icon: GitCompare,
        iconColor: 'text-indigo-400',
        devSubTab: 'automated_pr_reviewer',
      },
      {
        id: 'wasm_interactive_runner',
        label: 'WebAssembly (Wasm) Interactive Runner',
        description: 'Compile and benchmark Rust/C++ Wasm modules in the browser',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'wasm_interactive_runner'
            ? 'Active'
            : 'Tool',
        icon: Cpu,
        iconColor: 'text-orange-400',
        devSubTab: 'wasm_interactive_runner',
      },
      {
        id: 'code_framework_converter',
        label: 'Legacy-to-Modern Code Framework Converter',
        description: 'Migrate class components or jQuery into modern React 19 + TypeScript',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'code_framework_converter'
            ? 'Active'
            : 'Tool',
        icon: Workflow,
        iconColor: 'text-sky-400',
        devSubTab: 'code_framework_converter',
      },
      {
        id: 'stack_trace_analyzer',
        label: 'Interactive Stack Trace & Log Analyzer',
        description: 'Convert backend crash logs into visual execution paths and root causes',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'stack_trace_analyzer'
            ? 'Active'
            : 'Tool',
        icon: Bug,
        iconColor: 'text-rose-400',
        devSubTab: 'stack_trace_analyzer',
      },
      {
        id: 'msw_mock_contract_gen',
        label: 'Instant MSW Mock Server & API Contract Gen',
        description: 'Generate Mock Service Worker handlers directly from TypeScript interfaces',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'msw_mock_contract_gen'
            ? 'Active'
            : 'Tool',
        icon: Server,
        iconColor: 'text-emerald-400',
        devSubTab: 'msw_mock_contract_gen',
      },
      {
        id: 'polyglot_code_translator',
        label: 'Multi-Language Polyglot Code Translator',
        description: '1-click translation across Python, TypeScript, Go, Rust, C++, and Java',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'polyglot_code_translator'
            ? 'Active'
            : 'Tool',
        icon: Code2,
        iconColor: 'text-amber-400',
        devSubTab: 'polyglot_code_translator',
      },
      {
        id: 'git_conflict_resolver',
        label: 'Visual Git Merge Conflict Resolver',
        description: 'Side-by-side interactive editor with smart AST conflict resolution',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'git_conflict_resolver'
            ? 'Active'
            : 'Open',
        icon: GitBranch,
        iconColor: 'text-fuchsia-400',
        devSubTab: 'git_conflict_resolver',
      },
      {
        id: 'modal-prompt-timeline',
        label: 'Prompt History & Versioning Timeline',
        description: 'Browse and restore previous prompt iterations and artifact snapshots',
        badge: 'Open',
        icon: History,
        iconColor: 'text-amber-400',
        modal: 'timeline',
      },
      {
        id: 'modal-token-analytics',
        label: 'Usage & Token Telemetry Analytics',
        description: 'Inspect token consumption, latency metrics, and model efficiency',
        badge: 'Open',
        icon: Activity,
        iconColor: 'text-emerald-400',
        modal: 'analytics',
      },
    ],
    [activeDevSubTab, activeStudioModule],
  );

  const platformInfraItems: UtilityRowItem[] = useMemo(
    () => [
      {
        id: 'multi_deploy',
        label: '1-Click Multi-Platform Deployment',
        description: 'Deploy production builds to Vercel, Cloud Run, Cloudflare, or Netlify',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'multi_deploy'
            ? 'Active'
            : 'Open',
        icon: Rocket,
        iconColor: 'text-emerald-400',
        devSubTab: 'multi_deploy',
        keywords: 'deployment deploy vercel cloudflare netlify cloud run production',
      },
      {
        id: 'security_auditor',
        label: 'Security & Code Vulnerability Auditor',
        description: 'Automated OWASP Top 10, secret scanning, and static security analysis',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'security_auditor'
            ? 'Active'
            : 'Tool',
        icon: ShieldCheck,
        iconColor: 'text-amber-400',
        devSubTab: 'security_auditor',
        keywords: 'security auditor vulnerability owasp scan audit',
      },
      {
        id: 'edge_perf_monitor',
        label: 'Edge Network Performance Monitor',
        description: 'Real-time global PoP latency, TTFB telemetry, and Core Web Vitals',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'edge_perf_monitor'
            ? 'Active'
            : 'Open',
        icon: Activity,
        iconColor: 'text-cyan-400',
        devSubTab: 'edge_perf_monitor',
        keywords: 'edge performance monitor latency ttfb vitals telemetry',
      },
      {
        id: 'dep_vuln_auditor',
        label: 'Dependency Vulnerability & CVE Auditor',
        description: 'Audit package.json dependencies for CVEs and zero-day patches',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'dep_vuln_auditor'
            ? 'Active'
            : 'Tool',
        icon: ShieldAlert,
        iconColor: 'text-rose-400',
        devSubTab: 'dep_vuln_auditor',
      },
      {
        id: 'cloud_db_connector',
        label: 'Direct Cloud DB Connector (Postgres/Supabase)',
        description: 'Configure connection pools, RLS policies, and live cloud schemas',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'cloud_db_connector'
            ? 'Active'
            : 'Open',
        icon: Database,
        iconColor: 'text-sky-400',
        devSubTab: 'cloud_db_connector',
      },
      {
        id: 'expo_mobile_simulator',
        label: 'Mobile & Expo React Native Simulator',
        description: 'Preview iOS and Android native layouts with gesture simulation',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'expo_mobile_simulator'
            ? 'Active'
            : 'Open',
        icon: Smartphone,
        iconColor: 'text-indigo-400',
        devSubTab: 'expo_mobile_simulator',
      },
      {
        id: 'cost_budget_estimator',
        label: 'Token Budget & Cloud Cost Estimator',
        description: 'Forecast monthly LLM API and cloud infrastructure spend',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'cost_budget_estimator'
            ? 'Active'
            : 'Tool',
        icon: Scale,
        iconColor: 'text-amber-400',
        devSubTab: 'cost_budget_estimator',
      },
      {
        id: 'saas_starter_launcher',
        label: '1-Click SaaS Starter Kit Launcher',
        description: 'Bootstrap auth, billing, multi-tenant RBAC, and dashboard shells',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'saas_starter_launcher'
            ? 'Active'
            : 'Open',
        icon: Rocket,
        iconColor: 'text-fuchsia-400',
        devSubTab: 'saas_starter_launcher',
      },
      {
        id: 'encrypted_env_manager',
        label: 'Encrypted .env Secrets & Variables Manager',
        description: 'Manage AES-256 encrypted environment variables across staging & prod',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'encrypted_env_manager'
            ? 'Active'
            : 'Tool',
        icon: KeyRound,
        iconColor: 'text-emerald-400',
        devSubTab: 'encrypted_env_manager',
      },
      {
        id: 'edge_latency_simulator',
        label: 'Cloud Edge & Global Latency Simulator',
        description: 'Simulate regional packet routing, cold starts, and failover',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'edge_latency_simulator'
            ? 'Active'
            : 'Tool',
        icon: Globe,
        iconColor: 'text-sky-400',
        devSubTab: 'edge_latency_simulator',
      },
      {
        id: 'webhook_trigger_suite',
        label: 'Third-Party Webhook Trigger Suite',
        description: 'Dispatch and inspect Stripe, GitHub, and Slack webhook events',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'webhook_trigger_suite'
            ? 'Active'
            : 'Tool',
        icon: Webhook,
        iconColor: 'text-purple-400',
        devSubTab: 'webhook_trigger_suite',
      },
      {
        id: 'vector_db_builder',
        label: 'AI Vector DB Query Builder (Pinecone/Qdrant)',
        description: 'Construct cosine similarity queries and hybrid metadata filters',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'vector_db_builder'
            ? 'Active'
            : 'Tool',
        icon: Database,
        iconColor: 'text-cyan-400',
        devSubTab: 'vector_db_builder',
      },
      {
        id: 'microservice_dockerizer',
        label: 'Microservice & Docker Containerizer',
        description: 'Generate multi-stage Dockerfiles and docker-compose orchestrations',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'microservice_dockerizer'
            ? 'Active'
            : 'Tool',
        icon: Boxes,
        iconColor: 'text-sky-400',
        devSubTab: 'microservice_dockerizer',
      },
      {
        id: 'middleware_security_gen',
        label: 'Middleware & Security Policy Generator',
        description: 'Configure CORS, CSP headers, JWT verification, and rate limiters',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'middleware_security_gen'
            ? 'Active'
            : 'Tool',
        icon: Lock,
        iconColor: 'text-amber-400',
        devSubTab: 'middleware_security_gen',
      },
      {
        id: 'schema_migration_orm',
        label: 'Schema Migration & ORM Studio (Prisma/Drizzle)',
        description: 'Generate type-safe ORM schemas and reversible SQL migrations',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'schema_migration_orm'
            ? 'Active'
            : 'Tool',
        icon: Database,
        iconColor: 'text-emerald-400',
        devSubTab: 'schema_migration_orm',
      },
      {
        id: 'serverless_sandbox',
        label: 'Serverless & Edge Function Sandbox',
        description: 'Test V8 isolate edge workers and serverless API handlers',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'serverless_sandbox'
            ? 'Active'
            : 'Open',
        icon: Zap,
        iconColor: 'text-amber-400',
        devSubTab: 'serverless_sandbox',
      },
      {
        id: 'iac_generator',
        label: 'Infrastructure-as-Code (Terraform / K8s)',
        description: 'Synthesize Kubernetes manifests, Helm charts, and Terraform HCL',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'iac_generator'
            ? 'Active'
            : 'Tool',
        icon: Cloud,
        iconColor: 'text-sky-400',
        devSubTab: 'iac_generator',
      },
      {
        id: 'media_processing_suite',
        label: 'Audio/Video DSP & FFmpeg Pipeline Suite',
        description: 'Build transcoding, bitrate optimization, and audio mastering pipelines',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'media_processing_suite'
            ? 'Active'
            : 'Tool',
        icon: Sliders,
        iconColor: 'text-pink-400',
        devSubTab: 'media_processing_suite',
      },
      {
        id: 'load_test_generator',
        label: 'API Load Testing Generator (k6 / Artillery)',
        description: 'Simulate high-concurrency traffic spikes and p99 latency thresholds',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'load_test_generator'
            ? 'Active'
            : 'Tool',
        icon: Gauge,
        iconColor: 'text-rose-400',
        devSubTab: 'load_test_generator',
      },
      {
        id: 'system_arch_canvas',
        label: 'System Architecture Blueprint Canvas',
        description: 'Design distributed microservices, load balancers, and message queues',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'system_arch_canvas'
            ? 'Active'
            : 'Open',
        icon: Network,
        iconColor: 'text-indigo-400',
        devSubTab: 'system_arch_canvas',
      },
      {
        id: 'agent_telemetry_dashboard',
        label: 'AI Agent Telemetry & Trace Dashboard',
        description: 'Monitor sub-agent execution spans, token throughput, and tool calls',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'agent_telemetry_dashboard'
            ? 'Active'
            : 'Open',
        icon: Activity,
        iconColor: 'text-emerald-400',
        devSubTab: 'agent_telemetry_dashboard',
      },
      {
        id: 'webhook_inspector_sim',
        label: 'Webhook Inspector & HMAC Signature Simulator',
        description: 'Verify SHA-256 webhook signatures and replay event payloads',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'webhook_inspector_sim'
            ? 'Active'
            : 'Tool',
        icon: Webhook,
        iconColor: 'text-cyan-400',
        devSubTab: 'webhook_inspector_sim',
      },
      {
        id: 'smart_caching_strategizer',
        label: 'Smart Redis & SWR Caching Strategizer',
        description: 'Configure TTL invalidation, stale-while-revalidate, and edge caching',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'smart_caching_strategizer'
            ? 'Active'
            : 'Tool',
        icon: Zap,
        iconColor: 'text-amber-400',
        devSubTab: 'smart_caching_strategizer',
      },
      {
        id: 'mfe_module_orchestrator',
        label: 'Micro-Frontend Module Orchestrator',
        description: 'Configure Module Federation and split monoliths into micro-frontends',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'mfe_module_orchestrator'
            ? 'Active'
            : 'Tool',
        icon: Boxes,
        iconColor: 'text-purple-400',
        devSubTab: 'mfe_module_orchestrator',
      },
      {
        id: 'multi_browser_viewport',
        label: 'Multi-Browser & Device Viewport Simulator',
        description: 'Cross-browser testing across Chrome, Safari, Firefox, and mobile OS frames',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'multi_browser_viewport'
            ? 'Active'
            : 'Open',
        icon: MonitorSmartphone,
        iconColor: 'text-sky-400',
        devSubTab: 'multi_browser_viewport',
      },
      {
        id: 'web3_contract_auditor',
        label: 'Smart Contract & Web3 Security Auditor',
        description: 'Scan Solidity and Rust contracts for reentrancy and gas inefficiencies',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'web3_contract_auditor'
            ? 'Active'
            : 'Tool',
        icon: Shield,
        iconColor: 'text-amber-400',
        devSubTab: 'web3_contract_auditor',
      },
      {
        id: 'realtime_etl_builder',
        label: 'Real-Time ETL & Data Pipeline Builder',
        description: 'Build streaming data transformation pipelines and event listeners',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'realtime_etl_builder'
            ? 'Active'
            : 'Tool',
        icon: Workflow,
        iconColor: 'text-teal-400',
        devSubTab: 'realtime_etl_builder',
      },
      {
        id: 'live_system_health',
        label: 'Live System Health & Telemetry Dashboard',
        description: 'Monitor API endpoints, cold starts, uptime metrics, and SLA status',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'live_system_health'
            ? 'Active'
            : 'Open',
        icon: Activity,
        iconColor: 'text-emerald-400',
        devSubTab: 'live_system_health',
      },
      {
        id: 'capacitor_mobile_exporter',
        label: 'Native Mobile App Bundle Exporter (Capacitor)',
        description: 'Wrap React/Next.js web apps into native iOS and Android builds',
        badge:
          activeStudioModule === 'dev_platform' && activeDevSubTab === 'capacitor_mobile_exporter'
            ? 'Active'
            : 'Tool',
        icon: Smartphone,
        iconColor: 'text-indigo-400',
        devSubTab: 'capacitor_mobile_exporter',
      },
      {
        id: 'modal-team-share',
        label: 'Live Team Workspace & Share Link',
        description: 'Generate collaborative session links and share live artifacts',
        badge: 'Open',
        icon: Share2,
        iconColor: 'text-sky-400',
        modal: 'share',
      },
    ],
    [activeDevSubTab, activeStudioModule],
  );

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filterItems = (items: UtilityRowItem[]) => {
    if (!normalizedQuery) return items;
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(normalizedQuery) ||
        item.description.toLowerCase().includes(normalizedQuery) ||
        (item.keywords && item.keywords.toLowerCase().includes(normalizedQuery)),
    );
  };

  const filteredCoreAi = useMemo(() => filterItems(coreAiItems), [coreAiItems, normalizedQuery]);
  const filteredDevIde = useMemo(() => filterItems(devIdeItems), [devIdeItems, normalizedQuery]);
  const filteredPlatformInfra = useMemo(
    () => filterItems(platformInfraItems),
    [platformInfraItems, normalizedQuery],
  );

  const totalMatchingTools =
    4 + 3 + filteredCoreAi.length + filteredDevIde.length + filteredPlatformInfra.length;

  const handleRowClick = (item: UtilityRowItem) => {
    onClose();
    if (item.customAction) {
      item.customAction();
      return;
    }
    if (item.modal) {
      onOpenModal(item.modal);
      return;
    }
    if (item.devSubTab) {
      onOpenDevTool(item.devSubTab, item.label);
    }
  };

  const renderBadge = (badge: 'Tool' | 'Open' | 'Active') => {
    if (badge === 'Active') {
      return (
        <span className="shrink-0 rounded-md border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-300">
          Active
        </span>
      );
    }
    if (badge === 'Open') {
      return (
        <span className="shrink-0 rounded-md border border-amber-400/35 bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300 group-hover:bg-amber-400 group-hover:text-slate-950 transition-colors">
          Open
        </span>
      );
    }
    return (
      <span className="shrink-0 rounded-md border border-slate-700 bg-slate-800/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-300 group-hover:border-sky-400/50 group-hover:text-sky-300 transition-colors">
        Tool
      </span>
    );
  };

  const renderUtilityRow = (item: UtilityRowItem) => {
    const IconComponent = item.icon;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => handleRowClick(item)}
        className="group flex w-full items-center justify-between gap-3 rounded-xl border border-transparent px-3 py-2 text-left transition-all hover:border-slate-800 hover:bg-slate-900/90 active:scale-[0.99]"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-8 shrink-0 place-items-center rounded-lg border border-slate-800/90 bg-slate-900 text-slate-200 group-hover:border-slate-700">
            <IconComponent size={15} className={item.iconColor} />
          </div>
          <div className="min-w-0">
            <div className="truncate text-xs font-bold text-slate-100 group-hover:text-white">
              {item.label}
            </div>
            <div className="truncate text-[10.5px] text-slate-400">{item.description}</div>
          </div>
        </div>
        {renderBadge(item.badge)}
      </button>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex">
      {/* Semi-Transparent Backdrop Blur */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
      />

      {/* Left Side-Drawer & Quick Action Menu Suite */}
      <aside
        aria-label="SAZ AI Quick Upload & Developer Suite Drawer"
        className="relative z-[75] flex h-full w-[92vw] max-w-[430px] flex-col rounded-r-3xl border-r border-slate-800 bg-[#090D16] text-slate-100 shadow-2xl"
      >
        {/* Sticky Top Header */}
        <div className="sticky top-0 z-20 border-b border-slate-800/90 bg-[#090D16]/95 px-4 pb-3 pt-3.5 backdrop-blur-md">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-400/15 border border-amber-400/40 text-amber-300">
                <Upload size={16} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="truncate text-sm font-black tracking-tight text-white">
                    SAZ AI Upload & Developer Suite
                  </h2>
                  <span className="rounded-md bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wider text-emerald-300">
                    100+ Tools
                  </span>
                </div>
                <p className="truncate text-[11px] text-slate-400">
                  Primary Upload Controls, Core AI Toggles & 100+ Utilities
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close SAZ AI Developer Suite"
              className="grid size-8 shrink-0 place-items-center rounded-xl border border-slate-800 bg-slate-900 text-slate-300 transition hover:border-slate-700 hover:bg-slate-800 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>

          {/* Search Bar for Quick Tool Filtering */}
          <div className="relative mt-2.5">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search uploads, toggles, or 100+ developer tools..."
              className="h-8.5 w-full rounded-xl border border-slate-800 bg-slate-900/90 pl-9 pr-16 text-xs text-white placeholder:text-slate-500 outline-none transition focus:border-amber-400/70"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-slate-300 hover:text-white"
              >
                Clear
              </button>
            ) : (
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-500">
                {totalMatchingTools}
              </span>
            )}
          </div>
        </div>

        {/* Scrollable Menu Body */}
        <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3 pb-24">
          {/* =====================================================================
              1. PRIMARY UPLOAD & INPUT OPTIONS (ALWAYS AT THE TOP OF THE '+' MENU)
             ===================================================================== */}
          <section className="rounded-2xl border border-amber-400/30 bg-slate-900/90 p-2.5 shadow-sm">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-300">
                1. Quick Upload & Multimodal Inputs
              </span>
              <span className="text-[10px] font-semibold text-slate-400">Primary Actions</span>
            </div>

            <div className="space-y-1.5">
              {/* Option 1: Photo & Image Gallery Upload */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onTriggerPhotoUpload();
                }}
                className="group flex w-full items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/90 px-3 py-2.5 text-left transition hover:border-purple-400/60 hover:bg-slate-900"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300">
                    <ImageIcon size={17} />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-extrabold text-white">
                      Photo & Image Gallery Upload
                    </div>
                    <div className="truncate text-[10.5px] text-slate-400">
                      Upload PNG, JPG, or WebP images for Vision AI & UI-to-Code
                    </div>
                  </div>
                </div>
                {renderBadge('Open')}
              </button>

              {/* Option 2: File & Document Attachment Upload (.pdf, .txt, .zip, .code) */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onTriggerFileUpload();
                }}
                className="group flex w-full items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/90 px-3 py-2.5 text-left transition hover:border-amber-400/60 hover:bg-slate-900"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300">
                    <Paperclip size={17} />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-extrabold text-white">
                      File & Document Attachment Upload (.pdf, .txt, .zip, .code)
                    </div>
                    <div className="truncate text-[10.5px] text-slate-400">
                      Attach PDFs, ZIP archives, TXT, Markdown, CSV, or code files
                    </div>
                  </div>
                </div>
                {renderBadge('Open')}
              </button>

              {/* Option 3: Camera / Vision AI Scan */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onTriggerCameraCapture();
                }}
                className="group flex w-full items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/90 px-3 py-2.5 text-left transition hover:border-sky-400/60 hover:bg-slate-900"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-300">
                    <Camera size={17} />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-extrabold text-white">
                      Camera / Vision AI Scan
                    </div>
                    <div className="truncate text-[10.5px] text-slate-400">
                      Capture live camera photo for instant optical & code recognition
                    </div>
                  </div>
                </div>
                {renderBadge('Tool')}
              </button>

              {/* Option 4: Voice Input / Micro-Audio Recording */}
              <button
                type="button"
                disabled={isTyping}
                onClick={() => {
                  onClose();
                  onToggleVoiceInput();
                }}
                className="group flex w-full items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/90 px-3 py-2.5 text-left transition hover:border-emerald-400/60 hover:bg-slate-900"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className={`grid size-9 shrink-0 place-items-center rounded-xl border ${
                      isListening
                        ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                        : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                    }`}
                  >
                    {isListening ? <MicOff size={17} /> : <Mic size={17} />}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-extrabold text-white">
                      {isListening
                        ? 'Stop Voice Input / Audio Recording'
                        : 'Voice Input / Micro-Audio Recording'}
                    </div>
                    <div className="truncate text-[10.5px] text-slate-400">
                      {isListening
                        ? 'Microphone active — click to stop recording'
                        : 'Record voice prompt or dictate hands-free in English & Urdu'}
                    </div>
                  </div>
                </div>
                {renderBadge(isListening ? 'Active' : 'Tool')}
              </button>

              {/* Bonus Quick Dictate: Instant Voice-to-Code */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onTriggerInstantVoiceToCode();
                }}
                className="group flex w-full items-center justify-between gap-3 rounded-xl border border-slate-800/80 bg-slate-950/60 px-3 py-2 text-left transition hover:border-fuchsia-400/50 hover:bg-slate-900"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-fuchsia-500/15 border border-fuchsia-500/30 text-fuchsia-300">
                    <FileArchive size={15} />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-bold text-slate-100">
                      Instant Voice-to-Code into Prompt Bar
                    </div>
                    <div className="truncate text-[10px] text-slate-400">
                      Convert spoken logic directly into executable TypeScript code
                    </div>
                  </div>
                </div>
                {renderBadge('Tool')}
              </button>
            </div>
          </section>

          {/* =====================================================================
              2. CORE STANDARD TOGGLES (BELOW QUICK UPLOAD SECTION)
             ===================================================================== */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/75 p-2.5 space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-300">
                2. Standard AI Toggles & Routing
              </span>
              <span className="text-[10px] font-semibold text-slate-400">Live Engine</span>
            </div>

            {/* Toggle 1: Web Search & Scraper */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/90 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="grid size-8 shrink-0 place-items-center rounded-lg border border-slate-800 bg-slate-900 text-emerald-400">
                    <Globe size={15} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-xs font-bold text-white">
                        Web Search & Scraper
                      </span>
                      {renderBadge(webSearchEnabled ? 'Active' : 'Tool')}
                    </div>
                    <div className="truncate text-[10.5px] text-slate-400">
                      Fetch live web data & scrape URLs in real time
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={webSearchEnabled}
                  onClick={() => {
                    const next = !webSearchEnabled;
                    setWebSearchEnabled(next);
                    onNotice(
                      next
                        ? 'AI Web Search & Live URL Scraping enabled'
                        : 'AI Web Search disabled',
                    );
                  }}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
                    webSearchEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block size-4 transform rounded-full bg-slate-950 transition ${
                      webSearchEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              {webSearchEnabled && (
                <input
                  type="url"
                  value={webScrapeUrl}
                  onChange={(e) => setWebScrapeUrl(e.target.value)}
                  placeholder="Optional URL to scrape (https://...)"
                  className="mt-2 h-8 w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 text-xs text-white outline-none focus:border-emerald-400"
                />
              )}
            </div>

            {/* Toggle 2: Project Context (RAG) */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/90 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="grid size-8 shrink-0 place-items-center rounded-lg border border-slate-800 bg-slate-900 text-amber-400">
                    <Database size={15} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-xs font-bold text-white">
                        Project Context (RAG)
                      </span>
                      {renderBadge(projectContextEnabled ? 'Active' : 'Tool')}
                    </div>
                    <div className="truncate text-[10.5px] text-slate-400">
                      Link local workspace files or GitHub repository
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={projectContextEnabled}
                  onClick={() => {
                    const next = !projectContextEnabled;
                    setProjectContextEnabled(next);
                    onNotice(
                      next
                        ? 'Codebase RAG Context enabled for deep queries'
                        : 'Codebase RAG Context disabled',
                    );
                  }}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
                    projectContextEnabled ? 'bg-amber-400' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block size-4 transform rounded-full bg-slate-950 transition ${
                      projectContextEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {projectContextEnabled && (
                <div className="mt-2 space-y-1.5">
                  <select
                    aria-label="Project Context Scope"
                    value={projectContextTarget}
                    onChange={(e) => setProjectContextTarget(e.target.value)}
                    className="h-8 w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 text-xs font-semibold text-white outline-none focus:border-amber-400"
                  >
                    <option value="workspace:full">Full Local Workspace (Indexed)</option>
                    <option value="workspace:frontend">Frontend (src/App.tsx + Components)</option>
                    <option value="workspace:backend">Backend & Auth (server.ts + firebase.ts)</option>
                    <option value="github:repo">Linked GitHub Repository</option>
                  </select>
                  {projectContextTarget === 'github:repo' && (
                    <input
                      type="text"
                      value={projectContextRepoUrl}
                      onChange={(e) => setProjectContextRepoUrl(e.target.value)}
                      placeholder="github.com/owner/repo"
                      className="h-8 w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 text-xs text-white outline-none focus:border-amber-400"
                    />
                  )}
                </div>
              )}
            </div>

            {/* Toggle 3: Dual-Model Side-by-Side Mode */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/90 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="grid size-8 shrink-0 place-items-center rounded-lg border border-slate-800 bg-slate-900 text-cyan-400">
                    <Scale size={15} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-xs font-bold text-white">
                        Dual-Model Side-by-Side Mode
                      </span>
                      {renderBadge(dualModelCompareEnabled ? 'Active' : 'Tool')}
                    </div>
                    <div className="truncate text-[10.5px] text-slate-400">
                      Compare Gemini 3.1 Pro & Claude 3.5 Sonnet simultaneously
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={dualModelCompareEnabled}
                  onClick={() => {
                    const next = !dualModelCompareEnabled;
                    setDualModelCompareEnabled(next);
                    onNotice(
                      next
                        ? 'Dual-Model Side-by-Side Mode enabled'
                        : 'Dual-Model Side-by-Side Mode disabled',
                    );
                  }}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
                    dualModelCompareEnabled ? 'bg-amber-400' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block size-4 transform rounded-full bg-slate-950 transition ${
                      dualModelCompareEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Compact 2x2 Grid for Model, Route, Persona & Theme */}
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-800/90 bg-slate-950/70 p-2.5">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  AI Model Engine
                </label>
                <select
                  aria-label="AI Model Engine"
                  value={selectedModel}
                  onChange={(e) => {
                    setSelectedModel(e.target.value);
                    onNotice(`Model route: ${e.target.value}`);
                    onClose();
                  }}
                  className="h-8 w-full rounded-lg border border-slate-800 bg-slate-900 px-2 text-xs font-bold text-white outline-none focus:border-amber-400"
                >
                  <option value="auto-route">Auto-Route</option>
                  <option value="gemini-3-pro">Gemini 3.1 Pro</option>
                  <option value="claude-3-5-sonnet">Claude 3.5</option>
                  <option value="deepseek-r1">DeepSeek R1</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Execution Route
                </label>
                <select
                  aria-label="Execution Route"
                  value={intent}
                  onChange={(e) => {
                    setIntent(e.target.value as DrawerExecutionIntent);
                    onNotice(`Execution route: ${e.target.value.toUpperCase()}`);
                    onClose();
                  }}
                  className="h-8 w-full rounded-lg border border-slate-800 bg-slate-900 px-2 text-xs font-bold text-white outline-none focus:border-amber-400"
                >
                  <option value="auto">Auto-Route</option>
                  <option value="app">Build App</option>
                  <option value="video">VideoStudio</option>
                  <option value="image">ImageStudio</option>
                  <option value="audio">AudioStudio</option>
                  <option value="analyze">Analyze Asset</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  AI Persona
                </label>
                <select
                  aria-label="Specialized AI Persona"
                  value={selectedPersona}
                  onChange={(e) => {
                    const val = e.target.value as DrawerPersona;
                    setSelectedPersona(val);
                    onNotice(`Persona: ${val.toUpperCase()}`);
                    onClose();
                  }}
                  className="h-8 w-full rounded-lg border border-slate-800 bg-slate-900 px-2 text-xs font-bold text-white outline-none focus:border-amber-400"
                >
                  <option value="architect">Architect</option>
                  <option value="developer">Developer</option>
                  <option value="designer">UI Designer</option>
                  <option value="strategist">Strategist</option>
                  <option value="writer">Story Writer</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Interface Theme
                </label>
                <select
                  aria-label="Interface Theme"
                  value={themePreset}
                  onChange={(e) => {
                    onApplyThemePreset(e.target.value as DrawerThemePreset);
                    onClose();
                  }}
                  className="h-8 w-full rounded-lg border border-slate-800 bg-slate-900 px-2 text-xs font-bold text-white outline-none focus:border-amber-400"
                >
                  <option value="neon_dark">Neon Dark</option>
                  <option value="midnight_blue">Midnight Blue</option>
                  <option value="minimal_mono">Minimal Mono</option>
                  <option value="solar_light">Solar Light</option>
                </select>
              </div>
            </div>
          </section>

          {/* =====================================================================
              3. DEVELOPER TOOLS & UTILITY SUITE (100+ TOOLS)
             ===================================================================== */}
          <div className="pt-1">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-sky-300">
                3. Developer Tools & Utility Suite (100+ Tools)
              </span>
              <span className="text-[10px] font-mono text-slate-400">Click to Open</span>
            </div>

            <div className="space-y-2.5">
              {/* Category A: Dev Tools & IDE Suite */}
              {(filteredDevIde.length > 0 || !normalizedQuery) && (
                <section className="rounded-2xl border border-slate-800/80 bg-slate-950/60 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleSection('dev_ide')}
                    className="flex w-full items-center justify-between bg-slate-900/70 px-3.5 py-2.5 text-left transition hover:bg-slate-900"
                  >
                    <div className="flex items-center gap-2">
                      <Terminal size={14} className="text-emerald-400" />
                      <span className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
                        Dev Tools & IDE Suite
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        · {filteredDevIde.length}
                      </span>
                    </div>
                    {expandedSections.dev_ide || normalizedQuery ? (
                      <ChevronDown size={14} className="text-slate-400" />
                    ) : (
                      <ChevronRight size={14} className="text-slate-400" />
                    )}
                  </button>

                  {(expandedSections.dev_ide || normalizedQuery) && (
                    <div className="divide-y divide-slate-900/60 p-1.5">
                      {filteredDevIde.map(renderUtilityRow)}
                    </div>
                  )}
                </section>
              )}

              {/* Category B: Platform & Infrastructure */}
              {(filteredPlatformInfra.length > 0 || !normalizedQuery) && (
                <section className="rounded-2xl border border-slate-800/80 bg-slate-950/60 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleSection('platform_infra')}
                    className="flex w-full items-center justify-between bg-slate-900/70 px-3.5 py-2.5 text-left transition hover:bg-slate-900"
                  >
                    <div className="flex items-center gap-2">
                      <Server size={14} className="text-sky-400" />
                      <span className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
                        Platform & Infrastructure
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        · {filteredPlatformInfra.length}
                      </span>
                    </div>
                    {expandedSections.platform_infra || normalizedQuery ? (
                      <ChevronDown size={14} className="text-slate-400" />
                    ) : (
                      <ChevronRight size={14} className="text-slate-400" />
                    )}
                  </button>

                  {(expandedSections.platform_infra || normalizedQuery) && (
                    <div className="divide-y divide-slate-900/60 p-1.5">
                      {filteredPlatformInfra.map(renderUtilityRow)}
                    </div>
                  )}
                </section>
              )}

              {/* Category C: Core AI Engine & Foundational Pillars */}
              {(filteredCoreAi.length > 0 || !normalizedQuery) && (
                <section className="rounded-2xl border border-slate-800/80 bg-slate-950/60 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleSection('core_ai')}
                    className="flex w-full items-center justify-between bg-slate-900/70 px-3.5 py-2.5 text-left transition hover:bg-slate-900"
                  >
                    <div className="flex items-center gap-2">
                      <Brain size={14} className="text-amber-400" />
                      <span className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
                        Core AI Engine & Agentic Pillars
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        · {filteredCoreAi.length}
                      </span>
                    </div>
                    {expandedSections.core_ai || normalizedQuery ? (
                      <ChevronDown size={14} className="text-slate-400" />
                    ) : (
                      <ChevronRight size={14} className="text-slate-400" />
                    )}
                  </button>

                  {(expandedSections.core_ai || normalizedQuery) && (
                    <div className="divide-y divide-slate-900/60 p-1.5">
                      {filteredCoreAi.map(renderUtilityRow)}
                    </div>
                  )}
                </section>
              )}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
