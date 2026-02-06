#!/usr/bin/env tsx
import { readFileSync } from "fs";
import { parseTable } from "../src/figma/table-parser.js";

const components = process.argv.slice(2);
const csvContent = readFileSync("/tmp/components-with-figma-links.csv", "utf-8");
const rows = await parseTable(csvContent);

for (const name of components) {
  const row = rows.find(r => r.component.toLowerCase() === name.toLowerCase());
  if (row) {
    const match = row.figmaNodeLink.match(/node-id=([^&]+)/);
    const nodeId = match ? match[1].replace(/-/g, ":") : "NOT_FOUND";
    console.log(`${row.component},${nodeId}`);
  }
}
