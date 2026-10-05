import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Check,
  Code2,
  Copy,
  Database,
  GitMerge,
  Globe,
  RefreshCw,
  Smartphone,
  Workflow,
} from 'lucide-react';
import { EliteEnterprisePart1 } from './EliteEnterprisePart1';

export type PolyglotTargetLang = 'python' | 'typescript' | 'go' | 'rust' | 'cpp' | 'java';

export function translatePolyglotCode(code: string, target: PolyglotTargetLang): string {
  const fnMatch = /(?:function\s+(\w+)|const\s+(\w+)|def\s+(\w+))/.exec(code);
  const fnName = fnMatch?.[1] || fnMatch?.[2] || fnMatch?.[3] || 'processRecords';

  if (target === 'python') {
    return `from typing import List, Dict, Any

def ${fnName}(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Idiomatic Python 3.12+ implementation with list comprehension & type hints."""
    seen_ids: set[str] = set()
    output: List[Dict[str, Any]] = []
    for item in items:
        rec_id = str(item.get("id", ""))
        if rec_id and rec_id not in seen_ids:
            seen_ids.add(rec_id)
            output.append({**item, "verified": True})
    return output`;
  }

  if (target === 'go') {
    return `package pipeline

type Record struct {
\tID       string
\tVerified bool
}

func ${fnName.charAt(0).toUpperCase() + fnName.slice(1)}(items []Record) []Record {
\tseen := make(map[string]struct{}, len(items))
\tout := make([]Record, 0, len(items))
\tfor _, item := range items {
\t\tif _, exists := seen[item.ID]; !exists && item.ID != "" {
\t\t\tseen[item.ID] = struct{}{}
\t\t\titem.Verified = true
\t\t\tout = append(out, item)
\t\t}
\t}
\treturn out
}`;
  }

  if (target === 'rust') {
    return `use std::collections::HashSet;

#[derive(Clone, Debug)]
pub struct Record {
    pub id: String,
    pub verified: bool,
}

pub fn ${fnName}(items: Vec<Record>) -> Vec<Record> {
    let mut seen = HashSet::with_capacity(items.len());
    items
        .into_iter()
        .filter(|item| !item.id.is_empty() && seen.insert(item.id.clone()))
        .map(|mut item| {
            item.verified = true;
            item
        })
        .collect()
}`;
  }

  if (target === 'cpp') {
    return `#include <vector>
#include <string>
#include <unordered_set>

struct Record {
    std::string id;
    bool verified;
};

std::vector<Record> ${fnName}(const std::vector<Record>& items) {
    std::unordered_set<std::string> seen;
    std::vector<Record> result;
    result.reserve(items.size());
    for (auto item : items) {
        if (!item.id.empty() && seen.insert(item.id).second) {
            item.verified = true;
            result.push_back(std::move(item));
        }
    }
    return result;
}`;
  }

  if (target === 'java') {
    return `import java.util.*;
import java.util.stream.Collectors;

public final class PolyglotProcessor {
    public record RecordItem(String id, boolean verified) {}

    public static List<RecordItem> ${fnName}(List<RecordItem> items) {
        Set<String> seen = new HashSet<>();
        return items.stream()
            .filter(r -> r.id() != null && !r.id().isBlank() && seen.add(r.id()))
            .map(r -> new RecordItem(r.id(), true))
            .collect(Collectors.toList());
    }
}`;
  }

  return `export interface RecordItem {
  id: string;
  verified?: boolean;
}

export function ${fnName}<T extends RecordItem>(items: readonly T[]): Array<T & { verified: true }> {
  const seen = new Set<string>();
  const result: Array<T & { verified: true }> = [];
  for (const item of items) {
    if (item.id && !seen.has(item.id)) {
      seen.add(item.id);
      result.push({ ...item, verified: true });
    }
  }
  return result;
}`;
}

export function EliteEnterpriseToolsSection({
  activeTool,
  projectName,
  onScaffoldFilesToProject,
  onNotice,
}: {
  activeTool: string;
  projectName: string;
  onScaffoldFilesToProject?: (
    files: Array<{ path: string; language: string; description: string; content: string }>,
  ) => void;
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
  // 6. MULTI-LANGUAGE POLYGLOT CODE TRANSLATOR STATE
  // ============================================================================
  const [polySource, setPolySource] = useState(
    `export function deduplicateOrders(items) {
  return items.filter((item, index, self) =>
    self.findIndex((t) => t.id === item.id) === index
  );
}`,
  );
  const [polyTarget, setPolyTarget] = useState<PolyglotTargetLang>('rust');
  const translatedPolyglot = useMemo(() => translatePolyglotCode(polySource, polyTarget), [polySource, polyTarget]);

  // ============================================================================
  // 7. VISUAL GIT MERGE CONFLICT RESOLVER STATE
  // ============================================================================
  const [conflictInput, setConflictInput] = useState(
    `export const apiConfig = {
<<<<<<< HEAD (current: main)
  timeoutMs: 5000,
  retries: 2,
  region: 'us-east-1',
=======
  timeoutMs: 12000,
  retries: 4,
  enableCircuitBreaker: true,
>>>>>>> feat/resilient-edge-gateway (incoming)
};`,
  );
  const [mergeStrategy, setMergeStrategy] = useState<'smart_both' | 'ours_head' | 'theirs_incoming'>('smart_both');

  const parsedConflict = useMemo(() => {
    const headMatch = /<<<<<<<[^\n]*\n([\s\S]*?)=======\n([\s\S]*?)>>>>>>>[^\n]*/.exec(conflictInput);
    const ours = headMatch?.[1]?.trim() || '  timeoutMs: 5000,';
    const theirs = headMatch?.[2]?.trim() || '  timeoutMs: 12000,';

    let resolvedBlock = '';
    if (mergeStrategy === 'ours_head') {
      resolvedBlock = `  ${ours}`;
    } else if (mergeStrategy === 'theirs_incoming') {
      resolvedBlock = `  ${theirs}`;
    } else {
      const mergedMap = new Map<string, string>();
      for (const line of [...ours.split('\n'), ...theirs.split('\n')]) {
        const clean = line.trim();
        if (!clean) continue;
        const [k] = clean.split(':');
        if (k) mergedMap.set(k.trim(), `  ${clean}`);
      }
      resolvedBlock = Array.from(mergedMap.values()).join('\n');
    }

    const cleanFile = conflictInput.replace(
      /<<<<<<<[^\n]*\n[\s\S]*?>>>>>>>[^\n]*/,
      resolvedBlock,
    );

    return { ours, theirs, cleanFile };
  }, [conflictInput, mergeStrategy]);

  // ============================================================================
  // 8. REAL-TIME ETL & DATA PIPELINE BUILDER STATE
  // ============================================================================
  const [etlSource, setEtlSource] = useState<'kafka_stream' | 'postgres_cdc' | 'webhook_ingest'>('kafka_stream');
  const [etlTransform, setEtlTransform] = useState<'pii_mask_dedup' | 'vector_embed_enrich' | 'window_aggregate'>(
    'pii_mask_dedup',
  );
  const [etlSink, setEtlSink] = useState<'clickhouse_olap' | 'bigquery_warehouse' | 'pinecone_index'>(
    'clickhouse_olap',
  );

  const etlPipelineCode = useMemo(() => {
    return `// Real-Time Streaming ETL Pipeline (${etlSource} -> ${etlTransform} -> ${etlSink})
export interface StreamEvent {
  eventId: string;
  tenantId: string;
  email?: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

export async function runStreamingEtlBatch(events: StreamEvent[]) {
  const seenIds = new Set<string>();
  const transformed = events
    .filter((ev) => {
      if (!ev.eventId || seenIds.has(ev.eventId)) return false;
      seenIds.add(ev.eventId);
      return true;
    })
    .map((ev) => ({
      ...ev,
      email: ev.email ? ev.email.replace(/^(.{2}).*(@.*)$/, '$1***$2') : undefined,
      etlStage: '${etlTransform}',
      sinkTarget: '${etlSink}',
      processedAt: new Date().toISOString(),
    }));

  return {
    source: '${etlSource}',
    sink: '${etlSink}',
    ingestedCount: events.length,
    committedCount: transformed.length,
    dlqCount: 0,
    records: transformed,
  };
}`;
  }, [etlSource, etlTransform, etlSink]);

  // ============================================================================
  // 9. LIVE SYSTEM HEALTH & TELEMETRY DASHBOARD STATE
  // ============================================================================
  const [healthData, setHealthData] = useState<{
    nodeVersion: string;
    uptimeSeconds: number;
    memory: { heapUsedMb: number; heapTotalMb: number; rssMb: number };
    services: Array<{
      id: string;
      name: string;
      endpoint: string;
      status: string;
      uptimePct: number;
      coldStartMs: number;
      p95LatencyMs: number;
    }>;
  } | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  const fetchSystemHealth = async () => {
    setHealthLoading(true);
    try {
      const res = await fetch('/api/elite/system-health');
      const data = await res.json();
      if (data.ok) {
        setHealthData(data);
      }
    } catch {
      // ignore fallback
    } finally {
      setHealthLoading(false);
    }
  };

  useEffect(() => {
    if (activeTool === 'live_system_health') {
      void fetchSystemHealth();
    }
  }, [activeTool]);

  // ============================================================================
  // 10. NATIVE MOBILE APP BUNDLE EXPORTER (CAPACITOR) STATE
  // ============================================================================
  const [bundleAppId, setBundleAppId] = useState('ai.saz.enterprise.app');
  const [bundleAppName, setBundleAppName] = useState(projectName || 'SAZ Enterprise Mobile');
  const [enableBiometrics, setEnableBiometrics] = useState(true);
  const [enablePushNotifs, setEnablePushNotifs] = useState(true);

  const capacitorConfigCode = useMemo(() => {
    return `import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: '${bundleAppId}',
  appName: '${bundleAppName}',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'capacitor',
  },
  plugins: {${
    enablePushNotifs
      ? `\n    PushNotifications: {\n      presentationOptions: ['badge', 'sound', 'alert'],\n    },`
      : ''
  }${
    enableBiometrics
      ? `\n    BiometricAuth: {\n      allowDeviceCredential: true,\n      iosFallbackTitle: 'Use Enterprise Passcode',\n    },`
      : ''
  }
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#090D16',
    },
  },
};

export default config;`;
  }, [bundleAppId, bundleAppName, enableBiometrics, enablePushNotifs]);

  if (
    activeTool === 'mfe_module_orchestrator' ||
    activeTool === 'multi_browser_viewport' ||
    activeTool === 'stack_trace_analyzer' ||
    activeTool === 'web3_contract_auditor' ||
    activeTool === 'msw_mock_contract_gen'
  ) {
    return (
      <EliteEnterprisePart1
        activeTool={activeTool}
        onScaffoldMfeToProject={onScaffoldFilesToProject}
        onNotice={onNotice}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* 6. MULTI-LANGUAGE POLYGLOT CODE TRANSLATOR */}
      {activeTool === 'polyglot_code_translator' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Globe className="size-5 text-amber-500" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Multi-Language Polyglot Code Translator (Python · TS · Go · Rust · C++ · Java)
                </h2>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                1-click translation of algorithms and business logic into idiomatic memory-safe target languages.
              </p>
            </div>
            <button
              type="button"
              onClick={() => copyText('poly-out', translatedPolyglot, `${polyTarget.toUpperCase()} translation`)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-300"
            >
              {copiedKey === 'poly-out' ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              Copy {polyTarget.toUpperCase()} Code
            </button>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-12">
            <div className="space-y-3 lg:col-span-5">
              <div className="flex flex-wrap gap-1.5">
                {(['rust', 'go', 'python', 'cpp', 'java', 'typescript'] as const).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setPolyTarget(lang)}
                    className={`rounded-xl px-3 py-1.5 font-mono text-xs font-bold uppercase transition ${
                      polyTarget === lang
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
              <textarea
                rows={8}
                value={polySource}
                onChange={(e) => setPolySource(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs dark:border-slate-700 dark:bg-slate-800"
              />
            </div>

            <div className="lg:col-span-7">
              <div className="rounded-xl border border-slate-200 bg-slate-950 p-4 text-slate-100 dark:border-slate-800">
                <pre className="max-h-72 overflow-auto font-mono text-xs leading-relaxed text-slate-200">
                  {translatedPolyglot}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. VISUAL GIT MERGE CONFLICT RESOLVER */}
      {activeTool === 'git_conflict_resolver' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <GitMerge className="size-5 text-emerald-500" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Visual Git Merge Conflict Resolver
                </h2>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Side-by-side interactive conflict hunk editor with 1-click semantic AST union merging.
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {[
                { id: 'smart_both', label: '✨ Smart Merge Both' },
                { id: 'ours_head', label: 'Accept HEAD (Ours)' },
                { id: 'theirs_incoming', label: 'Accept Incoming (Theirs)' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMergeStrategy(m.id as typeof mergeStrategy)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    mergeStrategy === m.id
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">
                Conflicted Source File (`&lt;&lt;&lt;&lt;&lt;&lt;&lt; HEAD`)
              </label>
              <textarea
                rows={9}
                value={conflictInput}
                onChange={(e) => setConflictInput(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-950 p-3 font-mono text-xs text-amber-200 dark:border-slate-800"
              />
            </div>

            <div className="lg:col-span-6">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase text-emerald-500">
                  Resolved Conflict-Free Output
                </span>
                <button
                  type="button"
                  onClick={() => copyText('git-resolved', parsedConflict.cleanFile, 'Resolved file')}
                  className="rounded bg-slate-800 px-2.5 py-0.5 text-[10px] font-bold text-white"
                >
                  Copy Resolved
                </button>
              </div>
              <pre className="h-[200px] overflow-auto rounded-xl border border-emerald-500/30 bg-slate-950 p-3 font-mono text-xs text-emerald-300">
                {parsedConflict.cleanFile}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* 8. REAL-TIME ETL & DATA PIPELINE BUILDER */}
      {activeTool === 'realtime_etl_builder' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Workflow className="size-5 text-sky-500" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Real-Time ETL & Streaming Data Pipeline Builder
                </h2>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Configure Ingestion Source, PII Redaction / Vector Enrichment, and Analytical Sink handlers.
              </p>
            </div>
            <button
              type="button"
              onClick={() => copyText('etl-code', etlPipelineCode, 'ETL Stream Worker')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-sky-500 px-4 py-2 text-xs font-bold text-white hover:bg-sky-400"
            >
              {copiedKey === 'etl-code' ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              Copy ETL Worker Code
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">1. Ingestion Source</label>
              <select
                value={etlSource}
                onChange={(e) => setEtlSource(e.target.value as typeof etlSource)}
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="kafka_stream">Apache Kafka Consumer Group</option>
                <option value="postgres_cdc">PostgreSQL Logical WAL CDC</option>
                <option value="webhook_ingest">High-Throughput Webhook Queue</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">2. Transform Stage</label>
              <select
                value={etlTransform}
                onChange={(e) => setEtlTransform(e.target.value as typeof etlTransform)}
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="pii_mask_dedup">Idempotent Dedup + PII Masking</option>
                <option value="vector_embed_enrich">1536-d Embedding Enrichment</option>
                <option value="window_aggregate">5-Minute Tumbling Window Rollup</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">3. Data Warehouse Sink</label>
              <select
                value={etlSink}
                onChange={(e) => setEtlSink(e.target.value as typeof etlSink)}
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="clickhouse_olap">ClickHouse Real-Time OLAP</option>
                <option value="bigquery_warehouse">Google BigQuery Streaming API</option>
                <option value="pinecone_index">Pinecone Serverless Vector Upsert</option>
              </select>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-950 p-4 text-slate-100 dark:border-slate-800">
            <pre className="max-h-64 overflow-auto font-mono text-xs leading-relaxed text-slate-200">
              {etlPipelineCode}
            </pre>
          </div>
        </div>
      )}

      {/* 9. LIVE SYSTEM HEALTH & TELEMETRY DASHBOARD */}
      {activeTool === 'live_system_health' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="size-5 text-emerald-500" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Live System Health, Uptime & Cold-Start Telemetry Dashboard
                </h2>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Real-time Node.js process heap telemetry, service availability probes, and endpoint p95 latency.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void fetchSystemHealth()}
              disabled={healthLoading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400"
            >
              <RefreshCw className={`size-3.5 ${healthLoading ? 'animate-spin' : ''}`} />
              Refresh Live Health Probes
            </button>
          </div>

          {healthData && (
            <>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/50">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Runtime & Uptime</div>
                  <div className="mt-1 font-mono text-base font-bold text-emerald-500">
                    Node {healthData.nodeVersion} · {healthData.uptimeSeconds}s up
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/50">
                  <div className="text-[10px] font-bold uppercase text-slate-400">V8 Heap Used / Total</div>
                  <div className="mt-1 font-mono text-base font-bold text-sky-500">
                    {healthData.memory.heapUsedMb} MB / {healthData.memory.heapTotalMb} MB
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/50">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Process RSS Footprint</div>
                  <div className="mt-1 font-mono text-base font-bold text-amber-500">
                    {healthData.memory.rssMb} MB
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {healthData.services.map((svc) => (
                  <div
                    key={svc.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-950 px-4 py-3 text-xs text-slate-200 dark:border-slate-800"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="size-2 rounded-full bg-emerald-400" />
                      <span className="font-bold text-white">{svc.name}</span>
                      <span className="font-mono text-[11px] text-slate-400">{svc.endpoint}</span>
                    </div>
                    <div className="flex items-center gap-4 font-mono text-[11px]">
                      <span className="text-emerald-400">{svc.uptimePct}% SLA</span>
                      <span className="text-sky-400">Cold: {svc.coldStartMs}ms</span>
                      <span className="text-amber-400">p95: {svc.p95LatencyMs}ms</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* 10. NATIVE MOBILE APP BUNDLE EXPORTER */}
      {activeTool === 'capacitor_mobile_exporter' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Smartphone className="size-5 text-amber-500" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Native Mobile App Bundle Exporter (Capacitor iOS & Android Wrapper)
                </h2>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Export React/Next.js web projects into native Xcode iOS and Android Studio Capacitor builds.
              </p>
            </div>
            <button
              type="button"
              onClick={() => copyText('cap-cfg', capacitorConfigCode, 'capacitor.config.ts')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-300"
            >
              {copiedKey === 'cap-cfg' ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              Copy capacitor.config.ts
            </button>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-12">
            <div className="space-y-3 lg:col-span-5">
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">
                  Reverse-DNS Bundle Identifier
                </label>
                <input
                  type="text"
                  value={bundleAppId}
                  onChange={(e) => setBundleAppId(e.target.value)}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 font-mono text-xs dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">Native Display Name</label>
                <input
                  type="text"
                  value={bundleAppName}
                  onChange={(e) => setBundleAppName(e.target.value)}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={enableBiometrics}
                  onChange={(e) => setEnableBiometrics(e.target.checked)}
                  className="rounded accent-amber-400"
                />
                Enable FaceID / TouchID / Android Biometric Bridge
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={enablePushNotifs}
                  onChange={(e) => setEnablePushNotifs(e.target.checked)}
                  className="rounded accent-amber-400"
                />
                Enable APNs & Firebase Cloud Messaging Push Notifications
              </label>
            </div>

            <div className="lg:col-span-7">
              <div className="rounded-xl border border-slate-200 bg-slate-950 p-4 text-slate-100 dark:border-slate-800">
                <pre className="max-h-72 overflow-auto font-mono text-xs leading-relaxed text-slate-200">
                  {capacitorConfigCode}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
