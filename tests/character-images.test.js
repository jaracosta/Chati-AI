import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFandomUrl, findCharacterImages, anilistCharacter } from '../character-images.js';

const json = body => new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });

function fakeFetch(calls) {
  return async (url, options = {}) => {
    calls.push(String(url));
    const href = String(url);
    if (href.startsWith('https://graphql.anilist.co')) {
      return json({ data: { Page: { characters: [
        { name: { full: 'Daki', alternative: ['Ume'] }, image: { large: 'https://s4.anilist.co/daki.png' }, favourites: 9000,
          media: { nodes: [{ title: { romaji: 'Kimetsu no Yaiba: Yuukaku-hen', english: 'Demon Slayer: Entertainment District Arc' }, bannerImage: 'https://s4.anilist.co/banner.jpg', coverImage: { extraLarge: 'https://s4.anilist.co/cover.jpg' } }] } },
        { name: { full: 'Daki Other' }, image: { large: 'https://s4.anilist.co/other.png' }, favourites: 10, media: { nodes: [{ title: { romaji: 'Other Show' } }] } }
      ] } } });
    }
    if (href.includes('list=search')) return json({ query: { search: [{ title: 'Entertainment District' }] } });
    if (href.includes('titles=Daki')) return json({ query: { pages: [{ title: 'Daki', original: { source: 'https://static.wikia.nocookie.net/kny/images/daki.png/revision/latest', width: 800, height: 1200 } }] } });
    if (href.includes('titles=Entertainment')) return json({ query: { pages: [{ title: 'Entertainment District', original: { source: 'https://static.wikia.nocookie.net/kny/images/district.png', width: 1920, height: 1080 } }] } });
    return new Response('nope', { status: 404 });
  };
}

test('parses only fandom wiki links', () => {
  assert.deepEqual(parseFandomUrl('https://kimetsu-no-yaiba.fandom.com/wiki/Daki'), { host: 'kimetsu-no-yaiba.fandom.com', lang: '', title: 'Daki' });
  assert.equal(parseFandomUrl('https://kimetsu-no-yaiba.fandom.com/es/wiki/Daki').lang, 'es');
  assert.equal(parseFandomUrl('https://evil.example.com/wiki/Daki'), null);
  assert.equal(parseFandomUrl('http://x.fandom.com/wiki/Daki'), null);
  assert.equal(parseFandomUrl('https://fandom.com.evil.io/wiki/Daki'), null);
});

test('wiki picture for the profile and a canon place for the background', async () => {
  const calls = [];
  const images = await findCharacterImages({ name: 'Daki', series: 'Demon Slayer', wiki: 'https://kimetsu-no-yaiba.fandom.com/wiki/Daki', backgroundQuery: 'Entertainment District' }, { fetchImpl: fakeFetch(calls) });
  assert.equal(images.avatar, 'https://static.wikia.nocookie.net/kny/images/daki.png/revision/latest');
  assert.equal(images.background, 'https://static.wikia.nocookie.net/kny/images/district.png');
  assert.equal(images.avatarSource, 'https://kimetsu-no-yaiba.fandom.com');
  assert.ok(calls.every(url => /^https:\/\/(kimetsu-no-yaiba\.fandom\.com|graphql\.anilist\.co)(\/|$)/.test(url)), 'only fixed public hosts');
});

test('falls back to AniList image and series banner', async () => {
  const images = await findCharacterImages({ name: 'Daki', series: 'Demon Slayer' }, { fetchImpl: fakeFetch([]) });
  assert.equal(images.avatar, 'https://s4.anilist.co/daki.png');
  assert.equal(images.background, 'https://s4.anilist.co/banner.jpg');
  assert.equal(await anilistCharacter('Nobody At All', 'Nothing', async () => json({ data: { Page: { characters: [] } } })), null);
});

test('network failures leave the pictures empty instead of breaking', async () => {
  const images = await findCharacterImages({ name: 'Daki', wiki: 'https://x.fandom.com/wiki/Daki' }, { fetchImpl: async () => { throw new Error('offline'); } });
  assert.deepEqual(images, { avatar: '', background: '', avatarSource: '', backgroundSource: '' });
});
