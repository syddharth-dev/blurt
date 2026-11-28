import { EmptyState } from '@/components/Pip';
import { Card } from '@/components/ui';

export default function Page() {
  return (
    <div className="flex max-w-4xl flex-col gap-s20">
      <h1 className="font-display text-4xl text-night">Classes</h1>
      <Card>
        <EmptyState
          title="On its way"
          body="Create a class, share its join code with students, and assign topics. Coming soon."
        />
      </Card>
    </div>
  );
}
