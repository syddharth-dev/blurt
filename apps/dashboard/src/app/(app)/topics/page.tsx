import { EmptyState } from '@/components/Pip';
import { Card } from '@/components/ui';

export default function Page() {
  return (
    <div className="flex max-w-4xl flex-col gap-s20">
      <h1 className="font-display text-4xl text-night">Topics and terms</h1>
      <Card>
        <EmptyState
          title="On its way"
          body="Create topics, upload pictures, draw the part to name, and test terms with your voice. Coming next."
        />
      </Card>
    </div>
  );
}
