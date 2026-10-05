import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  Globe,
  Lock,
  Power,
  RefreshCw,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Wifi,
  Zap,
} from 'lucide-react';

export interface VpnServerNode {
  id: string;
  country: string;
  city: string;
  flag: string;
  nodeCode: string;
  virtualIp: string;
  basePingMs: number;
  loadPercent: number;
  tier: 'Ultra-Fast' | 'Privacy Core' | 'Streaming';
}

export const DAS_VPN_SERVERS: VpnServerNode[] = [
  {
    id: 'us-ny-14',
    country: 'United States',
    city: 'New York',
    flag: '🇺🇸',
    nodeCode: 'US-EAST-14',
    virtualIp: '198.51.100.42',
    basePingMs: 18,
    loadPercent: 24,
    tier: 'Ultra-Fast',
  },
  {
    id: 'uk-lon-08',
    country: 'United Kingdom',
    city: 'London',
    flag: '🇬🇧',
    nodeCode: 'UK-LON-08',
    virtualIp: '203.0.113.88',
    basePingMs: 29,
    loadPercent: 31,
    tier: 'Streaming',
  },
  {
    id: 'de-fra-21',
    country: 'Germany',
    city: 'Frankfurt',
    flag: '🇩🇪',
    nodeCode: 'DE-FRA-21',
    virtualIp: '192.0.2.115',
    basePingMs: 34,
    loadPercent: 19,
    tier: 'Ultra-Fast',
  },
  {
    id: 'ch-zur-04',
    country: 'Switzerland',
    city: 'Zurich',
    flag: '🇨🇭',
    nodeCode: 'CH-ZUR-04',
    virtualIp: '198.51.100.209',
    basePingMs: 38,
    loadPercent: 15,
    tier: 'Privacy Core',
  },
  {
    id: 'nl-ams-19',
    country: 'Netherlands',
    city: 'Amsterdam',
    flag: '🇳🇱',
    nodeCode: 'NL-AMS-19',
    virtualIp: '198.51.100.163',
    basePingMs: 31,
    loadPercent: 22,
    tier: 'Privacy Core',
  },
  {
    id: 'sg-sin-11',
    country: 'Singapore',
    city: 'Marina Bay',
    flag: '🇸🇬',
    nodeCode: 'SG-SIN-11',
    virtualIp: '203.0.113.194',
    basePingMs: 64,
    loadPercent: 42,
    tier: 'Ultra-Fast',
  },
  {
    id: 'jp-tyo-06',
    country: 'Japan',
    city: 'Tokyo',
    flag: '🇯🇵',
    nodeCode: 'JP-TYO-06',
    virtualIp: '192.0.2.77',
    basePingMs: 78,
    loadPercent: 28,
    tier: 'Streaming',
  },
  {
    id: 'ae-dxb-03',
    country: 'United Arab Emirates',
    city: 'Dubai',
    flag: '🇦🇪',
    nodeCode: 'AE-DXB-03',
    virtualIp: '203.0.113.51',
    basePingMs: 52,
    loadPercent: 36,
    tier: 'Ultra-Fast',
  },
];

const UNPROTECTED_ISP_IP = '103.244.178.19';

function formatDuration(totalSeconds: number): string {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return [hrs, mins, secs].map((v) => String(v).padStart(2, '0')).join(':');
}

export function DasVpnDashboard({
  onNotice,
}: {
  onNotice?: (message: string) => void;
}) {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [selectedServerId, setSelectedServerId] = useState<string>(DAS_VPN_SERVERS[0].id);
  const [protocol, setProtocol] = useState<'WireGuard' | 'OpenVPN (TCP)' | 'IKEv2/IPsec'>('WireGuard');
  const [killSwitch, setKillSwitch] = useState<boolean>(true);
  const [splitTunneling, setSplitTunneling] = useState<boolean>(false);
  const [dnsShield, setDnsShield] = useState<boolean>(true);
  const [activeSeconds, setActiveSeconds] = useState<number>(142);
  const [ipOctetOverride, setIpOctetOverride] = useState<number | null>(null);
  const [copiedIp, setCopiedIp] = useState<boolean>(false);

  // Live bandwidth state (Mbps) and historical series
  const [downloadMbps, setDownloadMbps] = useState<number>(284.6);
  const [uploadMbps, setUploadMbps] = useState<number>(96.4);
  const [peakDownloadMbps, setPeakDownloadMbps] = useState<number>(342.8);
  const [peakUploadMbps, setPeakUploadMbps] = useState<number>(128.5);
  const [totalDownloadedMb, setTotalDownloadedMb] = useState<number>(1420.5);
  const [totalUploadedMb, setTotalUploadedMb] = useState<number>(384.2);
  const [dlHistory, setDlHistory] = useState<number[]>([
    210, 235, 260, 248, 275, 290, 268, 304, 289, 276, 295, 284.6,
  ]);
  const [ulHistory, setUlHistory] = useState<number[]>([
    74, 82, 79, 88, 91, 85, 94, 102, 89, 95, 98, 96.4,
  ]);
  const [isSpeedTesting, setIsSpeedTesting] = useState<boolean>(false);

  const selectedServer = useMemo(
    () => DAS_VPN_SERVERS.find((s) => s.id === selectedServerId) || DAS_VPN_SERVERS[0],
    [selectedServerId],
  );

  const currentSimulatedIp = useMemo(() => {
    if (!isConnected) return UNPROTECTED_ISP_IP;
    if (ipOctetOverride !== null) {
      const parts = selectedServer.virtualIp.split('.');
      parts[3] = String(ipOctetOverride);
      return parts.join('.');
    }
    return selectedServer.virtualIp;
  }, [isConnected, selectedServer, ipOctetOverride]);

  // Active connection timer & live bandwidth meter updates
  useEffect(() => {
    if (!isConnected) {
      setDownloadMbps(0);
      setUploadMbps(0);
      return;
    }

    const interval = window.setInterval(() => {
      setActiveSeconds((prev) => prev + 1);

      setDownloadMbps((prevDl) => {
        const base = isSpeedTesting ? 460 : 265;
        const jitter = (Math.random() - 0.48) * (isSpeedTesting ? 55 : 36);
        const next = Math.max(48, Math.min(500, Number(((prevDl * 0.55 + base * 0.45) + jitter).toFixed(1))));
        setPeakDownloadMbps((peak) => Math.max(peak, next));
        setDlHistory((h) => [...h.slice(-11), next]);
        setTotalDownloadedMb((tot) => Number((tot + next / 8).toFixed(1)));
        return next;
      });

      setUploadMbps((prevUl) => {
        const base = isSpeedTesting ? 185 : 94;
        const jitter = (Math.random() - 0.48) * (isSpeedTesting ? 28 : 18);
        const next = Math.max(18, Math.min(250, Number(((prevUl * 0.55 + base * 0.45) + jitter).toFixed(1))));
        setPeakUploadMbps((peak) => Math.max(peak, next));
        setUlHistory((h) => [...h.slice(-11), next]);
        setTotalUploadedMb((tot) => Number((tot + next / 8).toFixed(1)));
        return next;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isConnected, isSpeedTesting]);

  const handleToggleConnection = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    const nextState = !isConnected;

    window.setTimeout(() => {
      setIsConnected(nextState);
      setIsTransitioning(false);
      if (nextState) {
        setActiveSeconds(0);
        setDownloadMbps(278.4);
        setUploadMbps(92.1);
        onNotice?.(`DAS VPN Connected to ${selectedServer.city}, ${selectedServer.country} (${selectedServer.virtualIp})`);
      } else {
        setDownloadMbps(0);
        setUploadMbps(0);
        onNotice?.('DAS VPN Disconnected · Traffic is no longer routed through encrypted tunnel');
      }
    }, 320);
  };

  const handleServerChange = (nextServerId: string) => {
    setSelectedServerId(nextServerId);
    setIpOctetOverride(null);
    const target = DAS_VPN_SERVERS.find((s) => s.id === nextServerId);
    if (target) {
      if (isConnected) {
        setActiveSeconds(0);
        setDownloadMbps(Number((240 + Math.random() * 70).toFixed(1)));
        setUploadMbps(Number((80 + Math.random() * 35).toFixed(1)));
      }
      onNotice?.(`Switched DAS VPN server to ${target.flag} ${target.city} (${target.virtualIp})`);
    }
  };

  const handleRotateIp = () => {
    const randomOctet = Math.floor(12 + Math.random() * 235);
    setIpOctetOverride(randomOctet);
    onNotice?.('Assigned fresh dynamic tunnel IP on active VPN subnet');
  };

  const handleCopyIp = () => {
    void navigator.clipboard.writeText(currentSimulatedIp).catch(() => {});
    setCopiedIp(true);
    onNotice?.(`Copied IP address: ${currentSimulatedIp}`);
    window.setTimeout(() => setCopiedIp(false), 1800);
  };

  const handleRunSpeedBurst = () => {
    if (!isConnected) {
      onNotice?.('Connect DAS VPN first to run an encrypted tunnel speed burst');
      return;
    }
    setIsSpeedTesting(true);
    onNotice?.('Running 5-second encrypted tunnel bandwidth stress test...');
    window.setTimeout(() => {
      setIsSpeedTesting(false);
    }, 5000);
  };

  const downloadPercent = Math.min(100, Math.round((downloadMbps / 500) * 100));
  const uploadPercent = Math.min(100, Math.round((uploadMbps / 250) * 100));

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-[#070B14] text-slate-100 selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Top DAS VPN Navigation Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/90 bg-[#0B1120]/95 px-5 py-3.5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div
            className={`grid size-10 place-items-center rounded-xl border transition-all duration-300 ${
              isConnected
                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                : 'border-slate-700 bg-slate-800/80 text-slate-400'
            }`}
          >
            <Shield size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold tracking-tight text-white sm:text-lg">
                DAS VPN
              </h1>
              <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-cyan-300">
                v4.2 CORE
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Zero-Log Encrypted Tunnel &amp; Real-Time Telemetry Dashboard
            </p>
          </div>
        </div>

        {/* Status Indicator & Protocol Selector */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/90 px-2.5 py-1.5 text-xs">
            <Sliders size={13} className="text-cyan-400" />
            <span className="text-[11px] font-semibold text-slate-400">Protocol:</span>
            <select
              aria-label="VPN Protocol"
              value={protocol}
              onChange={(e) =>
                setProtocol(e.target.value as 'WireGuard' | 'OpenVPN (TCP)' | 'IKEv2/IPsec')
              }
              className="bg-transparent font-mono text-xs font-bold text-white outline-none cursor-pointer"
            >
              <option value="WireGuard" className="bg-slate-900 text-white">
                WireGuard® (256-bit)
              </option>
              <option value="OpenVPN (TCP)" className="bg-slate-900 text-white">
                OpenVPN (TCP/443)
              </option>
              <option value="IKEv2/IPsec" className="bg-slate-900 text-white">
                IKEv2 / IPsec
              </option>
            </select>
          </div>

          <div
            className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-extrabold tracking-wide transition-all ${
              isTransitioning
                ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
                : isConnected
                  ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                  : 'border-rose-500/40 bg-rose-500/15 text-rose-300'
            }`}
          >
            <span
              className={`size-2 rounded-full ${
                isTransitioning
                  ? 'bg-amber-400 animate-ping'
                  : isConnected
                    ? 'bg-emerald-400 animate-pulse'
                    : 'bg-rose-400'
              }`}
            />
            <span>
              {isTransitioning
                ? 'HANDSHAKING...'
                : isConnected
                  ? 'PROTECTED · TUNNEL ACTIVE'
                  : 'UNPROTECTED · DISCONNECTED'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Dashboard Grid */}
      <div className="mx-auto w-full max-w-5xl flex-1 space-y-5 p-4 sm:p-6">
        {/* Top Row: Connection Core + Active Timer + Server Dropdown & Simulated IP */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* Left Card (5 cols): Functional VPN Connection Toggle & Active Timer */}
          <div className="relative flex flex-col items-center justify-between overflow-hidden rounded-2xl border border-slate-800/90 bg-gradient-to-b from-[#0F172A] to-[#090E1A] p-6 shadow-xl lg:col-span-5">
            <div className="flex w-full items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <Lock size={12} className={isConnected ? 'text-emerald-400' : 'text-slate-500'} />
                <span>{isConnected ? 'ChaCha20-Poly1305' : 'Encryption Idle'}</span>
              </span>
              <span
                className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-bold ${
                  isConnected
                    ? 'bg-emerald-500/15 text-emerald-300'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {isConnected ? `${selectedServer.basePingMs} ms latency` : 'Offline'}
              </span>
            </div>

            {/* Center Power Toggle Button */}
            <div className="my-6 flex flex-col items-center">
              <div className="relative flex items-center justify-center">
                {isConnected && !isTransitioning && (
                  <span className="pointer-events-none absolute -inset-3 rounded-full border border-emerald-500/25 animate-ping [animation-duration:3s]" />
                )}
                <button
                  type="button"
                  onClick={handleToggleConnection}
                  aria-pressed={isConnected}
                  aria-label={isConnected ? 'Disconnect DAS VPN' : 'Connect DAS VPN'}
                  className={`group relative flex size-36 flex-col items-center justify-center rounded-full border-4 transition-all duration-300 focus:outline-none ${
                    isTransitioning
                      ? 'border-amber-400/70 bg-amber-500/10 text-amber-300 shadow-[0_0_40px_rgba(245,158,11,0.25)]'
                      : isConnected
                        ? 'border-emerald-400 bg-gradient-to-b from-emerald-500/25 to-emerald-950/60 text-emerald-300 shadow-[0_0_50px_rgba(16,185,129,0.3)] hover:border-emerald-300 hover:scale-[1.02]'
                        : 'border-slate-700 bg-gradient-to-b from-slate-800/80 to-slate-950 text-slate-400 shadow-inner hover:border-cyan-400/60 hover:text-white hover:scale-[1.02]'
                  }`}
                >
                  <Power
                    size={42}
                    strokeWidth={2.4}
                    className={`transition-transform duration-300 ${
                      isTransitioning ? 'animate-spin' : 'group-active:scale-90'
                    }`}
                  />
                  <span className="mt-2 text-[11px] font-black uppercase tracking-widest">
                    {isTransitioning
                      ? 'Connecting'
                      : isConnected
                        ? 'Connected'
                        : 'Connect'}
                  </span>
                </button>
              </div>

              <p className="mt-3 text-center text-xs font-medium text-slate-400">
                {isConnected
                  ? 'Click power button to terminate encrypted tunnel'
                  : 'Click power button to establish secure VPN tunnel'}
              </p>
            </div>

            {/* Active Session Timer Display */}
            <div className="w-full rounded-xl border border-slate-800/90 bg-slate-950/80 px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Active Session Timer
                  </div>
                  <div
                    className={`mt-0.5 font-mono text-2xl font-black tracking-wider ${
                      isConnected ? 'text-white' : 'text-slate-600'
                    }`}
                  >
                    {isConnected ? formatDuration(activeSeconds) : '00:00:00'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Tunnel Uptime
                  </div>
                  <div className="mt-0.5 font-mono text-xs font-bold text-emerald-400">
                    {isConnected ? '99.98% Stable' : 'Standby'}
                  </div>
                  {isConnected && (
                    <button
                      type="button"
                      onClick={() => setActiveSeconds(0)}
                      className="mt-1 text-[10px] font-semibold text-cyan-400 hover:underline"
                    >
                      Reset Timer
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Card (7 cols): Server Selection Dropdown & Current Simulated IP Display */}
          <div className="flex flex-col justify-between space-y-4 rounded-2xl border border-slate-800/90 bg-[#0F172A] p-6 shadow-xl lg:col-span-7">
            {/* Server Selection Dropdown */}
            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="das-vpn-server-select"
                  className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-300"
                >
                  <Globe size={14} className="text-cyan-400" />
                  <span>VPN Server Location Selection</span>
                </label>
                <span className="rounded-md bg-cyan-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-cyan-300">
                  {DAS_VPN_SERVERS.length} Global Nodes Online
                </span>
              </div>

              <div className="mt-2.5 flex flex-col gap-2.5 sm:flex-row">
                <div className="relative flex-1">
                  <select
                    id="das-vpn-server-select"
                    aria-label="Select VPN Server"
                    value={selectedServerId}
                    onChange={(e) => handleServerChange(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none transition focus:border-cyan-400"
                  >
                    {DAS_VPN_SERVERS.map((srv) => (
                      <option key={srv.id} value={srv.id} className="bg-slate-950 text-white">
                        {srv.flag} {srv.country} — {srv.city} ({srv.nodeCode}) · {srv.basePingMs}ms · Load {srv.loadPercent}%
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const fastest = [...DAS_VPN_SERVERS].sort(
                      (a, b) => a.basePingMs - b.basePingMs,
                    )[0];
                    handleServerChange(fastest.id);
                  }}
                  className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/15 px-4 py-3 text-xs font-extrabold text-cyan-300 transition hover:bg-cyan-500 hover:text-slate-950"
                >
                  <Zap size={14} />
                  <span>Fastest Node</span>
                </button>
              </div>
            </div>

            {/* Current Simulated IP Display Box */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/90 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  Current Simulated IP Address
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                    isConnected
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : 'bg-rose-500/15 text-rose-300'
                  }`}
                >
                  {isConnected ? (
                    <>
                      <ShieldCheck size={12} />
                      <span>IP Masked · {selectedServer.nodeCode}</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert size={12} />
                      <span>ISP IP Exposed</span>
                    </>
                  )}
                </span>
              </div>

              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-mono text-2xl font-black tracking-tight text-white sm:text-3xl">
                    {currentSimulatedIp}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span>
                      Location:{' '}
                      <strong className="text-slate-200">
                        {isConnected
                          ? `${selectedServer.flag} ${selectedServer.city}, ${selectedServer.country}`
                          : 'Unprotected Local ISP'}
                      </strong>
                    </span>
                    <span>·</span>
                    <span>
                      Tier: <strong className="text-cyan-300">{selectedServer.tier}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyIp}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-200 transition hover:border-cyan-400 hover:text-white"
                  >
                    {copiedIp ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    <span>{copiedIp ? 'Copied' : 'Copy IP'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRotateIp}
                    disabled={!isConnected}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3 py-2 text-xs font-extrabold text-emerald-300 transition hover:bg-emerald-500 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <RefreshCw size={13} />
                    <span>Rotate IP</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Security Toggles Row (Kill Switch, DNS Leak Shield, Split Tunnel) */}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {[
                {
                  label: 'Kill Switch',
                  sub: 'Block traffic on drop',
                  active: killSwitch,
                  toggle: () => setKillSwitch((v) => !v),
                },
                {
                  label: 'DNS Leak Shield',
                  sub: 'DoH 1.1.1.1 Resolver',
                  active: dnsShield,
                  toggle: () => setDnsShield((v) => !v),
                },
                {
                  label: 'Split Tunneling',
                  sub: 'Bypass local LAN apps',
                  active: splitTunneling,
                  toggle: () => setSplitTunneling((v) => !v),
                },
              ].map((feat) => (
                <button
                  key={feat.label}
                  type="button"
                  onClick={feat.toggle}
                  className={`flex items-center justify-between rounded-xl border p-3 text-left transition ${
                    feat.active
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-white'
                      : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="truncate text-xs font-bold">{feat.label}</div>
                    <div className="truncate text-[10px] text-slate-400">{feat.sub}</div>
                  </div>
                  <span
                    className={`ml-2 inline-block size-2.5 shrink-0 rounded-full ${
                      feat.active ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-slate-600'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Middle Row: Real-Time Download & Upload Bandwidth Meters */}
        <div className="rounded-2xl border border-slate-800/90 bg-[#0F172A] p-5 sm:p-6 shadow-xl">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-emerald-400" />
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-white">
                Live Encrypted Bandwidth Meters
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-slate-400">
                Session Traffic:{' '}
                <strong className="text-white">
                  {((totalDownloadedMb + totalUploadedMb) / 1024).toFixed(2)} GB
                </strong>
              </span>
              <button
                type="button"
                onClick={handleRunSpeedBurst}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold transition ${
                  isSpeedTesting
                    ? 'bg-amber-400 text-slate-950 animate-pulse'
                    : 'border border-cyan-500/40 bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500 hover:text-slate-950'
                }`}
              >
                <Wifi size={13} />
                <span>{isSpeedTesting ? 'Testing Burst...' : 'Speed Burst Test'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* Download Bandwidth Meter */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/90 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="grid size-8 place-items-center rounded-lg bg-emerald-500/15 text-emerald-400">
                    <ArrowDown size={16} />
                  </span>
                  <div>
                    <div className="text-xs font-bold text-slate-300">Download Bandwidth</div>
                    <div className="font-mono text-[10px] text-slate-400">
                      Peak: {peakDownloadMbps.toFixed(1)} Mbps · Total: {totalDownloadedMb.toFixed(0)} MB
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono text-2xl font-black text-emerald-400">
                    {downloadMbps.toFixed(1)}
                  </span>
                  <span className="ml-1 font-mono text-xs font-bold text-slate-400">Mbps</span>
                </div>
              </div>

              {/* Progress Gauge Bar */}
              <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-500"
                  style={{ width: `${isConnected ? downloadPercent : 0}%` }}
                />
              </div>

              {/* Mini Sparkline Bars */}
              <div className="mt-3 flex h-12 items-end gap-1.5 pt-2">
                {dlHistory.map((val, idx) => {
                  const heightPct = isConnected ? Math.max(12, Math.min(100, Math.round((val / 500) * 100))) : 8;
                  return (
                    <div
                      key={idx}
                      className="flex-1 rounded-t bg-emerald-500/40 transition-all duration-300 hover:bg-emerald-400"
                      style={{ height: `${heightPct}%` }}
                      title={`${val} Mbps`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Upload Bandwidth Meter */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/90 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="grid size-8 place-items-center rounded-lg bg-cyan-500/15 text-cyan-400">
                    <ArrowUp size={16} />
                  </span>
                  <div>
                    <div className="text-xs font-bold text-slate-300">Upload Bandwidth</div>
                    <div className="font-mono text-[10px] text-slate-400">
                      Peak: {peakUploadMbps.toFixed(1)} Mbps · Total: {totalUploadedMb.toFixed(0)} MB
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono text-2xl font-black text-cyan-400">
                    {uploadMbps.toFixed(1)}
                  </span>
                  <span className="ml-1 font-mono text-xs font-bold text-slate-400">Mbps</span>
                </div>
              </div>

              {/* Progress Gauge Bar */}
              <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-indigo-400 transition-all duration-500"
                  style={{ width: `${isConnected ? uploadPercent : 0}%` }}
                />
              </div>

              {/* Mini Sparkline Bars */}
              <div className="mt-3 flex h-12 items-end gap-1.5 pt-2">
                {ulHistory.map((val, idx) => {
                  const heightPct = isConnected ? Math.max(12, Math.min(100, Math.round((val / 250) * 100))) : 8;
                  return (
                    <div
                      key={idx}
                      className="flex-1 rounded-t bg-cyan-500/40 transition-all duration-300 hover:bg-cyan-400"
                      style={{ height: `${heightPct}%` }}
                      title={`${val} Mbps`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Row: Quick Global Server Node Matrix */}
        <div className="rounded-2xl border border-slate-800/90 bg-[#0F172A] p-5 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server size={15} className="text-cyan-400" />
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                Global Relay Cluster Matrix
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">
              Click any region to switch active VPN tunnel
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {DAS_VPN_SERVERS.map((srv) => {
              const isSelected = srv.id === selectedServerId;
              return (
                <button
                  key={srv.id}
                  type="button"
                  onClick={() => handleServerChange(srv.id)}
                  className={`flex flex-col justify-between rounded-xl border p-3 text-left transition ${
                    isSelected
                      ? 'border-emerald-500/60 bg-emerald-500/10 shadow-sm'
                      : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-bold text-white">
                      {srv.flag} {srv.city}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                        srv.basePingMs < 40
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : 'bg-amber-500/15 text-amber-300'
                      }`}
                    >
                      {srv.basePingMs} ms
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-slate-400">
                    <span>{srv.virtualIp}</span>
                    <span>Load {srv.loadPercent}%</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function buildDasVpnHtmlCode(): string {
  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>DAS VPN · Web UI Dashboard Prototype</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background: #070B14; color: #F8FAFC; font-family: system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body class="min-h-screen bg-[#070B14] text-slate-100 p-4 sm:p-6">
  <div class="max-w-5xl mx-auto space-y-5">
    <header class="flex flex-wrap items-center justify-between gap-3 bg-[#0B1120] border border-slate-800 rounded-2xl px-5 py-4">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-black">🛡️</div>
        <div>
          <h1 class="text-lg font-extrabold text-white">DAS VPN</h1>
          <p class="text-xs text-slate-400">Zero-Log Encrypted Tunnel & Bandwidth Telemetry Dashboard</p>
        </div>
      </div>
      <div id="statusBadge" class="px-3.5 py-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 text-emerald-300 text-xs font-extrabold">
        ● PROTECTED · TUNNEL ACTIVE
      </div>
    </header>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
      <div class="lg:col-span-5 bg-[#0F172A] border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-between">
        <button id="toggleBtn" onclick="toggleVpn()" class="my-4 w-36 h-36 rounded-full border-4 border-emerald-400 bg-emerald-500/20 text-emerald-300 font-black text-sm uppercase tracking-wider shadow-lg">
          CONNECTED
        </button>
        <div class="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <div class="text-[10px] uppercase font-bold text-slate-400">Active Session Timer</div>
            <div id="timerDisplay" class="text-2xl font-mono font-black text-white">00:02:22</div>
          </div>
          <span class="text-xs font-mono text-emerald-400 font-bold">WireGuard®</span>
        </div>
      </div>

      <div class="lg:col-span-7 bg-[#0F172A] border border-slate-800 rounded-2xl p-6 space-y-4">
        <div>
          <label class="text-xs font-extrabold uppercase tracking-wider text-slate-300 block mb-2">VPN Server Selection</label>
          <select id="serverSelect" onchange="changeServer()" class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-bold text-white">
            <option value="198.51.100.42">🇺🇸 United States — New York (18ms)</option>
            <option value="203.0.113.88">🇬🇧 United Kingdom — London (29ms)</option>
            <option value="192.0.2.115">🇩🇪 Germany — Frankfurt (34ms)</option>
            <option value="198.51.100.209">🇨🇭 Switzerland — Zurich (38ms)</option>
            <option value="203.0.113.194">🇸🇬 Singapore — Marina Bay (64ms)</option>
          </select>
        </div>

        <div class="bg-slate-950 border border-slate-800 rounded-xl p-4">
          <div class="text-[11px] font-bold uppercase text-slate-400">Current Simulated IP</div>
          <div id="ipDisplay" class="text-2xl sm:text-3xl font-mono font-black text-white mt-1">198.51.100.42</div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <div class="text-xs text-slate-400 font-bold">Download Bandwidth</div>
            <div id="dlSpeed" class="text-2xl font-mono font-black text-emerald-400 mt-1">284.6 Mbps</div>
          </div>
          <div class="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <div class="text-xs text-slate-400 font-bold">Upload Bandwidth</div>
            <div id="ulSpeed" class="text-2xl font-mono font-black text-cyan-400 mt-1">96.4 Mbps</div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <script>
    let connected = true, seconds = 142;
    function fmt(s) {
      return [Math.floor(s/3600), Math.floor((s%3600)/60), s%60].map(v => String(v).padStart(2,'0')).join(':');
    }
    function toggleVpn() {
      connected = !connected;
      seconds = 0;
      const btn = document.getElementById('toggleBtn');
      const badge = document.getElementById('statusBadge');
      const ip = document.getElementById('ipDisplay');
      const srv = document.getElementById('serverSelect');
      if (connected) {
        btn.textContent = 'CONNECTED';
        btn.className = 'my-4 w-36 h-36 rounded-full border-4 border-emerald-400 bg-emerald-500/20 text-emerald-300 font-black text-sm uppercase tracking-wider shadow-lg';
        badge.textContent = '● PROTECTED · TUNNEL ACTIVE';
        ip.textContent = srv.value;
      } else {
        btn.textContent = 'DISCONNECTED';
        btn.className = 'my-4 w-36 h-36 rounded-full border-4 border-slate-700 bg-slate-900 text-slate-400 font-black text-sm uppercase tracking-wider';
        badge.textContent = '○ UNPROTECTED · DISCONNECTED';
        ip.textContent = '103.244.178.19 (ISP)';
        document.getElementById('dlSpeed').textContent = '0.0 Mbps';
        document.getElementById('ulSpeed').textContent = '0.0 Mbps';
      }
    }
    function changeServer() {
      if (connected) {
        document.getElementById('ipDisplay').textContent = document.getElementById('serverSelect').value;
        seconds = 0;
      }
    }
    setInterval(() => {
      if (!connected) return;
      seconds++;
      document.getElementById('timerDisplay').textContent = fmt(seconds);
      document.getElementById('dlSpeed').textContent = (255 + Math.random()*55).toFixed(1) + ' Mbps';
      document.getElementById('ulSpeed').textContent = (82 + Math.random()*28).toFixed(1) + ' Mbps';
    }, 1000);
  </script>
</body>
</html>`;
}
