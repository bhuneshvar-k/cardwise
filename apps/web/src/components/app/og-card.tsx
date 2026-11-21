import { ImageResponse } from 'next/og';
import { SITE_NAME, SITE_URL } from '@/lib/seo';

export const OG_SIZE = { width: 1200, height: 630 };

/** The 1200×630 social card shared by the home page and blog posts. */
export function ogCard({ title, eyebrow }: { title: string; eyebrow: string }): ImageResponse {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 72,
        background: 'linear-gradient(135deg, #0f766e 0%, #134e4a 100%)',
        color: 'white',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', fontSize: 30, opacity: 0.85 }}>{eyebrow}</div>
      <div style={{ display: 'flex', fontSize: title.length > 48 ? 64 : 78, fontWeight: 700 }}>
        {title}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', fontSize: 34, fontWeight: 600 }}>
        {`${SITE_NAME} · ${new URL(SITE_URL).host}`}
      </div>
    </div>,
    OG_SIZE,
  );
}
