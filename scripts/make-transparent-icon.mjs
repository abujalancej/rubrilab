import sharp from "sharp";

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) {
  throw new Error("Usage: node scripts/make-transparent-icon.mjs INPUT OUTPUT");
}

const { data, info } = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;
const seen = new Uint8Array(width * height);
const queue = new Int32Array(width * height);
let head = 0;
let tail = 0;

function isOuterBackground(pixelIndex) {
  const offset = pixelIndex * channels;
  const red = data[offset];
  const green = data[offset + 1];
  const blue = data[offset + 2];
  const isNearWhite = Math.min(red, green, blue) >= 205 && Math.max(red, green, blue) - Math.min(red, green, blue) <= 38;
  const isNearBlack = Math.max(red, green, blue) <= 24;
  return isNearWhite || isNearBlack;
}

function enqueue(pixelIndex) {
  if (seen[pixelIndex] || !isOuterBackground(pixelIndex)) return;
  seen[pixelIndex] = 1;
  queue[tail++] = pixelIndex;
}

for (let x = 0; x < width; x += 1) {
  enqueue(x);
  enqueue((height - 1) * width + x);
}
for (let y = 0; y < height; y += 1) {
  enqueue(y * width);
  enqueue(y * width + width - 1);
}

while (head < tail) {
  const pixelIndex = queue[head++];
  const x = pixelIndex % width;
  const y = Math.floor(pixelIndex / width);
  if (x > 0) enqueue(pixelIndex - 1);
  if (x + 1 < width) enqueue(pixelIndex + 1);
  if (y > 0) enqueue(pixelIndex - width);
  if (y + 1 < height) enqueue(pixelIndex + width);
}

for (let pixelIndex = 0; pixelIndex < seen.length; pixelIndex += 1) {
  if (seen[pixelIndex]) data[pixelIndex * channels + 3] = 0;
}

await sharp(data, { raw: info }).png().toFile(outputPath);
