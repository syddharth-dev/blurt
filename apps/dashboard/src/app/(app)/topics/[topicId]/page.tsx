'use client';

import { useParams } from 'next/navigation';
import { TopicEditor } from '@/features/topics/TopicEditor';

export default function Page() {
  const { topicId } = useParams<{ topicId: string }>();
  return <TopicEditor topicId={topicId} />;
}
