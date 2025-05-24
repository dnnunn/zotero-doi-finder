import { defineConfig } from "zotero-plugin-scaffold";
import pkg from "./package.json";

export default defineConfig({
 name: pkg.config.addonName,
 id: pkg.config.addonID,
 namespace: pkg.config.addonRef,
 
 build: {
   assets: "addon/**/*",
   esbuildOptions: [
     {
       entryPoints: ["src/index.ts"],
       bundle: true,
       format: "iife",
       target: "firefox115",
       outfile: "addon/content/scripts/index.js",
     },
   ],
 },
});
