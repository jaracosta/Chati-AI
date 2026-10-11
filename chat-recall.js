// Long chats: the model only gets the latest messages, so it forgot how the
// story began and what the user said long ago. Two helpers pick a little of
// the older history to send along with each message:
// - opening(): how the chat began (the first few messages).
// - recall(): older lines that share words with what the user just wrote,
//   so "¿te acuerdas de lo que te dije al principio?" can be answered.
// Plain script for the browser (window.ChatiRecall); tests import it too.
(function (root) {
  "use strict";

  const STOP_WORDS = new Set((
    "a al algo algun alguna algunos ante antes aqui asi aun bien cada como con contra cual cuando de del desde donde dos el ella ellas ellos en entre era eres es esa ese eso esta este esto estoy estas estan fue fui ha han has hay hasta la las le les lo los mas me mi mis mucho muy nada ni no nos o otra otro para pero poco por porque que quien se sea ser si sin sobre solo son soy su sus tambien te tengo ti tiene todo tu tus un una uno unos y ya yo " +
    "about after again all also am an and any are as at be been but by can could did do does dont for from get got had has have he her here him his how i if in into is it its just like me more my no not now of on one or our out she so some than that the their them then there they this to too up us was we were what when where which who why will with would you your yours " +
    "acuerdas acuerdo recuerdas recuerdo dije dijiste dijo remember told said tell"
  ).split(" "));

  function plain(text) {
    return String(text || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "");
  }

  function keywords(text) {
    const words = plain(text).match(/[a-z0-9ñ]{3,}/g) || [];
    return [...new Set(words.filter(word => !STOP_WORDS.has(word)))];
  }

  function clip(text, max) {
    const value = String(text || "").replace(/\s+/g, " ").trim();
    return value.length > max ? value.slice(0, max - 1).trimEnd() + "…" : value;
  }

  function line(message, max) {
    const text = clip(message?.text, max);
    if (!text) return null;
    return { sender: message.sender === "user" ? "user" : "character", text };
  }

  // The first messages of the chat, only when they are no longer in the
  // window of recent messages the model already sees.
  function opening(allMessages, recentCount, { count = 6, max = 600 } = {}) {
    const list = Array.isArray(allMessages) ? allMessages : [];
    if (list.length <= recentCount) return [];
    const olderCount = list.length - recentCount;
    return list.slice(0, Math.min(count, olderCount)).map(message => line(message, max)).filter(Boolean);
  }

  // Older lines (outside the recent window and the opening) that share the
  // most words with the latest user message.
  function recall(allMessages, recentCount, query, { limit = 4, max = 500, skip = 6 } = {}) {
    const list = Array.isArray(allMessages) ? allMessages : [];
    const olderEnd = list.length - recentCount;
    if (olderEnd <= skip) return [];
    const wanted = keywords(query);
    if (!wanted.length) return [];
    const scored = [];
    for (let index = skip; index < olderEnd; index += 1) {
      const words = new Set(keywords(list[index]?.text));
      let score = 0;
      for (const word of wanted) if (words.has(word)) score += word.length >= 6 ? 2 : 1;
      if (score >= 2 || (score === 1 && wanted.length === 1)) scored.push({ index, score });
    }
    return scored
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .slice(0, limit)
      .sort((a, b) => a.index - b.index)
      .map(({ index }) => line(list[index], max))
      .filter(Boolean);
  }

  root.ChatiRecall = { opening, recall, keywords };
})(typeof window !== "undefined" ? window : globalThis);
