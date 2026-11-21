'use client';

import { Download, Trash2, Upload } from 'lucide-react';
import { useRef } from 'react';
import { toast } from '@/components/ding-toaster';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Switch } from '@/components/ui/switch';
import { useSettings } from '@/hooks/use-local-data';
import { exportData, importData, saveSettings, wipeAllData } from '@/lib/repo';
import { localToday } from '@/lib/today';

const MAX_BACKUP_BYTES = 5 * 1024 * 1024;

async function downloadBackup() {
  const blob = new Blob([JSON.stringify(await exportData(), null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `cardwise-backup-${localToday()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

async function restoreBackup(file: File | undefined) {
  if (!file) return;
  if (file.size > MAX_BACKUP_BYTES) {
    toast.error('That file is too large to be a Cardwise backup.');
    return;
  }
  if (!window.confirm('Replace all cards and spends on this device with this backup?')) return;
  try {
    await importData(JSON.parse(await file.text()));
    toast.success('Backup restored');
  } catch {
    toast.error('That file is not a valid Cardwise backup.');
  }
}

async function wipeEverything() {
  if (!window.confirm('Delete all cards and spends on this device? This cannot be undone.')) return;
  await wipeAllData();
  toast.success('All data deleted from this device');
}

export function DataControls() {
  const settings = useSettings();
  const fileInput = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-5">
      <Field orientation="horizontal">
        <Switch
          id="showOtherCards"
          checked={settings?.showOtherCards ?? false}
          onCheckedChange={(checked) => saveSettings({ showOtherCards: checked })}
        />
        <div>
          <FieldLabel htmlFor="showOtherCards">Show cards I don&apos;t have</FieldLabel>
          <FieldDescription>
            Point out when another card would earn more. No referral links.
          </FieldDescription>
        </div>
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={() => downloadBackup().catch(() => toast.error('Export failed.'))}
        >
          <Download data-icon="inline-start" />
          Export backup
        </Button>
        <Button variant="outline" onClick={() => fileInput.current?.click()}>
          <Upload data-icon="inline-start" />
          Restore backup
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = ''; // let the same file be picked again
            void restoreBackup(file);
          }}
        />
        <Button variant="destructive" onClick={wipeEverything}>
          <Trash2 data-icon="inline-start" />
          Delete all data
        </Button>
      </div>
    </div>
  );
}
