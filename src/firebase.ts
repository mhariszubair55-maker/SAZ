import { initializeApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  inMemoryPersistence,
  GoogleAuthProvider,
  GithubAuthProvider,
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
  onAuthStateChanged,
  type Auth,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocFromServer,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth: Auth = (() => {
  try {
    return getAuth(app);
  } catch {
    return initializeAuth(app, { persistence: inMemoryPersistence });
  }
})();
export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      displayName?: string | null;
      email?: string | null;
      photoUrl?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
void testConnection();

export interface AppUserSession {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  bio?: string;
  roleTitle?: string;
  provider: 'google' | 'github' | 'email';
  emailVerified?: boolean;
  sessionToken?: string;
  themePreset?: 'neon_dark' | 'midnight_blue' | 'minimal_mono' | 'solar_light';
  language?: 'english' | 'urdu' | 'roman';
  promptCount?: number;
  appBuildCount?: number;
  mediaGenCount?: number;
}

export interface CloudProjectRecord {
  id: number;
  title: string;
  idea: string;
  progress: string;
  status: 'active' | 'paused' | 'complete';
  createdAt: string;
  updatedAt: string;
}

export interface CloudConversationSummary {
  id: number;
  projectId: number | null;
  title: string;
  lastMessagePreview?: string;
  messageCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CloudKnowledgeDocRecord {
  id: number;
  projectId: number;
  name: string;
  mimeType: string;
  content?: string;
  createdAt: string;
}

export interface CloudArtifactRecord {
  id: string;
  kind: 'app' | 'image' | 'video' | 'audio';
  title: string;
  description: string;
  htmlCode?: string;
  createdAt: string;
}

const UID_REGEX = /^[a-zA-Z0-9_-]+$/;
const MAX_DISPLAY_NAME_LEN = 80;
const MAX_EMAIL_LEN = 120;
const MAX_PHOTO_URL_LEN = 500;
const MAX_BIO_LEN = 240;
const MAX_ROLE_LEN = 60;

export function sanitizeFirestoreId(raw: string, fallback = 'doc_1'): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
  return cleaned && UID_REGEX.test(cleaned) ? cleaned : fallback;
}

export function canWriteToCloudFirestore(sessionUid?: string): boolean {
  if (!auth.currentUser || !auth.currentUser.emailVerified) return false;
  const uid = sessionUid || auth.currentUser.uid;
  return uid === auth.currentUser.uid && UID_REGEX.test(uid) && uid.length <= 128;
}

/**
 * Returns HTTP headers identifying the current authenticated user for backend API calls
 * so server.ts strictly isolates projects, chats, media, files, settings, and usage per user.
 */
export async function buildUserAuthHeaders(
  session: AppUserSession | null,
  extraHeaders: Record<string, string> = {},
): Promise<Record<string, string>> {
  const headers: Record<string, string> = { ...extraHeaders };
  let activeSession = session;
  if (!activeSession && typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem('saz-ai-auth-user-v1');
      if (raw) {
        const parsed = JSON.parse(raw) as AppUserSession;
        if (parsed && parsed.uid) {
          activeSession = parsed;
        }
      }
    } catch {
      // ignore storage errors
    }
  }
  const resolvedUid = auth.currentUser?.uid || activeSession?.uid || 'guest_default';
  const safeUid = sanitizeFirestoreId(resolvedUid, 'guest_default');
  headers['X-SAZ-User-Id'] = safeUid;
  headers['X-User-Uid'] = safeUid;
  if (activeSession?.email || auth.currentUser?.email) {
    const cleanEmail = (activeSession?.email || auth.currentUser?.email || '').slice(0, 120);
    headers['X-SAZ-User-Email'] = cleanEmail;
    headers['X-User-Email'] = cleanEmail;
  }
  if (activeSession?.displayName || auth.currentUser?.displayName) {
    const encodedName = encodeURIComponent(
      (activeSession?.displayName || auth.currentUser?.displayName || 'Developer').slice(0, 80),
    );
    headers['X-SAZ-User-Name'] = encodedName;
    headers['X-User-Name'] = encodedName;
  }
  if (auth.currentUser) {
    try {
      const idToken = await auth.currentUser.getIdToken();
      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }
    } catch {
      // ignore token refresh error
    }
  } else if (activeSession?.sessionToken) {
    headers['Authorization'] = `Bearer ${activeSession.sessionToken}`;
  }
  return headers;
}

export async function syncUserProfileToFirestore(
  session: AppUserSession,
): Promise<AppUserSession | null> {
  if (!canWriteToCloudFirestore(session.uid)) {
    return null;
  }
  const safeUid = session.uid.slice(0, 128);
  const safeDisplayName =
    (session.displayName || 'Developer').trim().slice(0, MAX_DISPLAY_NAME_LEN) || 'Developer';
  const safeEmail = (session.email || 'user@saz.ai').trim().slice(0, MAX_EMAIL_LEN);
  const safePhoto = session.photoURL
    ? session.photoURL.trim().slice(0, MAX_PHOTO_URL_LEN)
    : undefined;
  const safeBio = session.bio ? session.bio.trim().slice(0, MAX_BIO_LEN) : undefined;
  const safeRole = session.roleTitle ? session.roleTitle.trim().slice(0, MAX_ROLE_LEN) : undefined;
  const path = `users/${safeUid}`;
  const userRef = doc(db, 'users', safeUid);

  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      const payload: Record<string, unknown> = {
        uid: safeUid,
        displayName: safeDisplayName,
        email: safeEmail,
        provider: session.provider,
        promptCount: Math.max(0, Number(session.promptCount) || 0),
        appBuildCount: Math.max(0, Number(session.appBuildCount) || 0),
        mediaGenCount: Math.max(0, Number(session.mediaGenCount) || 0),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (safePhoto) payload.photoURL = safePhoto;
      if (safeBio) payload.bio = safeBio;
      if (safeRole) payload.roleTitle = safeRole;
      if (session.themePreset) payload.themePreset = session.themePreset;
      if (session.language) payload.language = session.language;
      await setDoc(userRef, payload);
      return session;
    } else {
      const existingData = snap.data() as Record<string, unknown>;
      const updatePayload: Record<string, unknown> = {
        displayName: safeDisplayName,
        email: safeEmail,
        provider: session.provider,
        updatedAt: serverTimestamp(),
      };
      if (safePhoto !== undefined) updatePayload.photoURL = safePhoto;
      if (safeBio !== undefined) updatePayload.bio = safeBio;
      if (safeRole !== undefined) updatePayload.roleTitle = safeRole;
      if (session.themePreset) updatePayload.themePreset = session.themePreset;
      if (session.language) updatePayload.language = session.language;
      if (typeof session.promptCount === 'number') {
        updatePayload.promptCount = Math.max(0, session.promptCount);
      }
      if (typeof session.appBuildCount === 'number') {
        updatePayload.appBuildCount = Math.max(0, session.appBuildCount);
      }
      if (typeof session.mediaGenCount === 'number') {
        updatePayload.mediaGenCount = Math.max(0, session.mediaGenCount);
      }
      await updateDoc(userRef, updatePayload);
      return {
        ...session,
        bio: (safeBio ?? (existingData.bio as string | undefined)) || undefined,
        roleTitle: (safeRole ?? (existingData.roleTitle as string | undefined)) || undefined,
        themePreset:
          session.themePreset ||
          (existingData.themePreset as AppUserSession['themePreset']) ||
          undefined,
        language:
          session.language ||
          (existingData.language as AppUserSession['language']) ||
          undefined,
        promptCount:
          typeof session.promptCount === 'number'
            ? session.promptCount
            : (existingData.promptCount as number | undefined) ?? 0,
        appBuildCount:
          typeof session.appBuildCount === 'number'
            ? session.appBuildCount
            : (existingData.appBuildCount as number | undefined) ?? 0,
        mediaGenCount:
          typeof session.mediaGenCount === 'number'
            ? session.mediaGenCount
            : (existingData.mediaGenCount as number | undefined) ?? 0,
      };
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveUserProjectToFirestore(
  uid: string,
  project: CloudProjectRecord,
): Promise<void> {
  if (!canWriteToCloudFirestore(uid)) return;
  const docId = sanitizeFirestoreId(`proj_${project.id}`, 'proj_1');
  const path = `users/${uid}/projects/${docId}`;
  const ref = doc(db, 'users', uid, 'projects', docId);
  const safeTitle = (project.title || 'Untitled Project').trim().slice(0, 120) || 'Untitled Project';
  const safeIdea = (project.idea || '').trim().slice(0, 2000);
  const safeProgress = (project.progress || '').trim().slice(0, 1000);
  const safeStatus =
    project.status === 'paused' || project.status === 'complete' ? project.status : 'active';

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        id: docId,
        ownerId: uid,
        numericId: Math.max(1, Number(project.id) || 1),
        title: safeTitle,
        idea: safeIdea,
        progress: safeProgress,
        status: safeStatus,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        title: safeTitle,
        idea: safeIdea,
        progress: safeProgress,
        status: safeStatus,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteUserProjectFromFirestore(
  uid: string,
  projectId: number,
): Promise<void> {
  if (!canWriteToCloudFirestore(uid)) return;
  const docId = sanitizeFirestoreId(`proj_${projectId}`, 'proj_1');
  const path = `users/${uid}/projects/${docId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'projects', docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveUserConversationToFirestore(
  uid: string,
  conv: CloudConversationSummary,
): Promise<void> {
  if (!canWriteToCloudFirestore(uid)) return;
  const docId = sanitizeFirestoreId(`conv_${conv.id}`, 'conv_1');
  const path = `users/${uid}/conversations/${docId}`;
  const ref = doc(db, 'users', uid, 'conversations', docId);
  const safeTitle = (conv.title || 'New session').trim().slice(0, 140) || 'New session';
  const safePreview = (conv.lastMessagePreview || '').trim().slice(0, 500);
  const safeCount = Math.max(0, Number(conv.messageCount) || 1);
  const safeProjectId = Math.max(0, Number(conv.projectId) || 1);

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        id: docId,
        ownerId: uid,
        numericId: Math.max(1, Number(conv.id) || 1),
        projectId: safeProjectId,
        title: safeTitle,
        lastMessagePreview: safePreview,
        messageCount: safeCount,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        projectId: safeProjectId,
        title: safeTitle,
        lastMessagePreview: safePreview,
        messageCount: safeCount,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveUserKnowledgeDocToFirestore(
  uid: string,
  kd: CloudKnowledgeDocRecord,
): Promise<void> {
  if (!canWriteToCloudFirestore(uid)) return;
  const docId = sanitizeFirestoreId(`kdoc_${kd.id}`, 'kdoc_1');
  const path = `users/${uid}/knowledge/${docId}`;
  const ref = doc(db, 'users', uid, 'knowledge', docId);
  const safeName = (kd.name || 'document.txt').trim().slice(0, 160) || 'document.txt';
  const safeMime = (kd.mimeType || 'text/plain').trim().slice(0, 100) || 'text/plain';
  const safeContent = (kd.content || '').slice(0, 95000);

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        id: docId,
        ownerId: uid,
        numericId: Math.max(1, Number(kd.id) || 1),
        projectId: Math.max(1, Number(kd.projectId) || 1),
        name: safeName,
        mimeType: safeMime,
        content: safeContent,
        createdAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteUserKnowledgeDocFromFirestore(
  uid: string,
  docNumericId: number,
): Promise<void> {
  if (!canWriteToCloudFirestore(uid)) return;
  const docId = sanitizeFirestoreId(`kdoc_${docNumericId}`, 'kdoc_1');
  const path = `users/${uid}/knowledge/${docId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'knowledge', docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveUserArtifactToFirestore(
  uid: string,
  artifact: CloudArtifactRecord,
): Promise<void> {
  if (!canWriteToCloudFirestore(uid)) return;
  const docId = sanitizeFirestoreId(artifact.id, `art_${Date.now()}`);
  const path = `users/${uid}/artifacts/${docId}`;
  const ref = doc(db, 'users', uid, 'artifacts', docId);
  const safeTitle = (artifact.title || 'SAZ AI Artifact').trim().slice(0, 160) || 'SAZ AI Artifact';
  const safeDesc = (artifact.description || '').trim().slice(0, 1000);
  const safeKind =
    artifact.kind === 'image' || artifact.kind === 'video' || artifact.kind === 'audio'
      ? artifact.kind
      : 'app';

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      const payload: Record<string, unknown> = {
        id: docId,
        ownerId: uid,
        kind: safeKind,
        title: safeTitle,
        description: safeDesc,
        createdAt: serverTimestamp(),
      };
      if (artifact.htmlCode) {
        payload.htmlCode = artifact.htmlCode.slice(0, 145000);
      }
      await setDoc(ref, payload);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function loadUserWorkspaceFromFirestore(uid: string): Promise<{
  projects: CloudProjectRecord[];
  conversations: CloudConversationSummary[];
  knowledgeDocs: CloudKnowledgeDocRecord[];
  artifacts: CloudArtifactRecord[];
} | null> {
  if (!canWriteToCloudFirestore(uid)) return null;
  try {
    const projectsPath = `users/${uid}/projects`;
    const convsPath = `users/${uid}/conversations`;
    const kdocsPath = `users/${uid}/knowledge`;
    const artsPath = `users/${uid}/artifacts`;

    const [projSnap, convSnap, kdocSnap, artSnap] = await Promise.all([
      getDocs(query(collection(db, projectsPath), where('ownerId', '==', uid))).catch((e) =>
        handleFirestoreError(e, OperationType.LIST, projectsPath),
      ),
      getDocs(query(collection(db, convsPath), where('ownerId', '==', uid))).catch((e) =>
        handleFirestoreError(e, OperationType.LIST, convsPath),
      ),
      getDocs(query(collection(db, kdocsPath), where('ownerId', '==', uid))).catch((e) =>
        handleFirestoreError(e, OperationType.LIST, kdocsPath),
      ),
      getDocs(query(collection(db, artsPath), where('ownerId', '==', uid))).catch((e) =>
        handleFirestoreError(e, OperationType.LIST, artsPath),
      ),
    ]);

    const projects: CloudProjectRecord[] = projSnap.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return {
        id: Number(data.numericId) || 1,
        title: String(data.title || 'Project'),
        idea: String(data.idea || ''),
        progress: String(data.progress || ''),
        status:
          data.status === 'paused' || data.status === 'complete' ? data.status : 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });

    const conversations: CloudConversationSummary[] = convSnap.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return {
        id: Number(data.numericId) || 1,
        projectId: Number(data.projectId) || 1,
        title: String(data.title || 'Session'),
        lastMessagePreview: String(data.lastMessagePreview || ''),
        messageCount: Number(data.messageCount) || 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });

    const knowledgeDocs: CloudKnowledgeDocRecord[] = kdocSnap.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return {
        id: Number(data.numericId) || 1,
        projectId: Number(data.projectId) || 1,
        name: String(data.name || 'document.txt'),
        mimeType: String(data.mimeType || 'text/plain'),
        content: String(data.content || ''),
        createdAt: new Date().toISOString(),
      };
    });

    const artifacts: CloudArtifactRecord[] = artSnap.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return {
        id: String(data.id || d.id),
        kind:
          data.kind === 'image' || data.kind === 'video' || data.kind === 'audio'
            ? data.kind
            : 'app',
        title: String(data.title || 'Artifact'),
        description: String(data.description || ''),
        htmlCode: typeof data.htmlCode === 'string' ? data.htmlCode : undefined,
        createdAt: new Date().toISOString(),
      };
    });

    return { projects, conversations, knowledgeDocs, artifacts };
  } catch {
    return null;
  }
}

export {
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
  onAuthStateChanged,
  type User,
};
