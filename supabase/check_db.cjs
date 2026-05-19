const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://supabase45a.doobot.ai";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc3OTcwOTIyLCJleHAiOjIwOTM1NDY5MjJ9.9671S_02vtH0_-IUSpVKKkBVukijoeWzLxWZEYeLJTo";

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Fetching companies...");
  const { data: companies, error: compErr } = await supabase.from("companies").select("*");
  if (compErr) {
    console.error("Error fetching companies:", compErr);
  } else {
    console.log("Companies:", JSON.stringify(companies, null, 2));
  }

  console.log("\nFetching staff profiles...");
  const { data: staff, error: staffErr } = await supabase.from("staff_profiles").select("*");
  if (staffErr) {
    console.error("Error fetching staff profiles:", staffErr);
  } else {
    console.log("Staff Profiles:", JSON.stringify(staff, null, 2));
  }
}

main();
