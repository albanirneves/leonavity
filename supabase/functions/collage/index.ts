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
const CANVAS_H = 768;

const PHOTO_W = 221;
const PHOTO_H = 295;
const NAME_BAR_H = 58;

// Slots (top-left of the photo area; frames PNG should align visually)
const SLOTS = [
  { x: 128,  y: 176 },
  { x: 444, y: 176 },
  { x: 744, y: 176 },
  { x: 128,  y: 587 },
  { x: 444, y: 587 },
  { x: 744, y: 587 },
  { x: 128,  y: 995 },
  { x: 444, y: 995 },
  { x: 744, y: 995 },
] as const;

// ---------- COLOR HELPERS ----------
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) throw new Error(`Invalid hex color: ${hex}`);
  return {
    r: parseInt(m[1], 16),
    g: parseInt(m[2], 16),
    b: parseInt(m[3], 16),
  };
}

/**
 * Recolors every non-transparent pixel keeping its original alpha.
 * Useful to tint a flat-color layout (anti-aliased edges stay smooth).
 */
function recolorNonTransparent(img: Image, hex: string): Image {
  const { r, g, b } = hexToRgb(hex);
  const w = img.width;
  const h = img.height;
  const out = img.clone();
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      try {
        const col = out.getPixelAt(x, y);
        const [, , , a] = Image.colorToRGBA(col);
        if (a > 0) {
          out.setPixelAt(x, y, Image.rgbaToColor(r, g, b, a));
        }
      } catch (error) {}
    }
  }
  return out;
}

// Local TTF in Supabase Storage (public)
const FONT_URL = SUPABASE_URL + "/storage/v1/object/public/candidates/assets/OpenSans-SemiBold.ttf";
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

// Load the TTF from your Storage (cached)
async function loadTTFBytes(): Promise<Uint8Array> {
  if (FONT_CACHE) return FONT_CACHE;
  const ab = await fetchArrayBuffer(FONT_URL);
  FONT_CACHE = new Uint8Array(ab);
  return FONT_CACHE;
}
  //update
function normalizeHex6(input?: string, fallback = 0x0d0d0dff): number {
  if (!input) return fallback;
  if (typeof input !== 'string') return fallback;
  let s = input.trim().toLowerCase();
  if (!s.startsWith('#')) return fallback;
  let hex = s.slice(1);
  // permite #rgb -> #rrggbb
  if (hex.length === 3) {
    hex = hex.split('').map(ch => ch + ch).join('');
  }
  // aceita somente #rrggbb (sem alpha)
  if (hex.length !== 6) return fallback;
  const val = Number.parseInt(hex + 'ff', 16); // adiciona alpha FF
  return Number.isNaN(val) ? fallback : (val >>> 0);
}

function embolden(img: Image, strength = 1): Image {
  const out = new Image(img.width + strength, img.height + strength);
  out.fill(0x00000000);
  for (let dx = 0; dx <= strength; dx++) {
    for (let dy = 0; dy <= strength; dy++) {
      out.composite(img, dx, dy);
    }
  }
  return out;
}

async function fitTextRender(
  text: string,
  maxWidth: number,
  startSize = 20,
  minSize = 16,
  color?: string, // aceita apenas hex sem alpha; se inválido usa default
  bold = false,
  boldStrength = 1, // 1–2 geralmente é suficiente
): Promise<{ img: Image; size: number }> {
  const fontBytes = await loadTTFBytes();
  const colorNum = normalizeHex6(color);
  for (let s = startSize; s >= minSize; s -= 2) {
    let img = await Image.renderText(fontBytes, s, text, colorNum);
    if (bold) img = embolden(img, boldStrength);
    if (img.width <= maxWidth) return { img, size: s };
  }
  let img = await Image.renderText(fontBytes, minSize, text, colorNum);
  if (bold) img = embolden(img, boldStrength);
  return { img, size: minSize };
}
// ---------- HTTP ----------
serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Use POST", { status: 405 });
    }

    const {
      frameColor = "#fddf59",
      id_event,
      id_category,
      candidates = [],
      bucket = DEFAULT_BUCKET,
    } = await req.json();

    const outputPath = `event_${id_event}_category_${id_category}_banner.png`;

    const photosBaseUrl = `${SUPABASE_URL}/storage/v1/object/public/candidates`;
    const backgroundUrl = `${photosBaseUrl}/assets/background_categories_event_${id_event}.png`;
    const framesUrl = `${photosBaseUrl}/assets/layout_categories.png`;

    if (!Array.isArray(candidates) || candidates.length < 1 || candidates.length > 9) {
      return Response.json({ error: "Provide 1 to 9 candidates in 'candidates'." }, { status: 400 });
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
      //const cropped = cover(photo, PHOTO_W, PHOTO_H);
      const photoRaw = (photo.width !== PHOTO_W || photo.height !== PHOTO_H)
        ? photo.resize(PHOTO_W, PHOTO_H)
        : photo;
      canvas.composite(photoRaw, slot.x, slot.y);
    }

    // normaliza dimensões do frame para o tamanho do canvas
    const framesRaw = (framesRaw0.width !== CANVAS_W || framesRaw0.height !== CANVAS_H)
      ? framesRaw0.resize(CANVAS_W, CANVAS_H)
      : framesRaw0;

    const tintedFrames = recolorNonTransparent(framesRaw, frameColor);
    canvas.composite(tintedFrames, 0, 0);

    // Name bars + texts
    for (let i = 0; i < cands.length; i++) {
      const slot = SLOTS[i];
      const name = ((parseInt(i) + 1) + "° " + cands[i].name).toUpperCase();

      // Bar spans photo width (plus slight inset if your overlay asks for it)
      const barX = slot.x + 15;
      const barY = slot.y + PHOTO_H - Math.floor(NAME_BAR_H * 0.9) + 30;
      const barW = PHOTO_W;
      const barH = NAME_BAR_H;

      //drawRoundedRect(canvas, barX, barY, barW, barH, 10, frameColor);

      // Fit text
      const padding = 18;
      const { img: nameImg } = await fitTextRender(
        name,
        barW - padding * 2,
        20,
        16,
        '#5F19DD',
        true,
        1
      );
      const textX = barX + padding;
      const textY = barY + Math.floor((barH - nameImg.height) / 2);
      canvas.composite(nameImg, textX, textY);
    }

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
      publicUrl: pub.publicUrl
    }); 
  } catch (err) {
    console.error(err);
    return Response.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
});
