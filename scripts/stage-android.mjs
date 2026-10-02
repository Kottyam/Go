import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const from = join(root, "dist/client");
const to = join(root, "android/app/src/main/assets");

let html = readFileSync(join(from, "android-shell.html"), "utf8");
html = html.replaceAll("/./", "./");
html = html.replaceAll('href="/', 'href="./');
html = html.replaceAll('src="/', 'src="./');
html = html.replace("<body>", "<body><script>history.replaceState(null,'','/')</script>");

rmSync(to, { recursive: true, force: true });
mkdirSync(to, { recursive: true });
cpSync(from, to, { recursive: true });
rmSync(join(to, "android-shell.html"));
writeFileSync(join(to, "index.html"), html);
console.log("[android] staged web assets");
