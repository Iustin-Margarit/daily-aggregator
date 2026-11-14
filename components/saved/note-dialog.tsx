'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/lib/i18n/client';

type NoteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  articleTitle: string;
  initialNote: string;
  onSave: (note: string) => Promise<boolean>;
};

export function NoteDialog({ open, onOpenChange, articleTitle, initialNote, onSave }: NoteDialogProps) {
  const [note, setNote] = useState(initialNote);
  const [busy, setBusy] = useState(false);
  const { t } = useI18n();
  const w = t.saved.note;

  useEffect(() => {
    if (open) setNote(initialNote);
  }, [open, initialNote]);

  const save = async () => {
    setBusy(true);
    const ok = await onSave(note.trim());
    setBusy(false);
    if (ok) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{w.title}</DialogTitle>
          <DialogDescription className="line-clamp-2">{articleTitle}</DialogDescription>
        </DialogHeader>
        <Textarea
          autoFocus
          rows={5}
          maxLength={2000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={w.placeholder}
        />
        <DialogFooter>
          {initialNote && (
            <Button variant="ghost" className="sm:mr-auto" onClick={() => setNote('')} disabled={busy}>
              {w.delete}
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            {t.common.cancel}
          </Button>
          <Button onClick={save} disabled={busy}>
            {busy && <Spinner />}
            {w.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
