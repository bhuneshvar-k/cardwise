import type { MetadataRoute } from 'next';
import { posts } from '@/features/blog/posts';
import { sitemapEntries } from '@/lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  return sitemapEntries(posts);
}
