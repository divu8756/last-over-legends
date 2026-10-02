/** localStorage wrapper: every read and write is allowed to fail. */
export function load<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

export function save<T>(key: string, value: T) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
}

export interface Profile {
  matches: number;
  wins: number;
  sixes: number;
  fours: number;
  bestChase: number;
  achievements: string[];
  jersey: string;
  muted: boolean;
  daily: Record<string, { won: boolean; runs: number; target: number }>;
}

export const PROFILE_KEY = "lol-profile-v1";

export const DEFAULT_PROFILE: Profile = {
  matches: 0,
  wins: 0,
  sixes: 0,
  fours: 0,
  bestChase: 0,
  achievements: [],
  jersey: "team",
  muted: false,
  daily: {},
};

export const loadProfile = () => load(PROFILE_KEY, DEFAULT_PROFILE);
export const saveProfile = (p: Profile) => save(PROFILE_KEY, p);
