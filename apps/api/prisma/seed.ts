/**
 * Seeds the starter library: subjects, the Grade 8 topics and terms (with variants and
 * confusables), and the bundled diagrams. Idempotent: run as often as you like.
 * Run: pnpm --filter api db:seed
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { DIAGRAMS, GRADE8_TERMS, topicsOf, topicSlug } from '@blurt/shared/content';
import { subjectColors } from '@blurt/shared/theme';
import { PrismaClient } from '../src/generated/prisma/client.js';

/** Owner of library content (topics need an owner). Not a sign-in account. */
export const LIBRARY_OWNER_ID = 'library';

const subjectId = (name: string) => topicSlug(name);
const db = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '',
  }),
});

async function main() {
  await db.user.upsert({
    where: { id: LIBRARY_OWNER_ID },
    update: {},
    create: { id: LIBRARY_OWNER_ID, role: 'ADMIN', name: 'Blurt! library' },
  });

  for (const [name, look] of Object.entries(subjectColors)) {
    await db.subject.upsert({
      where: { id: subjectId(name) },
      update: { name, color: look.panel },
      create: { id: subjectId(name), name, color: look.panel },
    });
  }

  for (const d of Object.values(DIAGRAMS)) {
    await db.picture.upsert({
      where: { id: `diagram-${d.id}` },
      update: { diagram: d.id, altText: d.altText, state: 'READY' },
      create: {
        id: `diagram-${d.id}`,
        ownerId: LIBRARY_OWNER_ID,
        diagram: d.id,
        altText: d.altText,
        width: 200,
        height: 200,
        state: 'READY',
      },
    });
  }

  for (const topic of topicsOf(GRADE8_TERMS)) {
    await db.topic.upsert({
      where: { id: topic.id },
      update: {
        title: topic.title,
        subjectId: subjectId(topic.subject),
        status: 'PUBLISHED',
        visibility: 'LIBRARY',
      },
      create: {
        id: topic.id,
        title: topic.title,
        subjectId: subjectId(topic.subject),
        ownerId: LIBRARY_OWNER_ID,
        grade: 8,
        status: 'PUBLISHED',
        visibility: 'LIBRARY',
      },
    });

    for (const [position, t] of topic.terms.entries()) {
      const data = {
        topicId: topic.id,
        position,
        canonical: t.canonical,
        display: t.display,
        syllables: t.syllables,
        clue: t.clue,
        fact: t.fact,
        difficulty: t.difficulty,
        status: 'PUBLISHED' as const,
        // The starter set only uses bundled diagrams.
        pictureId: t.picture && 'diagram' in t.picture ? `diagram-${t.picture.diagram}` : null,
        highlight: t.picture ? t.picture.highlight : {},
      };
      await db.term.upsert({ where: { id: t.id }, update: data, create: { id: t.id, ...data } });
      // Replace variants and confusables so edits to the starter set take effect.
      await db.termVariant.deleteMany({ where: { termId: t.id } });
      await db.confusable.deleteMany({ where: { termId: t.id } });
      await db.termVariant.createMany({
        data: [
          ...t.accept.map((text) => ({ termId: t.id, text, kind: 'ACCEPT' as const })),
          ...t.close.map((c) => ({
            termId: t.id,
            text: c.text,
            kind: 'CLOSE' as const,
            reason: c.reason,
          })),
        ],
      });
      await db.confusable.createMany({
        data: t.confusables.map((c) => ({ termId: t.id, otherText: c.text, feedback: c.feedback })),
      });
    }
  }

  const counts = await Promise.all([
    db.subject.count(),
    db.topic.count(),
    db.term.count(),
    db.picture.count(),
  ]);
  console.log(
    `Seeded: ${counts[0]} subjects, ${counts[1]} topics, ${counts[2]} terms, ${counts[3]} pictures`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
