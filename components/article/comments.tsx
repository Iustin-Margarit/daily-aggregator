'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import { TimeAgo } from '@/components/site/time-ago';
import { Button } from '@/components/ui/button';
import { ColoredAvatar } from '@/components/ui/colored-avatar';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { createClient } from '@/lib/supabase/client';
import type { CommentItem } from '@/lib/types';

const MAX_LENGTH = 2000;

type CommentsProps = {
  articleId: string;
  articlePath: string;
  initialComments: CommentItem[];
  viewer: { id: string; username: string; avatarColor: string } | null;
};

export function Comments({ articleId, articlePath, initialComments, viewer }: CommentsProps) {
  const { showToast } = useToast();
  const [comments, setComments] = useState(initialComments);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const [toDelete, setToDelete] = useState<CommentItem | null>(null);
  const refreshTimer = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    const { data, error } = await createClient().rpc('get_article_comments', { p_article_id: articleId });
    if (!error && data) setComments(data as CommentItem[]);
  }, [articleId]);

  // Live updates: refetch (debounced) whenever someone comments or deletes.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`comments:${articleId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `article_id=eq.${articleId}` }, () => {
        if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
        refreshTimer.current = window.setTimeout(refresh, 300);
      })
      .subscribe();
    return () => {
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
      void supabase.removeChannel(channel);
    };
  }, [articleId, refresh]);

  const post = async () => {
    const content = draft.trim();
    if (!viewer || !content || posting) return;
    setPosting(true);
    const { error } = await createClient().from('comments').insert({ article_id: articleId, user_id: viewer.id, content });
    setPosting(false);
    if (error) {
      showToast(
        error.message.includes('COMMENT_RATE_LIMIT')
          ? { type: 'info', title: 'Slow down a little', message: 'You are writing letters very quickly. Please wait a moment and try again.' }
          : { type: 'error', title: 'Could not send your letter', message: 'Please try again in a moment.' },
      );
      return;
    }
    setDraft('');
    await refresh();
  };

  const remove = async () => {
    if (!toDelete) return;
    const { error } = await createClient().from('comments').delete().eq('id', toDelete.id);
    if (error) {
      showToast({ type: 'error', title: 'Could not delete the letter', message: 'Please try again in a moment.' });
      return;
    }
    setComments((list) => list.filter((c) => c.id !== toDelete.id));
    showToast({ type: 'success', title: 'Comment deleted' });
  };

  return (
    <section id="comments" className="scroll-mt-20" aria-labelledby="comments-heading">
      <div className="rule-double" />
      <h2 id="comments-heading" className="flex items-baseline justify-between gap-3 pt-3">
        <span className="headline text-3xl">Letters to the Editor</span>
        <span className="label text-muted-foreground">{comments.length === 1 ? '1 letter' : `${comments.length} letters`}</span>
      </h2>
      <p className="mt-1 text-sm italic text-muted-foreground">Readers respond. Keep it civil; letters are published immediately.</p>

      {viewer ? (
        <form
          className="mt-5 flex gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void post();
          }}
        >
          <ColoredAvatar username={viewer.username} color={viewer.avatarColor} className="mt-1" />
          <div className="flex-1 space-y-2">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value.slice(0, MAX_LENGTH))}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') void post();
              }}
              placeholder="Dear Editor, …"
              rows={3}
              aria-label="Write a comment"
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">
                {draft.length > MAX_LENGTH - 200 ? `${MAX_LENGTH - draft.length} characters left` : 'Ctrl + Enter to send'}
              </span>
              <Button type="submit" disabled={posting || draft.trim().length === 0}>
                {posting && <Spinner />}
                Send letter
              </Button>
            </div>
          </div>
        </form>
      ) : (
        <div className="paper-box mt-5 p-5 text-center text-sm italic text-muted-foreground">
          <Link href={`/login?next=${encodeURIComponent(articlePath)}`} className="font-medium text-foreground underline underline-offset-4">
            Log in
          </Link>{' '}
          to write a letter to the editor.
        </div>
      )}

      <ul className="mt-6 divide-y divide-border border-t border-border">
        {comments.length === 0 && (
          <li className="py-5 text-sm italic text-muted-foreground">No letters yet. Be the first to write in.</li>
        )}
        {comments.map((comment) => (
          <li key={comment.id} className="group flex gap-3 py-5">
            <ColoredAvatar username={comment.username} color={comment.avatar_color} size="sm" className="mt-0.5" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2">
                <span className="font-display font-bold">{comment.username}</span>
                {comment.is_own && <span className="label border border-border px-1.5 text-[0.6rem] text-muted-foreground">you</span>}
                <TimeAgo date={comment.created_at} className="byline" />
                {comment.can_delete && (
                  <button
                    type="button"
                    onClick={() => setToDelete(comment)}
                    className="ml-auto p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
                    aria-label="Delete comment"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <p className="mt-1.5 whitespace-pre-wrap wrap-break-word text-[1rem] leading-relaxed">{comment.content}</p>
            </div>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Withdraw this letter?"
        description="This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={remove}
      />
    </section>
  );
}
