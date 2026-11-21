import { siGithub } from 'simple-icons';
import { Button } from '@/components/ui/button';
import { REPO_URL } from '@/lib/seo';
import { cn } from '@/lib/utils';

function GitHubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn('size-4 fill-current', className)}>
      <path d={siGithub.path} />
    </svg>
  );
}

/** Link to the source code. `compact` shows only the mark, for tight headers. */
export function GitHubButton({ compact = false }: { compact?: boolean }) {
  return (
    <Button asChild variant="outline" size={compact ? 'icon' : 'sm'}>
      <a
        href={REPO_URL}
        target="_blank"
        rel="noreferrer"
        aria-label={compact ? 'Cardwise source code on GitHub' : undefined}
      >
        <GitHubMark />
        {!compact && 'Star on GitHub'}
      </a>
    </Button>
  );
}
