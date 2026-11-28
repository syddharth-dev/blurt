'use client';

import { useParams } from 'next/navigation';
import { TermEditor } from '@/features/topics/TermEditor';

/** /topics/:topicId/terms/new creates a term; any other id edits that term. */
export default function Page() {
  const { topicId, termId } = useParams<{ topicId: string; termId: string }>();
  return <TermEditor topicId={topicId} termId={termId === 'new' ? undefined : termId} />;
}
