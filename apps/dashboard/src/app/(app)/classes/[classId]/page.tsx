'use client';

import { useParams } from 'next/navigation';
import { ClassEditor } from '@/features/classes/ClassEditor';

export default function Page() {
  const { classId } = useParams<{ classId: string }>();
  return <ClassEditor classId={classId} />;
}
