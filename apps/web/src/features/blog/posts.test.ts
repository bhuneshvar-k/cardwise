import { curatedCards } from '@cardwise/data';
import { describe, expect, test } from 'vitest';
import { getPost, listPosts, posts } from './posts';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

describe('blog posts', () => {
  test('every post has a unique, URL-safe slug', () => {
    const slugs = posts.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(SLUG);
  });

  test('titles and descriptions fit search result snippets', () => {
    for (const post of posts) {
      expect(post.title.length, post.slug).toBeLessThanOrEqual(70);
      expect(post.description.length, post.slug).toBeGreaterThanOrEqual(70);
      expect(post.description.length, post.slug).toBeLessThanOrEqual(160);
    }
  });

  test('dates are ISO days and never updated before published', () => {
    for (const post of posts) {
      expect(post.published).toMatch(ISO_DATE);
      expect(post.updated).toMatch(ISO_DATE);
      expect(post.updated >= post.published, post.slug).toBe(true);
    }
  });

  test('every post has body sections with text', () => {
    for (const post of posts) {
      expect(post.sections.length, post.slug).toBeGreaterThan(1);
      for (const section of post.sections) {
        expect(section.heading.trim()).not.toBe('');
        expect(section.paragraphs.length + (section.bullets?.length ?? 0)).toBeGreaterThan(0);
      }
    }
  });

  test('cards a post talks about exist in the curated catalogue', () => {
    const ids = new Set(curatedCards.map((c) => c.id));
    for (const post of posts) {
      for (const id of post.cardIds) expect(ids.has(id), `${post.slug}: ${id}`).toBe(true);
    }
  });

  test('sources are https links', () => {
    for (const post of posts) {
      for (const source of post.sources) expect(source.url).toMatch(/^https:\/\//);
    }
  });
});

describe('listPosts', () => {
  test('returns newest first', () => {
    const dates = listPosts().map((p) => p.published);
    expect(dates).toEqual([...dates].sort().reverse());
  });
});

describe('getPost', () => {
  test('finds a post by slug', () => {
    const [first] = posts;
    expect(first).toBeDefined();
    expect(getPost(first!.slug)).toBe(first);
  });

  test('returns undefined for an unknown slug', () => {
    expect(getPost('no-such-post')).toBeUndefined();
  });
});
