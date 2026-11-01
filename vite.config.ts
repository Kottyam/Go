import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";

// ANDROID_BUILD=1 → static SPA shell staged into the Android WebView app.
const androidBuild = process.env.ANDROID_BUILD === "1";

export default defineConfig(({ command, isPreview }) => ({
  base: androidBuild ? "./" : "/",
  server: { host: "0.0.0.0", port: 8080, strictPort: true },
  preview: { host: "127.0.0.1", port: 8081, strictPort: true },
  resolve: { tsconfigPaths: true },
  plugins: [
    tailwindcss(),
    tanstackStart(
      androidBuild ? { spa: { enabled: true, prerender: { outputPath: "/android-shell" } } } : {},
    ),
    ...((command === "build" || isPreview) && !androidBuild ? [nitro({ preset: "vercel" })] : []),
    viteReact(),
  ],
}));
