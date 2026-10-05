import { useMemo, useState } from 'react';
import {
  Activity,
  Check,
  Cloud,
  Copy,
  FileCode2,
  Gauge,
  GitBranch,
  Layers,
  Play,
  Plus,
  RefreshCw,
  Server,
  Volume2,
} from 'lucide-react';
import {
  CloudInfrastructurePart1,
  containerizeSnippetToDockerfile,
} from './CloudInfrastructurePart1';

export { containerizeSnippetToDockerfile };

export interface SystemArchNode {
  id: string;
  label: string;
  kind: 'gateway' | 'service' | 'database' | 'cache' | 'vector' | 'queue';
  tech: string;
  port: number;
  connectsTo: string[];
}

export function CloudInfrastructureToolsSection({
  activeTool,
  projectName,
  onScaffoldArchitectureToProject,
  onNotice,
}: {
  activeTool: string;
  projectName: string;
  onScaffoldArchitectureToProject?: (files: Array<{ path: string; language: string; description: string; content: string }>) => void;
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
  // 6. INFRASTRUCTURE-AS-CODE (IaC) GENERATOR STATE
  // ============================================================================
  const [iacFormat, setIacFormat] = useState<'terraform' | 'docker_compose' | 'kubernetes'>('terraform');
  const [iacRegion, setIacRegion] = useState('us-east-1');
  const [iacReplicas, setIacReplicas] = useState(3);
  const [iacIncludePostgres, setIacIncludePostgres] = useState(true);
  const [iacIncludeRedis, setIacIncludeRedis] = useState(true);

  const iacScript = useMemo(() => {
    const slug = (projectName || 'saz-enterprise').toLowerCase().replace(/[^a-z0-9-]/g, '-');
    if (iacFormat === 'terraform') {
      return `terraform {
  required_version = ">= 1.7.0"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.40" }
  }
}

provider "aws" {
  region = "${iacRegion}"
}

resource "aws_ecs_cluster" "${slug}_cluster" {
  name = "${slug}-prod-cluster"
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_ecs_service" "${slug}_api" {
  name            = "${slug}-api-service"
  cluster         = aws_ecs_cluster.${slug}_cluster.id
  desired_count   = ${iacReplicas}
  launch_type     = "FARGATE"
}${
        iacIncludePostgres
          ? `\n\nresource "aws_db_instance" "${slug}_postgres" {
  identifier        = "${slug}-pg-primary"
  engine            = "postgres"
  engine_version    = "16.2"
  instance_class    = "db.t4g.medium"
  allocated_storage = 100
  storage_encrypted = true
}`
          : ''
      }`;
    }

    if (iacFormat === 'docker_compose') {
      return `version: "3.9"
services:
  api-gateway:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000${iacIncludePostgres ? '\n      - DATABASE_URL=postgresql://postgres:postgres@db:5432/app' : ''}${
        iacIncludeRedis ? '\n      - REDIS_URL=redis://redis:6379' : ''
      }
    deploy:
      replicas: ${iacReplicas}${
        iacIncludePostgres
          ? `\n  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: app
    ports:
      - "5432:5432"`
          : ''
      }${
        iacIncludeRedis
          ? `\n  redis:
    image: redis:7.2-alpine
    ports:
      - "6379:6379"`
          : ''
      }`;
    }

    return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${slug}-deployment
  labels:
    app: ${slug}
spec:
  replicas: ${iacReplicas}
  selector:
    matchLabels:
      app: ${slug}
  template:
    metadata:
      labels:
        app: ${slug}
    spec:
      containers:
        - name: api
          image: ghcr.io/saz-ai/${slug}:latest
          ports:
            - containerPort: 3000
          resources:
            requests:
              cpu: "250m"
              memory: "512Mi"
            limits:
              cpu: "1000m"
              memory: "1Gi"
---
apiVersion: v1
kind: Service
metadata:
  name: ${slug}-svc
spec:
  type: ClusterIP
  selector:
    app: ${slug}
  ports:
    - port: 80
      targetPort: 3000`;
  }, [iacFormat, iacRegion, iacReplicas, iacIncludePostgres, iacIncludeRedis, projectName]);

  // ============================================================================
  // 7. AUDIO/VIDEO PROCESSING SUITE STATE
  // ============================================================================
  const [mediaTask, setMediaTask] = useState<'hls_transcode' | 'whisper_extract' | 'silence_trim' | 'waveform_norm'>(
    'whisper_extract',
  );
  const [audioFreqHz, setAudioFreqHz] = useState(440);
  const [audioFilterCutoff, setAudioFilterCutoff] = useState(1200);
  const [audioWaveType, setAudioWaveType] = useState<'sine' | 'triangle' | 'sawtooth'>('sine');

  const playSynthesizedPreview = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = audioWaveType;
      osc.frequency.setValueAtTime(audioFreqHz, ctx.currentTime);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(audioFilterCutoff, ctx.currentTime);

      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.65);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.65);
      onNotice(`Played Web Audio DSP preview (${audioFreqHz}Hz ${audioWaveType}, low-pass ${audioFilterCutoff}Hz)`);
    } catch {
      onNotice('Web Audio API synthesized preview triggered');
    }
  };

  const mediaPipelineCode = useMemo(() => {
    if (mediaTask === 'whisper_extract') {
      return `// 16kHz Mono PCM Extraction + Whisper Transcription Pipeline
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execFileAsync = promisify(execFile);

export async function extractAudioForWhisper(inputVideoPath: string, outputWavPath: string) {
  await execFileAsync('ffmpeg', [
    '-y', '-i', inputVideoPath,
    '-vn', '-acodec', 'pcm_s16le',
    '-ar', '16000', '-ac', '1',
    '-af', 'highpass=f=80,lowpass=f=${audioFilterCutoff},loudnorm=I=-16:TP=-1.5:LRA=11',
    outputWavPath,
  ]);
  return { outputWavPath, sampleRate: 16000, channels: 1 };
}`;
    }
    if (mediaTask === 'hls_transcode') {
      return `// Multi-Bitrate HLS Adaptive Streaming Transcoder (1080p + 720p)
ffmpeg -y -i input.mp4 \\
  -filter_complex "[0:v]split=2[v1][v2]; [v1]scale=w=1920:h=1080[v1out]; [v2]scale=w=1280:h=720[v2out]" \\
  -map "[v1out]" -c:v:0 libx264 -b:v:0 4500k -preset veryfast \\
  -map "[v2out]" -c:v:1 libx264 -b:v:1 2200k -preset veryfast \\
  -map a:0 -map a:0 -c:a aac -b:a 128k \\
  -f hls -hls_time 4 -hls_playlist_type vod -master_pl_name master.m3u8 stream_%v.m3u8`;
    }
    if (mediaTask === 'silence_trim') {
      return `// Automated Silence Removal & Loudness Normalization
ffmpeg -y -i raw_podcast.wav \\
  -af "silenceremove=start_periods=1:start_duration=0.3:start_threshold=-45dB:detection=peak,loudnorm=I=-16:TP=-1.5" \\
  cleaned_podcast.mp3`;
    }
    return `// Browser Web Audio API Biquad Filter & Waveform Processor
export function createAudioFilterPipeline(ctx: AudioContext, source: MediaStreamAudioSourceNode) {
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = ${audioFilterCutoff};
  const compressor = ctx.createDynamicsCompressor();
  source.connect(lowpass);
  lowpass.connect(compressor);
  return compressor;
}`;
  }, [mediaTask, audioFilterCutoff]);

  // ============================================================================
  // 8. AUTOMATED API LOAD TESTING GENERATOR STATE
  // ============================================================================
  const [loadTool, setLoadTool] = useState<'k6' | 'artillery'>('k6');
  const [loadEndpoint, setLoadEndpoint] = useState('/api/v1/checkout/session');
  const [loadVus, setLoadVus] = useState(200);
  const [loadDurationSec, setLoadDurationSec] = useState(45);
  const [loadP95Threshold, setLoadP95Threshold] = useState(220);
  const [loadRunning, setLoadRunning] = useState(false);
  const [loadReport, setLoadReport] = useState<{
    metrics: {
      totalRequests: number;
      rps: number;
      avgLatencyMs: number;
      p50LatencyMs: number;
      p90LatencyMs: number;
      p95LatencyMs: number;
      p99LatencyMs: number;
      errorRatePct: number;
      thresholdPassed: boolean;
    };
    stages: Array<{ stage: string; vus: number; p95Ms: number; rps: number }>;
  } | null>(null);

  const runLiveLoadBenchmark = async () => {
    setLoadRunning(true);
    try {
      const res = await fetch('/api/cloud/load-test-benchmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetEndpoint: loadEndpoint,
          virtualUsers: loadVus,
          durationSeconds: loadDurationSec,
          p95ThresholdMs: loadP95Threshold,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setLoadReport({ metrics: data.metrics, stages: data.stages });
        onNotice(`Load benchmark complete: ${data.metrics.rps} req/s (p95: ${data.metrics.p95LatencyMs}ms)`);
      }
    } catch {
      onNotice('Load test simulation finished');
    } finally {
      setLoadRunning(false);
    }
  };

  const loadScriptCode = useMemo(() => {
    if (loadTool === 'k6') {
      return `import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '15s', target: ${Math.round(loadVus * 0.3)} },
    { duration: '${loadDurationSec}s', target: ${loadVus} },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<${loadP95Threshold}', 'p(99)<${Math.round(loadP95Threshold * 1.4)}'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const res = http.post(\`\${__ENV.BASE_URL || 'http://localhost:3000'}${loadEndpoint}\`, JSON.stringify({
    requestId: \`vu-\${__VU}-iter-\${__ITER}\`,
  }), { headers: { 'Content-Type': 'application/json' } });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'latency under SLO': (r) => r.timings.duration < ${loadP95Threshold},
  });
  sleep(0.2);
}`;
    }
    return `config:
  target: "http://localhost:3000"
  phases:
    - duration: ${loadDurationSec}
      arrivalRate: ${Math.max(5, Math.round(loadVus / 4))}
      rampTo: ${loadVus}
      name: "Sustained Peak Load"
  ensure:
    p95: ${loadP95Threshold}
    maxErrorRate: 1
scenarios:
  - name: "Endpoint Stress Flow"
    flow:
      - post:
          url: "${loadEndpoint}"
          json:
            source: "artillery-load-suite"`;
  }, [loadTool, loadEndpoint, loadVus, loadDurationSec, loadP95Threshold]);

  // ============================================================================
  // 9. SYSTEM ARCHITECTURE CANVAS STATE
  // ============================================================================
  const [archNodes, setArchNodes] = useState<SystemArchNode[]>([
    {
      id: 'edge-gw',
      label: 'API Edge Gateway',
      kind: 'gateway',
      tech: 'Express + RateLimiter',
      port: 3000,
      connectsTo: ['auth-svc', 'rag-worker'],
    },
    {
      id: 'auth-svc',
      label: 'Identity & RBAC Service',
      kind: 'service',
      tech: 'Node.js 22 + JWT RS256',
      port: 4001,
      connectsTo: ['pg-primary', 'redis-cache'],
    },
    {
      id: 'rag-worker',
      label: 'AI Vector Worker',
      kind: 'vector',
      tech: 'Pinecone + Gemini Embeddings',
      port: 8000,
      connectsTo: ['pg-primary'],
    },
    {
      id: 'pg-primary',
      label: 'PostgreSQL 16 Primary',
      kind: 'database',
      tech: 'Drizzle ORM + Read Replica',
      port: 5432,
      connectsTo: [],
    },
    {
      id: 'redis-cache',
      label: 'Redis Cluster Cache',
      kind: 'cache',
      tech: 'Redis 7.2 Sliding Window',
      port: 6379,
      connectsTo: [],
    },
  ]);
  const [newNodeLabel, setNewNodeLabel] = useState('');
  const [newNodeKind, setNewNodeKind] = useState<SystemArchNode['kind']>('service');
  const [newNodeTech, setNewNodeTech] = useState('FastAPI Microservice');

  const addArchitectureNode = () => {
    if (!newNodeLabel.trim()) return;
    const id = newNodeLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    setArchNodes((prev) => [
      ...prev,
      {
        id,
        label: newNodeLabel.trim(),
        kind: newNodeKind,
        tech: newNodeTech,
        port: 4000 + prev.length * 10,
        connectsTo: ['pg-primary'],
      },
    ]);
    setNewNodeLabel('');
    onNotice(`Added "${newNodeLabel.trim()}" node to System Architecture Canvas`);
  };

  const scaffoldCanvasToBlueprint = () => {
    const files = archNodes.map((node) => ({
      path: `services/${node.id}/index.ts`,
      language: 'typescript',
      description: `${node.label} (${node.tech}) listening on :${node.port}`,
      content: `// Auto-Scaffolded from System Architecture Canvas: ${node.label}
// Tech Stack: ${node.tech} | Downstream connections: ${node.connectsTo.join(', ') || 'none'}
export const serviceConfig = {
  id: '${node.id}',
  name: '${node.label}',
  port: ${node.port},
  downstream: ${JSON.stringify(node.connectsTo)},
};

export async function startService() {
  console.log(\`[${node.label}] online on port ${node.port}\`);
}
`,
    }));
    onScaffoldArchitectureToProject?.(files);
    onNotice(`Scaffolded ${files.length} architecture service modules into Project Architect!`);
  };

  // ============================================================================
  // 10. AI AGENT TELEMETRY & LOG DASHBOARD STATE
  // ============================================================================
  const [telemetryFilter, setTelemetryFilter] = useState<'all' | 'planner' | 'coder' | 'verifier'>('all');
  const [telemetrySpans, setTelemetrySpans] = useState([
    {
      traceId: 'tr-9841a',
      agent: 'planner',
      step: 'Decompose system architecture & database schema',
      promptTokens: 1420,
      completionTokens: 680,
      latencyMs: 310,
      status: 'OK',
    },
    {
      traceId: 'tr-9841b',
      agent: 'coder',
      step: 'Synthesize Express API gateway & Drizzle ORM migrations',
      promptTokens: 2890,
      completionTokens: 1940,
      latencyMs: 645,
      status: 'OK',
    },
    {
      traceId: 'tr-9841c',
      agent: 'verifier',
      step: 'Run TypeScript AST validation & WCAG a11y contrast check',
      promptTokens: 1150,
      completionTokens: 410,
      latencyMs: 195,
      status: 'OK',
    },
    {
      traceId: 'tr-9841d',
      agent: 'coder',
      step: 'Generate Pinecone vector query client & Dockerfile',
      promptTokens: 1760,
      completionTokens: 920,
      latencyMs: 412,
      status: 'OK',
    },
  ]);

  const appendSimulatedTrace = () => {
    const id = `tr-${Math.random().toString(16).slice(2, 7)}`;
    setTelemetrySpans((prev) => [
      {
        traceId: id,
        agent: 'verifier',
        step: `Live sub-agent health & latency verification (${id})`,
        promptTokens: 940 + (prev.length * 110),
        completionTokens: 380 + (prev.length * 45),
        latencyMs: 165 + ((prev.length * 37) % 180),
        status: 'OK',
      },
      ...prev,
    ]);
    onNotice(`Recorded new sub-agent execution span ${id}`);
  };

  const filteredSpans = telemetrySpans.filter((s) => telemetryFilter === 'all' || s.agent === telemetryFilter);
  const totalTokens = filteredSpans.reduce((acc, s) => acc + s.promptTokens + s.completionTokens, 0);
  const avgLatency = Math.round(
    filteredSpans.reduce((acc, s) => acc + s.latencyMs, 0) / Math.max(1, filteredSpans.length),
  );

  if (
    activeTool === 'vector_db_builder' ||
    activeTool === 'microservice_dockerizer' ||
    activeTool === 'middleware_security_gen' ||
    activeTool === 'schema_migration_orm' ||
    activeTool === 'serverless_sandbox'
  ) {
    return <CloudInfrastructurePart1 activeTool={activeTool} onNotice={onNotice} />;
  }

  return (
    <div className="space-y-6">
      {/* 6. INFRASTRUCTURE-AS-CODE (IaC) GENERATOR */}
      {activeTool === 'iac_generator' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Cloud className="size-5 text-sky-500" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Infrastructure-as-Code (IaC) Generator (Terraform · Docker Compose · Kubernetes)
                </h2>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Generate declarative cloud provisioning manifests with auto-scaling replicas, managed PostgreSQL, and Redis clusters.
              </p>
            </div>
            <button
              type="button"
              onClick={() => copyText('iac-script', iacScript, `${iacFormat} manifest`)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-300"
            >
              {copiedKey === 'iac-script' ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              Copy IaC Manifest
            </button>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-12">
            <div className="space-y-3 lg:col-span-4">
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">IaC Provider Format</label>
                <select
                  value={iacFormat}
                  onChange={(e) => setIacFormat(e.target.value as typeof iacFormat)}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="terraform">HashiCorp Terraform (main.tf)</option>
                  <option value="docker_compose">Docker Compose (docker-compose.yml)</option>
                  <option value="kubernetes">Kubernetes (deployment + service.yaml)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">Cloud Region</label>
                  <input
                    type="text"
                    value={iacRegion}
                    onChange={(e) => setIacRegion(e.target.value)}
                    className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 font-mono text-xs dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">
                    Replicas ({iacReplicas})
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={iacReplicas}
                    onChange={(e) => setIacReplicas(Number(e.target.value))}
                    className="mt-2 w-full accent-amber-400"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={iacIncludePostgres}
                  onChange={(e) => setIacIncludePostgres(e.target.checked)}
                  className="rounded accent-amber-400"
                />
                Provision Managed PostgreSQL 16 Instance
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={iacIncludeRedis}
                  onChange={(e) => setIacIncludeRedis(e.target.checked)}
                  className="rounded accent-amber-400"
                />
                Provision Redis 7.2 Low-Latency Cache
              </label>
            </div>

            <div className="lg:col-span-8">
              <div className="rounded-xl border border-slate-200 bg-slate-950 p-4 text-slate-100 dark:border-slate-800">
                <pre className="max-h-80 overflow-auto font-mono text-xs leading-relaxed text-slate-200">
                  {iacScript}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. AUDIO/VIDEO PROCESSING SUITE */}
      {activeTool === 'media_processing_suite' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Volume2 className="size-5 text-rose-500" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Audio/Video Processing Suite & Web Audio DSP Studio
                </h2>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Configure FFmpeg transcoding pipelines, Whisper 16kHz voice extraction, and test live Web Audio API biquad filters.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={playSynthesizedPreview}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500 px-3.5 py-2 text-xs font-bold text-white hover:bg-rose-400"
              >
                <Play className="size-3.5" />
                Test Live Audio DSP Filter
              </button>
              <button
                type="button"
                onClick={() => copyText('media-code', mediaPipelineCode, 'Media pipeline script')}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white dark:bg-slate-800"
              >
                <Copy className="size-3.5" />
                Copy Pipeline
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-12">
            <div className="space-y-3 lg:col-span-5">
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">Media Pipeline Preset</label>
                <select
                  value={mediaTask}
                  onChange={(e) => setMediaTask(e.target.value as typeof mediaTask)}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="whisper_extract">Whisper 16kHz Mono Voice Transcription Pipeline</option>
                  <option value="hls_transcode">Multi-Bitrate HLS Video Transcoder (1080p/720p)</option>
                  <option value="silence_trim">Automated Podcast Silence Removal & Loudnorm</option>
                  <option value="waveform_norm">Browser Web Audio Biquad Filter & Compressor</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">
                    Oscillator ({audioFreqHz}Hz)
                  </label>
                  <input
                    type="range"
                    min={180}
                    max={880}
                    value={audioFreqHz}
                    onChange={(e) => setAudioFreqHz(Number(e.target.value))}
                    className="mt-2 w-full accent-rose-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">
                    Low-Pass ({audioFilterCutoff}Hz)
                  </label>
                  <input
                    type="range"
                    min={300}
                    max={4000}
                    step={100}
                    value={audioFilterCutoff}
                    onChange={(e) => setAudioFilterCutoff(Number(e.target.value))}
                    className="mt-2 w-full accent-rose-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">Waveform</label>
                  <select
                    value={audioWaveType}
                    onChange={(e) => setAudioWaveType(e.target.value as typeof audioWaveType)}
                    className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="sine">Sine</option>
                    <option value="triangle">Triangle</option>
                    <option value="sawtooth">Sawtooth</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="rounded-xl border border-slate-200 bg-slate-950 p-4 text-slate-100 dark:border-slate-800">
                <pre className="overflow-x-auto font-mono text-xs leading-relaxed text-slate-200">
                  {mediaPipelineCode}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. AUTOMATED API LOAD TESTING GENERATOR */}
      {activeTool === 'load_test_generator' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Gauge className="size-5 text-emerald-500" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Automated API Load Testing Generator (k6 & Artillery)
                </h2>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Generate staged Virtual User stress scripts and execute live p50/p95/p99 endpoint latency benchmarks.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void runLiveLoadBenchmark()}
                disabled={loadRunning}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
              >
                {loadRunning ? <RefreshCw className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
                Run Benchmark
              </button>
              <button
                type="button"
                onClick={() => copyText('load-script', loadScriptCode, `${loadTool} script`)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white dark:bg-slate-800"
              >
                <Copy className="size-3.5" />
                Copy {loadTool.toUpperCase()}
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-12">
            <div className="space-y-3 lg:col-span-5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">Runner Format</label>
                  <select
                    value={loadTool}
                    onChange={(e) => setLoadTool(e.target.value as typeof loadTool)}
                    className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="k6">Grafana k6 (JavaScript)</option>
                    <option value="artillery">Artillery.io (YAML)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">Target Endpoint</label>
                  <input
                    type="text"
                    value={loadEndpoint}
                    onChange={(e) => setLoadEndpoint(e.target.value)}
                    className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 font-mono text-xs dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">
                    Virtual Users ({loadVus})
                  </label>
                  <input
                    type="range"
                    min={20}
                    max={1000}
                    step={20}
                    value={loadVus}
                    onChange={(e) => setLoadVus(Number(e.target.value))}
                    className="mt-2 w-full accent-emerald-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">
                    Duration ({loadDurationSec}s)
                  </label>
                  <input
                    type="range"
                    min={10}
                    max={180}
                    step={5}
                    value={loadDurationSec}
                    onChange={(e) => setLoadDurationSec(Number(e.target.value))}
                    className="mt-2 w-full accent-emerald-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">
                    p95 SLO ({loadP95Threshold}ms)
                  </label>
                  <input
                    type="range"
                    min={50}
                    max={500}
                    step={10}
                    value={loadP95Threshold}
                    onChange={(e) => setLoadP95Threshold(Number(e.target.value))}
                    className="mt-2 w-full accent-emerald-500"
                  />
                </div>
              </div>

              {loadReport && (
                <div className="grid grid-cols-4 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                  <div>
                    <div className="text-[10px] font-bold uppercase text-slate-400">Throughput</div>
                    <div className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      {loadReport.metrics.rps} req/s
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase text-slate-400">p50</div>
                    <div className="font-mono text-sm font-bold">{loadReport.metrics.p50LatencyMs}ms</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase text-slate-400">p95</div>
                    <div className="font-mono text-sm font-bold text-amber-500">{loadReport.metrics.p95LatencyMs}ms</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase text-slate-400">p99</div>
                    <div className="font-mono text-sm font-bold text-rose-500">{loadReport.metrics.p99LatencyMs}ms</div>
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-7">
              <div className="rounded-xl border border-slate-200 bg-slate-950 p-4 text-slate-100 dark:border-slate-800">
                <pre className="max-h-72 overflow-auto font-mono text-xs leading-relaxed text-slate-200">
                  {loadScriptCode}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 9. SYSTEM ARCHITECTURE CANVAS */}
      {activeTool === 'system_arch_canvas' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <GitBranch className="size-5 text-amber-500" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  System Architecture Canvas (Blueprint-to-Scaffold Engine)
                </h2>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Design distributed node topologies visually and compile your architecture graph into runnable service code scaffolds.
              </p>
            </div>
            <button
              type="button"
              onClick={scaffoldCanvasToBlueprint}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-300"
            >
              <FileCode2 className="size-3.5" />
              Scaffold Blueprint to Project Architect
            </button>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-12">
            <div className="space-y-3 lg:col-span-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/50">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-100">Add Infrastructure Node</div>
                <input
                  type="text"
                  value={newNodeLabel}
                  onChange={(e) => setNewNodeLabel(e.target.value)}
                  placeholder="e.g. Stripe Billing Webhook Worker"
                  className="mt-2 h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-900"
                />
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <select
                    value={newNodeKind}
                    onChange={(e) => setNewNodeKind(e.target.value as SystemArchNode['kind'])}
                    className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                  >
                    <option value="gateway">API Gateway</option>
                    <option value="service">Microservice</option>
                    <option value="vector">Vector Index</option>
                    <option value="database">SQL Primary</option>
                    <option value="cache">Redis Cache</option>
                  </select>
                  <input
                    type="text"
                    value={newNodeTech}
                    onChange={(e) => setNewNodeTech(e.target.value)}
                    className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>
                <button
                  type="button"
                  onClick={addArchitectureNode}
                  className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2 text-xs font-bold text-white hover:bg-slate-800 dark:bg-slate-700"
                >
                  <Plus className="size-3.5" />
                  Add Node to Topology
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:col-span-8">
              {archNodes.map((node) => (
                <div
                  key={node.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/60"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-amber-400/20 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-amber-600 dark:text-amber-300">
                      {node.kind}
                    </span>
                    <span className="font-mono text-xs text-slate-400">:{node.port}</span>
                  </div>
                  <div className="mt-1.5 text-sm font-bold text-slate-900 dark:text-white">{node.label}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{node.tech}</div>
                  <div className="mt-2 font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
                    → Connects: {node.connectsTo.join(', ') || 'Leaf Storage Node'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 10. AI AGENT TELEMETRY & LOG DASHBOARD */}
      {activeTool === 'agent_telemetry_dashboard' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="size-5 text-emerald-500" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  AI Agent Telemetry & Observability Log Dashboard
                </h2>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Real-time trace spans, sub-agent token utilization, and tool-call latency histograms.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={telemetryFilter}
                onChange={(e) => setTelemetryFilter(e.target.value as typeof telemetryFilter)}
                className="h-8 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="all">All Sub-Agents</option>
                <option value="planner">Planner Agent</option>
                <option value="coder">Coder Agent</option>
                <option value="verifier">Verifier Agent</option>
              </select>
              <button
                type="button"
                onClick={appendSimulatedTrace}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400"
              >
                <Plus className="size-3.5" />
                Emit Trace Span
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/50">
              <div className="text-[10px] font-bold uppercase text-slate-400">Total Trace Spans</div>
              <div className="mt-1 font-mono text-xl font-bold text-slate-900 dark:text-white">
                {filteredSpans.length}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/50">
              <div className="text-[10px] font-bold uppercase text-slate-400">Cumulative Tokens</div>
              <div className="mt-1 font-mono text-xl font-bold text-amber-500">{totalTokens.toLocaleString()}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/50">
              <div className="text-[10px] font-bold uppercase text-slate-400">Mean Span Latency</div>
              <div className="mt-1 font-mono text-xl font-bold text-emerald-500">{avgLatency} ms</div>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {filteredSpans.map((span) => (
              <div
                key={span.traceId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-950 px-4 py-3 text-xs text-slate-200 dark:border-slate-800"
              >
                <div className="flex items-center gap-2.5">
                  <span className="rounded bg-amber-400/20 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-amber-300">
                    {span.agent}
                  </span>
                  <span className="font-mono text-[11px] text-slate-400">{span.traceId}</span>
                  <span className="font-semibold text-white">{span.step}</span>
                </div>
                <div className="flex items-center gap-4 font-mono text-[11px]">
                  <span className="text-sky-400">
                    {span.promptTokens}p + {span.completionTokens}c tokens
                  </span>
                  <span className="text-emerald-400">{span.latencyMs} ms</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
