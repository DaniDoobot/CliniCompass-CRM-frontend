const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://supabase45a.doobot.ai";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc3OTcwOTIyLCJleHAiOjIwOTM1NDY5MjJ9.9671S_02vtH0_-IUSpVKKkBVukijoeWzLxWZEYeLJTo";

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Checking lookers table...");
  const { data: lookers, error: lookersErr } = await supabase.from("lookers").select("*");
  if (lookersErr) {
    console.error("Error fetching lookers:", lookersErr);
  } else {
    console.log("Lookers:", JSON.stringify(lookers, null, 2));
  }

  console.log("\nChecking user_looker_permissions table...");
  const { data: perms, error: permsErr } = await supabase.from("user_looker_permissions").select("*");
  if (permsErr) {
    console.error("Error fetching user_looker_permissions:", permsErr);
  } else {
    console.log("User Looker Permissions:", JSON.stringify(perms, null, 2));
  }
}

main();
