import { router } from 'expo-router';
import { PrimaryButton } from '@/shared/ui/PrimaryButton';
import { Placeholder } from '@/shared/ui/Placeholder';

/** Placeholder. Phase 1 builds the speech spike here; Phase 2 the full Play screen (docs/SCREENS.md). */
export function PlayScreen({ topicId }: { topicId: string }) {
  return (
    <Placeholder title="Play" body={`Topic: ${topicId}. The mic test goes here next.`}>
      <PrimaryButton label="Back home" onPress={() => router.back()} />
    </Placeholder>
  );
}
