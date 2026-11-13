'use client';

import { useMemo, useState } from 'react';
import { Search, ShieldCheck, Trash2 } from 'lucide-react';
import { TimeAgo } from '@/components/site/time-ago';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { useToast } from '@/components/ui/toast';
import { formatDate, pluralize } from '@/lib/format';
import { createClient } from '@/lib/supabase/client';

export type AdminUser = {
  id: string;
  email: string;
  username: string;
  role: string;
  created_at: string;
  last_sign_in_at: string | null;
  has_completed_onboarding: boolean;
  saved_count: number;
  like_count: number;
  comment_count: number;
};

export function UsersTable({ initialUsers, currentUserId }: { initialUsers: AdminUser[]; currentUserId: string }) {
  const [users, setUsers] = useState(initialUsers);
  const [query, setQuery] = useState('');
  const [toDelete, setToDelete] = useState<AdminUser | null>(null);
  const { showToast } = useToast();

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? users.filter((u) => u.email.toLowerCase().includes(q) || u.username.toLowerCase().includes(q)) : users;
  }, [users, query]);

  const patch = (id: string, values: Partial<AdminUser>) =>
    setUsers((list) => list.map((u) => (u.id === id ? { ...u, ...values } : u)));

  const changeRole = async (user: AdminUser, role: string) => {
    const previous = user.role;
    patch(user.id, { role });
    const { error } = await createClient().from('profiles').update({ role }).eq('id', user.id);
    if (error) {
      patch(user.id, { role: previous });
      showToast({ type: 'error', title: 'Could not change the role', message: error.message });
    } else {
      showToast({ type: 'success', title: `${user.username} is now ${role === 'admin' ? 'an admin' : 'a regular user'}` });
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    const { error } = await createClient().rpc('admin_delete_user', { p_user_id: toDelete.id });
    if (error) {
      showToast({ type: 'error', title: 'Could not delete the user', message: error.message });
      return;
    }
    setUsers((list) => list.filter((u) => u.id !== toDelete.id));
    showToast({ type: 'success', title: `Deleted ${toDelete.email}` });
  };

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by email or username" className="pl-9" aria-label="Search users" />
      </div>

      <div className="overflow-x-auto border border-rule bg-card">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="label border-b-2 border-rule text-left text-muted-foreground">
              <th className="px-4 py-2.5 font-normal">Reader</th>
              <th className="px-4 py-2.5 font-normal">Role</th>
              <th className="px-4 py-2.5 font-normal">Joined</th>
              <th className="px-4 py-2.5 font-normal">Last seen</th>
              <th className="px-4 py-2.5 font-normal">Activity</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {visible.map((user) => {
              const isSelf = user.id === currentUserId;
              return (
                <tr key={user.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <p className="flex items-center gap-1.5 font-medium">
                      {user.username}
                      {user.role === 'admin' && <ShieldCheck className="h-4 w-4 text-(--ink-accent)" aria-label="Admin" />}
                      {isSelf && <span className="rounded bg-muted px-1.5 text-[11px] font-normal text-muted-foreground">you</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="w-28">
                      <NativeSelect
                        value={user.role}
                        onChange={(e) => changeRole(user, e.target.value)}
                        disabled={isSelf}
                        title={isSelf ? 'You cannot change your own role' : undefined}
                        aria-label={`Role of ${user.username}`}
                        className="h-8"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </NativeSelect>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(user.created_at)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{user.last_sign_in_at ? <TimeAgo date={user.last_sign_in_at} /> : 'Never'}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {pluralize(user.saved_count, 'saved story', 'saved stories')} · {pluralize(user.like_count, 'like')} ·{' '}
                    {pluralize(user.comment_count, 'letter')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      disabled={isSelf}
                      onClick={() => setToDelete(user)}
                      aria-label={`Delete ${user.email}`}
                      title={isSelf ? 'Delete your own account from your profile page' : 'Delete user'}
                    >
                      <Trash2 />
                    </Button>
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No users match “{query}”.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        destructive
        title={`Delete ${toDelete?.email ?? 'this user'}?`}
        description="Their account, saved stories, likes and letters are permanently removed."
        confirmLabel="Delete user"
        onConfirm={remove}
      />
    </div>
  );
}
