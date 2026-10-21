// Adds the home-screen (PWA) tags to the exported web app, the same way the
// EveryLady app does. Run after `expo export -p web` (npm run build:web).
import { readFileSync, writeFileSync } from "node:fs";

const FILE = new URL("../dist/index.html", import.meta.url);
const TAGS = `
    <link rel="manifest" href="/manifest.json" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <meta name="theme-color" content="#faf5ef" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="Abi" />
    <meta name="robots" content="noindex" />
  </head>`;

let html = readFileSync(FILE, "utf8");
if (!html.includes('rel="manifest"')) {
  html = html.replace("</head>", TAGS);
  html = html.replace(/content="width=device-width, initial-scale=1(, shrink-to-fit=no)?"/, (m) => m.replace(/"$/, ', viewport-fit=cover"'));
  writeFileSync(FILE, html);
  console.log("PWA tags added to dist/index.html");
} else {
  console.log("dist/index.html already has PWA tags");
}
