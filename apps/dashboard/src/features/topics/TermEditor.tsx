'use client';

import { defaultDisplay, suggestSyllables, termChecks } from '@blurt/shared/authoring';
import {
  Highlight,
  type CreateTerm,
  type TeacherTerm,
  type TeacherTopicDetail,
} from '@blurt/shared/schemas';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  useFieldArray,
  useForm,
  useWatch,
  type Control,
  type UseFormRegister,
} from 'react-hook-form';
import { z } from 'zod';
import { Button, Card, Chip, Field, Input, Notice, StatusChip, Textarea } from '@/components/ui';
import { useConfusableSuggestions, usePicture, useTerm, useTermActions, useTopic } from './api';
import { PhonePreview } from './PhonePreview';
import { aspectOf, pictureSrc } from './picture';
import { PictureField } from './PictureField';
import { VoiceTest } from './VoiceTest';

/** Rows with text need their reason or feedback; blank rows are dropped on save. */
function needsSecond(second: 'reason' | 'feedback', message: string) {
  return (rows: Array<{ text: string } & Record<string, string>>, ctx: z.RefinementCtx) =>
    rows.forEach((row, i) => {
      if (row.text.trim() && !row[second]?.trim())
        ctx.addIssue({ code: 'custom', path: [i, second], message });
    });
}

const FormValues = z.object({
  canonical: z.string().trim().min(1, 'Type the answer.'),
  display: z.string(),
  syllables: z.string(),
  clue: z.string(),
  fact: z.string(),
  accept: z.array(z.object({ text: z.string() })),
  close: z
    .array(z.object({ text: z.string(), reason: z.string() }))
    .superRefine(needsSecond('reason', 'Say why it’s close, e.g. “that’s the adjective”.')),
  confusables: z
    .array(z.object({ text: z.string(), feedback: z.string() }))
    .superRefine(
      needsSecond(
        'feedback',
        'Write what Pip says, e.g. “That’s the neutron. This one has a charge.”',
      ),
    ),
  difficulty: z.number().int().min(1).max(3),
  pictureId: z.string().nullable(),
  highlight: Highlight.nullable(),
});
type FormValues = z.infer<typeof FormValues>;

const toForm = (t?: TeacherTerm): FormValues => ({
  canonical: t?.canonical ?? '',
  display: t?.display ?? '',
  syllables: t?.syllables ?? '',
  clue: t?.clue ?? '',
  fact: t?.fact ?? '',
  accept: (t?.accept ?? []).map((text) => ({ text })),
  close: t?.close ?? [],
  confusables: t?.confusables ?? [],
  difficulty: t?.difficulty ?? 1,
  pictureId: t?.picture?.id ?? null,
  highlight: t?.highlight ?? null,
});

const toBody = (v: FormValues) => ({
  canonical: v.canonical.trim(),
  display: v.display.trim(),
  syllables: v.syllables.trim(),
  clue: v.clue.trim(),
  fact: v.fact.trim(),
  accept: v.accept.map((a) => a.text.trim()).filter(Boolean),
  close: v.close
    .filter((c) => c.text.trim())
    .map((c) => ({ text: c.text.trim(), reason: c.reason.trim() })),
  confusables: v.confusables
    .filter((c) => c.text.trim())
    .map((c) => ({ text: c.text.trim(), feedback: c.feedback.trim() })),
  difficulty: v.difficulty,
  pictureId: v.pictureId,
  highlight: v.highlight,
});

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

/** Term editor (TEACHER_DASHBOARD.md → Term editor). `termId` undefined = a new term. */
export function TermEditor({ topicId, termId }: { topicId: string; termId?: string }) {
  const topic = useTopic(topicId);
  const term = useTerm(termId);
  if (topic.isPending || (termId && term.isPending))
    return (
      <p role="status" className="text-ink2">
        Loading…
      </p>
    );
  if (topic.isError) return <Notice tone="error">{topic.error.message}</Notice>;
  if (term.isError) return <Notice tone="error">{term.error.message}</Notice>;
  return (
    <Editor
      // A fresh form after each save, so the fields show what was stored.
      key={term.data ? `${term.data.id}:${term.data.updatedAt}` : 'new'}
      topic={topic.data}
      term={term.data}
    />
  );
}

function Editor({ topic, term }: { topic: TeacherTopicDetail; term?: TeacherTerm }) {
  const router = useRouter();
  const actions = useTermActions(topic.id);
  const form = useForm<FormValues>({
    resolver: zodResolver(FormValues),
    defaultValues: toForm(term),
  });
  const { register, control, formState } = form;
  const values = useWatch({ control }) as FormValues;
  const published = term?.status === 'PUBLISHED';

  const picture = usePicture(values.pictureId, term?.picture).data;
  const body = toBody({ ...toForm(), ...values });
  const checks = termChecks(
    {
      ...body,
      hasPicture: picture?.state === 'READY',
      hasHighlight: !!values.highlight,
      hasAltText: !!picture?.altText,
    },
    { requirePicture: !topic.library },
  );
  const setPicture = (id: string | null) => form.setValue('pictureId', id, { shouldDirty: true });
  const setHighlight = (h: Highlight | null) =>
    form.setValue('highlight', h, { shouldDirty: true });

  const save = (publish: boolean) =>
    form.handleSubmit((v) => {
      const payload: CreateTerm = { ...toBody(v), publish };
      if (term) actions.update.mutate({ id: term.id, ...payload });
      else
        actions.create.mutate(payload, {
          onSuccess: (t) => router.replace(`/topics/${topic.id}/terms/${t.id}`),
        });
    });
  const pending = actions.create.isPending || actions.update.isPending;
  const error = actions.create.error ?? actions.update.error ?? actions.remove.error;

  return (
    <div className="flex max-w-6xl flex-col gap-s20">
      <Link
        href={`/topics/${topic.id}`}
        className="self-start font-bold text-violet hover:underline"
      >
        ← {topic.title}
      </Link>
      <div className="flex flex-wrap items-center gap-s12">
        <h1 className="font-display text-4xl text-night">
          {term ? term.display : values.canonical ? defaultDisplay(values.canonical) : 'New term'}
        </h1>
        {term ? <StatusChip status={term.status} /> : null}
        {term && term.version > 1 ? <Chip>Version {term.version}</Chip> : null}
      </div>

      <div className="grid gap-s20 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="flex flex-col gap-s20">
          <Card>
            <PictureField
              picture={values.pictureId ? picture : null}
              highlight={values.highlight}
              onPicture={setPicture}
              onHighlight={setHighlight}
            />
          </Card>
          <VoiceTest
            term={{
              canonical: body.canonical,
              accept: body.accept,
              close: body.close,
              confusables: body.confusables,
            }}
          />
          <PhonePreview
            src={values.pictureId ? pictureSrc(picture) : null}
            aspect={aspectOf(picture)}
            highlight={values.highlight}
            clue={values.clue}
          />
          <Checklist
            problems={checks.problems}
            warnings={checks.warnings}
            library={topic.library}
          />
        </div>

        <Card className="flex flex-col gap-s20">
          <form noValidate className="flex flex-col gap-s16" onSubmit={save(published)}>
            <div className="grid gap-s16 md:grid-cols-2">
              <Field label="Answer" error={formState.errors.canonical?.message}>
                <Input autoComplete="off" placeholder="nucleus" {...register('canonical')} />
              </Field>
              <Field label="Display name" hint="Blank uses the answer with a capital letter.">
                <Input
                  autoComplete="off"
                  placeholder={defaultDisplay(values.canonical) || 'Nucleus'}
                  {...register('display')}
                />
              </Field>
            </div>
            <Syllables
              register={register}
              answer={values.canonical}
              current={values.syllables}
              onUse={(s) => form.setValue('syllables', s, { shouldDirty: true })}
            />
            <Field label="Clue" hint="One sentence, shown as the first hint. Don't use the answer.">
              <Textarea placeholder="The control centre of the cell." {...register('clue')} />
            </Field>
            <Field label="Quick fact" hint="One sentence, shown after a correct answer.">
              <Textarea placeholder="Most cells have just one." {...register('fact')} />
            </Field>

            <AcceptList control={control} register={register} />
            <PairList
              control={control}
              register={register}
              name="close"
              second="reason"
              label="Close (word family)"
              hint="Counts as close, not correct. The reason is shown to the student."
              textPlaceholder="nuclear"
              secondPlaceholder="that's the adjective"
              errors={formState.errors.close}
            />
            <PairList
              control={control}
              register={register}
              name="confusables"
              second="feedback"
              label="Never accept (confusables)"
              hint="Terms that must never count as this one."
              textPlaceholder="nucleolus"
              secondPlaceholder="That's the nucleolus, inside the nucleus."
              errors={formState.errors.confusables}
            />
            <Suggestions
              topicId={topic.id}
              termId={term?.id}
              answer={values.canonical}
              control={control}
            />

            <fieldset className="flex flex-col gap-s6">
              <legend className="mb-s6 text-xs font-bold tracking-wider text-ink2 uppercase">
                Difficulty
              </legend>
              <div className="flex gap-s8">
                {[1, 2, 3].map((d) => (
                  <label
                    key={d}
                    className={`flex min-h-11 cursor-pointer items-center rounded-chip border-2 px-s16 font-bold ${
                      values.difficulty === d
                        ? 'border-violet bg-violet-tint text-violet-ink'
                        : 'border-track text-night'
                    }`}
                  >
                    <input
                      type="radio"
                      value={d}
                      className="sr-only"
                      {...register('difficulty', { valueAsNumber: true })}
                    />
                    {['Easy', 'Medium', 'Hard'][d - 1]}
                  </label>
                ))}
              </div>
            </fieldset>

            {error ? <Notice tone="error">{error.message}</Notice> : null}
            {actions.update.isSuccess && !formState.isDirty ? (
              <Notice tone="success">
                Saved.
                {published
                  ? ' Students see it from their next round; rounds in progress keep the old version.'
                  : ''}
              </Notice>
            ) : null}

            <div className="flex flex-wrap items-center gap-s8 border-t-2 border-track pt-s16">
              {published ? (
                <Button type="submit" disabled={pending}>
                  {pending ? 'Saving…' : 'Save changes'}
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={pending}
                    onClick={save(false)}
                  >
                    {pending ? 'Saving…' : 'Save draft'}
                  </Button>
                  <Button
                    type="button"
                    disabled={pending || checks.problems.length > 0}
                    onClick={save(true)}
                    title={checks.problems.length ? 'Fix the checklist first' : undefined}
                  >
                    Publish
                  </Button>
                </>
              )}
              {term ? (
                <Button
                  variant="danger"
                  className="ml-auto"
                  disabled={actions.remove.isPending}
                  onClick={() => {
                    const msg = published
                      ? `Remove "${term.display}"? Students won't see it any more. Past results keep it.`
                      : `Delete the draft "${term.display}"?`;
                    if (window.confirm(msg))
                      actions.remove.mutate(term.id, {
                        onSuccess: () => router.replace(`/topics/${topic.id}`),
                      });
                  }}
                >
                  {published ? 'Remove' : 'Delete draft'}
                </Button>
              ) : null}
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

function Syllables({
  register,
  answer,
  current,
  onUse,
}: {
  register: UseFormRegister<FormValues>;
  answer: string;
  current: string;
  onUse: (s: string) => void;
}) {
  const suggestion = suggestSyllables(answer);
  return (
    <Field label="Syllables" hint="Blank uses the suggestion. Separate syllables with ·">
      <span className="flex gap-s8">
        <Input
          autoComplete="off"
          className="flex-1"
          placeholder={suggestion || 'nu·cle·us'}
          {...register('syllables')}
        />
        {suggestion && suggestion !== current ? (
          <Button variant="ghost" onClick={() => onUse(suggestion)}>
            Use {suggestion}
          </Button>
        ) : null}
      </span>
    </Field>
  );
}

function AcceptList({
  control,
  register,
}: {
  control: Control<FormValues>;
  register: UseFormRegister<FormValues>;
}) {
  const { fields, append, remove } = useFieldArray({ control, name: 'accept' });
  return (
    <div className="flex flex-col gap-s6">
      <span className="text-xs font-bold tracking-wider text-ink2 uppercase">Also accept</span>
      <span className="text-sm text-ink2">Plurals and other spellings, e.g. “nuclei”.</span>
      {fields.map((f, i) => (
        <span key={f.id} className="flex gap-s8">
          <Input
            aria-label={`Also accept ${i + 1}`}
            autoComplete="off"
            className="flex-1"
            {...register(`accept.${i}.text`)}
          />
          <Button
            variant="ghost"
            aria-label={`Remove accepted answer ${i + 1}`}
            onClick={() => remove(i)}
          >
            ✕
          </Button>
        </span>
      ))}
      <Button variant="ghost" className="self-start" onClick={() => append({ text: '' })}>
        + Add a spelling
      </Button>
    </div>
  );
}

type PairName = 'close' | 'confusables';

function PairList({
  control,
  register,
  name,
  second,
  label,
  hint,
  textPlaceholder,
  secondPlaceholder,
  errors,
}: {
  control: Control<FormValues>;
  register: UseFormRegister<FormValues>;
  name: PairName;
  second: 'reason' | 'feedback';
  label: string;
  hint: string;
  textPlaceholder: string;
  secondPlaceholder: string;
  errors?: unknown;
}) {
  const { fields, append, remove } = useFieldArray({ control, name });
  const rowError = (i: number) =>
    (errors as Array<Record<string, { message?: string }> | undefined> | undefined)?.[i]?.[second]
      ?.message;
  return (
    <div className="flex flex-col gap-s6">
      <span className="text-xs font-bold tracking-wider text-ink2 uppercase">{label}</span>
      <span className="text-sm text-ink2">{hint}</span>
      {fields.map((f, i) => (
        <div key={f.id} className="flex flex-col gap-s4">
          <span className="flex gap-s8">
            <Input
              aria-label={`${label} ${i + 1}: word`}
              autoComplete="off"
              placeholder={textPlaceholder}
              className="w-40"
              {...register(`${name}.${i}.text`)}
            />
            <Input
              aria-label={`${label} ${i + 1}: ${second}`}
              autoComplete="off"
              placeholder={secondPlaceholder}
              className="flex-1"
              {...register(`${name}.${i}.${second}` as `close.${number}.reason`)}
            />
            <Button
              variant="ghost"
              aria-label={`Remove ${label} ${i + 1}`}
              onClick={() => remove(i)}
            >
              ✕
            </Button>
          </span>
          {rowError(i) ? (
            <span role="alert" className="text-sm text-coral-ink">
              {rowError(i)}
            </span>
          ) : null}
        </div>
      ))}
      <Button
        variant="ghost"
        className="self-start"
        onClick={() => append({ text: '', [second]: '' } as never)}
      >
        + Add
      </Button>
    </div>
  );
}

const WHY = {
  listed: 'lists this word',
  'sounds-alike': 'sounds alike',
  'similar-spelling': 'similar spelling',
  'same-ending': 'same ending',
} as const;

/** Similar-sounding terms from this topic and the library: tick the ones students mix up. */
function Suggestions({
  topicId,
  termId,
  answer,
  control,
}: {
  topicId: string;
  termId?: string;
  answer: string;
  control: Control<FormValues>;
}) {
  const debounced = useDebounced(answer.trim(), 400);
  const query = useConfusableSuggestions(topicId, termId, debounced);
  const { fields, append, remove } = useFieldArray({ control, name: 'confusables' });
  const current = useWatch({ control, name: 'confusables' });
  const suggestions = query.data?.suggestions ?? [];
  if (!suggestions.length) return null;

  const indexOf = (text: string) =>
    current.findIndex((c) => c.text.trim().toLowerCase() === text.toLowerCase());

  return (
    <div className="flex flex-col gap-s8 rounded-chip bg-sunny-tint p-s12">
      <span className="text-xs font-bold tracking-wider text-sunny-ink uppercase">
        Students might mix it up with
      </span>
      <ul className="flex flex-col gap-s4">
        {suggestions.map((s) => {
          const i = indexOf(s.text);
          return (
            <li key={s.text}>
              <label className="flex min-h-11 cursor-pointer items-center gap-s10 text-night">
                <input
                  type="checkbox"
                  className="size-5 accent-violet"
                  checked={i >= 0}
                  onChange={(e) => {
                    if (e.target.checked) append({ text: s.text, feedback: s.feedback });
                    else if (i >= 0 && fields[i]) remove(i);
                  }}
                />
                <span className="font-bold">{s.display}</span>
                <span className="text-sm text-ink2">{WHY[s.why]}</span>
              </label>
            </li>
          );
        })}
      </ul>
      <span className="text-sm text-sunny-ink">
        Ticked words go into “Never accept”. Edit the feedback there.
      </span>
    </div>
  );
}

function Checklist({
  problems,
  warnings,
  library,
}: {
  problems: string[];
  warnings: string[];
  library: boolean;
}) {
  return (
    <Card className="flex flex-col gap-s10">
      <h2 className="font-display text-xl text-night">Ready to publish?</h2>
      {problems.length === 0 ? (
        <p className="text-night">
          <span aria-hidden="true">✓ </span>All set.
          {library ? ' Library terms can go without a picture.' : ''}
        </p>
      ) : (
        <ul className="flex flex-col gap-s6">
          {problems.map((p) => (
            <li key={p} className="flex gap-s8 text-night">
              <span aria-hidden="true" className="font-bold text-coral-ink">
                ✕
              </span>
              <span>
                <span className="sr-only">To fix: </span>
                {p}
              </span>
            </li>
          ))}
        </ul>
      )}
      {warnings.map((w) => (
        <p key={w} className="flex gap-s8 text-sm text-sunny-ink">
          <span aria-hidden="true">!</span>
          <span>
            <span className="sr-only">Worth a look: </span>
            {w}
          </span>
        </p>
      ))}
    </Card>
  );
}
