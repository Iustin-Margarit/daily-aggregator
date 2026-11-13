import type { Metadata } from 'next';
import { UsersTable, type AdminUser } from '@/components/admin/users-table';
import { pluralize } from '@/lib/format';
import { createClient, getCurrentUser } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Readers' };

export default async function UsersPage() {
  const supabase = await createClient();
  const [user, { data, error }] = await Promise.all([getCurrentUser(), supabase.rpc('admin_list_users')]);

  return (
    <div className="space-y-6">
      <div className="border-b-2 border-rule pb-4">
        <p className="kicker">The newsroom</p>
        <h1 className="headline mt-1 text-4xl">Readers</h1>
        <p className="mt-1 italic text-muted-foreground">
          {data ? `${pluralize(data.length, 'account')}.` : ''} Change roles or remove accounts.
        </p>
      </div>
      {error ? (
        <p className="text-sm text-destructive">Could not load users: {error.message}</p>
      ) : (
        <UsersTable initialUsers={(data ?? []) as AdminUser[]} currentUserId={user?.id ?? ''} />
      )}
    </div>
  );
}
