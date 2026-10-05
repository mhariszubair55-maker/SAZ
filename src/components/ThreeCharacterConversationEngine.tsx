import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  Camera,
  Download,
  Maximize2,
  Mic,
  Pause,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  SkipForward,
  Sparkles,
  Trash2,
  Users,
  Volume2,
  VolumeX,
  Wand2,
} from 'lucide-react';
import { buildUserAuthHeaders } from '../firebase';

// ============================================================================
// 1. MODULAR ANIMATION & LIP-SYNC INTERFACES (PLUGGABLE ARCHITECTURE)
// ============================================================================

export type CharacterEmotion3D =
  | 'neutral'
  | 'happy'
  | 'excited'
  | 'thoughtful'
  | 'surprised'
  | 'angry'
  | 'empathetic';

export type CharacterArchetype3D =
  | 'stylized_human'
  | 'pixar_lion'
  | 'pixar_ant'
  | 'cyber_droid'
  | 'clever_fox'
  | 'royal_owl';

export type StageEnvironment3D =
  | 'studio_stage'
  | 'enchanted_forest'
  | 'cyber_lounge'
  | 'podcast_set';

export type CameraDirectorMode3D =
  | 'auto_speaker'
  | 'wide_group'
  | 'focus_character'
  | 'free_orbit';

export type NeuralVoiceId = 'Fenrir' | 'Kore' | 'Puck' | 'Charon' | 'Zephyr';

/**
 * Normalized facial & viseme blend targets (0..1 or -1..1).
 * External lip-sync engines (e.g. Rhubarb, ARKit 52 blendshapes, VRM morphs,
 * or WebAudio FFT formant extractors) only need to output this structure.
 */
export interface VisemeBlendState {
  jawOpen: number; // 0..1
  mouthSmile: number; // -1..1
  mouthPucker: number; // 0..1
  mouthWide: number; // 0..1
  browLift: number; // -1..1
  browTilt: number; // -1..1
  eyeBlinkLeft: number; // 0..1
  eyeBlinkRight: number; // 0..1
  eyeWide: number; // 0..1
  headPitch: number; // radians
  headYaw: number; // radians
  headRoll: number; // radians
}

export interface LipSyncSampleContext {
  timeSec: number;
  isSpeaking: boolean;
  dialogueText: string;
  turnProgress: number; // 0..1
  emotion: CharacterEmotion3D;
  audioAmplitude: number; // 0..1 from WebAudio AnalyserNode
  lowBandEnergy: number; // 0..1 vowel fundamental band
  highBandEnergy: number; // 0..1 fricative/sibilant band
  envelopeAmplitude?: number; // 0..1 from 30fps PCM speech envelope
  hasRealAudioTrack?: boolean; // true when playing synthesized WAV audio
}

/**
 * Pluggable interface so advanced viseme/morph-target lip-sync providers
 * can be registered or swapped without modifying the 3D scene renderer.
 */
export interface ILipSyncProvider {
  readonly id: string;
  readonly label: string;
  sampleViseme(ctx: LipSyncSampleContext): Partial<VisemeBlendState>;
}

/**
 * Default Hybrid PCM Envelope + WebAudio FFT + Multilingual (Urdu/English) Phoneme Viseme Provider:
 * Combines 30fps PCM vocal RMS amplitude and real-time WebAudio FFT spectrum energy
 * with Urdu Nastaliq (اردو), Roman Urdu, and English vowel/consonant phoneme estimation.
 */
export class HybridAudioPhonemeLipSyncProvider implements ILipSyncProvider {
  public readonly id = 'hybrid_pcm_webaudio_multilingual_v2';
  public readonly label = 'PCM Speech Envelope + WebAudio FFT + Urdu/English Phoneme Solver';

  public sampleViseme(ctx: LipSyncSampleContext): Partial<VisemeBlendState> {
    if (!ctx.isSpeaking) {
      return {
        jawOpen: 0,
        mouthPucker: 0,
        mouthWide: 0,
      };
    }

    const cleanText = (ctx.dialogueText || '').trim();
    const charIdx =
      cleanText.length > 0
        ? Math.min(cleanText.length - 1, Math.floor(ctx.turnProgress * cleanText.length))
        : 0;
    const activeChar = (cleanText[charIdx] || 'a').toLowerCase();

    // Multilingual Phoneme Family Estimation (English + Roman Urdu + Urdu Nastaliq Script اردو)
    const isOpenVowel = /[aáäàاآہعحَ]/.test(activeChar);
    const isRoundVowel = /[oóöuúüwوؤُ]/.test(activeChar);
    const isWideVowel = /[eéèiíìyیےئِ]/.test(activeChar);
    const isBilabialStop = /[mbpمبپ]/.test(activeChar);
    const isPause = /[\s.,!?;:—۔،؟-]/.test(activeChar);

    // When playing a synthesized WAV track, drive mouth strictly from real PCM envelope + WebAudio FFT
    if (ctx.hasRealAudioTrack) {
      const pcmEnv = ctx.envelopeAmplitude ?? 0;
      const fftAmp = ctx.audioAmplitude ?? 0;
      const realSpeechEnergy = Math.max(pcmEnv, fftAmp * 1.15);

      // Close mouth during silent pauses in the audio waveform
      if (realSpeechEnergy < 0.025) {
        return {
          jawOpen: 0,
          mouthPucker: 0,
          mouthWide: 0,
        };
      }

      if (isBilabialStop && realSpeechEnergy < 0.28) {
        return {
          jawOpen: 0.03,
          mouthPucker: 0.35,
          mouthWide: 0.08,
        };
      }

      const vowelMultiplier = isOpenVowel
        ? 1.12
        : isRoundVowel
          ? 0.86
          : isWideVowel
            ? 0.74
            : 0.68;
      const jawOpen = Math.min(1, realSpeechEnergy * vowelMultiplier);
      const mouthPucker = isRoundVowel
        ? Math.min(1, 0.42 + realSpeechEnergy * 0.5 + ctx.lowBandEnergy * 0.25)
        : Math.max(0, ctx.lowBandEnergy * 0.25);
      const mouthWide = isWideVowel
        ? Math.min(1, 0.38 + realSpeechEnergy * 0.45 + ctx.highBandEnergy * 0.28)
        : Math.max(0, ctx.highBandEnergy * 0.22);

      return {
        jawOpen,
        mouthPucker,
        mouthWide,
      };
    }

    // Fallback when using live browser SpeechSynthesis (word/character phoneme cadence)
    if (isPause) {
      return {
        jawOpen: 0.02,
        mouthPucker: 0,
        mouthWide: 0,
      };
    }

    const syllableOsc = Math.abs(Math.sin(ctx.timeSec * 11.2) * Math.cos(ctx.timeSec * 6.5)) * 0.82;
    const effectiveEnergy =
      ctx.audioAmplitude > 0.04 ? Math.min(1, ctx.audioAmplitude * 1.35) : syllableOsc;

    if (isBilabialStop && effectiveEnergy < 0.3) {
      return {
        jawOpen: 0.03,
        mouthPucker: 0.35,
        mouthWide: 0.1,
      };
    }

    const jawOpen = Math.min(
      1,
      effectiveEnergy * (isOpenVowel ? 1.05 : isRoundVowel ? 0.78 : isWideVowel ? 0.65 : 0.55),
    );
    const mouthPucker = isRoundVowel ? Math.min(1, 0.45 + effectiveEnergy * 0.45) : 0.1;
    const mouthWide = isWideVowel ? Math.min(1, 0.4 + effectiveEnergy * 0.42) : 0.1;

    return {
      jawOpen,
      mouthPucker,
      mouthWide,
    };
  }
}

/**
 * Modular Facial Emotion Preset Mapper
 */
export function resolveEmotionFacialTargets(emotion: CharacterEmotion3D): {
  mouthSmile: number;
  browLift: number;
  browTilt: number;
  eyeWide: number;
  headTiltBias: number;
  gestureIntensity: number;
} {
  switch (emotion) {
    case 'happy':
      return {
        mouthSmile: 0.75,
        browLift: 0.35,
        browTilt: 0.1,
        eyeWide: 0.15,
        headTiltBias: 0.06,
        gestureIntensity: 1.0,
      };
    case 'excited':
      return {
        mouthSmile: 0.9,
        browLift: 0.7,
        browTilt: 0.15,
        eyeWide: 0.55,
        headTiltBias: -0.04,
        gestureIntensity: 1.45,
      };
    case 'surprised':
      return {
        mouthSmile: 0.05,
        browLift: 0.9,
        browTilt: 0.0,
        eyeWide: 0.85,
        headTiltBias: -0.08,
        gestureIntensity: 1.2,
      };
    case 'thoughtful':
      return {
        mouthSmile: -0.1,
        browLift: 0.15,
        browTilt: -0.45,
        eyeWide: -0.2,
        headTiltBias: 0.14,
        gestureIntensity: 0.65,
      };
    case 'angry':
      return {
        mouthSmile: -0.65,
        browLift: -0.6,
        browTilt: -0.8,
        eyeWide: -0.3,
        headTiltBias: -0.05,
        gestureIntensity: 1.35,
      };
    case 'empathetic':
      return {
        mouthSmile: 0.45,
        browLift: 0.4,
        browTilt: 0.55,
        eyeWide: 0.1,
        headTiltBias: 0.12,
        gestureIntensity: 0.85,
      };
    default:
      return {
        mouthSmile: 0.2,
        browLift: 0.0,
        browTilt: 0.0,
        eyeWide: 0.0,
        headTiltBias: 0.0,
        gestureIntensity: 0.8,
      };
  }
}

// ============================================================================
// 2. DATA MODELS FOR MULTI-CHARACTER 3D SCENE & CONVERSATION TURNS
// ============================================================================

export interface CharacterActor3D {
  id: string;
  name: string;
  role: string;
  archetype: CharacterArchetype3D;
  voiceName: NeuralVoiceId;
  pitch: number;
  emotion: CharacterEmotion3D;
  primaryColor: string;
  accentColor: string;
  scale: number;
}

export type SpokenDialogueLang = 'urdu' | 'english' | 'roman_urdu' | 'bilingual';

export interface ConversationDialogueTurn3D {
  id: string;
  speakerId: string;
  dialogueLine: string;
  dialogueUrdu?: string;
  dialogueRomanUrdu?: string;
  spokenLanguage?: SpokenDialogueLang;
  subtitleText?: string;
  emotion: CharacterEmotion3D;
  durationSec: number;
  audioDataUrl?: string;
  audioUrl?: string;
  lipSyncEnvelope?: number[];
  synthError?: string;
}

interface BuiltActorRig3D {
  actorId: string;
  rootGroup: THREE.Group;
  bodyGroup: THREE.Group;
  headGroup: THREE.Group;
  jawGroup: THREE.Group;
  upperLipMesh: THREE.Mesh;
  lowerLipMesh: THREE.Mesh;
  oralCavityMesh: THREE.Mesh;
  leftEyeGroup: THREE.Group;
  rightEyeGroup: THREE.Group;
  leftEyelidMesh: THREE.Mesh;
  rightEyelidMesh: THREE.Mesh;
  leftBrowMesh: THREE.Mesh;
  rightBrowMesh: THREE.Mesh;
  leftArmGroup: THREE.Group;
  rightArmGroup: THREE.Group;
  speakingHaloMesh: THREE.Mesh;
  basePosition: THREE.Vector3;
  baseRotationY: number;
  phaseOffset: number;
  nextBlinkAt: number;
  blinkEndAt: number;
}

// ============================================================================
// 3. MODULAR THREE.JS ARTICULATED CHARACTER RIG BUILDER
// ============================================================================

function buildArticulatedCharacterRig(
  actor: CharacterActor3D,
  index: number,
  totalActors: number,
): BuiltActorRig3D {
  const rootGroup = new THREE.Group();

  // Semicircle stage arrangement so characters face one another & the camera naturally
  const spreadRadius = totalActors <= 2 ? 2.25 : totalActors === 3 ? 2.8 : 3.35;
  const normalizedIdx = totalActors === 1 ? 0 : index / (totalActors - 1) - 0.5;
  const angle = normalizedIdx * Math.PI * 0.62;
  const posX = Math.sin(angle) * spreadRadius * 1.25;
  const posZ = Math.cos(angle) * 0.85 - 0.85;
  const basePosition = new THREE.Vector3(posX, 0, posZ);
  // Angle inward toward center/camera
  const baseRotationY = -angle * 0.65;

  rootGroup.position.copy(basePosition);
  rootGroup.rotation.y = baseRotationY;
  const actorScale = Math.max(0.65, Math.min(1.35, actor.scale || 1));
  rootGroup.scale.setScalar(actorScale);

  const primaryCol = new THREE.Color(actor.primaryColor || '#F59E0B');
  const accentCol = new THREE.Color(actor.accentColor || '#38BDF8');

  const bodyMat = new THREE.MeshStandardMaterial({
    color: primaryCol,
    roughness: actor.archetype === 'cyber_droid' ? 0.22 : 0.45,
    metalness: actor.archetype === 'cyber_droid' ? 0.78 : 0.15,
  });

  const accentMat = new THREE.MeshStandardMaterial({
    color: accentCol,
    roughness: 0.35,
    metalness: 0.3,
    emissive: accentCol,
    emissiveIntensity: actor.archetype === 'cyber_droid' ? 0.35 : 0.08,
  });

  const skinOrFurMat = new THREE.MeshStandardMaterial({
    color:
      actor.archetype === 'stylized_human'
        ? new THREE.Color('#FDBA74')
        : actor.archetype === 'cyber_droid'
          ? new THREE.Color('#E2E8F0')
          : primaryCol,
    roughness: 0.42,
    metalness: actor.archetype === 'cyber_droid' ? 0.65 : 0.1,
  });

  // Floor Speaking Indicator Halo
  const speakingHaloMesh = new THREE.Mesh(
    new THREE.RingGeometry(0.72, 0.92, 36),
    new THREE.MeshBasicMaterial({
      color: accentCol,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.18,
    }),
  );
  speakingHaloMesh.rotation.x = -Math.PI / 2;
  speakingHaloMesh.position.y = 0.02;
  rootGroup.add(speakingHaloMesh);

  // Legs / Base Pedestal
  const legGeo = new THREE.CylinderGeometry(0.16, 0.14, 0.92, 16);
  const legMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
  const leftLeg = new THREE.Mesh(legGeo, legMat);
  leftLeg.position.set(-0.26, 0.46, 0);
  leftLeg.castShadow = true;
  rootGroup.add(leftLeg);

  const rightLeg = new THREE.Mesh(legGeo, legMat);
  rightLeg.position.set(0.26, 0.46, 0);
  rightLeg.castShadow = true;
  rootGroup.add(rightLeg);

  // Body / Torso Group (for breathing & posture idle animation)
  const bodyGroup = new THREE.Group();
  bodyGroup.position.set(0, 0.9, 0);
  rootGroup.add(bodyGroup);

  const torsoMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.46, 0.38, 1.15, 20),
    bodyMat,
  );
  torsoMesh.position.y = 0.55;
  torsoMesh.castShadow = true;
  bodyGroup.add(torsoMesh);

  // Collar / Chest Accent Crest
  const chestCrest = new THREE.Mesh(
    new THREE.BoxGeometry(0.56, 0.28, 0.12),
    accentMat,
  );
  chestCrest.position.set(0, 0.72, 0.38);
  bodyGroup.add(chestCrest);

  // Articulated Left & Right Arms (for conversational hand gestures)
  const leftArmGroup = new THREE.Group();
  leftArmGroup.position.set(-0.56, 0.95, 0);
  const leftArmMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.1, 0.78, 14),
    bodyMat,
  );
  leftArmMesh.position.y = -0.32;
  leftArmMesh.castShadow = true;
  leftArmGroup.add(leftArmMesh);
  const leftHandMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 14, 14),
    skinOrFurMat,
  );
  leftHandMesh.position.y = -0.74;
  leftArmGroup.add(leftHandMesh);
  bodyGroup.add(leftArmGroup);

  const rightArmGroup = new THREE.Group();
  rightArmGroup.position.set(0.56, 0.95, 0);
  const rightArmMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.1, 0.78, 14),
    bodyMat,
  );
  rightArmMesh.position.y = -0.32;
  rightArmMesh.castShadow = true;
  rightArmGroup.add(rightArmMesh);
  const rightHandMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 14, 14),
    skinOrFurMat,
  );
  rightHandMesh.position.y = -0.74;
  rightArmGroup.add(rightHandMesh);
  bodyGroup.add(rightArmGroup);

  // Articulated Head Group (for gaze tracking, nodding & head tilts)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.38, 0);
  bodyGroup.add(headGroup);

  const headRadius = 0.54;
  const craniumMesh = new THREE.Mesh(
    actor.archetype === 'cyber_droid'
      ? new THREE.BoxGeometry(0.92, 0.84, 0.86)
      : new THREE.SphereGeometry(headRadius, 28, 24),
    skinOrFurMat,
  );
  craniumMesh.position.y = 0.36;
  craniumMesh.castShadow = true;
  headGroup.add(craniumMesh);

  // Archetype-specific 3D character features (Lion Mane, Ant Antennae, Fox Ears, Stylist Hair, Droid Visor)
  if (actor.archetype === 'pixar_lion') {
    const maneMat = new THREE.MeshStandardMaterial({
      color: 0x92400e,
      roughness: 0.7,
    });
    const maneRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.56, 0.22, 16, 28),
      maneMat,
    );
    maneRing.position.set(0, 0.38, -0.05);
    headGroup.add(maneRing);

    [-0.38, 0.38].forEach((ex) => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 14), skinOrFurMat);
      ear.position.set(ex, 0.86, 0.05);
      headGroup.add(ear);
    });
  } else if (actor.archetype === 'pixar_ant') {
    const antMat = new THREE.MeshStandardMaterial({ color: accentCol, roughness: 0.3 });
    [-0.2, 0.2].forEach((ax, i) => {
      const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.45, 10), antMat);
      stalk.position.set(ax, 0.98, 0.12);
      stalk.rotation.z = i === 0 ? 0.35 : -0.35;
      headGroup.add(stalk);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12), accentMat);
      tip.position.set(ax * 1.55, 1.18, 0.15);
      headGroup.add(tip);
    });
  } else if (actor.archetype === 'clever_fox' || actor.archetype === 'royal_owl') {
    [-0.34, 0.34].forEach((ex, i) => {
      const earCone = new THREE.Mesh(
        new THREE.ConeGeometry(0.18, 0.42, 14),
        accentMat,
      );
      earCone.position.set(ex, 0.94, 0.04);
      earCone.rotation.z = i === 0 ? 0.22 : -0.22;
      headGroup.add(earCone);
    });
  } else if (actor.archetype === 'stylized_human') {
    const hairCap = new THREE.Mesh(
      new THREE.SphereGeometry(headRadius * 1.04, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.55),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 }),
    );
    hairCap.position.y = 0.4;
    hairCap.rotation.x = -0.18;
    headGroup.add(hairCap);
  } else if (actor.archetype === 'cyber_droid') {
    const antenna = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.36, 10),
      accentMat,
    );
    antenna.position.set(0, 0.94, 0);
    headGroup.add(antenna);
  }

  // Expressive Eyes + Blinking Eyelids
  const scleraMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x090d16 });
  const eyelidMat = new THREE.MeshStandardMaterial({
    color: primaryCol,
    roughness: 0.4,
  });

  const createEyeRig = (offsetX: number) => {
    const eyeGroup = new THREE.Group();
    eyeGroup.position.set(offsetX, 0.46, 0.46);

    const eyeball = new THREE.Mesh(new THREE.SphereGeometry(0.115, 16, 16), scleraMat);
    eyeGroup.add(eyeball);

    const iris = new THREE.Mesh(
      new THREE.SphereGeometry(0.068, 14, 14),
      new THREE.MeshBasicMaterial({ color: accentCol }),
    );
    iris.position.z = 0.068;
    eyeGroup.add(iris);

    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 12), pupilMat);
    pupil.position.z = 0.098;
    eyeGroup.add(pupil);

    const highlight = new THREE.Mesh(
      new THREE.SphereGeometry(0.018, 8, 8),
      scleraMat,
    );
    highlight.position.set(0.025, 0.03, 0.115);
    eyeGroup.add(highlight);

    // Upper Eyelid for blinking & emotion squint
    const eyelidMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.122, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
      eyelidMat,
    );
    eyelidMesh.rotation.x = -Math.PI * 0.45; // open by default
    eyeGroup.add(eyelidMesh);

    headGroup.add(eyeGroup);
    return { eyeGroup, eyelidMesh };
  };

  const leftEye = createEyeRig(-0.2);
  const rightEye = createEyeRig(0.2);

  // Expressive Eyebrows
  const browGeo = new THREE.BoxGeometry(0.22, 0.048, 0.06);
  const browMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });

  const leftBrowMesh = new THREE.Mesh(browGeo, browMat);
  leftBrowMesh.position.set(-0.2, 0.64, 0.48);
  headGroup.add(leftBrowMesh);

  const rightBrowMesh = new THREE.Mesh(browGeo, browMat);
  rightBrowMesh.position.set(0.2, 0.64, 0.48);
  headGroup.add(rightBrowMesh);

  // Nose / Snout
  const noseMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.075, 14, 14),
    accentMat,
  );
  noseMesh.position.set(0, 0.36, 0.55);
  headGroup.add(noseMesh);

  // Articulated Mouth & Lip-Sync Rig (Upper Lip, Oral Cavity, Tongue/Teeth, Lower Jaw Pivot)
  const lipMat = new THREE.MeshStandardMaterial({
    color: 0xe11d48,
    roughness: 0.35,
  });
  const cavityMat = new THREE.MeshBasicMaterial({ color: 0x27091c });

  const upperLipMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.26, 0.042, 0.08),
    lipMat,
  );
  upperLipMesh.position.set(0, 0.24, 0.5);
  headGroup.add(upperLipMesh);

  const oralCavityMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 16, 14),
    cavityMat,
  );
  oralCavityMesh.position.set(0, 0.2, 0.46);
  oralCavityMesh.scale.set(1.1, 0.15, 0.6);
  headGroup.add(oralCavityMesh);

  const jawGroup = new THREE.Group();
  jawGroup.position.set(0, 0.21, 0.48);
  const lowerLipMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 0.045, 0.08),
    lipMat,
  );
  lowerLipMesh.position.set(0, -0.02, 0.02);
  jawGroup.add(lowerLipMesh);
  headGroup.add(jawGroup);

  const now = performance.now() * 0.001;
  return {
    actorId: actor.id,
    rootGroup,
    bodyGroup,
    headGroup,
    jawGroup,
    upperLipMesh,
    lowerLipMesh,
    oralCavityMesh,
    leftEyeGroup: leftEye.eyeGroup,
    rightEyeGroup: rightEye.eyeGroup,
    leftEyelidMesh: leftEye.eyelidMesh,
    rightEyelidMesh: rightEye.eyelidMesh,
    leftBrowMesh,
    rightBrowMesh,
    leftArmGroup,
    rightArmGroup,
    speakingHaloMesh,
    basePosition,
    baseRotationY,
    phaseOffset: index * 1.57,
    nextBlinkAt: now + 1.8 + Math.random() * 2.5,
    blinkEndAt: 0,
  };
}

// ============================================================================
// 4. MAIN 3D CHARACTER CONVERSATION COMPONENT
// ============================================================================

export interface ThreeCharacterConversationStudioProps {
  initialTitle?: string;
  initialCharacters?: CharacterActor3D[];
  initialTurns?: ConversationDialogueTurn3D[];
  onNotice?: (msg: string) => void;
  onSyncToVideoStudio?: (payload: {
    title: string;
    characters: CharacterActor3D[];
    turns: ConversationDialogueTurn3D[];
  }) => void;
}

const DEFAULT_CAST: CharacterActor3D[] = [
  {
    id: 'actor-1',
    name: 'Sher (The Lion)',
    role: 'Jungle King',
    archetype: 'pixar_lion',
    voiceName: 'Fenrir',
    pitch: 0.82,
    emotion: 'happy',
    primaryColor: '#F59E0B',
    accentColor: '#FDE047',
    scale: 1.08,
  },
  {
    id: 'actor-2',
    name: 'Cheenti (The Ant)',
    role: 'Brave Rescuer',
    archetype: 'pixar_ant',
    voiceName: 'Kore',
    pitch: 1.26,
    emotion: 'excited',
    primaryColor: '#10B981',
    accentColor: '#38BDF8',
    scale: 0.9,
  },
  {
    id: 'actor-3',
    name: 'Zara (Story Director)',
    role: 'Co-Host',
    archetype: 'stylized_human',
    voiceName: 'Zephyr',
    pitch: 1.05,
    emotion: 'empathetic',
    primaryColor: '#8B5CF6',
    accentColor: '#EC4899',
    scale: 1.0,
  },
];

const DEFAULT_TURNS: ConversationDialogueTurn3D[] = [
  {
    id: 'turn-1',
    speakerId: 'actor-1',
    dialogueLine: 'Welcome everyone! Today I want to thank my brave friend Cheenti for saving me from the hunter’s net!',
    dialogueUrdu: 'آج میں اپنی بہادر دوست چونٹی کا شکریہ ادا کرنا چاہتا ہوں جس نے مجھے شکاری کے جال سے بچایا!',
    dialogueRomanUrdu: 'Aaj main apni bahadur dost Cheenti ka shukriya ada karna chahta hoon jis ne mujhe shikari ke jaal se bachaya!',
    spokenLanguage: 'urdu',
    subtitleText: '🦁 شیر: آج میں اپنی بہادر دوست چونٹی کا شکریہ ادا کرنا چاہتا ہوں!',
    emotion: 'happy',
    durationSec: 5,
  },
  {
    id: 'turn-2',
    speakerId: 'actor-2',
    dialogueLine: 'Never underestimate a small friend, Sher Bhai! When you spared me, I promised I would help you one day!',
    dialogueUrdu: 'کسی چھوٹے دوست کو کم مت سمجھیں شیر بھائی! میں نے اپنا وعدہ پورا کیا!',
    dialogueRomanUrdu: 'Kisi chote dost ko kam mat samjhein Sher Bhai! Main ne apna wada poora kiya!',
    spokenLanguage: 'urdu',
    subtitleText: '🐜 چونٹی: کسی چھوٹے دوست کو کم مت سمجھیں شیر بھائی! میں نے اپنا وعدہ پورا کیا!',
    emotion: 'excited',
    durationSec: 5,
  },
  {
    id: 'turn-3',
    speakerId: 'actor-3',
    dialogueLine: 'Seeing both of you together proves that kindness and teamwork are the greatest superpowers of all!',
    dialogueUrdu: 'آپ دونوں کی دوستی ثابت کرتی ہے کہ نیکی اور اتحاد سب سے بڑی طاقت ہیں!',
    dialogueRomanUrdu: 'Aap dono ki dosti sabit karti hai ke naiki aur ittehad sab se bari taqat hain!',
    spokenLanguage: 'english',
    subtitleText: '✨ زارا: آپ دونوں کی دوستی ثابت کرتی ہے کہ نیکی اور اتحاد سب سے بڑی طاقت ہیں!',
    emotion: 'empathetic',
    durationSec: 5,
  },
];

const EMOTION_OPTIONS: Array<{ id: CharacterEmotion3D; label: string; emoji: string }> = [
  { id: 'happy', label: 'Happy', emoji: '😊' },
  { id: 'excited', label: 'Excited', emoji: '🤩' },
  { id: 'empathetic', label: 'Empathetic', emoji: '🥰' },
  { id: 'thoughtful', label: 'Thoughtful', emoji: '🤔' },
  { id: 'surprised', label: 'Surprised', emoji: '😲' },
  { id: 'angry', label: 'Intense / Fierce', emoji: '😠' },
  { id: 'neutral', label: 'Neutral', emoji: '😐' },
];

const ARCHETYPE_OPTIONS: Array<{ id: CharacterArchetype3D; label: string }> = [
  { id: 'pixar_lion', label: '🦁 Pixar Lion' },
  { id: 'pixar_ant', label: '🐜 Pixar Ant' },
  { id: 'stylized_human', label: '🧑 Stylized 3D Human' },
  { id: 'cyber_droid', label: '🤖 Cyber Companion Droid' },
  { id: 'clever_fox', label: '🦊 Clever Woodland Fox' },
  { id: 'royal_owl', label: '🦉 Wise Royal Owl' },
];

export function ThreeCharacterConversationStudio({
  initialTitle = '3D Multi-Character Interactive Conversation Scene',
  initialCharacters,
  initialTurns,
  onNotice,
  onSyncToVideoStudio,
}: ThreeCharacterConversationStudioProps) {
  const [sceneTitle, setSceneTitle] = useState(initialTitle);
  const [actors, setActors] = useState<CharacterActor3D[]>(
    initialCharacters && initialCharacters.length > 0 ? initialCharacters : DEFAULT_CAST,
  );
  const [turns, setTurns] = useState<ConversationDialogueTurn3D[]>(
    initialTurns && initialTurns.length > 0 ? initialTurns : DEFAULT_TURNS,
  );
  const [activeTurnIdx, setActiveTurnIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [environment, setEnvironment] = useState<StageEnvironment3D>('studio_stage');
  const [cameraMode, setCameraMode] = useState<CameraDirectorMode3D>('auto_speaker');
  const [focusedActorId, setFocusedActorId] = useState<string>(DEFAULT_CAST[0].id);
  const [orbitYaw, setOrbitYaw] = useState<number>(0);
  const [orbitPitch, setOrbitPitch] = useState<number>(0.18);
  const [orbitDistance, setOrbitDistance] = useState<number>(5.8);
  const [selectedEditorTab, setSelectedEditorTab] = useState<'dialogue' | 'characters' | 'camera'>(
    'dialogue',
  );
  const [aiTopicPrompt, setAiTopicPrompt] = useState(
    'Sher, Cheenti, and Zara having an inspiring conversation about courage, friendship, and helping others.',
  );
  const [isGeneratingAiConvo, setIsGeneratingAiConvo] = useState(false);
  const [synthesizingTurnId, setSynthesizingTurnId] = useState<string | null>(null);
  const [isSynthesizingAll, setIsSynthesizingAll] = useState(false);
  const [isTranslatingAll, setIsTranslatingAll] = useState(false);
  const [globalVoiceLanguage, setGlobalVoiceLanguage] = useState<SpokenDialogueLang>('urdu');
  const [liveJawOpenPct, setLiveJawOpenPct] = useState<number>(0);
  const [liveSyncSourceLabel, setLiveSyncSourceLabel] = useState<string>('Idle');
  const [isRecordingWebm, setIsRecordingWebm] = useState(false);

  const stageContainerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const lipSyncProviderRef = useRef<ILipSyncProvider>(new HybridAudioPhonemeLipSyncProvider());

  // Mutable refs accessed inside the 60fps Three.js requestAnimationFrame loop
  const actorsRef = useRef(actors);
  const turnsRef = useRef(turns);
  const activeTurnIdxRef = useRef(activeTurnIdx);
  const isPlayingRef = useRef(isPlaying);
  const isMutedRef = useRef(isMuted);
  const cameraModeRef = useRef(cameraMode);
  const focusedActorIdRef = useRef(focusedActorId);
  const orbitRef = useRef({ yaw: orbitYaw, pitch: orbitPitch, distance: orbitDistance });
  const turnStartClockRef = useRef<number>(performance.now());
  const lastSpokenTurnIdRef = useRef<string>('');

  useEffect(() => {
    actorsRef.current = actors;
  }, [actors]);

  useEffect(() => {
    turnsRef.current = turns;
  }, [turns]);

  useEffect(() => {
    activeTurnIdxRef.current = activeTurnIdx;
    turnStartClockRef.current = performance.now();
  }, [activeTurnIdx]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    cameraModeRef.current = cameraMode;
  }, [cameraMode]);

  useEffect(() => {
    focusedActorIdRef.current = focusedActorId;
  }, [focusedActorId]);

  useEffect(() => {
    orbitRef.current = { yaw: orbitYaw, pitch: orbitPitch, distance: orbitDistance };
  }, [orbitYaw, orbitPitch, orbitDistance]);

  const notify = (msg: string) => {
    if (onNotice) onNotice(msg);
  };

  // Connect <audio> element to Web Audio API AnalyserNode for real-time FFT lip-sync
  const ensureAudioAnalyser = () => {
    const audioEl = audioElRef.current;
    if (!audioEl || audioCtxRef.current) return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ac = new AudioCtx();
      const source = ac.createMediaElementSource(audioEl);
      const analyser = ac.createAnalyser();
      analyser.fftSize = 64;
      const dest = ac.createMediaStreamDestination();
      source.connect(analyser);
      analyser.connect(ac.destination);
      source.connect(dest);
      audioCtxRef.current = ac;
      analyserRef.current = analyser;
      audioDestRef.current = dest;
    } catch {
      // ignore if already bound
    }
  };

  // Trigger voice playback when active turn changes
  useEffect(() => {
    const currentTurn = turns[activeTurnIdx];
    if (!currentTurn || !isPlaying) {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      if (audioElRef.current) audioElRef.current.pause();
      return;
    }

    const turnKey = `${currentTurn.id}-${activeTurnIdx}`;
    if (lastSpokenTurnIdRef.current === turnKey) return;
    lastSpokenTurnIdRef.current = turnKey;

    if (isMuted) return;

    const speaker = actors.find((a) => a.id === currentTurn.speakerId) || actors[0];
    const resolvedAudioSrc = currentTurn.audioUrl || currentTurn.audioDataUrl;

    // If this turn has synthesized Gemini TTS WAV audio, play it through the WebAudio analyser
    if (resolvedAudioSrc && audioElRef.current) {
      ensureAudioAnalyser();
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        void audioCtxRef.current.resume();
      }
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      audioElRef.current.src = resolvedAudioSrc;
      audioElRef.current.currentTime = 0;
      void audioElRef.current.play().catch(() => {});
      return;
    }

    // Otherwise use browser SpeechSynthesis with language-aware Urdu/English voice selection
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        if (audioElRef.current) audioElRef.current.pause();
        const langMode = currentTurn.spokenLanguage || 'english';
        const textToSpeak =
          langMode === 'urdu'
            ? currentTurn.dialogueUrdu || currentTurn.subtitleText || currentTurn.dialogueLine
            : langMode === 'roman_urdu'
              ? currentTurn.dialogueRomanUrdu || currentTurn.dialogueLine
              : currentTurn.dialogueLine;
        const utter = new SpeechSynthesisUtterance(textToSpeak);
        utter.lang = langMode === 'urdu' || langMode === 'roman_urdu' ? 'ur-PK' : 'en-US';
        utter.pitch = speaker?.pitch ?? 1.0;
        utter.rate = 0.96;
        window.speechSynthesis.speak(utter);
      } catch {
        // ignore speech synthesis restrictions
      }
    }
  }, [activeTurnIdx, isPlaying, isMuted, turns, actors]);

  // Mount Three.js 3D Multi-Character Stage & Real-Time Facial/Idle/Camera Loop
  useEffect(() => {
    const container = stageContainerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let cancelled = false;
    let animId = 0;

    const width = Math.max(320, container.clientWidth || 720);
    const height = Math.max(360, container.clientHeight || 460);

    const scene = new THREE.Scene();
    const envColors: Record<StageEnvironment3D, { bg: number; floor: number; grid: number; key: number }> = {
      studio_stage: { bg: 0x090d16, floor: 0x111827, grid: 0xf59e0b, key: 0xfef3c7 },
      enchanted_forest: { bg: 0x042f2e, floor: 0x064e3b, grid: 0x10b981, key: 0xfde68a },
      cyber_lounge: { bg: 0x090518, floor: 0x1e1b4b, grid: 0x38bdf8, key: 0xe0f2fe },
      podcast_set: { bg: 0x18100c, floor: 0x291d18, grid: 0xf97316, key: 0xffedd5 },
    };
    const palette = envColors[environment] || envColors.studio_stage;
    scene.background = new THREE.Color(palette.bg);
    scene.fog = new THREE.FogExp2(palette.bg, 0.035);

    const camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 120);
    camera.position.set(0, 2.2, 5.8);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 3-Point Studio Lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, palette.floor, 0.95);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(palette.key, 1.45);
    keyLight.position.set(5, 9, 7);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.85);
    rimLight.position.set(-6, 5, -5);
    scene.add(rimLight);

    const stageSpot = new THREE.PointLight(palette.grid, 1.8, 16);
    stageSpot.position.set(0, 4.5, 1.5);
    scene.add(stageSpot);

    // Circular Studio Stage Floor
    const stageDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(5.5, 5.8, 0.18, 48),
      new THREE.MeshStandardMaterial({
        color: palette.floor,
        roughness: 0.55,
        metalness: 0.25,
      }),
    );
    stageDisc.position.y = -0.09;
    stageDisc.receiveShadow = true;
    scene.add(stageDisc);

    const stageRing = new THREE.Mesh(
      new THREE.RingGeometry(5.35, 5.5, 48),
      new THREE.MeshBasicMaterial({
        color: palette.grid,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.45,
      }),
    );
    stageRing.rotation.x = -Math.PI / 2;
    stageRing.position.y = 0.01;
    scene.add(stageRing);

    // Floating atmospheric light motes
    const particleCount = 36;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 9;
      particlePositions[i * 3 + 1] = 0.6 + Math.random() * 3.8;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 6;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particles = new THREE.Points(
      particleGeo,
      new THREE.PointsMaterial({
        color: palette.grid,
        size: 0.06,
        transparent: true,
        opacity: 0.65,
      }),
    );
    scene.add(particles);

    // Build Articulated 3D Rigs for all active characters
    const builtRigs: BuiltActorRig3D[] = actors.map((actor, idx) => {
      const rig = buildArticulatedCharacterRig(actor, idx, actors.length);
      scene.add(rig.rootGroup);
      return rig;
    });

    // Mouse / Pointer Drag for Orbit Camera
    let isDragging = false;
    let prevX = 0;
    let prevY = 0;
    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      prevX = e.clientX;
      prevY = e.clientY;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevX;
      const dy = e.clientY - prevY;
      prevX = e.clientX;
      prevY = e.clientY;
      setCameraMode('free_orbit');
      setOrbitYaw((y) => y - dx * 0.008);
      setOrbitPitch((p) => Math.max(-0.15, Math.min(0.85, p + dy * 0.006)));
    };
    const onPointerUp = () => {
      isDragging = false;
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    const handleResize = () => {
      if (!container) return;
      const w = Math.max(320, container.clientWidth);
      const h = Math.max(360, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    const freqData = new Uint8Array(32);
    const currentCamPos = new THREE.Vector3(0, 2.2, 5.8);
    const currentCamLook = new THREE.Vector3(0, 1.75, -0.4);
    const desiredCamPos = new THREE.Vector3();
    const desiredCamLook = new THREE.Vector3();

    const animate = (nowMs: number) => {
      if (cancelled) return;
      const timeSec = nowMs * 0.001;

      const currentTurns = turnsRef.current;
      const currentIdx = activeTurnIdxRef.current;
      const activeTurn = currentTurns[currentIdx] || currentTurns[0];
      const audioEl = audioElRef.current;
      const hasRealAudioTrack = Boolean(activeTurn?.audioUrl || activeTurn?.audioDataUrl);
      const isAudioElementPlaying = Boolean(
        hasRealAudioTrack &&
          audioEl &&
          !audioEl.paused &&
          !audioEl.ended &&
          audioEl.currentTime > 0,
      );

      // Advance turn automatically when playing (locked to real audio duration when WAV is active)
      const effectiveDurationSec =
        hasRealAudioTrack && audioEl && Number.isFinite(audioEl.duration) && audioEl.duration > 0.5
          ? audioEl.duration
          : activeTurn?.durationSec || 4;
      const turnDurationMs = Math.max(1800, effectiveDurationSec * 1000);

      if (isPlayingRef.current && activeTurn) {
        const elapsedTurnMs = isAudioElementPlaying && audioEl
          ? audioEl.currentTime * 1000
          : nowMs - turnStartClockRef.current;
        const audioFinished = Boolean(
          hasRealAudioTrack && audioEl && audioEl.ended && nowMs - turnStartClockRef.current > 800,
        );
        if (audioFinished || elapsedTurnMs >= turnDurationMs + 250) {
          turnStartClockRef.current = nowMs;
          const nextIdx = (currentIdx + 1) % Math.max(1, currentTurns.length);
          activeTurnIdxRef.current = nextIdx;
          setActiveTurnIdx(nextIdx);
        }
      }

      const currentElapsedSec =
        isAudioElementPlaying && audioEl
          ? audioEl.currentTime
          : Math.max(0, (nowMs - turnStartClockRef.current) / 1000);
      const turnProgress = Math.min(1, Math.max(0, currentElapsedSec / Math.max(1, effectiveDurationSec)));

      // Sample 1: Precomputed 30fps PCM speech RMS envelope for this turn
      let envelopeAmplitude = 0;
      if (activeTurn?.lipSyncEnvelope && activeTurn.lipSyncEnvelope.length > 0 && isPlayingRef.current) {
        const frameIdx = Math.min(
          activeTurn.lipSyncEnvelope.length - 1,
          Math.max(0, Math.floor(currentElapsedSec * 30)),
        );
        envelopeAmplitude = activeTurn.lipSyncEnvelope[frameIdx] || 0;
      }

      // Sample 2: Real-time WebAudio FFT energy if playing synthesized audio
      let audioAmplitude = 0;
      let lowBandEnergy = 0;
      let highBandEnergy = 0;
      if (analyserRef.current && !isMutedRef.current && isPlayingRef.current) {
        try {
          analyserRef.current.getByteFrequencyData(freqData);
          let lowSum = 0;
          let highSum = 0;
          for (let i = 1; i < 8; i++) lowSum += freqData[i];
          for (let i = 8; i < 20; i++) highSum += freqData[i];
          lowBandEnergy = Math.min(1, lowSum / (7 * 180));
          highBandEnergy = Math.min(1, highSum / (12 * 160));
          audioAmplitude = Math.min(1, lowBandEnergy * 0.7 + highBandEnergy * 0.45);
        } catch {
          audioAmplitude = 0;
        }
      }

      const activeSpeakerRig =
        builtRigs.find((r) => r.actorId === activeTurn?.speakerId) || builtRigs[0];

      // Update each character's Idle Animation, Mutual Gaze, Facial Emotion & Lip-Sync Viseme
      builtRigs.forEach((rig) => {
        const actorData = actorsRef.current.find((a) => a.id === rig.actorId);
        const browserSpeechActive =
          !hasRealAudioTrack &&
          typeof window !== 'undefined' &&
          'speechSynthesis' in window &&
          window.speechSynthesis.speaking;
        const isSpeaking =
          Boolean(isPlayingRef.current) &&
          activeTurn?.speakerId === rig.actorId &&
          (hasRealAudioTrack
            ? isAudioElementPlaying || (turnProgress > 0.01 && turnProgress < 0.98 && envelopeAmplitude > 0.02)
            : browserSpeechActive || (turnProgress > 0.03 && turnProgress < 0.94));

        const effectiveEmotion: CharacterEmotion3D = isSpeaking
          ? activeTurn?.emotion || actorData?.emotion || 'happy'
          : actorData?.emotion || 'neutral';

        const emotionTargets = resolveEmotionFacialTargets(effectiveEmotion);

        // Choose active spoken text in Urdu, Roman Urdu, or English for phoneme viseme cues
        const activeSpokenText =
          activeTurn?.spokenLanguage === 'urdu'
            ? activeTurn?.dialogueUrdu || activeTurn?.subtitleText || activeTurn?.dialogueLine || ''
            : activeTurn?.spokenLanguage === 'roman_urdu'
              ? activeTurn?.dialogueRomanUrdu || activeTurn?.dialogueLine || ''
              : activeTurn?.dialogueLine || '';

        // 1. Pluggable Lip-Sync Viseme Evaluation (PCM Envelope + WebAudio FFT + Urdu/English Phoneme)
        const viseme = lipSyncProviderRef.current.sampleViseme({
          timeSec,
          isSpeaking,
          dialogueText: activeSpokenText,
          turnProgress,
          emotion: effectiveEmotion,
          audioAmplitude,
          lowBandEnergy,
          highBandEnergy,
          envelopeAmplitude,
          hasRealAudioTrack,
        });

        const jawOpen = viseme.jawOpen ?? 0;
        const pucker = viseme.mouthPucker ?? 0;
        const wide = viseme.mouthWide ?? 0;

        if (activeTurn?.speakerId === rig.actorId && Math.floor(nowMs) % 4 === 0) {
          setLiveJawOpenPct(Math.round(jawOpen * 100));
          setLiveSyncSourceLabel(
            !isSpeaking
              ? 'Silent / Idle'
              : hasRealAudioTrack
                ? 'PCM Envelope + WebAudio FFT'
                : 'Phoneme + SpeechSynthesis',
          );
        }

        // Apply Jaw & Lip Articulation
        rig.jawGroup.rotation.x = jawOpen * 0.42;
        rig.jawGroup.position.y = 0.21 - jawOpen * 0.055;
        const mouthScaleX = Math.max(
          0.62,
          1.0 + wide * 0.28 + emotionTargets.mouthSmile * 0.18 - pucker * 0.32,
        );
        rig.upperLipMesh.scale.x = mouthScaleX;
        rig.lowerLipMesh.scale.x = mouthScaleX;
        rig.oralCavityMesh.scale.set(
          mouthScaleX * 0.95,
          Math.max(0.12, jawOpen * 1.15),
          0.6,
        );

        // 2. Eyebrow Emotion Articulation
        const browSpeechBounce = isSpeaking ? Math.sin(timeSec * 9) * 0.025 * jawOpen : 0;
        const targetBrowY = 0.64 + emotionTargets.browLift * 0.045 + browSpeechBounce;
        rig.leftBrowMesh.position.y += (targetBrowY - rig.leftBrowMesh.position.y) * 0.18;
        rig.rightBrowMesh.position.y += (targetBrowY - rig.rightBrowMesh.position.y) * 0.18;
        rig.leftBrowMesh.rotation.z = emotionTargets.browTilt * 0.28;
        rig.rightBrowMesh.rotation.z = -emotionTargets.browTilt * 0.28;

        // 3. Natural Eye Blinking & Emotion Eye Openness
        if (timeSec >= rig.nextBlinkAt) {
          rig.blinkEndAt = timeSec + 0.14;
          rig.nextBlinkAt = timeSec + 2.4 + Math.random() * 3.0;
        }
        const isBlinking = timeSec < rig.blinkEndAt;
        const targetLidRot = isBlinking
          ? 0.15 // closed
          : -Math.PI * 0.45 - emotionTargets.eyeWide * 0.22;
        rig.leftEyelidMesh.rotation.x += (targetLidRot - rig.leftEyelidMesh.rotation.x) * 0.35;
        rig.rightEyelidMesh.rotation.x += (targetLidRot - rig.rightEyelidMesh.rotation.x) * 0.35;

        // 4. Idle Breathing, Mutual Gaze Tracking & Talking Hand Gestures
        const breathCycle = Math.sin(timeSec * 2.1 + rig.phaseOffset);
        rig.bodyGroup.position.y = 0.9 + breathCycle * 0.022;
        rig.bodyGroup.rotation.z = Math.cos(timeSec * 1.1 + rig.phaseOffset) * 0.018;

        // Mutual Gaze: Listeners turn their heads subtly toward the active speaker; speaker nods expressively
        let targetHeadYaw = 0;
        let targetHeadPitch = breathCycle * 0.03;
        let targetHeadRoll = emotionTargets.headTiltBias;

        if (isSpeaking) {
          targetHeadYaw = Math.sin(timeSec * 2.4) * 0.16;
          targetHeadPitch = -Math.abs(jawOpen) * 0.08 + Math.sin(timeSec * 4.2) * 0.05;
          targetHeadRoll += Math.cos(timeSec * 2.8) * 0.06;
        } else if (activeSpeakerRig && activeSpeakerRig.actorId !== rig.actorId) {
          const dx = activeSpeakerRig.basePosition.x - rig.basePosition.x;
          targetHeadYaw = Math.max(-0.45, Math.min(0.45, dx * 0.14));
          // Listener subtle agreement nod
          targetHeadPitch = Math.sin(timeSec * 3.2 + rig.phaseOffset) * 0.04;
        }

        rig.headGroup.rotation.y += (targetHeadYaw - rig.headGroup.rotation.y) * 0.1;
        rig.headGroup.rotation.x += (targetHeadPitch - rig.headGroup.rotation.x) * 0.12;
        rig.headGroup.rotation.z += (targetHeadRoll - rig.headGroup.rotation.z) * 0.1;

        // Conversational Arm Gestures
        const gAmp = emotionTargets.gestureIntensity;
        if (isSpeaking) {
          const targetLeftArmX = -0.45 - Math.abs(Math.sin(timeSec * 3.6)) * 0.45 * gAmp;
          const targetRightArmX = -0.45 - Math.abs(Math.cos(timeSec * 3.2)) * 0.5 * gAmp;
          rig.leftArmGroup.rotation.x += (targetLeftArmX - rig.leftArmGroup.rotation.x) * 0.12;
          rig.rightArmGroup.rotation.x += (targetRightArmX - rig.rightArmGroup.rotation.x) * 0.12;
          rig.leftArmGroup.rotation.z = 0.18 + Math.sin(timeSec * 2.7) * 0.12;
          rig.rightArmGroup.rotation.z = -0.18 - Math.cos(timeSec * 2.5) * 0.12;
        } else {
          rig.leftArmGroup.rotation.x += (-0.08 - rig.leftArmGroup.rotation.x) * 0.08;
          rig.rightArmGroup.rotation.x += (-0.08 - rig.rightArmGroup.rotation.x) * 0.08;
          rig.leftArmGroup.rotation.z = 0.12 + breathCycle * 0.02;
          rig.rightArmGroup.rotation.z = -0.12 - breathCycle * 0.02;
        }

        // Speaking Floor Halo Pulse
        const haloMat = rig.speakingHaloMesh.material as THREE.MeshBasicMaterial;
        if (isSpeaking) {
          haloMat.opacity = 0.55 + jawOpen * 0.4;
          rig.speakingHaloMesh.scale.setScalar(1.0 + jawOpen * 0.18);
        } else {
          haloMat.opacity = 0.14;
          rig.speakingHaloMesh.scale.setScalar(1.0);
        }
      });

      // 5. Camera Director Modes
      const mode = cameraModeRef.current;
      if (mode === 'auto_speaker' && activeSpeakerRig) {
        const spPos = activeSpeakerRig.basePosition;
        desiredCamPos.set(spPos.x * 0.72, 2.15, spPos.z + 3.65);
        desiredCamLook.set(spPos.x * 0.88, 1.95, spPos.z);
      } else if (mode === 'focus_character') {
        const focusRig =
          builtRigs.find((r) => r.actorId === focusedActorIdRef.current) || builtRigs[0];
        const fPos = focusRig ? focusRig.basePosition : new THREE.Vector3(0, 0, 0);
        desiredCamPos.set(fPos.x * 0.85, 2.15, fPos.z + 3.35);
        desiredCamLook.set(fPos.x, 1.98, fPos.z);
      } else if (mode === 'wide_group') {
        desiredCamPos.set(
          Math.sin(timeSec * 0.22) * 0.55,
          2.45,
          actors.length >= 4 ? 6.8 : 5.7,
        );
        desiredCamLook.set(0, 1.65, -0.5);
      } else {
        const { yaw, pitch, distance } = orbitRef.current;
        desiredCamPos.set(
          Math.sin(yaw) * Math.cos(pitch) * distance,
          1.4 + Math.sin(pitch) * distance,
          Math.cos(yaw) * Math.cos(pitch) * distance - 0.5,
        );
        desiredCamLook.set(0, 1.7, -0.5);
      }

      currentCamPos.lerp(desiredCamPos, 0.06);
      currentCamLook.lerp(desiredCamLook, 0.08);
      camera.position.copy(currentCamPos);
      camera.lookAt(currentCamLook);

      particles.rotation.y = timeSec * 0.05;
      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);

    return () => {
      cancelled = true;
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      renderer.dispose();
    };
  }, [actors, environment]);

  // Synthesize real Gemini TTS voice (Urdu, English, Roman Urdu, or Bilingual) for a dialogue turn
  const handleSynthesizeTurnAudio = async (turnIdx: number, overrideLang?: SpokenDialogueLang) => {
    const turn = turnsRef.current[turnIdx] || turns[turnIdx];
    if (!turn) return;
    const speaker = actors.find((a) => a.id === turn.speakerId) || actors[0];
    const lang = overrideLang || turn.spokenLanguage || globalVoiceLanguage || 'urdu';
    setSynthesizingTurnId(turn.id);

    try {
      const authHeaders = await buildUserAuthHeaders(null, { 'Content-Type': 'application/json' });
      const res = await fetch('/api/video/scene-voice', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          dialogueLine: turn.dialogueLine,
          dialogueUrdu: turn.dialogueUrdu || turn.subtitleText || '',
          dialogueRomanUrdu: turn.dialogueRomanUrdu || '',
          language: lang,
          speakerName: speaker?.name || 'Character',
          voiceName: speaker?.voiceName || 'Fenrir',
          speakerPitch: speaker?.pitch ?? 1.0,
          durationSec: turn.durationSec || 4,
          sfxMood: 'Studio Dialogue Ambience',
          sceneIdx: turnIdx,
          includeSfx: false,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        audioDataUrl?: string;
        audioUrl?: string;
        durationSec?: number;
        lipSyncEnvelope?: number[];
        error?: string;
      };
      if (!res.ok || (!data.audioDataUrl && !data.audioUrl)) {
        throw new Error(data.error || 'Voice synthesis failed');
      }

      setTurns((prev) =>
        prev.map((t, i) =>
          i === turnIdx
            ? {
                ...t,
                spokenLanguage: lang,
                audioDataUrl: data.audioDataUrl,
                audioUrl: data.audioUrl,
                durationSec: data.durationSec || t.durationSec,
                lipSyncEnvelope: data.lipSyncEnvelope || [],
                synthError: undefined,
              }
            : t,
        ),
      );
      lastSpokenTurnIdRef.current = '';
      setActiveTurnIdx(turnIdx);
      setIsPlaying(true);
      notify(
        `Synthesized ${speaker?.name} (${speaker?.voiceName} · ${lang.toUpperCase()}) neural voice & PCM lip-sync`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Voice synthesis failed';
      setTurns((prev) =>
        prev.map((t, i) => (i === turnIdx ? { ...t, synthError: msg } : t)),
      );
      notify(msg);
    } finally {
      setSynthesizingTurnId(null);
    }
  };

  // Batch synthesize all turns in the selected language (Urdu / English / Roman Urdu / Bilingual)
  const handleSynthesizeAllTurns = async () => {
    if (isSynthesizingAll) return;
    setIsSynthesizingAll(true);
    notify(`Synthesizing all ${turns.length} dialogue turns in ${globalVoiceLanguage.toUpperCase()}...`);
    try {
      for (let i = 0; i < turns.length; i++) {
        await handleSynthesizeTurnAudio(i, globalVoiceLanguage);
      }
      lastSpokenTurnIdRef.current = '';
      setActiveTurnIdx(0);
      setIsPlaying(true);
      notify(`All ${turns.length} turns synthesized with real PCM lip-sync & saved to Audio Vault!`);
    } finally {
      setIsSynthesizingAll(false);
    }
  };

  // Auto-translate & transliterate all turns between English, Urdu Nastaliq (اردو), and Roman Urdu
  const handleTranslateAllTurns = async () => {
    if (isTranslatingAll || turns.length === 0) return;
    setIsTranslatingAll(true);
    notify('Translating & transliterating dialogue across Urdu (اردو), Roman Urdu, and English...');
    try {
      const authHeaders = await buildUserAuthHeaders(null, { 'Content-Type': 'application/json' });
      const res = await fetch('/api/tts/translate-dialogue', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          items: turns.map((t) => {
            const sp = actors.find((a) => a.id === t.speakerId);
            return {
              speakerName: sp?.name || 'Character',
              english: t.dialogueLine,
              urdu: t.dialogueUrdu || t.subtitleText || '',
              romanUrdu: t.dialogueRomanUrdu || '',
            };
          }),
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
        prev.map((t, i) => {
          const tr = data.items?.[i];
          if (!tr) return t;
          return {
            ...t,
            dialogueLine: tr.english || t.dialogueLine,
            dialogueUrdu: tr.urdu || t.dialogueUrdu,
            dialogueRomanUrdu: tr.romanUrdu || t.dialogueRomanUrdu,
            subtitleText: tr.urdu || t.subtitleText,
          };
        }),
      );
      notify('Synced English, Urdu Nastaliq (اردو), and Roman Urdu dialogue across all turns!');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Dialogue translation failed');
    } finally {
      setIsTranslatingAll(false);
    }
  };

  // Generate a natural multi-character conversation script & emotions using Google Gemini
  const handleGenerateAiConversation = async () => {
    if (!aiTopicPrompt.trim() || isGeneratingAiConvo) return;
    setIsGeneratingAiConvo(true);
    try {
      const authHeaders = await buildUserAuthHeaders(null, { 'Content-Type': 'application/json' });
      const res = await fetch('/api/video/script-plan', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          prompt: aiTopicPrompt.trim(),
          sceneCount: Math.max(3, Math.min(6, turns.length || 4)),
          visualStyle: 'Disney/Pixar 3D CGI',
          characters: actors.map((a) => ({
            id: a.id,
            name: a.name,
            role: a.role,
            voiceName: a.voiceName,
            pitch: a.pitch,
            accentColor: a.accentColor,
          })),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        title?: string;
        scenes?: Array<{
          speakerName?: string;
          dialogueLine?: string;
          dialogueUrdu?: string;
          facialExpression?: string;
          durationSec?: number;
        }>;
        error?: string;
      };
      if (!res.ok || !data.scenes || data.scenes.length === 0) {
        throw new Error(data.error || 'Failed to generate AI conversation');
      }

      if (data.title) setSceneTitle(data.title);
      const nextTurns: ConversationDialogueTurn3D[] = data.scenes.map((sc, idx) => {
        const matchedActor =
          actors.find(
            (a) =>
              a.name.toLowerCase().includes((sc.speakerName || '').toLowerCase()) ||
              (sc.speakerName || '').toLowerCase().includes(a.name.split(' ')[0].toLowerCase()),
          ) || actors[idx % actors.length];

        const exprLower = (sc.facialExpression || '').toLowerCase();
        const inferredEmotion: CharacterEmotion3D = exprLower.includes('excit')
          ? 'excited'
          : exprLower.includes('surpris')
            ? 'surprised'
            : exprLower.includes('angr') || exprLower.includes('fierce')
              ? 'angry'
              : exprLower.includes('thought')
                ? 'thoughtful'
                : exprLower.includes('empath') || exprLower.includes('grat')
                  ? 'empathetic'
                  : 'happy';

        return {
          id: `turn-ai-${Date.now()}-${idx}`,
          speakerId: matchedActor.id,
          dialogueLine: sc.dialogueLine || `Line ${idx + 1}`,
          subtitleText: sc.dialogueUrdu || '',
          emotion: inferredEmotion,
          durationSec: sc.durationSec || 5,
        };
      });

      setTurns(nextTurns);
      setActiveTurnIdx(0);
      lastSpokenTurnIdRef.current = '';
      setIsPlaying(true);
      notify(`Generated ${nextTurns.length}-turn 3D conversation for ${actors.length} characters`);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'AI conversation generation failed');
    } finally {
      setIsGeneratingAiConvo(false);
    }
  };

  // Export 3D Scene Conversation Video (.webm / .mp4)
  const handleRecord3DConversationVideo = () => {
    const canvas = canvasRef.current;
    if (!canvas || isRecordingWebm) return;
    try {
      setIsRecordingWebm(true);
      setIsPlaying(true);
      notify('Recording 3D multi-character conversation scene...');
      const stream = canvas.captureStream(30);
      if (audioDestRef.current) {
        audioDestRef.current.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
      }
      const mimeType = MediaRecorder.isTypeSupported('video/mp4')
        ? 'video/mp4'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : 'video/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunks.push(ev.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${sceneTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'saz-3d-conversation'}.${mimeType.includes('mp4') ? 'mp4' : 'webm'}`;
        a.click();
        URL.revokeObjectURL(url);
        setIsRecordingWebm(false);
        notify('Exported 3D Character Conversation video');
      };
      recorder.start();
      window.setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop();
      }, 6000);
    } catch {
      setIsRecordingWebm(false);
    }
  };

  const activeTurn = turns[activeTurnIdx] || turns[0];
  const activeSpeaker = actors.find((a) => a.id === activeTurn?.speakerId) || actors[0];

  return (
    <div className="space-y-4">
      <audio ref={audioElRef} crossOrigin="anonymous" className="hidden" />

      {/* 3D Interactive Stage Viewport + Live Dialogue HUD */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-sm dark:border-slate-800">
        {/* Top Stage Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-900/95 px-4 py-2.5 text-xs text-white">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-amber-400 px-2 py-0.5 text-[10px] font-extrabold text-slate-950">
              THREE.JS 3D CONVERSATION ENGINE
            </span>
            <span className="font-bold text-slate-100">{sceneTitle}</span>
            <span className="hidden rounded-full border border-slate-700 bg-slate-800 px-2.5 py-0.5 text-[10px] font-semibold text-amber-300 sm:inline-block">
              {actors.length} 3D Characters · {turns.length} Dialogue Turns · Modular Lip-Sync
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {/* Camera Director Mode Selector */}
            {(
              [
                { id: 'auto_speaker', label: '🎥 Auto Speaker Cut' },
                { id: 'wide_group', label: '🌐 Wide Stage' },
                { id: 'focus_character', label: '🎯 Focus Actor' },
                { id: 'free_orbit', label: '🕹️ Free Orbit' },
              ] as const
            ).map((cam) => (
              <button
                key={cam.id}
                type="button"
                onClick={() => setCameraMode(cam.id)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                  cameraMode === cam.id
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {cam.label}
              </button>
            ))}

            <select
              value={environment}
              onChange={(e) => setEnvironment(e.target.value as StageEnvironment3D)}
              className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] font-bold text-slate-200"
              aria-label="3D Stage Environment"
            >
              <option value="studio_stage">🎬 Studio Stage</option>
              <option value="enchanted_forest">🌲 Enchanted Forest</option>
              <option value="cyber_lounge">🌆 Cyber Lounge</option>
              <option value="podcast_set">🎙️ Podcast Set</option>
            </select>
          </div>
        </div>

        {/* Three.js WebGL Canvas Container */}
        <div ref={stageContainerRef} className="relative h-[430px] w-full select-none overflow-hidden">
          <canvas ref={canvasRef} className="block h-full w-full cursor-grab active:cursor-grabbing" />

          {/* Top-Left Character Cast Badges (Click to Focus Camera) */}
          <div className=" absolute top-3 left-3 flex flex-wrap gap-1.5">
            {actors.map((actor) => {
              const isCurrentSpeaker = activeTurn?.speakerId === actor.id && isPlaying;
              return (
                <button
                  key={actor.id}
                  type="button"
                  onClick={() => {
                    setFocusedActorId(actor.id);
                    setCameraMode('focus_character');
                  }}
                  className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-left text-[11px] font-bold backdrop-blur-xs transition ${
                    isCurrentSpeaker
                      ? 'border-amber-400 bg-amber-400/90 text-slate-950 shadow-md'
                      : 'border-white/15 bg-black/65 text-white hover:border-amber-400/60'
                  }`}
                >
                  <span>{isCurrentSpeaker ? '🗣️' : '👤'}</span>
                  <span>{actor.name}</span>
                  <span className="rounded bg-black/25 px-1.5 py-0.2 text-[9px] uppercase">
                    {isCurrentSpeaker ? activeTurn?.emotion || actor.emotion : actor.emotion}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Live Lower-Third Conversation Subtitle & Lip-Sync Overlay */}
          {activeTurn && (
            <div className="pointer-events-none absolute right-4 bottom-14 left-4 mx-auto max-w-3xl rounded-2xl border border-amber-400/40 bg-slate-950/85 p-3.5 text-white backdrop-blur-md">
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-amber-400 px-2 py-0.5 text-[10px] font-extrabold text-slate-950">
                    TURN {activeTurnIdx + 1}/{turns.length}
                  </span>
                  <span className="font-extrabold text-amber-300">
                    {activeSpeaker?.name} ({activeSpeaker?.voiceName} Voice)
                  </span>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                    Emotion: {activeTurn.emotion.toUpperCase()}
                  </span>
                  <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                    {(activeTurn.spokenLanguage || globalVoiceLanguage).toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-emerald-400">
                    ● {liveSyncSourceLabel} · Jaw {liveJawOpenPct}%
                  </span>
                </div>
              </div>
              <p className="mt-1.5 text-sm font-bold text-white">“{activeTurn.dialogueLine}”</p>
              {(activeTurn.dialogueUrdu || activeTurn.subtitleText) && (
                <p dir="auto" className="mt-0.5 text-sm font-bold text-amber-300">
                  {activeTurn.dialogueUrdu || activeTurn.subtitleText}
                </p>
              )}
              {activeTurn.dialogueRomanUrdu && (
                <p className="mt-0.5 text-[11px] font-medium text-sky-300">
                  {activeTurn.dialogueRomanUrdu}
                </p>
              )}
            </div>
          )}

          {/* Bottom Transport Controls */}
          <div className="absolute right-3 bottom-3 left-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  lastSpokenTurnIdRef.current = '';
                  setIsPlaying((p) => !p);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-amber-400 px-3.5 py-1.5 text-xs font-extrabold text-slate-950 hover:bg-amber-300"
              >
                {isPlaying ? <Pause size={13} /> : <Play size={13} />}
                <span>{isPlaying ? 'Pause Scene' : 'Play Conversation'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  lastSpokenTurnIdRef.current = '';
                  setActiveTurnIdx((idx) => (idx + 1) % Math.max(1, turns.length));
                }}
                className="flex items-center gap-1 rounded-xl bg-slate-900/90 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800"
              >
                <SkipForward size={13} />
                <span>Next Turn</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const next = !isMuted;
                  setIsMuted(next);
                  if (next && 'speechSynthesis' in window) window.speechSynthesis.cancel();
                }}
                className="flex items-center gap-1 rounded-xl bg-slate-900/90 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800"
              >
                {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                <span>{isMuted ? 'Unmute' : 'Voice ON'}</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={isRecordingWebm}
                onClick={handleRecord3DConversationVideo}
                className="flex items-center gap-1.5 rounded-xl bg-sky-400 px-3 py-1.5 text-xs font-extrabold text-slate-950 hover:bg-sky-300 disabled:opacity-50"
              >
                <Download size={13} />
                <span>{isRecordingWebm ? 'Recording 3D Video...' : 'Export 3D Scene Video'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const el = stageContainerRef.current;
                  if (!el) return;
                  if (document.fullscreenElement) {
                    void document.exitFullscreen().catch(() => {});
                  } else if (el.requestFullscreen) {
                    void el.requestFullscreen().catch(() => {});
                  }
                }}
                className="rounded-xl bg-slate-900/90 p-1.5 text-white hover:bg-slate-800"
                title="Fullscreen 3D Stage"
              >
                <Maximize2 size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Editor Tabs: 1. Multi-Turn Dialogue & Emotions | 2. Multi-Character Creator | 3. Camera & Lip-Sync Rig */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                {
                  id: 'dialogue',
                  label: `💬 Dialogue & Emotions (${turns.length} Turns)`,
                },
                {
                  id: 'characters',
                  label: `👥 Create / Edit 3D Characters (${actors.length})`,
                },
                {
                  id: 'camera',
                  label: '🎥 Camera Controls & Modular Lip-Sync',
                },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedEditorTab(tab.id)}
                className={`rounded-xl px-3.5 py-2 text-xs font-extrabold transition ${
                  selectedEditorTab === tab.id
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {onSyncToVideoStudio && (
            <button
              type="button"
              onClick={() =>
                onSyncToVideoStudio({
                  title: sceneTitle,
                  characters: actors,
                  turns,
                })
              }
              className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-amber-400 hover:bg-slate-800 dark:bg-slate-800"
            >
              <Sparkles size={13} />
              <span>Sync Cast &amp; Dialogue to Video Studio</span>
            </button>
          )}
        </div>

        {/* TAB 1: DIALOGUE, EMOTIONS & AI CONVERSATION GENERATOR */}
        {selectedEditorTab === 'dialogue' && (
          <div className="mt-4 space-y-4">
            {/* AI Natural Conversation Generator + Multilingual Voice Toolbar */}
            <div className="space-y-2.5 rounded-xl border border-amber-400/30 bg-amber-500/5 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  value={aiTopicPrompt}
                  onChange={(e) => setAiTopicPrompt(e.target.value)}
                  placeholder="Enter a conversation topic in English, Urdu (اردو), or Roman Urdu..."
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-amber-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
                <button
                  type="button"
                  disabled={isGeneratingAiConvo}
                  onClick={() => void handleGenerateAiConversation()}
                  className="flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-xs font-extrabold text-slate-950 hover:bg-amber-300 disabled:opacity-50"
                >
                  <Wand2 size={13} />
                  <span>
                    {isGeneratingAiConvo
                      ? 'Writing Dialogue...'
                      : 'AI Write Conversation'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const nextActor = actors[turns.length % actors.length] || actors[0];
                    const newTurn: ConversationDialogueTurn3D = {
                      id: `turn-${Date.now()}`,
                      speakerId: nextActor.id,
                      dialogueLine: `Hello friends, let's share our next idea!`,
                      dialogueUrdu: 'آئیے دوستو، اپنا اگلا خیال پیش کرتے ہیں!',
                      dialogueRomanUrdu: 'Aaiye dosto, apna agla khayal paish karte hain!',
                      spokenLanguage: globalVoiceLanguage,
                      subtitleText: 'آئیے دوستو، اپنا اگلا خیال پیش کرتے ہیں!',
                      emotion: 'happy',
                      durationSec: 4,
                    };
                    setTurns((prev) => [...prev, newTurn]);
                  }}
                  className="flex shrink-0 items-center justify-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <Plus size={13} />
                  <span>Add Turn</span>
                </button>
              </div>

              {/* Multilingual Urdu / English Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-amber-400/20 pt-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300">
                    Spoken Voice Language:
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
                        setTurns((prev) =>
                          prev.map((t) => ({ ...t, spokenLanguage: langOpt.id })),
                        );
                        notify(`Set conversation voice language to ${langOpt.label}`);
                      }}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                        globalVoiceLanguage === langOpt.id
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300'
                      }`}
                    >
                      {langOpt.label}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    disabled={isTranslatingAll}
                    onClick={() => void handleTranslateAllTurns()}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 hover:border-amber-400 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  >
                    <RefreshCw size={12} className={isTranslatingAll ? 'animate-spin' : ''} />
                    <span>
                      {isTranslatingAll
                        ? 'Translating Urdu ↔ English...'
                        : 'AI Sync Urdu (اردو) & English'}
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={isSynthesizingAll}
                    onClick={() => void handleSynthesizeAllTurns()}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-1.5 text-xs font-extrabold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
                  >
                    <Volume2 size={13} />
                    <span>
                      {isSynthesizingAll
                        ? 'Synthesizing All Voices...'
                        : `Synthesize All (${globalVoiceLanguage.toUpperCase()})`}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Turn-by-Turn Editor List */}
            <div className="space-y-2.5">
              {turns.map((turn, tIdx) => {
                const isCurrent = activeTurnIdx === tIdx;
                const turnAudioSrc = turn.audioUrl || turn.audioDataUrl;
                return (
                  <div
                    key={turn.id}
                    className={`grid grid-cols-1 gap-2.5 rounded-xl border p-3 md:grid-cols-12 ${
                      isCurrent
                        ? 'border-amber-400 bg-amber-400/10'
                        : 'border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-950/60'
                    }`}
                  >
                    {/* Speaker, Emotion & Spoken Language Selector */}
                    <div className="space-y-2 md:col-span-3">
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => {
                            lastSpokenTurnIdRef.current = '';
                            setActiveTurnIdx(tIdx);
                            setIsPlaying(true);
                          }}
                          className="rounded-md bg-slate-900 px-2 py-0.5 text-[10px] font-extrabold text-amber-400"
                        >
                          ▶ Preview Turn {tIdx + 1}
                        </button>
                        {turns.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              setTurns((prev) => prev.filter((_, i) => i !== tIdx));
                              if (activeTurnIdx >= tIdx && activeTurnIdx > 0) {
                                setActiveTurnIdx(activeTurnIdx - 1);
                              }
                            }}
                            className="text-slate-400 hover:text-rose-500"
                            title="Delete Turn"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>

                      <select
                        value={turn.speakerId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTurns((prev) =>
                            prev.map((item, i) =>
                              i === tIdx ? { ...item, speakerId: val } : item,
                            ),
                          );
                        }}
                        className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      >
                        {actors.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({a.voiceName})
                          </option>
                        ))}
                      </select>

                      <div className="grid grid-cols-2 gap-1.5">
                        <select
                          value={turn.emotion}
                          onChange={(e) => {
                            const em = e.target.value as CharacterEmotion3D;
                            setTurns((prev) =>
                              prev.map((item, i) =>
                                i === tIdx ? { ...item, emotion: em } : item,
                              ),
                            );
                          }}
                          className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                        >
                          {EMOTION_OPTIONS.map((em) => (
                            <option key={em.id} value={em.id}>
                              {em.emoji} {em.label}
                            </option>
                          ))}
                        </select>

                        <select
                          value={turn.spokenLanguage || globalVoiceLanguage}
                          onChange={(e) => {
                            const lang = e.target.value as SpokenDialogueLang;
                            setTurns((prev) =>
                              prev.map((item, i) =>
                                i === tIdx ? { ...item, spokenLanguage: lang } : item,
                              ),
                            );
                          }}
                          className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-[11px] font-bold text-amber-700 dark:border-slate-700 dark:bg-slate-900 dark:text-amber-300"
                        >
                          <option value="urdu">🇵🇰 Speak Urdu</option>
                          <option value="english">🇬🇧 Speak English</option>
                          <option value="roman_urdu">🔤 Roman Urdu</option>
                          <option value="bilingual">🌐 Bilingual</option>
                        </select>
                      </div>
                    </div>

                    {/* Multilingual Dialogue Inputs: English + Urdu Nastaliq (اردو) + Roman Urdu */}
                    <div className="space-y-1.5 md:col-span-6">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500">
                          🇬🇧 English Dialogue Line
                        </label>
                        <input
                          value={turn.dialogueLine}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTurns((prev) =>
                              prev.map((item, i) =>
                                i === tIdx ? { ...item, dialogueLine: val } : item,
                              ),
                            );
                          }}
                          placeholder="English dialogue..."
                          className="mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                        <div>
                          <label className="block text-[10px] font-bold text-amber-700 dark:text-amber-400">
                            🇵🇰 Urdu Script (اردو مکالمہ)
                          </label>
                          <input
                            dir="auto"
                            value={turn.dialogueUrdu ?? turn.subtitleText ?? ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setTurns((prev) =>
                                prev.map((item, i) =>
                                  i === tIdx
                                    ? { ...item, dialogueUrdu: val, subtitleText: val }
                                    : item,
                                ),
                              );
                            }}
                            placeholder="اردو مکالمہ یہاں لکھیں..."
                            className="mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-amber-900 dark:border-slate-700 dark:bg-slate-900 dark:text-amber-300"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-sky-700 dark:text-sky-400">
                            🔤 Roman Urdu Phonetic
                          </label>
                          <input
                            value={turn.dialogueRomanUrdu || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setTurns((prev) =>
                                prev.map((item, i) =>
                                  i === tIdx ? { ...item, dialogueRomanUrdu: val } : item,
                                ),
                              );
                            }}
                            placeholder="Roman Urdu (e.g. Aap kaise hain?)"
                            className="mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Neural TTS Synthesis, Retry, Audio Preview & Duration */}
                    <div className="flex flex-col justify-between space-y-2 md:col-span-3">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        <span>Duration: {turn.durationSec}s</span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                          {turn.lipSyncEnvelope?.length
                            ? `${turn.lipSyncEnvelope.length} Lip-Sync Frames`
                            : 'Live Phoneme'}
                        </span>
                      </div>

                      {turnAudioSrc && (
                        <audio
                          controls
                          src={turnAudioSrc}
                          className="h-7 w-full rounded"
                        />
                      )}

                      {turn.synthError && (
                        <div className="rounded bg-rose-500/10 px-2 py-1 text-[10px] font-semibold text-rose-500">
                          {turn.synthError}
                        </div>
                      )}

                      <button
                        type="button"
                        disabled={synthesizingTurnId === turn.id}
                        onClick={() => void handleSynthesizeTurnAudio(tIdx)}
                        className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-amber-400 hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-800"
                      >
                        <Mic size={12} />
                        <span>
                          {synthesizingTurnId === turn.id
                            ? 'Synthesizing...'
                            : turn.synthError
                              ? '↻ Retry Voice Synthesis'
                              : turnAudioSrc
                                ? `↻ Re-Synthesize (${(turn.spokenLanguage || globalVoiceLanguage).toUpperCase()})`
                                : `Synthesize (${(turn.spokenLanguage || globalVoiceLanguage).toUpperCase()})`}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: MULTI-CHARACTER CREATOR & CUSTOMIZER */}
        {selectedEditorTab === 'characters' && (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Create up to 5 characters in the same 3D scene. Assign their 3D model archetype, name, voice, pitch, emotion, and colors.
              </p>
              <button
                type="button"
                disabled={actors.length >= 5}
                onClick={() => {
                  const idx = actors.length + 1;
                  const newActor: CharacterActor3D = {
                    id: `actor-${Date.now()}`,
                    name: `Character ${idx}`,
                    role: 'Co-Star',
                    archetype: ARCHETYPE_OPTIONS[idx % ARCHETYPE_OPTIONS.length].id,
                    voiceName: (['Fenrir', 'Kore', 'Puck', 'Charon', 'Zephyr'] as const)[idx % 5],
                    pitch: 1.0,
                    emotion: 'happy',
                    primaryColor: ['#38BDF8', '#F43F5E', '#A855F7', '#F59E0B', '#10B981'][idx % 5],
                    accentColor: '#FDE047',
                    scale: 1.0,
                  };
                  setActors((prev) => [...prev, newActor]);
                  notify(`Added ${newActor.name} to the 3D scene`);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-amber-400 px-3.5 py-2 text-xs font-extrabold text-slate-950 hover:bg-amber-300 disabled:opacity-40"
              >
                <Users size={13} />
                <span>+ Add 3D Character to Scene ({actors.length}/5)</span>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {actors.map((actor, aIdx) => (
                <div
                  key={actor.id}
                  className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950"
                >
                  <div className="flex items-center justify-between gap-2">
                    <input
                      value={actor.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setActors((prev) =>
                          prev.map((a, i) => (i === aIdx ? { ...a, name: val } : a)),
                        );
                      }}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-extrabold text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                    {actors.length > 2 && (
                      <button
                        type="button"
                        onClick={() => {
                          const remaining = actors.filter((_, i) => i !== aIdx);
                          setActors(remaining);
                          notify(`Removed ${actor.name} from 3D scene`);
                        }}
                        className="rounded p-1 text-slate-400 hover:text-rose-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500">
                        3D Rig Archetype
                      </label>
                      <select
                        value={actor.archetype}
                        onChange={(e) => {
                          const arch = e.target.value as CharacterArchetype3D;
                          setActors((prev) =>
                            prev.map((a, i) => (i === aIdx ? { ...a, archetype: arch } : a)),
                          );
                        }}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-bold dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      >
                        {ARCHETYPE_OPTIONS.map((ar) => (
                          <option key={ar.id} value={ar.id}>
                            {ar.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500">
                        Neural Voice
                      </label>
                      <select
                        value={actor.voiceName}
                        onChange={(e) => {
                          const vn = e.target.value as NeuralVoiceId;
                          setActors((prev) =>
                            prev.map((a, i) => (i === aIdx ? { ...a, voiceName: vn } : a)),
                          );
                        }}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-bold dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      >
                        {(['Fenrir', 'Kore', 'Puck', 'Charon', 'Zephyr'] as const).map((v) => (
                          <option key={v} value={v}>
                            🎙 {v}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500">
                        Default Emotion
                      </label>
                      <select
                        value={actor.emotion}
                        onChange={(e) => {
                          const em = e.target.value as CharacterEmotion3D;
                          setActors((prev) =>
                            prev.map((a, i) => (i === aIdx ? { ...a, emotion: em } : a)),
                          );
                        }}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-bold dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      >
                        {EMOTION_OPTIONS.map((em) => (
                          <option key={em.id} value={em.id}>
                            {em.emoji} {em.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500">
                        Primary Color
                      </label>
                      <input
                        type="color"
                        value={actor.primaryColor}
                        onChange={(e) => {
                          const col = e.target.value;
                          setActors((prev) =>
                            prev.map((a, i) => (i === aIdx ? { ...a, primaryColor: col } : a)),
                          );
                        }}
                        className="mt-1 h-7 w-full cursor-pointer rounded border border-slate-300 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: CAMERA DIRECTOR & MODULAR LIP-SYNC SETTINGS */}
        {selectedEditorTab === 'camera' && (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                  Orbit Yaw ({orbitYaw.toFixed(2)} rad)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setOrbitYaw(0);
                    setOrbitPitch(0.18);
                    setOrbitDistance(5.8);
                    setCameraMode('auto_speaker');
                  }}
                  className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400"
                >
                  <RotateCcw size={11} />
                  <span>Reset</span>
                </button>
              </div>
              <input
                type="range"
                min={-1.4}
                max={1.4}
                step={0.04}
                value={orbitYaw}
                onChange={(e) => {
                  setCameraMode('free_orbit');
                  setOrbitYaw(Number(e.target.value));
                }}
                className="w-full accent-amber-400"
              />
            </div>

            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950">
              <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                Camera Elevation ({orbitPitch.toFixed(2)} rad)
              </div>
              <input
                type="range"
                min={-0.1}
                max={0.75}
                step={0.03}
                value={orbitPitch}
                onChange={(e) => {
                  setCameraMode('free_orbit');
                  setOrbitPitch(Number(e.target.value));
                }}
                className="w-full accent-amber-400"
              />
            </div>

            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950">
              <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                Camera Zoom Distance ({orbitDistance.toFixed(1)}m)
              </div>
              <input
                type="range"
                min={3.2}
                max={9.0}
                step={0.2}
                value={orbitDistance}
                onChange={(e) => {
                  setCameraMode('free_orbit');
                  setOrbitDistance(Number(e.target.value));
                }}
                className="w-full accent-amber-400"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
