import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Image, ImageFont } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

/** Utils */
const hexToRgba = (hex: string, a = 0xff) =>
  ((parseInt(hex.replace("#", ""), 16) << 8) | a) >>> 0;

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

/** Font loader */
async function loadFont(): Promise<ImageFont> {
  const url =
    "https://raw.githubusercontent.com/google/fonts/main/apache/opensans/OpenSans-SemiBold.ttf";
  const buf = await (await fetch(url)).arrayBuffer();
  return await ImageFont.load(new Uint8Array(buf));
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function centerCropTo(photo: Image, w: number, h: number): Promise<Image> {
  const scale = Math.max(w / photo.width, h / photo.height);
  const newW = Math.ceil(photo.width * scale);
  const newH = Math.ceil(photo.height * scale);
  const resized = photo.resize(newW, newH);
  const x = Math.floor((newW - w) / 2);
  const y = Math.floor((newH - h) / 2);
  return resized.crop(x, y, w, h);
}

async function placeholder(w: number, h: number, text: string, font: ImageFont, color: number) {
  const img = new Image(w, h);
  img.fill(hexToRgba("#eaeaea"));
  const t = await Image.renderText(font, 24, text, color);
  img.composite(t, Math.floor((w - t.width) / 2), Math.floor((h - t.height) / 2));
  return img;
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response("Use POST", { status: 405 });

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
    } = body;;

    if (!event_id || !category_id) {
      return new Response("Missing event_id or category_id", { status: 400 });
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
      return new Response("No candidates found", { status: 404 });
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

      // grid metrics
      const availableH = outH - headerH - margin * 2 - gap * (rows - 1);
      const availableW = outW - margin * 2 - gap * (cols - 1);
      const tileW = Math.floor(availableW / cols);
      const tileH = Math.floor(availableH / rows);
      const photoH = tileH - captionH;

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
          photo = await centerCropTo(img, tileW, photoH);
        } else {
          photo = await placeholder(tileW, photoH, "Sem foto", font, textRGBA);
        }
        canvas.composite(photo, x, y);

        // caption: "ID — Name"
        const caption = `${String(cand.id_candidate).padStart(2, "0")} — ${cand.name ?? ""}`;
        const textImg = await Image.renderText(font, 28, caption, textRGBA);
        const tx = x + Math.floor((tileW - textImg.width) / 2);
        const ty = y + photoH + Math.floor((captionH - textImg.height) / 2);
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
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
