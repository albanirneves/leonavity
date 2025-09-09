import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = "https://waslpdqekbwxptwgpjze.supabase.co";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// Create admin client for generating reset links
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PasswordResetRequest {
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log('Password reset function called');

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: PasswordResetRequest = await req.json();
    console.log('Processing password reset for:', email);

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email é obrigatório" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if user exists first
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (userError) {
      console.error('Error checking user existence:', userError);
      return new Response(
        JSON.stringify({ error: "Erro interno do servidor" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userExists = userData.users.some(user => user.email === email);

    if (!userExists) {
      console.log('User not found, but returning success for security');
      // For security, we don't reveal if the email exists or not
      return new Response(
        JSON.stringify({ message: "Se o email existir, você receberá as instruções de recuperação" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate password reset link
    const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: 'https://leonavity.lovable.app/auth?type=recovery'
      }
    });

    if (resetError) {
      console.error('Error generating reset link:', resetError);
      return new Response(
        JSON.stringify({ error: "Erro ao gerar link de recuperação" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log('Reset link generated successfully');

    // Ensure redirect_to points to production domain regardless of project Site URL
    let actionLink = resetData.properties?.action_link as string | undefined;
    try {
      if (actionLink) {
        const url = new URL(actionLink);
        const params = new URLSearchParams(url.search);
        params.set('redirect_to', 'https://leonavity.lovable.app/auth?type=recovery');
        url.search = params.toString();
        actionLink = url.toString();
      }
    } catch (e) {
      console.warn('Failed to adjust redirect_to, using original action link', e);
    }

    // Send email with Resend
    const emailResponse = await resend.emails.send({
      from: "Leona Vity <noreply@zappet.com.br>",
      to: [email],
      subject: "Recuperação de Senha - Leona Vity Eventos",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Recuperação de Senha</h1>
            <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">Leona Vity Eventos</p>
          </div>
          
          <div style="padding: 30px 20px; background: #f8f9fa;">
            <h2 style="color: #333; margin-bottom: 20px;">Redefinir sua senha</h2>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 25px;">
              Você solicitou a redefinição de sua senha. Clique no botão abaixo para criar uma nova senha:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${actionLink ?? resetData.properties?.action_link}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        text-decoration: none; 
                        padding: 15px 30px; 
                        border-radius: 8px; 
                        display: inline-block; 
                        font-weight: bold;
                        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
                Redefinir Senha
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.5; margin-top: 25px;">
              Se você não solicitou esta redefinição, pode ignorar este email. Sua senha não será alterada.
            </p>
            
            <p style="color: #666; font-size: 14px; line-height: 1.5;">
              Este link expira em 1 hora por motivos de segurança.
            </p>
          </div>
          
          <div style="background: #e9ecef; padding: 20px; text-align: center; font-size: 12px; color: #666;">
            <p style="margin: 0;">© 2025 Leona Vity Eventos - Sistema de Gerenciamento</p>
          </div>
        </div>
      `,
    });

    console.log("Password reset email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        message: "Se o email existir, você receberá as instruções de recuperação",
        success: true 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in send-password-reset function:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);