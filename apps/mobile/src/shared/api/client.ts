import { ApiError } from '@blurt/shared/schemas';
import type { z } from 'zod';
import { accessToken } from '../auth/session';
import { config } from '../config';

const TIMEOUT_MS = 8_000;

/** Any failed API call. `offline` is true when the server couldn't be reached at all. */
export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly offline: boolean,
  ) {
    super(message);
  }
}

type Options<S extends z.ZodType> = {
  method?: 'GET' | 'POST' | 'PATCH';
  body?: unknown;
  schema: S;
};

/** Calls the Blurt! API with the signed-in user's token and validates the response. */
export async function api<S extends z.ZodType>(
  path: string,
  opts: Options<S>,
): Promise<z.infer<S>> {
  if (!config.apiUrl)
    throw new ApiRequestError('The app has no API address.', 0, 'NOT_CONFIGURED', true);
  const token = await accessToken();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${config.apiUrl}/v1${path}`, {
      method: opts.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(opts.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      signal: controller.signal,
    });
  } catch {
    throw new ApiRequestError("Can't reach Blurt! right now.", 0, 'OFFLINE', true);
  } finally {
    clearTimeout(timer);
  }

  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const parsed = ApiError.safeParse(json);
    throw new ApiRequestError(
      parsed.success ? parsed.data.error.message : `Request failed (${res.status})`,
      res.status,
      parsed.success ? parsed.data.error.code : 'HTTP_ERROR',
      false,
    );
  }
  const data = opts.schema.safeParse(json);
  if (!data.success)
    throw new ApiRequestError(
      'Unexpected response from the server.',
      res.status,
      'BAD_RESPONSE',
      false,
    );
  return data.data;
}

export const isOffline = (e: unknown) => e instanceof ApiRequestError && e.offline;
