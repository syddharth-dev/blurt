import { loadEnv } from './env.js';

describe('loadEnv', () => {
  it('applies defaults and treats empty strings as unset', () => {
    const env = loadEnv({
      PORT: '',
      DATABASE_URL: '',
      CORS_ORIGINS: 'http://a.test, http://b.test',
    });
    expect(env.PORT).toBe(3000);
    expect(env.DATABASE_URL).toBeUndefined();
    expect(env.CORS_ORIGINS).toEqual(['http://a.test', 'http://b.test']);
  });

  it('requires DATABASE_URL and SUPABASE_URL in production', () => {
    expect(() => loadEnv({ NODE_ENV: 'production' })).toThrow(/DATABASE_URL, SUPABASE_URL/);
  });

  it('rejects a malformed SUPABASE_URL', () => {
    expect(() => loadEnv({ SUPABASE_URL: 'not a url' })).toThrow(/Invalid environment/);
  });
});
