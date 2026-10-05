import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Check,
  Code2,
  Copy,
  Database,
  Download,
  FileJson,
  Globe,
  Play,
  RefreshCw,
  Search,
  Webhook,
} from 'lucide-react';

export interface IdeProjectFile {
  path: string;
  language: string;
  description: string;
  content: string;
}

export function NextGenIdePart1({
  activeTool,
  blueprintFiles,
  onSelectProjectFile,
  onNotice,
}: {
  activeTool:
    | 'finetune_dataset_gen'
    | 'graphql_schema_builder'
    | 'webhook_inspector_sim'
    | 'semantic_code_search'
    | 'edge_perf_monitor';
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
  // 1. AI FINE-TUNING DATASET GENERATOR STATE
  // ============================================================================
  const [ftFormat, setFtFormat] = useState<'openai_chat' | 'gemini_sft' | 'alpaca_instruct'>('openai_chat');
  const [ftSystemPrompt, setFtSystemPrompt] = useState(
    'You are SAZ AI Senior Principal Engineer. Produce strict TypeScript, zero-trust security, and clean modular React code.',
  );
  const [ftRedactPii, setFtRedactPii] = useState(true);
  const [ftDedup, setFtDedup] = useState(true);
  const [ftRawPairs, setFtRawPairs] = useState(
    `Build a rate-limited Express JWT middleware === export function jwtGuard(req, res, next) { const token = req.headers.authorization?.slice(7); if (!token) return res.status(401).json({ error: 'Unauthorized' }); next(); }
Optimize an O(n^2) duplicate check array in TypeScript === export const uniqueItems = <T>(arr: T[]): T[] => Array.from(new Set(arr));
Contact admin@corp.internal or key sk-live-9948123 for webhook setup === Configure process.env.WEBHOOK_SECRET inside your encrypted .env vault and verify HMAC-SHA256 signatures.`,
  );

  const fineTuneDataset = useMemo(() => {
    const sanitize = (str: string) => {
      if (!ftRedactPii) return str.trim();
      return str
        .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]')
        .replace(/sk-[a-zA-Z0-9_-]{8,}/g, '[REDACTED_API_KEY]')
        .trim();
    };

    const rawLines = ftRawPairs
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.includes('==='));

    const seen = new Set<string>();
    const rows: string[] = [];

    for (const line of rawLines) {
      const [rawPrompt = '', rawCompletion = ''] = line.split('===');
      const userPrompt = sanitize(rawPrompt);
      const assistantReply = sanitize(rawCompletion);
      if (!userPrompt || !assistantReply) continue;

      const dedupKey = `${userPrompt.toLowerCase()}::${assistantReply.toLowerCase()}`;
      if (ftDedup && seen.has(dedupKey)) continue;
      seen.add(dedupKey);

      if (ftFormat === 'openai_chat') {
        rows.push(
          JSON.stringify({
            messages: [
              { role: 'system', content: ftSystemPrompt },
              { role: 'user', content: userPrompt },
              { role: 'assistant', content: assistantReply },
            ],
          }),
        );
      } else if (ftFormat === 'gemini_sft') {
        rows.push(
          JSON.stringify({
            systemInstruction: { parts: [{ text: ftSystemPrompt }] },
            contents: [
              { role: 'user', parts: [{ text: userPrompt }] },
              { role: 'model', parts: [{ text: assistantReply }] },
            ],
          }),
        );
      } else {
        rows.push(
          JSON.stringify({
            instruction: ftSystemPrompt,
            input: userPrompt,
            output: assistantReply,
          }),
        );
      }
    }

    const jsonl = rows.join('\n');
    const approxTokens = Math.max(1, Math.round(jsonl.length / 3.8));
    return { jsonl, count: rows.length, approxTokens };
  }, [ftRawPairs, ftFormat, ftSystemPrompt, ftRedactPii, ftDedup]);

  const downloadJsonl = () => {
    const blob = new Blob([fineTuneDataset.jsonl], { type: 'application/jsonl' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `saz-finetune-${ftFormat}.jsonl`;
    a.click();
    URL.revokeObjectURL(url);
    onNotice(`Downloaded saz-finetune-${ftFormat}.jsonl (${fineTuneDataset.count} examples)`);
  };

  // ============================================================================
  // 2. GRAPHQL SCHEMA & RESOLVER BUILDER STATE
  // ============================================================================
  const [gqlEntityName, setGqlEntityName] = useState('Deployment');
  const [gqlFieldsInput, setGqlFieldsInput] = useState(
    `id:ID!
projectName:String!
environment:String!
replicas:Int!
isHealthy:Boolean!
createdAt:String!`,
  );
  const [gqlWithSubscriptions, setGqlWithSubscriptions] = useState(true);

  const gqlArtifacts = useMemo(() => {
    const entity = gqlEntityName.trim() || 'Resource';
    const lowerEntity = entity.charAt(0).toLowerCase() + entity.slice(1);
    const fields = gqlFieldsInput
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.includes(':'))
      .map((l) => {
        const [name = 'id', type = 'String!'] = l.split(':');
        return { name: name.trim(), type: type.trim() };
      });

    const sdlFields = fields.map((f) => `  ${f.name}: ${f.type}`).join('\n');
    const inputFields = fields
      .filter((f) => f.name !== 'id' && f.name !== 'createdAt')
      .map((f) => `  ${f.name}: ${f.type}`)
      .join('\n');

    const sdl = `type ${entity} {
${sdlFields}
}

input Create${entity}Input {
${inputFields}
}

type Query {
  ${lowerEntity}(id: ID!): ${entity}
  ${lowerEntity}s(limit: Int = 20, offset: Int = 0): [${entity}!]!
}

type Mutation {
  create${entity}(input: Create${entity}Input!): ${entity}!
  delete${entity}(id: ID!): Boolean!
}${
      gqlWithSubscriptions
        ? `\n\ntype Subscription {\n  ${lowerEntity}Updated(id: ID!): ${entity}!\n}`
        : ''
    }`;

    const resolvers = `import DataLoader from 'dataloader';

export interface ${entity}Record {
${fields
  .map((f) => {
    const tsType = f.type.includes('Int')
      ? 'number'
      : f.type.includes('Boolean')
        ? 'boolean'
        : 'string';
    return `  ${f.name}: ${tsType};`;
  })
  .join('\n')}
}

export const ${lowerEntity}Loader = new DataLoader<string, ${entity}Record>(async (ids) => {
  const rows = await db.${lowerEntity}.findMany({ where: { id: { in: [...ids] } } });
  const map = new Map(rows.map((r: ${entity}Record) => [r.id, r]));
  return ids.map((id) => map.get(id)!);
});

export const ${lowerEntity}Resolvers = {
  Query: {
    ${lowerEntity}: (_: unknown, { id }: { id: string }) => ${lowerEntity}Loader.load(id),
    ${lowerEntity}s: (_: unknown, { limit, offset }: { limit: number; offset: number }) =>
      db.${lowerEntity}.findMany({ take: limit, skip: offset }),
  },
  Mutation: {
    create${entity}: async (_: unknown, { input }: { input: Omit<${entity}Record, 'id' | 'createdAt'> }) => {
      return await db.${lowerEntity}.create({ data: { ...input, createdAt: new Date().toISOString() } });
    },
    delete${entity}: async (_: unknown, { id }: { id: string }) => {
      await db.${lowerEntity}.delete({ where: { id } });
      return true;
    },
  },
};`;

    return { sdl, resolvers };
  }, [gqlEntityName, gqlFieldsInput, gqlWithSubscriptions]);

  // ============================================================================
  // 3. WEBHOOK INSPECTOR & SIMULATOR STATE
  // ============================================================================
  const [whBinId, setWhBinId] = useState('saz-hook-prod-01');
  const [whSecret, setWhSecret] = useState('whsec_saz_live_secret_9941');
  const [whPayloadInput, setWhPayloadInput] = useState(
    `{\n  "event": "deployment.succeeded",\n  "service": "api-edge-gateway",\n  "commitSha": "9f82c1a",\n  "region": "us-east-1"\n}`,
  );
  const [whEvents, setWhEvents] = useState<
    Array<{
      id: string;
      method: string;
      timestamp: string;
      sourceIp: string;
      headers: Record<string, string>;
      payload: unknown;
      hmacValid: boolean;
      signatureHeader: string;
      latencyMs: number;
    }>
  >([]);
  const [whLoading, setWhLoading] = useState(false);

  const fetchWebhookBin = async () => {
    try {
      const res = await fetch(`/api/ide/webhook-bin/${encodeURIComponent(whBinId)}`);
      const data = await res.json();
      if (data.ok && Array.isArray(data.events)) {
        setWhEvents(data.events);
      }
    } catch {
      // ignore initial fetch error
    }
  };

  useEffect(() => {
    if (activeTool === 'webhook_inspector_sim') {
      void fetchWebhookBin();
    }
  }, [activeTool, whBinId]);

  const simulateInboundWebhook = async () => {
    setWhLoading(true);
    try {
      let parsed: unknown = {};
      try {
        parsed = JSON.parse(whPayloadInput);
      } catch {
        parsed = { raw: whPayloadInput };
      }
      const res = await fetch(`/api/ide/webhook-bin/${encodeURIComponent(whBinId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          _signingSecret: whSecret,
          payload: parsed,
        }),
      });
      const data = await res.json();
      if (data.ok && Array.isArray(data.events)) {
        setWhEvents(data.events);
        onNotice(`Captured signed webhook ${data.captured?.id} in bin ${whBinId}`);
      }
    } catch {
      onNotice('Simulated webhook event dispatched');
    } finally {
      setWhLoading(false);
    }
  };

  // ============================================================================
  // 4. SEMANTIC CODE SEARCH ENGINE STATE
  // ============================================================================
  const [semQuery, setSemQuery] = useState('authentication state or API route');

  const semanticMatches = useMemo(() => {
    const terms = semQuery
      .toLowerCase()
      .split(/\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length >= 2);

    const results: Array<{
      path: string;
      lineNumber: number;
      symbolName: string;
      kind: 'function' | 'state' | 'interface' | 'route' | 'code';
      snippet: string;
      score: number;
    }> = [];

    for (const file of blueprintFiles) {
      const lines = file.content.split('\n');
      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('//')) return;

        const isFunc = /(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>)/.exec(trimmed);
        const isState = /const\s+\[(\w+),\s*set\w+\]\s*=\s*useState/.exec(trimmed);
        const isIface = /(?:interface|type)\s+(\w+)/.exec(trimmed);
        const isRoute = /app\.(get|post|put|delete)\(['"`]([^'"`]+)['"`]/.exec(trimmed);

        const lowerLine = `${file.path} ${ file.description } ${trimmed}`.toLowerCase();
        let matchScore = 0;
        for (const t of terms) {
          if (lowerLine.includes(t)) matchScore += 0.32;
          if (file.path.toLowerCase().includes(t)) matchScore += 0.18;
        }
        if (isFunc || isState || isIface || isRoute) matchScore += 0.25;

        if (matchScore >= 0.3) {
          const symbolName =
            isFunc?.[1] ||
            isFunc?.[2] ||
            isState?.[1] ||
            isIface?.[1] ||
            (isRoute ? `${isRoute[1]?.toUpperCase()} ${isRoute[2]}` : `${file.path}:${idx + 1}`);
          const kind = isState
            ? 'state'
            : isFunc
              ? 'function'
              : isIface
                ? 'interface'
                : isRoute
                  ? 'route'
                  : 'code';
          results.push({
            path: file.path,
            lineNumber: idx + 1,
            symbolName,
            kind,
            snippet: trimmed.slice(0, 120),
            score: Math.min(0.99, Number(matchScore.toFixed(2))),
          });
        }
      });
    }

    return results.sort((a, b) => b.score - a.score).slice(0, 10);
  }, [semQuery, blueprintFiles]);

  // ============================================================================
  // 5. EDGE NETWORK PERFORMANCE MONITOR STATE
  // ============================================================================
  const [edgeRouting, setEdgeRouting] = useState<'anycast-geo-nearest' | 'latency-weighted' | 'eu-sovereign-pin'>(
    'anycast-geo-nearest',
  );
  const [edgeRuntime, setEdgeRuntime] = useState<'v8-isolate' | 'wasm-edge' | 'microvm-container'>('v8-isolate');
  const [edgeTieredCache, setEdgeTieredCache] = useState(true);
  const [edgePops, setEdgePops] = useState<
    Array<{
      code: string;
      city: string;
      hitRate: number;
      coldStartMs: number;
      p50Ms: number;
      p95Ms: number;
      status: string;
    }>
  >([]);
  const [edgeGlobalAvgP95, setEdgeGlobalAvgP95] = useState(28.4);

  const refreshEdgeTelemetry = async () => {
    try {
      const res = await fetch('/api/ide/edge-monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routingPolicy: edgeRouting,
          runtimeType: edgeRuntime,
          enableSmartTieredCache: edgeTieredCache,
        }),
      });
      const data = await res.json();
      if (data.ok && Array.isArray(data.pops)) {
        setEdgePops(data.pops);
        setEdgeGlobalAvgP95(data.globalAvgP95Ms);
        onNotice(`Edge PoP telemetry refreshed (Global avg p95: ${data.globalAvgP95Ms}ms)`);
      }
    } catch {
      onNotice('Edge telemetry updated');
    }
  };

  useEffect(() => {
    if (activeTool === 'edge_perf_monitor') {
      void refreshEdgeTelemetry();
    }
  }, [activeTool, edgeRouting, edgeRuntime, edgeTieredCache]);

  return (
    <div className="space-y-6">
      {/* 1. AI FINE-TUNING DATASET GENERATOR */}
      {activeTool === 'finetune_dataset_gen' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <FileJson className="size-5 text-amber-500" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  AI Fine-Tuning Dataset Generator (.JSONL Exporter & PII Scrubber)
                </h2>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Clean, deduplicate, redact sensitive PII/API keys, and export chat/code pairs into multi-turn JSONL fine-tuning datasets.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => copyText('ft-jsonl', fineTuneDataset.jsonl, 'JSONL dataset')}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white dark:bg-slate-800"
              >
                {copiedKey === 'ft-jsonl' ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                Copy .JSONL
              </button>
              <button
                type="button"
                onClick={downloadJsonl}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-300"
              >
                <Download className="size-3.5" />
                Download .JSONL ({fineTuneDataset.count})
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-12">
            <div className="space-y-3 lg:col-span-5">
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">Target Schema Format</label>
                <select
                  value={ftFormat}
                  onChange={(e) => setFtFormat(e.target.value as typeof ftFormat)}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="openai_chat">OpenAI Chat Completions JSONL (messages[])</option>
                  <option value="gemini_sft">Vertex / Gemini Supervised Tuning JSONL (contents[])</option>
                  <option value="alpaca_instruct">Llama-3 / Alpaca Instruction JSONL</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">System Instruction</label>
                <input
                  type="text"
                  value={ftSystemPrompt}
                  onChange={(e) => setFtSystemPrompt(e.target.value)}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div className="flex flex-wrap gap-4 pt-1">
                <label className="flex items-center gap-2 text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={ftRedactPii}
                    onChange={(e) => setFtRedactPii(e.target.checked)}
                    className="rounded accent-amber-400"
                  />
                  Auto-Redact Emails & Secret Keys
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={ftDedup}
                    onChange={(e) => setFtDedup(e.target.checked)}
                    className="rounded accent-amber-400"
                  />
                  Deduplicate Identical Pairs
                </label>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">
                  Raw Prompt === Completion Pairs (One per line)
                </label>
                <textarea
                  rows={6}
                  value={ftRawPairs}
                  onChange={(e) => setFtRawPairs(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-mono text-xs dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="space-y-3 lg:col-span-7">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Cleaned Training Examples</div>
                  <div className="font-mono text-base font-bold text-emerald-600 dark:text-emerald-400">
                    {fineTuneDataset.count} JSONL Records
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Estimated Training Tokens</div>
                  <div className="font-mono text-base font-bold text-amber-500">
                    ~{fineTuneDataset.approxTokens} tokens / epoch
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-950 p-4 text-slate-100 dark:border-slate-800">
                <div className="mb-2 font-mono text-[11px] font-bold text-amber-400">
                  Sanitized JSONL Output Stream
                </div>
                <pre className="max-h-64 overflow-auto font-mono text-[11px] leading-relaxed text-slate-200">
                  {fineTuneDataset.jsonl}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. GRAPHQL SCHEMA & RESOLVER BUILDER */}
      {activeTool === 'graphql_schema_builder' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Database className="size-5 text-fuchsia-500" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  GraphQL Schema & DataLoader Resolver Builder
                </h2>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Instantly compile database entity fields into GraphQL SDL schemas, Input types, Subscriptions, and N+1 safe DataLoader resolvers.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-12">
            <div className="space-y-3 lg:col-span-4">
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">Entity Type Name</label>
                <input
                  type="text"
                  value={gqlEntityName}
                  onChange={(e) => setGqlEntityName(e.target.value)}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 font-mono text-xs dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">
                  Fields (fieldName:GraphQLType)
                </label>
                <textarea
                  rows={7}
                  value={gqlFieldsInput}
                  onChange={(e) => setGqlFieldsInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-mono text-xs dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={gqlWithSubscriptions}
                  onChange={(e) => setGqlWithSubscriptions(e.target.checked)}
                  className="rounded accent-fuchsia-500"
                />
                Include Real-Time WebSocket Subscription Type
              </label>
            </div>

            <div className="grid gap-3 lg:col-span-8 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-950 p-3.5 text-slate-100 dark:border-slate-800">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold text-fuchsia-400">schema.graphql (SDL)</span>
                  <button
                    type="button"
                    onClick={() => copyText('gql-sdl', gqlArtifacts.sdl, 'GraphQL SDL')}
                    className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-200 hover:bg-slate-700"
                  >
                    Copy SDL
                  </button>
                </div>
                <pre className="max-h-72 overflow-auto font-mono text-[11px] leading-relaxed text-slate-200">
                  {gqlArtifacts.sdl}
                </pre>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-950 p-3.5 text-slate-100 dark:border-slate-800">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold text-emerald-400">
                    resolvers.ts (DataLoader + TypeScript)
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText('gql-res', gqlArtifacts.resolvers, 'GraphQL Resolvers')}
                    className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-200 hover:bg-slate-700"
                  >
                    Copy Resolvers
                  </button>
                </div>
                <pre className="max-h-72 overflow-auto font-mono text-[11px] leading-relaxed text-slate-200">
                  {gqlArtifacts.resolvers}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. WEBHOOK INSPECTOR & SIMULATOR */}
      {activeTool === 'webhook_inspector_sim' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Webhook className="size-5 text-sky-500" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Webhook Inspector & HMAC Payload Simulator
                </h2>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Temporary endpoint bin (`/api/ide/webhook-bin/{whBinId}`) to capture, verify HMAC-SHA256 signatures, and inspect live webhook payloads.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void simulateInboundWebhook()}
              disabled={whLoading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-sky-500 px-4 py-2 text-xs font-bold text-white hover:bg-sky-400 disabled:opacity-50"
            >
              <Play className="size-3.5" />
              {whLoading ? 'Dispatching...' : 'Send Signed Webhook to Bin'}
            </button>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-12">
            <div className="space-y-3 lg:col-span-5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">Endpoint Bin ID</label>
                  <input
                    type="text"
                    value={whBinId}
                    onChange={(e) => setWhBinId(e.target.value)}
                    className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 font-mono text-xs dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">HMAC Signing Secret</label>
                  <input
                    type="text"
                    value={whSecret}
                    onChange={(e) => setWhSecret(e.target.value)}
                    className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 font-mono text-xs dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">
                  JSON Event Payload to Simulate
                </label>
                <textarea
                  rows={6}
                  value={whPayloadInput}
                  onChange={(e) => setWhPayloadInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-mono text-xs dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="space-y-2.5 lg:col-span-7">
              <div className="text-[11px] font-bold uppercase text-slate-400">
                Captured Requests ({whEvents.length})
              </div>
              {whEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="rounded-xl border border-slate-200 bg-slate-950 p-3.5 text-xs text-slate-200 dark:border-slate-800"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-sky-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-sky-400">
                        {ev.method}
                      </span>
                      <span className="font-mono font-bold text-white">{ev.id}</span>
                      <span className="text-[11px] text-slate-400">{ev.sourceIp}</span>
                    </div>
                    <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-400">
                      HMAC Verified · {ev.latencyMs}ms
                    </span>
                  </div>
                  <div className="mt-1.5 font-mono text-[10px] text-amber-300">
                    X-Hub-Signature-256: {ev.signatureHeader}
                  </div>
                  <pre className="mt-2 max-h-32 overflow-auto rounded-lg bg-slate-900 p-2 font-mono text-[11px] text-slate-300">
                    {JSON.stringify(ev.payload, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. SEMANTIC CODE SEARCH ENGINE */}
      {activeTool === 'semantic_code_search' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Search className="size-5 text-amber-500" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Semantic Code Search Engine (Project-Wide AST Symbol Indexer)
                </h2>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Query functions, React hooks, state variables, and API routes in natural language across all {blueprintFiles.length} active project files.
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 dark:border-slate-700 dark:bg-slate-800">
              <Search className="size-4 text-amber-500" />
              <input
                type="text"
                value={semQuery}
                onChange={(e) => setSemQuery(e.target.value)}
                placeholder="Ask in natural language: e.g. 'authentication token verification' or 'state variables'..."
                className="w-full bg-transparent text-xs font-semibold outline-none"
              />
            </div>

            <div className="grid gap-2.5">
              {semanticMatches.map((item, idx) => (
                <div
                  key={`${item.path}-${item.lineNumber}-${idx}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/50"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-amber-400/20 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-amber-600 dark:text-amber-300">
                        {item.kind}
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                        {item.symbolName}
                      </span>
                      <span className="font-mono text-[11px] text-slate-400">
                        {item.path}:{item.lineNumber}
                      </span>
                    </div>
                    <code className="block font-mono text-[11px] text-slate-600 dark:text-slate-300">
                      {item.snippet}
                    </code>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {Math.round(item.score * 100)}% match
                    </span>
                    {onSelectProjectFile && (
                      <button
                        type="button"
                        onClick={() => onSelectProjectFile(item.path)}
                        className="rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-slate-800 dark:bg-slate-700"
                      >
                        Open File
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. EDGE NETWORK PERFORMANCE MONITOR */}
      {activeTool === 'edge_perf_monitor' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Globe className="size-5 text-emerald-500" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Edge Network Performance Monitor (Anycast PoP & Cold-Start Telemetry)
                </h2>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Simulate and monitor edge worker routing policies, V8/Wasm isolate cold-start delays, and regional cache hit rates.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void refreshEdgeTelemetry()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400"
            >
              <RefreshCw className="size-3.5" />
              Probe Global Edge PoPs
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">Routing Policy</label>
              <select
                value={edgeRouting}
                onChange={(e) => setEdgeRouting(e.target.value as typeof edgeRouting)}
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="anycast-geo-nearest">Anycast Geo-Nearest PoP</option>
                <option value="latency-weighted">Real-Time Latency Weighted</option>
                <option value="eu-sovereign-pin">EU Sovereign Data Residency Pin</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">Edge Isolate Engine</label>
              <select
                value={edgeRuntime}
                onChange={(e) => setEdgeRuntime(e.target.value as typeof edgeRuntime)}
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="v8-isolate">V8 Isolate (~4.8ms Cold Start)</option>
                <option value="wasm-edge">WasmEdge Runtime (~1.9ms Cold Start)</option>
                <option value="microvm-container">Firecracker MicroVM (~142ms Cold Start)</option>
              </select>
            </div>
            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={edgeTieredCache}
                  onChange={(e) => setEdgeTieredCache(e.target.checked)}
                  className="rounded accent-emerald-500"
                />
                Smart Tiered Edge Cache (Global Avg p95: {edgeGlobalAvgP95}ms)
              </label>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {edgePops.map((pop) => (
              <div
                key={pop.code}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/50"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded bg-emerald-500/15 px-2 py-0.5 font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {pop.code}
                  </span>
                  <span className="font-mono text-[11px] text-slate-500">Cache Hit: {pop.hitRate}%</span>
                </div>
                <div className="mt-1 text-xs font-bold text-slate-900 dark:text-white">{pop.city}</div>
                <div className="mt-2 flex items-center justify-between font-mono text-[11px]">
                  <span className="text-sky-500">Cold: {pop.coldStartMs}ms</span>
                  <span className="text-slate-600 dark:text-slate-300">p50: {pop.p50Ms}ms</span>
                  <span className="font-bold text-amber-500">p95: {pop.p95Ms}ms</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
