import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { JsonLd } from '@/components/app/json-ld';
import { Button } from '@/components/ui/button';
import { getPost, POST_CAVEAT, posts, type Post } from '@/features/blog/posts';
import { absoluteUrl, SITE_NAME } from '@/lib/seo';

export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<'/blog/[slug]'>): Promise<Metadata> {
  const post = getPost((await params).slug);
  if (!post) return {};
  const path = `/blog/${post.slug}`;
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: path },
    openGraph: {
      type: 'article',
      url: path,
      title: post.title,
      description: post.description,
      publishedTime: post.published,
      modifiedTime: post.updated,
    },
  };
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

function structuredData(post: Post) {
  const url = absoluteUrl(`/blog/${post.slug}`);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        headline: post.title,
        description: post.description,
        url,
        mainEntityOfPage: url,
        datePublished: post.published,
        dateModified: post.updated,
        inLanguage: 'en-IN',
        image: `${url}/opengraph-image`,
        author: { '@type': 'Organization', name: SITE_NAME, url: absoluteUrl('/') },
        publisher: { '@type': 'Organization', name: SITE_NAME, url: absoluteUrl('/') },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: SITE_NAME, item: absoluteUrl('/') },
          { '@type': 'ListItem', position: 2, name: 'Guides', item: absoluteUrl('/blog') },
          { '@type': 'ListItem', position: 3, name: post.title, item: url },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: post.faq.map((f) => ({
          '@type': 'Question',
          name: f.question,
          acceptedAnswer: { '@type': 'Answer', text: f.answer },
        })),
      },
    ],
  };
}

export default async function BlogPost({ params }: PageProps<'/blog/[slug]'>) {
  const post = getPost((await params).slug);
  if (!post) notFound();

  return (
    <article className="space-y-6">
      <JsonLd data={structuredData(post)} />
      <nav aria-label="Breadcrumb" className="text-muted-foreground text-xs">
        <Link href="/blog" className="hover:underline">
          Guides
        </Link>
      </nav>
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{post.title}</h1>
        <p className="text-muted-foreground text-sm">{post.description}</p>
        <p className="text-muted-foreground text-xs">
          <time dateTime={post.updated}>Updated {formatDate(post.updated)}</time>
        </p>
      </header>

      {post.sections.map((section) => (
        <section key={section.heading} className="space-y-2">
          <h2 className="font-medium">{section.heading}</h2>
          {section.paragraphs.map((text) => (
            <p key={text} className="text-muted-foreground text-sm leading-relaxed">
              {text}
            </p>
          ))}
          {section.bullets && (
            <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-sm">
              {section.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          )}
        </section>
      ))}

      <section className="bg-muted/50 space-y-3 rounded-xl p-4">
        <p className="text-sm">See how your own cards compare for this kind of spend.</p>
        <Button asChild>
          <Link href={post.tryHref}>Try it in Cardwise</Link>
        </Button>
      </section>

      {post.faq.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-medium">Questions</h2>
          {post.faq.map((f) => (
            <div key={f.question} className="space-y-1">
              <h3 className="text-sm font-medium">{f.question}</h3>
              <p className="text-muted-foreground text-sm">{f.answer}</p>
            </div>
          ))}
        </section>
      )}

      <footer className="text-muted-foreground space-y-2 border-t pt-4 text-xs">
        <p>{POST_CAVEAT}</p>
        <p>Sources:</p>
        <ul className="list-disc space-y-1 pl-5">
          {post.sources.map((s) => (
            <li key={s.url}>
              <a className="underline" href={s.url} target="_blank" rel="noreferrer">
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </footer>
    </article>
  );
}
