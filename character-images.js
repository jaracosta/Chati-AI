// Finds a profile picture and a chat background for a character Chati
// builds, so "make me Daki" comes with pictures and not just text.
//
// Sources (public, no API key):
// - Fandom wikis (MediaWiki API): the main image of the character's page
//   for the profile picture, and the main image of a canon location page
//   (e.g. "Entertainment District") for the background.
// - AniList (GraphQL): the character's official image, and the banner of
//   their series as a background, when there is no wiki or it has no image.
//
// Only fixed public hosts are called, so user input cannot point the server
// at its own network.

const ANILIST_URL = "https://graphql.anilist.co";
const USER_AGENT = "ChatiBot/1.0 (+https://chati-ai.com)";

const ANILIST_QUERY = `
query ($search: String) {
  Page(perPage: 6) {
    characters(search: $search, sort: [SEARCH_MATCH, FAVOURITES_DESC]) {
      name { full native alternative }
      image { large }
      favourites
      media(perPage: 4, sort: POPULARITY_DESC) {
        nodes { title { romaji english native } bannerImage coverImage { extraLarge } }
      }
    }
  }
}`.trim();

function plain(text) {
  return String(text || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function httpsUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

async function getJson(fetchImpl, url, options = {}, timeoutMs = 6000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      ...options,
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT, Accept: "application/json", ...(options.headers || {}) }
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// "https://kimetsu-no-yaiba.fandom.com/wiki/Daki" → { host, title }.
export function parseFandomUrl(value) {
  try {
    const url = new URL(String(value || ""));
    if (url.protocol !== "https:" || !/^[a-z0-9-]+(\.[a-z0-9-]+)*\.fandom\.com$/i.test(url.hostname)) return null;
    const match = url.pathname.match(/^\/(?:[a-z-]{2,5}\/)?wiki\/([^?#]+)/i);
    if (!match) return null;
    const lang = url.pathname.match(/^\/([a-z-]{2,5})\/wiki\//i)?.[1] || "";
    return { host: url.hostname, lang, title: decodeURIComponent(match[1]).replace(/_/g, " ") };
  } catch {
    return null;
  }
}

function fandomApi(wiki, params) {
  const base = `https://${wiki.host}${wiki.lang ? "/" + wiki.lang : ""}/api.php`;
  return base + "?" + new URLSearchParams({ format: "json", formatversion: "2", ...params }).toString();
}

// Main image of a wiki page (the infobox picture), with its size.
export async function fandomPageImage(wiki, title, fetchImpl = fetch) {
  const data = await getJson(fetchImpl, fandomApi(wiki, {
    action: "query", prop: "pageimages", piprop: "original", redirects: "1", titles: title
  }));
  const page = (data?.query?.pages || [])[0];
  const original = page?.original;
  const source = httpsUrl(original?.source);
  return source ? { url: source, width: Number(original.width) || 0, height: Number(original.height) || 0, page: page.title } : null;
}

// A landscape picture of a place from the same wiki, for the background.
export async function fandomPlaceImage(wiki, query, fetchImpl = fetch) {
  if (!query) return null;
  const data = await getJson(fetchImpl, fandomApi(wiki, {
    action: "query", list: "search", srsearch: query, srlimit: "3", srnamespace: "0"
  }));
  for (const hit of data?.query?.search || []) {
    const image = await fandomPageImage(wiki, hit.title, fetchImpl);
    if (image && (!image.width || image.width >= image.height)) return image;
  }
  return null;
}

// The AniList character that best matches the name (and series, if given).
export async function anilistCharacter(name, series = "", fetchImpl = fetch) {
  const data = await getJson(fetchImpl, ANILIST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: ANILIST_QUERY, variables: { search: name } })
  });
  const list = data?.data?.Page?.characters || [];
  if (!list.length) return null;
  const wanted = plain(name);
  const seriesWords = plain(series).split(" ").filter(word => word.length > 2);
  const score = character => {
    const names = [character.name?.full, character.name?.native, ...(character.name?.alternative || [])].map(plain);
    let points = names.includes(wanted) ? 6 : names.some(item => item && (item.includes(wanted) || wanted.includes(item))) ? 3 : 0;
    if (seriesWords.length) {
      const titles = (character.media?.nodes || []).flatMap(node => [node.title?.romaji, node.title?.english, node.title?.native]).map(plain).join(" ");
      const hits = seriesWords.filter(word => titles.includes(word)).length;
      points += hits ? 4 + hits : -2;
    }
    return points + Math.min(2, (character.favourites || 0) / 20000);
  };
  const best = [...list].sort((a, b) => score(b) - score(a))[0];
  if (score(best) < 3) return null;
  const media = (best.media?.nodes || []).find(node => node.bannerImage) || (best.media?.nodes || [])[0];
  return {
    image: httpsUrl(best.image?.large),
    banner: httpsUrl(media?.bannerImage),
    cover: httpsUrl(media?.coverImage?.extraLarge)
  };
}

// Profile picture + background for a draft. Never throws; missing pieces
// are just left empty.
export async function findCharacterImages(draft, { fetchImpl = fetch } = {}) {
  const result = { avatar: "", background: "", avatarSource: "", backgroundSource: "" };
  if (!draft?.name) return result;
  const wiki = [draft.wiki, ...(draft.sources || [])].map(parseFandomUrl).find(Boolean);

  const [pageImage, placeImage, anilist] = await Promise.all([
    wiki ? fandomPageImage(wiki, wiki.title, fetchImpl) : null,
    wiki && draft.backgroundQuery ? fandomPlaceImage(wiki, draft.backgroundQuery, fetchImpl) : null,
    anilistCharacter(draft.name, draft.series, fetchImpl)
  ]);

  if (pageImage?.url) {
    result.avatar = pageImage.url;
    result.avatarSource = `https://${wiki.host}`;
  } else if (anilist?.image) {
    result.avatar = anilist.image;
    result.avatarSource = "https://anilist.co";
  }

  if (placeImage?.url) {
    result.background = placeImage.url;
    result.backgroundSource = `https://${wiki.host}`;
  } else if (anilist?.banner || anilist?.cover) {
    result.background = anilist.banner || anilist.cover;
    result.backgroundSource = "https://anilist.co";
  }
  return result;
}
