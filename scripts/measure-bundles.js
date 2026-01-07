import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import zlib from "zlib";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APPS_DIR = path.join(__dirname, "../apps");
const OUTPUT_FILE = path.join(__dirname, "bundle-comparison.json");

function getDirectories(dir) {
  return fs.readdirSync(dir).filter((file) => {
    const fullPath = path.join(dir, file);
    return fs.statSync(fullPath).isDirectory();
  });
}

function parseHTMLForScripts(htmlPath) {
  if (!fs.existsSync(htmlPath)) return [];

  const content = fs.readFileSync(htmlPath, "utf-8");
  const scripts = new Set();

  // Match script tags and extract src with full tag context to check attributes
  const scriptTagRegex = /<script([^>]*)>/g;
  let match;
  while ((match = scriptTagRegex.exec(content)) !== null) {
    const attributes = match[1];

    // Skip scripts with noModule attribute (legacy fallback for older browsers)
    if (/noModule/i.test(attributes)) {
      continue;
    }

    // Extract src attribute
    const srcMatch = attributes.match(/\ssrc=["']([^"']+)["']/);
    if (srcMatch) {
      scripts.add(srcMatch[1]);
    }
  }

  const modulePreloadRegex =
    /<link[^>]*rel=["']modulepreload["'][^>]*href=["']([^"']+)["'][^>]*>/g;
  while ((match = modulePreloadRegex.exec(content)) !== null) {
    scripts.add(match[1]);
  }

  const importRegex = /import\s*\(\s*["']([^"']+\.js)["']\s*\)/g;
  while ((match = importRegex.exec(content)) !== null) {
    scripts.add(match[1]);
  }

  return Array.from(scripts);
}

function getLoadedJSSize(distDir, scripts) {
  let totalSize = 0;
  let totalGzipSize = 0;
  const trackedFiles = new Set();
  const files = [];

  function processFile(scriptPath) {
    if (trackedFiles.has(scriptPath)) return;

    const cleanPath = scriptPath.replace(/^\//, "");
    const fullPath = path.join(distDir, cleanPath);

    if (!fs.existsSync(fullPath)) return;

    trackedFiles.add(scriptPath);
    const content = fs.readFileSync(fullPath);
    const gzipSize = zlib.gzipSync(content, { level: 6 }).length;

    totalSize += content.length;
    totalGzipSize += gzipSize;

    files.push({
      path: scriptPath,
      sizeKB: (content.length / 1000).toFixed(2),
      gzipSizeKB: (gzipSize / 1000).toFixed(2),
    });

    const contentStr = content.toString(
      "utf-8",
      0,
      Math.min(content.length, 100000)
    );
    const importRegex =
      /import\s+(?:{[^}]*}|[^'"]*)?\s*from\s+["']([^"']+\.js)["']/g;
    let importMatch;

    while ((importMatch = importRegex.exec(contentStr)) !== null) {
      const importedFile = importMatch[1];
      const fileDir = path.dirname(scriptPath);
      const resolvedPath = path.posix.normalize(
        path.posix.join(fileDir, importedFile)
      );

      if (!trackedFiles.has(resolvedPath)) {
        processFile(resolvedPath);
      }
    }
  }

  for (const scriptPath of scripts) {
    processFile(scriptPath);
  }

  return { totalSize, totalGzipSize, files };
}

function buildApp(appName, appPath) {
  console.log(`\n📦 Building ${appName}...`);

  try {
    execSync("npm run build", {
      cwd: appPath,
      stdio: "pipe",
      timeout: 60000,
    });
    console.log(`✅ ${appName} built successfully`);
    return true;
  } catch (error) {
    console.log(`⚠️  Failed to build ${appName}: ${error.message}`);
    return false;
  }
}

function findIndexHTML(startDir) {
  // Si index.html existe directement, l'utiliser
  const directPath = path.join(startDir, "index.html");
  if (fs.existsSync(directPath)) {
    return directPath;
  }

  // Sinon, le chercher récursivement (max 3 niveaux)
  function search(dir, depth = 0) {
    if (depth > 3) return null;

    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (file === "index.html") {
        return path.join(dir, file);
      }

      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory() && !file.startsWith(".")) {
        const found = search(fullPath, depth + 1);
        if (found) return found;
      }
    }
    return null;
  }

  return search(startDir);
}

function getJSSize(appPath) {
  const distPath = path.join(appPath, "dist");
  const buildPath = path.join(appPath, "build");

  const targetDir = fs.existsSync(distPath)
    ? distPath
    : fs.existsSync(buildPath)
    ? buildPath
    : null;

  if (!targetDir) {
    console.log(`⚠️  No dist or build folder found`);
    return null;
  }

  const indexPath = findIndexHTML(targetDir);
  if (!indexPath) {
    console.log(`⚠️  No index.html found`);
    return null;
  }

  const scripts = parseHTMLForScripts(indexPath);
  if (scripts.length === 0) {
    console.log(`⚠️  No script tags found in HTML`);
    return null;
  }

  const indexDir = path.dirname(indexPath);
  let result = getLoadedJSSize(indexDir, scripts);

  // Pour Qwik: ajouter aussi les autres JS du dossier assets
  const assetsDir = path.join(indexDir, "assets");
  if (fs.existsSync(assetsDir)) {
    const files = fs.readdirSync(assetsDir);
    const hasBundleGraph = files.some(
      (f) => f.startsWith("bundle-graph-") && f.endsWith(".json")
    );

    if (hasBundleGraph) {
      const allJSFiles = fs
        .readdirSync(assetsDir)
        .filter((f) => f.endsWith(".js"));
      const trackedFiles = new Set(scripts.map((s) => path.basename(s)));

      for (const jsFile of allJSFiles) {
        if (!trackedFiles.has(jsFile)) {
          const fullPath = path.join(assetsDir, jsFile);
          const content = fs.readFileSync(fullPath);
          const gzipSize = zlib.gzipSync(content, { level: 6 }).length;

          result.totalSize += content.length;
          result.totalGzipSize += gzipSize;
          result.files.push({
            path: path.relative(indexDir, fullPath),
            sizeKB: (content.length / 1000).toFixed(2),
            gzipSizeKB: (gzipSize / 1000).toFixed(2),
          });
        }
      }
    }
  }

  return result;
}
async function main() {
  console.log("🚀 Starting bundle size comparison...\n");

  const apps = getDirectories(APPS_DIR);
  const results = [];

  for (const appName of apps) {
    const appPath = path.join(APPS_DIR, appName);

    if (buildApp(appName, appPath)) {
      const sizes = getJSSize(appPath);

      if (sizes) {
        const sizeKB = (sizes.totalSize / 1000).toFixed(2);
        const gzipKB = (sizes.totalGzipSize / 1000).toFixed(2);

        results.push({
          name: appName,
          sizeKB: parseFloat(sizeKB),
          gzipSizeKB: parseFloat(gzipKB),
          files: sizes.files,
        });

        console.log(`   📊 ${gzipKB} KB (gzip) / ${sizeKB} KB (raw)`);
      } else {
        results.push({
          name: appName,
          error: "Failed to measure",
        });
      }
    } else {
      results.push({
        name: appName,
        error: "Build failed",
      });
    }
  }

  // Sort by gzip size
  results.sort(
    (a, b) => (b.gzipSizeKB || Infinity) - (a.gzipSizeKB || Infinity)
  );

  // Save results
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
  console.log(`\n✅ Results saved to ${OUTPUT_FILE}`);

  // Display summary
  console.log("\n📈 Summary (sorted by size):");
  console.log("─".repeat(60));
  results.forEach((result, index) => {
    if (result.error) {
      console.log(
        `${index + 1}. ${result.name.padEnd(15)} - ❌ ${result.error}`
      );
    } else {
      console.log(
        `${index + 1}. ${result.name.padEnd(15)} - ${result.gzipSizeKB
          .toString()
          .padEnd(8)} KB (gzip) / ${result.sizeKB
          .toString()
          .padEnd(8)} KB (raw)`
      );
    }
  });
  console.log("─".repeat(60));
}

main().catch(console.error);
