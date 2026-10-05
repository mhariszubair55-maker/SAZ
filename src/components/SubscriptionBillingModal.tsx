import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  CreditCard,
  Crown,
  Database,
  FileSpreadsheet,
  Layers,
  RefreshCw,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  Webhook,
  X,
  Zap,
} from 'lucide-react';
import { buildUserAuthHeaders, type AppUserSession } from '../firebase';
import { resolveAndroidApiUrl } from '../utils/androidBridge';

export type SubscriptionPlanId = 'free' | 'pro' | 'premium';

export interface SubscriptionPlanLimits {
  aiMessagesMonthly: number;
  imageGenMonthly: number;
  videoGenMonthly: number;
  voiceTtsMonthly: number;
  appBuildsMonthly: number;
  storageLimitMb: number;
}

export interface SubscriptionPlanDefinition {
  id: SubscriptionPlanId;
  name: string;
  tagline: string;
  badge?: string;
  monthlyPriceUsd: number;
  annualPriceUsd: number;
  monthlyPricePkr: number;
  limits: SubscriptionPlanLimits;
  features: string[];
  enabled: boolean;
}

export interface SubscriptionInvoiceRecord {
  id: string;
  date: string;
  planId: SubscriptionPlanId;
  billingCycle: 'monthly' | 'annual';
  amountUsd: number;
  status: 'paid' | 'scheduled' | 'refunded' | 'void';
  provider: string;
  description: string;
}

export interface UserSubscriptionState {
  planId: SubscriptionPlanId;
  status: 'active' | 'trialing' | 'past_due' | 'canceled_at_period_end';
  billingCycle: 'monthly' | 'annual';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  scheduledPlanId?: SubscriptionPlanId;
  paymentProvider: 'sandbox_modular' | 'stripe' | 'paddle' | 'lemon_squeezy' | 'payfast_pk';
  externalCustomerId?: string;
  externalSubscriptionId?: string;
  updatedAt: string;
  invoices: SubscriptionInvoiceRecord[];
}

export interface UsageLedgerEntry {
  id: string;
  operationType:
    | 'ai_message'
    | 'image_gen'
    | 'video_gen'
    | 'voice_tts'
    | 'app_build'
    | 'storage';
  label: string;
  units: number;
  timestamp: string;
}

export interface SubscriptionQuotaSnapshot {
  dailyPromptCount: number;
  dailyPromptLimit: number;
  dailyAppBuildCount: number;
  dailyAppBuildLimit: number;
  dailyMediaGenCount: number;
  dailyMediaGenLimit: number;
  resetDate: string;
  tier: 'guest' | 'authenticated';
  planId?: SubscriptionPlanId;
  planName?: string;
  billingMonth?: string;
  monthlyAiMessagesUsed?: number;
  monthlyAiMessagesLimit?: number;
  monthlyImageGenUsed?: number;
  monthlyImageGenLimit?: number;
  monthlyVideoGenUsed?: number;
  monthlyVideoGenLimit?: number;
  monthlyVoiceTtsUsed?: number;
  monthlyVoiceTtsLimit?: number;
  monthlyAppBuildsUsed?: number;
  monthlyAppBuildsLimit?: number;
  storageMbUsed?: number;
  storageMbLimit?: number;
}

interface PaymentAdapterStatusItem {
  id: 'sandbox_modular' | 'stripe' | 'paddle' | 'lemon_squeezy' | 'payfast_pk';
  name: string;
  configured: boolean;
  webhookConfigured?: boolean;
  mode: string;
  envVarsRequired: string[];
  description: string;
}

interface SubscriptionStatusResponse {
  uid: string;
  isAdmin: boolean;
  subscription: UserSubscriptionState;
  currentPlan: SubscriptionPlanDefinition;
  plans: Record<SubscriptionPlanId, SubscriptionPlanDefinition>;
  quota: SubscriptionQuotaSnapshot;
  usageLedger: UsageLedgerEntry[];
  paymentGateway: {
    activeAdapter: PaymentAdapterStatusItem['id'];
    adapters: PaymentAdapterStatusItem[];
  };
  enforceHardLimits: boolean;
}

interface AdminTenantOverview {
  uid: string;
  displayName: string;
  email: string;
  planId: SubscriptionPlanId;
  status: string;
  billingCycle: string;
  monthlyAiMessagesUsed: number;
  monthlyImageGenUsed: number;
  monthlyVideoGenUsed: number;
  monthlyVoiceTtsUsed: number;
  monthlyAppBuildsUsed: number;
  storageMbUsed: number;
}

interface ServerLogEntry {
  id: string;
  requestId: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'security';
  category: 'api' | 'ai_generation' | 'auth' | 'billing' | 'error';
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  userId: string;
  message: string;
  detail?: string;
}

interface AdminMonitoringSnapshot {
  system: {
    status: string;
    uptimeSeconds: number;
    nodeVersion: string;
    platform: string;
    memory: {
      rssMb: number;
      heapUsedMb: number;
      heapTotalMb: number;
    };
    activeRateLimitBuckets: number;
    activeTenantsCount: number;
    registeredUsersCount: number;
    timestamp: string;
  };
  metrics: {
    totalRequests: number;
    status2xx: number;
    status4xx: number;
    status5xx: number;
    errorRatePct: number;
    avgLatencyMs: number;
    aiCallsCount: number;
    mediaCallsCount: number;
    authCallsCount: number;
    errorCount: number;
  };
  subsystems: Array<{
    id: string;
    name: string;
    model: string;
    status: 'operational' | 'degraded';
    detail: string;
  }>;
  logs: ServerLogEntry[];
}

interface SubscriptionBillingModalProps {
  isOpen: boolean;
  initialTab?: 'plans' | 'usage' | 'admin' | 'monitoring';
  currentUser: AppUserSession | null;
  onClose: () => void;
  onNotice: (msg: string) => void;
  onQuotaUpdated?: (quota: SubscriptionQuotaSnapshot) => void;
}

export function SubscriptionBillingModal({
  isOpen,
  initialTab = 'plans',
  currentUser,
  onClose,
  onNotice,
  onQuotaUpdated,
}: SubscriptionBillingModalProps) {
  const [activeTab, setActiveTab] = useState<'plans' | 'usage' | 'admin' | 'monitoring'>(initialTab);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [currency, setCurrency] = useState<'USD' | 'PKR'>('USD');
  const [loading, setLoading] = useState(false);
  const [submittingPlan, setSubmittingPlan] = useState<SubscriptionPlanId | null>(null);
  const [statusData, setStatusData] = useState<SubscriptionStatusResponse | null>(null);
  const [downgradeMode, setDowngradeMode] = useState<'period_end' | 'immediate'>('period_end');
  const [checkoutTargetPlan, setCheckoutTargetPlan] = useState<SubscriptionPlanId | null>(null);

  // Admin state
  const [adminPlansDraft, setAdminPlansDraft] = useState<Record<
    SubscriptionPlanId,
    SubscriptionPlanDefinition
  > | null>(null);
  const [adminEnforceHardLimits, setAdminEnforceHardLimits] = useState(true);
  const [adminActiveProvider, setAdminActiveProvider] =
    useState<PaymentAdapterStatusItem['id']>('sandbox_modular');
  const [adminTenants, setAdminTenants] = useState<AdminTenantOverview[]>([]);
  const [savingAdmin, setSavingAdmin] = useState(false);

  // Monitoring & Audit Logs state
  const [monitoringData, setMonitoringData] = useState<AdminMonitoringSnapshot | null>(null);
  const [logCategoryFilter, setLogCategoryFilter] = useState<string>('all');
  const [logLevelFilter, setLogLevelFilter] = useState<string>('all');
  const [exportingWorkspace, setExportingWorkspace] = useState(false);

  const fetchSubscriptionStatus = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await buildUserAuthHeaders(currentUser);
      const resp = await window.fetch(resolveAndroidApiUrl('/api/subscription/status'), {
        headers,
      });
      if (resp.ok) {
        const data = (await resp.json()) as SubscriptionStatusResponse;
        setStatusData(data);
        setBillingCycle(data.subscription.billingCycle || 'monthly');
        if (data.quota && onQuotaUpdated) {
          onQuotaUpdated(data.quota);
        }
        setAdminPlansDraft(JSON.parse(JSON.stringify(data.plans)));
        setAdminEnforceHardLimits(data.enforceHardLimits);
        setAdminActiveProvider(data.paymentGateway.activeAdapter);
      }

      const [adminResp, monResp] = await Promise.all([
        window.fetch(resolveAndroidApiUrl('/api/admin/subscription-config'), { headers }),
        window.fetch(
          resolveAndroidApiUrl(
            `/api/admin/monitoring?category=${encodeURIComponent(logCategoryFilter)}&level=${encodeURIComponent(logLevelFilter)}`,
          ),
          { headers },
        ),
      ]);
      if (adminResp.ok) {
        const adminData = (await adminResp.json()) as {
          tenants?: AdminTenantOverview[];
        };
        if (Array.isArray(adminData.tenants)) {
          setAdminTenants(adminData.tenants);
        }
      }
      if (monResp.ok) {
        const monData = (await monResp.json()) as AdminMonitoringSnapshot;
        setMonitoringData(monData);
      }
    } catch {
      // ignore offline error
    } finally {
      setLoading(false);
    }
  }, [currentUser, onQuotaUpdated, logCategoryFilter, logLevelFilter]);

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab(initialTab);
    void fetchSubscriptionStatus();
  }, [isOpen, initialTab, fetchSubscriptionStatus]);

  if (!isOpen) return null;

  const currentPlanId: SubscriptionPlanId = statusData?.subscription.planId || 'free';
  const tierRank: Record<SubscriptionPlanId, number> = { free: 0, pro: 1, premium: 2 };

  const handleConfirmPlanChange = async (targetPlanId: SubscriptionPlanId) => {
    setSubmittingPlan(targetPlanId);
    try {
      const headers = await buildUserAuthHeaders(currentUser, {
        'Content-Type': 'application/json',
      });
      const resp = await window.fetch(resolveAndroidApiUrl('/api/subscription/change-plan'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          targetPlanId,
          billingCycle,
          downgradeBehavior: downgradeMode,
          paymentProvider: adminActiveProvider,
        }),
      });
      const data = (await resp.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
        quota?: SubscriptionQuotaSnapshot;
      };
      if (!resp.ok) {
        onNotice(data.error || 'Could not change subscription plan');
        return;
      }
      onNotice(data.message || `Subscription updated to ${targetPlanId.toUpperCase()}`);
      setCheckoutTargetPlan(null);
      if (data.quota && onQuotaUpdated) {
        onQuotaUpdated(data.quota);
      }
      await fetchSubscriptionStatus();
    } catch {
      onNotice('Network error while updating subscription plan');
    } finally {
      setSubmittingPlan(null);
    }
  };

  const handleCancelOrReactivate = async (reactivate: boolean) => {
    setLoading(true);
    try {
      const headers = await buildUserAuthHeaders(currentUser, {
        'Content-Type': 'application/json',
      });
      const resp = await window.fetch(resolveAndroidApiUrl('/api/subscription/cancel'), {
        method: 'POST',
        headers,
        body: JSON.stringify({ reactivate }),
      });
      const data = (await resp.json()) as { message?: string };
      if (resp.ok) {
        onNotice(data.message || (reactivate ? 'Subscription reactivated' : 'Cancellation scheduled'));
        await fetchSubscriptionStatus();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetMonthlyCounters = async () => {
    setLoading(true);
    try {
      const headers = await buildUserAuthHeaders(currentUser, {
        'Content-Type': 'application/json',
      });
      const resp = await window.fetch(resolveAndroidApiUrl('/api/user/usage/reset'), {
        method: 'POST',
        headers,
      });
      if (resp.ok) {
        onNotice('Monthly and daily usage counters reset to 0');
        await fetchSubscriptionStatus();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAdminConfig = async () => {
    if (!adminPlansDraft) return;
    setSavingAdmin(true);
    try {
      const headers = await buildUserAuthHeaders(currentUser, {
        'Content-Type': 'application/json',
      });
      const resp = await window.fetch(resolveAndroidApiUrl('/api/admin/subscription-config'), {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          enforceHardLimits: adminEnforceHardLimits,
          activePaymentProvider: adminActiveProvider,
          plans: adminPlansDraft,
        }),
      });
      const data = (await resp.json()) as { message?: string; error?: string };
      if (resp.ok) {
        onNotice(data.message || 'Saved Admin Subscription & Limit Configuration');
        await fetchSubscriptionStatus();
      } else {
        onNotice(data.error || 'Failed to save admin configuration');
      }
    } finally {
      setSavingAdmin(false);
    }
  };

  const handleAdminAssignTenantPlan = async (
    targetUid: string,
    planId: SubscriptionPlanId,
    resetMonthlyUsage = false,
  ) => {
    try {
      const headers = await buildUserAuthHeaders(currentUser, {
        'Content-Type': 'application/json',
      });
      const resp = await window.fetch(
        resolveAndroidApiUrl(`/api/admin/users/${encodeURIComponent(targetUid)}/subscription`),
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ planId, resetMonthlyUsage }),
        },
      );
      if (resp.ok) {
        onNotice(
          resetMonthlyUsage
            ? `Reset monthly usage for ${targetUid}`
            : `Assigned ${planId.toUpperCase()} plan to ${targetUid}`,
        );
        await fetchSubscriptionStatus();
      }
    } catch {
      onNotice('Could not update tenant subscription');
    }
  };

  const handleSimulateWebhook = async (planId: SubscriptionPlanId) => {
    try {
      const headers = await buildUserAuthHeaders(currentUser, {
        'Content-Type': 'application/json',
      });
      const resp = await window.fetch(resolveAndroidApiUrl('/api/subscription/webhook'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          type: 'customer.subscription.updated',
          userId: statusData?.uid || currentUser?.uid || 'guest_default',
          planId,
        }),
      });
      if (resp.ok) {
        onNotice(`Webhook event (customer.subscription.updated -> ${planId.toUpperCase()}) processed`);
        await fetchSubscriptionStatus();
      }
    } catch {
      onNotice('Webhook simulation failed');
    }
  };

  const handleExportWorkspaceBackup = async () => {
    setExportingWorkspace(true);
    try {
      const headers = await buildUserAuthHeaders(currentUser);
      const resp = await window.fetch(resolveAndroidApiUrl('/api/user/export'), { headers });
      if (resp.ok) {
        const exportPayload = await resp.json();
        const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `saz-ai-workspace-backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        onNotice('Exported complete user workspace backup (.json)');
      }
    } catch {
      onNotice('Workspace export failed');
    } finally {
      setExportingWorkspace(false);
    }
  };

  const handleExportUsageCsv = () => {
    const ledger = statusData?.usageLedger || [];
    const header = 'ID,OperationType,Label,Units,Timestamp\n';
    const rows = ledger
      .map(
        (item) =>
          `"${item.id}","${item.operationType}","${item.label.replace(/"/g, '""')}",${item.units},"${item.timestamp}"`,
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `saz-ai-usage-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    onNotice('Exported usage ledger as CSV');
  };

  const handleClearServerLogs = async () => {
    try {
      const headers = await buildUserAuthHeaders(currentUser, {
        'Content-Type': 'application/json',
      });
      const resp = await window.fetch(resolveAndroidApiUrl('/api/admin/logs/clear'), {
        method: 'POST',
        headers,
      });
      if (resp.ok) {
        onNotice('Cleared server audit log buffer');
        await fetchSubscriptionStatus();
      }
    } catch {
      onNotice('Failed to clear server logs');
    }
  };

  const handleDownloadAuditLogsJson = () => {
    if (!monitoringData) return;
    const blob = new Blob([JSON.stringify(monitoringData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `saz-ai-monitoring-logs-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    onNotice('Downloaded system monitoring & audit logs (.json)');
  };

  const quota = statusData?.quota;
  const plans = statusData?.plans;

  const usageMetricsList = [
    {
      id: 'ai_message',
      label: 'AI Coding & Reasoning Messages',
      used: quota?.monthlyAiMessagesUsed ?? 0,
      limit: quota?.monthlyAiMessagesLimit ?? 250,
      unit: 'messages / mo',
    },
    {
      id: 'image_gen',
      label: 'ImageStudio HD & 4K Renders',
      used: quota?.monthlyImageGenUsed ?? 0,
      limit: quota?.monthlyImageGenLimit ?? 30,
      unit: 'images / mo',
    },
    {
      id: 'video_gen',
      label: '3D Video & Veo 9:16 Productions',
      used: quota?.monthlyVideoGenUsed ?? 0,
      limit: quota?.monthlyVideoGenLimit ?? 8,
      unit: 'videos / mo',
    },
    {
      id: 'voice_tts',
      label: 'Urdu / Roman Urdu / English Neural TTS',
      used: quota?.monthlyVoiceTtsUsed ?? 0,
      limit: quota?.monthlyVoiceTtsLimit ?? 40,
      unit: 'clips / mo',
    },
    {
      id: 'app_build',
      label: 'Full-Stack Interactive App Builds',
      used: quota?.monthlyAppBuildsUsed ?? 0,
      limit: quota?.monthlyAppBuildsLimit ?? 15,
      unit: 'apps / mo',
    },
    {
      id: 'storage',
      label: 'Isolated Cloud & Audio Vault Storage',
      used: quota?.storageMbUsed ?? 0.1,
      limit: quota?.storageMbLimit ?? 100,
      unit: 'MB',
    },
  ];

  const formatPrice = (plan: SubscriptionPlanDefinition) => {
    if (plan.monthlyPriceUsd === 0) return currency === 'USD' ? '$0' : 'Rs 0';
    if (currency === 'PKR') {
      const pkr =
        billingCycle === 'annual'
          ? Math.round((plan.monthlyPricePkr * 10) / 12)
          : plan.monthlyPricePkr;
      return `Rs ${pkr.toLocaleString()}`;
    }
    const usd =
      billingCycle === 'annual'
        ? Math.round(plan.annualPriceUsd / 12)
        : plan.monthlyPriceUsd;
    return `$${usd}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-xs sm:p-6">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 text-slate-100 shadow-2xl">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-amber-400/15 text-amber-400">
              <Crown size={20} />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight text-white">
                SAZ AI · Plans, Monthly Usage &amp; Admin Billing Architecture
              </h2>
              <p className="text-xs text-slate-400">
                Current Tier:{' '}
                <strong className="text-amber-400">
                  {statusData?.currentPlan?.name || 'Free Starter'}
                </strong>{' '}
                · Billing Period: {quota?.billingMonth || new Date().toISOString().slice(0, 7)} ·
                Gateway: {statusData?.paymentGateway.activeAdapter || 'sandbox_modular'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void fetchSubscriptionStatus()}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-300 transition hover:border-amber-400/50 hover:text-white"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span>Sync</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Subscription Modal"
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Navigation Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-900/60 px-5 py-2.5">
          <div className="flex items-center gap-1 rounded-lg bg-slate-900 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('plans')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition ${
                activeTab === 'plans'
                  ? 'bg-amber-400 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Sparkles size={13} />
              <span>1. Subscription Plans (Free / Pro / Premium)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('usage')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition ${
                activeTab === 'usage'
                  ? 'bg-amber-400 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Activity size={13} />
              <span>2. Monthly Quotas &amp; Usage Ledger</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('admin')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition ${
                activeTab === 'admin'
                  ? 'bg-amber-400 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Settings size={13} />
              <span>3. Admin Config &amp; Payment Gateway</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('monitoring')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition ${
                activeTab === 'monitoring'
                  ? 'bg-amber-400 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Database size={13} />
              <span>4. System Monitoring &amp; Audit Logs</span>
            </button>
          </div>

          {activeTab === 'plans' && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950 p-1">
                <button
                  type="button"
                  onClick={() => setBillingCycle('monthly')}
                  className={`rounded px-2.5 py-1 text-xs font-bold transition ${
                    billingCycle === 'monthly'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('annual')}
                  className={`rounded px-2.5 py-1 text-xs font-bold transition ${
                    billingCycle === 'annual'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Annual (Save 17%)
                </button>
              </div>

              <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950 p-1">
                <button
                  type="button"
                  onClick={() => setCurrency('USD')}
                  className={`rounded px-2 py-1 text-xs font-bold ${
                    currency === 'USD' ? 'bg-amber-400 text-slate-950' : 'text-slate-400'
                  }`}
                >
                  USD ($)
                </button>
                <button
                  type="button"
                  onClick={() => setCurrency('PKR')}
                  className={`rounded px-2 py-1 text-xs font-bold ${
                    currency === 'PKR' ? 'bg-amber-400 text-slate-950' : 'text-slate-400'
                  }`}
                >
                  PKR (Rs)
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {activeTab === 'plans' && plans && (
            <div className="space-y-5">
              {/* Active Subscription Banner */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>Current Plan:</span>
                    <strong className="text-sm text-white">
                      {statusData?.currentPlan.name}
                    </strong>
                    <span>·</span>
                    <span>
                      Status:{' '}
                      <strong
                        className={
                          statusData?.subscription.cancelAtPeriodEnd
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }
                      >
                        {statusData?.subscription.cancelAtPeriodEnd
                          ? `Scheduled to switch to ${(statusData.subscription.scheduledPlanId || 'free').toUpperCase()} on ${statusData.subscription.currentPeriodEnd.slice(0, 10)}`
                          : 'Active'}
                      </strong>
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Period Renewal:{' '}
                    {statusData?.subscription.currentPeriodEnd
                      ? new Date(statusData.subscription.currentPeriodEnd).toLocaleDateString()
                      : 'Monthly'}{' '}
                    · Modular Payment Layer:{' '}
                    <span className="font-mono text-slate-300">
                      {statusData?.paymentGateway.activeAdapter}
                    </span>{' '}
                    (Zero hard-coded secrets)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {statusData?.subscription.cancelAtPeriodEnd ? (
                    <button
                      type="button"
                      onClick={() => void handleCancelOrReactivate(true)}
                      className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-extrabold text-slate-950 transition hover:bg-emerald-400"
                    >
                      Keep {statusData.currentPlan.name} Active
                    </button>
                  ) : (
                    currentPlanId !== 'free' && (
                      <button
                        type="button"
                        onClick={() => void handleCancelOrReactivate(false)}
                        className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-300 transition hover:border-rose-500/50 hover:text-rose-300"
                      >
                        Cancel at Period End
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Modular Checkout / Plan Transition Confirmation Drawer */}
              {checkoutTargetPlan && plans[checkoutTargetPlan] && (
                <div className="rounded-xl border border-amber-400/60 bg-slate-900 p-4 shadow-lg">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm font-extrabold text-amber-400">
                        <CreditCard size={16} />
                        <span>
                          Confirm{' '}
                          {tierRank[checkoutTargetPlan] > tierRank[currentPlanId]
                            ? 'Plan Upgrade'
                            : 'Plan Downgrade'}{' '}
                          &rarr; {plans[checkoutTargetPlan].name}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">
                        Billing Cycle: <strong>{billingCycle.toUpperCase()}</strong> · Price:{' '}
                        <strong>
                          {formatPrice(plans[checkoutTargetPlan])} / month
                        </strong>{' '}
                        · Payment Adapter:{' '}
                        <code className="text-amber-300">
                          {statusData?.paymentGateway.activeAdapter}
                        </code>
                      </p>
                      {tierRank[checkoutTargetPlan] < tierRank[currentPlanId] && (
                        <div className="mt-2 flex flex-wrap items-center gap-3 pt-1">
                          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-300">
                            <input
                              type="radio"
                              name="downgradeMode"
                              checked={downgradeMode === 'period_end'}
                              onChange={() => setDowngradeMode('period_end')}
                            />
                            <span>
                              Switch at end of billing period (keep current quotas until{' '}
                              {statusData?.subscription.currentPeriodEnd.slice(0, 10)})
                            </span>
                          </label>
                          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-300">
                            <input
                              type="radio"
                              name="downgradeMode"
                              checked={downgradeMode === 'immediate'}
                              onChange={() => setDowngradeMode('immediate')}
                            />
                            <span>Switch immediately</span>
                          </label>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCheckoutTargetPlan(null)}
                        className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-bold text-slate-300 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={submittingPlan !== null}
                        onClick={() => void handleConfirmPlanChange(checkoutTargetPlan)}
                        className="flex items-center gap-1.5 rounded-lg bg-amber-400 px-4 py-2 text-xs font-extrabold text-slate-950 transition hover:bg-amber-300 disabled:opacity-50"
                      >
                        <Check size={14} />
                        <span>
                          {submittingPlan === checkoutTargetPlan
                            ? 'Processing...'
                            : `Confirm ${plans[checkoutTargetPlan].name}`}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 3-Column Plan Comparison Cards */}
              <div className="grid gap-4 md:grid-cols-3">
                {(['free', 'pro', 'premium'] as const).map((planKey) => {
                  const plan = plans[planKey];
                  if (!plan) return null;
                  const isCurrent = currentPlanId === plan.id;
                  const isUpgrade = tierRank[plan.id] > tierRank[currentPlanId];

                  return (
                    <div
                      key={plan.id}
                      className={`flex flex-col justify-between rounded-2xl border p-5 transition ${
                        isCurrent
                          ? 'border-amber-400 bg-slate-900/90 shadow-lg'
                          : plan.id === 'pro'
                            ? 'border-sky-500/40 bg-slate-900/60'
                            : 'border-slate-800 bg-slate-900/40'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-base font-extrabold text-white">{plan.name}</h3>
                          {isCurrent ? (
                            <span className="text-xs font-bold text-amber-400">Current Plan</span>
                          ) : plan.badge ? (
                            <span className="text-xs font-semibold text-sky-400">{plan.badge}</span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs text-slate-400">{plan.tagline}</p>

                        <div className="mt-4 flex items-baseline gap-1 border-b border-slate-800 pb-4">
                          <span className="text-3xl font-black text-white">
                            {formatPrice(plan)}
                          </span>
                          <span className="text-xs text-slate-400">/ month</span>
                        </div>

                        {/* Structured Monthly Quotas */}
                        <div className="mt-4 space-y-2 text-xs">
                          <div className="font-bold text-slate-300">Monthly Resource Limits:</div>
                          <div className="flex items-center justify-between text-slate-400">
                            <span>AI Messages</span>
                            <strong className="font-mono text-white">
                              {plan.limits.aiMessagesMonthly.toLocaleString()} / mo
                            </strong>
                          </div>
                          <div className="flex items-center justify-between text-slate-400">
                            <span>Image Generation</span>
                            <strong className="font-mono text-white">
                              {plan.limits.imageGenMonthly.toLocaleString()} / mo
                            </strong>
                          </div>
                          <div className="flex items-center justify-between text-slate-400">
                            <span>3D &amp; Veo Videos</span>
                            <strong className="font-mono text-white">
                              {plan.limits.videoGenMonthly.toLocaleString()} / mo
                            </strong>
                          </div>
                          <div className="flex items-center justify-between text-slate-400">
                            <span>Urdu/English TTS Clips</span>
                            <strong className="font-mono text-white">
                              {plan.limits.voiceTtsMonthly.toLocaleString()} / mo
                            </strong>
                          </div>
                          <div className="flex items-center justify-between text-slate-400">
                            <span>Full-Stack App Builds</span>
                            <strong className="font-mono text-white">
                              {plan.limits.appBuildsMonthly.toLocaleString()} / mo
                            </strong>
                          </div>
                          <div className="flex items-center justify-between text-slate-400">
                            <span>Cloud &amp; Audio Storage</span>
                            <strong className="font-mono text-white">
                              {plan.limits.storageLimitMb >= 1024
                                ? `${(plan.limits.storageLimitMb / 1024).toFixed(0)} GB`
                                : `${plan.limits.storageLimitMb} MB`}
                            </strong>
                          </div>
                        </div>

                        {/* Feature Checklist */}
                        <ul className="mt-4 space-y-2 border-t border-slate-800/80 pt-4 text-xs text-slate-300">
                          {plan.features.map((feat, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <CheckCircle2
                                size={14}
                                className="mt-0.5 shrink-0 text-emerald-400"
                              />
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="mt-6 pt-2">
                        {isCurrent ? (
                          <button
                            type="button"
                            disabled
                            className="w-full rounded-xl border border-slate-700 bg-slate-800/70 py-2.5 text-xs font-extrabold text-slate-400"
                          >
                            Active Plan
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setCheckoutTargetPlan(plan.id)}
                            className={`flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-extrabold transition ${
                              isUpgrade
                                ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                                : 'border border-slate-700 bg-slate-800 text-slate-200 hover:border-slate-600 hover:text-white'
                            }`}
                          >
                            {isUpgrade ? (
                              <>
                                <ArrowUpRight size={14} />
                                <span>Upgrade to {plan.name}</span>
                              </>
                            ) : (
                              <>
                                <ArrowDownRight size={14} />
                                <span>Downgrade to {plan.name}</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'usage' && (
            <div className="space-y-5">
              {/* Monthly Metered Quotas Grid */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Monthly Resource Consumption ({quota?.billingMonth || 'Current Month'})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Real-time usage tracking across AI messages, ImageStudio, 3D VideoStudio, multilingual TTS, App Builder, and Cloud Storage.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={exportingWorkspace}
                    onClick={() => void handleExportWorkspaceBackup()}
                    className="flex items-center gap-1.5 rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-extrabold text-slate-950 transition hover:bg-amber-300 disabled:opacity-50"
                  >
                    <Layers size={13} />
                    <span>
                      {exportingWorkspace ? 'Exporting...' : 'Export Workspace Backup (.json)'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportUsageCsv}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-200 transition hover:border-amber-400/50 hover:text-white"
                  >
                    <FileSpreadsheet size={13} />
                    <span>Export Ledger (.csv)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleResetMonthlyCounters()}
                    className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-300 transition hover:border-amber-400/50 hover:text-white"
                  >
                    Reset Current Counters
                  </button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {usageMetricsList.map((m) => {
                  const pct = Math.min(100, Math.round((m.used / Math.max(1, m.limit)) * 100));
                  const isNearLimit = pct >= 80;
                  const isExceeded = pct >= 100;
                  return (
                    <div
                      key={m.id}
                      className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-bold text-white">{m.label}</span>
                        <span
                          className={`font-mono font-bold ${
                            isExceeded
                              ? 'text-rose-400'
                              : isNearLimit
                                ? 'text-amber-400'
                                : 'text-emerald-400'
                          }`}
                        >
                          {pct}%
                        </span>
                      </div>
                      <div className="mt-2 flex items-baseline justify-between font-mono text-xs text-slate-300">
                        <span>
                          <strong className="text-sm text-white">{m.used}</strong> / {m.limit}{' '}
                          {m.unit}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {Math.max(0, Number((m.limit - m.used).toFixed(1)))} remaining
                        </span>
                      </div>
                      <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isExceeded
                              ? 'bg-rose-500'
                              : isNearLimit
                                ? 'bg-amber-400'
                                : 'bg-emerald-400'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Recent Metered Operations Ledger & Invoices */}
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <span className="text-xs font-bold text-white">
                      Recent Metered Operations Ledger
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {(statusData?.usageLedger || []).length} events recorded
                    </span>
                  </div>
                  <div className="mt-3 max-h-56 space-y-2 overflow-y-auto">
                    {!statusData?.usageLedger || statusData.usageLedger.length === 0 ? (
                      <p className="py-4 text-center text-xs text-slate-500">
                        No metered operations recorded yet in this billing cycle.
                      </p>
                    ) : (
                      statusData.usageLedger.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between gap-2 rounded-lg border border-slate-800/80 bg-slate-950/70 px-3 py-2 text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-semibold text-slate-200">
                              {entry.label}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {entry.operationType} ·{' '}
                              {new Date(entry.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                          <span className="font-mono text-xs font-bold text-amber-400">
                            +{entry.units}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Subscription Invoices & Transitions */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <span className="text-xs font-bold text-white">
                      Subscription Invoices &amp; Plan History
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Modular Billing Ledger
                    </span>
                  </div>
                  <div className="mt-3 max-h-56 space-y-2 overflow-y-auto">
                    {(statusData?.subscription.invoices || []).map((inv) => (
                      <div
                        key={inv.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-slate-800/80 bg-slate-950/70 px-3 py-2 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-semibold text-slate-200">
                            {inv.description}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {inv.date.slice(0, 10)} · Gateway: {inv.provider} · {inv.status}
                          </div>
                        </div>
                        <span className="font-mono text-xs font-bold text-emerald-400">
                          ${inv.amountUsd}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'admin' && adminPlansDraft && (
            <div className="space-y-5">
              {/* Top Admin Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Admin Plan Limits &amp; Modular Payment Gateway Configuration
                  </h3>
                  <p className="text-xs text-slate-400">
                    Customize monthly quotas for Free, Pro, and Premium plans and select the active server-side payment adapter. No payment secrets are hard-coded.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-200">
                    <input
                      type="checkbox"
                      checked={adminEnforceHardLimits}
                      onChange={(e) => setAdminEnforceHardLimits(e.target.checked)}
                    />
                    <span>Enforce Hard Monthly Quotas</span>
                  </label>
                  <button
                    type="button"
                    disabled={savingAdmin}
                    onClick={() => void handleSaveAdminConfig()}
                    className="rounded-lg bg-amber-400 px-4 py-2 text-xs font-extrabold text-slate-950 transition hover:bg-amber-300 disabled:opacity-50"
                  >
                    {savingAdmin ? 'Saving...' : 'Save Admin Configuration'}
                  </button>
                </div>
              </div>

              {/* Modular Payment Gateway Selector */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <CreditCard size={15} className="text-amber-400" />
                    <span>Modular Payment Provider Adapter (Environment-Driven, Zero Hard-Coded Keys)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleSimulateWebhook('pro')}
                      className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-slate-200 hover:border-amber-400/50 hover:text-white"
                    >
                      <Webhook size={12} />
                      <span>Test Webhook (Pro)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSimulateWebhook('premium')}
                      className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-slate-200 hover:border-amber-400/50 hover:text-white"
                    >
                      <Webhook size={12} />
                      <span>Test Webhook (Premium)</span>
                    </button>
                  </div>
                </div>

                <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {(statusData?.paymentGateway.adapters || []).map((adapter) => {
                    const isSelected = adminActiveProvider === adapter.id;
                    return (
                      <button
                        key={adapter.id}
                        type="button"
                        onClick={() => setAdminActiveProvider(adapter.id)}
                        className={`flex flex-col justify-between rounded-xl border p-3 text-left transition ${
                          isSelected
                            ? 'border-amber-400 bg-slate-900'
                            : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-white">{adapter.name}</span>
                            <span
                              className={`text-[10px] font-semibold ${
                                adapter.configured ? 'text-emerald-400' : 'text-amber-400'
                              }`}
                            >
                              {adapter.configured ? 'Env Ready' : 'Sandbox Fallback'}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] text-slate-400">{adapter.description}</p>
                        </div>
                        <div className="mt-2 pt-2 border-t border-slate-800/80 font-mono text-[10px] text-slate-400">
                          Env: {adapter.envVarsRequired.join(', ')}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Editable Plan Limits Matrix (Free / Pro / Premium) */}
              <div className="grid gap-4 md:grid-cols-3">
                {(['free', 'pro', 'premium'] as const).map((planKey) => {
                  const p = adminPlansDraft[planKey];
                  const updateLimit = (field: keyof SubscriptionPlanLimits, val: number) => {
                    setAdminPlansDraft((prev) => {
                      if (!prev) return prev;
                      return {
                        ...prev,
                        [planKey]: {
                          ...prev[planKey],
                          limits: {
                            ...prev[planKey].limits,
                            [field]: Math.max(1, val),
                          },
                        },
                      };
                    });
                  };
                  const updatePrice = (
                    field: 'monthlyPriceUsd' | 'annualPriceUsd' | 'monthlyPricePkr',
                    val: number,
                  ) => {
                    setAdminPlansDraft((prev) => {
                      if (!prev) return prev;
                      return {
                        ...prev,
                        [planKey]: {
                          ...prev[planKey],
                          [field]: Math.max(0, val),
                        },
                      };
                    });
                  };

                  return (
                    <div
                      key={planKey}
                      className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4"
                    >
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="text-sm font-extrabold text-white">{p.name}</span>
                        <span className="font-mono text-xs uppercase text-amber-400">
                          {planKey}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <label className="space-y-1">
                          <span className="text-[11px] text-slate-400">Monthly USD ($)</span>
                          <input
                            type="number"
                            min={0}
                            value={p.monthlyPriceUsd}
                            onChange={(e) =>
                              updatePrice('monthlyPriceUsd', Number(e.target.value))
                            }
                            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 font-mono text-xs text-white"
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="text-[11px] text-slate-400">Monthly PKR (Rs)</span>
                          <input
                            type="number"
                            min={0}
                            value={p.monthlyPricePkr}
                            onChange={(e) =>
                              updatePrice('monthlyPricePkr', Number(e.target.value))
                            }
                            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 font-mono text-xs text-white"
                          />
                        </label>
                      </div>

                      <div className="space-y-2 pt-1 text-xs">
                        <label className="flex items-center justify-between gap-2">
                          <span className="text-slate-300">AI Messages / mo</span>
                          <input
                            type="number"
                            min={1}
                            value={p.limits.aiMessagesMonthly}
                            onChange={(e) =>
                              updateLimit('aiMessagesMonthly', Number(e.target.value))
                            }
                            className="w-24 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-right font-mono text-xs text-white"
                          />
                        </label>
                        <label className="flex items-center justify-between gap-2">
                          <span className="text-slate-300">Image Gen / mo</span>
                          <input
                            type="number"
                            min={1}
                            value={p.limits.imageGenMonthly}
                            onChange={(e) =>
                              updateLimit('imageGenMonthly', Number(e.target.value))
                            }
                            className="w-24 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-right font-mono text-xs text-white"
                          />
                        </label>
                        <label className="flex items-center justify-between gap-2">
                          <span className="text-slate-300">3D Video Gen / mo</span>
                          <input
                            type="number"
                            min={1}
                            value={p.limits.videoGenMonthly}
                            onChange={(e) =>
                              updateLimit('videoGenMonthly', Number(e.target.value))
                            }
                            className="w-24 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-right font-mono text-xs text-white"
                          />
                        </label>
                        <label className="flex items-center justify-between gap-2">
                          <span className="text-slate-300">Voice TTS / mo</span>
                          <input
                            type="number"
                            min={1}
                            value={p.limits.voiceTtsMonthly}
                            onChange={(e) =>
                              updateLimit('voiceTtsMonthly', Number(e.target.value))
                            }
                            className="w-24 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-right font-mono text-xs text-white"
                          />
                        </label>
                        <label className="flex items-center justify-between gap-2">
                          <span className="text-slate-300">App Builds / mo</span>
                          <input
                            type="number"
                            min={1}
                            value={p.limits.appBuildsMonthly}
                            onChange={(e) =>
                              updateLimit('appBuildsMonthly', Number(e.target.value))
                            }
                            className="w-24 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-right font-mono text-xs text-white"
                          />
                        </label>
                        <label className="flex items-center justify-between gap-2">
                          <span className="text-slate-300">Storage (MB)</span>
                          <input
                            type="number"
                            min={10}
                            value={p.limits.storageLimitMb}
                            onChange={(e) =>
                              updateLimit('storageLimitMb', Number(e.target.value))
                            }
                            className="w-24 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-right font-mono text-xs text-white"
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Multi-Tenant User Subscription Override Table */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <Users size={15} className="text-sky-400" />
                  <span>Workspace Tenant Subscriptions &amp; Admin Overrides</span>
                </div>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="pb-2 font-semibold">Tenant / User</th>
                        <th className="pb-2 font-semibold">Plan</th>
                        <th className="pb-2 font-semibold">AI Msgs</th>
                        <th className="pb-2 font-semibold">Images</th>
                        <th className="pb-2 font-semibold">Videos</th>
                        <th className="pb-2 font-semibold">Storage</th>
                        <th className="pb-2 text-right font-semibold">Admin Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70">
                      {adminTenants.map((t) => (
                        <tr key={t.uid} className="text-slate-200">
                          <td className="py-2.5">
                            <div className="font-bold text-white">{t.displayName}</div>
                            <div className="font-mono text-[11px] text-slate-400">{t.email}</div>
                          </td>
                          <td className="py-2.5 font-mono uppercase text-amber-400">{t.planId}</td>
                          <td className="py-2.5 font-mono">{t.monthlyAiMessagesUsed}</td>
                          <td className="py-2.5 font-mono">{t.monthlyImageGenUsed}</td>
                          <td className="py-2.5 font-mono">{t.monthlyVideoGenUsed}</td>
                          <td className="py-2.5 font-mono">{t.storageMbUsed} MB</td>
                          <td className="py-2.5 text-right">
                            <div className="inline-flex items-center gap-1">
                              {(['free', 'pro', 'premium'] as const).map((pid) => (
                                <button
                                  key={pid}
                                  type="button"
                                  onClick={() => void handleAdminAssignTenantPlan(t.uid, pid, false)}
                                  className={`rounded px-2 py-1 text-[10px] font-bold uppercase ${
                                    t.planId === pid
                                      ? 'bg-amber-400 text-slate-950'
                                      : 'bg-slate-800 text-slate-300 hover:text-white'
                                  }`}
                                >
                                  {pid}
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={() =>
                                  void handleAdminAssignTenantPlan(t.uid, t.planId, true)
                                }
                                className="ml-1 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] font-bold text-slate-300 hover:text-white"
                              >
                                Reset Usage
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'monitoring' && (
            <div className="space-y-5">
              {/* Top Monitoring Summary & Export Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Production System Monitoring, Subsystem Health &amp; Structured Audit Logs
                  </h3>
                  <p className="text-xs text-slate-400">
                    Real-time server telemetry, X-Request-Id correlation, API latency metrics, and error tracking across all AI and media studios.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadAuditLogsJson}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 transition hover:border-amber-400/50 hover:text-white"
                  >
                    Download Logs (.json)
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleClearServerLogs()}
                    className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-300 transition hover:bg-rose-500 hover:text-white"
                  >
                    Clear Log Buffer
                  </button>
                </div>
              </div>

              {/* Telemetry Metrics Grid */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                  <div className="text-[11px] text-slate-400">System Uptime</div>
                  <div className="mt-1 font-mono text-base font-extrabold text-emerald-400">
                    {monitoringData?.system.uptimeSeconds ?? 0}s
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Node {monitoringData?.system.nodeVersion || 'v22'}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                  <div className="text-[11px] text-slate-400">Memory (RSS / Heap)</div>
                  <div className="mt-1 font-mono text-base font-extrabold text-white">
                    {monitoringData?.system.memory.rssMb ?? 0} MB
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Heap: {monitoringData?.system.memory.heapUsedMb ?? 0} MB
                  </div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                  <div className="text-[11px] text-slate-400">API Requests</div>
                  <div className="mt-1 font-mono text-base font-extrabold text-amber-400">
                    {monitoringData?.metrics.totalRequests ?? 0}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    2xx: {monitoringData?.metrics.status2xx ?? 0} · 4xx:{' '}
                    {monitoringData?.metrics.status4xx ?? 0}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                  <div className="text-[11px] text-slate-400">Avg API Latency</div>
                  <div className="mt-1 font-mono text-base font-extrabold text-sky-400">
                    {monitoringData?.metrics.avgLatencyMs ?? 0} ms
                  </div>
                  <div className="text-[10px] text-slate-500">
                    AI Calls: {monitoringData?.metrics.aiCallsCount ?? 0}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                  <div className="text-[11px] text-slate-400">5xx Error Rate</div>
                  <div className="mt-1 font-mono text-base font-extrabold text-emerald-400">
                    {monitoringData?.metrics.errorRatePct ?? 0}%
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Errors: {monitoringData?.metrics.errorCount ?? 0}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                  <div className="text-[11px] text-slate-400">Isolated Tenants</div>
                  <div className="mt-1 font-mono text-base font-extrabold text-white">
                    {monitoringData?.system.activeTenantsCount ?? 1}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Users: {monitoringData?.system.registeredUsersCount ?? 0}
                  </div>
                </div>
              </div>

              {/* 7-Subsystem Production Readiness Matrix */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                <div className="text-xs font-bold text-white">
                  Platform Subsystem Health Matrix
                </div>
                <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {(monitoringData?.subsystems || []).map((sub) => (
                    <div
                      key={sub.id}
                      className="rounded-xl border border-slate-800 bg-slate-950/70 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-white">{sub.name}</span>
                        <span
                          className={`text-[10px] font-bold uppercase ${
                            sub.status === 'operational'
                              ? 'text-emerald-400'
                              : 'text-amber-400'
                          }`}
                        >
                          {sub.status}
                        </span>
                      </div>
                      <div className="mt-1 font-mono text-[10px] text-amber-300">
                        {sub.model}
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400">{sub.detail}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Structured Server & Security Audit Log Stream */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="text-xs font-bold text-white">
                    Structured Audit &amp; Request Log Stream ({(monitoringData?.logs || []).length} entries)
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <select
                      aria-label="Filter logs by category"
                      value={logCategoryFilter}
                      onChange={(e) => setLogCategoryFilter(e.target.value)}
                      className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs text-slate-200"
                    >
                      <option value="all">All Categories</option>
                      <option value="ai_generation">AI &amp; Media Generation</option>
                      <option value="auth">Authentication</option>
                      <option value="billing">Subscription &amp; Billing</option>
                      <option value="api">General API</option>
                      <option value="error">Errors &amp; Exceptions</option>
                    </select>
                    <select
                      aria-label="Filter logs by severity"
                      value={logLevelFilter}
                      onChange={(e) => setLogLevelFilter(e.target.value)}
                      className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs text-slate-200"
                    >
                      <option value="all">All Levels</option>
                      <option value="info">Info</option>
                      <option value="warn">Warning</option>
                      <option value="security">Security / Rate Limit</option>
                      <option value="error">Error</option>
                    </select>
                  </div>
                </div>

                <div className="mt-3 max-h-64 space-y-1.5 overflow-y-auto font-mono text-[11px]">
                  {(monitoringData?.logs || []).length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-500">
                      No log entries match the selected filter.
                    </div>
                  ) : (
                    (monitoringData?.logs || []).map((log) => (
                      <div
                        key={log.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800/80 bg-slate-950/80 px-3 py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`font-bold uppercase ${
                                log.level === 'error'
                                  ? 'text-rose-400'
                                  : log.level === 'security' || log.level === 'warn'
                                    ? 'text-amber-400'
                                    : 'text-emerald-400'
                              }`}
                            >
                              [{log.level}]
                            </span>
                            <span className="text-slate-400">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                            <span className="text-sky-400">{log.requestId}</span>
                            <span className="text-slate-200">{log.message}</span>
                          </div>
                          {log.detail && (
                            <div className="mt-1 truncate text-[10px] text-rose-300">
                              {log.detail}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          <span>uid:{log.userId}</span>
                          <span>{log.durationMs}ms</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 bg-slate-900/80 px-5 py-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck size={15} className="text-emerald-400" />
            <span>
              Modular Payment Architecture · Environment-Only Secrets · Per-Operation Monthly Metering
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-1.5 font-bold text-white transition hover:bg-slate-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
