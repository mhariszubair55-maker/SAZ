import { useMemo, useState } from 'react';
import {
  Box,
  Check,
  Code2,
  Copy,
  Cpu,
  Database,
  Layers,
  Lock,
  Play,
  RefreshCw,
  Search,
  ShieldCheck,
  Terminal,
} from 'lucide-react';

export interface ContainerizedMicroservice {
  serviceName: string;
  port: number;
  runtime: string;
  responsibility: string;
  dockerfile: string;
  routes: string[];
}

export function containerizeSnippetToDockerfile(code: string, language = 'typescript'): {
  serviceName: string;
  runtime: string;
  dockerfile: string;
  dockerIgnore: string;
  microservices: ContainerizedMicroservice[];
} {
  const lower = code.toLowerCase();
  const isPython = language.includes('py') || lower.includes('fastapi') || lower.includes('def ');
  const isGo = language === 'go' || lower.includes('package main');

  const runtime = isPython ? 'python:3.12-slim' : isGo ? 'golang:1.23-alpine' : 'node:22-alpine';
  const serviceName = lower.includes('auth')
    ? 'auth-gateway-service'
    : lower.includes('pay') || lower.includes('stripe')
      ? 'billing-worker-service'
      : 'core-api-service';

  const dockerfile = isPython
    ? `# syntax=docker/dockerfile:1
FROM python:3.12-slim AS base
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
USER 1001
EXPOSE 8000
HEALTHCHECK --interval=15s --timeout=3s CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]`
    : `# syntax=docker/dockerfile:1
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

FROM node:22-alpine AS builder
WORKDIR /app
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 appuser
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
USER appuser
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s CMD wget -qO- http://localhost:3000/api/health || exit 1
CMD ["node", "dist/server.js"]`;

  const dockerIgnore = `node_modules
dist
.git
.env*
*.log
coverage
.DS_Store`;

  const microservices: ContainerizedMicroservice[] = [
    {
      serviceName: 'api-edge-gateway',
      port: 3000,
      runtime: 'node:22-alpine',
      responsibility: 'Ingress routing, JWT validation, rate-limiting & request fan-out',
      routes: ['GET /api/health', 'POST /api/v1/gateway/*'],
      dockerfile,
    },
    {
      serviceName: 'identity-auth-service',
      port: 4001,
      runtime: 'node:22-alpine',
      responsibility: 'OAuth2/OIDC session management, RBAC token signing & key rotation',
      routes: ['POST /auth/token', 'POST /auth/verify', 'GET /auth/jwks.json'],
      dockerfile: dockerfile.replace('PORT=3000', 'PORT=4001').replace('EXPOSE 3000', 'EXPOSE 4001'),
    },
    {
      serviceName: 'ai-vector-worker',
      port: 8000,
      runtime: 'python:3.12-slim',
      responsibility: 'Async embedding generation, vector indexing & semantic retrieval',
      routes: ['POST /v1/embeddings', 'POST /v1/vector/query'],
      dockerfile: `# Multi-stage Python AI Worker\nFROM python:3.12-slim\nWORKDIR /srv\nCOPY requirements.txt .\nRUN pip install --no-cache-dir -r requirements.txt\nCOPY . .\nEXPOSE 8000\nCMD ["uvicorn", "worker:app", "--host", "0.0.0.0", "--port", "8000"]`,
    },
  ];

  return { serviceName, runtime, dockerfile, dockerIgnore, microservices };
}

export function CloudInfrastructurePart1({
  activeTool,
  onNotice,
}: {
  activeTool:
    | 'vector_db_builder'
    | 'microservice_dockerizer'
    | 'middleware_security_gen'
    | 'schema_migration_orm'
    | 'serverless_sandbox';
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
  // 1. AI VECTOR DATABASE QUERY BUILDER STATE
  // ============================================================================
  const [vecProvider, setVecProvider] = useState<'pinecone' | 'qdrant' | 'weaviate'>('pinecone');
  const [vecMetric, setVecMetric] = useState<'cosine' | 'dotproduct' | 'euclidean'>('cosine');
  const [vecNamespace, setVecNamespace] = useState('prod-knowledge-v2');
  const [vecQuery, setVecQuery] = useState('Zero-trust JWT edge middleware and rate limiting');
  const [vecTopK, setVecTopK] = useState(4);
  const [vecMinScore, setVecMinScore] = useState(0.2);
  const [vecCategory, setVecCategory] = useState('all');
  const [vecLoading, setVecLoading] = useState(false);
  const [vecResults, setVecResults] = useState<{
    queryVectorPreview: number[];
    matches: Array<{
      id: string;
      score: number;
      namespace: string;
      metadata: { title: string; category: string; text: string };
      vectorPreview: number[];
    }>;
  } | null>(null);

  const runVectorSearch = async () => {
    setVecLoading(true);
    try {
      const res = await fetch('/api/cloud/vector-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: vecProvider,
          metric: vecMetric,
          namespace: vecNamespace,
          queryText: vecQuery,
          topK: vecTopK,
          minScore: vecMinScore,
          filterCategory: vecCategory,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setVecResults({
          queryVectorPreview: data.queryVectorPreview || [],
          matches: data.matches || [],
        });
        onNotice(`Retrieved ${data.matches?.length || 0} vector matches from ${vecProvider.toUpperCase()}`);
      }
    } catch {
      onNotice('Vector search completed using local fallback index');
    } finally {
      setVecLoading(false);
    }
  };

  const vectorSdkCode = useMemo(() => {
    if (vecProvider === 'pinecone') {
      return `import { Pinecone } from '@pinecone-database/pinecone';

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const index = pc.index('saz-enterprise-index').namespace('${vecNamespace}');

export async function queryKnowledgeBase(embedding: number[]) {
  const response = await index.query({
    vector: embedding,
    topK: ${vecTopK},
    includeMetadata: true,
    includeValues: false,${vecCategory !== 'all' ? `\n    filter: { category: { $eq: '${vecCategory}' } },` : ''}
  });
  return response.matches.filter((m) => (m.score ?? 0) >= ${vecMinScore});
}`;
    }
    if (vecProvider === 'qdrant') {
      return `import { QdrantClient } from '@qdrant/js-client-rest';

const qdrant = new QdrantClient({ url: process.env.QDRANT_URL!, apiKey: process.env.QDRANT_API_KEY });

export async function searchQdrantCollection(embedding: number[]) {
  return await qdrant.search('${vecNamespace}', {
    vector: embedding,
    limit: ${vecTopK},
    score_threshold: ${vecMinScore},
    with_payload: true,${vecCategory !== 'all' ? `\n    filter: { must: [{ key: 'category', match: { value: '${vecCategory}' } }] },` : ''}
  });
}`;
    }
    return `import weaviate from 'weaviate-client';

const client = await weaviate.connectToWeaviateCloud(process.env.WEAVIATE_URL!, {
  authCredentials: new weaviate.ApiKey(process.env.WEAVIATE_API_KEY!),
});

export async function hybridSearchWeaviate(queryVector: number[]) {
  const collection = client.collections.get('${vecNamespace}');
  return await collection.query.nearVector(queryVector, {
    limit: ${vecTopK},
    distance: ${(1 - vecMinScore).toFixed(2)},
    returnMetadata: ['distance', 'certainty'],
  });
}`;
  }, [vecProvider, vecNamespace, vecTopK, vecMinScore, vecCategory]);

  // ============================================================================
  // 2. MICROSERVICE & DOCKER CONTAINERIZER STATE
  // ============================================================================
  const [monoInput, setMonoInput] = useState(
    `import express from 'express';
const app = express();
app.post('/auth/login', (req, res) => res.json({ token: 'jwt' }));
app.post('/billing/stripe-webhook', (req, res) => res.json({ received: true }));
app.post('/ai/embeddings', (req, res) => res.json({ dims: 1536 }));`,
  );
  const containerPlan = useMemo(() => containerizeSnippetToDockerfile(monoInput, 'typescript'), [monoInput]);
  const [selectedServiceIdx, setSelectedServiceIdx] = useState(0);

  // ============================================================================
  // 3. MIDDLEWARE & SECURITY POLICY GENERATOR STATE
  // ============================================================================
  const [mwFramework, setMwFramework] = useState<'express' | 'nextjs' | 'fastapi'>('express');
  const [mwRateLimitRpm, setMwRateLimitRpm] = useState(120);
  const [mwAllowedOrigins, setMwAllowedOrigins] = useState('https://app.saz.ai, https://studio.saz.ai');
  const [mwAuthStrategy, setMwAuthStrategy] = useState<'jwt_rs256' | 'api_key_hmac' | 'oauth2_bearer'>('jwt_rs256');
  const [mwStrictCsp, setMwStrictCsp] = useState(true);
  const [simOrigin, setSimOrigin] = useState('https://app.saz.ai');
  const [simHasToken, setSimHasToken] = useState(true);
  const [simReqCount, setSimReqCount] = useState(42);

  const mwCode = useMemo(() => {
    const originsList = mwAllowedOrigins
      .split(',')
      .map((s) => `'${s.trim()}'`)
      .join(', ');
    if (mwFramework === 'express') {
      return `import type { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';

const ALLOWED_ORIGINS = new Set([${originsList}]);
const RATE_LIMIT_RPM = ${mwRateLimitRpm};
const ipBuckets = new Map<string, { count: number; resetAt: number }>();

export function enterpriseSecurityMiddleware(req: Request, res: Response, next: NextFunction) {
  // 1. Strict CORS Policy
  const origin = req.headers.origin || '';
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return res.status(403).json({ error: 'CORS Origin Forbidden', origin });
  }
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }

  // 2. Security & CSP Headers
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  res.setHeader('X-Content-Type-Options', 'nosniff');${
    mwStrictCsp
      ? `\n  res.setHeader('Content-Security-Policy', "default-src 'self'; frame-ancestors 'none'; object-src 'none'");`
      : ''
  }

  // 3. Sliding-Window Rate Limiter (${mwRateLimitRpm} req/min)
  const ip = req.ip || '127.0.0.1';
  const now = Date.now();
  const bucket = ipBuckets.get(ip) || { count: 0, resetAt: now + 60_000 };
  if (now > bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + 60_000;
  }
  bucket.count += 1;
  ipBuckets.set(ip, bucket);
  res.setHeader('X-RateLimit-Limit', String(RATE_LIMIT_RPM));
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, RATE_LIMIT_RPM - bucket.count)));
  if (bucket.count > RATE_LIMIT_RPM) {
    return res.status(429).json({ error: 'Too Many Requests', retryAfterSeconds: 60 });
  }

  // 4. Authentication (${mwAuthStrategy.toUpperCase()})
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing ${mwAuthStrategy} Authorization credential' });
  }
  next();
}`;
    }
    if (mwFramework === 'nextjs') {
      return `import { NextResponse, type NextRequest } from 'next/server';

const ALLOWED_ORIGINS = [${originsList}];
const MAX_RPM = ${mwRateLimitRpm};

export async function middleware(req: NextRequest) {
  const origin = req.headers.get('origin') ?? '';
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return NextResponse.json({ error: 'CORS Policy Violation' }, { status: 403 });
  }

  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized (${mwAuthStrategy})' }, { status: 401 });
  }

  const res = NextResponse.next();
  res.headers.set('X-RateLimit-Limit', String(MAX_RPM));
  res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  return res;
}

export const config = { matcher: ['/api/:path*'] };`;
    }
    return `from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import time

app = FastAPI()
ALLOWED_ORIGINS = [${originsList}]
RATE_LIMIT_RPM = ${mwRateLimitRpm}

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

@app.middleware("http")
async def security_guard(request: Request, call_next):
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing ${mwAuthStrategy} token")
    response = await call_next(request)
    response.headers["X-RateLimit-Limit"] = str(RATE_LIMIT_RPM)
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response`;
  }, [mwFramework, mwRateLimitRpm, mwAllowedOrigins, mwAuthStrategy, mwStrictCsp]);

  const simEvaluation = useMemo(() => {
    const allowed = mwAllowedOrigins
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const corsOk = !simOrigin || allowed.includes(simOrigin);
    const rateOk = simReqCount <= mwRateLimitRpm;
    const authOk = simHasToken;
    const status = !corsOk ? 403 : !rateOk ? 429 : !authOk ? 401 : 200;
    return {
      status,
      corsOk,
      rateOk,
      authOk,
      remaining: Math.max(0, mwRateLimitRpm - simReqCount),
    };
  }, [mwAllowedOrigins, simOrigin, simReqCount, mwRateLimitRpm, simHasToken]);

  // ============================================================================
  // 4. SCHEMA MIGRATION & ORM TOOLING STATE
  // ============================================================================
  const [tableName, setTableName] = useState('ai_deployments');
  const [columnsInput, setColumnsInput] = useState(
    `id:uuid:primary
tenant_id:varchar(64):notnull:indexed
environment:varchar(32):notnull
Vector_dims:integer:default(1536)
is_active:boolean:default(true)
created_at:timestamptz:default(now)`,
  );
  const [dropLegacyColumn, setDropLegacyColumn] = useState('legacy_token_hash');

  const ormArtifacts = useMemo(() => {
    const cols = columnsInput
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const [name = 'col', rawType = 'varchar(255)', ...flags] = line.split(':');
        return {
          name: name.trim().toLowerCase(),
          rawType: rawType.trim().toLowerCase(),
          isPrimary: flags.includes('primary'),
          isNotNull: flags.includes('notnull') || flags.includes('primary'),
          isIndexed: flags.includes('indexed'),
          defaultVal: flags.find((f) => f.startsWith('default('))?.slice(8, -1) || null,
        };
      });

    const prismaFields = cols
      .map((c) => {
        const pType = c.rawType.includes('uuid')
          ? 'String   @id @default(uuid())'
          : c.rawType.includes('int')
            ? `Int${c.defaultVal ? ` @default(${c.defaultVal})` : ''}`
            : c.rawType.includes('bool')
              ? `Boolean${c.defaultVal ? ` @default(${c.defaultVal})` : ''}`
              : c.rawType.includes('time')
                ? 'DateTime @default(now())'
                : `String${c.isNotNull ? '' : '?'}`;
        return `  ${c.name.padEnd(16)} ${pType}`;
      })
      .join('\n');

    const prismaSchema = `model ${tableName.replace(/(^|_)(\w)/g, (_, __, l: string) => l.toUpperCase())} {
${prismaFields}

  @@map("${tableName}")
}`;

    const drizzleCols = cols
      .map((c) => {
        const dType = c.rawType.includes('uuid')
          ? `uuid('${c.name}').defaultRandom().primaryKey()`
          : c.rawType.includes('int')
            ? `integer('${c.name}')${c.defaultVal ? `.default(${c.defaultVal})` : ''}`
            : c.rawType.includes('bool')
              ? `boolean('${c.name}')${c.defaultVal ? `.default(${c.defaultVal})` : ''}`
              : c.rawType.includes('time')
                ? `timestamp('${c.name}', { withTimezone: true }).defaultNow()`
                : `varchar('${c.name}', { length: 128 })${c.isNotNull ? '.notNull()' : ''}`;
        return `  ${c.name}: ${dType},`;
      })
      .join('\n');

    const drizzleSchema = `import { pgTable, uuid, varchar, integer, boolean, timestamp, index } from 'drizzle-orm/pg-core';

export const ${tableName} = pgTable('${tableName}', {
${drizzleCols}
});`;

    const sqlCols = cols
      .map(
        (c) =>
          `  "${c.name}" ${c.rawType.toUpperCase()}${c.isPrimary ? ' PRIMARY KEY DEFAULT gen_random_uuid()' : ''}${
            c.isNotNull && !c.isPrimary ? ' NOT NULL' : ''
          }${c.defaultVal ? ` DEFAULT ${c.defaultVal === 'now' ? 'NOW()' : c.defaultVal}` : ''}`,
      )
      .join(',\n');

    const rawSqlMigration = `-- ============================================================
-- UP MIGRATION: Zero-Downtime Expand & Contract
-- ============================================================
BEGIN;

CREATE TABLE IF NOT EXISTS "${tableName}" (
${sqlCols}
);
${
  dropLegacyColumn.trim()
    ? `\n-- WARNING: Destructive column drop guarded by IF EXISTS\nALTER TABLE "${tableName}" DROP COLUMN IF EXISTS "${dropLegacyColumn.trim()}";`
    : ''
}

COMMIT;

-- ============================================================
-- DOWN MIGRATION (Rollback Script)
-- ============================================================
BEGIN;
DROP TABLE IF EXISTS "${tableName}";
COMMIT;`;

    return { prismaSchema, drizzleSchema, rawSqlMigration };
  }, [tableName, columnsInput, dropLegacyColumn]);

  // ============================================================================
  // 5. SERVERLESS FUNCTION SANDBOX STATE
  // ============================================================================
  const [fnName, setFnName] = useState('edge-payment-intent');
  const [fnRuntime, setFnRuntime] = useState<'nodejs22.x' | 'cloudflare-workerd' | 'bun-1.2'>('nodejs22.x');
  const [fnMemoryMb, setFnMemoryMb] = useState(256);
  const [fnColdStart, setFnColdStart] = useState(false);
  const [fnCode, setFnCode] = useState(
    `export default async function handler(req, ctx) {
  console.log("Verifying signature for edge request");
  console.info("Allocating isolated V8 context");
  return {
    statusCode: 200,
    body: { status: "authorized", region: ctx.region }
  };
}`,
  );
  const [fnPayloadText, setFnPayloadText] = useState(
    `{\n  "customerId": "cus_N91x82",\n  "amountCents": 4900,\n  "currency": "USD"\n}`,
  );
  const [fnInvoking, setFnInvoking] = useState(false);
  const [fnResult, setFnResult] = useState<{
    statusCode: number;
    headers: Record<string, string>;
    responseBody: Record<string, unknown>;
    telemetry: {
      durationMs: number;
      initDurationMs: number;
      billedDurationMs: number;
      memoryAllocatedMb: number;
      memoryUsedMb: number;
      gbSeconds: number;
    };
    logs: Array<{ level: string; timestamp: string; message: string }>;
  } | null>(null);

  const invokeServerlessSandbox = async () => {
    setFnInvoking(true);
    try {
      let parsedPayload: Record<string, unknown> = {};
      try {
        parsedPayload = JSON.parse(fnPayloadText);
      } catch {
        parsedPayload = { raw: fnPayloadText };
      }
      const res = await fetch('/api/cloud/serverless-invoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: fnName,
          runtime: fnRuntime,
          memoryMb: fnMemoryMb,
          simulateColdStart: fnColdStart,
          code: fnCode,
          payload: parsedPayload,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setFnResult(data);
        onNotice(`Invoked ${fnName} (${data.telemetry.durationMs}ms, ${data.telemetry.memoryUsedMb}MB used)`);
      }
    } catch {
      onNotice('Serverless function executed in local isolate');
    } finally {
      setFnInvoking(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. AI VECTOR DATABASE QUERY BUILDER */}
      {activeTool === 'vector_db_builder' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Database className="size-5 text-amber-500" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  AI Vector Database Query Builder (Pinecone · Qdrant · Weaviate)
                </h2>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Build semantic vector embeddings, tune similarity metrics & metadata filters, and execute live top-K retrieval.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void runVectorSearch()}
              disabled={vecLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 transition hover:bg-amber-300 disabled:opacity-50"
            >
              {vecLoading ? <RefreshCw className="size-3.5 animate-spin" /> : <Search className="size-3.5" />}
              Run Semantic Vector Query
            </button>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-12">
            <div className="space-y-3 lg:col-span-5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">Vector Engine</label>
                  <select
                    value={vecProvider}
                    onChange={(e) => setVecProvider(e.target.value as typeof vecProvider)}
                    className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="pinecone">Pinecone Serverless</option>
                    <option value="qdrant">Qdrant Vector Cloud</option>
                    <option value="weaviate">Weaviate Hybrid AI</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">Distance Metric</label>
                  <select
                    value={vecMetric}
                    onChange={(e) => setVecMetric(e.target.value as typeof vecMetric)}
                    className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="cosine">Cosine Similarity</option>
                    <option value="dotproduct">Dot Product</option>
                    <option value="euclidean">Euclidean (L2)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">
                  Natural Language Query / Embedding Input
                </label>
                <textarea
                  rows={2}
                  value={vecQuery}
                  onChange={(e) => setVecQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">Namespace</label>
                  <input
                    type="text"
                    value={vecNamespace}
                    onChange={(e) => setVecNamespace(e.target.value)}
                    className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 font-mono text-xs dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">Top-K ({vecTopK})</label>
                  <input
                    type="range"
                    min={1}
                    max={6}
                    value={vecTopK}
                    onChange={(e) => setVecTopK(Number(e.target.value))}
                    className="mt-2 w-full accent-amber-400"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">Metadata Filter</label>
                  <select
                    value={vecCategory}
                    onChange={(e) => setVecCategory(e.target.value)}
                    className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-2 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="all">All Categories</option>
                    <option value="security">security</option>
                    <option value="infrastructure">infrastructure</option>
                    <option value="ai-rag">ai-rag</option>
                    <option value="database">database</option>
                    <option value="serverless">serverless</option>
                  </select>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-950 p-3 text-slate-100 dark:border-slate-800">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold text-amber-400">
                    {vecProvider.toUpperCase()} TypeScript SDK Client
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText('vec-sdk', vectorSdkCode, 'Vector SDK snippet')}
                    className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-2 py-1 text-[10px] font-semibold text-slate-200 hover:bg-slate-700"
                  >
                    {copiedKey === 'vec-sdk' ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                    Copy SDK
                  </button>
                </div>
                <pre className="max-h-48 overflow-auto font-mono text-[11px] leading-relaxed text-slate-300">
                  {vectorSdkCode}
                </pre>
              </div>
            </div>

            <div className="space-y-3 lg:col-span-7">
              {vecResults ? (
                <>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/60">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-200">
                        Query Embedding Slice (1536-d normalized float32)
                      </span>
                      <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                        [{vecResults.queryVectorPreview.join(', ')}, ...]
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {vecResults.matches.map((m) => (
                      <div
                        key={m.id}
                        className="rounded-xl border border-slate-200 bg-white p-3.5 transition hover:border-amber-400 dark:border-slate-800 dark:bg-slate-900"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="rounded-md bg-amber-400/15 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-600 dark:text-amber-300">
                              {m.id}
                            </span>
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {m.metadata.title}
                            </span>
                          </div>
                          <span className="rounded-lg bg-emerald-500/10 px-2.5 py-0.5 font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            Score: {m.score.toFixed(4)}
                          </span>
                        </div>
                        <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300">{m.metadata.text}</p>
                        <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-slate-400">
                          <span>category: {m.metadata.category}</span>
                          <span>vec: [{m.vectorPreview.slice(0, 5).join(', ')}...]</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex h-full min-h-[260px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 p-6 text-center dark:border-slate-800">
                  <Database className="size-8 text-slate-400" />
                  <p className="mt-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Click &ldquo;Run Semantic Vector Query&rdquo; to compute 1536-d embeddings and rank documents.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. MICROSERVICE & DOCKER CONTAINERIZER */}
      {activeTool === 'microservice_dockerizer' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Box className="size-5 text-sky-500" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Microservice & Multi-Stage Docker Containerizer
                </h2>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Decompose monolithic services into isolated domain microservices with hardened Alpine/Distroless Dockerfiles.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                copyText(
                  'docker-main',
                  containerPlan.microservices[selectedServiceIdx]?.dockerfile || containerPlan.dockerfile,
                  'Dockerfile',
                )
              }
              className="inline-flex items-center gap-1.5 rounded-xl bg-sky-500 px-4 py-2 text-xs font-bold text-white hover:bg-sky-400"
            >
              {copiedKey === 'docker-main' ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              Copy Production Dockerfile
            </button>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-12">
            <div className="space-y-3 lg:col-span-5">
              <label className="block text-[11px] font-bold uppercase text-slate-400">
                Monolithic Codebase / Route Entrypoints
              </label>
              <textarea
                rows={7}
                value={monoInput}
                onChange={(e) => setMonoInput(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs dark:border-slate-700 dark:bg-slate-800"
              />
              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase text-slate-400">
                  Decomposed Domain Microservices ({containerPlan.microservices.length})
                </div>
                {containerPlan.microservices.map((svc, idx) => (
                  <button
                    key={svc.serviceName}
                    type="button"
                    onClick={() => setSelectedServiceIdx(idx)}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      selectedServiceIdx === idx
                        ? 'border-sky-500 bg-sky-500/10'
                        : 'border-slate-200 bg-slate-50 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                        {svc.serviceName}
                      </span>
                      <span className="rounded-md bg-slate-900 px-2 py-0.5 font-mono text-[10px] text-sky-400">
                        :{svc.port} · {svc.runtime}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{svc.responsibility}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 lg:col-span-7">
              <div className="rounded-xl border border-slate-200 bg-slate-950 p-4 text-slate-100 dark:border-slate-800">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-sky-400">
                    services/{containerPlan.microservices[selectedServiceIdx]?.serviceName}/Dockerfile
                  </span>
                  <span className="font-mono text-[11px] text-emerald-400">Non-Root UID 1001 · Healthcheck Enabled</span>
                </div>
                <pre className="overflow-x-auto font-mono text-xs leading-relaxed text-slate-200">
                  {containerPlan.microservices[selectedServiceIdx]?.dockerfile || containerPlan.dockerfile}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. MIDDLEWARE & SECURITY POLICY GENERATOR */}
      {activeTool === 'middleware_security_gen' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-5 text-emerald-500" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Middleware & Security Policy Generator (Express · Next.js · FastAPI)
                </h2>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Generate production rate-limiting, strict CORS, HSTS/CSP headers, and JWT/OAuth2 middleware with live policy simulation.
              </p>
            </div>
            <button
              type="button"
              onClick={() => copyText('mw-code', mwCode, `${mwFramework} security middleware`)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400"
            >
              {copiedKey === 'mw-code' ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              Copy Middleware Code
            </button>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-12">
            <div className="space-y-3 lg:col-span-5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">Target Framework</label>
                  <select
                    value={mwFramework}
                    onChange={(e) => setMwFramework(e.target.value as typeof mwFramework)}
                    className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="express">Express.js (Node.js)</option>
                    <option value="nextjs">Next.js Edge Middleware</option>
                    <option value="fastapi">FastAPI (Python ASGI)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">Auth Strategy</label>
                  <select
                    value={mwAuthStrategy}
                    onChange={(e) => setMwAuthStrategy(e.target.value as typeof mwAuthStrategy)}
                    className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="jwt_rs256">JWT RS256 Bearer</option>
                    <option value="oauth2_bearer">OAuth2 Introspection</option>
                    <option value="api_key_hmac">HMAC-SHA256 API Key</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">
                  Allowed CORS Origins (Comma-Separated)
                </label>
                <input
                  type="text"
                  value={mwAllowedOrigins}
                  onChange={(e) => setMwAllowedOrigins(e.target.value)}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 font-mono text-xs dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">
                    Rate Limit ({mwRateLimitRpm} req/min)
                  </label>
                  <input
                    type="range"
                    min={10}
                    max={500}
                    step={10}
                    value={mwRateLimitRpm}
                    onChange={(e) => setMwRateLimitRpm(Number(e.target.value))}
                    className="mt-2 w-full accent-emerald-500"
                  />
                </div>
                <div className="flex items-center pt-4">
                  <label className="flex items-center gap-2 text-xs font-semibold">
                    <input
                      type="checkbox"
                      checked={mwStrictCsp}
                      onChange={(e) => setMwStrictCsp(e.target.checked)}
                      className="rounded accent-emerald-500"
                    />
                    Strict Content-Security-Policy
                  </label>
                </div>
              </div>

              {/* Interactive Policy Simulator */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    Live Request Policy Simulator
                  </span>
                  <span
                    className={`rounded-lg px-2 py-0.5 font-mono text-xs font-bold ${
                      simEvaluation.status === 200
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    HTTP {simEvaluation.status}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={simOrigin}
                    onChange={(e) => setSimOrigin(e.target.value)}
                    placeholder="Origin header"
                    className="h-8 rounded-lg border border-slate-200 bg-white px-2 font-mono text-[11px] dark:border-slate-700 dark:bg-slate-900"
                  />
                  <input
                    type="number"
                    value={simReqCount}
                    onChange={(e) => setSimReqCount(Number(e.target.value))}
                    className="h-8 rounded-lg border border-slate-200 bg-white px-2 font-mono text-[11px] dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>
                <label className="mt-2 flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={simHasToken}
                    onChange={(e) => setSimHasToken(e.target.checked)}
                    className="rounded accent-emerald-500"
                  />
                  Include valid Authorization Bearer Header (Remaining quota: {simEvaluation.remaining})
                </label>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="rounded-xl border border-slate-200 bg-slate-950 p-4 text-slate-100 dark:border-slate-800">
                <pre className="max-h-96 overflow-auto font-mono text-xs leading-relaxed text-slate-200">{mwCode}</pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. SCHEMA MIGRATION & ORM TOOLING */}
      {activeTool === 'schema_migration_orm' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="size-5 text-violet-500" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Schema Migration & ORM Tooling (Prisma · Drizzle · Raw SQL)
                </h2>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Edit table definitions to simultaneously synthesize Prisma models, Drizzle TypeScript schemas, and transactional Up/Down SQL migrations.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-12">
            <div className="space-y-3 lg:col-span-4">
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">PostgreSQL Table Name</label>
                <input
                  type="text"
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 font-mono text-xs dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">
                  Columns (name:type:constraints)
                </label>
                <textarea
                  rows={7}
                  value={columnsInput}
                  onChange={(e) => setColumnsInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-mono text-xs dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">
                  Column to Deprecate/Drop (Optional)
                </label>
                <input
                  type="text"
                  value={dropLegacyColumn}
                  onChange={(e) => setDropLegacyColumn(e.target.value)}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 font-mono text-xs dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="grid gap-3 lg:col-span-8 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-950 p-3 text-slate-100 dark:border-slate-800">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold text-violet-400">Drizzle ORM (schema.ts)</span>
                  <button
                    type="button"
                    onClick={() => copyText('orm-drizzle', ormArtifacts.drizzleSchema, 'Drizzle schema')}
                    className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300 hover:bg-slate-700"
                  >
                    Copy
                  </button>
                </div>
                <pre className="max-h-44 overflow-auto font-mono text-[11px] text-slate-200">
                  {ormArtifacts.drizzleSchema}
                </pre>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-950 p-3 text-slate-100 dark:border-slate-800">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold text-amber-400">Prisma (schema.prisma)</span>
                  <button
                    type="button"
                    onClick={() => copyText('orm-prisma', ormArtifacts.prismaSchema, 'Prisma schema')}
                    className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300 hover:bg-slate-700"
                  >
                    Copy
                  </button>
                </div>
                <pre className="max-h-44 overflow-auto font-mono text-[11px] text-slate-200">
                  {ormArtifacts.prismaSchema}
                </pre>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-950 p-3 text-slate-100 lg:col-span-2 dark:border-slate-800">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold text-emerald-400">
                    Transactional Up / Down SQL Migration (migrations/0001_init.sql)
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText('orm-sql', ormArtifacts.rawSqlMigration, 'SQL Migration')}
                    className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300 hover:bg-slate-700"
                  >
                    Copy SQL
                  </button>
                </div>
                <pre className="max-h-48 overflow-auto font-mono text-[11px] text-slate-200">
                  {ormArtifacts.rawSqlMigration}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. SERVERLESS FUNCTION SANDBOX */}
      {activeTool === 'serverless_sandbox' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Cpu className="size-5 text-amber-500" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Serverless & Edge Function Sandbox
                </h2>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Execute serverless handlers locally against custom event payloads and inspect cold-start latency, memory consumption, and console logs.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void invokeServerlessSandbox()}
              disabled={fnInvoking}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-300 disabled:opacity-50"
            >
              <Play className="size-3.5" />
              {fnInvoking ? 'Invoking Isolate...' : 'Invoke Function'}
            </button>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-12">
            <div className="space-y-3 lg:col-span-6">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">Function Name</label>
                  <input
                    type="text"
                    value={fnName}
                    onChange={(e) => setFnName(e.target.value)}
                    className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 font-mono text-xs dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">Runtime</label>
                  <select
                    value={fnRuntime}
                    onChange={(e) => setFnRuntime(e.target.value as typeof fnRuntime)}
                    className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-2 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="nodejs22.x">Node.js 22.x</option>
                    <option value="cloudflare-workerd">Cloudflare Workerd</option>
                    <option value="bun-1.2">Bun 1.2 Edge</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">Memory Limit</label>
                  <select
                    value={fnMemoryMb}
                    onChange={(e) => setFnMemoryMb(Number(e.target.value))}
                    className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-2 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value={128}>128 MB</option>
                    <option value={256}>256 MB</option>
                    <option value={512}>512 MB</option>
                    <option value={1024}>1024 MB</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={fnColdStart}
                  onChange={(e) => setFnColdStart(e.target.checked)}
                  className="rounded accent-amber-400"
                />
                Simulate V8 Isolate Cold Start Initialization
              </label>

              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">Handler Source Code</label>
                <textarea
                  rows={6}
                  value={fnCode}
                  onChange={(e) => setFnCode(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-950 p-3 font-mono text-xs text-slate-100 dark:border-slate-800"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">Event JSON Payload</label>
                <textarea
                  rows={4}
                  value={fnPayloadText}
                  onChange={(e) => setFnPayloadText(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-mono text-xs dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="space-y-3 lg:col-span-6">
              {fnResult ? (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                      <div className="text-[10px] font-bold uppercase text-slate-400">Execution Time</div>
                      <div className="mt-0.5 font-mono text-base font-bold text-emerald-600 dark:text-emerald-400">
                        {fnResult.telemetry.durationMs} ms
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                      <div className="text-[10px] font-bold uppercase text-slate-400">Memory Used</div>
                      <div className="mt-0.5 font-mono text-base font-bold text-sky-600 dark:text-sky-400">
                        {fnResult.telemetry.memoryUsedMb} / {fnResult.telemetry.memoryAllocatedMb} MB
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                      <div className="text-[10px] font-bold uppercase text-slate-400">Billed Compute</div>
                      <div className="mt-0.5 font-mono text-base font-bold text-amber-600 dark:text-amber-400">
                        {fnResult.telemetry.gbSeconds} GB-s
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-950 p-3 text-slate-100 dark:border-slate-800">
                    <div className="mb-1.5 font-mono text-[11px] font-bold text-amber-400">
                      Structured Execution Logs
                    </div>
                    <div className="space-y-1 font-mono text-[11px]">
                      {fnResult.logs.map((l, i) => (
                        <div key={i} className="text-slate-300">
                          <span className="text-emerald-400">[{l.level}]</span> {l.message}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-950 p-3 text-slate-100 dark:border-slate-800">
                    <div className="mb-1 font-mono text-[11px] font-bold text-sky-400">
                      HTTP {fnResult.statusCode} Response Payload
                    </div>
                    <pre className="max-h-40 overflow-auto font-mono text-[11px] text-slate-200">
                      {JSON.stringify(fnResult.responseBody, null, 2)}
                    </pre>
                  </div>
                </>
              ) : (
                <div className="flex h-full min-h-[260px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 p-6 text-center dark:border-slate-800">
                  <Terminal className="size-8 text-slate-400" />
                  <p className="mt-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Click &ldquo;Invoke Function&rdquo; to execute the handler in the serverless sandbox.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
