'use client';

import { Toaster as DingToaster, toast } from '@yusufceng1z/ding-react';
import { useTheme } from 'next-themes';
import type { ComponentProps } from 'react';

type DingToasterProps = ComponentProps<typeof DingToaster>;
type DingTheme = NonNullable<DingToasterProps['theme']>;

function toDingTheme(theme: string | undefined): DingTheme {
  return theme === 'light' || theme === 'dark' ? theme : 'system';
}

/** Ding toaster that follows the app's next-themes setting (class-based dark mode). */
function Toaster(props: Omit<DingToasterProps, 'theme'>) {
  const { resolvedTheme } = useTheme();
  return <DingToaster theme={toDingTheme(resolvedTheme)} {...props} />;
}

export { DingToaster, Toaster, toast };
