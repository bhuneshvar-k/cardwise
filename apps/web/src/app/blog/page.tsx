import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLd } from '@/components/app/json-ld';
import { PageHeader } from '@/components/app/page-header';
import { listPosts } from '@/features/blog/posts';
import { absoluteUrl, SITE_NAME } from '@/lib/seo';

const DESCRIPTION =
  'Guides to credit and debit card rewards in India: the best card for Swiggy, Amazon and fuel, reward caps, exclusions and UPI.';

export const metadata: Metadata = {
  title: 'Card reward guides',
  description: DESCRIPTION,
  alternates: { canonical: '/blog' },
  openGraph: {
    type: 'website',
    url: '/blog',
    title: 'Card reward guides',
    description: DESCRIPTION,
  },
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

export default function BlogIndex() {
  const posts = listPosts();
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Blog',
          name: `${SITE_NAME} guides`,
          url: absoluteUrl('/blog'),
          description: DESCRIPTION,
          blogPost: posts.map((p) => ({
            '@type': 'BlogPosting',
            headline: p.title,
            url: absoluteUrl(`/blog/${p.slug}`),
            datePublished: p.published,
            dateModified: p.updated,
          })),
        }}
      />
      <PageHeader title="Guides" description={DESCRIPTION} />
      <ul className="space-y-4">
        {posts.map((post) => (
          <li key={post.slug}>
            <article className="space-y-1 rounded-xl border p-4">
              <h2 className="font-medium">
                <Link href={`/blog/${post.slug}`} className="hover:underline">
                  {post.title}
                </Link>
              </h2>
              <p className="text-muted-foreground text-sm">{post.description}</p>
              <p className="text-muted-foreground text-xs">
                <time dateTime={post.updated}>Updated {formatDate(post.updated)}</time>
              </p>
            </article>
          </li>
        ))}
      </ul>
    </>
  );
}
