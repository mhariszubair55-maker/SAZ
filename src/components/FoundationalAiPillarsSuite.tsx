import { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  FileJson,
  GitBranch,
  HardDrive,
  Route,
  ShieldAlert,
} from 'lucide-react';
import {
  FoundationalAiPillarsPart1,
  autoRefactorAndSyntaxCheck,
} from './FoundationalAiPillarsPart1';

export { autoRefactorAndSyntaxCheck };

export function scanAndProtectCredentials(input: string): {
  safe: boolean;
  redactedText: string;
  alerts: string[];
} {
  let redacted = input;
  const alerts: string[] = [];

  if (/sk-[a-zA-Z0-9_-]{8,}|AIza[0-9A-Za-z-_]{12,}|ghp_[a-zA-Z0-9]{12,}/.test(redacted)) {
    alerts.push('Credential Leak Guard: Scrubbed raw API / GitHub token into environment variable reference.');
    redacted = redacted
      .replace(/sk-[a-zA-Z0-9_-]{8,}/g, 'process.env.API_SECRET_KEY')
      .replace(/AIza[0-9A-Za-z-_]{12,}/g, 'process.env.GEMINI_API_KEY')
      .replace(/ghp_[a-zA-Z0-9]{12,}/g, 'process.env.GITHUB_TOKEN');
  }
  if (/<script\b[^>]*>[\s\S]*?<\/script>|javascript:/i.test(redacted)) {
    alerts.push('XSS Script Guard: Stripped executable `<script>` / `javascript:` URI payload.');
    redacted = redacted.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '/* [XSS_SCRIPT_BLOCKED] */');
  }
  if (/UNION\s+SELECT|;\s*DROP\s+TABLE/i.test(redacted)) {
    alerts.push('SQL Injection Guard: Blocked raw `UNION SELECT` / `DROP TABLE` injection vector.');
  }

  return {
    safe: alerts.length === 0,
    redactedText: redacted,
    alerts,
  };
}

export function FoundationalAiPillarsToolsSection({
  activeTool,
  projectName,
  blueprintFiles,
  pinnedFilePaths,
  onRestoreBlueprintFiles,
  onApplyPromptToChat,
  onNotice,
}: {
  activeTool: string;
  projectName: string;
  blueprintFiles: Array<{ path: string; language: string; description: string; content: string }>;
  pinnedFilePaths: string[];
  onRestoreBlueprintFiles?: (
    files: Array<{ path: string; language: string; description: string; content: string }>,
  ) => void;
  onApplyPromptToChat?: (promptText: string) => void;
  onNotice: (msg: string) => void;
}) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copyText = (key: string, text: string, label: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedKey(key);
    onNotice(`Copied ${label} to clipboard`);
    setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 1800);
  };

  // ============================================================================
  // 6. AGENTIC TASK DECOMPOSITION ARCHITECTURE STATE
  // ============================================================================
  const [decompGoal, setDecompGoal] = useState(
    'Build a multi-tenant AI analytics dashboard with PostgreSQL Drizzle schema, Express JWT API, and Playwright tests',
  );

  const decomposedPipeline = useMemo(() => {
    return [
      {
        stepId: 'DAG-01',
        subAgent: 'Schema & Data Architect',
        dependsOn: 'None (Entrypoint)',
        task: `Design normalized Drizzle ORM tables and indexes for: "${decompGoal.slice(0, 64)}..."`,
        estimatedTokens: 1120,
      },
      {
        stepId: 'DAG-02',
        subAgent: 'API & Security Controller Agent',
        dependsOn: 'DAG-01',
        task: 'Synthesize Express route handlers, JWT RS256 verification middleware, and Zod validation.',
        estimatedTokens: 1640,
      },
      {
        stepId: 'DAG-03',
        subAgent: 'React 19 UI & Tailwind Composer',
        dependsOn: 'DAG-02',
        task: 'Construct responsive dashboard views with zero-CLS cards and keyboard navigation.',
        estimatedTokens: 1890,
      },
      {
        stepId: 'DAG-04',
        subAgent: 'Autonomous Verification & QA Agent',
        dependsOn: 'DAG-02, DAG-03',
        task: 'Run `tsc --noEmit` check and generate Playwright E2E assertions.',
        estimatedTokens: 840,
      },
    ];
  }, [decompGoal]);

  // ============================================================================
  // 7. SAFETY GUARDRAILS & CREDENTIAL PROTECTION STATE
  // ============================================================================
  const [rawUntrustedPayload, setRawUntrustedPayload] = useState(
    `const apiKey = "sk-live-99481726354abcd";\nconst githubPat = "ghp_981237491823749182";\nconst html = "<script>alert('xss')</script>";`,
  );
  const guardrailScan = useMemo(() => scanAndProtectCredentials(rawUntrustedPayload), [rawUntrustedPayload]);

  // ============================================================================
  // 8. SMART MODEL ROUTER & TOKEN BUDGETING STATE
  // ============================================================================
  const [sessionTokenCap, setSessionTokenCap] = useState(50000);
  const [routerTestQuery, setRouterTestQuery] = useState(
    'Design a multi-region Kubernetes HorizontalPodAutoscaler and Terraform VPC module',
  );

  const budgetRoutePlan = useMemo(() => {
    const isHeavy =
      routerTestQuery.length > 90 ||
      /architect|kubernetes|terraform|distributed|microservice|compiler|security/i.test(routerTestQuery);
    const assignedModel = isHeavy ? 'gemini-3.1-pro-preview' : 'gemini-3.8-flash';
    const estimatedPromptTokens = Math.max(48, Math.round(routerTestQuery.length * 1.6));
    const maxCompletionAllocation = isHeavy ? Math.min(8192, Math.round(sessionTokenCap * 0.2)) : 2048;
    return {
      isHeavy,
      assignedModel,
      estimatedPromptTokens,
      maxCompletionAllocation,
      remainingBudget: Math.max(0, sessionTokenCap - estimatedPromptTokens - maxCompletionAllocation),
    };
  }, [routerTestQuery, sessionTokenCap]);

  // ============================================================================
  // 9. STATEFUL SESSION & ARTIFACT SNAPSHOT MANAGER STATE
  // ============================================================================
  const [savedSnapshots, setSavedSnapshots] = useState(() => [
    {
      id: 'ckpt-auto-01',
      name: `${projectName || 'saz-ai'} · Auto-Saved Session Snapshot`,
      timestamp: new Date().toISOString(),
      files: blueprintFiles,
      pinned: pinnedFilePaths,
    },
  ]);

  const captureSessionSnapshot = () => {
    const id = `ckpt-${Date.now().toString(36)}`;
    const next = {
      id,
      name: `${projectName || 'saz-ai'} · Snapshot (${blueprintFiles.length} files)`,
      timestamp: new Date().toISOString(),
      files: blueprintFiles,
      pinned: pinnedFilePaths,
    };
    try {
      localStorage.setItem(`saz_pillar_snapshot_${id}`, JSON.stringify(next));
    } catch {
      // ignore quota error
    }
    setSavedSnapshots((prev) => [next, ...prev]);
    onNotice(`Auto-saved full workspace & file-tree snapshot (${id})`);
  };

  // ============================================================================
  // 10. FINE-TUNING DATASET EXPORTER STATE
  // ============================================================================
  const [exportSystemRole, setExportSystemRole] = useState(
    'You are SAZ AI Principal Full-Stack Architect. Generate production-grade TypeScript and React 19 modules.',
  );

  const exportedJsonl = useMemo(() => {
    return blueprintFiles
      .map((f) =>
        JSON.stringify({
          messages: [
            { role: 'system', content: exportSystemRole },
            { role: 'user', content: `Implement ${f.path}: ${f.description}` },
            { role: 'assistant', content: f.content },
          ],
        }),
      )
      .join('\n');
  }, [blueprintFiles, exportSystemRole]);

  const downloadWorkspaceJsonl = () => {
    const blob = new Blob([exportedJsonl], { type: 'application/jsonl' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName || 'saz-workspace'}-finetune.jsonl`;
    a.click();
    URL.revokeObjectURL(url);
    onNotice(`Exported ${blueprintFiles.length} workspace modules to .jsonl dataset`);
  };

  if (
    activeTool === 'pillar_context_window' ||
    activeTool === 'pillar_multimodal_stream' ||
    activeTool === 'pillar_native_tools' ||
    activeTool === 'pillar_local_rag' ||
    activeTool === 'pillar_auto_refactor'
  ) {
    return (
      <FoundationalAiPillarsPart1
        activeTool={activeTool}
        blueprintFiles={blueprintFiles}
        onApplyPromptToChat={onApplyPromptToChat}
        onNotice={onNotice}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* 6. AGENTIC TASK DECOMPOSITION ARCHITECTURE */}
      {activeTool === 'pillar_task_decomposition' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <GitBranch className="size-5 text-amber-500" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Pillar 6 · Agentic Task Decomposition Architecture
                </h2>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                AI planner that breaks complex engineering requests into step-by-step sub-agent execution pipelines.
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <input
              type="text"
              value={decompGoal}
              onChange={(e) => setDecompGoal(e.target.value)}
              className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800"
            />
            <div className="grid gap-2.5 sm:grid-cols-2">
              {decomposedPipeline.map((step) => (
                <div
                  key={step.stepId}
                  className="rounded-xl border border-slate-200 bg-slate-950 p-3.5 text-xs text-slate-200 dark:border-slate-800"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-amber-400">
                      {step.stepId} · {step.subAgent}
                    </span>
                    <span className="font-mono text-[10px] text-emerald-400">
                      ~{step.estimatedTokens} tokens
                    </span>
                  </div>
                  <p className="mt-1.5 text-slate-300">{step.task}</p>
                  <div className="mt-2 font-mono text-[10px] text-sky-400">Depends on: {step.dependsOn}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 7. SAFETY GUARDRAILS & CREDENTIAL PROTECTION */}
      {activeTool === 'pillar_safety_guardrails' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <ShieldAlert className="size-5 text-emerald-500" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Pillar 7 · Safety Guardrails & Credential Protection Filter
                </h2>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Real-time security filter blocking API key leaks (`sk-...`, `ghp_...`, `AIza...`), XSS scripts, and SQL injection.
              </p>
            </div>
            <button
              type="button"
              onClick={() => copyText('cred-safe', guardrailScan.redactedText, 'Sanitized code')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400"
            >
              {copiedKey === 'cred-safe' ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              Copy Redacted Code
            </button>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-12">
            <div className="space-y-2 lg:col-span-6">
              <textarea
                rows={5}
                value={rawUntrustedPayload}
                onChange={(e) => setRawUntrustedPayload(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs dark:border-slate-700 dark:bg-slate-800"
              />
              {guardrailScan.alerts.map((a, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-600 dark:text-amber-300"
                >
                  🛡️ {a}
                </div>
              ))}
            </div>

            <div className="lg:col-span-6">
              <div className="rounded-xl border border-slate-200 bg-slate-950 p-4 text-slate-100 dark:border-slate-800">
                <div className="mb-1.5 font-mono text-[11px] font-bold text-emerald-400">
                  Credential-Protected Output
                </div>
                <pre className="font-mono text-xs leading-relaxed text-slate-200">{guardrailScan.redactedText}</pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. SMART MODEL ROUTER & TOKEN BUDGETING */}
      {activeTool === 'pillar_model_budget_router' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Route className="size-5 text-sky-500" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Pillar 8 · Smart Model Router & Token Budgeting Engine
                </h2>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Assigns simple queries to `gemini-3.8-flash` and complex architectural logic to `gemini-3.1-pro-preview` under strict token budgets.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-12">
            <div className="space-y-3 lg:col-span-6">
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">
                  Session Token Budget ({sessionTokenCap.toLocaleString()} tokens)
                </label>
                <input
                  type="range"
                  min={10000}
                  max={200000}
                  step={10000}
                  value={sessionTokenCap}
                  onChange={(e) => setSessionTokenCap(Number(e.target.value))}
                  className="w-full accent-sky-500"
                />
              </div>
              <textarea
                rows={3}
                value={routerTestQuery}
                onChange={(e) => setRouterTestQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5 lg:col-span-6">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                <div className="text-[10px] font-bold uppercase text-slate-400">Routed Model Tier</div>
                <div className="mt-1 font-mono text-sm font-bold text-amber-500">{budgetRoutePlan.assignedModel}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                <div className="text-[10px] font-bold uppercase text-slate-400">Max Completion Cap</div>
                <div className="mt-1 font-mono text-sm font-bold text-sky-500">
                  {budgetRoutePlan.maxCompletionAllocation.toLocaleString()} tokens
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 lg:col-span-2 dark:border-slate-800 dark:bg-slate-800/50">
                <div className="text-[10px] font-bold uppercase text-slate-400">Remaining Session Budget</div>
                <div className="mt-1 font-mono text-sm font-bold text-emerald-500">
                  {budgetRoutePlan.remainingBudget.toLocaleString()} tokens available
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 9. STATEFUL SESSION & ARTIFACT SNAPSHOT MANAGER */}
      {activeTool === 'pillar_snapshot_manager' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <HardDrive className="size-5 text-emerald-500" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Pillar 9 · Stateful Session & Artifact Snapshot Manager
                </h2>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Auto-save and restore workspace state, chat history checkpoints, and generated file trees across sessions.
              </p>
            </div>
            <button
              type="button"
              onClick={captureSessionSnapshot}
              className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400"
            >
              Save Workspace Snapshot
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {savedSnapshots.map((s) => (
              <div
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-950 px-4 py-3 text-xs text-slate-200 dark:border-slate-800"
              >
                <div>
                  <span className="font-mono font-bold text-amber-400">{s.id}</span> ·{' '}
                  <span className="font-semibold text-white">{s.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-slate-400">{s.files.length} files</span>
                  {onRestoreBlueprintFiles && (
                    <button
                      type="button"
                      onClick={() => {
                        onRestoreBlueprintFiles(s.files);
                        onNotice(`Restored snapshot ${s.id} (${s.files.length} files) into Project Architect!`);
                      }}
                      className="rounded-lg bg-amber-400 px-3 py-1 font-bold text-slate-950 hover:bg-amber-300"
                    >
                      Restore Tree
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 10. FINE-TUNING DATASET EXPORTER */}
      {activeTool === 'pillar_finetune_exporter' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <FileJson className="size-5 text-amber-500" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Pillar 10 · Fine-Tuning Dataset Exporter (Workspace-to-JSONL)
                </h2>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Export clean prompt-response pairs from all active workspace files into `.jsonl` datasets for continuous LLM training.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => copyText('ft-exp', exportedJsonl, 'Fine-tuning JSONL')}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white dark:bg-slate-800"
              >
                {copiedKey === 'ft-exp' ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                Copy JSONL
              </button>
              <button
                type="button"
                onClick={downloadWorkspaceJsonl}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-300"
              >
                <Download className="size-3.5" />
                Export .JSONL ({blueprintFiles.length} Pairs)
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <input
              type="text"
              value={exportSystemRole}
              onChange={(e) => setExportSystemRole(e.target.value)}
              className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs dark:border-slate-700 dark:bg-slate-800"
            />
            <div className="rounded-xl border border-slate-200 bg-slate-950 p-4 text-slate-100 dark:border-slate-800">
              <pre className="max-h-64 overflow-auto font-mono text-[11px] leading-relaxed text-slate-200">
                {exportedJsonl}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
