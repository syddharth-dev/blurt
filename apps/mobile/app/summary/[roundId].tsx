import { useLocalSearchParams } from 'expo-router';
import { SummaryScreen } from '@/features/summary/SummaryScreen';

export default function SummaryRoute() {
  const { roundId } = useLocalSearchParams<{ roundId: string }>();
  return <SummaryScreen roundId={roundId} />;
}
