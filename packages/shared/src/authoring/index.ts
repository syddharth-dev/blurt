/** Term-authoring helpers used by the teacher dashboard and the API (TEACHER_DASHBOARD.md). */
export { suggestSyllables } from './syllables.js';
export {
  defaultConfusableFeedback,
  suggestConfusables,
  type ConfusableCandidate,
  type ConfusableSuggestion,
} from './confusables.js';
export {
  defaultDisplay,
  termChecks,
  type CheckableTerm,
  type CheckOptions,
  type TermChecks,
} from './checks.js';
