import { cleanClassCode, joinErrorCopy, looksMistyped } from './joinCopy';

describe('class code input', () => {
  it('cleans what the student types', () => {
    expect(cleanClassCode(' k7q-2mx ')).toBe('K7Q2MX');
    expect(cleanClassCode('k7q2mxzz')).toBe('K7Q2MX');
  });

  it('spots characters codes never use (0, O, 1, I, L)', () => {
    expect(looksMistyped('K7Q2MX')).toBe(false);
    expect(looksMistyped('K0Q2MX')).toBe(true);
    expect(looksMistyped('KIQ2MX')).toBe(true);
  });

  it('explains errors in Pip’s voice, never "wrong"', () => {
    expect(joinErrorCopy({ code: 'CLASS_NOT_FOUND' })).toMatch(/check it with your teacher/i);
    expect(joinErrorCopy({ code: 'OFFLINE' })).toMatch(/offline/i);
    expect(joinErrorCopy({ status: 429 })).toMatch(/wait a minute/i);
    expect(joinErrorCopy(null)).not.toMatch(/wrong code|incorrect/i);
  });
});
