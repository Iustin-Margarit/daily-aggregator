'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

type FolderDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The folder's current name when renaming; empty when creating a new folder. */
  initialName?: string;
  /** Saves the name and returns an error message, or null when it worked. */
  onSubmit: (name: string) => Promise<string | null>;
};

export function FolderDialog({ open, onOpenChange, initialName = '', onSubmit }: FolderDialogProps) {
  const [name, setName] = useState(initialName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const renaming = initialName !== '';

  useEffect(() => {
    if (open) {
      setName(initialName);
      setError(null);
    }
  }, [open, initialName]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please give the folder a name.');
      return;
    }
    setBusy(true);
    const problem = await onSubmit(trimmed);
    setBusy(false);
    if (problem) setError(problem);
    else onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="max-w-sm">
        <form onSubmit={submit} className="grid min-w-0 grid-cols-1 gap-4">
          <DialogHeader>
            <DialogTitle>{renaming ? 'Rename folder' : 'New folder'}</DialogTitle>
            {!renaming && <DialogDescription>Folders help you keep saved stories in groups, like “Recipes” or “For later”.</DialogDescription>}
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="folder-name">Folder name</Label>
            <Input
              id="folder-name"
              autoFocus
              maxLength={25}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Weekend reading"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Spinner />}
              {renaming ? 'Save name' : 'Create folder'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
