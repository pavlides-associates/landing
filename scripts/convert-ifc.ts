// Convert every .ifc file in /ifc/ into a .frag in /public/models/.
// .frag is what the viewer actually loads — much faster and ~25× smaller than IFC.
// Run with: npm run convert
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { IfcImporter } from "@thatopen/fragments";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "ifc");
const OUT = path.join(ROOT, "public", "models");

function prettyBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

async function convertOne(ifcPath: string, outPath: string) {
  const serializer = new IfcImporter();
  // IfcImporter needs to find the web-ifc node wasm; point at the local package.
  serializer.wasm.path = path.join(ROOT, "node_modules", "web-ifc") + path.sep;
  serializer.wasm.absolute = true;

  const fd = fs.openSync(ifcPath, "r");
  let prevOffset = -1;
  let done = false;
  const readCallback = (offset: number, size: number) => {
    if (!done) {
      if (offset < prevOffset) done = true;
      prevOffset = offset;
    }
    const data = new Uint8Array(size);
    const n = fs.readSync(fd, data, 0, size, offset);
    return n <= 0 ? new Uint8Array(0) : data;
  };

  const out = await serializer.process({
    readFromCallback: true,
    readCallback,
    raw: false,
  });

  fs.closeSync(fd);
  fs.writeFileSync(outPath, out);
  return out.byteLength;
}

async function main() {
  if (!fs.existsSync(SRC)) {
    console.error(`No /ifc directory at ${SRC}`);
    process.exit(1);
  }
  fs.mkdirSync(OUT, { recursive: true });

  const ifcFiles = fs.readdirSync(SRC).filter((f: string) => f.toLowerCase().endsWith(".ifc"));
  if (ifcFiles.length === 0) {
    console.log("No .ifc files found in /ifc — nothing to do.");
    return;
  }

  const manifest: string[] = [];

  for (const file of ifcFiles) {
    const inPath = path.join(SRC, file);
    const outName = file.replace(/\.ifc$/i, ".frag");
    const outPath = path.join(OUT, outName);

    const inSize = fs.statSync(inPath).size;
    const t0 = Date.now();
    process.stdout.write(`  ${file} (${prettyBytes(inSize)})… `);
    try {
      const outSize = await convertOne(inPath, outPath);
      const dt = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`→ ${outName} (${prettyBytes(outSize)}, ${dt}s)`);
      manifest.push(outName);
    } catch (err) {
      console.log("FAILED");
      console.error(err);
    }
  }

  // Manifest is what the runtime loader reads — public/ files aren't visible
  // to import.meta.glob, so we publish the directory listing as a static JSON.
  manifest.sort();
  fs.writeFileSync(path.join(OUT, "index.json"), JSON.stringify(manifest, null, 2));
  console.log(`  wrote index.json (${manifest.length} entries)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
