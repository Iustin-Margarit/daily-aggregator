import type { Metadata } from 'next';
import { Database, KeyRound, Play, Terminal } from 'lucide-react';
import { Logo } from '@/components/site/logo';
import { isSupabaseConfigured } from '@/lib/env';

export const metadata: Metadata = { title: 'Setup required' };

function Code({ children }: { children: React.ReactNode }) {
  return <pre className="mt-2 overflow-x-auto rounded-xl bg-foreground p-3.5 font-mono text-[13px] leading-relaxed text-background">{children}</pre>;
}

const STEPS = [
  {
    icon: Database,
    title: 'Start a database',
    body: (
      <>
        <p>Create a free project at supabase.com and push the schema to it:</p>
        <Code>{'supabase login\nsupabase db push --remote=<your-project-ref>'}</Code>
      </>
    ),
  },
  {
    icon: KeyRound,
    title: 'Create .env.local',
    body: (
      <>
        <p>Copy the example file and paste the project’s URL and keys (Project Settings → API Keys):</p>
        <Code>cp .env.example .env.local</Code>
      </>
    ),
  },
  {
    icon: Play,
    title: 'Restart the dev server',
    body: <Code>npm run dev</Code>,
  },
  {
    icon: Terminal,
    title: 'Fetch news and become an admin',
    body: <Code>{'npm run ingest\nnpm run make-admin -- you@example.com'}</Code>,
  },
];

export default function SetupPage() {
  const configured = isSupabaseConfigured();
  return (
    <div className="container max-w-2xl py-12">
      <Logo />
      <h1 className="headline mt-10 border-t border-dashed border-border pt-5 text-4xl">
        {configured ? 'Supabase is configured' : 'Almost there - connect a database'}
      </h1>
      <p className="mt-2 italic text-muted-foreground">
        {configured
          ? 'Everything looks good. Head to the home page to get started.'
          : 'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are not set, so the app cannot start yet. The README has the full guide.'}
      </p>
      {!configured && (
        <ol className="mt-8 space-y-6">
          {STEPS.map(({ icon: Icon, title, body }, index) => (
            <li key={title} className="flex gap-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[2px] bg-primary font-display shadow-[inset_0_0_0_2px_hsl(var(--primary)),inset_0_0_0_3px_hsl(var(--primary-foreground)/0.4)] text-lg font-semibold text-primary-foreground">
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1 text-sm text-muted-foreground">
                <p className="label text-foreground">
                  {index + 1}. {title}
                </p>
                <div className="mt-1">{body}</div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
