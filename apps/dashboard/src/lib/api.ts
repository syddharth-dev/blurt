import { ApiError } from '@blurt/shared/schemas';
import type { z } from 'zod';
import { config } from './config';
import { supabase } from './supabase';

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
  }
}

type Options<S extends z.ZodType> = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  schema: S;
};

/** Calls the Blurt! API as the signed-in teacher and validates the response with the shared schema. */
export async function api<S extends z.ZodType>(
  path: string,
  opts: Options<S>,
): Promise<z.infer<S>> {
  const token = (await supabase?.auth.getSession())?.data.session?.access_token;
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
    });
  } catch {
    throw new ApiRequestError("Can't reach Blurt! right now. Check your connection.", 0, 'OFFLINE');
  }
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const parsed = ApiError.safeParse(json);
    throw new ApiRequestError(
      parsed.success ? parsed.data.error.message : `Request failed (${res.status})`,
      res.status,
      parsed.success ? parsed.data.error.code : 'HTTP_ERROR',
    );
  }
  const data = opts.schema.safeParse(json);
  if (!data.success)
    throw new ApiRequestError('Unexpected response from the server.', res.status, 'BAD_RESPONSE');
  return data.data;
}
