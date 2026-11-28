/**
 * What a student may see (DATA_AND_API.md → "What students can see"): published topics that are
 * in the shared library or assigned to one of their classes. Used by every student query.
 */
import type { Prisma } from '../generated/prisma/client.js';

/** In one of this student's classes. */
export const assignedTo = (userId: string) =>
  ({
    classes: { some: { class: { enrollments: { some: { studentId: userId } } } } },
  }) satisfies Prisma.TopicWhereInput;

/** Topics a student may play: published, and in the shared library or assigned to their class. */
export const visibleTopic = (userId: string) =>
  ({
    status: 'PUBLISHED',
    OR: [{ visibility: 'LIBRARY' }, assignedTo(userId)],
  }) satisfies Prisma.TopicWhereInput;
