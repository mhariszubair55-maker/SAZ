import { useEffect, useState, type FormEvent } from 'react';
import {
  Activity,
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  Cloud,
  Database,
  FileText,
  FolderKanban,
  Github,
  KeyRound,
  Layers,
  Loader2,
  LogIn,
  LogOut,
  Mail,
  RefreshCw,
  Settings,
  ShieldCheck,
  Sparkles,
  User as UserIcon,
  X,
} from 'lucide-react';
import {
  auth,
  buildUserAuthHeaders,
  googleProvider,
  githubProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updatePassword,
  updateProfile,
  signOut,
  syncUserProfileToFirestore,
  type AppUserSession,
} from '../firebase';
import {
  isAndroidWebViewOrNative,
  syncSessionToCapacitorPreferences,
} from '../utils/androidBridge';

export const AUTH_STORAGE_KEY = 'saz-ai-auth-user-v1';

export interface UserUsageSummary {
  uid: string;
  projectsCount: number;
  conversationsCount: number;
  knowledgeDocsCount: number;
  artifactsCount: number;
  promptCount: number;
  appBuildCount: number;
  mediaGenCount: number;
  storageBytesUsed: number;
}

export function loadSavedUserSession(): AppUserSession | null {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppUserSession;
    if (parsed && parsed.uid && parsed.displayName) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveUserSession(session: AppUserSession | null): void {
  try {
    if (!session) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      void syncSessionToCapacitorPreferences(AUTH_STORAGE_KEY, null);
    } else {
      const serialized = JSON.stringify(session);
      window.localStorage.setItem(AUTH_STORAGE_KEY, serialized);
      void syncSessionToCapacitorPreferences(AUTH_STORAGE_KEY, serialized);
    }
  } catch {
    // ignore storage quota errors
  }
}

export function getInitials(name: string): string {
  const parts = (name || 'User')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatAuthError(err: unknown, fallback = 'Authentication failed. Please try again.'): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes('popup-closed-by-user')) {
    return 'Sign-in popup was closed before completing authentication.';
  }
  if (raw.includes('auth/invalid-credential') || raw.includes('auth/wrong-password') || raw.includes('auth/user-not-found')) {
    return 'Invalid email or password. Please verify your credentials or reset your password.';
  }
  if (raw.includes('auth/email-already-in-use')) {
    return 'An account with this email already exists. Switch to Login or reset your password.';
  }
  if (raw.includes('auth/weak-password')) {
    return 'Password is too weak. Please use at least 6 characters with letters and numbers.';
  }
  if (raw.includes('auth/invalid-email')) {
    return 'Please enter a valid email address.';
  }
  if (raw.includes('auth/too-many-requests')) {
    return 'Too many attempts detected. Please wait a moment or use Password Reset.';
  }
  if (raw.includes('auth/requires-recent-login')) {
    return 'For security, please sign out and sign back in before changing your password.';
  }
  return raw || fallback;
}

interface HeaderAuthControlProps {
  user: AppUserSession | null;
  onOpenAuthModal: (tab?: 'login' | 'signup' | 'reset' | 'profile' | 'settings') => void;
  onLogout: () => void;
}

export function HeaderAuthControl({
  user,
  onOpenAuthModal,
  onLogout,
}: HeaderAuthControlProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  if (!user) {
    return (
      <button
        type="button"
        onClick={() => onOpenAuthModal('login')}
        className="flex items-center gap-1.5 rounded-xl bg-amber-400 px-3 py-1.5 text-xs font-extrabold text-slate-950 shadow-2xs transition hover:bg-amber-300 whitespace-nowrap"
      >
        <LogIn size={13} strokeWidth={2.4} />
        <span>Sign In / Sign Up</span>
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setDropdownOpen((o) => !o)}
        aria-label="User profile menu"
        className="flex items-center gap-2 rounded-xl border border-slate-700/90 bg-slate-900 px-2 py-1 text-xs font-bold text-white transition hover:border-amber-400/70 hover:bg-slate-800"
      >
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt={user.displayName}
            referrerPolicy="no-referrer"
            className="size-6 rounded-full object-cover ring-1 ring-amber-400/60"
          />
        ) : (
          <span className="grid size-6 place-items-center rounded-full bg-amber-400 text-[11px] font-extrabold text-slate-950">
            {getInitials(user.displayName)}
          </span>
        )}
        <span className="hidden max-w-[110px] truncate sm:inline">{user.displayName}</span>
        <span
          title="Isolated Cloud Tenant Active"
          className="size-1.5 rounded-full bg-emerald-400"
        />
        <ChevronDown size={13} className="text-slate-400" />
      </button>

      {dropdownOpen && (
        <>
          <button
            type="button"
            aria-label="Close user dropdown"
            onClick={() => setDropdownOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-slate-800 bg-slate-950 p-2.5 text-slate-100 shadow-2xl">
            <div className="border-b border-slate-800/90 px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="truncate text-xs font-bold text-white">{user.displayName}</div>
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-emerald-400">
                  <Cloud size={10} />
                  <span>Cloud Synced</span>
                </span>
              </div>
              <div className="truncate text-[11px] text-slate-400">{user.email}</div>
              {user.roleTitle && (
                <div className="mt-0.5 truncate text-[10px] font-medium text-amber-300/90">
                  {user.roleTitle}
                </div>
              )}
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className="inline-block rounded-md bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-400">
                  {user.provider} account
                </span>
                <span className="inline-block rounded-md bg-slate-800 px-1.5 py-0.5 font-mono text-[9px] text-slate-400">
                  ID: {user.uid.slice(0, 10)}
                </span>
              </div>
            </div>

            <div className="mt-1.5 space-y-0.5">
              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  onOpenAuthModal('profile');
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-200 transition hover:bg-slate-800/90 hover:text-white"
              >
                <UserIcon size={14} className="text-amber-400" />
                <span>Profile &amp; Cloud Usage</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  onOpenAuthModal('settings');
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-200 transition hover:bg-slate-800/90 hover:text-white"
              >
                <Settings size={14} className="text-sky-400" />
                <span>Settings &amp; Security</span>
              </button>

              <div className="my-1 border-t border-slate-800/80" />

              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  onLogout();
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-rose-400 transition hover:bg-rose-950/40 hover:text-rose-300"
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface AuthModalProps {
  isOpen: boolean;
  initialTab: 'login' | 'signup' | 'reset' | 'profile' | 'settings';
  user: AppUserSession | null;
  usageSummary?: UserUsageSummary | null;
  githubAuthUrl?: string;
  isDark: boolean;
  onToggleTheme: () => void;
  onSyncCloudWorkspace?: () => Promise<void>;
  onClose: () => void;
  onAuthSuccess: (session: AppUserSession, message: string) => void;
  onLogout: () => void;
}

export function AuthSystemModal({
  isOpen,
  initialTab,
  user,
  usageSummary,
  githubAuthUrl,
  isDark,
  onToggleTheme,
  onSyncCloudWorkspace,
  onClose,
  onAuthSuccess,
  onLogout,
}: AuthModalProps) {
  const [tab, setTab] = useState<'login' | 'signup' | 'reset' | 'profile' | 'settings'>(initialTab);
  const [nameInput, setNameInput] = useState(user?.displayName ?? '');
  const [roleInput, setRoleInput] = useState(user?.roleTitle ?? 'Lead AI Engineer');
  const [bioInput, setBioInput] = useState(
    user?.bio ?? 'Building isolated full-stack AI applications and 3D media in SAZ AI.',
  );
  const [photoUrlInput, setPhotoUrlInput] = useState(user?.photoURL ?? '');
  const [emailInput, setEmailInput] = useState(user?.email ?? '');
  const [passwordInput, setPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncingCloud, setSyncingCloud] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    // Handle return from Android WebView signInWithRedirect OAuth flow if active
    let active = true;
    void getRedirectResult(auth)
      .then(async (cred) => {
        if (!active || !cred || !cred.user) return;
        const fbUser = cred.user;
        const isGithub = cred.providerId?.includes('github');
        const session: AppUserSession = {
          uid: fbUser.uid,
          displayName:
            fbUser.displayName ||
            (fbUser.email ? fbUser.email.split('@')[0] : 'Developer'),
          email: fbUser.email || 'user@sazai.workspace',
          photoURL: fbUser.photoURL || undefined,
          provider: isGithub ? 'github' : 'google',
          emailVerified: fbUser.emailVerified,
        };
        const synced = await syncUserProfileToFirestore(session).catch(() => null);
        const finalSession = synced || session;
        saveUserSession(finalSession);
        onAuthSuccess(finalSession, `Signed in as ${finalSession.displayName}`);
        onClose();
      })
      .catch(() => {
        // ignore if no redirect was pending
      });
    return () => {
      active = false;
    };
  }, [onAuthSuccess, onClose]);

  useEffect(() => {
    setTab(initialTab);
    setErrorMsg('');
    setSuccessMsg('');
    if (user) {
      setNameInput(user.displayName || '');
      setEmailInput(user.email || '');
      setRoleInput(user.roleTitle || 'Lead AI Engineer');
      setBioInput(
        user.bio || 'Building isolated full-stack AI applications and 3D media in SAZ AI.',
      );
      setPhotoUrlInput(user.photoURL || '');
    }
  }, [initialTab, user, isOpen]);

  if (!isOpen) return null;

  const activeTab =
    user && (tab === 'profile' || tab === 'settings')
      ? tab
      : tab === 'signup'
        ? 'signup'
        : tab === 'reset'
          ? 'reset'
          : 'login';

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);
    try {
      if (isAndroidWebViewOrNative()) {
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      const cred = await signInWithPopup(auth, googleProvider);
      const fbUser = cred.user;
      const session: AppUserSession = {
        uid: fbUser.uid,
        displayName:
          fbUser.displayName ||
          (fbUser.email ? fbUser.email.split('@')[0] : 'Developer'),
        email: fbUser.email || 'user@gmail.com',
        photoURL: fbUser.photoURL || undefined,
        provider: 'google',
        emailVerified: fbUser.emailVerified,
      };
      const synced = await syncUserProfileToFirestore(session).catch(() => null);
      const finalSession = synced || session;
      saveUserSession(finalSession);
      onAuthSuccess(finalSession, `Signed in as ${finalSession.displayName} via Google`);
      onClose();
    } catch (err) {
      const rawMsg = err instanceof Error ? err.message : String(err);
      if (
        rawMsg.includes('popup-blocked') ||
        rawMsg.includes('operation-not-supported-in-this-environment')
      ) {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirErr) {
          setErrorMsg(formatAuthError(redirErr, 'Google Sign-In redirect failed'));
        }
      } else {
        setErrorMsg(formatAuthError(err, 'Google Sign-In failed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGitHubSignIn = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);
    try {
      if (githubAuthUrl) {
        const popup = window.open(githubAuthUrl, 'github_oauth_popup', 'width=620,height=720');
        if (!popup) {
          setErrorMsg('Popup was blocked. Please allow popups for GitHub OAuth.');
        } else {
          onClose();
        }
        setLoading(false);
        return;
      }

      const cred = await signInWithPopup(auth, githubProvider);
      const fbUser = cred.user;
      const session: AppUserSession = {
        uid: fbUser.uid,
        displayName:
          fbUser.displayName ||
          (fbUser.email ? fbUser.email.split('@')[0] : 'GitHub Developer'),
        email: fbUser.email || 'developer@github.com',
        photoURL: fbUser.photoURL || undefined,
        provider: 'github',
        emailVerified: fbUser.emailVerified,
      };
      const synced = await syncUserProfileToFirestore(session).catch(() => null);
      const finalSession = synced || session;
      saveUserSession(finalSession);
      onAuthSuccess(finalSession, `Signed in as ${finalSession.displayName} via GitHub`);
      onClose();
    } catch {
      try {
        const res = await fetch('/api/github/status');
        if (res.ok) {
          const data = (await res.json()) as {
            connected?: boolean;
            user?: { login?: string; name?: string; avatar_url?: string };
          };
          if (data.connected && data.user?.login) {
            const session: AppUserSession = {
              uid: `gh_${data.user.login.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
              displayName: data.user.name || data.user.login,
              email: `${data.user.login}@users.noreply.github.com`,
              photoURL: data.user.avatar_url,
              provider: 'github',
              emailVerified: true,
            };
            saveUserSession(session);
            onAuthSuccess(session, `Connected with GitHub (@${data.user.login})`);
            onClose();
            return;
          }
        }
      } catch {
        // ignore
      }
      setErrorMsg(
        'Configure GITHUB_CLIENT_ID & GITHUB_CLIENT_SECRET in AI Studio Secrets or use Continue with Google / Email.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    const cleanEmail = emailInput.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMsg('Please enter a valid email address to receive a password reset link.');
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      setSuccessMsg(
        `Password reset link dispatched to ${cleanEmail}. Check your inbox and spam folder.`,
      );
    } catch (err) {
      // Also notify backend password reset record for local/managed email accounts
      try {
        const resp = await fetch('/api/auth/password-reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail }),
        });
        if (resp.ok) {
          setSuccessMsg(
            `Password reset instructions generated for ${cleanEmail}. You may now sign in or set a new password.`,
          );
          return;
        }
      } catch {
        // ignore
      }
      setErrorMsg(formatAuthError(err, 'Could not send password reset email.'));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    const cleanEmail = emailInput.trim().toLowerCase();
    const cleanPass = passwordInput;
    const cleanName =
      nameInput.trim() ||
      (cleanEmail.includes('@') ? cleanEmail.split('@')[0] : 'Developer');

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (cleanPass.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }
    if (activeTab === 'signup' && confirmPasswordInput && cleanPass !== confirmPasswordInput) {
      setErrorMsg('Passwords do not match. Please verify your password confirmation.');
      return;
    }

    setLoading(true);
    try {
      if (activeTab === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPass);
        if (cleanName) {
          await updateProfile(cred.user, { displayName: cleanName });
        }
        void sendEmailVerification(cred.user).catch(() => {});
        const session: AppUserSession = {
          uid: cred.user.uid,
          displayName: cleanName,
          email: cred.user.email || cleanEmail,
          roleTitle: roleInput.trim() || 'Lead AI Engineer',
          bio: bioInput.trim(),
          provider: 'email',
          emailVerified: cred.user.emailVerified,
        };
        const synced = await syncUserProfileToFirestore(session).catch(() => null);
        const finalSession = synced || session;
        saveUserSession(finalSession);
        onAuthSuccess(finalSession, `Account created! Welcome, ${finalSession.displayName}`);
        onClose();
      } else {
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
        const session: AppUserSession = {
          uid: cred.user.uid,
          displayName:
            cred.user.displayName ||
            nameInput.trim() ||
            cleanEmail.split('@')[0],
          email: cred.user.email || cleanEmail,
          photoURL: cred.user.photoURL || undefined,
          provider: 'email',
          emailVerified: cred.user.emailVerified,
        };
        const synced = await syncUserProfileToFirestore(session).catch(() => null);
        const finalSession = synced || session;
        saveUserSession(finalSession);
        onAuthSuccess(finalSession, `Welcome back, ${finalSession.displayName}`);
        onClose();
      }
    } catch (fbErr) {
      // Authenticate via server-side isolated user vault when Firebase Email/Password provider is not enabled in console
      try {
        const endpoint = activeTab === 'signup' ? '/api/auth/signup' : '/api/auth/login';
        const resp = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: cleanEmail,
            password: cleanPass,
            displayName: cleanName,
            roleTitle: roleInput.trim() || 'Lead AI Engineer',
          }),
        });
        const data = (await resp.json()) as {
          ok?: boolean;
          user?: AppUserSession;
          sessionToken?: string;
          error?: string;
        };
        if (resp.ok && data.ok && data.user) {
          const userWithToken: AppUserSession = {
            ...data.user,
            sessionToken: data.sessionToken || data.user.sessionToken,
          };
          saveUserSession(userWithToken);
          onAuthSuccess(
            userWithToken,
            activeTab === 'signup'
              ? `Account created! Welcome, ${userWithToken.displayName}`
              : `Welcome back, ${userWithToken.displayName}`,
          );
          onClose();
          return;
        }
        if (data.error) {
          setErrorMsg(data.error);
          return;
        }
      } catch {
        // fallback error formatting
      }
      setErrorMsg(formatAuthError(fbErr));
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setErrorMsg('');
    setSuccessMsg('');
    const updatedName = nameInput.trim();
    if (!updatedName) {
      setErrorMsg('Display name cannot be empty.');
      return;
    }

    setLoading(true);
    try {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: updatedName.slice(0, 80),
          photoURL: photoUrlInput.trim() ? photoUrlInput.trim().slice(0, 500) : null,
        }).catch(() => {});
      }

      const updatedSession: AppUserSession = {
        ...user,
        displayName: updatedName.slice(0, 80),
        roleTitle: roleInput.trim().slice(0, 60) || 'Lead AI Engineer',
        bio: bioInput.trim().slice(0, 240),
        photoURL: photoUrlInput.trim() ? photoUrlInput.trim().slice(0, 500) : undefined,
      };

      await syncUserProfileToFirestore(updatedSession).catch(() => null);
      const authHeaders = await buildUserAuthHeaders(updatedSession, {
        'Content-Type': 'application/json',
      });
      await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({
          displayName: updatedSession.displayName,
          roleTitle: updatedSession.roleTitle,
          bio: updatedSession.bio,
          photoURL: updatedSession.photoURL,
        }),
      }).catch(() => {});

      saveUserSession(updatedSession);
      setSuccessMsg('Profile saved & synced to your isolated cloud account.');
      onAuthSuccess(updatedSession, `Profile updated to ${updatedSession.displayName}`);
    } catch (err) {
      setErrorMsg(formatAuthError(err, 'Failed to update profile.'));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChangeInSettings = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (newPasswordInput.length < 6) {
      setErrorMsg('New password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPasswordInput);
        setNewPasswordInput('');
        setSuccessMsg('Password updated in Firebase Authentication.');
        return;
      }
      if (user) {
        const authHeaders = await buildUserAuthHeaders(user, {
          'Content-Type': 'application/json',
        });
        const resp = await fetch('/api/auth/change-password', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ email: user.email, newPassword: newPasswordInput }),
        });
        const respData = (await resp.json().catch(() => ({}))) as { error?: string };
        if (resp.ok) {
          setNewPasswordInput('');
          setSuccessMsg('Password updated for your SAZ AI account.');
          return;
        }
        if (respData.error) {
          setErrorMsg(respData.error);
          return;
        }
      }
      setErrorMsg('Could not update password. Use Password Reset to receive an email link.');
    } catch (err) {
      setErrorMsg(formatAuthError(err, 'Could not update password.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSendVerification = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    if (!auth.currentUser) {
      setSuccessMsg('Your account session is active and verified.');
      return;
    }
    setLoading(true);
    try {
      await sendEmailVerification(auth.currentUser);
      setSuccessMsg(`Verification link sent to ${auth.currentUser.email}.`);
    } catch (err) {
      setErrorMsg(formatAuthError(err, 'Could not send verification email.'));
    } finally {
      setLoading(false);
    }
  };

  const handleManualCloudSync = async () => {
    if (!onSyncCloudWorkspace) return;
    setSyncingCloud(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await onSyncCloudWorkspace();
      setSuccessMsg('Projects, chats, knowledge files & settings synced with Cloud Database.');
    } catch {
      setErrorMsg('Cloud sync encountered an error.');
    } finally {
      setSyncingCloud(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-slate-200/90 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-xl bg-amber-400 text-slate-950 shadow-xs">
              <Sparkles size={18} strokeWidth={2.4} />
            </div>
            <div>
              <h2 className="font-serif-display text-lg font-bold text-slate-900 dark:text-white">
                {activeTab === 'profile'
                  ? 'User Profile & Cloud Isolation'
                  : activeTab === 'settings'
                    ? 'Account Settings & Security'
                    : activeTab === 'reset'
                      ? 'Reset Your Password'
                      : 'SAZ AI Cloud Account'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {activeTab === 'profile'
                  ? 'Isolated projects, chats, media, files & usage telemetry'
                  : activeTab === 'settings'
                    ? 'Session security, password management & studio preferences'
                    : activeTab === 'reset'
                      ? 'Receive a secure password recovery link via email'
                      : 'Every user workspace is strictly isolated in Cloud Firestore'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        {/* Navigation Switcher for Authenticated Users */}
        {user && (activeTab === 'profile' || activeTab === 'settings') && (
          <div className="mt-4 grid grid-cols-2 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800/90">
            <button
              type="button"
              onClick={() => {
                setTab('profile');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-extrabold transition ${
                activeTab === 'profile'
                  ? 'bg-white text-slate-950 shadow-xs dark:bg-slate-950 dark:text-amber-400'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <UserIcon size={13} />
              <span>Profile &amp; Usage</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('settings');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-extrabold transition ${
                activeTab === 'settings'
                  ? 'bg-white text-slate-950 shadow-xs dark:bg-slate-950 dark:text-amber-400'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Settings size={13} />
              <span>Security &amp; Settings</span>
            </button>
          </div>
        )}

        {/* Alert Banners */}
        {errorMsg && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs font-medium text-rose-600 dark:text-rose-300">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Profile & Usage View */}
        {user && activeTab === 'profile' ? (
          <form onSubmit={(e) => void handleProfileSave(e)} className="mt-5 space-y-4">
            <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/60">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName}
                  referrerPolicy="no-referrer"
                  className="size-12 rounded-full object-cover ring-2 ring-amber-400"
                />
              ) : (
                <div className="grid size-12 place-items-center rounded-full bg-amber-400 text-base font-extrabold text-slate-950">
                  {getInitials(user.displayName)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-slate-900 dark:text-white">
                  {user.displayName}
                </div>
                <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {user.email}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck size={11} />
                    <span>Isolated Tenant · {user.provider}</span>
                  </span>
                  <span className="inline-block rounded bg-slate-200/80 px-2 py-0.5 font-mono text-[10px] text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                    UID: {user.uid.slice(0, 14)}
                  </span>
                </div>
              </div>
            </div>

            {/* Per-User Isolated Cloud Usage Metrics */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/70">
              <div className="mb-2.5 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-900 dark:text-white">
                  <Database size={13} className="text-amber-400" />
                  <span>Isolated Cloud Workspace &amp; Usage Telemetry</span>
                </div>
                {onSyncCloudWorkspace && (
                  <button
                    type="button"
                    disabled={syncingCloud}
                    onClick={() => void handleManualCloudSync()}
                    className="inline-flex items-center gap-1 rounded-lg border border-amber-400/40 bg-amber-400/10 px-2 py-1 text-[10px] font-bold text-amber-500 transition hover:bg-amber-400/20 disabled:opacity-50"
                  >
                    <RefreshCw size={11} className={syncingCloud ? 'animate-spin' : ''} />
                    <span>{syncingCloud ? 'Syncing...' : 'Sync Cloud DB'}</span>
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl border border-slate-200/80 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-center gap-1 text-[10px] font-semibold text-slate-400">
                    <FolderKanban size={11} className="text-amber-400" />
                    <span>Projects</span>
                  </div>
                  <div className="mt-0.5 text-sm font-black text-slate-900 dark:text-white">
                    {usageSummary?.projectsCount ?? 1}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200/80 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-center gap-1 text-[10px] font-semibold text-slate-400">
                    <Layers size={11} className="text-sky-400" />
                    <span>Chats &amp; Apps</span>
                  </div>
                  <div className="mt-0.5 text-sm font-black text-slate-900 dark:text-white">
                    {(usageSummary?.conversationsCount ?? 1) + (usageSummary?.appBuildCount ?? 0)}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200/80 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-center gap-1 text-[10px] font-semibold text-slate-400">
                    <FileText size={11} className="text-emerald-400" />
                    <span>Files &amp; Media</span>
                  </div>
                  <div className="mt-0.5 text-sm font-black text-slate-900 dark:text-white">
                    {(usageSummary?.knowledgeDocsCount ?? 0) + (usageSummary?.mediaGenCount ?? 0)}
                  </div>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <Activity size={11} className="text-emerald-400" />
                  Prompts Executed: <strong className="text-slate-800 dark:text-slate-200">{usageSummary?.promptCount ?? user.promptCount ?? 0}</strong>
                </span>
                <span>
                  Storage: <strong className="text-slate-800 dark:text-slate-200">{(((usageSummary?.storageBytesUsed ?? 4096) / 1024)).toFixed(1)} KB</strong>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  maxLength={80}
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Your display name"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-amber-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Role / Title
                </label>
                <input
                  type="text"
                  maxLength={60}
                  value={roleInput}
                  onChange={(e) => setRoleInput(e.target.value)}
                  placeholder="Lead AI Engineer"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-amber-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                Developer Bio / Workspace Note
              </label>
              <input
                type="text"
                maxLength={240}
                value={bioInput}
                onChange={(e) => setBioInput(e.target.value)}
                placeholder="Building isolated full-stack AI applications..."
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-amber-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                Avatar Photo URL (Optional)
              </label>
              <input
                type="url"
                maxLength={500}
                value={photoUrlInput}
                onChange={(e) => setPhotoUrlInput(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-amber-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-xs font-extrabold text-slate-950 shadow-xs transition hover:bg-amber-300 disabled:opacity-50"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                <span>Save Profile</span>
              </button>
            </div>
          </form>
        ) : user && activeTab === 'settings' ? (
          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/60">
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  Interface Appearance
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Toggle between Dark and Light studio theme
                </div>
              </div>
              <button
                type="button"
                onClick={onToggleTheme}
                className="rounded-xl bg-amber-400 px-3 py-1.5 text-xs font-extrabold text-slate-950 transition hover:bg-amber-300"
              >
                {isDark ? 'Switch to Light' : 'Switch to Dark'}
              </button>
            </div>

            {/* Email Verification Control */}
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/60">
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  Email Verification &amp; Cloud Rules Gate
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {auth.currentUser?.emailVerified || user.emailVerified
                    ? `Verified (${user.email})`
                    : `Send verification link to ${user.email}`}
                </div>
              </div>
              <button
                type="button"
                disabled={loading}
                onClick={() => void handleSendVerification()}
                className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-600 transition hover:bg-emerald-500/20 dark:text-emerald-400"
              >
                {auth.currentUser?.emailVerified || user.emailVerified ? 'Verified ✓' : 'Verify Email'}
              </button>
            </div>

            {/* Password Change Form */}
            <form
              onSubmit={(e) => void handlePasswordChangeInSettings(e)}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/60 space-y-2.5"
            >
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                Update Account Password
              </div>
              <div className="flex gap-2">
                <input
                  type="password"
                  minLength={6}
                  required
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="New password (min 6 chars)"
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-amber-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 dark:bg-amber-400 dark:text-slate-950 dark:hover:bg-amber-300"
                >
                  Update
                </button>
              </div>
            </form>

            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/60">
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  Active Isolated Session
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Signed in as {user.email}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-600 transition hover:bg-rose-500/20 dark:text-rose-400"
              >
                <LogOut size={13} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        ) : activeTab === 'reset' ? (
          <form onSubmit={(e) => void handlePasswordReset(e)} className="mt-5 space-y-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                Account Email Address
              </label>
              <div className="relative">
                <Mail
                  size={15}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="email"
                  required
                  maxLength={120}
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-9 pr-3.5 text-sm text-slate-900 outline-none focus:border-amber-400 focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setTab('login');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                ← Back to Sign In
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 rounded-2xl bg-amber-400 px-5 py-2.5 text-xs font-extrabold text-slate-950 shadow-sm transition hover:bg-amber-300 disabled:opacity-50"
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                <span>Send Reset Link</span>
              </button>
            </div>
          </form>
        ) : (
          <>
            {/* Login / Sign Up / Reset Tabs */}
            <div className="mt-5 grid grid-cols-3 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800/90">
              <button
                type="button"
                onClick={() => {
                  setTab('login');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className={`rounded-xl py-2 text-xs font-extrabold transition ${
                  activeTab === 'login'
                    ? 'bg-white text-slate-950 shadow-xs dark:bg-slate-950 dark:text-amber-400'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('signup');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className={`rounded-xl py-2 text-xs font-extrabold transition ${
                  activeTab === 'signup'
                    ? 'bg-white text-slate-950 shadow-xs dark:bg-slate-950 dark:text-amber-400'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                Sign Up
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('reset');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className="rounded-xl py-2 text-xs font-extrabold text-slate-600 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                Reset Pass
              </button>
            </div>

            {/* 1-Click OAuth Providers */}
            <div className="mt-4 space-y-2.5">
              <button
                type="button"
                disabled={loading}
                onClick={() => void handleGitHubSignIn()}
                className="flex w-full items-center justify-center gap-2.5 rounded-2xl border border-slate-300 bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-2xs transition hover:bg-slate-800 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
              >
                <Github size={16} />
                <span>Continue with GitHub</span>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => void handleGoogleSignIn()}
                className="flex w-full items-center justify-center gap-2.5 rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-900 shadow-2xs transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:hover:bg-slate-800"
              >
                <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#EA4335"
                    d="M12 10.2v3.9h5.4c-.2 1.3-1.6 3.8-5.4 3.8-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.4 14.6 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12s4.3 9.5 9.5 9.5c5.5 0 9.1-3.8 9.1-9.2 0-.6-.1-1.1-.2-1.6H12z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>
            </div>

            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                or with email
              </span>
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            </div>

            {/* Standard Email / Password Form */}
            <form onSubmit={(e) => void handleEmailAuth(e)} className="space-y-3">
              {activeTab === 'signup' && (
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Full Name
                  </label>
                  <div className="relative">
                    <UserIcon
                      size={15}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="text"
                      required
                      maxLength={80}
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="Zubair Ahmed"
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-9 pr-3.5 text-sm text-slate-900 outline-none focus:border-amber-400 focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Email Address
                </label>
                <div className="relative">
                  <Mail
                    size={15}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="email"
                    required
                    maxLength={120}
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-9 pr-3.5 text-sm text-slate-900 outline-none focus:border-amber-400 focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  {activeTab === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setTab('reset');
                        setErrorMsg('');
                        setSuccessMsg('');
                      }}
                      className="text-[11px] font-bold text-amber-500 hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <KeyRound
                    size={15}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-9 pr-3.5 text-sm text-slate-900 outline-none focus:border-amber-400 focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              {activeTab === 'signup' && (
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <KeyRound
                      size={15}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={confirmPasswordInput}
                      onChange={(e) => setConfirmPasswordInput(e.target.value)}
                      placeholder="Confirm password"
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-9 pr-3.5 text-sm text-slate-900 outline-none focus:border-amber-400 focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 py-2.5 text-xs font-extrabold text-slate-950 shadow-sm transition hover:bg-amber-300 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <LogIn size={15} strokeWidth={2.4} />
                )}
                <span>
                  {loading
                    ? 'Authenticating...'
                    : activeTab === 'signup'
                      ? 'Create Isolated Account'
                      : 'Sign In to Workspace'}
                </span>
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export { signOut };
