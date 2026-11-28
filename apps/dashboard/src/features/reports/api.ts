'use client';

import {
  ClassReport,
  StudentReport,
  TeacherOverview,
  type ReportRange,
} from '@blurt/shared/schemas';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

/** Data for reports (DATA_AND_API.md → Teacher: reports). */
export const useOverview = () =>
  useQuery({
    queryKey: ['teacher', 'overview'],
    queryFn: () => api('/teacher/overview', { schema: TeacherOverview }),
  });

export const useClassReport = (classId: string, range: ReportRange) =>
  useQuery({
    queryKey: ['teacher', 'report', classId, range],
    queryFn: () =>
      api(`/teacher/classes/${classId}/report?range=${range}`, { schema: ClassReport }),
  });

export const useStudentReport = (classId: string, studentId: string, range: ReportRange) =>
  useQuery({
    queryKey: ['teacher', 'report', classId, studentId, range],
    queryFn: () =>
      api(`/teacher/classes/${classId}/students/${studentId}/report?range=${range}`, {
        schema: StudentReport,
      }),
  });
