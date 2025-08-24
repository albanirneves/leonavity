import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

/** Utils */
const hexToRgba = (hex: string, a = 0xff) =>
  ((parseInt(hex.replace("#", ""), 16) << 8) | a) >>> 0;

// Bucket used for photos and also for optional font asset
const FONT_BUCKET = "candidates";

type Candidate = {
  id_candidate: number;
  name: string;
};

type Payload = {
  event_id: number | string;
  category_id: number | string;
  /** Optional: pass candidates manually. If omitted, we select from DB table `candidates`. */
  candidates?: Candidate[];
  pageSize?: number;   // default 9
  outW?: number;       // default 1080
  outH?: number;       // default 1080
  margin?: number;     // default 24
  gap?: number;        // default 16
  captionH?: number;   // default 80
  headerH?: number;    // default 90 if title
  bgColor?: string;    // default #ffffff
  textColor?: string;  // default #111111
  jpegQuality?: number;// default 85
};

function getClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key);
}

/** Public TTF font loader with fallback + in-memory cache (returns raw bytes) */
let FONT_CACHE: Uint8Array | null = null;
async function loadFont(): Promise<Uint8Array> {
  if (FONT_CACHE) return FONT_CACHE;

  // 1) Try local bundled font first (most reliable)
  try {
    const localUrl = new URL("./OpenSans-SemiBold.ttf", import.meta.url);
    const bytes = await Deno.readFile(localUrl);
    FONT_CACHE = bytes;
    return bytes;
  } catch (_) {
    // continue to try Supabase Storage, then remote fallbacks
  }

  // 1b) Try Supabase Storage asset (upload once and reuse)
  try {
    const supabase = getClient();
    const dl = await supabase.storage.from(FONT_BUCKET).download("assets/OpenSans-SemiBold.ttf");
    if (dl.data) {
      const bytes = new Uint8Array(await dl.data.arrayBuffer());
      FONT_CACHE = bytes;
      console.log("[collage] loaded font from Supabase Storage assets/OpenSans-SemiBold.ttf");
      return bytes;
    }
  } catch (_) {
    // ignore and continue
  }

  // 2) Remote fallbacks via reliable CDNs
  const FONT_URLS = [
    // Nunito 600 via fontsource (unpkg)
    "https://unpkg.com/@fontsource/nunito/files/nunito-latin-600-normal.ttf",
    // Open Sans 600 via fontsource (unpkg)
    "https://unpkg.com/@fontsource/open-sans/files/open-sans-latin-600-normal.ttf",
    // DejaVu via jsdelivr
    "https://cdn.jsdelivr.net/gh/dejavu-fonts/dejavu-fonts/ttf/DejaVuSans.ttf",
    // jsDelivr GitHub mirror of Google Fonts
    "https://cdn.jsdelivr.net/gh/google/fonts@main/apache/opensans/OpenSans-SemiBold.ttf",
    // Fallbacks (GitHub raw)
    "https://raw.githubusercontent.com/dejavu-fonts/dejavu-fonts/master/ttf/DejaVuSans.ttf",
    "https://raw.githubusercontent.com/google/fonts/main/apache/opensans/OpenSans-SemiBold.ttf",
    "https://raw.githubusercontent.com/google/fonts/main/ofl/nunito/static/Nunito-SemiBold.ttf",
  ];

  const TIMEOUT_MS = 15000; // allow more time for cold-start/network egress
  const fetchWithTimeout = (url: string) =>
    new Promise<Uint8Array>(async (resolve, reject) => {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
      try {
        const res = await fetch(url, { redirect: "follow", signal: ctrl.signal });
        if (!res.ok) {
          clearTimeout(timer);
          return reject(new Error(`HTTP ${res.status}`));
        }
        const bytes = new Uint8Array(await res.arrayBuffer());
        clearTimeout(timer);
        console.log(`[collage] loaded font from: ${url}`);
        resolve(bytes);
      } catch (e) {
        clearTimeout(timer);
        console.warn(`[collage] font fetch failed: ${url}`, e);
        reject(e);
      }
    });

  try {
    const bytes = await Promise.any(FONT_URLS.map(fetchWithTimeout));
    FONT_CACHE = bytes;
    return bytes;
  } catch {
    throw new Error("invalid font: none of the public TTFs could be loaded");
  }
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function centerCropToSquare(photo: Image, size: number): Promise<Image> {
  const minDim = Math.min(photo.width, photo.height);
  const x = Math.floor((photo.width - minDim) / 2);
  const y = Math.floor((photo.height - minDim) / 2);
  const square = photo.crop(x, y, minDim, minDim);
  return square.resize(size, size);
}

async function placeholder(w: number, h: number, text: string, font: Uint8Array, color: number) {
  const img = new Image(w, h);
  img.fill(hexToRgba("#eaeaea"));
  const t = await Image.renderText(font, 24, text, color);
  img.composite(t, Math.floor((w - t.width) / 2), Math.floor((h - t.height) / 2));
  return img;
}

// CORS headers for web invocation
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") return new Response("Use POST", { status: 405, headers: corsHeaders });

    const body = (await req.json()) as Payload;
    const {
      event_id,
      category_id,
      candidates: inputCandidates,
      pageSize = 9,
      outW = 1080,
      outH = 1080,
      margin = 24,
      gap = 16,
      captionH = 80,
      bgColor = "#ffffff",
      textColor = "#111111",
      jpegQuality = 85,
    } = body;

    if (!event_id || !category_id) {
      return new Response("Missing event_id or category_id", { status: 400, headers: corsHeaders });
    }

    // bucket & naming
    const bucket = "candidates";
    const prefix = `event_${event_id}_category_${category_id}`;

    // init client (evita crash no boot se env faltar)
    const supabase = getClient();

    // Fetch title from categories.name using composite key (event_id + category_id)
    const { data: cat, error: catErr } = await supabase
      .from("categories")
      .select("name")
      .eq("id_event", event_id)
      .eq("id_category", category_id)
      .maybeSingle();
    if (catErr) throw catErr;
    const title = cat?.name ?? "";
    const headerH = title ? 90 : 0;

    // get candidates (name + id_candidate)
    let candidates: Candidate[] = inputCandidates ?? [];
    if (!candidates.length) {
      const { data, error } = await supabase
        .from("candidates")
        .select("id_candidate,name")
        .eq("id_event", event_id)
        .eq("id_category", category_id)
        .order("id_candidate", { ascending: true });

      if (error) throw error;
      candidates = (data ?? []) as Candidate[];
    }
    if (!candidates.length) {
      return new Response("No candidates found", { status: 404, headers: corsHeaders });
    }

    const font = await loadFont();
    const pages = chunk(candidates, pageSize);
    const cols = 3;
    const rows = 3;

    const bgRGBA = hexToRgba(bgColor);
    const textRGBA = hexToRgba(textColor);

    const outputs: { path: string; publicUrl?: string }[] = [];

    for (let p = 0; p < pages.length; p++) {
      const page = pages[p];
      const canvas = new Image(outW, outH);
      canvas.fill(bgRGBA);

      // header
      if (headerH > 0) {
        const titleImg = await Image.renderText(font, 42, title, textRGBA);
        const tx = Math.floor((outW - titleImg.width) / 2);
        const ty = Math.floor((headerH - titleImg.height) / 2);
        canvas.composite(titleImg, tx, ty);
      }

      // grid metrics - force square photos
      const availableH = outH - headerH - margin * 2 - gap * (rows - 1);
      const availableW = outW - margin * 2 - gap * (cols - 1);
      const tileW = Math.floor(availableW / cols);
      const tileH = Math.floor(availableH / rows);
      const photoSize = Math.min(tileW, tileH - captionH);

      for (let i = 0; i < page.length; i++) {
        const cand = page[i];
        const r = Math.floor(i / cols);
        const c = i % cols;
        const x = margin + c * (tileW + gap);
        const y = headerH + margin + r * (tileH + gap);

        // storage path of candidate photo
        const candidatePath = `${prefix}_candidate_${cand.id_candidate}.jpg`;

        // download from Storage
        let img: Image | null = null;
        const dl = await supabase.storage.from(bucket).download(candidatePath);
        if (dl.data) {
          const bytes = new Uint8Array(await dl.data.arrayBuffer());
          try { img = await Image.decode(bytes); } catch { img = null; }
        }

        let photo: Image;
        if (img) {
          photo = await centerCropToSquare(img, photoSize);
        } else {
          photo = await placeholder(photoSize, photoSize, "Sem foto", font, textRGBA);
        }
        const photoX = x + Math.floor((tileW - photoSize) / 2);
        canvas.composite(photo, photoX, y);

        // caption: "ID — Name"
        const caption = `${String(cand.id_candidate).padStart(2, "0")} — ${cand.name ?? ""}`;
        const textImg = await Image.renderText(font, 28, caption, textRGBA);
        const tx = x + Math.floor((tileW - textImg.width) / 2);
        const ty = y + photoSize + Math.floor((captionH - textImg.height) / 2);
        canvas.composite(textImg, tx, ty);
      }

      const jpg = await canvas.encodeJPEG(jpegQuality);
      const outPath = `${prefix}_banner_${p + 1}.jpg`; // overwrite on upsert

      // save to same bucket with upsert
      await supabase.storage.from(bucket).upload(outPath, jpg, {
        contentType: "image/jpeg",
        upsert: true,
      });

      const pub = supabase.storage.from(bucket).getPublicUrl(outPath);
      outputs.push({ path: outPath, publicUrl: pub.data.publicUrl });
    }

    return new Response(JSON.stringify({ ok: true, title, pages: outputs }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
