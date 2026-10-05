import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  AudioWaveform,
  BookOpen,
  Check,
  Copy,
  Download,
  FileJson,
  Film,
  FolderKanban,
  Gamepad2,
  History,
  Image as ImageIcon,
  Mic,
  Music,
  Play,
  RefreshCw,
  Sliders,
  Sparkles,
  Star,
  Trash2,
  Upload,
  Volume2,
  Wand2,
} from 'lucide-react';
import { ThreeGameEngine, type GameArchetype3D as GameArchetype } from './ThreeGameEngine';
import {
  ThreeCharacterConversationStudio,
  type CharacterActor3D,
  type CharacterArchetype3D,
  type CharacterEmotion3D,
  type ConversationDialogueTurn3D,
} from './ThreeCharacterConversationEngine';
import {
  buildUserAuthHeaders,
  saveUserArtifactToFirestore,
  type AppUserSession,
} from '../firebase';
import sherScene3NetTrapImg from '../assets/images/sher_cheenti_scene3_net_trap_1790635751412.jpg';
import sherScene4CuttingNetImg from '../assets/images/sher_cheenti_scene4_cutting_net_1790635765147.jpg';
import pixarMagicalAdventureImg from '../assets/images/pixar_magical_adventure_1790633528032.jpg';
import pixarFoxForestImg from '../assets/images/pixar_fox_rooster_forest_1790633480000.jpg';
import pixarFoxChaseImg from '../assets/images/pixar_fox_rooster_chase_1790633499455.jpg';
import pixarVeggieVillageImg from '../assets/images/pixar_veggie_village_1790633514432.jpg';
import pakistanVillage1Img from '../assets/images/pakistan_village_1791082823985.jpg';
import pakistanPathImg from '../assets/images/pakistan_path_1791082845106.jpg';
import pakistanFieldsImg from '../assets/images/pakistan_fields_1791082861107.jpg';
import pakVillageLifeImg from '../assets/images/pak_village_life_1791082416039.jpg';
import pakistaniVillageImg from '../assets/images/pakistani_village_1791082383382.jpg';

export type StudioModuleId =
  | 'dev_platform'
  | 'video_studio'
  | 'image_studio'
  | 'voice_dubbing'
  | 'music_sfx'
  | 'story_generator'
  | 'game_engine'
  | 'execution_chat';

export interface StudioModuleConfig {
  id: StudioModuleId;
  emoji: string;
  label: string;
  shortLabel: string;
  subtitle: string;
}

export const STUDIO_MODULES: StudioModuleConfig[] = [
  {
    id: 'dev_platform',
    emoji: '💻',
    label: 'Developer Platform',
    shortLabel: 'Dev Platform',
    subtitle: 'Multi-file architect, in-browser runner, log analyzer & Git diff',
  },
  {
    id: 'video_studio',
    emoji: '🎬',
    label: '3D Video Studio',
    shortLabel: '3D Video',
    subtitle: 'Multi-scene Pixar story animator & Lip-sync engine',
  },
  {
    id: 'image_studio',
    emoji: '🖼️',
    label: 'AI Image Generator',
    shortLabel: 'AI Image',
    subtitle: 'Imagen 3 HD canvas & character design',
  },
  {
    id: 'voice_dubbing',
    emoji: '🎙️',
    label: 'Voiceover & Dubbing',
    shortLabel: 'Voiceover',
    subtitle: 'Multi-character voice, accent & lip-sync pipeline',
  },
  {
    id: 'music_sfx',
    emoji: '🎵',
    label: 'AI Music & SFX',
    shortLabel: 'Music & SFX',
    subtitle: 'Background scores & ambient sound generator',
  },
  {
    id: 'story_generator',
    emoji: '📖',
    label: 'Story Generator',
    shortLabel: 'Story Script',
    subtitle: 'Scriptwriting, scene breakdown & prompt builder',
  },
  {
    id: 'game_engine',
    emoji: '🎮',
    label: '3D Conversation & Game Engine',
    shortLabel: '3D Engine',
    subtitle: 'Three.js 3D Character Conversation Studio & WebGL Engine',
  },
  {
    id: 'execution_chat',
    emoji: '💬',
    label: 'Execution Chat',
    shortLabel: 'AI Chat',
    subtitle: 'Unified AI assistant & direct workflow routing',
  },
];

interface DialogueTurn {
  id: string;
  speaker: string;
  voice: 'Fenrir' | 'Kore' | 'Puck' | 'Charon' | 'Zephyr';
  pitch: number;
  englishLine: string;
  urduLine: string;
  romanUrduLine?: string;
  spokenLanguage?: 'urdu' | 'english' | 'roman_urdu' | 'bilingual';
  cameraAngle: string;
  durationSec?: number;
  audioDataUrl?: string;
  audioUrl?: string;
  lipSyncEnvelope?: number[];
  synthError?: string;
}

export interface SavedAudioVaultClip {
  id: string;
  title: string;
  speakerName: string;
  voiceName: 'Fenrir' | 'Kore' | 'Puck' | 'Charon' | 'Zephyr';
  pitch: number;
  language: 'urdu' | 'english' | 'roman_urdu' | 'bilingual';
  dialogueText: string;
  dialogueUrdu?: string;
  dialogueRomanUrdu?: string;
  durationSec: number;
  lipSyncEnvelope: number[];
  modelUsed: string;
  audioUrl: string;
  createdAt: string;
}

interface StorySceneDraft {
  sceneNumber: number;
  headline: string;
  cameraAngle: string;
  speaker: string;
  voice: 'Fenrir' | 'Kore' | 'Puck' | 'Charon' | 'Zephyr';
  dialogueEnglish: string;
  dialogueUrdu: string;
  visualPrompt3D: string;
  sfxMood: string;
}

export type StudioAspectRatio = '1:1' | '9:16' | '16:9' | '4:3' | '3:4';
export type StudioImageQuality = '512px' | '1K' | '2K' | '4K';

export interface StudioGeneratedImage {
  id: string;
  ownerUid: string;
  projectId: number | null;
  projectTitle?: string;
  title: string;
  prompt: string;
  negativePrompt?: string;
  stylePreset: string;
  aspectRatio: StudioAspectRatio;
  quality: StudioImageQuality;
  modelUsed: string;
  url: string;
  sourceType: 'gemini_image' | 'imagen3' | 'studio_hd_render';
  parentImageId?: string;
  editInstruction?: string;
  isFavorite?: boolean;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface StudioProjectOption {
  id: number;
  title: string;
}

const ASPECT_RATIO_CONFIG: Array<{
  ratio: StudioAspectRatio;
  label: string;
  desc: string;
  baseWidth: number;
  baseHeight: number;
}> = [
  { ratio: '1:1', label: '1:1', desc: 'Square', baseWidth: 1080, baseHeight: 1080 },
  { ratio: '9:16', label: '9:16', desc: 'Vertical', baseWidth: 1080, baseHeight: 1920 },
  { ratio: '16:9', label: '16:9', desc: 'Widescreen', baseWidth: 1920, baseHeight: 1080 },
  { ratio: '4:3', label: '4:3', desc: 'Landscape', baseWidth: 1440, baseHeight: 1080 },
  { ratio: '3:4', label: '3:4', desc: 'Portrait', baseWidth: 1080, baseHeight: 1440 },
];

const QUALITY_CONFIG: Array<{
  quality: StudioImageQuality;
  label: string;
  badge: string;
  scale: number;
}> = [
  { quality: '512px', label: '512px', badge: 'Fast Draft', scale: 0.5 },
  { quality: '1K', label: '1K HD', badge: 'Standard HD', scale: 1 },
  { quality: '2K', label: '2K QHD', badge: 'Ultra Detail', scale: 1.5 },
  { quality: '4K', label: '4K Master', badge: 'Cinema 4K', scale: 2 },
];

export function ImageGeneratorWorkspace({
  onNotice,
  onSendToChat,
  currentUser = null,
  projects = [],
  activeProjectId = null,
  onSelectProject,
}: {
  onNotice: (msg: string) => void;
  onSendToChat: (prompt: string, imageUrl?: string) => void;
  currentUser?: AppUserSession | null;
  projects?: StudioProjectOption[];
  activeProjectId?: number | null;
  onSelectProject?: (projectId: number) => void;
}) {
  const userKey = currentUser?.uid || 'guest_default';
  const localStorageKey = `saz_ai_image_studio_v2_${userKey}`;

  const [studioMode, setStudioMode] = useState<'generate' | 'edit'>('generate');
  const [imageTitle, setImageTitle] = useState('');
  const [prompt, setPrompt] = useState(
    'Disney Pixar 3D CGI vertical 9:16 character portrait: majestic golden-maned lion Sher and tiny expressive ant Cheenti on a glowing emerald jungle leaf, volumetric sunbeams, 8k render',
  );
  const [negativePrompt, setNegativePrompt] = useState(
    'blurry, low resolution, watermark, distorted anatomy, cropped frame',
  );
  const [editInstruction, setEditInstruction] = useState(
    'Add warm golden hour volumetric sunbeams and glowing magical fireflies around the character',
  );
  const [uploadedEditSourceUrl, setUploadedEditSourceUrl] = useState<string | null>(null);
  const [uploadedEditSourceName, setUploadedEditSourceName] = useState<string>('');
  const [stylePreset, setStylePreset] = useState('Disney/Pixar 3D CGI');
  const [aspectRatio, setAspectRatio] = useState<StudioAspectRatio>('9:16');
  const [quality, setQuality] = useState<StudioImageQuality>('1K');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
    activeProjectId ?? projects[0]?.id ?? 1,
  );

  // Non-destructive studio color adjustments
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [exportFormat, setExportFormat] = useState<'png' | 'jpeg' | 'webp'>('png');

  const [isGenerating, setIsGenerating] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [lastFailedAction, setLastFailedAction] = useState<'generate' | 'edit' | null>(null);

  const [imageHistory, setImageHistory] = useState<StudioGeneratedImage[]>([]);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'project' | 'favorites' | 'edited'>('all');
  const [historySearch, setHistorySearch] = useState('');

  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const [activeImage, setActiveImage] = useState<StudioGeneratedImage>({
    id: `starter-pakistan-village-${Date.now()}`,
    ownerUid: userKey,
    projectId: activeProjectId ?? 1,
    projectTitle: projects.find((p) => p.id === activeProjectId)?.title || 'SAZ AI Studio Suite',
    title: 'Rural Pakistani Village · 9:16 Cinematic Visual',
    prompt:
      'Cinematic vertical 9:16 view of a beautiful rural Pakistani village. Traditional mud-brick houses with textured earthen walls, lush green fields, dusty village path, natural daylight.',
    stylePreset: 'Cinematic 3D',
    aspectRatio: '9:16',
    quality: '1K',
    modelUsed: 'gemini-3.8-flash',
    url: pakistanVillage1Img,
    sourceType: 'gemini_image',
    isFavorite: true,
    tags: ['Cinematic 3D', '9:16', '1K'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  useEffect(() => {
    if (activeProjectId && activeProjectId !== selectedProjectId) {
      setSelectedProjectId(activeProjectId);
    }
  }, [activeProjectId]);

  const presetGallery: Array<{
    title: string;
    url: string;
    prompt: string;
    aspectRatio: StudioAspectRatio;
    stylePreset: string;
  }> = [
    {
      title: 'Rural Pakistani Village · 9:16',
      url: pakistanVillage1Img,
      prompt:
        'Cinematic vertical 9:16 view of a beautiful rural Pakistani village. Traditional mud-brick houses, lush green fields, trees, and natural daylight.',
      aspectRatio: '9:16',
      stylePreset: 'Cinematic 3D',
    },
    {
      title: 'Village Path & Earthen Houses · 9:16',
      url: pakistanPathImg,
      prompt:
        'Cinematic 9:16 vertical shot of a village path between mud-brick houses in rural Pakistan, bright natural morning sunlight.',
      aspectRatio: '9:16',
      stylePreset: 'Cinematic 3D',
    },
    {
      title: 'Lush Agricultural Fields · 9:16',
      url: pakistanFieldsImg,
      prompt:
        'Cinematic vertical 9:16 portrait of golden and green agricultural fields in rural Pakistan, mud-brick farmhouse in background, clear open sky.',
      aspectRatio: '9:16',
      stylePreset: 'Cinematic 3D',
    },
    {
      title: 'Rooster Bell Twist · Action 3D',
      url: pixarFoxChaseImg,
      prompt:
        'Disney Pixar 3D CGI vertical 9:16 action shot: clever rooster ringing the forest alarm bell as the fox dashes away.',
      aspectRatio: '9:16',
      stylePreset: 'Disney/Pixar 3D CGI',
    },
    {
      title: 'Vegetable Village · Pixar 3D World',
      url: pixarVeggieVillageImg,
      prompt:
        'Disney Pixar 3D CGI vertical 9:16: cheerful animated tomato and carrot characters in a sunlit vegetable village.',
      aspectRatio: '9:16',
      stylePreset: 'Disney/Pixar 3D CGI',
    },
    {
      title: 'Magical Forest Finale · 3D Render',
      url: pixarMagicalAdventureImg,
      prompt:
        'Disney Pixar 3D CGI vertical 9:16 finale: enchanted glowing fireflies over a sunlit emerald jungle rock.',
      aspectRatio: '9:16',
      stylePreset: 'Disney/Pixar 3D CGI',
    },
  ];

  // Load isolated per-user image history from backend + localStorage fallback
  useEffect(() => {
    let cancelled = false;
    async function loadUserImages() {
      try {
        const rawLocal = localStorage.getItem(localStorageKey);
        if (rawLocal) {
          const parsedLocal = JSON.parse(rawLocal) as StudioGeneratedImage[];
          if (Array.isArray(parsedLocal) && parsedLocal.length > 0 && !cancelled) {
            setImageHistory(parsedLocal);
            setActiveImage(parsedLocal[0]);
          }
        }
      } catch {
        // ignore localStorage parse error
      }

      try {
        const headers = await buildUserAuthHeaders(currentUser);
        const res = await fetch('/api/image-studio/images', { headers });
        if (!res.ok) return;
        const serverImages = (await res.json()) as StudioGeneratedImage[];
        if (!cancelled && Array.isArray(serverImages) && serverImages.length > 0) {
          setImageHistory(serverImages);
          setActiveImage(serverImages[0]);
          try {
            localStorage.setItem(localStorageKey, JSON.stringify(serverImages.slice(0, 40)));
          } catch {
            // ignore storage quota
          }
        }
      } catch {
        // fallback to local history
      }
    }
    void loadUserImages();
    return () => {
      cancelled = true;
    };
  }, [userKey, localStorageKey]);

  const persistHistoryList = (nextList: StudioGeneratedImage[]) => {
    setImageHistory(nextList);
    try {
      localStorage.setItem(localStorageKey, JSON.stringify(nextList.slice(0, 40)));
    } catch {
      // ignore storage quota
    }
  };

  const syncImageArtifactToCloud = (record: StudioGeneratedImage) => {
    if (!currentUser?.uid) return;
    void saveUserArtifactToFirestore(currentUser.uid, {
      id: record.id,
      kind: 'image',
      title: record.title,
      description: `[Project #${record.projectId ?? 1} · ${record.aspectRatio} · ${record.quality} · ${record.stylePreset}] ${record.prompt}`,
      createdAt: record.createdAt,
    }).catch(() => {});
  };

  const handleUploadReferenceImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorBanner('Unsupported file type. Please upload a PNG, JPG, WEBP, or GIF image.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setErrorBanner('Image file exceeds the 8MB studio limit. Please choose a smaller image.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setUploadedEditSourceUrl(reader.result);
        setUploadedEditSourceName(file.name);
        setStudioMode('edit');
        setErrorBanner(null);
        onNotice(`Loaded "${file.name}" for AI Image Editing`);
      }
    };
    reader.onerror = () => {
      setErrorBanner('Failed to read image file. Please try another file.');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleGenerateImage = async () => {
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt) {
      setErrorBanner('Please enter a prompt describing the image you want to generate.');
      return;
    }
    if (isGenerating) return;

    setIsGenerating(true);
    setErrorBanner(null);
    setLastFailedAction(null);
    onNotice(`Generating ${quality} (${aspectRatio}) image in SAZ AI Image Studio...`);

    const resolvedProject =
      projects.find((p) => p.id === selectedProjectId) || projects[0] || { id: 1, title: 'SAZ AI Studio Suite' };

    try {
      const headers = await buildUserAuthHeaders(currentUser, {
        'Content-Type': 'application/json',
      });
      const res = await fetch('/api/image-studio/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: imageTitle.trim() || undefined,
          prompt: cleanPrompt,
          negativePrompt: negativePrompt.trim() || undefined,
          stylePreset,
          aspectRatio,
          quality,
          projectId: resolvedProject.id,
        }),
      });

      const data = (await res.json()) as {
        image?: StudioGeneratedImage;
        error?: string;
      };

      if (!res.ok || !data.image) {
        throw new Error(data.error || `Image generation failed (${res.status}).`);
      }

      const created: StudioGeneratedImage = {
        ...data.image,
        projectId: data.image.projectId ?? resolvedProject.id,
        projectTitle: data.image.projectTitle || resolvedProject.title,
      };

      setActiveImage(created);
      setAspectRatio(created.aspectRatio);
      setQuality(created.quality);
      const updatedList = [created, ...imageHistory.filter((i) => i.id !== created.id)].slice(0, 60);
      persistHistoryList(updatedList);
      syncImageArtifactToCloud(created);
      onNotice(`Generated "${created.title}" (${created.aspectRatio} · ${created.quality})`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Image generation encountered an error.';
      setErrorBanner(msg);
      setLastFailedAction('generate');
      onNotice('Image generation failed — see studio error banner to retry');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEditImage = async (customInstruction?: string) => {
    const cleanInstr = (customInstruction ?? editInstruction).trim();
    if (!cleanInstr) {
      setErrorBanner('Please enter an editing instruction describing how to modify the image.');
      return;
    }
    if (isGenerating) return;

    setIsGenerating(true);
    setErrorBanner(null);
    setLastFailedAction(null);
    onNotice(`Applying AI Image Edit (${aspectRatio} · ${quality})...`);

    const resolvedProject =
      projects.find((p) => p.id === selectedProjectId) || projects[0] || { id: 1, title: 'SAZ AI Studio Suite' };
    const sourceUrl = uploadedEditSourceUrl || activeImage.url;

    try {
      const headers = await buildUserAuthHeaders(currentUser, {
        'Content-Type': 'application/json',
      });
      const res = await fetch('/api/image-studio/edit', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sourceImageId: uploadedEditSourceUrl ? undefined : activeImage.id,
          sourceImageDataUrl: sourceUrl,
          instruction: cleanInstr,
          prompt: activeImage.prompt || prompt,
          stylePreset,
          aspectRatio,
          quality,
          projectId: resolvedProject.id,
        }),
      });

      const data = (await res.json()) as {
        image?: StudioGeneratedImage;
        error?: string;
      };

      if (!res.ok || !data.image) {
        throw new Error(data.error || `Image editing failed (${res.status}).`);
      }

      const editedRecord: StudioGeneratedImage = {
        ...data.image,
        projectId: data.image.projectId ?? resolvedProject.id,
        projectTitle: data.image.projectTitle || resolvedProject.title,
      };

      setActiveImage(editedRecord);
      const updatedList = [editedRecord, ...imageHistory.filter((i) => i.id !== editedRecord.id)].slice(0, 60);
      persistHistoryList(updatedList);
      syncImageArtifactToCloud(editedRecord);
      onNotice(`Edited image saved: "${editedRecord.title}"`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Image editing encountered an error.';
      setErrorBanner(msg);
      setLastFailedAction('edit');
      onNotice('Image edit failed — see studio error banner');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleFavorite = async (target: StudioGeneratedImage) => {
    const nextFav = !target.isFavorite;
    const optimistic: StudioGeneratedImage = { ...target, isFavorite: nextFav };
    const nextList = imageHistory.map((item) => (item.id === target.id ? optimistic : item));
    persistHistoryList(nextList);
    if (activeImage.id === target.id) {
      setActiveImage(optimistic);
    }

    try {
      const headers = await buildUserAuthHeaders(currentUser, {
        'Content-Type': 'application/json',
      });
      await fetch(`/api/image-studio/images/${encodeURIComponent(target.id)}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ isFavorite: nextFav }),
      });
    } catch {
      // local state already updated
    }
  };

  const handleAssignImageProject = async (target: StudioGeneratedImage, nextProjectId: number) => {
    const projObj = projects.find((p) => p.id === nextProjectId);
    const optimistic: StudioGeneratedImage = {
      ...target,
      projectId: nextProjectId,
      projectTitle: projObj?.title || `Project #${nextProjectId}`,
    };
    const nextList = imageHistory.map((item) => (item.id === target.id ? optimistic : item));
    persistHistoryList(nextList);
    if (activeImage.id === target.id) {
      setActiveImage(optimistic);
    }
    onNotice(`Assigned "${target.title}" to ${optimistic.projectTitle}`);

    try {
      const headers = await buildUserAuthHeaders(currentUser, {
        'Content-Type': 'application/json',
      });
      await fetch(`/api/image-studio/images/${encodeURIComponent(target.id)}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ projectId: nextProjectId }),
      });
    } catch {
      // local state already updated
    }
  };

  const handleDeleteImage = async (target: StudioGeneratedImage) => {
    const remaining = imageHistory.filter((item) => item.id !== target.id);
    persistHistoryList(remaining);
    if (activeImage.id === target.id && remaining.length > 0) {
      setActiveImage(remaining[0]);
    }
    onNotice(`Removed "${target.title}" from Image Studio history`);

    try {
      const headers = await buildUserAuthHeaders(currentUser);
      await fetch(`/api/image-studio/images/${encodeURIComponent(target.id)}`, {
        method: 'DELETE',
        headers,
      });
    } catch {
      // ignore network error
    }
  };

  const downloadFormattedImage = (targetImage: StudioGeneratedImage = activeImage) => {
    const ratioSpec =
      ASPECT_RATIO_CONFIG.find((r) => r.ratio === targetImage.aspectRatio) || ASPECT_RATIO_CONFIG[0];
    const qualitySpec =
      QUALITY_CONFIG.find((q) => q.quality === targetImage.quality) || QUALITY_CONFIG[1];

    const exportWidth = Math.round(ratioSpec.baseWidth * qualitySpec.scale);
    const exportHeight = Math.round(ratioSpec.baseHeight * qualitySpec.scale);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = exportWidth;
      canvas.height = exportHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
        if (exportFormat === 'jpeg') {
          ctx.fillStyle = '#0F172A';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const mimeType =
          exportFormat === 'jpeg'
            ? 'image/jpeg'
            : exportFormat === 'webp'
              ? 'image/webp'
              : 'image/png';
        const ext = exportFormat === 'jpeg' ? 'jpg' : exportFormat;
        const safeSlug =
          targetImage.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 36) || 'saz-ai-image';

        const a = document.createElement('a');
        a.href = canvas.toDataURL(mimeType, 0.94);
        a.download = `${safeSlug}-${targetImage.aspectRatio.replace(':', 'x')}-${targetImage.quality}.${ext}`;
        a.click();
        onNotice(
          `Downloaded ${targetImage.quality} ${ext.toUpperCase()} (${exportWidth}×${exportHeight}px)`,
        );
      }
    };
    img.onerror = () => {
      setErrorBanner('Unable to export image canvas. Try regenerating or choosing PNG format.');
    };
    img.src = targetImage.url;
  };

  const exportImageMetadataJson = (targetImage: StudioGeneratedImage = activeImage) => {
    const payload = {
      studio: 'SAZ AI Image Studio',
      exportedAt: new Date().toISOString(),
      ownerUid: currentUser?.uid || 'guest_default',
      project: {
        id: targetImage.projectId,
        title:
          targetImage.projectTitle ||
          projects.find((p) => p.id === targetImage.projectId)?.title ||
          'SAZ AI Studio Suite',
      },
      image: targetImage,
      adjustments: { brightness, contrast, saturation },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${targetImage.id}-metadata.json`;
    a.click();
    URL.revokeObjectURL(url);
    onNotice('Exported Image Studio JSON metadata');
  };

  const filteredHistory = imageHistory.filter((item) => {
    if (historyFilter === 'project' && selectedProjectId && item.projectId !== selectedProjectId) {
      return false;
    }
    if (historyFilter === 'favorites' && !item.isFavorite) {
      return false;
    }
    if (historyFilter === 'edited' && !item.editInstruction) {
      return false;
    }
    if (historySearch.trim()) {
      const q = historySearch.toLowerCase().trim();
      const hay = `${item.title} ${item.prompt} ${item.stylePreset} ${item.editInstruction || ''} ${item.projectTitle || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const canvasAspectClass =
    activeImage.aspectRatio === '9:16'
      ? 'aspect-[9/16] max-h-[490px] w-auto'
      : activeImage.aspectRatio === '16:9'
        ? 'aspect-video w-full'
        : activeImage.aspectRatio === '4:3'
          ? 'aspect-[4/3] w-full max-h-[430px]'
          : activeImage.aspectRatio === '3:4'
            ? 'aspect-[3/4] max-h-[470px] w-auto'
            : 'aspect-square max-h-[430px] w-auto';

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      {/* Error Handling Banner */}
      {errorBanner && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-700 dark:text-rose-200">
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={16} className="shrink-0 text-rose-500" />
            <div>
              <span className="font-extrabold">Image Studio Alert: </span>
              <span>{errorBanner}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {lastFailedAction && (
              <button
                type="button"
                onClick={() =>
                  void (lastFailedAction === 'edit' ? handleEditImage() : handleGenerateImage())
                }
                className="flex items-center gap-1 rounded-lg bg-rose-500 px-3 py-1.5 font-bold text-white transition hover:bg-rose-400"
              >
                <RefreshCw size={12} />
                <span>Retry</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setErrorBanner(null)}
              className="rounded-lg border border-rose-500/30 px-2.5 py-1 font-semibold hover:bg-rose-500/10"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Studio Controls */}
        <div className="space-y-4 lg:col-span-7">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            {/* Header & Mode Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div>
                <h2 className="font-serif-display text-xl font-bold text-slate-900 dark:text-white">
                  SAZ AI Image Studio
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Prompt-to-Image, AI Image Editing, Multi-Aspect Ratio &amp; 4K Project Gallery
                </p>
              </div>

              <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setStudioMode('generate')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    studioMode === 'generate'
                      ? 'bg-amber-400 text-slate-950 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
                  }`}
                >
                  <Sparkles size={13} />
                  <span>Prompt to Image</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStudioMode('edit')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    studioMode === 'edit'
                      ? 'bg-amber-400 text-slate-950 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
                  }`}
                >
                  <Wand2 size={13} />
                  <span>Edit Image</span>
                </button>
              </div>
            </div>

            {/* Project Organization & Title Row */}
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <FolderKanban size={13} className="text-amber-500" />
                  <span>Project Organization</span>
                </label>
                <select
                  value={selectedProjectId ?? ''}
                  onChange={(e) => {
                    const nextId = Number(e.target.value) || null;
                    setSelectedProjectId(nextId);
                    if (nextId && onSelectProject) {
                      onSelectProject(nextId);
                    }
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-amber-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {projects.length > 0 ? (
                    projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        📁 {p.title}
                      </option>
                    ))
                  ) : (
                    <option value={1}>📁 SAZ AI Studio Suite</option>
                  )}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Asset Title (Optional)
                </label>
                <input
                  type="text"
                  value={imageTitle}
                  onChange={(e) => setImageTitle(e.target.value)}
                  placeholder="e.g. Hero Banner / Character Concept..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-amber-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            {studioMode === 'generate' ? (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Image Generation Prompt
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {[
                      'Volumetric golden hour lighting',
                      '8K photorealistic macro lens',
                      'Subsurface scattering 3D',
                    ].map((chip) => (
                      <button
                        type="button"
                        key={chip}
                        onClick={() =>
                          setPrompt((prev) =>
                            prev.toLowerCase().includes(chip.toLowerCase())
                              ? prev
                              : `${prev.trim().replace(/,\s*$/, '')}, ${chip}`,
                          )
                        }
                        className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600 transition hover:border-amber-400 hover:text-amber-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      >
                        + {chip}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  rows={3}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe your subject, environment, lighting, composition, and artistic style..."
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-sm text-slate-900 outline-none focus:border-amber-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />

                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    Negative Prompt (Elements to Exclude)
                  </label>
                  <input
                    type="text"
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    placeholder="blurry, low quality, watermark, deformed hands, extra limbs..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-amber-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-3 rounded-xl border border-amber-400/40 bg-amber-500/5 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                      AI Image Editor · Source: {uploadedEditSourceName || activeImage.title}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Modify the active canvas image or upload a reference image to transform with Gemini Image
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      ref={uploadInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleUploadReferenceImage}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => uploadInputRef.current?.click()}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-800 transition hover:border-amber-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    >
                      <Upload size={12} />
                      <span>Upload Image</span>
                    </button>
                    {uploadedEditSourceUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setUploadedEditSourceUrl(null);
                          setUploadedEditSourceName('');
                          onNotice('Reverted edit source to active canvas image');
                        }}
                        className="rounded-lg border border-slate-300 px-2 py-1.5 text-[11px] font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300"
                      >
                        Use Canvas
                      </button>
                    )}
                  </div>
                </div>

                <textarea
                  rows={2}
                  value={editInstruction}
                  onChange={(e) => setEditInstruction(e.target.value)}
                  placeholder="Describe how to edit this image (e.g., 'Add golden sunset rays, change outfit to futuristic armor, enhance 4K detail')..."
                  className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 outline-none focus:border-amber-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />

                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Add golden hour volumetric sunbeams & fireflies',
                    'Transform into Cyberpunk Neon night aesthetic',
                    'Enhance 4K macro fur & subsurface lighting',
                    'Change background to enchanted crystal cavern',
                  ].map((presetEdit) => (
                    <button
                      type="button"
                      key={presetEdit}
                      onClick={() => {
                        setEditInstruction(presetEdit);
                        void handleEditImage(presetEdit);
                      }}
                      disabled={isGenerating}
                      className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-700 transition hover:bg-amber-500/20 disabled:opacity-50 dark:text-amber-300"
                    >
                      ✨ {presetEdit}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Style Preset, Aspect Ratio & Quality Selector */}
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Visual Style Preset
                  </label>
                  <select
                    value={stylePreset}
                    onChange={(e) => setStylePreset(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="Disney/Pixar 3D CGI">Disney / Pixar 3D CGI</option>
                    <option value="Photorealistic Studio 8K">Photorealistic Studio 8K</option>
                    <option value="Unreal Engine 5 Cinematic 3D">Unreal Engine 5 Cinematic 3D</option>
                    <option value="Cyberpunk Neon Concept">Cyberpunk Neon Concept Art</option>
                    <option value="DreamWorks Feature Animation 3D">DreamWorks Feature 3D</option>
                    <option value="Digital Watercolor & Ink">Digital Watercolor &amp; Ink</option>
                    <option value="Minimalist Vector Illustration">Minimalist Vector Illustration</option>
                    <option value="Stylized Claymation 3D">Stylized Stop-Motion 3D</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Quality &amp; Resolution Tier
                  </label>
                  <div className="grid grid-cols-4 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                    {QUALITY_CONFIG.map((q) => (
                      <button
                        type="button"
                        key={q.quality}
                        onClick={() => setQuality(q.quality)}
                        title={q.badge}
                        className={`rounded-lg py-1.5 text-[11px] font-bold transition ${
                          quality === q.quality
                            ? 'bg-amber-400 text-slate-950 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
                        }`}
                      >
                        {q.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 5 Aspect Ratios */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Canvas Aspect Ratio
                </label>
                <div className="grid grid-cols-5 gap-1.5 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                  {ASPECT_RATIO_CONFIG.map((item) => (
                    <button
                      type="button"
                      key={item.ratio}
                      onClick={() => setAspectRatio(item.ratio)}
                      className={`flex flex-col items-center rounded-lg py-1.5 text-xs font-bold transition ${
                        aspectRatio === item.ratio
                          ? 'bg-amber-400 text-slate-950 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
                      }`}
                    >
                      <span>{item.label}</span>
                      <span className="text-[9px] font-medium opacity-75">{item.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 pt-2">
                {studioMode === 'generate' ? (
                  <button
                    type="button"
                    disabled={isGenerating}
                    onClick={() => void handleGenerateImage()}
                    className="flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-extrabold text-slate-950 shadow-xs transition hover:bg-amber-300 disabled:opacity-50"
                  >
                    <Sparkles size={14} />
                    <span>
                      {isGenerating
                        ? `Generating ${quality} (${aspectRatio})...`
                        : `Generate ${quality} Image (${aspectRatio})`}
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isGenerating}
                    onClick={() => void handleEditImage()}
                    className="flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-extrabold text-slate-950 shadow-xs transition hover:bg-amber-300 disabled:opacity-50"
                  >
                    <Wand2 size={14} />
                    <span>
                      {isGenerating ? 'Applying AI Image Edit...' : 'Apply AI Edit to Image'}
                    </span>
                  </button>
                )}

                <div className="flex items-center rounded-xl border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-800">
                  <select
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value as 'png' | 'jpeg' | 'webp')}
                    className="rounded-l-lg bg-transparent px-2 py-2 text-xs font-bold text-slate-700 outline-none dark:text-slate-200"
                    aria-label="Export image format"
                  >
                    <option value="png">PNG</option>
                    <option value="jpeg">JPG</option>
                    <option value="webp">WEBP</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => downloadFormattedImage(activeImage)}
                    className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-800 dark:bg-slate-700"
                  >
                    <Download size={13} />
                    <span>Export</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => exportImageMetadataJson(activeImage)}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  title="Export JSON metadata and prompt settings"
                >
                  <FileJson size={14} />
                  <span>JSON</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onSendToChat(
                      `Create a 5-scene 9:16 3D animated video story based on this character design: ${activeImage.prompt}`,
                      activeImage.url,
                    )
                  }
                  className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2.5 text-xs font-bold text-amber-400 transition hover:bg-slate-800 dark:bg-slate-800"
                >
                  <Film size={14} />
                  <span>Animate in 3D Video Studio</span>
                </button>
              </div>
            </div>
          </div>

          {/* Preset 3D Character & Scene Library */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                3D Character &amp; Scene Presets (Click to Load or Edit)
              </h3>
              <span className="text-[11px] font-semibold text-slate-500">
                Verified Studio Templates
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {presetGallery.map((item) => (
                <button
                  type="button"
                  key={item.title}
                  onClick={() => {
                    setPrompt(item.prompt);
                    setAspectRatio(item.aspectRatio);
                    setStylePreset(item.stylePreset);
                    const loaded: StudioGeneratedImage = {
                      id: `preset-${item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
                      ownerUid: userKey,
                      projectId: selectedProjectId ?? 1,
                      projectTitle:
                        projects.find((p) => p.id === selectedProjectId)?.title ||
                        'SAZ AI Studio Suite',
                      title: item.title,
                      prompt: item.prompt,
                      stylePreset: item.stylePreset,
                      aspectRatio: item.aspectRatio,
                      quality,
                      modelUsed: 'imagen-3-verified',
                      url: item.url,
                      sourceType: 'imagen3',
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    };
                    setActiveImage(loaded);
                    onNotice(`Loaded "${item.title}" into Canvas`);
                  }}
                  className="group overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-left transition hover:border-amber-400 dark:border-slate-800 dark:bg-slate-800/60"
                >
                  <div className="aspect-[9/12] w-full overflow-hidden bg-slate-950">
                    <img
                      src={item.url}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-2">
                    <div className="truncate text-xs font-bold text-slate-900 dark:text-white">
                      {item.title}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Live Canvas Preview & Non-Destructive Color Grading */}
        <div className="space-y-4 lg:col-span-5">
          <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex w-full flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-xs font-bold text-slate-900 dark:text-white">
                  {activeImage.title}
                </div>
                <div className="text-[10px] font-semibold text-slate-500">
                  📁 {activeImage.projectTitle || 'SAZ AI Studio Suite'} · {activeImage.stylePreset}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="rounded-md bg-amber-400/20 px-2 py-0.5 text-[10px] font-extrabold text-amber-600 dark:text-amber-400">
                  {activeImage.aspectRatio}
                </span>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {activeImage.quality}
                </span>
              </div>
            </div>

            <div
              className={`relative overflow-hidden rounded-2xl border-2 border-amber-400/60 bg-slate-950 shadow-xl ${canvasAspectClass}`}
            >
              <img
                src={uploadedEditSourceUrl && studioMode === 'edit' ? uploadedEditSourceUrl : activeImage.url}
                alt={activeImage.title}
                referrerPolicy="no-referrer"
                style={{
                  filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`,
                }}
                className="h-full w-full object-cover transition-all duration-200"
              />
              {activeImage.editInstruction && (
                <span className="absolute top-2.5 left-2.5 rounded-lg bg-slate-950/85 px-2.5 py-1 text-[10px] font-bold text-amber-400 backdrop-blur-xs">
                  ✨ Edited: {activeImage.editInstruction.slice(0, 42)}
                </span>
              )}
            </div>

            <p className="mt-3 line-clamp-2 text-center text-xs text-slate-600 dark:text-slate-400">
              {activeImage.prompt}
            </p>

            {/* Studio Color & Finishing Adjustments */}
            <div className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  <Sliders size={12} className="text-amber-500" />
                  <span>Canvas Color Grading (Baked into Export)</span>
                </span>
                {(brightness !== 100 || contrast !== 100 || saturation !== 100) && (
                  <button
                    type="button"
                    onClick={() => {
                      setBrightness(100);
                      setContrast(100);
                      setSaturation(100);
                    }}
                    className="text-[10px] font-bold text-amber-500 hover:underline"
                  >
                    Reset
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 text-[10px]">
                <div>
                  <div className="mb-0.5 flex justify-between font-semibold text-slate-500">
                    <span>Brightness</span>
                    <span>{brightness}%</span>
                  </div>
                  <input
                    type="range"
                    min={60}
                    max={140}
                    value={brightness}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                    className="w-full accent-amber-400"
                  />
                </div>
                <div>
                  <div className="mb-0.5 flex justify-between font-semibold text-slate-500">
                    <span>Contrast</span>
                    <span>{contrast}%</span>
                  </div>
                  <input
                    type="range"
                    min={60}
                    max={140}
                    value={contrast}
                    onChange={(e) => setContrast(Number(e.target.value))}
                    className="w-full accent-amber-400"
                  />
                </div>
                <div>
                  <div className="mb-0.5 flex justify-between font-semibold text-slate-500">
                    <span>Saturation</span>
                    <span>{saturation}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={160}
                    value={saturation}
                    onChange={(e) => setSaturation(Number(e.target.value))}
                    className="w-full accent-amber-400"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Per-User & Per-Project Persistent Image History Gallery */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <History size={16} className="text-amber-500" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Image History &amp; Project Media Vault ({filteredHistory.length})
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Isolated to {currentUser?.displayName || 'your workspace'} · Organized by project, aspect ratio &amp; quality
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 text-[11px] font-bold dark:bg-slate-800">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'project', label: 'Active Project' },
                  { id: 'favorites', label: '★ Favorites' },
                  { id: 'edited', label: '✨ Edited' },
                ] as const
              ).map((tab) => (
                <button
                  type="button"
                  key={tab.id}
                  onClick={() => setHistoryFilter(tab.id)}
                  className={`rounded-lg px-2.5 py-1 transition ${
                    historyFilter === tab.id
                      ? 'bg-amber-400 text-slate-950'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              placeholder="Search prompt, style, project..."
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-amber-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            No generated or edited images match this filter yet. Generate an image above to save it to your project history.
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filteredHistory.map((item) => (
              <div
                key={item.id}
                className={`group flex flex-col justify-between overflow-hidden rounded-xl border transition ${
                  activeImage.id === item.id
                    ? 'border-amber-400 bg-amber-500/5 ring-1 ring-amber-400/40'
                    : 'border-slate-200 bg-slate-50 hover:border-amber-400/60 dark:border-slate-800 dark:bg-slate-800/50'
                }`}
              >
                <div>
                  <div className="relative aspect-square w-full overflow-hidden bg-slate-950">
                    <img
                      src={item.url}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      onClick={() => {
                        setActiveImage(item);
                        setPrompt(item.prompt);
                        setAspectRatio(item.aspectRatio);
                        setQuality(item.quality);
                        setStylePreset(item.stylePreset);
                        onNotice(`Loaded "${item.title}" in canvas`);
                      }}
                      className="h-full w-full cursor-pointer object-cover transition duration-300 group-hover:scale-105"
                    />
                    <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                      <span className="rounded-md bg-slate-950/80 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">
                        {item.aspectRatio}
                      </span>
                      <span className="rounded-md bg-slate-950/80 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {item.quality}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleToggleFavorite(item)}
                      className={`absolute top-2 right-2 rounded-lg p-1.5 backdrop-blur-xs transition ${
                        item.isFavorite
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-slate-950/70 text-slate-300 hover:text-amber-400'
                      }`}
                      title={item.isFavorite ? 'Remove from favorites' : 'Save to favorites'}
                    >
                      <Star size={12} fill={item.isFavorite ? 'currentColor' : 'none'} />
                    </button>
                  </div>

                  <div className="p-3">
                    <div className="truncate text-xs font-bold text-slate-900 dark:text-white">
                      {item.title}
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500 dark:text-slate-400">
                      {item.prompt}
                    </p>

                    {projects.length > 0 && (
                      <div className="mt-2">
                        <select
                          value={item.projectId ?? 1}
                          onChange={(e) =>
                            void handleAssignImageProject(item, Number(e.target.value) || 1)
                          }
                          className="w-full truncate rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                        >
                          {projects.map((p) => (
                            <option key={p.id} value={p.id}>
                              📁 {p.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-1 border-t border-slate-200/80 px-3 py-2 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveImage(item);
                      setUploadedEditSourceUrl(null);
                      setUploadedEditSourceName('');
                      setStudioMode('edit');
                      onNotice(`Ready to edit "${item.title}"`);
                    }}
                    className="flex items-center gap-1 rounded-lg bg-amber-400/15 px-2 py-1 text-[10px] font-bold text-amber-600 transition hover:bg-amber-400/25 dark:text-amber-400"
                  >
                    <Wand2 size={11} />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => downloadFormattedImage(item)}
                    className="flex items-center gap-1 rounded-lg bg-slate-200/70 px-2 py-1 text-[10px] font-bold text-slate-700 transition hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <Download size={11} />
                    <span>Save</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleDeleteImage(item)}
                    className="rounded-lg p-1 text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-500"
                    title="Delete from history"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function VoiceoverDubbingWorkspace({
  onNotice,
  onSendToVideoStudio,
  onSyncAudioScenesToVideoStudio,
  currentUser,
  activeProjectId,
}: {
  onNotice: (msg: string) => void;
  onSendToVideoStudio: (
    prompt: string,
    syncedPayload?: {
      title: string;
      masterAudioUrl?: string;
      scenes: VideoStudioSceneItem[];
    },
  ) => void;
  onSyncAudioScenesToVideoStudio?: (payload: {
    promptText: string;
    title: string;
    masterAudioUrl?: string;
    scenes: VideoStudioSceneItem[];
  }) => void;
  currentUser?: AppUserSession | null;
  activeProjectId?: number;
}) {
  const [storyTitle, setStoryTitle] = useState('Sher aur Cheenti · Multilingual Urdu & English Dialogue');
  const [globalVoiceLanguage, setGlobalVoiceLanguage] = useState<
    'urdu' | 'english' | 'roman_urdu' | 'bilingual'
  >('urdu');
  const [turns, setTurns] = useState<DialogueTurn[]>([
    {
      id: 't1',
      speaker: 'Sher (The Lion)',
      voice: 'Fenrir',
      pitch: 0.78,
      englishLine: 'Who dares wake the King of the Jungle? Speak up, tiny creature!',
      urduLine: 'جنگل کے بادشاہ کو کس نے جگایا؟ بولو ننھی چونٹی!',
      romanUrduLine: 'Jungle ke badshah ko kis ne jagaya? Bolo nanhi cheenti!',
      spokenLanguage: 'urdu',
      cameraAngle: 'Close-Up Speaker A',
      durationSec: 4,
    },
    {
      id: 't2',
      speaker: 'Cheenti (The Ant)',
      voice: 'Kore',
      pitch: 1.32,
      englishLine: 'Please forgive me, O Mighty Sher! Spare my life, and one day I will help you!',
      urduLine: 'مجھے معاف کر دیں جنگل کے بادشاہ! ایک دن میں آپ کے کام آؤں گی!',
      romanUrduLine: 'Mujhe maaf kar dein jungle ke badshah! Aik din main aap ke kaam aaon gi!',
      spokenLanguage: 'urdu',
      cameraAngle: 'Close-Up Speaker B',
      durationSec: 4,
    },
    {
      id: 't3',
      speaker: 'Sher (The Lion)',
      voice: 'Fenrir',
      pitch: 0.75,
      englishLine: 'ROAAAR! Help! I am trapped in this hunter net! Can anyone hear me?',
      urduLine: 'مدد کرو! میں شکاری کے جال میں پھنس گیا ہوں! کیا کوئی سن رہا ہے؟',
      romanUrduLine: 'Madad karo! Main shikari ke jaal mein phans gaya hoon! Kya koi sun raha hai?',
      spokenLanguage: 'urdu',
      cameraAngle: 'Wide Action Shot',
      durationSec: 4,
    },
    {
      id: 't4',
      speaker: 'Cheenti (The Ant)',
      voice: 'Kore',
      pitch: 1.3,
      englishLine: 'Hold on, my friend Sher! I will bite through these thick ropes right now!',
      urduLine: 'حوصلہ رکھو میرے دوست شیر! میں ابھی اپنے دانتوں سے یہ رسیاں کاٹتی ہوں!',
      romanUrduLine: 'Hosla rakho mere dost Sher! Main abhi apne daanton se yeh rassiyan kaatti hoon!',
      spokenLanguage: 'urdu',
      cameraAngle: 'Extreme Macro Shot',
      durationSec: 4,
    },
    {
      id: 't5',
      speaker: 'Sher & Cheenti',
      voice: 'Puck',
      pitch: 0.9,
      englishLine: 'Thank you, brave little Cheenti! No friend is ever too small to save a king!',
      urduLine: 'شکریہ ننھی چونٹی! سچا دوست کبھی چھوٹا نہیں ہوتا!',
      romanUrduLine: 'Shukriya nanhi Cheenti! Sacha dost kabhi chota nahi hota!',
      spokenLanguage: 'english',
      cameraAngle: 'Two-Shot Finale',
      durationSec: 4,
    },
  ]);
  const [masterWavUrl, setMasterWavUrl] = useState<string | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [synthesizingTurnId, setSynthesizingTurnId] = useState<string | null>(null);
  const [activeSpeakingId, setActiveSpeakingId] = useState<string | null>(null);
  const [liveMouthOpenPct, setLiveMouthOpenPct] = useState<number>(0);
  const [vaultClips, setVaultClips] = useState<SavedAudioVaultClip[]>([]);

  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeEnvelopeRef = useRef<number[]>([]);

  const loadAudioVaultClips = async () => {
    try {
      const authHeaders = await buildUserAuthHeaders(currentUser || null);
      const query =
        typeof activeProjectId === 'number' ? `?projectId=${encodeURIComponent(activeProjectId)}` : '';
      const res = await fetch(`/api/audio-library${query}`, { headers: authHeaders });
      const data = (res.ok ? await res.json() : null) as { clips?: SavedAudioVaultClip[] } | null;
      if (data?.clips) {
        setVaultClips(data.clips);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    void loadAudioVaultClips();
  }, [currentUser?.uid, activeProjectId]);

  // Real-time lip-sync mouth monitor loop driven by <audio> currentTime + 30fps PCM envelope
  useEffect(() => {
    let animId = 0;
    const tick = () => {
      const audioEl = previewAudioRef.current;
      if (audioEl && !audioEl.paused && !audioEl.ended) {
        const env = activeEnvelopeRef.current;
        if (env.length > 0) {
          const frameIdx = Math.min(
            env.length - 1,
            Math.max(0, Math.floor(audioEl.currentTime * 30)),
          );
          setLiveMouthOpenPct(Math.round((env[frameIdx] || 0) * 100));
        } else {
          const fallbackPulse = Math.abs(Math.sin(performance.now() * 0.018)) * 75;
          setLiveMouthOpenPct(Math.round(fallbackPulse));
        }
      } else if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
        const pulse = Math.abs(Math.sin(performance.now() * 0.016) * Math.cos(performance.now() * 0.011)) * 82;
        setLiveMouthOpenPct(Math.round(pulse));
      } else {
        setLiveMouthOpenPct(0);
      }
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Translate & Transliterate all dialogue turns across English, Urdu (اردو), and Roman Urdu
  const handleTranslateAllTurns = async () => {
    if (isTranslating || turns.length === 0) return;
    setIsTranslating(true);
    onNotice('Translating & syncing Urdu (اردو), Roman Urdu, and English dialogue...');
    try {
      const authHeaders = await buildUserAuthHeaders(currentUser || null);
      const res = await fetch('/api/tts/translate-dialogue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          items: turns.map((t) => ({
            speakerName: t.speaker,
            english: t.englishLine,
            urdu: t.urduLine,
            romanUrdu: t.romanUrduLine || '',
          })),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        items?: Array<{ english?: string; urdu?: string; romanUrdu?: string }>;
        error?: string;
      };
      if (!res.ok || !Array.isArray(data.items)) {
        throw new Error(data.error || 'Translation failed');
      }
      setTurns((prev) =>
        prev.map((t, idx) => {
          const tr = data.items?.[idx];
          if (!tr) return t;
          return {
            ...t,
            englishLine: tr.english || t.englishLine,
            urduLine: tr.urdu || t.urduLine,
            romanUrduLine: tr.romanUrdu || t.romanUrduLine,
          };
        }),
      );
      onNotice('Synced English, Urdu Nastaliq (اردو), and Roman Urdu across all dialogue turns!');
    } catch (err) {
      onNotice(err instanceof Error ? err.message : 'Dialogue translation failed');
    } finally {
      setIsTranslating(false);
    }
  };

  // Synthesize or Retry a single turn's voice via Gemini TTS + store safely in Audio Vault & Firestore
  const synthesizeSingleTurn = async (turnIdx: number) => {
    const turn = turns[turnIdx];
    if (!turn) return;
    setSynthesizingTurnId(turn.id);
    const lang = turn.spokenLanguage || globalVoiceLanguage;
    onNotice(`Synthesizing ${turn.speaker} (${turn.voice} · ${lang.toUpperCase()}) neural voice...`);

    try {
      const authHeaders = await buildUserAuthHeaders(currentUser || null);
      const res = await fetch('/api/video/scene-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          title: `${storyTitle} · Turn ${turnIdx + 1} (${turn.speaker})`,
          speakerName: turn.speaker,
          voiceName: turn.voice,
          speakerPitch: turn.pitch,
          dialogueLine: turn.englishLine,
          dialogueUrdu: turn.urduLine,
          dialogueRomanUrdu: turn.romanUrduLine || '',
          language: lang,
          durationSec: turn.durationSec || 4,
          sceneIdx: turnIdx,
          projectId: activeProjectId ?? 1,
          includeSfx: false,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        clipId?: string;
        audioUrl?: string;
        audioDataUrl?: string;
        durationSec?: number;
        lipSyncEnvelope?: number[];
        spokenText?: string;
        error?: string;
      };
      if (!res.ok || (!data.audioUrl && !data.audioDataUrl)) {
        throw new Error(data.error || `Failed to synthesize Turn ${turnIdx + 1}`);
      }

      const audioSrc = data.audioUrl || data.audioDataUrl!;
      const env = data.lipSyncEnvelope || [];

      setTurns((prev) =>
        prev.map((item, i) =>
          i === turnIdx
            ? {
                ...item,
                spokenLanguage: lang,
                audioUrl: data.audioUrl,
                audioDataUrl: data.audioDataUrl || data.audioUrl,
                durationSec: data.durationSec || item.durationSec || 4,
                lipSyncEnvelope: env,
                synthError: undefined,
              }
            : item,
        ),
      );

      if (currentUser?.uid && data.clipId) {
        void saveUserArtifactToFirestore(currentUser.uid, {
          id: data.clipId,
          kind: 'audio',
          title: `${turn.speaker} (${lang.toUpperCase()}): ${(data.spokenText || turn.englishLine).slice(0, 60)}`,
          description: data.spokenText || turn.englishLine,
          createdAt: new Date().toISOString(),
        });
      }

      activeEnvelopeRef.current = env;
      setActiveSpeakingId(turn.id);
      if (previewAudioRef.current) {
        previewAudioRef.current.src = audioSrc;
        previewAudioRef.current.currentTime = 0;
        previewAudioRef.current.onended = () => setActiveSpeakingId(null);
        void previewAudioRef.current.play().catch(() => {});
      }

      void loadAudioVaultClips();
      onNotice(
        `Synthesized & stored ${turn.speaker} (${lang.toUpperCase()}) with ${env.length} PCM lip-sync frames`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Voice synthesis failed';
      setTurns((prev) =>
        prev.map((item, i) => (i === turnIdx ? { ...item, synthError: msg } : item)),
      );
      onNotice(msg);
    } finally {
      setSynthesizingTurnId(null);
    }
  };

  const synthesizeMasterTrack = async () => {
    if (isSynthesizing) return;
    setIsSynthesizing(true);
    onNotice(`Synthesizing multi-character ${globalVoiceLanguage.toUpperCase()} voices & master lip-sync track...`);
    try {
      const authHeaders = await buildUserAuthHeaders(currentUser || null);
      const scenesPayload = turns.map((t, i) => ({
        headline: `Scene ${i + 1} · ${t.speaker}`,
        subtext: t.englishLine,
        dialogueLine: t.englishLine,
        dialogueUrdu: t.urduLine,
        dialogueRomanUrdu: t.romanUrduLine || '',
        spokenLanguage: t.spokenLanguage || globalVoiceLanguage,
        speakerName: t.speaker,
        speakerVoice: t.voice,
        speakerPitch: t.pitch,
        durationSec: t.durationSec || 4,
        sfxMood: 'Cinematic Forest & Story Ambience',
      }));
      const res = await fetch('/api/video/dialogue-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ scenes: scenesPayload }),
      });
      const data = (await res.json()) as {
        masterAudioUrl?: string;
        sceneAudioUrls?: Array<string | null>;
        sceneLipSyncEnvelopes?: number[][];
        sceneDurations?: number[];
        error?: string;
      };
      if (!res.ok || !data?.masterAudioUrl) {
        throw new Error(data?.error || 'Failed to synthesize master audio track');
      }
      setMasterWavUrl(data.masterAudioUrl);
      setTurns((prev) =>
        prev.map((t, i) => ({
          ...t,
          audioUrl: data.sceneAudioUrls?.[i] || t.audioUrl,
          audioDataUrl: data.sceneAudioUrls?.[i] || t.audioDataUrl,
          lipSyncEnvelope: data.sceneLipSyncEnvelopes?.[i] || t.lipSyncEnvelope,
          durationSec: data.sceneDurations?.[i] || t.durationSec || 4,
          synthError: undefined,
        })),
      );
      void loadAudioVaultClips();
      onNotice('Multi-character master WAV audio track & per-scene lip-sync envelopes ready!');
    } catch (err) {
      onNotice(err instanceof Error ? err.message : 'Master track synthesis failed');
    } finally {
      setIsSynthesizing(false);
    }
  };

  const speakSingleTurn = (turn: DialogueTurn) => {
    setActiveSpeakingId(turn.id);
    const audioSrc = turn.audioUrl || turn.audioDataUrl;
    if (audioSrc && previewAudioRef.current) {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      activeEnvelopeRef.current = turn.lipSyncEnvelope || [];
      previewAudioRef.current.src = audioSrc;
      previewAudioRef.current.currentTime = 0;
      previewAudioRef.current.onended = () => setActiveSpeakingId(null);
      void previewAudioRef.current.play().catch(() => {});
      onNotice(`Playing stored neural voice for ${turn.speaker} (${(turn.spokenLanguage || globalVoiceLanguage).toUpperCase()})`);
      return;
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const lang = turn.spokenLanguage || globalVoiceLanguage;
      const textToSpeak =
        lang === 'urdu'
          ? turn.urduLine || turn.englishLine
          : lang === 'roman_urdu'
            ? turn.romanUrduLine || turn.englishLine
            : turn.englishLine;
      const u = new SpeechSynthesisUtterance(textToSpeak);
      u.lang = lang === 'urdu' || lang === 'roman_urdu' ? 'ur-PK' : 'en-US';
      u.pitch = turn.pitch;
      u.rate = 0.96;
      u.onend = () => setActiveSpeakingId(null);
      window.speechSynthesis.speak(u);
    }
    onNotice(`Previewing ${turn.speaker} (${turn.voice} · ${(turn.spokenLanguage || globalVoiceLanguage).toUpperCase()})`);
  };

  const buildVideoStudioScenesFromTurns = (): VideoStudioSceneItem[] => {
    return turns.map((t, i) => ({
      headline: `Scene ${i + 1} · ${t.speaker}`,
      subtext: t.englishLine,
      bgGradient: (i % 2 === 0 ? ['#064E3B', '#0F172A'] : ['#1E1B4B', '#090D16']) as [string, string],
      accentColor: i % 2 === 0 ? '#F59E0B' : '#10B981',
      durationSec: t.durationSec || 4,
      motionStyle: 'zoom',
      cameraMove: t.cameraAngle || 'Close-Up Dialogue Shot',
      cameraShotType: i % 2 === 0 ? 'close_up_a' : 'close_up_b',
      speakerName: t.speaker,
      speakerVoice: t.voice,
      speakerPitch: t.pitch,
      dialogueLine: t.englishLine,
      dialogueUrdu: t.urduLine,
      dialogueRomanUrdu: t.romanUrduLine || '',
      spokenLanguage: t.spokenLanguage || globalVoiceLanguage,
      audioDataUrl: t.audioUrl || t.audioDataUrl,
      lipSyncEnvelope: t.lipSyncEnvelope,
    }));
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 overflow-y-auto p-4 sm:p-6">
      <audio ref={previewAudioRef} className="hidden" />

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center dark:border-slate-800">
          <div>
            <h2 className="font-serif-display text-xl font-bold text-slate-900 dark:text-white">
              Multilingual Urdu &amp; English Voiceover, Dubbing &amp; Lip-Sync Studio
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Google Gemini TTS Neural Voices (Fenrir, Kore, Puck, Charon, Zephyr) · Urdu Nastaliq (اردو), Roman Urdu &amp; English · Real PCM Lip-Sync &amp; Safe Audio Vault
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isTranslating}
              onClick={() => void handleTranslateAllTurns()}
              className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 hover:border-amber-400 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <RefreshCw size={13} className={isTranslating ? 'animate-spin' : ''} />
              <span>{isTranslating ? 'Translating...' : 'AI Sync Urdu (اردو) ↔ English'}</span>
            </button>

            <button
              type="button"
              disabled={isSynthesizing}
              onClick={() => void synthesizeMasterTrack()}
              className="flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-xs font-extrabold text-slate-950 transition hover:bg-amber-300 disabled:opacity-50"
            >
              <AudioWaveform size={14} />
              <span>
                {isSynthesizing
                  ? 'Synthesizing Voices...'
                  : `Synthesize Master (${globalVoiceLanguage.toUpperCase()})`}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                const syncedScenes = buildVideoStudioScenesFromTurns();
                const fullPrompt = `Create a 3D Pixar animated video for "${storyTitle}" with ${globalVoiceLanguage.toUpperCase()} character voices and lip-sync: ${turns
                  .map((t, i) => `Scene ${i + 1} (${t.speaker}): "${t.englishLine}"`)
                  .join(' -> ')}`;
                if (onSyncAudioScenesToVideoStudio) {
                  onSyncAudioScenesToVideoStudio({
                    promptText: fullPrompt,
                    title: storyTitle,
                    masterAudioUrl: masterWavUrl || undefined,
                    scenes: syncedScenes,
                  });
                } else {
                  onSendToVideoStudio(fullPrompt, {
                    title: storyTitle,
                    masterAudioUrl: masterWavUrl || undefined,
                    scenes: syncedScenes,
                  });
                }
              }}
              className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-amber-400 transition hover:bg-slate-800 dark:bg-slate-800"
            >
              <Film size={14} />
              <span>Connect Audio &amp; Scenes to Video Studio</span>
            </button>
          </div>
        </div>

        {/* Global Language Selector + Live Mouth Lip-Sync Monitor */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/90 p-3 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
              Spoken Language Pipeline:
            </span>
            {(
              [
                { id: 'urdu', label: '🇵🇰 Urdu (اردو)' },
                { id: 'english', label: '🇬🇧 English' },
                { id: 'roman_urdu', label: '🔤 Roman Urdu' },
                { id: 'bilingual', label: '🌐 Bilingual (Urdu + EN)' },
              ] as const
            ).map((langOpt) => (
              <button
                key={langOpt.id}
                type="button"
                onClick={() => {
                  setGlobalVoiceLanguage(langOpt.id);
                  setTurns((prev) => prev.map((t) => ({ ...t, spokenLanguage: langOpt.id })));
                  onNotice(`Set voiceover pipeline language to ${langOpt.label}`);
                }}
                className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                  globalVoiceLanguage === langOpt.id
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {langOpt.label}
              </button>
            ))}
          </div>

          {/* Live Lip-Sync Mouth Articulation Preview Widget */}
          <div className="flex items-center gap-3 rounded-xl border border-slate-300 bg-slate-900 px-3.5 py-1.5 text-white dark:border-slate-700">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-full border border-amber-400/50 bg-slate-800">
              {/* Animated Mouth SVG driven by liveMouthOpenPct */}
              <div
                style={{
                  width: `${Math.max(10, 14 + liveMouthOpenPct * 0.08)}px`,
                  height: `${Math.max(3, 3 + liveMouthOpenPct * 0.16)}px`,
                }}
                className="rounded-full border-2 border-rose-400 bg-rose-950 transition-all duration-75"
              />
            </div>
            <div>
              <div className="text-[10px] font-extrabold text-amber-400">
                LIVE LIP-SYNC MONITOR
              </div>
              <div className="font-mono text-[11px] text-emerald-400">
                Mouth Open: {liveMouthOpenPct}% {activeSpeakingId ? '· Speaking' : '· Silent'}
              </div>
            </div>
          </div>
        </div>

        {masterWavUrl && (
          <div className="mt-4 flex flex-col items-center justify-between gap-3 rounded-xl border border-emerald-400/50 bg-emerald-50/50 p-3.5 sm:flex-row dark:bg-emerald-950/20">
            <div className="text-xs font-bold text-slate-900 dark:text-white">
              Mastered Multi-Character ({globalVoiceLanguage.toUpperCase()}) Dialogue + SFX Track
            </div>
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <audio controls src={masterWavUrl} className="h-9 flex-1 sm:w-64" />
              <a
                href={masterWavUrl}
                download="saz-multilingual-dialogue.wav"
                className="flex shrink-0 items-center gap-1 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-extrabold text-slate-950"
              >
                <Download size={13} />
                <span>WAV</span>
              </a>
            </div>
          </div>
        )}

        <div className="mt-4 space-y-3">
          {turns.map((turn, idx) => {
            const turnAudioSrc = turn.audioUrl || turn.audioDataUrl;
            const isTurnLoading = synthesizingTurnId === turn.id;
            return (
              <div
                key={turn.id}
                className={`rounded-xl border p-4 transition ${
                  activeSpeakingId === turn.id
                    ? 'border-amber-400 bg-amber-50/40 dark:bg-amber-950/20'
                    : 'border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-800/50'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400">
                      0{idx + 1}.
                    </span>
                    <input
                      value={turn.speaker}
                      onChange={(e) =>
                        setTurns((prev) =>
                          prev.map((item) =>
                            item.id === turn.id ? { ...item, speaker: e.target.value } : item,
                          ),
                        )
                      }
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                    <select
                      value={turn.voice}
                      onChange={(e) =>
                        setTurns((prev) =>
                          prev.map((item) =>
                            item.id === turn.id
                              ? { ...item, voice: e.target.value as DialogueTurn['voice'] }
                              : item,
                          ),
                        )
                      }
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    >
                      <option value="Fenrir">Fenrir (Deep Royal Male)</option>
                      <option value="Kore">Kore (Expressive Bright)</option>
                      <option value="Puck">Puck (Clever Storyteller)</option>
                      <option value="Zephyr">Zephyr (Heroic Energetic)</option>
                      <option value="Charon">Charon (Cinematic Bass)</option>
                    </select>

                    <select
                      value={turn.spokenLanguage || globalVoiceLanguage}
                      onChange={(e) => {
                        const lang = e.target.value as NonNullable<DialogueTurn['spokenLanguage']>;
                        setTurns((prev) =>
                          prev.map((item) =>
                            item.id === turn.id ? { ...item, spokenLanguage: lang } : item,
                          ),
                        );
                      }}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-amber-700 dark:border-slate-700 dark:bg-slate-900 dark:text-amber-300"
                    >
                      <option value="urdu">🇵🇰 Speak Urdu (اردو)</option>
                      <option value="english">🇬🇧 Speak English</option>
                      <option value="roman_urdu">🔤 Speak Roman Urdu</option>
                      <option value="bilingual">🌐 Bilingual (Urdu + EN)</option>
                    </select>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      disabled={isTurnLoading}
                      onClick={() => void synthesizeSingleTurn(idx)}
                      className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-amber-400 hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-800"
                    >
                      <Mic size={12} />
                      <span>
                        {isTurnLoading
                          ? 'Synthesizing...'
                          : turn.synthError
                            ? '↻ Retry TTS'
                            : turnAudioSrc
                              ? '↻ Re-Synthesize WAV'
                              : 'Synthesize Neural WAV'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => speakSingleTurn(turn)}
                      className="flex items-center gap-1.5 rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-extrabold text-slate-950 hover:bg-amber-300"
                    >
                      <Volume2 size={13} />
                      <span>Preview Voice &amp; Lip-Sync</span>
                    </button>
                  </div>
                </div>

                {turn.synthError && (
                  <div className="mt-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-500">
                    {turn.synthError}
                  </div>
                )}

                <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                      🇬🇧 English Dialogue
                    </label>
                    <input
                      value={turn.englishLine}
                      onChange={(e) =>
                        setTurns((prev) =>
                          prev.map((item) =>
                            item.id === turn.id ? { ...item, englishLine: e.target.value } : item,
                          ),
                        )
                      }
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                      🇵🇰 Urdu Script (اردو مکالمہ)
                    </label>
                    <input
                      dir="auto"
                      value={turn.urduLine}
                      onChange={(e) =>
                        setTurns((prev) =>
                          prev.map((item) =>
                            item.id === turn.id ? { ...item, urduLine: e.target.value } : item,
                          ),
                        )
                      }
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 dark:border-slate-700 dark:bg-slate-900 dark:text-amber-300"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-sky-700 dark:text-sky-400">
                      🔤 Roman Urdu Phonetic
                    </label>
                    <input
                      value={turn.romanUrduLine || ''}
                      onChange={(e) =>
                        setTurns((prev) =>
                          prev.map((item) =>
                            item.id === turn.id
                              ? { ...item, romanUrduLine: e.target.value }
                              : item,
                          ),
                        )
                      }
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    />
                  </div>
                </div>

                {turnAudioSrc && (
                  <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-1.5">
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                      ✓ Stored WAV ({turn.durationSec || 4}s · {turn.lipSyncEnvelope?.length || 0} Lip-Sync Frames)
                    </span>
                    <div className="flex items-center gap-2">
                      <audio controls src={turnAudioSrc} className="h-7 w-48" />
                      <a
                        href={turnAudioSrc.startsWith('/api/') ? `${turnAudioSrc}?download=1` : turnAudioSrc}
                        download={`turn-${idx + 1}-${turn.voice}.wav`}
                        className="rounded-lg bg-emerald-500 px-2.5 py-1 text-[10px] font-extrabold text-slate-950"
                      >
                        Download WAV
                      </a>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Safe Audio Vault Library */}
        {vaultClips.length > 0 && (
          <div className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                🔒 Safe Audio Vault ({vaultClips.length} Persisted Multilingual Clips)
              </h3>
              <button
                type="button"
                onClick={() => void loadAudioVaultClips()}
                className="text-[11px] font-bold text-amber-600 dark:text-amber-400"
              >
                Refresh Vault
              </button>
            </div>
            <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {vaultClips.slice(0, 8).map((clip) => (
                <div
                  key={clip.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-950"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-bold text-slate-900 dark:text-white">
                      {clip.speakerName} ({clip.voiceName} · {clip.language.toUpperCase()})
                    </div>
                    <div dir="auto" className="truncate text-[11px] text-slate-500">
                      {clip.dialogueText}
                    </div>
                  </div>
                  <audio controls src={clip.audioUrl} className="h-7 w-32 shrink-0" />
                  <button
                    type="button"
                    onClick={async () => {
                      const authHeaders = await buildUserAuthHeaders(currentUser || null);
                      await fetch(`/api/audio-library/${encodeURIComponent(clip.id)}`, {
                        method: 'DELETE',
                        headers: authHeaders,
                      });
                      void loadAudioVaultClips();
                    }}
                    className="rounded p-1 text-slate-400 hover:text-rose-500"
                    title="Delete Audio Clip"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function MusicSfxWorkspace({ onNotice }: { onNotice: (msg: string) => void }) {
  const [selectedPreset, setSelectedPreset] = useState('Jungle Morning Birds & Flute');
  const [tempoBpm, setTempoBpm] = useState(108);
  const [durationSec, setDurationSec] = useState(8);
  const [isPlaying, setIsPlaying] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const presets = [
    {
      name: 'Jungle Morning Birds & Flute',
      desc: 'Warm banyan forest birdsong, gentle breeze & acoustic woodwind melody',
      notes: [261.63, 329.63, 392.0, 523.25, 659.25],
      wave: 'sine' as OscillatorType,
    },
    {
      name: 'Lion Roar & Dramatic Drums',
      desc: 'Deep low-end sub-bass rumble, tribal percussion & suspenseful brass',
      notes: [110.0, 130.81, 146.83, 164.81, 98.0],
      wave: 'sawtooth' as OscillatorType,
    },
    {
      name: 'Triumphant Pixar Finale Swell',
      desc: 'Uplifting major-key orchestral strings, celesta sparkles & warm horns',
      notes: [293.66, 369.99, 440.0, 587.33, 739.99],
      wave: 'triangle' as OscillatorType,
    },
    {
      name: '3D Turbo Arcade Synthwave',
      desc: 'High-octane 128 BPM arpeggiated bassline for 3D racing & action games',
      notes: [220.0, 277.18, 329.63, 440.0, 329.63],
      wave: 'square' as OscillatorType,
    },
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animId = 0;
    const render = (now: number) => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.fillStyle = '#090D16';
      ctx.fillRect(0, 0, W, H);
      const bars = 36;
      const barW = (W - 40) / bars;
      for (let i = 0; i < bars; i++) {
        const amp = isPlaying
          ? Math.abs(Math.sin(now * 0.008 + i * 0.35) * Math.cos(now * 0.004 - i * 0.2))
          : 0.12;
        const bh = Math.max(6, amp * (H - 36));
        ctx.fillStyle = i % 2 === 0 ? '#F59E0B' : '#38BDF8';
        ctx.fillRect(20 + i * barW, H / 2 - bh / 2, barW - 4, bh);
      }
      animId = requestAnimationFrame(render);
    };
    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying]);

  const playSynthesizedScore = () => {
    const preset = presets.find((p) => p.name === selectedPreset) || presets[0];
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ac = audioCtxRef.current || new AudioCtx();
      audioCtxRef.current = ac;
      if (ac.state === 'suspended') void ac.resume();

      setIsPlaying(true);
      const beatSec = 60 / tempoBpm;
      const totalSteps = Math.max(8, Math.floor(durationSec / (beatSec * 0.5)));

      for (let step = 0; step < totalSteps; step++) {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        const freq = preset.notes[step % preset.notes.length];
        osc.type = preset.wave;
        const startT = ac.currentTime + step * beatSec * 0.5;
        osc.frequency.setValueAtTime(freq, startT);
        gain.gain.setValueAtTime(0.001, startT);
        gain.gain.exponentialRampToValueAtTime(0.05, startT + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.0001, startT + beatSec * 0.9);
        osc.connect(gain);
        gain.connect(ac.destination);
        osc.start(startT);
        osc.stop(startT + beatSec);
      }

      window.setTimeout(() => setIsPlaying(false), durationSec * 1000);
      onNotice(`Playing "${preset.name}" at ${tempoBpm} BPM`);
    } catch {
      setIsPlaying(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif-display text-xl font-bold text-slate-900 dark:text-white">
              AI Music & Atmospheric SFX Generator
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Procedural Background Scores, Forest Foley, Lion Roars & Orchestral Stems
            </p>
          </div>
          <button
            type="button"
            onClick={playSynthesizedScore}
            className="flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-extrabold text-slate-950 shadow-xs transition hover:bg-amber-300"
          >
            <Play size={14} />
            <span>{isPlaying ? 'Playing Studio Stem...' : 'Play Score & SFX'}</span>
          </button>
        </div>

        <canvas
          ref={canvasRef}
          width={760}
          height={140}
          className="mt-4 h-32 w-full rounded-2xl border border-slate-800 bg-slate-950 object-cover"
        />

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {presets.map((p) => (
            <button
              type="button"
              key={p.name}
              onClick={() => {
                setSelectedPreset(p.name);
                onNotice(`Selected "${p.name}"`);
              }}
              className={`rounded-xl border p-4 text-left transition ${
                selectedPreset === p.name
                  ? 'border-amber-400 bg-amber-50/50 dark:bg-amber-950/25'
                  : 'border-slate-200 bg-slate-50/60 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900 dark:text-white">{p.name}</span>
                <Music size={15} className="text-amber-500" />
              </div>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{p.desc}</p>
            </button>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 dark:border-slate-800 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Tempo: {tempoBpm} BPM
            </label>
            <input
              type="range"
              min={72}
              max={160}
              value={tempoBpm}
              onChange={(e) => setTempoBpm(Number(e.target.value))}
              className="mt-2 w-full accent-amber-400"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Stem Length: {durationSec} Seconds
            </label>
            <input
              type="range"
              min={4}
              max={20}
              value={durationSec}
              onChange={(e) => setDurationSec(Number(e.target.value))}
              className="mt-2 w-full accent-amber-400"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function StoryGeneratorWorkspace({
  onNotice,
  onAnimateStory,
}: {
  onNotice: (msg: string) => void;
  onAnimateStory: (prompt: string) => void;
}) {
  const [storyIdea, setStoryIdea] = useState(
    'Sher aur Cheenti (The Lion and the Ant) moral fable in Disney/Pixar 3D style with Urdu/Hindi dialogues',
  );
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [scenes, setScenes] = useState<StorySceneDraft[]>([
    {
      sceneNumber: 1,
      headline: 'Scene 1 · Lion & Ant Under the Banyan Tree',
      cameraAngle: 'Close-Up Speaker A · 3D Push-In',
      speaker: 'Sher (The Lion)',
      voice: 'Fenrir',
      dialogueEnglish: 'Who dares wake the King of the Jungle? Speak up, tiny creature!',
      dialogueUrdu: 'جنگل کے بادشاہ کو کس نے جگایا؟ بولو ننھی چونٹی!',
      visualPrompt3D:
        'Disney Pixar 3D CGI vertical 9:16 portrait: majestic golden-maned 3D lion resting under a sunlit jungle tree while a tiny red-brown 3D ant stands on his paw.',
      sfxMood: 'Jungle Morning Birds & Deep Lion Breath',
    },
    {
      sceneNumber: 2,
      headline: 'Scene 2 · The Ant’s Promise',
      cameraAngle: 'Close-Up Speaker B · Eye-Level Reverse',
      speaker: 'Cheenti (The Ant)',
      voice: 'Kore',
      dialogueEnglish: 'Please forgive me, O Mighty Sher! Spare my life, and one day I will surely help you!',
      dialogueUrdu: 'مجھے معاف کر دیں جنگل کے بادشاہ! ایک دن میں آپ کے کام آؤں گی!',
      visualPrompt3D:
        'Disney Pixar 3D CGI vertical 9:16 close-up: kind 3D lion smiling warmly at the brave tiny 3D ant pleading on a glowing emerald leaf.',
      sfxMood: 'Heartwarming Flute & Forest Breeze',
    },
    {
      sceneNumber: 3,
      headline: 'Scene 3 · The Hunter’s Net Trap',
      cameraAngle: 'Wide Action Shot · Low-Angle Shake',
      speaker: 'Sher (The Lion)',
      voice: 'Fenrir',
      dialogueEnglish: 'ROAAAR! Help! I am trapped in this hunter net! Can anyone in the forest hear me?',
      dialogueUrdu: 'مدد کرو! میں شکاری کے جال میں پھنس گیا ہوں!',
      visualPrompt3D:
        'Disney Pixar 3D CGI vertical 9:16 shot: majestic 3D lion tangled inside a heavy woven rope hunter net in the twilight forest.',
      sfxMood: 'Echoing Lion Roar & Rustling Ropes',
    },
    {
      sceneNumber: 4,
      headline: 'Scene 4 · Cheenti Cuts the Ropes',
      cameraAngle: 'Extreme Macro Shot · Rope Cutting',
      speaker: 'Cheenti (The Ant)',
      voice: 'Kore',
      dialogueEnglish: 'Hold on, my friend Sher! I will bite through these thick ropes and set you free!',
      dialogueUrdu: 'حوصلہ رکھو میرے دوست شیر! میں ابھی اپنے دانتوں سے یہ رسیاں کاٹتی ہوں!',
      visualPrompt3D:
        'Disney Pixar 3D CGI vertical 9:16 macro shot: brave tiny 3D ant heroically biting through thick frayed hunter rope strands.',
      sfxMood: 'Snapping Rope Fibers & Heroic Strings',
    },
    {
      sceneNumber: 5,
      headline: 'Scene 5 · Royal Friendship Finale',
      cameraAngle: 'Two-Shot Finale · Crane Pull-Back',
      speaker: 'Sher & Cheenti',
      voice: 'Fenrir',
      dialogueEnglish: 'Thank you, brave little Cheenti! Truly, no friend is ever too small to save a king!',
      dialogueUrdu: 'شکریہ ننھی چونٹی! سچا دوست کبھی چھوٹا نہیں ہوتا!',
      visualPrompt3D:
        'Disney Pixar 3D CGI vertical 9:16 finale: freed joyful 3D lion and tiny heroic ant celebrating on a sunlit jungle rock with golden fireflies.',
      sfxMood: 'Triumphant Orchestral Finale Swell',
    },
  ]);

  const loadTemplate = (template: 'sher' | 'fox' | 'veggie') => {
    if (template === 'sher') {
      setStoryIdea('Sher aur Cheenti (The Lion and the Ant) moral fable in Disney/Pixar 3D style');
      onNotice('Loaded Sher aur Cheenti 5-Scene Script');
      return;
    }
    if (template === 'fox') {
      setStoryIdea('Lomri aur Murgha (Clever Fox & Rooster) 3D Pixar Forest Fable');
      setScenes([
        {
          sceneNumber: 1,
          headline: 'Scene 1 · Morning in Emerald Woods',
          cameraAngle: 'Wide Two-Shot · Low-Angle Crane Push',
          speaker: 'Lomri (The Fox)',
          voice: 'Puck',
          dialogueEnglish: 'Good morning, handsome Rooster! What a glorious golden crown you have today!',
          dialogueUrdu: 'صبح بخیر پیارے مرغے! آج تمہاری شاندار کلغی کتنی چمک رہی ہے!',
          visualPrompt3D:
            'Disney Pixar 3D CGI vertical 9:16: expressive orange fox looking up at a vibrant feathered rooster on an oak branch.',
          sfxMood: 'Forest Morning Birds & Rustling Leaves',
        },
        {
          sceneNumber: 2,
          headline: 'Scene 2 · The Flattery Dialogue',
          cameraAngle: 'Close-Up Speaker A · Fox Dialogue',
          speaker: 'Lomri (The Fox)',
          voice: 'Puck',
          dialogueEnglish: 'Sing your royal melody with your eyes closed so the whole forest can rejoice!',
          dialogueUrdu: 'ذرا آنکھیں بند کر کے اپنی سریلی آواز میں گیت تو سناؤ!',
          visualPrompt3D:
            'Disney Pixar 3D vertical 9:16 close-up: charismatic fox bowing playfully with sparkling eyes.',
          sfxMood: 'Playful Pizzicato Strings',
        },
        {
          sceneNumber: 3,
          headline: 'Scene 3 · Spotting the Trick',
          cameraAngle: 'Over-Shoulder Shot · Suspenseful Tilt',
          speaker: 'Murgha (The Rooster)',
          voice: 'Zephyr',
          dialogueEnglish: 'Aha! I see your sneaky paws waiting below, Mr. Fox! You will not trick me!',
          dialogueUrdu: 'اہا! میں تمہاری چال سمجھ گیا ہوں چالاک لومڑی!',
          visualPrompt3D:
            'Disney Pixar 3D vertical 9:16 shot: sneaky fox crouching below the branch while the smart rooster spots the trick.',
          sfxMood: 'Suspenseful Woodwinds',
        },
        {
          sceneNumber: 4,
          headline: 'Scene 4 · Ringing the Forest Bell',
          cameraAngle: 'Close-Up Speaker B · Rooster Hero Shot',
          speaker: 'Murgha (The Rooster)',
          voice: 'Zephyr',
          dialogueEnglish: 'Cock-a-doodle-doo! Look, the village hounds are coming right behind you!',
          dialogueUrdu: 'ککڑوں کوں! دیکھو گاؤں کے محافظ تمہارے پیچھے آ رہے ہیں!',
          visualPrompt3D:
            'Disney Pixar 3D vertical 9:16 action shot: clever rooster ringing a vine bell in bright sunbeams.',
          sfxMood: 'Echoing Bell Chime & Whoosh',
        },
        {
          sceneNumber: 5,
          headline: 'Scene 5 · Wisdom Wins',
          cameraAngle: 'Wide Action Shot · Crane Pull-Back',
          speaker: 'Lomri & Murgha',
          voice: 'Puck',
          dialogueEnglish: 'Oh no, I must run! Wisdom and alertness always triumph over flattery!',
          dialogueUrdu: 'عقل مندی اور ہوشیاری ہمیشہ خوشامد سے جیت جاتی ہے!',
          visualPrompt3D:
            'Disney Pixar 3D vertical 9:16 finale: joyful rooster crowing proudly on sunlit treetop as fox sprints away.',
          sfxMood: 'Triumphant Orchestral Swell',
        },
      ]);
      onNotice('Loaded Clever Fox & Rooster 5-Scene Script');
    } else {
      setStoryIdea('Vegetable Village Heroes · 3D Pixar Adventure');
      onNotice('Loaded Vegetable Village 5-Scene Script');
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-serif-display text-xl font-bold text-slate-900 dark:text-white">
              3D Story Scriptwriter, Scene Breakdown & Prompt Builder
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              5-Scene 9:16 Screenplay with Camera Angles, Character Voices, Urdu/Hindi Subtitles & 3D Prompts
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              onAnimateStory(
                `Create a 3D Disney/Pixar animated story for "${storyIdea}" in 9:16 vertical format with 5 sequential scenes (${scenes
                  .map((s) => `${s.headline}: ${s.dialogueEnglish}`)
                  .join(' -> ')}), multi-character voiceover, lip-sync, SFX, and Urdu subtitles.`,
              )
            }
            className="flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-extrabold text-slate-950 shadow-xs transition hover:bg-amber-300"
          >
            <Film size={14} />
            <span>Produce 5-Scene 3D Video Now</span>
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Story Templates:</span>
          <button
            type="button"
            onClick={() => loadTemplate('sher')}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800 hover:border-amber-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            🦁 Sher aur Cheenti (Lion & Ant)
          </button>
          <button
            type="button"
            onClick={() => loadTemplate('fox')}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800 hover:border-amber-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            🦊 Clever Fox & Rooster
          </button>
          <button
            type="button"
            onClick={() => loadTemplate('veggie')}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800 hover:border-amber-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            🥕 Vegetable Village
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {scenes.map((scene, idx) => (
            <div
              key={scene.sceneNumber}
              className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/50"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400">
                    0{scene.sceneNumber}.
                  </span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {scene.headline}
                  </span>
                  <span className="text-xs text-slate-500">
                    · {scene.speaker} ({scene.voice}) · {scene.cameraAngle}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(scene.visualPrompt3D);
                    setCopiedIdx(idx);
                    window.setTimeout(() => setCopiedIdx(null), 1200);
                    onNotice(`Copied Scene ${scene.sceneNumber} 3D Prompt`);
                  }}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  {copiedIdx === idx ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copiedIdx === idx ? 'Copied' : 'Copy 3D Prompt'}</span>
                </button>
              </div>

              <p className="mt-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                “{scene.dialogueEnglish}”
              </p>
              <p dir="auto" className="mt-1 text-xs font-bold text-amber-700 dark:text-amber-300">
                {scene.dialogueUrdu}
              </p>
              <div className="mt-2 rounded-lg bg-white p-2.5 text-[11px] text-slate-600 dark:bg-slate-900 dark:text-slate-400">
                <strong className="text-slate-900 dark:text-amber-400">3D Visual Prompt: </strong>
                {scene.visualPrompt3D}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function GameEngineWorkspace({
  onNotice,
}: {
  onNotice: (msg: string) => void;
}) {
  const [engineTab, setEngineTab] = useState<'conversation_3d' | GameArchetype>('conversation_3d');
  const [archetype, setArchetype] = useState<GameArchetype>('car_3d');
  const [gameTitle, setGameTitle] = useState('3D Turbo Highway Racer · Three.js WebGL');
  const [engineKey, setEngineKey] = useState(1);

  const gamePresets: { id: GameArchetype; label: string; title: string; desc: string }[] = [
    {
      id: 'car_3d',
      label: '🏎️ 3D Car Racing',
      title: '3D Turbo Highway Racer · Three.js WebGL',
      desc: 'Sports car mesh, traffic physics, Nitro Boost & camera toggle',
    },
    {
      id: 'runner_3d',
      label: '🏃 3D Cyber Runner',
      title: '3D Cyber Parkour Runner · Three.js WebGL',
      desc: 'Animated 3D hero character, jump/slide physics & spinning coins',
    },
    {
      id: 'shooter_3d',
      label: '🚀 3D Space Shooter',
      title: '3D Galactic Starfighter · Three.js WebGL',
      desc: 'Starfighter mesh, twin plasma lasers & 3D asteroid field',
    },
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setEngineTab('conversation_3d');
              onNotice('Opened Three.js 3D Character Conversation Studio');
            }}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              engineTab === 'conversation_3d'
                ? 'bg-amber-400 text-slate-950 shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200'
            }`}
          >
            🗣️ 3D Character Conversation Studio
          </button>

          {gamePresets.map((g) => (
            <button
              type="button"
              key={g.id}
              onClick={() => {
                setEngineTab(g.id);
                setArchetype(g.id);
                setGameTitle(g.title);
                setEngineKey((k) => k + 1);
                onNotice(`Launched ${g.title}`);
              }}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                engineTab === g.id
                  ? 'bg-amber-400 text-slate-950 shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setEngineKey((k) => k + 1)}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        >
          <RefreshCw size={13} />
          <span>Reset 3D World</span>
        </button>
      </div>

      {engineTab === 'conversation_3d' ? (
        <div className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 dark:bg-slate-950">
          <div className="mx-auto max-w-6xl">
            <ThreeCharacterConversationStudio
              key={`conv-3d-${engineKey}`}
              onNotice={onNotice}
            />
          </div>
        </div>
      ) : (
        <div className="relative flex-1 overflow-hidden bg-slate-950">
          <ThreeGameEngine
            key={`dedicated-game-${archetype}-${engineKey}`}
            title={gameTitle}
            prompt={gameTitle}
            initialMode={archetype}
          />
        </div>
      )}
    </div>
  );
}

export interface VideoStudioCharacter {
  id: string;
  name: string;
  role: string;
  avatarEmoji: string;
  visualDescription: string;
  voiceName: 'Fenrir' | 'Kore' | 'Puck' | 'Charon' | 'Zephyr';
  pitch: number;
  accentColor: string;
}

export interface VideoStudioSceneItem {
  headline: string;
  subtext: string;
  bgGradient: [string, string];
  accentColor: string;
  durationSec: number;
  motionStyle: 'zoom' | 'pan' | 'pulse' | 'kinetic';
  imageUrl?: string;
  visualPrompt3D?: string;
  characterType?: 'lion_ant' | 'fox_rooster' | 'veggie_village' | 'forest_friends' | 'hero_adventure';
  cameraMove?: string;
  cameraShotType?: 'close_up_a' | 'close_up_b' | 'wide_action' | 'over_shoulder' | 'macro_action';
  lightingMood?: string;
  sfxMood?: string;
  characterId?: string;
  speakerName?: string;
  speakerVoice?: 'Fenrir' | 'Kore' | 'Puck' | 'Charon' | 'Zephyr';
  speakerPitch?: number;
  dialogueLine?: string;
  dialogueUrdu?: string;
  dialogueRomanUrdu?: string;
  spokenLanguage?: 'urdu' | 'english' | 'roman_urdu' | 'bilingual';
  facialExpression?: string;
  mouthRegion?: { x: number; y: number; radius: number };
  audioDataUrl?: string;
  audioUrl?: string;
  audioClipId?: string;
  lipSyncEnvelope?: number[];
  synthError?: string;
}

export interface VideoProductionBridgeAsset {
  id: string;
  studio: 'ImageStudio' | 'VideoStudio' | 'AudioStudio';
  type: 'image' | 'video' | 'audio';
  title: string;
  prompt: string;
  url?: string;
  masterAudioUrl?: string;
  videoOperationName?: string;
  videoEngine?: string;
  aspectRatio?: string;
  resolution?: string;
  voiceName?: string;
  audioScript?: string;
  durationSec?: number;
  scenes?: VideoStudioSceneItem[];
  socialCaption?: string;
  socialHashtags?: string[];
}

type PipelineStageId =
  | 'prompt'
  | 'script'
  | 'characters'
  | 'scenes'
  | 'dialogue'
  | 'voice'
  | 'stage3d'
  | 'generate'
  | 'final';

type StepRunStatus = 'idle' | 'running' | 'completed' | 'error' | 'cancelled';

interface SavedVideoProductionItem {
  id: string;
  title: string;
  prompt: string;
  logline: string;
  narrativeScript: string;
  visualStyle: string;
  aspectRatio: '9:16' | '16:9';
  language: string;
  characters: VideoStudioCharacter[];
  scenes: VideoStudioSceneItem[];
  masterAudioUrl?: string;
  videoOperationName?: string;
  compiledVideoUrl?: string;
  status: 'draft' | 'script_ready' | 'scenes_ready' | 'voiced' | 'completed';
  updatedAt: string;
}

const VOICE_OPTIONS: Array<{
  id: 'Fenrir' | 'Kore' | 'Puck' | 'Charon' | 'Zephyr';
  label: string;
  timbre: string;
  defaultPitch: number;
}> = [
  { id: 'Fenrir', label: 'Fenrir', timbre: 'Deep Royal Baritone', defaultPitch: 0.82 },
  { id: 'Kore', label: 'Kore', timbre: 'Warm Expressive Lead', defaultPitch: 1.24 },
  { id: 'Puck', label: 'Puck', timbre: 'Bright Energetic Youth', defaultPitch: 1.18 },
  { id: 'Charon', label: 'Charon', timbre: 'Clever Storyteller', defaultPitch: 0.9 },
  { id: 'Zephyr', label: 'Zephyr', timbre: 'Smooth Cinematic Lyric', defaultPitch: 1.05 },
];

export function VideoStudioProductionWorkspace({
  media,
  onSyncMedia,
  onNotice,
  currentUser,
  activeProjectId,
}: {
  media: VideoProductionBridgeAsset;
  onSyncMedia: (nextMedia: VideoProductionBridgeAsset) => void;
  onNotice: (msg: string) => void;
  currentUser?: AppUserSession | null;
  activeProjectId?: number | null;
}) {
  const [activeStage, setActiveStage] = useState<PipelineStageId>('prompt');
  const [promptText, setPromptText] = useState<string>(
    media.prompt ||
      'Create a completely new cinematic 9:16 video scene showing a beautiful rural Pakistani village. Show mud-brick houses, green fields, a village path, traditional Pakistani clothing, trees, natural daylight and a realistic Pakistani rural atmosphere. Do NOT use lions, wildlife, previous scenes, demo images, or previously generated assets.',
  );
  const [visualStyle, setVisualStyle] = useState<string>('Cinematic 3D');
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9'>(
    media.aspectRatio === '16:9' ? '16:9' : '9:16',
  );
  const [targetSceneCount, setTargetSceneCount] = useState<number>(
    Math.max(2, Math.min(8, media.scenes?.length || 5)),
  );
  const [dialogueLanguage, setDialogueLanguage] = useState<string>(
    'Bilingual (English + Roman Urdu/Hindi)',
  );

  // Script State
  const [storyTitle, setStoryTitle] = useState<string>(
    media.title || 'Rural Pakistani Village · 9:16 Cinematic Story',
  );
  const [logline, setLogline] = useState<string>(
    'Gentle natural morning daylight awakens a peaceful rural Pakistani village with textured mud-brick houses, green agricultural fields, and rustic pathways.',
  );
  const [narrativeScript, setNarrativeScript] = useState<string>(
    media.audioScript ||
      `[ACT I - DAWN IN THE VILLAGE]\nGentle natural daylight illuminates mud-brick houses with textured earthen walls as the village awakens peacefully.\n\n[ACT II - PATH TO THE FIELDS]\nA winding dirt pathway leads past green wheat fields where villagers in traditional shalwar kameez begin their day.\n\n[ACT III - COUNTRYSIDE HARMONY]\nThe sun warms the open Punjab countryside, showcasing authentic rural heritage and peaceful daily life.`,
  );

  // Multi-Character Cast State
  const [characters, setCharacters] = useState<VideoStudioCharacter[]>([
    {
      id: 'char-1',
      name: 'Zain (Village Elder)',
      role: 'Village Elder · Storyteller',
      avatarEmoji: '👳',
      visualDescription:
        'Respected village elder in traditional white shalwar kameez and embroidered vest with a warm smile',
      voiceName: 'Fenrir',
      pitch: 0.88,
      accentColor: '#F59E0B',
    },
    {
      id: 'char-2',
      name: 'Bilal (Field Farmer)',
      role: 'Young Farmer · Co-Star',
      avatarEmoji: '🌾',
      visualDescription:
        'Energetic young villager in traditional green kurta shalwar walking along the canal path near shady neem trees',
      voiceName: 'Charon',
      pitch: 0.94,
      accentColor: '#10B981',
    },
  ]);

  // Multi-Scene Storyboard State
  const [scenes, setScenes] = useState<VideoStudioSceneItem[]>(() =>
    media.scenes && media.scenes.length > 0
      ? media.scenes.map((s, idx) => ({
          ...s,
          characterId: idx % 2 === 0 ? 'char-1' : 'char-2',
        }))
      : [
          {
            headline: 'Scene 1 · Dawn in the Rural Village',
            subtext:
              'Gentle natural daylight illuminates traditional mud-brick houses with textured earthen walls as the village awakens peacefully.',
            bgGradient: ['#1C1917', '#292524'],
            accentColor: '#F59E0B',
            durationSec: 4,
            motionStyle: 'zoom',
            imageUrl: pakistanVillage1Img,
            visualPrompt3D:
              'Cinematic vertical 9:16 view of a beautiful rural Pakistani village. Traditional mud-brick houses with textured earthen walls, lush green fields, dusty path, trees, natural daylight and realistic rural atmosphere.',
            cameraMove: 'Slow Atmospheric Dolly Forward',
            cameraShotType: 'wide_action',
            lightingMood: 'Soft Morning Sunbeams & Natural Daylight',
            sfxMood: 'Rural Morning Birds & Gentle Breeze',
            characterId: 'char-1',
            speakerName: 'Zain (Village Elder)',
            speakerVoice: 'Fenrir',
            speakerPitch: 0.88,
            dialogueLine: 'Subah bakhair! Welcome to our peaceful rural village surrounded by lush green fields.',
            dialogueUrdu: 'صبح بخیر! ہمارے پرامن گاؤں میں آپ کا خیر مقدم ہے۔',
            facialExpression: 'Warm Serene Welcome',
          },
          {
            headline: 'Scene 2 · Village Path & Green Fields',
            subtext:
              'A winding dirt path leads past vibrant green agricultural wheat and mustard fields toward ancient shady neem trees.',
            bgGradient: ['#14532D', '#1C1917'],
            accentColor: '#22C55E',
            durationSec: 4,
            motionStyle: 'pan',
            imageUrl: pakistanPathImg,
            visualPrompt3D:
              'Cinematic 9:16 vertical shot of a village path between mud-brick houses in rural Pakistan, bright natural morning sunlight, leafy neem trees, authentic peaceful atmosphere.',
            cameraMove: 'Eye-Level Walking Pan',
            cameraShotType: 'close_up_b',
            lightingMood: 'Bright Natural Sun over Green Fields',
            sfxMood: 'Rustling Wheat Leaves & Distant Wind',
            characterId: 'char-2',
            speakerName: 'Bilal (Field Farmer)',
            speakerVoice: 'Charon',
            speakerPitch: 0.94,
            dialogueLine: 'Yeh rasta sidha hamare kheton ki taraf jata hai jahan dhoop chamak rahi hai.',
            dialogueUrdu: 'یہ کچا راستہ ہمارے ہری بھرے کھیتوں اور درختوں کے درمیان سے گزرتا ہے۔',
            facialExpression: 'Content & Friendly',
          },
          {
            headline: 'Scene 3 · Countryside Harmony',
            subtext:
              'Villagers dressed in authentic traditional shalwar kameez walk along the canal path under towering green trees.',
            bgGradient: ['#1C1917', '#365314'],
            accentColor: '#EAB308',
            durationSec: 4,
            motionStyle: 'zoom',
            imageUrl: pakistanFieldsImg,
            visualPrompt3D:
              'Cinematic vertical 9:16 portrait of golden and green agricultural fields in rural Pakistan, mud-brick farmhouse in background, clear open sky, natural daylight.',
            cameraMove: 'Cinematic Tracking Crane',
            cameraShotType: 'wide_action',
            lightingMood: 'Warm Natural Sunlight & Open Sky',
            sfxMood: 'Flowing Canal Water & Distant Birds',
            characterId: 'char-1',
            speakerName: 'Zain (Village Elder)',
            speakerVoice: 'Fenrir',
            speakerPitch: 0.88,
            dialogueLine: 'Mitti ki khushboo aur kheton ki haryali hamari dehati zindagi ki pehchan hai.',
            dialogueUrdu: 'مٹی کی خوشبو اور سرسبز و شاداب کھیت ہماری دیہی زندگی کا حسن ہیں۔',
            facialExpression: 'Joyful Reflection',
          },
          {
            headline: 'Scene 4 · Natural Daylight & Earthen Architecture',
            subtext:
              'Handcrafted clay walls and wooden doorways catch the golden afternoon light in an authentic Pakistani rural courtyard.',
            bgGradient: ['#451A03', '#1C1917'],
            accentColor: '#FB923C',
            durationSec: 4,
            motionStyle: 'zoom',
            imageUrl: pakVillageLifeImg,
            visualPrompt3D:
              'Authentic rural Pakistan village life, courtyard of mud-brick houses, traditional wooden doorways, clay texture, warm afternoon sunlight, peaceful setting.',
            cameraMove: 'Subtle Push-In on Earthen Texture',
            cameraShotType: 'macro_action',
            lightingMood: 'Rich Golden Afternoon Glow',
            sfxMood: 'Gentle Folk Flute & Village Ambience',
            characterId: 'char-1',
            speakerName: 'Zain (Village Elder)',
            speakerVoice: 'Fenrir',
            speakerPitch: 0.86,
            dialogueLine: 'Yeh sada aur qudrati zindagi shehron ke shor se door behtareen sukoon bakhshti hai.',
            dialogueUrdu: 'شہروں کے شور سے دور، یہ سادگی اور خالص ماحول دل کو سکون بخشتا ہے۔',
            facialExpression: 'Peaceful Wisdom',
          },
          {
            headline: 'Scene 5 · Sunset over the Punjab Countryside',
            subtext:
              'The sun sets over the boundless green fields, painting the mud houses in amber light as evening settles over the village.',
            bgGradient: ['#78350F', '#0F172A'],
            accentColor: '#F59E0B',
            durationSec: 4,
            motionStyle: 'pulse',
            imageUrl: pakistaniVillageImg,
            visualPrompt3D:
              'Cinematic 9:16 golden hour sunset over rural Pakistani fields, mud houses silhouette in warm amber light, peaceful authentic Pakistani atmosphere.',
            cameraMove: 'Epic Crane Pull-Back to Horizon',
            cameraShotType: 'over_shoulder',
            lightingMood: 'Radiant Golden Hour Sunset Panorama',
            sfxMood: 'Warm Cinematic Acoustic Finale',
            characterId: 'char-2',
            speakerName: 'Bilal (Field Farmer)',
            speakerVoice: 'Charon',
            speakerPitch: 0.92,
            dialogueLine: 'Yeh hai hamara khubsurat Pakistani gaon — qudrat, husn aur sukoon ka gehwara.',
            dialogueUrdu: 'یہ ہے ہمارا خوبصورت پاکستانی گاؤں — امن، سادگی اور فطرت کا حقیقی گہوارہ۔',
            facialExpression: 'Grateful Smile',
          },
        ],
  );

  const [selectedSceneIdx, setSelectedSceneIdx] = useState<number>(0);
  const [masterAudioUrl, setMasterAudioUrl] = useState<string | undefined>(media.masterAudioUrl);
  const [veoOperationName, setVeoOperationName] = useState<string | undefined>(
    media.videoOperationName,
  );
  const [veoStreamUrl, setVeoStreamUrl] = useState<string | undefined>(media.url);

  // Pipeline Step Statuses & Error/Cancel/Retry Handling
  const [stepStatus, setStepStatus] = useState<{
    script: StepRunStatus;
    scenes: StepRunStatus;
    voice: StepRunStatus;
    video: StepRunStatus;
  }>({
    script: 'completed',
    scenes: 'completed',
    voice: media.masterAudioUrl ? 'completed' : 'idle',
    video: media.url ? 'completed' : media.videoOperationName ? 'running' : 'idle',
  });

  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [failedStepKey, setFailedStepKey] = useState<'script' | 'scenes' | 'voice' | 'video' | null>(
    null,
  );
  const [isRunningPipeline, setIsRunningPipeline] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressDetail, setProgressDetail] = useState<string>('Ready for production');
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [sceneGeneratingMap, setSceneGeneratingMap] = useState<Record<number, boolean>>({});
  const [sceneVoiceLoadingMap, setSceneVoiceLoadingMap] = useState<Record<number, boolean>>({});
  const [isTranslatingScenes, setIsTranslatingScenes] = useState<boolean>(false);
  const [globalSceneVoiceLang, setGlobalSceneVoiceLang] = useState<
    'urdu' | 'english' | 'roman_urdu' | 'bilingual'
  >('urdu');
  const [savedProductions, setSavedProductions] = useState<SavedVideoProductionItem[]>([]);

  // Sync external media updates (e.g. when sent from Voiceover & Dubbing Studio)
  useEffect(() => {
    if (media.prompt) {
      setPromptText(media.prompt);
    }
    if (media.title) {
      setStoryTitle(media.title);
    }
    if (media.scenes && media.scenes.length > 0) {
      setScenes(media.scenes);
    }
    if (media.masterAudioUrl) {
      setMasterAudioUrl(media.masterAudioUrl);
    }
    if (media.url) {
      setVeoStreamUrl(media.url);
    }
    if (media.videoOperationName) {
      setVeoOperationName(media.videoOperationName);
    }
  }, [media.id, media.prompt, media.title]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const timerRef = useRef<number | null>(null);
  const sceneAudioPreviewRef = useRef<HTMLAudioElement | null>(null);

  // Keep elapsed timer ticking while any generation step is running
  useEffect(() => {
    if (isRunningPipeline) {
      setElapsedSeconds(0);
      timerRef.current = window.setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    } else if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [isRunningPipeline]);

  // Load saved video productions for this user/project
  useEffect(() => {
    let ignore = false;
    const query =
      typeof activeProjectId === 'number' ? `?projectId=${encodeURIComponent(activeProjectId)}` : '';
    void (async () => {
      try {
        const authHeaders = await buildUserAuthHeaders(currentUser || null);
        const r = await fetch(`/api/video-studio/productions${query}`, {
          headers: authHeaders,
        });
        const data = (r.ok ? await r.json() : null) as {
          productions?: SavedVideoProductionItem[];
        } | null;
        if (!ignore && data?.productions) {
          setSavedProductions(data.productions);
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      ignore = true;
    };
  }, [currentUser?.uid, activeProjectId]);

  // Synchronize changes to parent MediaStudioCard preview player
  const pushLiveMediaUpdate = (
    nextScenes: VideoStudioSceneItem[],
    overrides?: {
      title?: string;
      prompt?: string;
      masterAudioUrl?: string;
      videoOperationName?: string;
      url?: string;
      aspectRatio?: '9:16' | '16:9';
    },
  ) => {
    const effTitle = overrides?.title ?? storyTitle;
    const effPrompt = overrides?.prompt ?? promptText;
    const effRatio = overrides?.aspectRatio ?? aspectRatio;
    const totalDuration = nextScenes.reduce((acc, s) => acc + (s.durationSec || 4), 0);
    onSyncMedia({
      ...media,
      id: media.id || `vid-prod-${Date.now()}`,
      studio: 'VideoStudio',
      type: 'video',
      title: effTitle,
      prompt: effPrompt,
      aspectRatio: effRatio,
      resolution: `${effRatio === '16:9' ? '1920×1080 · 16:9' : '1080×1920 · 9:16'} · ${nextScenes.length} Scenes · ${characters.length} Characters`,
      durationSec: totalDuration,
      masterAudioUrl: overrides?.masterAudioUrl ?? masterAudioUrl,
      videoOperationName: overrides?.videoOperationName ?? veoOperationName,
      url: overrides?.url ?? veoStreamUrl,
      audioScript: nextScenes
        .map((s) => `${s.speakerName || 'Character'}: ${s.dialogueLine || s.subtext}`)
        .join(' '),
      scenes: nextScenes,
    });
  };

  // Cancel any in-flight generation step
  const handleCancelGeneration = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (veoOperationName) {
      try {
        await fetch('/api/video/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operationName: veoOperationName }),
        });
      } catch {
        // ignore network error during cancel
      }
      setVeoOperationName(undefined);
    }
    setIsRunningPipeline(false);
    setSceneGeneratingMap({});
    setSceneVoiceLoadingMap({});
    setProgressDetail('Generation cancelled by user');
    setStepStatus((prev) => ({
      script: prev.script === 'running' ? 'cancelled' : prev.script,
      scenes: prev.scenes === 'running' ? 'cancelled' : prev.scenes,
      voice: prev.voice === 'running' ? 'cancelled' : prev.voice,
      video: prev.video === 'running' ? 'cancelled' : prev.video,
    }));
    onNotice('Cancelled active Video Studio generation');
  };

  // Step 1: Generate AI Screenplay, Multi-Character Cast & Multi-Scene Storyboard via Gemini
  const runScriptPlanStep = async (signal?: AbortSignal): Promise<{
    characters: VideoStudioCharacter[];
    scenes: VideoStudioSceneItem[];
    title: string;
  } | null> => {
    setPipelineError(null);
    setFailedStepKey(null);
    setStepStatus((prev) => ({ ...prev, script: 'running' }));
    setProgressDetail('Generating screenplay, character cast & scene breakdown with Google Gemini...');

    try {
      const lowerP = promptText.trim().toLowerCase();
      const isNegatingLionPrompt = /\b(do not|don'?t|no|never|avoid|without)\s+.*?\b(lion|lions|sher|wildlife|cheenti|ant)\b/i.test(lowerP);
      const isAffirmativeLion = !isNegatingLionPrompt && /\b(sher\s*(aur|and)\s*cheen?ti|lion\s*(and|&)\s*(the\s*)?ant)\b/i.test(lowerP);
      const castToSend = isAffirmativeLion
        ? characters
        : characters.filter((c) => !/\b(lion|sher|cheenti|ant|شیر|چونٹی)\b/i.test(`${c.name} ${c.role}`));

      const authHeaders = await buildUserAuthHeaders(currentUser || null);
      const res = await fetch('/api/video/script-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store',
          ...authHeaders,
        },
        body: JSON.stringify({
          prompt: promptText.trim(),
          sceneCount: targetSceneCount,
          visualStyle,
          aspectRatio,
          language: dialogueLanguage,
          characters: castToSend.length > 0 ? castToSend : undefined,
          timestamp: Date.now(),
        }),
        signal,
      });

      const data = (await res.json().catch(() => ({}))) as {
        title?: string;
        logline?: string;
        narrativeScript?: string;
        characters?: VideoStudioCharacter[];
        scenes?: VideoStudioSceneItem[];
        error?: string;
      };

      if (!res.ok || !data.scenes || data.scenes.length === 0) {
        throw new Error(data.error || `Script generation failed with HTTP ${res.status}`);
      }

      const nextTitle = data.title || storyTitle;
      const nextLogline = data.logline || logline;
      const nextNarrative = data.narrativeScript || narrativeScript;
      const nextChars =
        data.characters && data.characters.length > 0 ? data.characters : characters;
      const nextScenes: VideoStudioSceneItem[] = data.scenes.map((sc, idx) => {
        const matchedChar =
          nextChars.find(
            (c) =>
              c.id === sc.characterId ||
              c.name.toLowerCase() === (sc.speakerName || '').toLowerCase(),
          ) || nextChars[idx % nextChars.length];
        return {
          ...sc,
          characterId: matchedChar?.id || `char-${(idx % nextChars.length) + 1}`,
          speakerName: sc.speakerName || matchedChar?.name || `Character ${(idx % 2) + 1}`,
          speakerVoice: sc.speakerVoice || matchedChar?.voiceName || 'Fenrir',
          speakerPitch: sc.speakerPitch ?? matchedChar?.pitch ?? 1.0,
          accentColor: sc.accentColor || matchedChar?.accentColor || '#F59E0B',
        };
      });

      setStoryTitle(nextTitle);
      setLogline(nextLogline);
      setNarrativeScript(nextNarrative);
      setCharacters(nextChars);
      setScenes(nextScenes);
      setSelectedSceneIdx(0);
      setStepStatus((prev) => ({ ...prev, script: 'completed' }));
      setProgressDetail(
        `Generated "${nextTitle}" (${nextScenes.length} scenes, ${nextChars.length} characters)`,
      );
      pushLiveMediaUpdate(nextScenes, { title: nextTitle, prompt: promptText });
      onNotice(
        `AI Screenplay & ${nextScenes.length}-Scene Storyboard ready with ${nextChars.length} characters`,
      );
      return { characters: nextChars, scenes: nextScenes, title: nextTitle };
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') {
        setStepStatus((prev) => ({ ...prev, script: 'cancelled' }));
        return null;
      }
      const msg = err instanceof Error ? err.message : 'Failed to generate AI script.';
      setStepStatus((prev) => ({ ...prev, script: 'error' }));
      setFailedStepKey('script');
      setPipelineError(msg);
      onNotice(`Script error: ${msg}`);
      return null;
    }
  };

  // Generate AI Keyframe Image for a Single Scene
  const generateSingleSceneImage = async (
    sceneIdx: number,
    targetScenes = scenes,
    targetChars = characters,
    signal?: AbortSignal,
  ): Promise<string | null> => {
    const sc = targetScenes[sceneIdx];
    if (!sc) return null;
    const assignedChar = targetChars.find(
      (c) => c.id === sc.characterId || c.name === sc.speakerName,
    );

    setSceneGeneratingMap((prev) => ({ ...prev, [sceneIdx]: true }));
    try {
      const authHeaders = await buildUserAuthHeaders(currentUser || null);
      const res = await fetch('/api/video/generate-scene-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          prompt:
            sc.visualPrompt3D ||
            `${visualStyle} ${aspectRatio} frame, ${sc.headline}: ${sc.subtext}`,
          aspectRatio,
          storyTitle,
          storyContext: promptText.trim(),
          sceneIndex: sceneIdx,
          characterVisualDesc: assignedChar
            ? `${assignedChar.name}: ${assignedChar.visualDescription}`
            : undefined,
          requireRealAi: false,
          requestId: `scene-${sceneIdx}-${Date.now()}`,
        }),
        signal,
      });

      const data = (await res.json().catch(() => ({}))) as {
        imageUrl?: string;
        modelUsed?: string;
        error?: string;
      };

      if (!res.ok || !data.imageUrl) {
        throw new Error(data.error || `Scene ${sceneIdx + 1} image generation failed`);
      }

      setScenes((prev) => {
        const updated = prev.map((item, i) =>
          i === sceneIdx ? { ...item, imageUrl: data.imageUrl } : item,
        );
        pushLiveMediaUpdate(updated);
        return updated;
      });
      return data.imageUrl;
    } finally {
      setSceneGeneratingMap((prev) => ({ ...prev, [sceneIdx]: false }));
    }
  };

  // Step 2: Generate Keyframe Images for All Scenes
  const runAllScenesKeyframesStep = async (
    inputScenes = scenes,
    inputChars = characters,
    signal?: AbortSignal,
  ): Promise<VideoStudioSceneItem[] | null> => {
    setPipelineError(null);
    setFailedStepKey(null);
    setStepStatus((prev) => ({ ...prev, scenes: 'running' }));
    const updatedScenes = [...inputScenes];

    try {
      for (let i = 0; i < updatedScenes.length; i++) {
        if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
        setProgressDetail(
          `Rendering Scene ${i + 1} of ${updatedScenes.length} keyframe (${updatedScenes[i].headline})...`,
        );
        setProgressPercent(Math.round(25 + ((i + 0.5) / updatedScenes.length) * 30));
        const imgUrl = await generateSingleSceneImage(i, updatedScenes, inputChars, signal);
        if (!imgUrl) {
          throw new Error(`Failed to render Scene ${i + 1} keyframe.`);
        }
        updatedScenes[i] = { ...updatedScenes[i], imageUrl: imgUrl };
      }

      setScenes(updatedScenes);
      setStepStatus((prev) => ({ ...prev, scenes: 'completed' }));
      setProgressDetail(`All ${updatedScenes.length} scene keyframes rendered via Google AI`);
      pushLiveMediaUpdate(updatedScenes);
      return updatedScenes;
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') {
        setStepStatus((prev) => ({ ...prev, scenes: 'cancelled' }));
        return null;
      }
      const msg = err instanceof Error ? err.message : 'Scene keyframe rendering failed.';
      setStepStatus((prev) => ({ ...prev, scenes: 'error' }));
      setFailedStepKey('scenes');
      setPipelineError(msg);
      onNotice(`Scene render error: ${msg}`);
      return null;
    }
  };

  // AI Translate & Transliterate all scenes across English, Urdu Nastaliq (اردو), and Roman Urdu
  const handleTranslateAllSceneDialogues = async () => {
    if (isTranslatingScenes || scenes.length === 0) return;
    setIsTranslatingScenes(true);
    onNotice('Translating & syncing scene dialogues across Urdu (اردو), Roman Urdu, and English...');
    try {
      const authHeaders = await buildUserAuthHeaders(currentUser || null);
      const res = await fetch('/api/tts/translate-dialogue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          items: scenes.map((sc, i) => ({
            speakerName: sc.speakerName || `Scene ${i + 1}`,
            english: sc.dialogueLine || sc.subtext,
            urdu: sc.dialogueUrdu || '',
            romanUrdu: sc.dialogueRomanUrdu || '',
          })),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        items?: Array<{ english?: string; urdu?: string; romanUrdu?: string }>;
        error?: string;
      };
      if (!res.ok || !Array.isArray(data.items)) {
        throw new Error(data.error || 'Scene dialogue translation failed');
      }
      const nextScenes = scenes.map((sc, idx) => {
        const tr = data.items?.[idx];
        if (!tr) return sc;
        return {
          ...sc,
          dialogueLine: tr.english || sc.dialogueLine,
          dialogueUrdu: tr.urdu || sc.dialogueUrdu,
          dialogueRomanUrdu: tr.romanUrdu || sc.dialogueRomanUrdu,
        };
      });
      setScenes(nextScenes);
      pushLiveMediaUpdate(nextScenes);
      onNotice('Synced English, Urdu Nastaliq (اردو), and Roman Urdu across all scenes!');
    } catch (err) {
      onNotice(err instanceof Error ? err.message : 'Dialogue translation failed');
    } finally {
      setIsTranslatingScenes(false);
    }
  };

  // Synthesize & Preview a Single Scene's Character Voice (Multilingual Urdu / English + PCM Lip-Sync)
  const handleSynthesizeSingleSceneVoice = async (sceneIdx: number) => {
    const sc = scenes[sceneIdx];
    if (!sc) return;
    setPipelineError(null);
    setSceneVoiceLoadingMap((prev) => ({ ...prev, [sceneIdx]: true }));
    const lang = sc.spokenLanguage || globalSceneVoiceLang;

    try {
      const authHeaders = await buildUserAuthHeaders(currentUser || null);
      const res = await fetch('/api/video/scene-voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          title: `${storyTitle} · Scene ${sceneIdx + 1}`,
          speakerName: sc.speakerName || 'Character',
          dialogueLine: sc.dialogueLine || sc.subtext,
          dialogueUrdu: sc.dialogueUrdu || '',
          dialogueRomanUrdu: sc.dialogueRomanUrdu || '',
          language: lang,
          voiceName: sc.speakerVoice || 'Fenrir',
          speakerPitch: sc.speakerPitch ?? 1.0,
          durationSec: sc.durationSec || 4,
          sfxMood: sc.sfxMood || 'Cinematic Ambience',
          sceneIdx,
          projectId: activeProjectId ?? 1,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        clipId?: string;
        audioUrl?: string;
        audioDataUrl?: string;
        durationSec?: number;
        lipSyncEnvelope?: number[];
        spokenText?: string;
        modelUsed?: string;
        error?: string;
      };
      if (!res.ok || (!data.audioDataUrl && !data.audioUrl)) {
        throw new Error(data.error || `Voice synthesis failed for Scene ${sceneIdx + 1}`);
      }

      const resolvedAudio = data.audioUrl || data.audioDataUrl!;
      const nextScenes = scenes.map((item, idx) =>
        idx === sceneIdx
          ? {
              ...item,
              spokenLanguage: lang,
              audioUrl: data.audioUrl,
              audioDataUrl: resolvedAudio,
              audioClipId: data.clipId,
              durationSec: data.durationSec || item.durationSec || 4,
              lipSyncEnvelope: data.lipSyncEnvelope || [],
              synthError: undefined,
            }
          : item,
      );
      setScenes(nextScenes);
      pushLiveMediaUpdate(nextScenes);

      if (currentUser?.uid && data.clipId) {
        void saveUserArtifactToFirestore(currentUser.uid, {
          id: data.clipId,
          kind: 'audio',
          title: `Scene ${sceneIdx + 1} (${sc.speakerName} · ${lang.toUpperCase()})`,
          description: data.spokenText || sc.dialogueLine || sc.subtext,
          createdAt: new Date().toISOString(),
        });
      }

      if (sceneAudioPreviewRef.current) {
        sceneAudioPreviewRef.current.src = resolvedAudio;
        void sceneAudioPreviewRef.current.play().catch(() => {});
      }
      onNotice(
        `Synthesized Scene ${sceneIdx + 1} (${sc.speakerName} · ${sc.speakerVoice} · ${lang.toUpperCase()}) with ${data.lipSyncEnvelope?.length || 0} lip-sync frames`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Scene voice synthesis failed.';
      setScenes((prev) =>
        prev.map((item, idx) => (idx === sceneIdx ? { ...item, synthError: msg } : item)),
      );
      setPipelineError(msg);
      onNotice(msg);
    } finally {
      setSceneVoiceLoadingMap((prev) => ({ ...prev, [sceneIdx]: false }));
    }
  };

  // Step 3: Synthesize Multi-Character Master Audio Track across All Scenes
  const runMultiCharacterVoiceStep = async (
    inputScenes = scenes,
    signal?: AbortSignal,
  ): Promise<{ masterUrl: string; updatedScenes: VideoStudioSceneItem[] } | null> => {
    setPipelineError(null);
    setFailedStepKey(null);
    setStepStatus((prev) => ({ ...prev, voice: 'running' }));
    setProgressDetail(
      `Synthesizing multilingual (${globalSceneVoiceLang.toUpperCase()}) voices & PCM lip-sync envelopes...`,
    );

    try {
      const authHeaders = await buildUserAuthHeaders(currentUser || null);
      const scenesPayload = inputScenes.map((s) => ({
        ...s,
        spokenLanguage: s.spokenLanguage || globalSceneVoiceLang,
      }));
      const res = await fetch('/api/video/dialogue-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({ scenes: scenesPayload }),
        signal,
      });
      const data = (await res.json().catch(() => ({}))) as {
        masterAudioUrl?: string;
        sceneAudioUrls?: Array<string | null>;
        sceneLipSyncEnvelopes?: number[][];
        sceneDurations?: number[];
        error?: string;
      };
      if (!res.ok || !data.masterAudioUrl) {
        throw new Error(data.error || 'Multi-character voice synthesis failed.');
      }

      const withAudio = inputScenes.map((sc, idx) => ({
        ...sc,
        spokenLanguage: sc.spokenLanguage || globalSceneVoiceLang,
        audioDataUrl: data.sceneAudioUrls?.[idx] || sc.audioDataUrl,
        lipSyncEnvelope: data.sceneLipSyncEnvelopes?.[idx] || sc.lipSyncEnvelope,
        durationSec: data.sceneDurations?.[idx] || sc.durationSec || 4,
        synthError: undefined,
      }));
      setScenes(withAudio);
      setMasterAudioUrl(data.masterAudioUrl);
      setStepStatus((prev) => ({ ...prev, voice: 'completed' }));
      setProgressDetail('Master multilingual voiceover, per-scene WAVs & PCM lip-sync envelopes ready');
      pushLiveMediaUpdate(withAudio, { masterAudioUrl: data.masterAudioUrl });
      onNotice('Multi-character voiceover & PCM lip-sync envelopes synthesized');
      return { masterUrl: data.masterAudioUrl, updatedScenes: withAudio };
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') {
        setStepStatus((prev) => ({ ...prev, voice: 'cancelled' }));
        return null;
      }
      const msg = err instanceof Error ? err.message : 'Multi-character voice synthesis failed.';
      setStepStatus((prev) => ({ ...prev, voice: 'error' }));
      setFailedStepKey('voice');
      setPipelineError(msg);
      onNotice(`Voice synthesis error: ${msg}`);
      return null;
    }
  };

  // Step 4: Trigger Google Veo 3.1 Video Generation + Sync Final Multi-Scene Production
  const runVeoAnimationStep = async (
    inputScenes = scenes,
    inputMasterAudio = masterAudioUrl,
    signal?: AbortSignal,
  ): Promise<boolean> => {
    setPipelineError(null);
    setFailedStepKey(null);
    setStepStatus((prev) => ({ ...prev, video: 'running' }));
    setProgressDetail('Starting Google Veo 3.1 animation & multi-scene lip-sync render...');

    try {
      const requestId = `vid-req-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const currentSceneImage = inputScenes[selectedSceneIdx]?.imageUrl || inputScenes[0]?.imageUrl || '';
      const combinedPrompt = `${visualStyle} animated production (${aspectRatio}): ${storyTitle} — ${logline}. ${inputScenes
        .map(
          (s, i) =>
            `Scene ${i + 1} (${s.speakerName || 'Character'}): ${s.visualPrompt3D || s.subtext}`,
        )
        .join(' ')}`;

      const authHeaders = await buildUserAuthHeaders(currentUser || null);
      const res = await fetch('/api/video/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          ...authHeaders,
        },
        body: JSON.stringify({
          requestId,
          prompt: combinedPrompt,
          aspectRatio,
          resolution: '720p',
          imageUrl: currentSceneImage,
        }),
        signal,
      });

      const data = (await res.json().catch(() => ({}))) as {
        requestId?: string;
        operationName?: string;
        done?: boolean;
        model?: string;
        error?: string;
      };

      if (!res.ok || !data.operationName) {
        throw new Error(
          data.error || `Google Veo video generation failed to start (HTTP ${res.status}).`,
        );
      }

      setVeoOperationName(data.operationName);
      setProgressDetail(
        `Veo 3.1 operation (${data.model || 'veo-3.1'}) active. Waiting for render to complete...`,
      );

      let isDone = Boolean(data.done);
      let streamUrl: string | undefined = undefined;
      let pollCount = 0;
      const maxPollAttempts = 60; // poll for up to 4 minutes

      while (!isDone && pollCount < maxPollAttempts) {
        if (signal?.aborted) {
          setStepStatus((prev) => ({ ...prev, video: 'cancelled' }));
          return false;
        }
        await new Promise((r) => setTimeout(r, 4000));
        if (signal?.aborted) return false;
        pollCount++;
        setProgressDetail(`Waiting for Veo 3.1 video render to finish (${pollCount * 4}s)...`);

        const pollRes = await fetch('/api/video/status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            ...authHeaders,
          },
          body: JSON.stringify({ operationName: data.operationName, requestId }),
          signal,
        });

        const statusData = (await pollRes.json().catch(() => ({}))) as {
          done?: boolean;
          hasVideo?: boolean;
          streamUrl?: string | null;
          error?: string;
          cancelled?: boolean;
        };

        if (statusData.cancelled) {
          setStepStatus((prev) => ({ ...prev, video: 'cancelled' }));
          return false;
        }

        if (statusData.error) {
          throw new Error(statusData.error);
        }

        if (statusData.done) {
          isDone = true;
          if (statusData.hasVideo && statusData.streamUrl) {
            streamUrl = statusData.streamUrl;
          } else {
            throw new Error('Veo video generation completed without output video.');
          }
        }
      }

      if (!isDone) {
        throw new Error('Veo video generation timed out while waiting for output.');
      }

      setVeoStreamUrl(streamUrl);
      setStepStatus((prev) => ({ ...prev, video: 'completed' }));
      setProgressDetail(
        `Veo 3.1 operation complete & synchronized with live preview player`,
      );
      pushLiveMediaUpdate(inputScenes, {
        masterAudioUrl: inputMasterAudio,
        videoOperationName: data.operationName,
        url: streamUrl,
      });
      onNotice('Google Veo 3.1 video render completed and synced with player');
      return true;
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') {
        setStepStatus((prev) => ({ ...prev, video: 'cancelled' }));
        return false;
      }
      const msg = err instanceof Error ? err.message : 'Veo 3.1 video generation failed.';
      setStepStatus((prev) => ({ ...prev, video: 'error' }));
      setFailedStepKey('video');
      setPipelineError(msg);
      setProgressDetail(`Video Generation Error: ${msg}`);
      onNotice(`Video generation error: ${msg}`);
      return false;
    }
  };

  // Run Full End-to-End Production Pipeline (Prompt -> Script -> Scenes -> Characters -> Dialogue -> Voice -> Video)
  const handleRunFullProductionPipeline = async ( regenerateScriptFirst = true ) => {
    if (isRunningPipeline) return;
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsRunningPipeline(true);
    setPipelineError(null);
    setFailedStepKey(null);
    setProgressPercent(5);

    try {
      let workingScenes = scenes;
      let workingChars = characters;
      let workingTitle = storyTitle;

      if (regenerateScriptFirst) {
        setProgressPercent(10);
        const scriptResult = await runScriptPlanStep(controller.signal);
        if (!scriptResult) {
          setIsRunningPipeline(false);
          return;
        }
        workingScenes = scriptResult.scenes;
        workingChars = scriptResult.characters;
        workingTitle = scriptResult.title;
      }

      setProgressPercent(30);
      const renderedScenes = await runAllScenesKeyframesStep(
        workingScenes,
        workingChars,
        controller.signal,
      );
      if (!renderedScenes) {
        setIsRunningPipeline(false);
        return;
      }
      workingScenes = renderedScenes;

      setProgressPercent(65);
      const voiceResult = await runMultiCharacterVoiceStep(workingScenes, controller.signal);
      if (!voiceResult) {
        setIsRunningPipeline(false);
        return;
      }
      workingScenes = voiceResult.updatedScenes;

      setProgressPercent(85);
      const videoSuccess = await runVeoAnimationStep(workingScenes, voiceResult.masterUrl, controller.signal);
      if (!videoSuccess) {
        setIsRunningPipeline(false);
        return;
      }

      setProgressPercent(100);
      setProgressDetail(`Production "${workingTitle}" complete and loaded in Final Video player`);
      await handleSaveProductionRecord('completed', workingTitle, workingScenes, workingChars, voiceResult.masterUrl);
      setActiveStage('final');
    } finally {
      setIsRunningPipeline(false);
      abortControllerRef.current = null;
    }
  };

  // Retry only the failed step
  const handleRetryFailedStep = async () => {
    if (!failedStepKey || isRunningPipeline) return;
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsRunningPipeline(true);
    setPipelineError(null);

    try {
      if (failedStepKey === 'script') {
        await runScriptPlanStep(controller.signal);
      } else if (failedStepKey === 'scenes') {
        await runAllScenesKeyframesStep(scenes, characters, controller.signal);
      } else if (failedStepKey === 'voice') {
        await runMultiCharacterVoiceStep(scenes, controller.signal);
      } else if (failedStepKey === 'video') {
        await runVeoAnimationStep(scenes, masterAudioUrl, controller.signal);
      }
    } finally {
      setIsRunningPipeline(false);
      abortControllerRef.current = null;
    }
  };

  // Save production to backend & Cloud Firestore
  const handleSaveProductionRecord = async (
    statusVal: SavedVideoProductionItem['status'] = 'draft',
    overrideTitle?: string,
    overrideScenes?: VideoStudioSceneItem[],
    overrideChars?: VideoStudioCharacter[],
    overrideAudio?: string,
  ) => {
    const payload = {
      title: overrideTitle || storyTitle,
      prompt: promptText,
      logline,
      narrativeScript,
      visualStyle,
      aspectRatio,
      language: dialogueLanguage,
      projectId: activeProjectId ?? 1,
      characters: overrideChars || characters,
      scenes: overrideScenes || scenes,
      masterAudioUrl: overrideAudio || masterAudioUrl,
      videoOperationName: veoOperationName,
      compiledVideoUrl: veoStreamUrl,
      status: statusVal,
    };

    try {
      const authHeaders = await buildUserAuthHeaders(currentUser || null);
      const res = await fetch('/api/video-studio/productions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as {
        production?: SavedVideoProductionItem;
      };
      if (res.ok && data.production) {
        setSavedProductions((prev) => [
          data.production!,
          ...prev.filter((p) => p.id !== data.production!.id),
        ]);
        if (currentUser?.uid) {
          void saveUserArtifactToFirestore(currentUser.uid, {
            id: data.production.id,
            kind: 'video',
            title: data.production.title,
            description: `${data.production.scenes.length}-Scene · ${data.production.characters.length}-Character Video Production (${data.production.aspectRatio})`,
            createdAt: new Date().toISOString(),
          });
        }
        onNotice(`Saved production "${data.production.title}"`);
      }
    } catch {
      // ignore network error
    }
  };

  // Export full production JSON (script, characters, scenes, voices)
  const handleExportProductionJson = () => {
    const bundle = {
      title: storyTitle,
      prompt: promptText,
      logline,
      narrativeScript,
      visualStyle,
      aspectRatio,
      language: dialogueLanguage,
      characters,
      scenes,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${storyTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'saz-video-production'}-screenplay.json`;
    a.click();
    URL.revokeObjectURL(url);
    onNotice('Exported production screenplay, cast & storyboard JSON');
  };

  // Helper to update a single scene field and keep live preview in sync
  const updateSceneAt = (idx: number, patch: Partial<VideoStudioSceneItem>) => {
    setScenes((prev) => {
      const next = prev.map((sc, i) => (i === idx ? { ...sc, ...patch } : sc));
      pushLiveMediaUpdate(next);
      return next;
    });
  };

  const activeScene = scenes[selectedSceneIdx] || scenes[0];

  const stages: Array<{ id: PipelineStageId; stepNum: number; label: string; badge: string }> = [
    { id: 'prompt', stepNum: 1, label: 'Prompt', badge: aspectRatio },
    { id: 'script', stepNum: 2, label: 'Script', badge: stepStatus.script === 'completed' ? '✓' : 'Edit' },
    { id: 'characters', stepNum: 3, label: 'Characters', badge: `${characters.length}` },
    { id: 'scenes', stepNum: 4, label: 'Scenes', badge: `${scenes.length}` },
    { id: 'dialogue', stepNum: 5, label: 'Dialogue', badge: `${scenes.length} lines` },
    { id: 'voice', stepNum: 6, label: 'Voice', badge: masterAudioUrl ? '✓ Ready' : 'TTS' },
    { id: 'stage3d', stepNum: 7, label: '3D Conversation', badge: 'Three.js' },
    { id: 'generate', stepNum: 8, label: 'Animation / Render', badge: isRunningPipeline ? `${progressPercent}%` : 'Veo 3.1' },
    { id: 'final', stepNum: 9, label: 'Final Video', badge: 'Export' },
  ];

  return (
    <div className="space-y-4">
      {/* Hidden audio element for single-scene voice preview */}
      <audio ref={sceneAudioPreviewRef} className="hidden" />

      {/* Top Production Workflow Header & 8-Stage Pipeline Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-400/15 px-2.5 py-1 text-[11px] font-extrabold text-amber-600 dark:text-amber-400">
              🎬 SAZ AI VIDEO STUDIO · END-TO-END PRODUCTION PIPELINE
            </span>
            <h2 className="mt-1 font-serif-display text-xl font-bold text-slate-900 dark:text-white">
              Prompt → Script → Scenes → Characters → Dialogue → Voice → Animation → Final Video
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isRunningPipeline ? (
              <button
                type="button"
                onClick={() => void handleCancelGeneration()}
                className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-extrabold text-white shadow-xs transition hover:bg-rose-500"
              >
                <span>⏹ Cancel Generation ({elapsedSeconds}s)</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => void handleRunFullProductionPipeline(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-xs font-extrabold text-slate-950 shadow-xs transition hover:bg-amber-300"
                >
                  <Sparkles size={14} />
                  <span>Run Full AI Production</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleSaveProductionRecord('draft')}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 transition hover:border-amber-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <FolderKanban size={13} />
                  <span>Save Project</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportProductionJson}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <FileJson size={13} />
                  <span>Export Script JSON</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* 9-Step Interactive Workflow Stepper */}
        <div className="mt-4 grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-9">
          {stages.map((st) => {
            const isCurrent = activeStage === st.id;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => setActiveStage(st.id)}
                className={`flex flex-col items-start justify-between rounded-xl border p-2.5 text-left transition ${
                  isCurrent
                    ? 'border-amber-400 bg-amber-400/15 text-slate-950 dark:text-white'
                    : 'border-slate-200/80 bg-slate-50/70 text-slate-700 hover:border-amber-400/50 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300'
                }`}
              >
                <div className="flex w-full items-center justify-between gap-1">
                  <span className="rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-400 dark:bg-slate-800">
                    0{st.stepNum}
                  </span>
                  <span className="truncate text-[10px] font-bold text-amber-600 dark:text-amber-400">
                    {st.badge}
                  </span>
                </div>
                <div className="mt-1.5 truncate text-xs font-extrabold">{st.label}</div>
              </button>
            );
          })}
        </div>

        {/* Live Generation Progress & Error/Retry Alert Banner */}
        {(isRunningPipeline || pipelineError) && (
          <div
            className={`mt-4 rounded-xl border p-3.5 ${
              pipelineError
                ? 'border-rose-500/40 bg-rose-500/10 text-rose-800 dark:text-rose-200'
                : 'border-amber-400/40 bg-amber-500/10 text-slate-900 dark:text-slate-100'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold">
                {pipelineError ? (
                  <AlertTriangle size={15} className="text-rose-500 shrink-0" />
                ) : (
                  <RefreshCw size={15} className="animate-spin text-amber-500 shrink-0" />
                )}
                <span>{pipelineError || progressDetail}</span>
              </div>
              <div className="flex items-center gap-2">
                {pipelineError && failedStepKey && (
                  <button
                    type="button"
                    onClick={() => void handleRetryFailedStep()}
                    className="rounded-lg bg-amber-400 px-3 py-1 text-xs font-extrabold text-slate-950 hover:bg-amber-300"
                  >
                    ↻ Retry Failed Step ({failedStepKey.toUpperCase()})
                  </button>
                )}
                {isRunningPipeline && (
                  <button
                    type="button"
                    onClick={() => void handleCancelGeneration()}
                    className="rounded-lg bg-rose-600 px-3 py-1 text-xs font-extrabold text-white hover:bg-rose-500"
                  >
                    Cancel
                  </button>
                )}
                {pipelineError && (
                  <button
                    type="button"
                    onClick={() => setPipelineError(null)}
                    className="rounded-lg border border-slate-300 px-2.5 py-1 text-[11px] font-semibold dark:border-slate-700"
                  >
                    Dismiss
                  </button>
                )}
              </div>
            </div>
            {isRunningPipeline && (
              <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className="h-full bg-amber-400 transition-all duration-300"
                  style={{ width: `${Math.max(5, Math.min(100, progressPercent))}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* Stage 1: PROMPT */}
        {activeStage === 'prompt' && (
          <div className="mt-4 space-y-4 border-t border-slate-200 pt-4 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Step 1 · Story Prompt &amp; Production Configuration
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {[
                  {
                    label: '🦁🐜 Sher aur Cheenti',
                    prompt:
                      'Create a 3D Disney/Pixar animated story for "Sher aur Cheenti" (The Lion and the Ant) with 5 sequential scenes, multi-character dialogue between Sher and Cheenti, and a heartwarming moral lesson.',
                  },
                  {
                    label: '🦊🐓 Clever Fox & Rooster',
                    prompt:
                      'Create a 3D Disney/Pixar animated fable about a cunning fox trying to flatter a wise rooster perched on a high oak tree, with witty back-and-forth dialogue and forest alarm rescue.',
                  },
                  {
                    label: '🌱🍅 Veggie Village Rescue',
                    prompt:
                      'Create a 3D Pixar animated adventure in Veggie Village where Mayor Tomato and Pip the Baby Carrot build a leaf bridge during a sudden summer rainstorm.',
                  },
                  {
                    label: '🚀🤖 Cosmic Robot & Explorer',
                    prompt:
                      'Create a cinematic 3D sci-fi animated short about Captain Aria and her witty companion droid Bolt discovering a bioluminescent crystal cavern on Europa.',
                  },
                ].map((preset) => (
                  <button
                    type="button"
                    key={preset.label}
                    onClick={() => setPromptText(preset.prompt)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-800 transition hover:border-amber-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              rows={3}
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="Describe your video concept, characters, setting, conflict, and tone..."
              className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3.5 text-sm text-slate-900 outline-none focus:border-amber-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">
                  Visual Animation Style
                </label>
                <select
                  value={visualStyle}
                  onChange={(e) => setVisualStyle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="Disney/Pixar 3D CGI">Disney / Pixar 3D CGI</option>
                  <option value="Unreal Engine 5 Cinematic 3D">Unreal Engine 5 Cinematic 3D</option>
                  <option value="DreamWorks Feature 3D">DreamWorks Feature 3D</option>
                  <option value="Cyberpunk Anime 3D">Cyberpunk Stylized 3D</option>
                  <option value="Stop-Motion Claymation 3D">Stop-Motion Studio 3D</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">
                  Aspect Ratio
                </label>
                <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                  {(['9:16', '16:9'] as const).map((ratio) => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => {
                        setAspectRatio(ratio);
                        pushLiveMediaUpdate(scenes, { aspectRatio: ratio });
                      }}
                      className={`rounded-lg py-1.5 text-xs font-bold transition ${
                        aspectRatio === ratio
                          ? 'bg-amber-400 text-slate-950'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {ratio === '9:16' ? '9:16 Vertical' : '16:9 Wide'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">
                  Number of Scenes ({targetSceneCount})
                </label>
                <input
                  type="range"
                  min={2}
                  max={8}
                  value={targetSceneCount}
                  onChange={(e) => setTargetSceneCount(Number(e.target.value))}
                  className="mt-2 w-full accent-amber-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">
                  Dialogue &amp; Subtitle Language
                </label>
                <select
                  value={dialogueLanguage}
                  onChange={(e) => setDialogueLanguage(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="Bilingual (English + Roman Urdu/Hindi)">
                    Bilingual (English + Urdu/Hindi)
                  </option>
                  <option value="English">English Only</option>
                  <option value="Urdu & Roman Urdu">Urdu &amp; Roman Urdu</option>
                  <option value="Hindi">Hindi</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="button"
                disabled={isRunningPipeline}
                onClick={async () => {
                  const res = await runScriptPlanStep();
                  if (res) setActiveStage('script');
                }}
                className="flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-2.5 text-xs font-extrabold text-slate-950 shadow-xs transition hover:bg-amber-300 disabled:opacity-50"
              >
                <Wand2 size={14} />
                <span>1. Generate AI Script, Characters &amp; Scenes</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveStage('script')}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                Next: Edit Script →
              </button>
            </div>
          </div>
        )}

        {/* Stage 2: SCRIPT */}
        {activeStage === 'script' && (
          <div className="mt-4 space-y-4 border-t border-slate-200 pt-4 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Step 2 · Production Screenplay &amp; Narrative Overview
              </h3>
              <button
                type="button"
                disabled={isRunningPipeline}
                onClick={() => void runScriptPlanStep()}
                className="flex items-center gap-1.5 rounded-xl bg-amber-400/20 px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-400/30 dark:text-amber-300"
              >
                <RefreshCw size={12} />
                <span>Regenerate Script from Prompt</span>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">
                  Production Title
                </label>
                <input
                  value={storyTitle}
                  onChange={(e) => {
                    setStoryTitle(e.target.value);
                    pushLiveMediaUpdate(scenes, { title: e.target.value });
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">
                  Logline
                </label>
                <input
                  value={logline}
                  onChange={(e) => setLogline(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">
                Master Screenplay &amp; Stage Directions
              </label>
              <textarea
                rows={6}
                value={narrativeScript}
                onChange={(e) => setNarrativeScript(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3.5 font-mono text-xs leading-relaxed text-slate-900 outline-none focus:border-amber-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveStage('characters')}
                className="rounded-xl bg-amber-400 px-4 py-2 text-xs font-extrabold text-slate-950 hover:bg-amber-300"
              >
                Next: Manage Characters ({characters.length}) →
              </button>
            </div>
          </div>
        )}

        {/* Stage 3: CHARACTERS */}
        {activeStage === 'characters' && (
          <div className="mt-4 space-y-4 border-t border-slate-200 pt-4 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Step 3 · Multi-Character Cast &amp; Voice Persona Assignment ({characters.length} Characters)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Define multiple characters, their 3D visual look for scene consistency, and their assigned Google AI neural voice.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const idx = characters.length + 1;
                  const newChar: VideoStudioCharacter = {
                    id: `char-${Date.now()}`,
                    name: `Character ${idx}`,
                    role: 'Supporting Character',
                    avatarEmoji: ['🦊', '🐓', '🧒', '🤖', '🦉', '🐯'][idx % 6],
                    visualDescription: `Expressive ${visualStyle} 3D character with distinct costume and warm lighting`,
                    voiceName: VOICE_OPTIONS[idx % VOICE_OPTIONS.length].id,
                    pitch: VOICE_OPTIONS[idx % VOICE_OPTIONS.length].defaultPitch,
                    accentColor: ['#38BDF8', '#EC4899', '#A855F7', '#F59E0B'][idx % 4],
                  };
                  setCharacters((prev) => [...prev, newChar]);
                  onNotice(`Added ${newChar.name} to cast`);
                }}
                className="rounded-xl bg-amber-400 px-3.5 py-2 text-xs font-extrabold text-slate-950 hover:bg-amber-300"
              >
                + Add Character
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {characters.map((char, cIdx) => (
                <div
                  key={char.id}
                  className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/60"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <input
                        value={char.avatarEmoji}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCharacters((prev) =>
                            prev.map((c, i) => (i === cIdx ? { ...c, avatarEmoji: val } : c)),
                          );
                        }}
                        className="h-9 w-9 rounded-lg border border-slate-300 bg-white text-center text-base dark:border-slate-700 dark:bg-slate-900"
                        title="Character Emoji"
                      />
                      <div>
                        <input
                          value={char.name}
                          onChange={(e) => {
                            const newName = e.target.value;
                            setCharacters((prev) =>
                              prev.map((c, i) => (i === cIdx ? { ...c, name: newName } : c)),
                            );
                            // Also update scenes assigned to this character
                            setScenes((prevScenes) => {
                              const updated = prevScenes.map((sc) =>
                                sc.characterId === char.id ? { ...sc, speakerName: newName } : sc,
                              );
                              pushLiveMediaUpdate(updated);
                              return updated;
                            });
                          }}
                          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-extrabold text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                        <input
                          value={char.role}
                          onChange={(e) => {
                            const newRole = e.target.value;
                            setCharacters((prev) =>
                              prev.map((c, i) => (i === cIdx ? { ...c, role: newRole } : c)),
                            );
                          }}
                          className="mt-1 block w-full rounded border border-transparent bg-transparent px-1 text-[11px] text-slate-500 focus:border-slate-300 dark:text-slate-400"
                        />
                      </div>
                    </div>

                    {characters.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const remaining = characters.filter((_, i) => i !== cIdx);
                          setCharacters(remaining);
                          onNotice(`Removed ${char.name}`);
                        }}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-500/10 hover:text-rose-500"
                        title="Remove Character"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                      3D Visual Appearance Prompt (Used in Scene Keyframes)
                    </label>
                    <textarea
                      rows={2}
                      value={char.visualDescription}
                      onChange={(e) => {
                        const desc = e.target.value;
                        setCharacters((prev) =>
                          prev.map((c, i) => (i === cIdx ? { ...c, visualDescription: desc } : c)),
                        );
                      }}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        Default Neural Voice
                      </label>
                      <select
                        value={char.voiceName}
                        onChange={(e) => {
                          const vName = e.target.value as VideoStudioCharacter['voiceName'];
                          const vPreset = VOICE_OPTIONS.find((v) => v.id === vName);
                          const nextPitch = vPreset?.defaultPitch ?? char.pitch;
                          setCharacters((prev) =>
                            prev.map((c, i) =>
                              i === cIdx ? { ...c, voiceName: vName, pitch: nextPitch } : c,
                            ),
                          );
                          setScenes((prevScenes) => {
                            const updated = prevScenes.map((sc) =>
                              sc.characterId === char.id
                                ? { ...sc, speakerVoice: vName, speakerPitch: nextPitch }
                                : sc,
                            );
                            pushLiveMediaUpdate(updated);
                            return updated;
                          });
                        }}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      >
                        {VOICE_OPTIONS.map((vo) => (
                          <option key={vo.id} value={vo.id}>
                            {vo.label} ({vo.timbre})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        Vocal Pitch ({char.pitch.toFixed(2)}x)
                      </label>
                      <input
                        type="range"
                        min={0.6}
                        max={1.5}
                        step={0.04}
                        value={char.pitch}
                        onChange={(e) => {
                          const pVal = Number(e.target.value);
                          setCharacters((prev) =>
                            prev.map((c, i) => (i === cIdx ? { ...c, pitch: pVal } : c)),
                          );
                          setScenes((prevScenes) => {
                            const updated = prevScenes.map((sc) =>
                              sc.characterId === char.id ? { ...sc, speakerPitch: pVal } : sc,
                            );
                            pushLiveMediaUpdate(updated);
                            return updated;
                          });
                        }}
                        className="mt-2.5 w-full accent-amber-400"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveStage('scenes')}
                className="rounded-xl bg-amber-400 px-4 py-2 text-xs font-extrabold text-slate-950 hover:bg-amber-300"
              >
                Next: Edit Storyboard Scenes ({scenes.length}) →
              </button>
            </div>
          </div>
        )}

        {/* Stage 4: SCENES */}
        {activeStage === 'scenes' && (
          <div className="mt-4 space-y-4 border-t border-slate-200 pt-4 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Step 4 · Multi-Scene Storyboard &amp; Visual Keyframe Editor ({scenes.length} Scenes)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Add, reorder, or edit scenes, camera framing, duration, and render real 3D keyframes with Imagen 3 / Gemini Image.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={isRunningPipeline}
                  onClick={() => void runAllScenesKeyframesStep()}
                  className="flex items-center gap-1.5 rounded-xl bg-amber-400 px-3.5 py-2 text-xs font-extrabold text-slate-950 hover:bg-amber-300 disabled:opacity-50"
                >
                  <ImageIcon size={13} />
                  <span>Render All {scenes.length} Scene Keyframes</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const nextNum = scenes.length + 1;
                    const defaultChar = characters[(nextNum - 1) % characters.length] || characters[0];
                    const newScene: VideoStudioSceneItem = {
                      headline: `Scene ${nextNum} · New Story Beat`,
                      subtext: `${defaultChar?.name || 'Character'} takes action in Scene ${nextNum}.`,
                      bgGradient: ['#0F172A', '#1E1B4B'],
                      accentColor: defaultChar?.accentColor || '#F59E0B',
                      durationSec: 4,
                      motionStyle: 'zoom',
                      visualPrompt3D: `${visualStyle} ${aspectRatio} frame: ${defaultChar?.visualDescription || '3D animated character'} in Scene ${nextNum}, volumetric lighting.`,
                      cameraMove: '3D Cinematic Dolly In',
                      cameraShotType: 'close_up_a',
                      lightingMood: 'Golden Hour Volumetric Lighting',
                      sfxMood: 'Cinematic Orchestral Score',
                      characterId: defaultChar?.id,
                      speakerName: defaultChar?.name || 'Character 1',
                      speakerVoice: defaultChar?.voiceName || 'Fenrir',
                      speakerPitch: defaultChar?.pitch || 1.0,
                      dialogueLine: `Let us move forward together in Scene ${nextNum}!`,
                      dialogueUrdu: '',
                      facialExpression: 'Determined & Expressive',
                    };
                    const updated = [...scenes, newScene];
                    setScenes(updated);
                    setSelectedSceneIdx(updated.length - 1);
                    pushLiveMediaUpdate(updated);
                    onNotice(`Added Scene ${nextNum}`);
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  + Add Scene
                </button>
              </div>
            </div>

            {/* Horizontal Scene Strip Selector */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {scenes.map((sc, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedSceneIdx(idx)}
                  className={`flex w-44 shrink-0 flex-col overflow-hidden rounded-xl border p-2 text-left transition ${
                    selectedSceneIdx === idx
                      ? 'border-amber-400 bg-amber-400/15'
                      : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-extrabold text-amber-600 dark:text-amber-400">
                    <span>SCENE 0{idx + 1}</span>
                    <span>{sc.durationSec || 4}s</span>
                  </div>
                  <div className="mt-1 truncate text-xs font-bold text-slate-900 dark:text-white">
                    {sc.headline}
                  </div>
                  <div className="mt-0.5 truncate text-[10px] text-slate-500">
                    🎙 {sc.speakerName || 'Character'}
                  </div>
                </button>
              ))}
            </div>

            {/* Active Scene Detailed Editor */}
            {activeScene && (
              <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 lg:grid-cols-12 dark:border-slate-800 dark:bg-slate-950/60">
                <div className="space-y-3 lg:col-span-8">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      Editing Scene {selectedSceneIdx + 1} of {scenes.length}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={selectedSceneIdx === 0}
                        onClick={() => {
                          if (selectedSceneIdx === 0) return;
                          const copy = [...scenes];
                          const temp = copy[selectedSceneIdx - 1];
                          copy[selectedSceneIdx - 1] = copy[selectedSceneIdx];
                          copy[selectedSceneIdx] = temp;
                          setScenes(copy);
                          setSelectedSceneIdx(selectedSceneIdx - 1);
                          pushLiveMediaUpdate(copy);
                        }}
                        className="rounded-lg border border-slate-300 px-2 py-1 text-[11px] font-bold disabled:opacity-40 dark:border-slate-700"
                      >
                        ↑ Move Earlier
                      </button>
                      <button
                        type="button"
                        disabled={selectedSceneIdx >= scenes.length - 1}
                        onClick={() => {
                          if (selectedSceneIdx >= scenes.length - 1) return;
                          const copy = [...scenes];
                          const temp = copy[selectedSceneIdx + 1];
                          copy[selectedSceneIdx + 1] = copy[selectedSceneIdx];
                          copy[selectedSceneIdx] = temp;
                          setScenes(copy);
                          setSelectedSceneIdx(selectedSceneIdx + 1);
                          pushLiveMediaUpdate(copy);
                        }}
                        className="rounded-lg border border-slate-300 px-2 py-1 text-[11px] font-bold disabled:opacity-40 dark:border-slate-700"
                      >
                        ↓ Move Later
                      </button>
                      {scenes.length > 2 && (
                        <button
                          type="button"
                          onClick={() => {
                            const copy = scenes.filter((_, i) => i !== selectedSceneIdx);
                            setScenes(copy);
                            setSelectedSceneIdx(Math.max(0, selectedSceneIdx - 1));
                            pushLiveMediaUpdate(copy);
                            onNotice(`Removed Scene ${selectedSceneIdx + 1}`);
                          }}
                          className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[11px] font-bold text-rose-500"
                        >
                          Delete Scene
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">
                        Scene Headline
                      </label>
                      <input
                        value={activeScene.headline}
                        onChange={(e) =>
                          updateSceneAt(selectedSceneIdx, { headline: e.target.value })
                        }
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">
                        Duration ({activeScene.durationSec || 4} sec)
                      </label>
                      <input
                        type="number"
                        min={2}
                        max={12}
                        value={activeScene.durationSec || 4}
                        onChange={(e) =>
                          updateSceneAt(selectedSceneIdx, {
                            durationSec: Math.max(2, Math.min(12, Number(e.target.value) || 4)),
                          })
                        }
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">
                      Scene Action &amp; Staging Description
                    </label>
                    <textarea
                      rows={2}
                      value={activeScene.subtext}
                      onChange={(e) =>
                        updateSceneAt(selectedSceneIdx, { subtext: e.target.value })
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">
                      3D Keyframe Visual Prompt (Sent to Imagen 3 / Gemini Image)
                    </label>
                    <textarea
                      rows={2}
                      value={activeScene.visualPrompt3D || ''}
                      onChange={(e) =>
                        updateSceneAt(selectedSceneIdx, { visualPrompt3D: e.target.value })
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        Camera Shot Type
                      </label>
                      <select
                        value={activeScene.cameraShotType || 'close_up_a'}
                        onChange={(e) =>
                          updateSceneAt(selectedSceneIdx, {
                            cameraShotType: e.target.value as VideoStudioSceneItem['cameraShotType'],
                          })
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      >
                        <option value="close_up_a">Close-Up Speaker A</option>
                        <option value="close_up_b">Close-Up Speaker B</option>
                        <option value="wide_action">Wide Action Shot</option>
                        <option value="macro_action">Extreme Macro Shot</option>
                        <option value="over_shoulder">Two-Shot / Over-Shoulder</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        Motion Style
                      </label>
                      <select
                        value={activeScene.motionStyle || 'zoom'}
                        onChange={(e) =>
                          updateSceneAt(selectedSceneIdx, {
                            motionStyle: e.target.value as VideoStudioSceneItem['motionStyle'],
                          })
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      >
                        <option value="zoom">Cinematic Dolly Zoom</option>
                        <option value="pan">Orbital Tracking Pan</option>
                        <option value="kinetic">Dynamic Action Whip</option>
                        <option value="pulse">Gentle Breathing Pulse</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        Lighting Mood
                      </label>
                      <input
                        value={activeScene.lightingMood || 'Golden Hour Volumetric'}
                        onChange={(e) =>
                          updateSceneAt(selectedSceneIdx, { lightingMood: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Scene Keyframe Preview & Regenerate Button */}
                <div className="flex flex-col items-center justify-between space-y-2.5 lg:col-span-4">
                  <div className="relative aspect-[9/16] max-h-60 w-auto overflow-hidden rounded-xl border border-slate-300 bg-slate-900 dark:border-slate-700">
                    {activeScene.imageUrl ? (
                      <img
                        src={activeScene.imageUrl}
                        alt={activeScene.headline}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-56 w-36 items-center justify-center p-3 text-center text-[11px] text-slate-400">
                        No keyframe rendered yet
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={Boolean(sceneGeneratingMap[selectedSceneIdx])}
                    onClick={async () => {
                      try {
                        setPipelineError(null);
                        await generateSingleSceneImage(selectedSceneIdx);
                        onNotice(`Rendered Scene ${selectedSceneIdx + 1} keyframe with Google AI`);
                      } catch (err) {
                        const msg =
                          err instanceof Error ? err.message : 'Scene keyframe generation failed';
                        setPipelineError(msg);
                        onNotice(msg);
                      }
                    }}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-amber-400 hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-800"
                  >
                    <RefreshCw
                      size={13}
                      className={sceneGeneratingMap[selectedSceneIdx] ? 'animate-spin' : ''}
                    />
                    <span>
                      {sceneGeneratingMap[selectedSceneIdx]
                        ? 'Rendering AI Keyframe...'
                        : `Render Scene ${selectedSceneIdx + 1} Keyframe`}
                    </span>
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveStage('dialogue')}
                className="rounded-xl bg-amber-400 px-4 py-2 text-xs font-extrabold text-slate-950 hover:bg-amber-300"
              >
                Next: Edit Character Dialogue →
              </button>
            </div>
          </div>
        )}

        {/* Stage 5 & 6: DIALOGUE & VOICE */}
        {(activeStage === 'dialogue' || activeStage === 'voice') && (
          <div className="mt-4 space-y-4 border-t border-slate-200 pt-4 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {activeStage === 'dialogue'
                    ? 'Step 5 · Multilingual (Urdu & English) Character Dialogue Editor'
                    : 'Step 6 · Neural Voice Selection, PCM Lip-Sync Preview & Safe Audio Mix'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Assign speaking characters, edit English, Urdu Nastaliq (اردو) &amp; Roman Urdu dialogue, choose spoken language, and synthesize/preview voices with real PCM lip-sync.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={isTranslatingScenes}
                  onClick={() => void handleTranslateAllSceneDialogues()}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 hover:border-amber-400 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <RefreshCw size={13} className={isTranslatingScenes ? 'animate-spin' : ''} />
                  <span>
                    {isTranslatingScenes
                      ? 'Translating...'
                      : 'AI Sync Urdu (اردو) ↔ English'}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={isRunningPipeline}
                  onClick={() => void runMultiCharacterVoiceStep()}
                  className="flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-xs font-extrabold text-slate-950 hover:bg-amber-300 disabled:opacity-50"
                >
                  <Volume2 size={14} />
                  <span>
                    Synthesize All Scene Voices ({globalSceneVoiceLang.toUpperCase()})
                  </span>
                </button>
              </div>
            </div>

            {/* Global Spoken Language Selector Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-400/30 bg-amber-500/5 px-3.5 py-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                  Default Scene Voice Language:
                </span>
                {(
                  [
                    { id: 'urdu', label: '🇵🇰 Urdu (اردو)' },
                    { id: 'english', label: '🇬🇧 English' },
                    { id: 'roman_urdu', label: '🔤 Roman Urdu' },
                    { id: 'bilingual', label: '🌐 Bilingual (Urdu + EN)' },
                  ] as const
                ).map((langOpt) => (
                  <button
                    key={langOpt.id}
                    type="button"
                    onClick={() => {
                      setGlobalSceneVoiceLang(langOpt.id);
                      const updated = scenes.map((s) => ({ ...s, spokenLanguage: langOpt.id }));
                      setScenes(updated);
                      pushLiveMediaUpdate(updated);
                      onNotice(`Set all scenes to speak ${langOpt.label}`);
                    }}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                      globalSceneVoiceLang === langOpt.id
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300'
                    }`}
                  >
                    {langOpt.label}
                  </button>
                ))}
              </div>
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                ✓ 30fps PCM Lip-Sync Envelope + Safe Audio Vault Active
              </span>
            </div>

            <div className="space-y-3">
              {scenes.map((sc, idx) => {
                const assignedChar =
                  characters.find(
                    (c) => c.id === sc.characterId || c.name === sc.speakerName,
                  ) || characters[0];
                const sceneLang = sc.spokenLanguage || globalSceneVoiceLang;
                return (
                  <div
                    key={idx}
                    className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/60"
                  >
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                      {/* Scene Badge + Character + Voice + Spoken Language Dropdown */}
                      <div className="space-y-2 md:col-span-3">
                        <div className="flex items-center justify-between">
                          <span className="rounded-md bg-slate-900 px-2 py-0.5 text-[10px] font-extrabold text-amber-400">
                            Scene {idx + 1} · {sc.durationSec || 4}s
                          </span>
                          <span className="truncate text-[11px] font-bold text-slate-500">
                            {sc.headline}
                          </span>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-500">
                            Speaking Character
                          </label>
                          <select
                            value={assignedChar?.id || ''}
                            onChange={(e) => {
                              const picked = characters.find((c) => c.id === e.target.value);
                              if (picked) {
                                updateSceneAt(idx, {
                                  characterId: picked.id,
                                  speakerName: picked.name,
                                  speakerVoice: picked.voiceName,
                                  speakerPitch: picked.pitch,
                                  accentColor: picked.accentColor,
                                });
                              }
                            }}
                            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                          >
                            {characters.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.avatarEmoji} {c.name} ({c.voiceName})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5">
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-500">
                              Voice Persona
                            </label>
                            <select
                              value={sc.speakerVoice || assignedChar?.voiceName || 'Fenrir'}
                              onChange={(e) =>
                                updateSceneAt(idx, {
                                  speakerVoice: e.target.value as VideoStudioSceneItem['speakerVoice'],
                                })
                              }
                              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-[11px] font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                            >
                              {VOICE_OPTIONS.map((vo) => (
                                <option key={vo.id} value={vo.id}>
                                  🎙 {vo.id}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-500">
                              Spoken Lang
                            </label>
                            <select
                              value={sceneLang}
                              onChange={(e) =>
                                updateSceneAt(idx, {
                                  spokenLanguage: e.target.value as VideoStudioSceneItem['spokenLanguage'],
                                })
                              }
                              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-[11px] font-bold text-amber-700 dark:border-slate-700 dark:bg-slate-900 dark:text-amber-300"
                            >
                              <option value="urdu">🇵🇰 Urdu</option>
                              <option value="english">🇬🇧 English</option>
                              <option value="roman_urdu">🔤 Roman</option>
                              <option value="bilingual">🌐 Both</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Multilingual Dialogue Inputs: English + Urdu Nastaliq (اردو) + Roman Urdu */}
                      <div className="space-y-2 md:col-span-6">
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-500">
                            🇬🇧 English Dialogue Line
                          </label>
                          <input
                            value={sc.dialogueLine || ''}
                            onChange={(e) =>
                              updateSceneAt(idx, { dialogueLine: e.target.value })
                            }
                            placeholder="Enter English dialogue for this scene..."
                            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                          />
                        </div>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-amber-700 dark:text-amber-400">
                              🇵🇰 Urdu Nastaliq Script (اردو مکالمہ)
                            </label>
                            <input
                              dir="auto"
                              value={sc.dialogueUrdu || ''}
                              onChange={(e) =>
                                updateSceneAt(idx, { dialogueUrdu: e.target.value })
                              }
                              placeholder="اردو مکالمہ یہاں لکھیں..."
                              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-amber-900 dark:border-slate-700 dark:bg-slate-900 dark:text-amber-300"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-sky-700 dark:text-sky-400">
                              🔤 Roman Urdu Phonetic
                            </label>
                            <input
                              value={sc.dialogueRomanUrdu || ''}
                              onChange={(e) =>
                                updateSceneAt(idx, { dialogueRomanUrdu: e.target.value })
                              }
                              placeholder="Roman Urdu dialogue..."
                              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Per-Scene Voice Synthesis, Retry & Preview */}
                      <div className="flex flex-col justify-between space-y-2 md:col-span-3">
                        <button
                          type="button"
                          disabled={Boolean(sceneVoiceLoadingMap[idx])}
                          onClick={() => void handleSynthesizeSingleSceneVoice(idx)}
                          className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-amber-400 hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-800"
                        >
                          <Mic size={13} />
                          <span>
                            {sceneVoiceLoadingMap[idx]
                              ? 'Synthesizing...'
                              : sc.synthError
                                ? '↻ Retry Scene Voice'
                                : sc.audioDataUrl
                                  ? `↻ Re-Synthesize (${sceneLang.toUpperCase()})`
                                  : `Synthesize (${sceneLang.toUpperCase()}) Voice`}
                          </span>
                        </button>

                        {sc.synthError && (
                          <div className="rounded-lg bg-rose-500/10 px-2 py-1 text-[10px] font-semibold text-rose-500">
                            {sc.synthError}
                          </div>
                        )}

                        {sc.audioDataUrl ? (
                          <div className="space-y-1">
                            <audio
                              controls
                              src={sc.audioDataUrl}
                              className="h-8 w-full rounded-lg"
                            />
                            <div className="flex items-center justify-between text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                              <span>
                                ✓ {sc.lipSyncEnvelope?.length || 0} PCM Lip-Sync Frames
                              </span>
                              <a
                                href={sc.audioDataUrl}
                                download={`scene-${idx + 1}-voice.wav`}
                                className="underline"
                              >
                                Save WAV
                              </a>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-lg border border-dashed border-slate-300 p-2 text-center text-[10px] text-slate-400 dark:border-slate-700">
                            Click above to synthesize &amp; preview Scene {idx + 1} ({sceneLang.toUpperCase()}) voice
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveStage('generate')}
                className="rounded-xl bg-amber-400 px-4 py-2 text-xs font-extrabold text-slate-950 hover:bg-amber-300"
              >
                Next: Animation &amp; Video Generation →
              </button>
            </div>
          </div>
        )}

        {/* Stage 7: 3D CHARACTER CONVERSATION SCENE (THREE.JS) */}
        {activeStage === 'stage3d' && (
          <div className="mt-4 space-y-4 border-t border-slate-200 pt-4 dark:border-slate-800">
            <ThreeCharacterConversationStudio
              initialTitle={storyTitle}
              initialCharacters={characters.map((c, idx): CharacterActor3D => {
                const lowerName = `${c.name} ${c.avatarEmoji}`.toLowerCase();
                const inferredArchetype: CharacterArchetype3D =
                  lowerName.includes('sher') || lowerName.includes('lion') || lowerName.includes('🦁')
                    ? 'pixar_lion'
                    : lowerName.includes('cheenti') || lowerName.includes('ant') || lowerName.includes('🐜')
                      ? 'pixar_ant'
                      : lowerName.includes('fox') || lowerName.includes('lomri') || lowerName.includes('🦊')
                        ? 'clever_fox'
                        : lowerName.includes('droid') || lowerName.includes('robot') || lowerName.includes('🤖')
                          ? 'cyber_droid'
                          : idx % 2 === 0
                            ? 'stylized_human'
                            : 'royal_owl';
                return {
                  id: c.id,
                  name: c.name,
                  role: c.role,
                  archetype: inferredArchetype,
                  voiceName: c.voiceName,
                  pitch: c.pitch,
                  emotion: 'happy',
                  primaryColor: c.accentColor || '#F59E0B',
                  accentColor: '#38BDF8',
                  scale: 1.0,
                };
              })}
              initialTurns={scenes.map((sc, idx): ConversationDialogueTurn3D => {
                const matchedChar =
                  characters.find(
                    (c) => c.id === sc.characterId || c.name === sc.speakerName,
                  ) || characters[idx % characters.length];
                const exprLower = (sc.facialExpression || '').toLowerCase();
                const emotion: CharacterEmotion3D = exprLower.includes('excit')
                  ? 'excited'
                  : exprLower.includes('surpris')
                    ? 'surprised'
                    : exprLower.includes('angr')
                      ? 'angry'
                      : exprLower.includes('thought')
                        ? 'thoughtful'
                        : 'happy';
                return {
                  id: `turn-sync-${idx}`,
                  speakerId: matchedChar?.id || `char-1`,
                  dialogueLine: sc.dialogueLine || sc.subtext,
                  dialogueUrdu: sc.dialogueUrdu || '',
                  dialogueRomanUrdu: sc.dialogueRomanUrdu || '',
                  spokenLanguage: sc.spokenLanguage || globalSceneVoiceLang,
                  subtitleText: sc.dialogueUrdu || '',
                  emotion,
                  durationSec: sc.durationSec || 4,
                  audioDataUrl: sc.audioDataUrl,
                  audioUrl: sc.audioUrl,
                  lipSyncEnvelope: sc.lipSyncEnvelope,
                };
              })}
              onNotice={onNotice}
              onSyncToVideoStudio={(synced) => {
                setStoryTitle(synced.title);
                const updatedChars: VideoStudioCharacter[] = synced.characters.map((ac) => ({
                  id: ac.id,
                  name: ac.name,
                  role: ac.role,
                  avatarEmoji:
                    ac.archetype === 'pixar_lion'
                      ? '🦁'
                      : ac.archetype === 'pixar_ant'
                        ? '🐜'
                        : ac.archetype === 'cyber_droid'
                          ? '🤖'
                          : ac.archetype === 'clever_fox'
                            ? '🦊'
                            : '🧑',
                  visualDescription: `Expressive 3D ${ac.archetype.replace('_', ' ')} character (${ac.name})`,
                  voiceName: ac.voiceName,
                  pitch: ac.pitch,
                  accentColor: ac.primaryColor,
                }));
                setCharacters(updatedChars);

                const updatedScenes: VideoStudioSceneItem[] = synced.turns.map((t, idx) => {
                  const existing = scenes[idx];
                  const sp =
                    updatedChars.find((c) => c.id === t.speakerId) ||
                    updatedChars[idx % updatedChars.length];
                  return {
                    ...(existing || {
                      headline: `Scene ${idx + 1} · ${sp?.name || 'Dialogue'}`,
                      subtext: t.dialogueLine,
                      bgGradient: ['#064E3B', '#0F172A'] as [string, string],
                      accentColor: sp?.accentColor || '#F59E0B',
                      motionStyle: 'zoom' as const,
                    }),
                    durationSec: t.durationSec,
                    characterId: sp?.id,
                    speakerName: sp?.name || 'Character',
                    speakerVoice: sp?.voiceName || 'Fenrir',
                    speakerPitch: sp?.pitch ?? 1.0,
                    dialogueLine: t.dialogueLine,
                    dialogueUrdu: t.dialogueUrdu || t.subtitleText || existing?.dialogueUrdu || '',
                    dialogueRomanUrdu: t.dialogueRomanUrdu || existing?.dialogueRomanUrdu || '',
                    spokenLanguage: t.spokenLanguage || existing?.spokenLanguage || globalSceneVoiceLang,
                    facialExpression: `${t.emotion} expression`,
                    audioDataUrl: t.audioUrl || t.audioDataUrl || existing?.audioDataUrl,
                    audioUrl: t.audioUrl || existing?.audioUrl,
                    lipSyncEnvelope: t.lipSyncEnvelope || existing?.lipSyncEnvelope,
                  };
                });
                setScenes(updatedScenes);
                pushLiveMediaUpdate(updatedScenes, { title: synced.title });
                onNotice('Synced 3D Character Conversation cast & dialogue to Video Studio');
              }}
            />
          </div>
        )}

        {/* Stage 8: ANIMATION / VIDEO GENERATION PIPELINE */}
        {activeStage === 'generate' && (
          <div className="mt-4 space-y-4 border-t border-slate-200 pt-4 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Step 7 · Production Render Pipeline, Progress &amp; Retry/Cancel Controls
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Execute individual production stages or run the complete pipeline using Google Gemini, Imagen 3, Gemini TTS, and Veo 3.1.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isRunningPipeline ? (
                  <button
                    type="button"
                    onClick={() => void handleCancelGeneration()}
                    className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-rose-500"
                  >
                    ⏹ Cancel Active Generation ({elapsedSeconds}s)
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleRunFullProductionPipeline(false)}
                    className="flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-xs font-extrabold text-slate-950 hover:bg-amber-300"
                  >
                    <Play size={13} />
                    <span>Render Current Scenes + Voices + Veo Video</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  key: 'script' as const,
                  title: '1. AI Screenplay & Cast',
                  engine: 'Google Gemini 3.8 Flash',
                  status: stepStatus.script,
                  actionLabel: 'Regenerate Script',
                  onTrigger: () => void runScriptPlanStep(),
                },
                {
                  key: 'scenes' as const,
                  title: `2. ${scenes.length}-Scene 3D Keyframes`,
                  engine: 'Imagen 3 / Gemini 3.1 Image',
                  status: stepStatus.scenes,
                  actionLabel: 'Render Scene Keyframes',
                  onTrigger: () => void runAllScenesKeyframesStep(),
                },
                {
                  key: 'voice' as const,
                  title: `3. ${characters.length}-Character Voice Mix`,
                  engine: 'Gemini 3.8 Flash TTS',
                  status: stepStatus.voice,
                  actionLabel: 'Synthesize Voices',
                  onTrigger: () => void runMultiCharacterVoiceStep(),
                },
                {
                  key: 'video' as const,
                  title: '4. Veo 3.1 + Lip-Sync Video',
                  engine: 'Google Veo 3.1 + Compositor',
                  status: stepStatus.video,
                  actionLabel: 'Start Veo 3.1 Render',
                  onTrigger: () => void runVeoAnimationStep(),
                },
              ].map((item) => (
                <div
                  key={item.key}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                        {item.title}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                          item.status === 'completed'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : item.status === 'running'
                              ? 'bg-amber-400/20 text-amber-600 dark:text-amber-300'
                              : item.status === 'error'
                                ? 'bg-rose-500/20 text-rose-500'
                                : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">{item.engine}</div>
                  </div>
                  <button
                    type="button"
                    disabled={isRunningPipeline}
                    onClick={item.onTrigger}
                    className="mt-3 w-full rounded-lg border border-slate-300 bg-white py-1.5 text-xs font-bold text-slate-800 hover:border-amber-400 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    {item.status === 'error' ? `↻ Retry ${item.actionLabel}` : item.actionLabel}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stage 8: FINAL VIDEO & SAVED PRODUCTIONS */}
        {activeStage === 'final' && (
          <div className="mt-4 space-y-4 border-t border-slate-200 pt-4 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Step 8 · Final Video Master Monitor, Export &amp; Saved Productions
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Preview your multi-scene, multi-character animated production below and export as MP4/WebM video, Master WAV audio, or Screenplay JSON.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {masterAudioUrl && (
                  <a
                    href={masterAudioUrl}
                    download={`${storyTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-master-voices.wav`}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-extrabold text-slate-950 hover:bg-emerald-400"
                  >
                    <Download size={13} />
                    <span>Download Master WAV Audio</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={handleExportProductionJson}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <FileJson size={13} />
                  <span>Export Screenplay JSON</span>
                </button>
              </div>
            </div>

            {savedProductions.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  Saved Video Productions ({savedProductions.length})
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {savedProductions.slice(0, 6).map((prod) => (
                    <div
                      key={prod.id}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-950"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setStoryTitle(prod.title);
                          setPromptText(prod.prompt);
                          setLogline(prod.logline);
                          setNarrativeScript(prod.narrativeScript);
                          setVisualStyle(prod.visualStyle);
                          setAspectRatio(prod.aspectRatio);
                          setCharacters(prod.characters);
                          setScenes(prod.scenes);
                          setMasterAudioUrl(prod.masterAudioUrl);
                          pushLiveMediaUpdate(prod.scenes, {
                            title: prod.title,
                            prompt: prod.prompt,
                            masterAudioUrl: prod.masterAudioUrl,
                            aspectRatio: prod.aspectRatio,
                          });
                          onNotice(`Loaded production "${prod.title}"`);
                        }}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="truncate text-xs font-bold text-slate-900 dark:text-white">
                          {prod.title}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {prod.scenes.length} scenes · {prod.characters.length} characters ·{' '}
                          {prod.aspectRatio}
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const authHeaders = await buildUserAuthHeaders(currentUser || null);
                          await fetch(`/api/video-studio/productions/${encodeURIComponent(prod.id)}`, {
                            method: 'DELETE',
                            headers: authHeaders,
                          });
                          setSavedProductions((prev) => prev.filter((p) => p.id !== prod.id));
                          onNotice('Deleted saved production');
                        }}
                        className="ml-2 rounded p-1 text-slate-400 hover:text-rose-500"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

