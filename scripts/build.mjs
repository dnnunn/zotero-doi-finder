import { build } from "./zotero-cmd.mjs";

process.env.NODE_ENV = process.argv[2] || "development";
build();
// Working version - DOI and Abstract Finder functional
