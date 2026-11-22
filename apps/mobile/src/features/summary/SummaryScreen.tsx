import { router } from 'expo-router';
import { PrimaryButton } from '@/shared/ui/PrimaryButton';
import { Placeholder } from '@/shared/ui/Placeholder';

/** Placeholder. Specified in docs/SCREENS.md → "3. Round summary". */
export function SummaryScreen({ roundId }: { roundId: string }) {
  return (
    <Placeholder title="Nice round" body={`Round ${roundId}. Your summary shows up here.`}>
      <PrimaryButton label="Play again" onPress={() => router.replace('/')} />
    </Placeholder>
  );
}
