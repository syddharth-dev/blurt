import { describe, it } from 'vitest';

/**
 * Required tests from docs/SPEECH_AND_MATCHING.md → "Unit tests you must have".
 * They become real tests when the matcher is built in ROADMAP Phase 1.
 * AGENTS.md rule 4: confusable terms must never match each other.
 */
describe('matchAnswer', () => {
  describe('confusable guard', () => {
    it.todo('proton ✗ neutron');
    it.todo('mitosis ✗ meiosis');
    it.todo('anion ✗ cation');
    it.todo('nucleus ✗ nucleolus');
  });

  it.todo('nuclear → CLOSE for nucleus');
  it.todo('nuclei → CORRECT for nucleus');
  it.todo('"um the nucleus" → CORRECT');
  it.todo('alternatives ["new clears", "nucleus"] → CORRECT (second alternative wins)');
  it.todo('typed input uses a stricter NEAR threshold');
});
