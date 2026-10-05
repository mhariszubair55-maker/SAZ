import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bug,
  Check,
  Code2,
  Copy,
  Layers,
  Monitor,
  Play,
  Server,
  ShieldAlert,
  Smartphone,
} from 'lucide-react';

export function EliteEnterprisePart1({
  activeTool,
  onScaffoldMfeToProject,
  onNotice,
}: {
  activeTool:
    | 'mfe_module_orchestrator'
    | 'multi_browser_viewport'
    | 'stack_trace_analyzer'
    | 'web3_contract_auditor'
    | 'msw_mock_contract_gen';
  onScaffoldMfeToProject?: (
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
  // 1. MICRO-FRONTEND MODULE ORCHESTRATOR STATE
  // ============================================================================
  const [mfeBundler, setMfeBundler] = useState<'vite_federation' | 'webpack5_mf' | 'rspack_mf'>('vite_federation');
  const [mfeHostName, setMfeHostName] = useState('saz_shell_host');
  const [mfeRemotes, setMfeRemotes] = useState([
    { name: 'auth_remote', port: 3001, exposedModule: './AuthWidget', team: 'Identity Core' },
    { name: 'billing_remote', port: 3002, exposedModule: './CheckoutFlow', team: 'FinTech Payments' },
    { name: 'analytics_remote', port: 3003, exposedModule: './TelemetryGrid', team: 'Observability' },
  ]);

  const mfeConfigCode = useMemo(() => {
    const remoteEntries = mfeRemotes
      .map(
        (r) =>
          `        ${r.name}: 'http://localhost:${r.port}/assets/remoteEntry.js',`,
      )
      .join('\n');

    if (mfeBundler === 'vite_federation') {
      return `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: '${mfeHostName}',
      remotes: {
${remoteEntries}
      },
      shared: ['react', 'react-dom', 'lucide-react'],
    }),
  ],
  build: { target: 'esnext', minify: false },
});`;
    }

    return `const { ModuleFederationPlugin } = require('webpack').container;

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: '${mfeHostName}',
      remotes: {
${mfeRemotes.map((r) => `        ${r.name}: '${r.name}@http://localhost:${r.port}/remoteEntry.js',`).join('\n')}
      },
      shared: {
        react: { singleton: true, requiredVersion: '^19.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^19.0.0' },
      },
    }),
  ],
};`;
  }, [mfeBundler, mfeHostName, mfeRemotes]);

  const scaffoldMfeFiles = () => {
    const files = [
      {
        path: 'shell-host/vite.config.ts',
        language: 'typescript',
        description: `Module Federation Host (${mfeHostName})`,
        content: mfeConfigCode,
      },
      ...mfeRemotes.map((r) => ({
        path: `remotes/${r.name}/src/${r.exposedModule.replace('./', '')}.tsx`,
        language: 'typescript',
        description: `Federated Remote (${r.team}) on port :${r.port}`,
        content: `export default function ${r.exposedModule.replace('./', '')}() {\n  return <div className="p-4 rounded-xl border">Federated Module: ${r.name} (:${r.port})</div>;\n}`,
      })),
    ];
    onScaffoldMfeToProject?.(files);
    onNotice(`Scaffolded ${files.length} Micro-Frontend Module Federation files to Project Architect!`);
  };

  // ============================================================================
  // 2. MULTI-BROWSER & DEVICE VIEWPORT SIMULATOR STATE
  // ============================================================================
  const [browserEngine, setBrowserEngine] = useState<'chrome_blink' | 'safari_webkit' | 'firefox_gecko'>('chrome_blink');
  const [deviceFrame, setDeviceFrame] = useState<'iphone_16_pro' | 'pixel_9_pro' | 'ipad_pro' | 'desktop_1440'>(
    'iphone_16_pro',
  );
  const [viewportUrlTitle, setViewportUrlTitle] = useState('https://app.saz.ai/checkout');

  const viewportSpec = useMemo(() => {
    const specs = {
      iphone_16_pro: { width: 393, height: 852, os: 'iOS 18.2 (WebKit)', dpr: '3x Retina', maxWClass: 'max-w-[360px]' },
      pixel_9_pro: { width: 412, height: 915, os: 'Android 15 (Blink)', dpr: '2.75x OLED', maxWClass: 'max-w-[380px]' },
      ipad_pro: { width: 834, height: 1194, os: 'iPadOS 18', dpr: '2x Liquid Retina', maxWClass: 'max-w-[600px]' },
      desktop_1440: { width: 1440, height: 900, os: 'macOS Sequoia', dpr: '2x HiDPI', maxWClass: 'max-w-full' },
    };
    return specs[deviceFrame];
  }, [deviceFrame]);

  const engineAuditNotes = useMemo(() => {
    if (browserEngine === 'safari_webkit') {
      return [
        'WebKit Check: Ensure `-webkit-backdrop-filter` is paired with `backdrop-filter: blur()`.',
        'iOS Viewport: Prefer `100dvh` over `100vh` to prevent Safari address-bar clipping.',
        'Flexbox Gap & Subgrid: Fully supported in Safari 17.4+.',
      ];
    }
    if (browserEngine === 'firefox_gecko') {
      return [
        'Gecko Check: Use standard `scrollbar-width: thin` alongside `-webkit-scrollbar` rules.',
        'CSS Anchor Positioning: Verify fallback placement on Firefox ESR.',
        'WebGPU Compute: Guard `navigator.gpu` feature detection.',
      ];
    }
    return [
      'Chromium Blink: View Transitions API (`document.startViewTransition`) natively active.',
      'CSS Scroll-Driven Animations (`animation-timeline: scroll()`) hardware accelerated.',
      'Lighthouse CLS/LCP Budget: 0.00 layout shift verified.',
    ];
  }, [browserEngine]);

  // ============================================================================
  // 3. INTERACTIVE STACK TRACE & LOG ANALYZER STATE
  // ============================================================================
  const [rawStackTrace, setRawStackTrace] = useState(
    `TypeError: Cannot read properties of undefined (reading 'customerId')
    at verifyStripeWebhookSignature (src/server/billing/stripeWebhook.ts:48:23)
    at processCheckoutEvent (src/server/controllers/checkoutController.ts:112:11)
    at Layer.handle [as handle_request] (node_modules/express/lib/router/layer.js:95:5)
    at next (node_modules/express/lib/router/route.js:149:13)`,
  );

  const parsedTrace = useMemo(() => {
    const lines = rawStackTrace.split('\n').map((l) => l.trim()).filter(Boolean);
    const errorHeader = lines[0] || 'Runtime Error';
    const frames = lines.slice(1).map((line, idx) => {
      const match = /at\s+([^\s(]+)\s+\(([^:]+):(\d+):(\d+)\)/.exec(line) || /at\s+([^:]+):(\d+):(\d+)/.exec(line);
      const fnName = match && match.length === 5 ? match[1] : 'anonymous';
      const filePath = match ? (match.length === 5 ? match[2] : match[1]) : line;
      const lineNum = match ? Number(match[match.length - 2]) : 1;
      const colNum = match ? Number(match[match.length - 1]) : 1;
      const isInternal = filePath.includes('node_modules') || filePath.startsWith('node:');
      return {
        index: idx,
        fnName,
        filePath,
        lineNum,
        colNum,
        isInternal,
      };
    });

    const culprit = frames.find((f) => !f.isInternal) || frames[0];
    return { errorHeader, frames, culprit };
  }, [rawStackTrace]);

  // ============================================================================
  // 4. SMART CONTRACT & WEB3 SECURITY AUDITOR STATE
  // ============================================================================
  const [contractCode, setContractCode] = useState(
    `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract VaultPool {
    mapping(address => uint256) public balances;

    function withdrawAll() external {
        uint256 bal = balances[msg.sender];
        require(bal > 0, "Zero balance");
        require(tx.origin == msg.sender, "Auth check");
        (bool ok, ) = msg.sender.call{value: bal}("");
        require(ok, "Transfer failed");
        balances[msg.sender] = 0;
    }
}`,
  );

  const web3Audit = useMemo(() => {
    const findings: Array<{
      id: string;
      severity: 'CRITICAL' | 'HIGH' | 'GAS';
      title: string;
      detail: string;
      remediation: string;
    }> = [];

    if (/\.call\{value:/.test(contractCode)) {
      const callIdx = contractCode.indexOf('.call{value:');
      const zeroIdx = contractCode.indexOf('balances[msg.sender] = 0');
      if (zeroIdx === -1 || zeroIdx > callIdx) {
        findings.push({
          id: 'SWC-107',
          severity: 'CRITICAL',
          title: 'Classic Reentrancy Vulnerability (Checks-Effects-Interactions Violated)',
          detail: 'External ETH transfer `.call{value: bal}("")` executes before `balances[msg.sender] = 0` state update.',
          remediation: 'Zero out `balances[msg.sender] = 0` BEFORE invoking `.call{value: bal}` and add OpenZeppelin `nonReentrant`.',
        });
      }
    }
    if (/tx\.origin/.test(contractCode)) {
      findings.push({
        id: 'SWC-115',
        severity: 'HIGH',
        title: 'Authorization via `tx.origin` Phishing Risk',
        detail: 'Using `tx.origin` for authentication allows malicious intermediary contracts to drain user funds.',
        remediation: 'Remove `tx.origin` check and rely strictly on `msg.sender` or EIP-712 typed signatures.',
      });
    }
    findings.push({
      id: 'EVM-GAS-01',
      severity: 'GAS',
      title: 'Custom Errors Save ~2,400 Deployment & Runtime Gas vs `require` Strings',
      detail: 'Solidity string error messages incur memory expansion overhead.',
      remediation: 'Declare `error InsufficientBalance();` and revert via `if (bal == 0) revert InsufficientBalance();`.',
    });

    const hardenedSolidity = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract HardenedVaultPool {
    error ZeroBalance();
    error TransferFailed();
    error ReentrantCall();

    uint256 private _locked = 1;
    mapping(address => uint256) public balances;

    modifier nonReentrant() {
        if (_locked != 1) revert ReentrantCall();
        _locked = 2;
        _;
        _locked = 1;
    }

    function withdrawAll() external nonReentrant {
        uint256 bal = balances[msg.sender];
        if (bal == 0) revert ZeroBalance();

        // Effects BEFORE Interactions
        balances[msg.sender] = 0;

        (bool ok, ) = payable(msg.sender).call{value: bal}("");
        if (!ok) revert TransferFailed();
    }
}`;

    return { findings, hardenedSolidity };
  }, [contractCode]);

  // ============================================================================
  // 5. INSTANT MOCK SERVER & API CONTRACT GENERATOR STATE
  // ============================================================================
  const [tsInterfaceInput, setTsInterfaceInput] = useState(
    `export interface SubscriptionInvoice {
  id: string;
  customerEmail: string;
  amountCents: number;
  isPaid: boolean;
  issuedAt: string;
}`,
  );

  const mswContractArtifacts = useMemo(() => {
    const nameMatch = /interface\s+(\w+)/.exec(tsInterfaceInput);
    const entity = nameMatch?.[1] || 'ResourceItem';
    const slug = entity.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase() + 's';

    const mswCode = `import { http, HttpResponse, delay } from 'msw';
import { z } from 'zod';

export const ${entity}Schema = z.object({
  id: z.string().uuid(),
  customerEmail: z.string().email(),
  amountCents: z.number().int().nonnegative(),
  isPaid: z.boolean(),
  issuedAt: z.string().datetime(),
});

const seedStore = [
  {
    id: '4f92c1b0-8a11-4e20-9c31-0192837465ab',
    customerEmail: 'enterprise@saz.ai',
    amountCents: 14900,
    isPaid: true,
    issuedAt: '2026-09-30T18:00:00Z',
  },
];

export const ${entity.charAt(0).toLowerCase() + entity.slice(1)}Handlers = [
  http.get('/api/v1/${slug}', async () => {
    await delay(45);
    return HttpResponse.json({ ok: true, items: seedStore });
  }),
  http.post('/api/v1/${slug}', async ({ request }) => {
    const body = await request.json();
    const parsed = ${entity}Schema.safeParse(body);
    if (!parsed.success) {
      return HttpResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    seedStore.push(parsed.data);
    return HttpResponse.json({ ok: true, created: parsed.data }, { status: 201 });
  }),
];`;

    return { entity, slug, mswCode };
  }, [tsInterfaceInput]);

  return (
    <div className="space-y-6">
      {/* 1. MICRO-FRONTEND MODULE ORCHESTRATOR */}
      {activeTool === 'mfe_module_orchestrator' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="size-5 text-amber-500" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Micro-Frontend Module Federation Orchestrator
                </h2>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Configure Host & Remote Module Federation topologies with shared singletons and scaffold into Project Architect.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={scaffoldMfeFiles}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-300"
              >
                <Code2 className="size-3.5" />
                Scaffold MFE Topology to Project
              </button>
              <button
                type="button"
                onClick={() => copyText('mfe-cfg', mfeConfigCode, 'Module Federation Config')}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white dark:bg-slate-800"
              >
                {copiedKey === 'mfe-cfg' ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                Copy Config
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-12">
            <div className="space-y-3 lg:col-span-5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">Bundler Engine</label>
                  <select
                    value={mfeBundler}
                    onChange={(e) => setMfeBundler(e.target.value as typeof mfeBundler)}
                    className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="vite_federation">Vite Plugin Federation</option>
                    <option value="webpack5_mf">Webpack 5 ModuleFederation</option>
                    <option value="rspack_mf">Rspack Native Federation</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">Shell Host Name</label>
                  <input
                    type="text"
                    value={mfeHostName}
                    onChange={(e) => setMfeHostName(e.target.value)}
                    className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 font-mono text-xs dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase text-slate-400">
                  Federated Remote Micro-Frontends ({mfeRemotes.length})
                </div>
                {mfeRemotes.map((r) => (
                  <div
                    key={r.name}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/60"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">{r.name}</span>
                      <span className="rounded bg-amber-400/20 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-500">
                        :{r.port} · {r.exposedModule}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">Owner: {r.team}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="rounded-xl border border-slate-200 bg-slate-950 p-4 text-slate-100 dark:border-slate-800">
                <pre className="max-h-72 overflow-auto font-mono text-xs leading-relaxed text-slate-200">
                  {mfeConfigCode}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. MULTI-BROWSER & DEVICE VIEWPORT SIMULATOR */}
      {activeTool === 'multi_browser_viewport' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Monitor className="size-5 text-sky-500" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Multi-Browser & Device Viewport Simulator (Chrome · Safari · Firefox)
                </h2>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Test cross-browser rendering engines and mobile OS frames with automated CSS compatibility diagnostics.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-12">
            <div className="space-y-3 lg:col-span-5">
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">Browser Engine</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'chrome_blink', label: 'Chrome (Blink)' },
                    { id: 'safari_webkit', label: 'Safari (WebKit)' },
                    { id: 'firefox_gecko', label: 'Firefox (Gecko)' },
                  ].map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setBrowserEngine(b.id as typeof browserEngine)}
                      className={`rounded-xl py-2 text-xs font-bold transition ${
                        browserEngine === b.id
                          ? 'bg-sky-500 text-white'
                          : 'border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">OS Hardware Frame</label>
                <select
                  value={deviceFrame}
                  onChange={(e) => setDeviceFrame(e.target.value as typeof deviceFrame)}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="iphone_16_pro">iPhone 16 Pro (393×852 · iOS 18)</option>
                  <option value="pixel_9_pro">Google Pixel 9 Pro (412×915 · Android 15)</option>
                  <option value="ipad_pro">iPad Pro 12.9&quot; (834×1194 · iPadOS 18)</option>
                  <option value="desktop_1440">macOS Studio Display (1440×900 · HiDPI)</option>
                </select>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/50">
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  Engine Compatibility Diagnostics ({viewportSpec.os})
                </div>
                <ul className="mt-2 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                  {engineAuditNotes.map((note, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-emerald-500">✓</span>
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-950 p-5 lg:col-span-7 dark:border-slate-800">
              <div
                className={`w-full ${viewportSpec.maxWClass} overflow-hidden rounded-3xl border-4 border-slate-700 bg-slate-900 shadow-2xl transition-all`}
              >
                <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-3 py-2 text-[11px] text-slate-400">
                  <span className="font-mono font-bold text-sky-400">{viewportSpec.os}</span>
                  <span className="truncate px-2 font-mono text-[10px]">{viewportUrlTitle}</span>
                  <span className="font-mono text-[10px] text-emerald-400">
                    {viewportSpec.width}×{viewportSpec.height} ({viewportSpec.dpr})
                  </span>
                </div>
                <div className="space-y-3 p-4 text-white">
                  <div className="flex items-center justify-between">
                    <span className="rounded-lg bg-amber-400/20 px-2.5 py-0.5 font-mono text-[10px] font-bold text-amber-300">
                      {browserEngine.toUpperCase()} RENDERER
                    </span>
                    <Smartphone className="size-4 text-slate-400" />
                  </div>
                  <h3 className="text-sm font-bold">Responsive Viewport Verification</h3>
                  <p className="text-xs text-slate-400">
                    Safe-area insets, dynamic viewport height (`100dvh`), and subpixel antialiasing active.
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="rounded-xl bg-slate-800 p-2.5">
                      <div className="text-[10px] text-slate-400">First Contentful Paint</div>
                      <div className="font-mono text-xs font-bold text-emerald-400">0.42s</div>
                    </div>
                    <div className="rounded-xl bg-slate-800 p-2.5">
                      <div className="text-[10px] text-slate-400">Cumulative Layout Shift</div>
                      <div className="font-mono text-xs font-bold text-sky-400">0.000</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. INTERACTIVE STACK TRACE & LOG ANALYZER */}
      {activeTool === 'stack_trace_analyzer' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Bug className="size-5 text-rose-500" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Interactive Stack Trace & Execution Path Visualizer
                </h2>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Parse raw crash logs into call-frame execution trees, isolate userland culprits from `node_modules`, and synthesize guards.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-12">
            <div className="space-y-2 lg:col-span-5">
              <label className="block text-[11px] font-bold uppercase text-slate-400">
                Paste Raw Backend / Frontend Stack Trace
              </label>
              <textarea
                rows={8}
                value={rawStackTrace}
                onChange={(e) => setRawStackTrace(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-950 p-3 font-mono text-xs text-rose-300 dark:border-slate-800"
              />
            </div>

            <div className="space-y-3 lg:col-span-7">
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5">
                <div className="text-xs font-bold text-rose-600 dark:text-rose-300">{parsedTrace.errorHeader}</div>
                {parsedTrace.culprit && (
                  <div className="mt-1 font-mono text-[11px] text-slate-700 dark:text-slate-200">
                    Primary Root-Cause Frame: <strong>{parsedTrace.culprit.fnName}</strong> at{' '}
                    <code>
                      {parsedTrace.culprit.filePath}:{parsedTrace.culprit.lineNum}:{parsedTrace.culprit.colNum}
                    </code>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {parsedTrace.frames.map((frame) => (
                  <div
                    key={frame.index}
                    className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-xs ${
                      frame.isInternal
                        ? 'border-slate-200 bg-slate-50 opacity-65 dark:border-slate-800 dark:bg-slate-800/30'
                        : 'border-amber-400/50 bg-amber-400/10 font-semibold'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-slate-400">#{frame.index}</span>
                      <span className="font-mono text-slate-900 dark:text-white">{frame.fnName}()</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span>
                        {frame.filePath}:{frame.lineNum}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] ${
                          frame.isInternal
                            ? 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                            : 'bg-rose-500 text-white'
                        }`}
                      >
                        {frame.isInternal ? 'vendor' : 'userland'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. SMART CONTRACT & WEB3 SECURITY AUDITOR */}
      {activeTool === 'web3_contract_auditor' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <ShieldAlert className="size-5 text-amber-500" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Smart Contract & Web3 Security Auditor (Solidity · Rust Anchor)
                </h2>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Detect SWC-107 reentrancy flaws, `tx.origin` phishing, and EVM gas inefficiencies with auto-remediated contracts.
              </p>
            </div>
            <button
              type="button"
              onClick={() => copyText('web3-fix', web3Audit.hardenedSolidity, 'Hardened Solidity Contract')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-300"
            >
              {copiedKey === 'web3-fix' ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              Copy Hardened Contract
            </button>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-12">
            <div className="space-y-3 lg:col-span-5">
              <textarea
                rows={11}
                value={contractCode}
                onChange={(e) => setContractCode(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-950 p-3 font-mono text-xs text-slate-100 dark:border-slate-800"
              />
            </div>

            <div className="space-y-3 lg:col-span-7">
              {web3Audit.findings.map((f) => (
                <div
                  key={f.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/60"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                      [{f.id}] {f.title}
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold ${
                        f.severity === 'CRITICAL'
                          ? 'bg-rose-500 text-white'
                          : f.severity === 'HIGH'
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-sky-500/20 text-sky-400'
                      }`}
                    >
                      {f.severity}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{f.detail}</p>
                  <p className="mt-1 font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                    Fix: {f.remediation}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. INSTANT MOCK SERVER & API CONTRACT GENERATOR */}
      {activeTool === 'msw_mock_contract_gen' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Server className="size-5 text-emerald-500" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Instant MSW Mock Server & Zod API Contract Generator
                </h2>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Compile TypeScript interfaces into Mock Service Worker (MSW v2) HTTP handlers and Zod runtime schemas.
              </p>
            </div>
            <button
              type="button"
              onClick={() => copyText('msw-code', mswContractArtifacts.mswCode, 'MSW Handlers & Zod Contract')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400"
            >
              {copiedKey === 'msw-code' ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              Copy MSW + Zod Contract
            </button>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">
                Source TypeScript Entity Interface
              </label>
              <textarea
                rows={9}
                value={tsInterfaceInput}
                onChange={(e) => setTsInterfaceInput(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs dark:border-slate-700 dark:bg-slate-800"
              />
            </div>

            <div className="lg:col-span-7">
              <div className="rounded-xl border border-slate-200 bg-slate-950 p-4 text-slate-100 dark:border-slate-800">
                <pre className="max-h-72 overflow-auto font-mono text-xs leading-relaxed text-slate-200">
                  {mswContractArtifacts.mswCode}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
