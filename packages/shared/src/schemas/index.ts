/**
 * Request/response shapes shared by the app, dashboard and API.
 * Source of truth: docs/DATA_AND_API.md.
 */
import { z } from 'zod';

export const Verdict = z.enum(['correct', 'close', 'wrong']);
export type Verdict = z.infer<typeof Verdict>;

export const InputMode = z.enum(['voice', 'typed']);
export type InputMode = z.infer<typeof InputMode>;

/** Highlight box as fractions (0–1) of the picture. */
export const Highlight = z.object({
  shape: z.enum(['ellipse', 'rect']),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  w: z.number().min(0).max(1),
  h: z.number().min(0).max(1),
});
export type Highlight = z.infer<typeof Highlight>;

/** POST /v1/rounds/:id/attempts */
export const AttemptRequest = z.object({
  termId: z.string().min(1),
  alternatives: z.array(z.string().max(200)).min(1).max(10),
  inputMode: InputMode,
  hintsUsed: z.number().int().min(0),
  ms: z.number().int().min(0),
  idempotencyKey: z.string().min(8).max(100),
});
export type AttemptRequest = z.infer<typeof AttemptRequest>;

export const AttemptResponse = z.object({
  verdict: Verdict,
  matched: z.string().nullable(),
  feedback: z.string(),
  pronunciation: z.object({
    syllables: z.string(),
    audioUrl: z.string().url().nullable(),
  }),
  livesLeft: z.number().int().min(0),
  xpGained: z.number().int().min(0),
});
export type AttemptResponse = z.infer<typeof AttemptResponse>;

/** Every error response uses this one shape. */
export const ApiError = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});
export type ApiError = z.infer<typeof ApiError>;

export const HealthResponse = z.object({ ok: z.literal(true) });
export type HealthResponse = z.infer<typeof HealthResponse>;
