// Generates anime profile pictures and chat backgrounds for the Explore
// starter characters into assets/starters/. Run by the "Starter art" GitHub
// Action (needs the OPENROUTER_API_KEY secret), or locally:
//   npm i --no-save sharp && OPENROUTER_API_KEY=... node scripts/generate-starter-art.mjs [luna kai ...]
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "assets", "starters");
const MODEL = process.env.IMAGE_MODEL || "google/gemini-2.5-flash-image";
const KEY = process.env.OPENROUTER_API_KEY;

const STYLE =
  "High-quality modern anime illustration, clean line art, detailed shading, vibrant cinematic lighting, original character (not from any existing series). No text, no watermark, no logo.";

const STARTERS = {
  luna: {
    look: "an adult woman in her mid-20s, a laid-back forest witch: long wavy silver-lavender hair, warm amber eyes, sly half-smile, oversized dark purple pointed hat decorated with dried herbs and a small moon charm, layered earthy green and brown robes, potion vials on a leather belt",
    scene: "the cozy interior of a crooked wooden witch's cabin deep in a forest at night, rain on the windows, bubbling cauldron, hanging dried herbs, shelves of glowing potion bottles, candlelight"
  },
  kai: {
    look: "an adult man in his early 30s, a burned-out private detective: messy black hair, light stubble, tired but sharp dark eyes, long dark trench coat with turned-up collar, loosened tie, neon reflections on his face",
    scene: "a tiny cluttered detective office in a neon cyberpunk megacity at night, heavy rain streaking the window, pink and cyan neon signs outside, old desk with case files and a flickering lamp"
  },
  aria: {
    look: "a young adult woman in her early 20s, an up-and-coming pop singer: wavy pastel pink-to-lavender hair, bright hazel eyes, nervous but hopeful smile, sparkly cropped stage jacket over a simple top, in-ear monitor wire, microphone in hand",
    scene: "a backstage dressing area minutes before a big concert, vanity mirror with round light bulbs, colorful stage glow through a curtain, scattered setlists and flowers"
  },
  draven: {
    look: "an adult man who looks in his late 20s, an elegant centuries-old vampire prince: long straight black hair, glowing crimson eyes, pale skin, faint fangs in a playful smirk, high-collared black and deep red Victorian coat with silver embroidery",
    scene: "a candle-lit gothic castle library at night, towering bookshelves, a large stone fireplace, velvet armchairs, moonlight through tall arched windows"
  },
  nova: {
    look: "NOVA-7, a ship's artificial intelligence shown as an androgynous holographic avatar made of soft teal and mint light, calm curious expression, subtle circuit patterns across the translucent form, floating data particles",
    scene: "the dim bridge of a long-haul cargo spaceship, glowing teal control panels, a huge window showing stars and a distant nebula, quiet sci-fi atmosphere"
  },
  sofia: {
    look: "an adult woman in her early 20s, a chaotic best friend and roommate: messy dark curly hair in a loose bun, warm brown eyes, mischievous grin, oversized orange hoodie, backpack strap on one shoulder, spinning car keys on a finger",
    scene: "a messy cozy shared apartment bedroom at 2 a.m., warm fairy lights, posters, clothes on a chair, a half-packed backpack and snacks on the bed, city lights through the window"
  },
  ren: {
    look: "an adult man around 30, a quiet wandering swordsman: black hair tied back with loose strands, calm steel-grey eyes, a thin scar on his cheek, dark blue haori over a simple kimono, katana at his side, serious expression",
    scene: "a misty mountain road at dawn among tall pine trees, fog rolling over the path, an abandoned wooden carriage in the distance, soft blue light"
  },
  mia: {
    look: "an adult woman in her mid-20s, a cheerful café owner: short honey-brown bob, kind green eyes, warm smile, a small flour smudge on her cheek, cream sweater with rolled sleeves under a green apron",
    scene: "a small cozy café interior at closing time, rain on the front window, warm lamps, pastries in a glass display, steaming coffee cups, chalkboard menu with drawings"
  }
};

async function generate(prompt, aspectRatio) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://chati-ai.com",
      "X-OpenRouter-Title": "Chati-AI"
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
      image_config: { aspect_ratio: aspectRatio }
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(JSON.stringify(data.error || data).slice(0, 400));
  const url = data.choices?.[0]?.message?.images?.[0]?.image_url?.url || "";
  if (url.startsWith("data:")) return Buffer.from(url.slice(url.indexOf(",") + 1), "base64");
  if (url.startsWith("http")) return Buffer.from(await (await fetch(url)).arrayBuffer());
  throw new Error("No image returned.");
}

async function save(buffer, file, width) {
  await sharp(buffer).resize({ width, withoutEnlargement: true }).webp({ quality: 80 }).toFile(path.join(OUT, file));
  console.log("saved", file);
}

async function main() {
  if (!KEY) throw new Error("Set OPENROUTER_API_KEY.");
  await mkdir(OUT, { recursive: true });

  const only = process.argv.slice(2).filter(key => STARTERS[key]);
  const keys = only.length ? only : Object.keys(STARTERS);

  for (const key of keys) {
    const { look, scene } = STARTERS[key];
    await save(
      await generate(`${STYLE} Character portrait, upper body, looking at the viewer: ${look}. Background: softly blurred hint of ${scene}.`, "3:4"),
      `${key}.webp`,
      768
    );
    await save(
      await generate(`${STYLE} Wide background scenery with no people: ${scene}.`, "16:9"),
      `${key}-bg.webp`,
      1600
    );
  }

  const manifestPath = path.join(OUT, "manifest.json");
  let previous = [];
  try {
    previous = JSON.parse(await readFile(manifestPath, "utf8")).keys || [];
  } catch {}
  const all = [...new Set([...previous, ...keys])].filter(key => STARTERS[key]);
  await writeFile(manifestPath, JSON.stringify({ version: Date.now(), keys: all }, null, 2) + "\n");
  console.log("manifest:", all.join(", "));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
