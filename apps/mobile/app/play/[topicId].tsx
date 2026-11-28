import { useLocalSearchParams } from 'expo-router';
import { PlayScreen } from '@/features/play/PlayScreen';

export default function PlayRoute() {
  const { topicId, ids, daily } = useLocalSearchParams<{
    topicId: string;
    ids?: string;
    daily?: string;
  }>();
  return (
    <PlayScreen
      topicId={topicId}
      termIds={ids ? ids.split(',') : undefined}
      daily={daily === '1'}
    />
  );
}
