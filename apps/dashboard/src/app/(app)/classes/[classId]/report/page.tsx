'use client';

import { useParams } from 'next/navigation';
import { useClass } from '@/features/classes/api';
import { ClassReportPage } from '@/features/reports/ClassReportPage';

export default function Page() {
  const { classId } = useParams<{ classId: string }>();
  const c = useClass(classId);
  return <ClassReportPage classId={classId} className={c.data?.name} />;
}
