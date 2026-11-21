import { ogCard, OG_SIZE } from '@/components/app/og-card';
import { getPost, posts } from '@/features/blog/posts';

export const alt = 'Cardwise guide';
export const size = OG_SIZE;
export const contentType = 'image/png';

export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const post = getPost((await params).slug);
  return ogCard({ eyebrow: 'Cardwise guide', title: post?.title ?? 'Card reward guides' });
}
