#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

function readHeader(asarPath) {
  const fd = fs.openSync(asarPath, "r");
  try {
    const prefix = Buffer.alloc(16);
    fs.readSync(fd, prefix, 0, prefix.length, 0);
    const headerJsonSize = prefix.readUInt32LE(12);
    const json = Buffer.alloc(headerJsonSize);
    fs.readSync(fd, json, 0, headerJsonSize, 16);
    const unalignedDataOffset = 16 + headerJsonSize;
    const dataOffset = unalignedDataOffset + ((4 - (unalignedDataOffset % 4)) % 4);
    return {
      header: JSON.parse(json.toString("utf8")),
      dataOffset,
    };
  } finally {
    fs.closeSync(fd);
  }
}

function findEntry(node, parts) {
  if (parts.length === 0) {
    return node;
  }
  if (!node.files) {
    return null;
  }
  const [head, ...tail] = parts;
  return findEntry(node.files[head], tail);
}

function walk(node, prefix = "") {
  if (!node.files) {
    return [prefix];
  }
  return Object.entries(node.files).flatMap(([name, child]) =>
    walk(child, prefix ? `${prefix}/${name}` : name)
  );
}

function usage() {
  console.error(
    "Usage: node asar-tools.js <list|extract|header> <app.asar> [path] [out]"
  );
  process.exit(2);
}

const [cmd, asarPath, entryPath, outPath] = process.argv.slice(2);
if (!cmd || !asarPath) {
  usage();
}

const { header, dataOffset } = readHeader(asarPath);

if (cmd === "header") {
  console.log(JSON.stringify({ dataOffset, header }, null, 2));
} else if (cmd === "list") {
  for (const item of walk(header)) {
    console.log(item);
  }
} else if (cmd === "extract") {
  if (!entryPath || !outPath) {
    usage();
  }
  const entry = findEntry(header, entryPath.split("/"));
  if (!entry || entry.files || entry.size == null || entry.offset == null) {
    throw new Error(`Cannot extract ${entryPath}`);
  }
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const fd = fs.openSync(asarPath, "r");
  try {
    const data = Buffer.alloc(entry.size);
    fs.readSync(fd, data, 0, entry.size, dataOffset + Number(entry.offset));
    fs.writeFileSync(outPath, data);
  } finally {
    fs.closeSync(fd);
  }
} else {
  usage();
}
