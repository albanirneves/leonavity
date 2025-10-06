import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log('Starting file rename process...');

    // List all files in candidates bucket
    const { data: files, error: listError } = await supabaseAdmin
      .storage
      .from('candidates')
      .list('', {
        limit: 1000,
        sortBy: { column: 'name', order: 'asc' }
      });

    if (listError) {
      console.error('Error listing files:', listError);
      return Response.json(
        { error: `Error listing files: ${listError.message}` },
        { status: 500, headers: corsHeaders }
      );
    }

    if (!files || files.length === 0) {
      return Response.json(
        { message: 'No files found in bucket' },
        { headers: corsHeaders }
      );
    }

    console.log(`Found ${files.length} files`);

    const renamed: string[] = [];
    const errors: string[] = [];

    // Process each file
    for (const file of files) {
      const oldName = file.name;
      let newName = oldName;

      // Check if file needs renaming
      if (oldName.includes('event_4')) {
        newName = oldName.replace(/event_4/g, 'event_1');
      } else if (oldName.includes('event_5')) {
        newName = oldName.replace(/event_5/g, 'event_2');
      }

      // Skip if name doesn't change
      if (oldName === newName) {
        continue;
      }

      console.log(`Renaming: ${oldName} -> ${newName}`);

      try {
        // Move file (copy to new name, then delete old)
        const { error: moveError } = await supabaseAdmin
          .storage
          .from('candidates')
          .move(oldName, newName);

        if (moveError) {
          console.error(`Error moving ${oldName}:`, moveError);
          errors.push(`${oldName}: ${moveError.message}`);
        } else {
          renamed.push(`${oldName} -> ${newName}`);
        }
      } catch (err) {
        console.error(`Exception moving ${oldName}:`, err);
        errors.push(`${oldName}: ${err.message}`);
      }
    }

    return Response.json({
      success: true,
      renamed: renamed.length,
      files: renamed,
      errors: errors.length > 0 ? errors : undefined
    }, { headers: corsHeaders });

  } catch (err) {
    console.error('Exception:', err);
    return Response.json(
      { error: String(err?.message ?? err) },
      { status: 500, headers: corsHeaders }
    );
  }
});