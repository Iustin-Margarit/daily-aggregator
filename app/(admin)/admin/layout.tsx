import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AdminNav } from '@/components/admin/admin-nav';
import { Logo } from '@/components/site/logo';
import { createClient, getCurrentUser } from '@/lib/supabase/server';

export const metadata: Metadata = { title: { default: 'Newsroom', template: '%s · Newsroom' } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/admin/dashboard');

  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc('is_admin');
  if (!isAdmin) redirect('/feed');

  return (
    <div className="paper flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b-2 border-rule bg-background">
        <div className="container flex h-14 items-center gap-3">
          <Logo href="/feed" />
          <span className="label hidden border-l border-rule pl-3 text-muted-foreground sm:inline">The Newsroom</span>
          <div className="ml-auto">
            <AdminNav variant="back" />
          </div>
        </div>
      </header>
      <div className="container grid flex-1 content-start gap-6 py-6 lg:grid-cols-[190px_minmax(0,1fr)] lg:py-8">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <p className="label mb-2 hidden text-muted-foreground lg:block">Editor’s desk</p>
          <AdminNav variant="sidebar" />
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
