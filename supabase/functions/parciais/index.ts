import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.2";

// ---------- ENV ----------
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
const DEFAULT_BUCKET = "candidates";

// ---------- CANVAS / LAYOUT ----------
const CANVAS_W = 768;
const CANVAS_H = 1365;

const PHOTO_W = 523;
const PHOTO_H = 700;
const NAME_BAR_H = 58;
const NAME_FONT_START = 36;

// Slots (top-left of the photo area; frames PNG should align visually)
const SLOTS = [
  { x: 90,  y: 260 },
  { x: 460, y: 260 },
  { x: 90,  y: 650 },
  { x: 460, y: 650 },
  { x: 90,  y: 1040 },
  { x: 460, y: 1040 },
] as const;

// Local TTF in Supabase Storage (public)
const FONT_URL =
  "https://waslpdqekbwxptwgpjze.supabase.co/storage/v1/object/public/candidates/assets/OpenSans-SemiBold.ttf";
let FONT_CACHE: Uint8Array | null = null;

// ---------- Helpers ----------
async function fetchArrayBuffer(url: string): Promise<ArrayBuffer> {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) {
    throw new Error(`Failed to fetch ${url} -> ${r.status} ${r.statusText}`);
  }
  return await r.arrayBuffer();
}

async function loadImage(url: string): Promise<Image> {
  const buf = await fetchArrayBuffer(url);
  return await Image.decode(new Uint8Array(buf));
}

// Cover-fit an image into the target w×h without distortion.
function cover(img: Image, targetW: number, targetH: number): Image {
  const scale = Math.max(targetW / img.width, targetH / img.height);
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const resized = img.resize(w, h);
  const x = Math.floor((w - targetW) / 2);
  const y = Math.floor((h - targetH) / 2);
  return resized.crop(x, y, targetW, targetH);
}

// Gera uma camada sólida na cor desejada copiando o alpha do frame (loop seguro)
/*function colorizeFromAlpha(mask: Image, hex: string): Image {
  const { r, g, b, a } = hexToRgba(hex);
  const out = new Image(mask.width, mask.height).fill(0x00000000);
  const baseColor = Image.rgbaToColor(r, g, b, a);
  for (let y = 0; y < mask.height; y++) {
    for (let x = 0; x < mask.width; x++) {
      const { a: ma } = mask.getRGBAAt(x, y);
      if (ma > 0) out.setPixelAt(x, y, Image.rgbaToColor(r, g, b, ma));
    }
  }
  return out;
}

function hexToRgba(hex: string) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3
    ? h.split("").map(ch => ch + ch).join("")
    : h, 16);
  return {
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255,
    a: 255,
  };
}

// Load the TTF from your Storage (cached)
async function loadTTFBytes(): Promise<Uint8Array> {
  if (FONT_CACHE) return FONT_CACHE;
  const ab = await fetchArrayBuffer(FONT_URL);
  FONT_CACHE = new Uint8Array(ab);
  return FONT_CACHE;
}

function bufferToUint8Array(ab: ArrayBuffer) {
  return new Uint8Array(ab);
}

function drawRoundedRect(
  canvas: Image,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  colorHex: string,
) {
  // clamp radius
  r = Math.max(0, Math.min(r, Math.floor(Math.min(w, h) / 2)));
  const { r: cr, g: cg, b: cb, a: ca } = hexToRgba(colorHex);
  const color = Image.rgbaToColor(cr, cg, cb, ca);
  const tmp = new Image(w, h).fill(0x00000000);

  for (let yy = 0; yy < h; yy++) {
    for (let xx = 0; xx < w; xx++) {
      const inCoreX = (xx >= r) && (xx < w - r);
      const inCoreY = (yy >= r) && (yy < h - r);
      if (inCoreX || inCoreY) {
        tmp.setPixelAt(xx, yy, color);
        continue;
      }
      // corner centers
      const cx = (xx < r) ? r : (w - 1 - r);
      const cy = (yy < r) ? r : (h - 1 - r);
      const dx = xx - cx;
      const dy = yy - cy;
      if ((dx * dx + dy * dy) <= (r * r)) {
        tmp.setPixelAt(xx, yy, color);
      }
    }
  }
  canvas.composite(tmp, x, y);
}
  
async function fitTextRender(
  text: string,
  maxWidth: number,
  startSize = NAME_FONT_START,
  minSize = 20,
  color = 0x0d0d0dff,
): Promise<{ img: Image; size: number }> {
  const fontBytes = await loadTTFBytes();
  for (let s = startSize; s >= minSize; s -= 2) {
    const img = await Image.renderText(fontBytes, s, text, color);
    if (img.width <= maxWidth) return { img, size: s };
  }
  const img = await Image.renderText(fontBytes, minSize, text, color);
  return { img, size: minSize };
}*/

// ---------- HTTP ----------
serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Use POST", { status: 405 });
    }

    const {
      backgroundUrl,
      framesUrl,
      frameColor = "#FFD44A",
      outputPath = `colagens/${crypto.randomUUID()}.png`,
      id_event,
      id_category,
      candidates = [],
      photosBaseUrl,
      bucket = DEFAULT_BUCKET,
    } = await req.json();

    if (!backgroundUrl || !framesUrl) {
      return Response.json(
        { error: "Missing backgroundUrl or framesUrl" },
        { status: 400 },
      );
    }
    if (!Array.isArray(candidates) || candidates.length < 1 || candidates.length > 6) {
      return Response.json({ error: "Provide 1 to 6 candidates in 'candidates'." }, { status: 400 });
    }

    // Validate shape: each item must have id_candidate (number) and name (string)
    for (const c of candidates) {
      if (typeof c?.id_candidate !== "number" || typeof c?.name !== "string") {
        return Response.json({ error: "Each candidate must include { id_candidate:number, name:string }" }, { status: 400 });
      }
    }

    if (!id_event || !id_category) {
      return Response.json(
        { error: "Missing id_event or id_category" },
        { status: 400 },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    const baseForPhotos =
      (typeof photosBaseUrl === "string" && photosBaseUrl.trim().length > 0)
        ? photosBaseUrl.trim().replace(/\/+$/, "")
        : framesUrl.substring(0, framesUrl.lastIndexOf("/")); // diretório do framesUrl

    const candObjs = (candidates as Array<{id_candidate:number; name:string}>).map((c) => {
      const filename = `event_${id_event}_category_${id_category}_candidate_${c.id_candidate}.jpg`;
      return { name: c.name, photoUrl: `${baseForPhotos}/${filename}` };
    });
    const cands = candObjs; // names provided by request body

    // Load base images
    const [bgImgRaw, framesRaw0] = await Promise.all([
      loadImage(backgroundUrl),
      loadImage(framesUrl),
    ]);

    // Prepare canvas
    const canvas = new Image(CANVAS_W, CANVAS_H);
    canvas.fill(0x00000000);

    // Background (cover)
    const bg = cover(bgImgRaw, CANVAS_W, CANVAS_H);
    canvas.composite(bg, 0, 0);

    // Paste photos
    for (let i = 0; i < cands.length; i++) {
      const slot = SLOTS[i];
      const { photoUrl } = cands[i];
      const photo = await loadImage(photoUrl);
      const cropped = cover(photo, PHOTO_W, PHOTO_H);
      canvas.composite(cropped, slot.x, slot.y);
    }

    // normaliza dimensões do frame para o tamanho do canvas
    const framesRaw = (framesRaw0.width !== CANVAS_W || framesRaw0.height !== CANVAS_H)
      ? framesRaw0.resize(CANVAS_W, CANVAS_H)
      : framesRaw0;

    // re-rasteriza em um buffer "limpo" para evitar meta estranha de PNG
    //const framesSafe = new Image(framesRaw.width, framesRaw.height).fill(0x00000000);
    //framesSafe.composite(framesRaw, 0, 0);

    // Recolor seguro por alpha
    //const framesTinted = colorizeFromAlpha(framesSafe, frameColor);*/
    canvas.composite(framesRaw, 0, 0);

    // Name bars + texts
    /*for (let i = 0; i < cands.length; i++) {
      const slot = SLOTS[i];
      const name = cands[i].name ?? "";

      // Bar spans photo width (plus slight inset if your overlay asks for it)
      const barX = slot.x + 0;
      const barY = slot.y + PHOTO_H - Math.floor(NAME_BAR_H * 0.9);
      const barW = PHOTO_W;
      const barH = NAME_BAR_H;

      drawRoundedRect(canvas, barX, barY, barW, barH, 10, frameColor);

      // Fit text
      const padding = 18;
      const { img: nameImg } = await fitTextRender(
        name,
        barW - padding * 2,
        NAME_FONT_START,
        20,
        0x0d0d0dff
      );
      const textX = barX + padding;
      const textY = barY + Math.floor((barH - nameImg.height) / 2);
      canvas.composite(nameImg, textX, textY);
    }*/

    // Encode PNG
    const png = await canvas.encode();

    // Upload to Storage
    const { error: upErr } = await supabase.storage.from(bucket).upload(
      outputPath,
      new Blob([png], { type: "image/png" }),
      { upsert: true, contentType: "image/png" },
    );
    if (upErr) throw upErr;

    // Get public URL
    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(outputPath);

    return Response.json({
      ok: true,
      width: CANVAS_W,
      height: CANVAS_H,
      bucket,
      path: outputPath,
      publicUrl: pub.publicUrl,
    });
  } catch (err) {
    console.error(err);
    return Response.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
});
