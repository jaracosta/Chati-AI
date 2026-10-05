import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const html = read("index.html");
const script = read("script.js");
const auth = read("supabase-auth-v6.js");
const accountData = read("account-data-v6.js");
const profile = read("profile-ui-v6.js");
const profileCss = read("profile-ui-v6.css");
const cloudMedia = read("cloud-media.js");
const sync = read("conversation-sync-v5-final.js");
const server = read("server.js");
const sw = read("sw.js");

const requiredFiles = [
  "supabase-auth-v6.js",
  "account-data-v6.js",
  "profile-ui-v6.js",
  "profile-ui-v6.css"
];

for (const file of requiredFiles) {
  assert(
    fs.existsSync(file),
    "Missing V6 asset: " + file
  );
}

const requiredIds = [
  "profileNavBtn",
  "profileModal",
  "profileAuthForm",
  "profileSignedInCard",
  "profileAccountsList",
  "profilePasswordForm",
  "profileThemeSelect",
  "profileAvatarFile",
  "characterAvatarVideoPreview",
  "backgroundVideoPreview",
  "chatBackgroundVideo",
  "chatCharacterVideo"
];

for (const id of requiredIds) {
  assert(
    html.includes('id="' + id + '"'),
    "Missing required HTML id: " + id
  );
}

const ids = [];
const idRegex = /\bid="([^"]+)"/g;
let match;

while ((match = idRegex.exec(html))) {
  ids.push(match[1]);
}

const duplicates = ids.filter(
  (id, index) => ids.indexOf(id) !== index
);

assert(
  duplicates.length === 0,
  "Duplicate HTML ids: " + [...new Set(duplicates)].join(", ")
);

const order = [
  "supabase-auth-v6.js",
  "account-data-v6.js",
  "script.js",
  "conversation-db.js",
  "conversation-sync.js",
  "conversation-sync-v5-final.js",
  "cloud-media.js",
  "cloud-sync.js",
  "profile-ui-v6.js"
];

let previous = -1;

for (const item of order) {
  const index = html.indexOf(item);

  assert(
    index >= 0,
    "Missing script in index.html: " + item
  );

  assert(
    index > previous,
    "Wrong script order around: " + item
  );

  previous = index;
}

assert(
  !html.includes("supabase-auth-v4.js"),
  "Old V4 auth script is still loaded."
);

assert(
  !html.includes("account-ui.js?v="),
  "Old V4 account UI script is still loaded."
);

assert(
  script.includes("window.ChatiAccountDataReady"),
  "script.js does not wait for account-scoped storage."
);

assert(
  accountData.includes("SIGNED_OUT_OWNER") &&
  accountData.includes('ARCHIVE_DB_NAME') &&
  accountData.includes('"chatiAccountDB"') &&
  accountData.includes("clearActiveEntries"),
  "Account workspace isolation is missing."
);

assert(
  auth.includes("addAccount") &&
  auth.includes("switchAccount") &&
  auth.includes("changePassword"),
  "Multi-account/security auth APIs are incomplete."
);

assert(
  profile.includes("uploadProfileMedia") &&
  profile.includes("profileThemeSelect") &&
  profile.includes("listAccounts"),
  "Profile UI functionality is incomplete."
);

assert(
  profileCss.includes('@media (max-width: 700px)') &&
  profileCss.includes('html[data-theme="light"]'),
  "Responsive/light profile styles are missing."
);

assert(
  cloudMedia.includes('"video/mp4"') &&
  cloudMedia.includes('"video/webm"') &&
  cloudMedia.includes('"video/quicktime"'),
  "Cloud media video MIME support is incomplete."
);

assert(
  script.includes("isVideoVisualSource") &&
  script.includes("chatBackgroundVideo") &&
  script.includes("chatCharacterVideo"),
  "Character video rendering support is incomplete."
);

assert(
  sync.includes("function charactersChange()") &&
  sync.includes('window.addEventListener("focus", pageFocus)') &&
  sync.includes('window.removeEventListener("chati:characterschange", charactersChange)'),
  "Cross-device sync lifecycle recovery is incomplete."
);

assert(
  server.includes("CHARACTER DIRECTIVE PRIORITY") &&
  server.includes("Let emotional intensity visibly change the writing"),
  "Human-like character behavior prompt is missing."
);

assert(
  sw.includes("chati-ai-runtime-v6.1.0"),
  "Service worker cache version was not bumped."
);

console.log(
  "V6 integration validation passed:",
  ids.length,
  "unique DOM ids checked."
);
