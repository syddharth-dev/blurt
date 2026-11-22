import { createMockSpeechAdapter } from './mockSpeechAdapter';
import { mapError } from './nativeSpeechAdapter';

jest.mock('expo-speech-recognition', () => ({ ExpoSpeechRecognitionModule: {} }));

describe('MockSpeechAdapter', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('plays the prototype flow: partials, then alternatives, then end', () => {
    const r = createMockSpeechAdapter();
    const events: string[] = [];
    r.onPartial((t) => events.push(`partial:${t}`));
    r.onFinal((a) => events.push(`final:${a.join('|')}`));
    r.onEnd(() => events.push('end'));

    r.start({ lang: 'en-US', hints: [] });
    jest.runAllTimers();
    r.start({ lang: 'en-US', hints: [] });
    jest.runAllTimers();

    expect(events).toEqual([
      'partial:nu',
      'partial:nucle',
      'final:nuclear',
      'end',
      'partial:nu',
      'partial:nucle',
      'final:new clears|nucleus',
      'end',
    ]);
  });

  it('stop() finishes early with the final result; abort() reports aborted', () => {
    const r = createMockSpeechAdapter([{ partials: ['a', 'b'], final: ['ab'] }]);
    const finals: string[][] = [];
    const errors: string[] = [];
    r.onFinal((a) => finals.push(a));
    r.onError((e) => errors.push(e.code));

    r.start({ lang: 'en-US', hints: [] });
    r.stop();
    r.start({ lang: 'en-US', hints: [] });
    r.abort();
    jest.runAllTimers();

    expect(finals).toEqual([['ab']]);
    expect(errors).toEqual(['aborted']);
  });

  it('can script errors', () => {
    const r = createMockSpeechAdapter([{ error: { code: 'no-speech', message: '' } }]);
    const errors: string[] = [];
    r.onError((e) => errors.push(e.code));
    r.start({ lang: 'en-US', hints: [] });
    jest.runAllTimers();
    expect(errors).toEqual(['no-speech']);
  });
});

describe('mapError', () => {
  it('maps native error codes to the port’s codes', () => {
    expect(mapError('speech-timeout')).toBe('no-speech');
    expect(mapError('interrupted')).toBe('audio-capture');
    expect(mapError('too-many-requests')).toBe('busy');
    expect(mapError('service-not-allowed')).toBe('unavailable');
    expect(mapError('bad-grammar')).toBe('unknown');
  });
});
