import esbuild from "esbuild";
import process from "node:process";

const watch = process.argv.includes("--watch");

const context = await esbuild.context({
  entryPoints: ["main.ts"],
  bundle: true,
  external: ["obsidian", "electron", "@codemirror/*", "node:http", "node:https"],
  format: "cjs",
  logLevel: "info",
  outfile: "main.js",
  sourcemap: watch ? "inline" : false,
  target: "es2018",
});

if (watch) {
  await context.watch();
} else {
  await context.rebuild();
  await context.dispose();
}
