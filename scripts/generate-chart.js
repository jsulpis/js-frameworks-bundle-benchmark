import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INPUT_FILE = path.join(__dirname, "bundle-comparison.json");
const OUTPUT_FILE = path.join(__dirname, "bundle-comparison.svg");

function generateChart() {
  // Read data
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`❌ File not found: ${INPUT_FILE}`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(INPUT_FILE, "utf-8"));
  const validData = data.filter((d) => !d.error);

  if (validData.length === 0) {
    console.error("❌ No valid data to chart");
    process.exit(1);
  }

  // Configuration
  const padding = { top: 60, right: 40, bottom: 80, left: 80 };
  const width = 1200;
  const height = 600;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Find max for scale
  const maxSize = Math.max(...validData.map((d) => d.gzipSizeKB));
  const yMax = Math.ceil(maxSize / 10) * 10; // Round up to nearest ten

  // Framework brand colors
  const frameworkColors = {
    "react-18": "#0A7EA5",
    "react-19": "#0A7EA5",
    "angular-21": "#DD0031",
    vue: "#42B883",
    "nuxt-4": "#00DC82",
    svelte: "#FF3E00",
    sveltekit: "#FF3E00",
    qwik: "#AC7EF4",
    preact: "#673AB8",
    solid: "#2C4F7C",
  };

  // Calculate positions
  const barWidth = chartWidth / validData.length;
  const barPadding = barWidth * 0.1;
  const actualBarWidth = barWidth - barPadding * 2;

  // Function to convert a value to Y pixels
  const toPixelY = (value) => {
    return chartHeight - (value / yMax) * chartHeight;
  };

  // Build SVG
  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <style>
      * { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; }
      .title { font-size: 24px; font-weight: bold; fill: #333; }
      .subtitle { font-size: 14px; fill: #666; }
      .label { font-size: 12px; fill: #333; }
      .axis-label { font-size: 12px; fill: #666; }
      .grid-line { stroke: #e0e0e0; stroke-width: 1; }
      .axis { stroke: #333; stroke-width: 2; }
      .bar-label { font-size: 13px; fill: #333; font-weight: 500; }
      .value-label { font-size: 12px; fill: #333; font-weight: bold; }
    </style>
  </defs>

  <!-- Background -->
  <rect width="${width}" height="${height}" fill="#ffffff"/>

  <!-- Title -->
  <text x="${
    width / 2
  }" y="40" text-anchor="middle" class="title">Framework Bundle Size Comparison</text>
  <text x="${
    width / 2
  }" y="55" text-anchor="middle" class="subtitle">JavaScript bundle size (gzipped) in KB</text>

  <!-- Y-axis -->
  <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${
    height - padding.bottom
  }" class="axis"/>

  <!-- X-axis -->
  <line x1="${padding.left}" y1="${height - padding.bottom}" x2="${
    width - padding.right
  }" y2="${height - padding.bottom}" class="axis"/>

  <!-- Y-axis grid lines and labels -->`;

  // Add grid lines and labels for Y-axis
  for (let i = 0; i <= 10; i++) {
    const value = (i / 10) * yMax;
    const y = padding.top + toPixelY(value);

    svg += `\n  <!-- Grid line ${i} -->
  <line x1="${padding.left}" y1="${y}" x2="${
      width - padding.right
    }" y2="${y}" class="grid-line"/>
  <text x="${padding.left - 10}" y="${
      y + 5
    }" text-anchor="end" class="axis-label">${Math.round(value)}</text>`;
  }

  // Y-axis label
  svg += `\n  <text x="20" y="${
    height / 2
  }" text-anchor="middle" transform="rotate(-90 20 ${
    height / 2
  })" class="axis-label">Size (KB)</text>`;

  // Bars
  validData.forEach((item, index) => {
    const x = padding.left + index * barWidth + barPadding;
    const barHeight = (item.gzipSizeKB / yMax) * chartHeight;
    const y = padding.top + chartHeight - barHeight;
    const color = frameworkColors[item.name] || "#999999"; // Fallback to gray if framework not found

    // Bar
    svg += `\n  <!-- Bar ${index} -->
  <rect x="${x}" y="${y}" width="${actualBarWidth}" height="${barHeight}" fill="${color}" opacity="0.9" rx="4"/>

    <!-- Value above bar -->
  <text x="${x + actualBarWidth / 2}" y="${
      y - 8
    }" text-anchor="middle" class="value-label">${item.gzipSizeKB.toLocaleString(
      "en-US"
    )}</text>`;
  });

  // X-axis labels
  validData.forEach((item, index) => {
    const x = padding.left + index * barWidth + barWidth / 2;
    const y = height - padding.bottom + 30;

    svg += `\n  <text x="${x}" y="${y}" text-anchor="middle" class="bar-label">${item.name}</text>`;
  });

  // X-axis label
  svg += `\n  <text x="${width / 2}" y="${
    height - 15
  }" text-anchor="middle" class="axis-label">Framework</text>`;

  // Footer
  const timestamp = new Date().toLocaleString();
  svg += `\n  <text x="${width - padding.right}" y="${
    height - 10
  }" text-anchor="end" font-size="10" fill="#999">Generated on ${timestamp}</text>`;

  svg += `\n</svg>`;

  // Write SVG file
  fs.writeFileSync(OUTPUT_FILE, svg);
  console.log(`✅ Chart generated: ${OUTPUT_FILE}`);
}

generateChart();
