import * as fs from "fs";
import * as path from "path";

const OUTPUT_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "EmptyTusconExpoHall.PNG"
);

describe("Ticket 0 — EmptyTusconExpoHall.PNG", () => {
  test("output file exists", () => {
    expect(fs.existsSync(OUTPUT_PATH)).toBe(true);
  });

  test("file is non-empty", () => {
    const stat = fs.statSync(OUTPUT_PATH);
    // A meaningful PNG should be at least 10 KB
    expect(stat.size).toBeGreaterThan(10_000);
  });

  test("file has valid PNG signature", () => {
    const buf = Buffer.alloc(8);
    const fd = fs.openSync(OUTPUT_PATH, "r");
    fs.readSync(fd, buf, 0, 8, 0);
    fs.closeSync(fd);

    // PNG magic bytes: 137 80 78 71 13 10 26 10
    const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(buf.equals(pngSignature)).toBe(true);
  });

  test("file contains IHDR chunk with reasonable dimensions", () => {
    // IHDR is the first chunk after the 8-byte signature.
    // Layout: 4 bytes length, 4 bytes "IHDR", 4 bytes width, 4 bytes height
    const buf = Buffer.alloc(24);
    const fd = fs.openSync(OUTPUT_PATH, "r");
    fs.readSync(fd, buf, 0, 24, 0);
    fs.closeSync(fd);

    // Bytes 12-15 = width (big-endian), 16-19 = height (big-endian)
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);

    // Should be at least 800x600 and no more than 4000x4000
    expect(width).toBeGreaterThanOrEqual(800);
    expect(width).toBeLessThanOrEqual(4000);
    expect(height).toBeGreaterThanOrEqual(600);
    expect(height).toBeLessThanOrEqual(4000);
  });

  test("generator script exists", () => {
    const scriptPath = path.resolve(
      __dirname,
      "..",
      "generate-empty-expo-hall.py"
    );
    expect(fs.existsSync(scriptPath)).toBe(true);
  });
});
