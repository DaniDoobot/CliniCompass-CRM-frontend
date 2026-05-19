import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Server config error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller identity using the JWT from the Authorization header
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await adminClient.auth.getUser(token);
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check caller roles
    const { data: callerRoles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);

    const callerRolesList = callerRoles?.map((r: any) => r.role) || [];
    const isSuperAdmin = callerRolesList.includes("super_admin");
    const isCompanyAdmin = callerRolesList.includes("company_admin");
    const isGerencia = callerRolesList.includes("gerencia");

    if (!isSuperAdmin && !isCompanyAdmin && !isGerencia) {
      return new Response(JSON.stringify({ error: "Solo gerencia o administradores pueden crear usuarios" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch caller profile for company boundaries
    const { data: callerProfile } = await adminClient
      .from("staff_profiles")
      .select("company_id")
      .eq("user_id", caller.id)
      .single();
    const callerCompanyId = callerProfile?.company_id;

    const body = await req.json();
    const { email, password, first_name, last_name, roles, center_id, specialty, company_id, permissions } = body;

    if (!email || !password || !first_name || !last_name) {
      return new Response(JSON.stringify({ error: "Faltan campos obligatorios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate role permissions
    if (roles?.includes("super_admin") && !isSuperAdmin) {
      return new Response(JSON.stringify({ error: "Solo un Gestor Total (super_admin) puede crear otro Gestor Total" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine target company_id
    let targetCompanyId = "00000000-0000-0000-0000-000000000000"; // default CliniCompass
    if (isSuperAdmin) {
      targetCompanyId = company_id || callerCompanyId || targetCompanyId;
    } else {
      targetCompanyId = callerCompanyId || targetCompanyId;
    }

    // Create user via admin API
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name, last_name },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update staff profile with name, company, center and specialty
    await adminClient
      .from("staff_profiles")
      .update({
        first_name,
        last_name,
        company_id: targetCompanyId,
        ...(center_id ? { center_id } : {}),
        ...(specialty ? { specialty } : {}),
      })
      .eq("user_id", newUser.user!.id);

    // Assign roles
    if (roles && roles.length > 0) {
      const roleInserts = roles.map((role: string) => ({
        user_id: newUser.user!.id,
        role,
      }));
      await adminClient.from("user_roles").insert(roleInserts);
    }

    // Assign granular permissions
    if (permissions && permissions.length > 0) {
      const permissionInserts = permissions.map((p: any) => ({
        user_id: newUser.user!.id,
        module_name: p.module_name,
        can_read: !!p.can_read,
        can_write: !!p.can_write,
      }));
      await adminClient.from("user_permissions" as any).insert(permissionInserts);
    }

    return new Response(JSON.stringify({ user: newUser.user }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
