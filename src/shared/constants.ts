/** Posição do herói na mesa 6-max (spec §2.1) */
export const POSITIONS = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'] as const;
export type Position = (typeof POSITIONS)[number];

/** Tipos de ação pré-flop (spec §2.3) */
export const ACTION_TYPES = [
  'FOLD',
  'CALL',
  'RAISE_OPEN',
  'RAISE_3BET',
  'RAISE_4BET',
  'ALL_IN',
] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

export const FEEDBACK_MODES = ['IMMEDIATE', 'END_OF_SESSION'] as const;
export type FeedbackMode = (typeof FEEDBACK_MODES)[number];

export const THEME_MODES = ['light', 'dark'] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

export const DEFAULT_USER_PREFERENCES = {
  theme: 'dark' as ThemeMode,
  defaultTrainingTotalHands: 25,
  defaultTrainingTimerSeconds: 0,
  defaultTrainingFeedbackMode: 'IMMEDIATE' as FeedbackMode,
  defaultSimultaneousTableCount: 2 as const,
};

export const RANK_CHARS = [
  'A',
  'K',
  'Q',
  'J',
  'T',
  '9',
  '8',
  '7',
  '6',
  '5',
  '4',
  '3',
  '2',
] as const;
export type RankChar = (typeof RANK_CHARS)[number];

export const SUITS = ['s', 'h', 'd', 'c'] as const;
export type SuitChar = (typeof SUITS)[number];

export const KEYTAR_SERVICE = 'preflop-trainer';
export const KEYTAR_JWT_ACCOUNT = 'session-jwt';

export const BCRYPT_ROUNDS = 12;
