import { useLocalSearchParams } from 'expo-router';
import { PlayScreen } from '@/features/play/PlayScreen';

export default function PlayRoute() {
  const { topicId, ids } = useLocalSearchParams<{ topicId: string; ids?: string }>();
  return <PlayScreen topicId={topicId} termIds={ids ? ids.split(',') : undefined} />;
}
