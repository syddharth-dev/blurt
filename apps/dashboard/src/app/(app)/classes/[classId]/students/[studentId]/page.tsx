'use client';

import { useParams } from 'next/navigation';
import { StudentReportPage } from '@/features/reports/StudentReportPage';

export default function Page() {
  const { classId, studentId } = useParams<{ classId: string; studentId: string }>();
  return <StudentReportPage classId={classId} studentId={studentId} />;
}
