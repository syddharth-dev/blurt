import { useLocalSearchParams } from 'expo-router';
import { PlayScreen } from '@/features/play/PlayScreen';

export default function PlayRoute() {
  const { topicId } = useLocalSearchParams<{ topicId: string }>();
  return <PlayScreen topicId={topicId} />;
}
