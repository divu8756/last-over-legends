export const DEFAULT_GEMINI_MODEL = "gemini-flash-lite-latest";
/** If Bhaskar hasn't spoken an AI line by then, the line bank speaks instead. */
export const AI_TIMEOUT_MS = 2500;
/** Hard cap on AI commentary calls per match. */
export const MAX_AI_CALLS_PER_MATCH = 6;
export const MAX_AI_WORDS = 30;
/** Per-IP limit on the commentary endpoint (per serverless instance). */
export const RATE_LIMIT = { windowMs: 60_000, max: 30 };
