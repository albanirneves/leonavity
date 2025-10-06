import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.2";

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
// ---------- ENV ----------
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
const DEFAULT_BUCKET = "candidates";

// ---------- CANVAS / LAYOUT ----------
// Reduced dimensions by ~40% to save CPU
const CANVAS_W = 819; // Was 1365
const CANVAS_H = 819; // Was 1365

const PHOTO_W = 136; // Was 226
const PHOTO_H = 182; // Was 303
const NAME_BAR_H = 35; // Was 58

// Slots (top-left of the photo area; frames PNG should align visually)
// Scaled proportionally
const SLOTS = [
  { x: 121,  y: 88 },
  { x: 352, y: 88 },
  { x: 581, y: 88 },
  { x: 121,  y: 334 },
  { x: 352, y: 334 },
  { x: 581, y: 334 },
  { x: 121,  y: 577 },
  { x: 352, y: 577 },
  { x: 581, y: 577 },
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

// --- Frame masking helpers for last-page empty slots ---
// Scaled proportionally (~60% of original)
const FRAME_PAD_X = 14;      // horizontal pad of yellow frame beyond photo
const FRAME_PAD_TOP = 14;    // top pad beyond photo
const FRAME_PAD_BOTTOM = 14; // extra bottom pad (besides NAME_BAR_H)

function frameRectForSlot(idx: number) {
  const s = SLOTS[idx];
  return {
    x: s.x - FRAME_PAD_X,
    y: s.y - FRAME_PAD_TOP,
    w: PHOTO_W + FRAME_PAD_X * 2,
    h: PHOTO_H + FRAME_PAD_TOP + FRAME_PAD_BOTTOM + NAME_BAR_H,
  };
}

function clearRect(img: Image, x: number, y: number, w: number, h: number) {
  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(img.width, Math.ceil(x + w));
  const y1 = Math.min(img.height, Math.ceil(y + h));
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) {
      img.setPixelAt(xx, yy, 0x00000000); // fully transparent pixel
    }
  }
}

function punchOutEmptyFrameSlots(baseFrames: Image, usedCount: number): Image {
  if (usedCount >= 9) return baseFrames;
  const copy = baseFrames.clone();
  for (let i = usedCount; i < 9; i++) {
    const r = frameRectForSlot(i);
    clearRect(copy, r.x, r.y, r.w, r.h);
  }
  return copy;
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

// --- Retry helper (exponential backoff with jitter)
async function retry<T>(fn: () => Promise<T>, opts: { retries?: number; baseMs?: number } = {}): Promise<T> {
  const retries = opts.retries ?? 3;
  const baseMs  = opts.baseMs  ?? 250;
  let lastErr: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i === retries) break;
      const jitter = Math.floor(Math.random() * 100);
      const delay = baseMs * Math.pow(2, i) + jitter;
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

async function loadImageWithRetry(url: string): Promise<Image> {
  const ab = await retry(() => fetchArrayBuffer(url));
  return await Image.decode(new Uint8Array(ab));
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
  maxHeight?: number,
): Promise<{ img: Image; size: number }> {
  const fontBytes = await loadTTFBytes();
  const colorNum = normalizeHex6(color);
  for (let s = startSize; s >= minSize; s -= 2) {
    let img = await Image.renderText(fontBytes, s, text, colorNum);
    if (bold) img = embolden(img, boldStrength);
    const fitsWidth = img.width  <= maxWidth;
    const fitsHeight = maxHeight ? (img.height <= maxHeight) : true;
    if (fitsWidth && fitsHeight) return { img, size: s };
  }
  let img = await Image.renderText(fontBytes, minSize, text, colorNum);
  if (bold) img = embolden(img, boldStrength);
  return { img, size: minSize };
}

// Load and resize photo to reduce memory usage (simplified for performance)
async function loadAndResizePhoto(url: string): Promise<Image> {
  const MAX_HEIGHT = 800; // Reduced from 1024 for faster processing
  const MAX_WIDTH = 600;
  
  // Load original image
  let img = await loadImage(url);
  
  // Calculate resize to fit within bounds
  const widthRatio = MAX_WIDTH / img.width;
  const heightRatio = MAX_HEIGHT / img.height;
  const scale = Math.min(widthRatio, heightRatio, 1); // Don't upscale
  
  // Only resize if needed
  if (scale < 1) {
    const newWidth = Math.round(img.width * scale);
    const newHeight = Math.round(img.height * scale);
    img = img.resize(newWidth, newHeight);
  }
  
  return img;
}
// ---------- HTTP ----------
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response("Use POST", { status: 405, headers: corsHeaders });
    }

    const {
      frameColor = "#fddf59",
      id_event,
      id_category,
      bucket = DEFAULT_BUCKET,
    } = await req.json();

    // Multiple banners will be created if needed

    const photosBaseUrl = `${SUPABASE_URL}/storage/v1/object/public/candidates`;
    const backgroundUrl = `${photosBaseUrl}/assets/background_categories_event_${id_event}.png`;
    const framesUrl = `${photosBaseUrl}/assets/layout_categories.png`;

    if (!id_event || !id_category) {
      return Response.json(
        { error: "Missing id_event or id_category" },
        { status: 400, headers: corsHeaders },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // Buscar candidatas da tabela
    const { data: candidates, error: candidatesError } = await supabase
      .from('candidates')
      .select('id_candidate, name')
      .eq('id_event', id_event)
      .eq('id_category', id_category)
      .order('id_candidate');

    // Buscar nome da categoria
    const { data: categoryData, error: categoryError } = await supabase
      .from('categories')
      .select('name')
      .eq('id_event', id_event)
      .eq('id_category', id_category)
      .single();

    if (candidatesError) {
      return Response.json({ error: `Error fetching candidates: ${candidatesError.message}` }, { status: 500, headers: corsHeaders });
    }

    if (categoryError) {
      return Response.json({ error: `Error fetching category: ${categoryError.message}` }, { status: 500, headers: corsHeaders });
    }

    if (!candidates || candidates.length < 1) {
      return Response.json({ error: "No candidates found for this event/category." }, { status: 400, headers: corsHeaders });
    }

    const baseForPhotos =
      (typeof photosBaseUrl === "string" && photosBaseUrl.trim().length > 0)
        ? photosBaseUrl.trim().replace(/\/+$/, "")
        : framesUrl.substring(0, framesUrl.lastIndexOf("/")); // diretório do framesUrl

    // Dividir candidatas em grupos de no máximo 9
    const candidateGroups: Array<{name: string, photoUrl: string}[]> = [];
    for (let i = 0; i < candidates.length; i += 9) {
      const group = candidates.slice(i, i + 9).map((c) => {
        const filename = `event_${id_event}_category_${id_category}_candidate_${c.id_candidate}.jpg`;
        return { name: c.name, photoUrl: `${baseForPhotos}/${filename}` };
      });
      candidateGroups.push(group);
    }

    const [bgImgRaw, framesRaw0] = await Promise.all([
      loadImageWithRetry(backgroundUrl),
      loadImageWithRetry(framesUrl),
    ]);

    const framesRaw = (framesRaw0.width !== CANVAS_W || framesRaw0.height !== CANVAS_H)
      ? framesRaw0.resize(CANVAS_W, CANVAS_H)
      : framesRaw0;

    const bannerUrls: string[] = [];
    
    console.log(`Processing ${candidateGroups.length} banner(s) with total ${candidates.length} candidates`);
    
    for (let groupIndex = 0; groupIndex < candidateGroups.length; groupIndex++) {
      const cands = candidateGroups[groupIndex];
      const bannerNumber = groupIndex + 1;
      const outputPath = `event_${id_event}_category_${id_category}_banner_${bannerNumber}.png`;

      console.log(`Starting banner ${bannerNumber} with ${cands.length} candidates`);

      // Load base images
      console.log('Loading background and frames...');
      const [bgImgRaw, framesRaw0] = await Promise.all([
        loadImage(backgroundUrl),
        loadImage(framesUrl),
      ]);

      // Prepare canvas
      console.log('Preparing canvas...');
      const canvas = new Image(CANVAS_W, CANVAS_H);
      canvas.fill(0x00000000);

      // Background (cover) - resize background to canvas size
      const bg = cover(bgImgRaw, CANVAS_W, CANVAS_H);
      canvas.composite(bg, 0, 0);

      // Paste photos one by one (load and resize individually to save memory)
      console.log(`Loading and compositing ${cands.length} photos...`);
      for (let i = 0; i < cands.length; i++) {
        const slot = SLOTS[i];
        const { photoUrl } = cands[i];
        try {
          // Load and resize photo to reduce memory usage
          const photo = await loadAndResizePhoto(photoUrl);
          // Use cover function to maintain aspect ratio and avoid distortion
          const photoRaw = cover(photo, PHOTO_W, PHOTO_H);
          canvas.composite(photoRaw, slot.x, slot.y);
          console.log(`Composited photo ${i + 1}/${cands.length}`);
        } catch (error) {
          console.error(`Error processing photo ${i + 1}:`, error);
        }
      }

      const tintedFrames = recolorNonTransparent(framesRaw, frameColor);
      const framesOverlay = punchOutEmptyFrameSlots(tintedFrames, cands.length);
      canvas.composite(framesOverlay, 0, 0);

      // Name bars + centered texts (simplified for performance)
      console.log('Rendering candidate names...');
      for (let i = 0; i < cands.length; i++) {
        const slot = SLOTS[i];
        const globalCandidateNumber = (groupIndex * 9) + i + 1;
        const name = (globalCandidateNumber + " - " + cands[i].name).toUpperCase();

        try {
          // Bar spans photo width (with a small visual inset from the overlay)
          const barInsetX = 4; // Scaled down
          const barX = slot.x + barInsetX;
          const barY = slot.y + PHOTO_H - Math.floor(NAME_BAR_H * 0.9) + 10; // Adjusted
          const barW = PHOTO_W;
          const barH = NAME_BAR_H;

        // Padding interno para não colar nas bordas
        const sidePadding = 18;
        const verticalPadding = 8;
        const maxTextW = Math.max(10, barW - sidePadding * 2);
        const maxTextH = Math.max(10, barH - verticalPadding * 2);

        // Tamanho inicial baseado na altura útil da barra (com teto),
        // e mínimo que evita over-shrink em nomes enormes.
        const startSize = Math.min(20, Math.floor(maxTextH * 0.95));
        const minSize   = 10;

        const { img: nameImg } = await fitTextRender(
          name,               // texto
          maxTextW,           // largura máxima
          startSize,          // startSize dinâmico
          minSize,            // minSize
          '#5F19DD',          // cor
          true,               // bold
          1,                  // boldStrength
          maxTextH,           // **** altura máxima considerada ****
        );

        // HORIZONTAL CENTER: center text image inside the bar width
        const textX = barX + Math.floor((barW - nameImg.width) / 2);
        // Keep vertical alignment centered inside the yellow bar
        const textY = barY + Math.floor((barH - nameImg.height) / 2);
        canvas.composite(nameImg, textX, textY);
      }

      const categoryName = categoryData?.name || 'Categoria';
      const titleMaxW = CANVAS_W - 40;
      const titleMaxH = 110;   // área útil no topo
      const { img: titleImage } = await fitTextRender(
        categoryName,
        titleMaxW,
        96,     // start
        40,     // min
        '#fddf59',
        true,
        1,
        titleMaxH,
      );
      // Center the title horizontally
      const textX = Math.floor((CANVAS_W - titleImage.width) / 2);
      const textY = 5;
      canvas.composite(titleImage, textX, textY);


      // Encode PNG
      console.log('Encoding PNG...');
      const png = await canvas.encode();
      console.log(`PNG encoded, size: ${png.length} bytes`);

      // Upload to Storage
      const { error: upErr } = await retry(() =>
        supabase.storage.from(bucket).upload(
          outputPath,
          new Blob([new Uint8Array(png)], { type: "image/png" }),
          { upsert: true, contentType: "image/png" },
        ),
        { retries: 3, baseMs: 300 }
      );
      if (upErr) throw upErr;

      // Get public URL
      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(outputPath);
      bannerUrls.push(pub.publicUrl);
      console.log(`Banner ${bannerNumber} completed: ${pub.publicUrl}`);
    }

    return Response.json({
      banners: bannerUrls,
      totalBanners: candidateGroups.length,
      totalCandidates: candidates.length
    }, { headers: corsHeaders });
  } catch (err) {
    console.error(err);
    return Response.json({ error: String((err as any)?.message ?? err) }, { status: 500, headers: corsHeaders });
  }
});
