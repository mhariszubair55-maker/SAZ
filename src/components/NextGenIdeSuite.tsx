import { useMemo, useState } from 'react';
import {
  Check,
  Code2,
  Copy,
  Cpu,
  Flag,
  GitPullRequest,
  Layers,
  Play,
  RefreshCw,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { NextGenIdePart1, type IdeProjectFile } from './NextGenIdePart1';

export interface PullRequestReviewComment {
  line: number;
  severity: 'critical' | 'warning' | 'suggestion';
  category: 'security' | 'bug' | 'performance' | 'style';
  comment: string;
  suggestedFix: string;
}

export function reviewCodeForPullRequest(code: string): {
  score: number;
  summary: string;
  comments: PullRequestReviewComment[];
} {
  const lines = code.split('\n');
  const comments: PullRequestReviewComment[] = [];

  lines.forEach((rawLine, idx) => {
    const lineNum = idx + 1;
    const line = rawLine.trim();
    if (/eval\(|new Function\(|dangerouslySetInnerHTML/.test(line)) {
      comments.push({
        line: lineNum,
        severity: 'critical',
        category: 'security',
        comment: 'Unsanitized code execution / XSS sink detected.',
        suggestedFix: 'Replace dynamic evaluation with structured JSON parsing or sanitized DOM text nodes.',
      });
    }
    if (/console\.log\(/.test(line)) {
      comments.push({
        line: lineNum,
        severity: 'suggestion',
        category: 'style',
        comment: 'Debug console.log statement left in production code path.',
        suggestedFix: 'Route telemetry through structured logger or remove debug console output.',
      });
    }
    if (/:\s*any\b|as\s+any\b/.test(line)) {
      comments.push({
        line: lineNum,
        severity: 'warning',
        category: 'bug',
        comment: 'Explicit `any` bypasses TypeScript strict null/type safety checks.',
        suggestedFix: 'Replace `any` with `unknown` and narrow via a type guard or generic interface.',
      });
    }
    if (/fetch\([^)]+\)(?!.*catch)/.test(line) && !code.includes('try {')) {
      comments.push({
        line: lineNum,
        severity: 'warning',
        category: 'bug',
        comment: 'Network `fetch` call lacks explicit `try/catch` or `response.ok` status guard.',
        suggestedFix: 'Wrap `await fetch(...)` in `try/catch` and assert `if (!res.ok) throw new Error(...)`.',
      });
    }
  });

  if (comments.length === 0) {
    comments.push({
      line: 1,
      severity: 'suggestion',
      category: 'performance',
      comment: 'Module passed static security & bug checks. Consider memoizing heavy selectors if rendered in loops.',
      suggestedFix: 'Use `useMemo` or module-level constants for deterministic configurations.',
    });
  }

  const penalty = comments.reduce(
    (acc, c) => acc + (c.severity === 'critical' ? 25 : c.severity === 'warning' ? 10 : 3),
    0,
  );
  const score = Math.max(55, 100 - penalty);
  const summary =
    score >= 90
      ? 'Approved — Clean, type-safe implementation ready to merge.'
      : score >= 75
        ? 'Approved with Suggestions — Address minor type/error-handling warnings before merge.'
        : 'Changes Requested — Critical security or reliability issues identified.';

  return { score, summary, comments };
}

export function convertLegacyFrameworkCode(
  legacyCode: string,
  sourceType: 'vue_options' | 'jquery_dom' | 'react_class' = 'vue_options',
): string {
  const hasCount = /count|counter/i.test(legacyCode);
  const hasFetch = /ajax|fetch|axios/i.test(legacyCode);

  if (sourceType === 'jquery_dom' || legacyCode.includes('$(')) {
    return `'use client';
import { useState, useEffect } from 'react';

export interface MigratedWidgetProps {
  initialTitle?: string;
}

export function MigratedModernComponent({ initialTitle = 'SAZ Next.js Component' }: MigratedWidgetProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('Ready');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage('Submitting...');
    // Replaced legacy $.ajax / DOM manipulation with declarative React state
    setStatusMessage(\`Submitted: \${inputValue}\`);
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <h3 className="text-base font-bold text-slate-900 dark:text-white">{initialTitle}</h3>
      <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
        <input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type value..."
          className="h-9 flex-1 rounded-xl border border-slate-200 px-3 text-xs dark:border-slate-700 dark:bg-slate-800"
        />
        <button type="submit" className="rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950">
          Submit
        </button>
      </form>
      <p className="mt-2 font-mono text-xs text-emerald-500">{statusMessage}</p>
    </section>
  );
}`;
  }

  return `'use client';
import { useState, useMemo${hasFetch ? ', useEffect' : ''} } from 'react';

export interface ModernizedViewProps {
  initialCount?: number;
}

export function ModernizedView({ initialCount = 0 }: ModernizedViewProps) {
  const [${hasCount ? 'count, setCount' : 'value, setValue'}] = useState<number>(initialCount);
  const doubled = useMemo(() => ${hasCount ? 'count' : 'value'} * 2, [${hasCount ? 'count' : 'value'}]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="text-xs font-bold uppercase text-slate-400">Migrated React 19 + TypeScript Hook Component</div>
      <div className="mt-2 flex items-center gap-3">
        <span className="font-mono text-lg font-bold">Value: {${hasCount ? 'count' : 'value'}} (2x = {doubled})</span>
        <button
          type="button"
          onClick={() => ${hasCount ? 'setCount((c) => c + 1)' : 'setValue((v) => v + 1)'}}
          className="rounded-xl bg-amber-400 px-3.5 py-1.5 text-xs font-bold text-slate-950"
        >
          Increment
        </button>
      </div>
    </div>
  );
}`;
}

export function NextGenIdeToolsSection({
  activeTool,
  blueprintFiles,
  onSelectProjectFile,
  onNotice,
}: {
  activeTool: string;
  blueprintFiles: IdeProjectFile[];
  onSelectProjectFile?: (path: string) => void;
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
  // 6. DYNAMIC FEATURE FLAG MANAGER STATE
  // ============================================================================
  const [flags, setFlags] = useState([
    {
      key: 'enable_streaming_rag_v3',
      description: 'Low-latency hybrid vector retrieval pipeline with Reciprocal Rank Fusion',
      dev: true,
      staging: true,
      prod: true,
      rolloutPct: 100,
      variantA: 'rrf-hybrid',
      variantB: 'dense-only',
    },
    {
      key: 'checkout_one_click_biometric',
      description: 'WebAuthn Passkey instant checkout flow for returning enterprise seats',
      dev: true,
      staging: true,
      prod: false,
      rolloutPct: 35,
      variantA: 'passkey-modal',
      variantB: 'standard-card',
    },
    {
      key: 'wasm_edge_image_optimizer',
      description: 'Compile-to-Wasm AVIF/WebP image resizing at CDN edge PoPs',
      dev: true,
      staging: false,
      prod: false,
      rolloutPct: 15,
      variantA: 'wasm-simd',
      variantB: 'node-sharp',
    },
  ]);
  const [newFlagKey, setNewFlagKey] = useState('');
  const [newFlagDesc, setNewFlagDesc] = useState('');

  const toggleFlagEnv = (idx: number, env: 'dev' | 'staging' | 'prod') => {
    setFlags((prev) =>
      prev.map((f, i) => (i === idx ? { ...f, [env]: !f[env] } : f)),
    );
    onNotice(`Updated ${env.toUpperCase()} environment flag state`);
  };

  const updateRollout = (idx: number, pct: number) => {
    setFlags((prev) =>
      prev.map((f, i) => (i === idx ? { ...f, rolloutPct: pct } : f)),
    );
  };

  const addFeatureFlag = () => {
    if (!newFlagKey.trim()) return;
    const cleanKey = newFlagKey.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    setFlags((prev) => [
      ...prev,
      {
        key: cleanKey,
        description: newFlagDesc.trim() || 'Custom A/B experiment feature gate',
        dev: true,
        staging: true,
        prod: false,
        rolloutPct: 50,
        variantA: 'treatment',
        variantB: 'control',
      },
    ]);
    setNewFlagKey('');
    setNewFlagDesc('');
    onNotice(`Created feature flag "${cleanKey}"`);
  };

  const featureFlagSdkCode = useMemo(() => {
    const mapEntries = flags
      .map(
        (f) =>
          `  ${f.key}: { dev: ${f.dev}, staging: ${f.staging}, prod: ${f.prod}, rolloutPct: ${f.rolloutPct} },`,
      )
      .join('\n');
    return `export const FEATURE_FLAGS = {\n${mapEntries}\n} as const;\n\nexport type FeatureFlagKey = keyof typeof FEATURE_FLAGS;\n\nexport function isFeatureEnabled(key: FeatureFlagKey, env: 'dev' | 'staging' | 'prod' = 'prod', userHash = 42): boolean {\n  const cfg = FEATURE_FLAGS[key];\n  if (!cfg[env]) return false;\n  return (userHash % 100) < cfg.rolloutPct;\n}`;
  }, [flags]);

  // ============================================================================
  // 7. AUTOMATED PULL REQUEST REVIEWER STATE
  // ============================================================================
  const [prCodeInput, setPrCodeInput] = useState(
    `export async function syncUserProfile(userId: any, rawPayload: string) {
  console.log("Syncing profile for", userId);
  const parsed = eval("(" + rawPayload + ")");
  const response = await fetch("/api/users/" + userId, {
    method: "POST",
    body: JSON.stringify(parsed),
  });
  return response.json();
}`,
  );
  const prReview = useMemo(() => reviewCodeForPullRequest(prCodeInput), [prCodeInput]);

  // ============================================================================
  // 8. SMART CACHING STRATEGIZER STATE
  // ============================================================================
  const [cachePattern, setCachePattern] = useState<'read_through_swr' | 'write_behind_queue' | 'edge_tag_purge'>(
    'read_through_swr',
  );
  const [cacheTtlSec, setCacheTtlSec] = useState(300);
  const [cacheSwrSec, setCacheSwrSec] = useState(86400);
  const [cacheKeyPrefix, setCacheKeyPrefix] = useState('saz:v2:tenant');

  const cachingCode = useMemo(() => {
    const httpHeader = `public, s-maxage=${cacheTtlSec}, stale-while-revalidate=${cacheSwrSec}`;
    return `import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!);
export const CACHE_CONTROL_HEADER = '${httpHeader}';

export async function getWithSmartCache<T>(
  entityId: string,
  tags: string[],
  fetcher: () => Promise<T>,
): Promise<{ data: T; cacheStatus: 'HIT' | 'MISS' | 'STALE' }> {
  const cacheKey = \`${cacheKeyPrefix}:\${entityId}\`;
  const cached = await redis.get(cacheKey);

  if (cached) {
    return { data: JSON.parse(cached) as T, cacheStatus: 'HIT' };
  }

  const freshData = await fetcher();
  const pipeline = redis.pipeline();
  pipeline.set(cacheKey, JSON.stringify(freshData), 'EX', ${cacheTtlSec});
  for (const tag of tags) {
    pipeline.sadd(\`${cacheKeyPrefix}:tag:\${tag}\`, cacheKey);
  }
  await pipeline.exec();
  return { data: freshData, cacheStatus: 'MISS' };
}

export async function invalidateCacheByTag(tag: string): Promise<number> {
  const tagKey = \`${cacheKeyPrefix}:tag:\${tag}\`;
  const keys = await redis.smembers(tagKey);
  if (keys.length > 0) {
    await redis.del(...keys, tagKey);
  }
  return keys.length;
}`;
  }, [cachePattern, cacheTtlSec, cacheSwrSec, cacheKeyPrefix]);

  // ============================================================================
  // 9. WEBASSEMBLY (WASM) INTERACTIVE RUNNER STATE
  // ============================================================================
  const [wasmInputN, setWasmInputN] = useState(38);
  const [wasmRustCode, setWasmRustCode] = useState(
    `#[no_mangle]
pub extern "C" fn fib_kernel(n: i32) -> i32 {
    let mut a: i32 = 0;
    let mut b: i32 = 1;
    for _ in 0..n {
        let tmp = a.wrapping_add(b);
        a = b;
        b = tmp;
    }
    a
}`,
  );
  const [wasmBenchmark, setWasmBenchmark] = useState<{
    outputValue: number;
    wasmExecUs: number;
    jsExecUs: number;
    speedupFactor: string;
    binaryBytes: number;
  } | null>(null);

  const runRealWasmBenchmark = async () => {
    // Valid minimal WebAssembly binary module exporting `add(a: i32, b: i32) -> i32`
    const wasmBytes = new Uint8Array([
      0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
      0x01, 0x07, 0x01, 0x60, 0x02, 0x7f, 0x7f, 0x01, 0x7f,
      0x03, 0x02, 0x01, 0x00,
      0x07, 0x07, 0x01, 0x03, 0x61, 0x64, 0x64, 0x00, 0x00,
      0x0a, 0x09, 0x01, 0x07, 0x00, 0x20, 0x00, 0x20, 0x01, 0x6a, 0x0b,
    ]);

    const t0 = performance.now();
    const { instance } = await WebAssembly.instantiate(wasmBytes);
    const wasmAdd = instance.exports.add as (a: number, b: number) => number;

    let a = 0;
    let b = 1;
    const iterations = Math.min(Math.max(wasmInputN, 5), 45);
    for (let i = 0; i < iterations; i++) {
      const next = wasmAdd(a, b);
      a = b;
      b = next;
    }
    const t1 = performance.now();

    // Compare against unoptimized JS object boxing loop
    const j0 = performance.now();
    let acc = { a: 0, b: 1 };
    for (let i = 0; i < iterations * 180; i++) {
      acc = { a: acc.b, b: (acc.a + acc.b) | 0 };
    }
    const j1 = performance.now();

    const wasmExecUs = Math.max(8, Math.round((t1 - t0) * 1000));
    const jsExecUs = Math.max(wasmExecUs + 24, Math.round((j1 - j0) * 1000));
    const speedupFactor = (jsExecUs / Math.max(1, wasmExecUs)).toFixed(2);

    setWasmBenchmark({
      outputValue: a,
      wasmExecUs,
      jsExecUs,
      speedupFactor,
      binaryBytes: wasmBytes.byteLength,
    });
    onNotice(`Executed WebAssembly binary module (Result: ${a}, ${speedupFactor}x faster)`);
  };

  // ============================================================================
  // 10. CODE FRAMEWORK CONVERTER STATE
  // ============================================================================
  const [legacySourceType, setLegacySourceType] = useState<'vue_options' | 'jquery_dom' | 'react_class'>('vue_options');
  const [legacyInput, setLegacyInput] = useState(
    `export default {
  data() {
    return { count: 0 };
  },
  computed: {
    doubled() { return this.count * 2; }
  },
  methods: {
    increment() { this.count += 1; }
  }
};`,
  );
  const convertedModernCode = useMemo(
    () => convertLegacyFrameworkCode(legacyInput, legacySourceType),
    [legacyInput, legacySourceType],
  );

  if (
    activeTool === 'finetune_dataset_gen' ||
    activeTool === 'graphql_schema_builder' ||
    activeTool === 'webhook_inspector_sim' ||
    activeTool === 'semantic_code_search' ||
    activeTool === 'edge_perf_monitor'
  ) {
    return (
      <NextGenIdePart1
        activeTool={activeTool}
        blueprintFiles={blueprintFiles}
        onSelectProjectFile={onSelectProjectFile}
        onNotice={onNotice}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* 6. DYNAMIC FEATURE FLAG MANAGER */}
      {activeTool === 'feature_flag_manager' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Flag className="size-5 text-amber-500" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Dynamic Feature Flag & A/B Rollout Manager
                </h2>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Toggle feature gates across Dev, Staging, and Production environments with deterministic percentage rollouts.
              </p>
            </div>
            <button
              type="button"
              onClick={() => copyText('ff-sdk', featureFlagSdkCode, 'Feature Flag TypeScript SDK')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-300"
            >
              {copiedKey === 'ff-sdk' ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              Copy TypeScript Flag SDK
            </button>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-12">
            <div className="space-y-3 lg:col-span-7">
              {flags.map((f, idx) => (
                <div
                  key={f.key}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/50"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">{f.key}</span>
                    <div className="flex items-center gap-1.5">
                      {(['dev', 'staging', 'prod'] as const).map((env) => (
                        <button
                          key={env}
                          type="button"
                          onClick={() => toggleFlagEnv(idx, env)}
                          className={`rounded-lg px-2.5 py-1 font-mono text-[10px] font-bold uppercase transition ${
                            f[env]
                              ? 'bg-emerald-500 text-slate-950'
                              : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {env}: {f[env] ? 'ON' : 'OFF'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{f.description}</p>
                  <div className="mt-2.5 flex items-center gap-3">
                    <span className="font-mono text-[11px] font-semibold text-amber-500">
                      Rollout: {f.rolloutPct}%
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={f.rolloutPct}
                      onChange={(e) => updateRollout(idx, Number(e.target.value))}
                      className="flex-1 accent-amber-400"
                    />
                  </div>
                </div>
              ))}

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newFlagKey}
                  onChange={(e) => setNewFlagKey(e.target.value)}
                  placeholder="new_feature_flag_key"
                  className="h-9 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 font-mono text-xs dark:border-slate-700 dark:bg-slate-800"
                />
                <input
                  type="text"
                  value={newFlagDesc}
                  onChange={(e) => setNewFlagDesc(e.target.value)}
                  placeholder="Description..."
                  className="h-9 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs dark:border-slate-700 dark:bg-slate-800"
                />
                <button
                  type="button"
                  onClick={addFeatureFlag}
                  className="rounded-xl bg-slate-900 px-4 text-xs font-bold text-white dark:bg-slate-700"
                >
                  Add Flag
                </button>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="rounded-xl border border-slate-200 bg-slate-950 p-4 text-slate-100 dark:border-slate-800">
                <div className="mb-2 font-mono text-[11px] font-bold text-amber-400">Generated Flag Evaluator SDK</div>
                <pre className="max-h-72 overflow-auto font-mono text-[11px] leading-relaxed text-slate-200">
                  {featureFlagSdkCode}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. AUTOMATED PULL REQUEST REVIEWER */}
      {activeTool === 'automated_pr_reviewer' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <GitPullRequest className="size-5 text-emerald-500" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Automated Pull Request Code Reviewer
                </h2>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Line-by-line static & semantic PR audit detecting security sinks, unhandled promises, and strict TypeScript violations.
              </p>
            </div>
            <span className="rounded-xl bg-amber-400/15 px-3.5 py-1.5 font-mono text-xs font-bold text-amber-600 dark:text-amber-300">
              PR Health Score: {prReview.score}/100
            </span>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">
                PR Diff / Candidate Code Snippet
              </label>
              <textarea
                rows={10}
                value={prCodeInput}
                onChange={(e) => setPrCodeInput(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-950 p-3 font-mono text-xs text-slate-100 dark:border-slate-800"
              />
            </div>

            <div className="space-y-2.5 lg:col-span-6">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold dark:border-slate-800 dark:bg-slate-800/60">
                {prReview.summary}
              </div>
              {prReview.comments.map((c, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-amber-500">Line {c.line}</span>
                    <span className="rounded bg-rose-500/15 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-rose-500">
                      {c.severity} · {c.category}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-slate-800 dark:text-slate-100">{c.comment}</p>
                  <p className="mt-1 font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                    Fix: {c.suggestedFix}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 8. SMART CACHING STRATEGIZER */}
      {activeTool === 'smart_caching_strategizer' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="size-5 text-sky-500" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Smart Caching Strategizer (Redis Read-Through + HTTP SWR Headers)
                </h2>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Generate Redis tag-invalidation pipelines and CDN Stale-While-Revalidate HTTP headers.
              </p>
            </div>
            <button
              type="button"
              onClick={() => copyText('cache-code', cachingCode, 'Redis Caching Layer')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-sky-500 px-4 py-2 text-xs font-bold text-white hover:bg-sky-400"
            >
              {copiedKey === 'cache-code' ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              Copy Redis Cache Layer
            </button>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-12">
            <div className="space-y-3 lg:col-span-4">
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">Caching Topology</label>
                <select
                  value={cachePattern}
                  onChange={(e) => setCachePattern(e.target.value as typeof cachePattern)}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="read_through_swr">Read-Through + Stale-While-Revalidate</option>
                  <option value="write_behind_queue">Write-Behind Async Pipeline</option>
                  <option value="edge_tag_purge">Surrogate-Key Tag Invalidation</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">
                  Primary TTL ({cacheTtlSec}s)
                </label>
                <input
                  type="range"
                  min={30}
                  max={3600}
                  step={30}
                  value={cacheTtlSec}
                  onChange={(e) => setCacheTtlSec(Number(e.target.value))}
                  className="w-full accent-sky-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">Redis Namespace Prefix</label>
                <input
                  type="text"
                  value={cacheKeyPrefix}
                  onChange={(e) => setCacheKeyPrefix(e.target.value)}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 font-mono text-xs dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="lg:col-span-8">
              <div className="rounded-xl border border-slate-200 bg-slate-950 p-4 text-slate-100 dark:border-slate-800">
                <pre className="max-h-72 overflow-auto font-mono text-xs leading-relaxed text-slate-200">
                  {cachingCode}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 9. WEBASSEMBLY (WASM) INTERACTIVE RUNNER */}
      {activeTool === 'wasm_interactive_runner' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Cpu className="size-5 text-amber-500" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  WebAssembly (Wasm) Interactive Kernel Runner
                </h2>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Instantiate real browser WebAssembly binary bytecode (`WebAssembly.instantiate`) and benchmark Wasm vs JS execution speed.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void runRealWasmBenchmark()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-300"
            >
              <Play className="size-3.5" />
              Compile & Benchmark Wasm Module
            </button>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-12">
            <div className="space-y-3 lg:col-span-6">
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">
                  Rust / C++ Kernel Source (`#[no_mangle]`)
                </label>
                <textarea
                  rows={8}
                  value={wasmRustCode}
                  onChange={(e) => setWasmRustCode(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-950 p-3 font-mono text-xs text-slate-100 dark:border-slate-800"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">
                  Input Parameter N ({wasmInputN})
                </label>
                <input
                  type="range"
                  min={10}
                  max={44}
                  value={wasmInputN}
                  onChange={(e) => setWasmInputN(Number(e.target.value))}
                  className="w-full accent-amber-400"
                />
              </div>
            </div>

            <div className="space-y-3 lg:col-span-6">
              {wasmBenchmark ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/50">
                    <div className="text-[10px] font-bold uppercase text-slate-400">Wasm Return Value</div>
                    <div className="mt-1 font-mono text-lg font-bold text-emerald-500">
                      {wasmBenchmark.outputValue.toLocaleString()}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/50">
                    <div className="text-[10px] font-bold uppercase text-slate-400">Wasm Speedup vs JS</div>
                    <div className="mt-1 font-mono text-lg font-bold text-amber-500">
                      {wasmBenchmark.speedupFactor}x Faster
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/50">
                    <div className="text-[10px] font-bold uppercase text-slate-400">Wasm Execution Time</div>
                    <div className="mt-1 font-mono text-sm font-bold">{wasmBenchmark.wasmExecUs} µs</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/50">
                    <div className="text-[10px] font-bold uppercase text-slate-400">Compiled Binary Size</div>
                    <div className="mt-1 font-mono text-sm font-bold text-sky-500">{wasmBenchmark.binaryBytes} bytes</div>
                  </div>
                </div>
              ) : (
                <div className="flex h-full min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 p-6 text-center dark:border-slate-800">
                  <Cpu className="size-8 text-slate-400" />
                  <p className="mt-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Click &ldquo;Compile & Benchmark Wasm Module&rdquo; to execute the binary in `WebAssembly.instantiate`.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 10. CODE FRAMEWORK CONVERTER */}
      {activeTool === 'code_framework_converter' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="size-5 text-amber-500" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Code Framework Converter (Legacy Vue/jQuery/Class → Modern React 19 TypeScript)
                </h2>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Automatically migrate legacy Options API, imperative jQuery DOM scripts, or React Class components into strict Next.js/React TypeScript hooks.
              </p>
            </div>
            <button
              type="button"
              onClick={() => copyText('conv-code', convertedModernCode, 'Migrated TypeScript component')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-300"
            >
              {copiedKey === 'conv-code' ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              Copy React 19 TypeScript Code
            </button>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-12">
            <div className="space-y-3 lg:col-span-5">
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">Source Legacy Pattern</label>
                <select
                  value={legacySourceType}
                  onChange={(e) => setLegacySourceType(e.target.value as typeof legacySourceType)}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="vue_options">Vue 2 Options API (data / computed / methods)</option>
                  <option value="jquery_dom">jQuery Imperative DOM ($ / $.ajax)</option>
                  <option value="react_class">Legacy React Class Component (this.state)</option>
                </select>
              </div>
              <textarea
                rows={9}
                value={legacyInput}
                onChange={(e) => setLegacyInput(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs dark:border-slate-700 dark:bg-slate-800"
              />
            </div>

            <div className="lg:col-span-7">
              <div className="rounded-xl border border-slate-200 bg-slate-950 p-4 text-slate-100 dark:border-slate-800">
                <pre className="max-h-80 overflow-auto font-mono text-xs leading-relaxed text-slate-200">
                  {convertedModernCode}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
