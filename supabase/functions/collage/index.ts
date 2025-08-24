// supabase/functions/collage/index.ts
// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  Image,
  ImageFont,
} from "https://deno.land/x/imagescript@1.2.16/mod.ts";

// Helpers
const hexToRgba = (hex: string, a = 0xff) =>
  ((parseInt(hex.replace("#", ""), 16) << 8) | a) >>> 0;

type Item = {
  id: number | string;         // id_candidate
  name: string;                // display_name
  imageUrl: string;            // URL da foto
};

type Payload = {
  event_id: string | number;
  title?: string;              // ex.: "👑 Mini Miss Imperatriz 2025 (4 a 8 anos)"
  items: Item[];
  pageSize?: number;           // default: 9
  outW?: number;               // default: 1080
  outH?: number;               // default: 1080
  margin?: number;             // default: 24
  gap?: number;                // default: 16
  captionH?: number;           // altura da legenda por tile (default: 80)
  headerH?: number;            // altura do cabeçalho/título (default: 90 se title)
  bgColor?: string;            // default: #ffffff
  textColor?: string;          // default: #111111
  jpegQuality?: number;        // default: 85
  bucket?: string;             // default: "collages"
  pathPrefix?: string;         // default: "event_<event_id>"
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

// Fonte (bom suporte a acentos)
const FONT_URL =
  "https://fonts.gstatic.com/s/montserrat/v25/JTUQjIg1_i6t8kCHKm459WxZqh7l.woff2"; // baixa rápido
// Nota: ImageScript precisa de TTF/OTF. Convertida abaixo dinamicamente se necessário.
// Melhor opção: use uma .ttf sua e troque a URL.

async function loadFallbackFont(): Promise<ImageFont> {
  // Caso sua fonte esteja em .ttf: faça fetch direto do .ttf e carregue:
  // const fontBytes = await (await fetch('https://.../Montserrat-SemiBold.ttf')).arrayBuffer();
  // return await ImageFont.load(new Uint8Array(fontBytes));

  // Para simplificar, uso uma .ttf leve embutida (OpenSans-Semibold):
  const ttf =
    "https://raw.githubusercontent.com/google/fonts/main/apache/opensans/OpenSans-SemiBold.ttf";
  const buf = await (await fetch(ttf)).arrayBuffer();
  return await ImageFont.load(new Uint8Array(buf));
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function centerCropTo(photo: Image, w: number, h: number): Promise<Image> {
  // Redimensiona mantendo proporção e corta centro para caber em w×h
  const scale = Math.max(w / photo.width, h / photo.height);
  const newW = Math.ceil(photo.width * scale);
  const newH = Math.ceil(photo.height * scale);
  const resized = photo.resize(newW, newH);
  const x = Math.floor((newW - w) / 2);
  const y = Math.floor((newH - h) / 2);
  return resized.crop(x, y, w, h);
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Use POST", { status: 405 });
    }
    const body = (await req.json()) as Payload;

    const {
      event_id,
      items,
      title,
      pageSize = 9,
      outW = 1080,
      outH = 1080,
      margin = 24,
      gap = 16,
      captionH = 80,
      headerH = title ? 90 : 0,
      bgColor = "#ffffff",
      textColor = "#111111",
      jpegQuality = 85,
      bucket = "collages",
      pathPrefix = `event_${event_id}`,
    } = body;

    if (!event_id || !items?.length) {
      return new Response("Missing event_id or items", { status: 400 });
    }

    const font = await loadFallbackFont();
    const pages = chunk(items, pageSize);

    const cols = 3;
    const rows = 3;

    const bgRGBA = hexToRgba(bgColor);
    const textRGBA = hexToRgba(textColor);

    const results: { path: string; publicUrl?: string }[] = [];

    for (let p = 0; p < pages.length; p++) {
      const pageItems = pages[p];
      const canvas = new Image(outW, outH);
      canvas.fill(bgRGBA);

      // Título (opcional)
      if (headerH > 0 && title) {
        const titleImg = await Image.renderText(font, 42, title, textRGBA);
        const tx = Math.floor((outW - titleImg.width) / 2);
        const ty = Math.floor((headerH - titleImg.height) / 2);
        canvas.composite(titleImg, tx, ty);
      }

      // Área útil após o header
      const availableH = outH - headerH - margin * 2 - gap * (rows - 1);
      const availableW = outW - margin * 2 - gap * (cols - 1);

      const tileW = Math.floor(availableW / cols);
      const tileH = Math.floor(availableH / rows);
      const photoH = tileH - captionH;

      for (let i = 0; i < pageItems.length; i++) {
        const it = pageItems[i];
        const r = Math.floor(i / cols);
        const c = i % cols;

        const x = margin + c * (tileW + gap);
        const y = headerH + margin + r * (tileH + gap);

        // Carrega foto
        const resp = await fetch(it.imageUrl);
        const bytes = new Uint8Array(await resp.arrayBuffer());
        const img = await Image.decode(bytes);

        // Foto centralizada e cortada
        const photo = await centerCropTo(img, tileW, photoH);
        canvas.composite(photo, x, y);

        // Legenda: "<id> — <name>"
        const caption = `${String(it.id).padStart(2, "0")} — ${it.name}`;
        const textImg = await Image.renderText(font, 28, caption, textRGBA);
        const tx = x + Math.floor((tileW - textImg.width) / 2);
        const ty = y + photoH + Math.floor((captionH - textImg.height) / 2);
        canvas.composite(textImg, tx, ty);
      }

      const jpg = await canvas.encodeJPEG(jpegQuality);
      const path = `${pathPrefix}/collage_p${p + 1}.jpg`;

      // Salva no Storage (upsert)
      await supabase.storage.from(bucket).upload(path, jpg, {
        contentType: "image/jpeg",
        upsert: true,
      });

      // URL pública (se o bucket for público)
      const pub = supabase.storage.from(bucket).getPublicUrl(path);
      results.push({ path, publicUrl: pub.data.publicUrl });
    }

    return new Response(JSON.stringify({ ok: true, pages: results }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
