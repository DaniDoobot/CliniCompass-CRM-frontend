import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    
    // Podemos usar el header de Authorization que envíe el cliente (sea JWT de usuario o Service Role Key del bot)
    // Si no viene Authorization, intentamos usar ANON_KEY para que Supabase maneje RLS, o puedes configurar
    // que use SERVICE_ROLE_KEY si quieres que el bot tenga acceso total sin RLS.
    const authHeader = req.headers.get("Authorization");
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY");
    
    const supabase = createClient(supabaseUrl!, supabaseKey!, {
      global: { headers: authHeader ? { Authorization: authHeader } : {} }
    });

    const { url, method } = req;
    const { searchParams } = new URL(url);

    if (method === "GET") {
      // MIRAR CITAS
      let query = supabase
        .from("appointments")
        .select(`
          *,
          patient:patients(first_name, last_name, phone, email),
          service:services(name, business_line),
          professional:staff_profiles(first_name, last_name),
          center:centers(name)
        `)
        .order("start_time", { ascending: true });
      
      const professional_id = searchParams.get("professional_id");
      const service_id = searchParams.get("service_id");
      const center_id = searchParams.get("center_id"); // calendario
      const date_from = searchParams.get("date_from");
      const date_to = searchParams.get("date_to");
      const patient_id = searchParams.get("patient_id");
      const status = searchParams.get("status");

      if (professional_id) query = query.eq("professional_id", professional_id);
      if (service_id) query = query.eq("service_id", service_id);
      if (center_id) query = query.eq("center_id", center_id);
      if (patient_id) query = query.eq("patient_id", patient_id);
      if (status) query = query.eq("status", status);
      if (date_from) query = query.gte("start_time", date_from);
      if (date_to) query = query.lte("start_time", date_to);

      const { data, error } = await query;
      if (error) throw error;
      
      return new Response(JSON.stringify({ success: true, data }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    if (method === "POST") {
      // AGENDAR CITA
      const body = await req.json();
      const { 
        center_id, 
        patient_id, 
        start_time, 
        end_time, 
        professional_id, 
        service_id, 
        notes,
        contact_id
      } = body;
      
      if (!center_id || !patient_id || !start_time || !end_time) {
        throw new Error("Faltan campos obligatorios: center_id, patient_id, start_time, end_time");
      }

      const { data, error } = await supabase.from("appointments").insert({
        center_id,
        patient_id,
        contact_id: contact_id || null,
        start_time,
        end_time,
        professional_id: professional_id || null,
        service_id: service_id || null,
        notes: notes || null,
        status: "programada"
      }).select().single();

      if (error) throw error;
      
      return new Response(JSON.stringify({ success: true, data }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    if (method === "PATCH") {
      // CANCELAR / ACTUALIZAR CITA
      const body = await req.json();
      const { id, status, notes, start_time, end_time } = body;
      
      if (!id) throw new Error("Se requiere el 'id' de la cita a modificar.");
      
      const updates: any = {};
      if (status) updates.status = status;
      if (notes) updates.notes = notes;
      if (start_time) updates.start_time = start_time;
      if (end_time) updates.end_time = end_time;
      
      const { data, error } = await supabase
        .from("appointments")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      
      return new Response(JSON.stringify({ success: true, data }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    if (method === "DELETE") {
      // BORRAR CITA
      const body = await req.json();
      const { id } = body;
      
      if (!id) throw new Error("Se requiere el 'id' de la cita a eliminar.");
      
      const { data, error } = await supabase
        .from("appointments")
        .delete()
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      
      return new Response(JSON.stringify({ success: true, data }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    throw new Error(`Método no soportado: ${method}`);

  } catch (e: any) {
    console.error("appointments-api error:", e.message);
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
