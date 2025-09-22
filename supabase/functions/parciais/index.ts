import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.2";

// ---------- ENV ----------
// Updated to trigger deployment
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
const DEFAULT_BUCKET = "candidates";

// ---------- CANVAS / LAYOUT ----------
const CANVAS_W = 768;
const CANVAS_H = 1365;

const PHOTO_W = 370;
const PHOTO_H = 470;
const NAME_BAR_H = 58;

// Slots (top-left of the photo area; frames PNG should align visually)
const SLOTS = [
  { x: 90,  y: 260 },
  { x: 460, y: 260 },
  { x: 90,  y: 650 },
  { x: 460, y: 650 },
  { x: 90,  y: 1040 },
  { x: 460, y: 1040 },
] as const;

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ---------- Helpers ----------
async function fetchArrayBuffer(url: string): Promise<ArrayBuffer> {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) {
    throw new Error(`Failed to fetch ${url} -> ${r.status} ${r.statusText}`);
  }
  return await r.arrayBuffer();
}

// Function to convert image to base64
async function imageToBase64(url: string): Promise<string> {
  const buffer = await fetchArrayBuffer(url);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
  return `data:image/jpeg;base64,${base64}`;
}

// Query candidate names if only IDs are provided
async function resolveCandidateNames(
  supabase: ReturnType<typeof createClient>,
  candidates: Array<{ id_candidate: number; name?: string; photoUrl: string }>
): Promise<Array<{ name: string; photoUrl: string }>> {
  const final: Array<{ name: string; photoUrl: string }> = [];

  const idsToFetch = candidates.map(c => c.id_candidate);
  for (const c of candidates) {
    // placeholder que mantém a ordem
    final.push({ name: "__PENDING__", photoUrl: c.photoUrl });
  }

  if (idsToFetch.length > 0) {
    const { data, error } = await supabase
      .from("candidates")
      .select("id_candidate,name")
      .in("id_candidate", idsToFetch);

    if (error) throw error;

    const map = new Map<number, string>(
      (data ?? []).map((r) => [r.id_candidate as number, (r.name ?? "").toString()])
    );

    // Replace placeholders in order
    let idxFetch = 0;
    for (let i = 0; i < candidates.length; i++) {
      if (final[i].name === "__PENDING__") {
        const id = candidates[i].id_candidate!;
        const nm = map.get(id) ?? `#${id}`;
        final[i].name = nm;
        idxFetch++;
      }
    }
  }

  return final;
}

// Create HTML canvas-based collage
async function createCollageHTML(
  backgroundUrl: string,
  framesUrl: string,
  frameColor: string,
  candidates: Array<{ name: string; photoUrl: string }>
): Promise<string> {
  const candidateImages = await Promise.all(
    candidates.map(async (c) => ({
      name: c.name,
      dataUrl: await imageToBase64(c.photoUrl)
    }))
  );

  const backgroundDataUrl = await imageToBase64(backgroundUrl);
  const framesDataUrl = await imageToBase64(framesUrl);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { margin: 0; padding: 0; }
        #canvas { border: none; }
      </style>
    </head>
    <body>
      <canvas id="canvas" width="${CANVAS_W}" height="${CANVAS_H}"></canvas>
      <script>
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        
        const slots = ${JSON.stringify(SLOTS)};
        const candidates = ${JSON.stringify(candidateImages)};
        
        async function createCollage() {
          // Load background
          const bg = new Image();
          bg.crossOrigin = 'anonymous';
          await new Promise(resolve => {
            bg.onload = resolve;
            bg.src = '${backgroundDataUrl}';
          });
          
          // Draw background (cover fit)
          const bgScale = Math.max(${CANVAS_W} / bg.width, ${CANVAS_H} / bg.height);
          const bgW = bg.width * bgScale;
          const bgH = bg.height * bgScale;
          const bgX = (${CANVAS_W} - bgW) / 2;
          const bgY = (${CANVAS_H} - bgH) / 2;
          ctx.drawImage(bg, bgX, bgY, bgW, bgH);
          
          // Draw candidate photos
          for (let i = 0; i < candidates.length && i < slots.length; i++) {
            const candidate = candidates[i];
            const slot = slots[i];
            
            const img = new Image();
            img.crossOrigin = 'anonymous';
            await new Promise(resolve => {
              img.onload = resolve;
              img.src = candidate.dataUrl;
            });
            
            // Cover fit photo
            const scale = Math.max(${PHOTO_W} / img.width, ${PHOTO_H} / img.height);
            const w = img.width * scale;
            const h = img.height * scale;
            const x = slot.x + (${PHOTO_W} - w) / 2;
            const y = slot.y + (${PHOTO_H} - h) / 2;
            
            ctx.save();
            ctx.beginPath();
            ctx.rect(slot.x, slot.y, ${PHOTO_W}, ${PHOTO_H});
            ctx.clip();
            ctx.drawImage(img, x, y, w, h);
            ctx.restore();
          }
          
          // Load and draw frames
          const frames = new Image();
          frames.crossOrigin = 'anonymous';
          await new Promise(resolve => {
            frames.onload = resolve;
            frames.src = '${framesDataUrl}';
          });
          ctx.drawImage(frames, 0, 0, ${CANVAS_W}, ${CANVAS_H});
          
          // Draw name bars and text
          for (let i = 0; i < candidates.length && i < slots.length; i++) {
            const candidate = candidates[i];
            const slot = slots[i];
            
            const barX = slot.x;
            const barY = slot.y + ${PHOTO_H} - Math.floor(${NAME_BAR_H} * 0.9);
            const barW = ${PHOTO_W};
            const barH = ${NAME_BAR_H};
            
            // Draw rounded rectangle
            ctx.fillStyle = '${frameColor}';
            ctx.beginPath();
            ctx.roundRect(barX, barY, barW, barH, 10);
            ctx.fill();
            
            // Draw text
            ctx.fillStyle = '#0d0d0d';
            ctx.font = 'bold 28px Montserrat, Arial, sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            
            const textX = barX + 18;
            const textY = barY + barH / 2;
            
            // Fit text
            let fontSize = 28;
            let text = candidate.name;
            ctx.font = \`bold \${fontSize}px Montserrat, Arial, sans-serif\`;
            
            while (ctx.measureText(text).width > barW - 36 && fontSize > 16) {
              fontSize -= 2;
              ctx.font = \`bold \${fontSize}px Montserrat, Arial, sans-serif\`;
            }
            
            ctx.fillText(text, textX, textY);
          }
          
          // Convert to blob and return
          return new Promise(resolve => {
            canvas.toBlob(resolve, 'image/png');
          });
        }
        
        createCollage().then(blob => {
          window.collageBlob = blob;
        });
      </script>
    </body>
    </html>
  `;

  return html;
}

// ---------- HTTP ----------
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response("Use POST", { 
        status: 405,
        headers: corsHeaders
      });
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
        { 
          status: 400,
          headers: corsHeaders
        },
      );
    }
    if (!Array.isArray(candidates) || candidates.length < 1 || candidates.length > 6) {
      return Response.json(
        { error: "Provide 1 to 6 candidate ids in 'candidates'." },
        { 
          status: 400,
          headers: corsHeaders
        },
      );
    }
    if (!id_event || !id_category) {
      return Response.json(
        { error: "Missing id_event or id_category" },
        { 
          status: 400,
          headers: corsHeaders
        },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    const baseForPhotos =
      (typeof photosBaseUrl === "string" && photosBaseUrl.trim().length > 0)
        ? photosBaseUrl.trim().replace(/\/+$/, "")
        : framesUrl.substring(0, framesUrl.lastIndexOf("/")); // diretório do framesUrl

    const candObjs = (candidates as number[]).map((id_number: number) => {
      const filename = `event_${id_event}_category_${id_category}_candidate_${id_number}.jpg`;
      return {
        id_candidate: id_number,
        photoUrl: `${baseForPhotos}/${filename}`,
      };
    });
    const cands = await resolveCandidateNames(supabase, candObjs);

    // For now, return a simplified response indicating the function works
    // In a full implementation, you'd use a headless browser or similar to render the HTML canvas
    return Response.json({
      ok: true,
      message: "Collage function is working. Canvas-based implementation requires additional setup.",
      width: CANVAS_W,
      height: CANVAS_H,
      bucket,
      path: outputPath,
      candidates: cands,
      debug: {
        backgroundUrl,
        framesUrl,
        frameColor,
        candidatesCount: cands.length
      }
    }, {
      headers: corsHeaders
    });

  } catch (err) {
    console.error("Error in parciais function:", err);
    return Response.json(
      { error: String(err?.message ?? err) }, 
      { 
        status: 500,
        headers: corsHeaders
      }
    );
  }
});