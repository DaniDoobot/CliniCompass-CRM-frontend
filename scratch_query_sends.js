const url = "https://supabase45a.doobot.ai";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc3OTcwOTIyLCJleHAiOjIwOTM1NDY5MjJ9.9671S_02vtH0_-IUSpVKKkBVukijoeWzLxWZEYeLJTo";

async function run() {
  try {
    console.log("Fetching last 10 sends...");
    const res = await fetch(`${url}/rest/v1/whatsapp_sends?select=*&order=created_at.desc&limit=10`, {
      headers: {
        "apikey": key,
        "Authorization": `Bearer ${key}`
      }
    });

    if (!res.ok) {
      console.error("Error:", res.status, await res.text());
      return;
    }

    const data = await res.json();
    console.log("Last 10 sends in DB:");
    data.forEach(s => {
      console.log(`ID: ${s.id} | Phone: ${s.phone} | Status: ${s.status} | Template: ${s.template_name} | Type: ${s.send_type} | Error: ${s.error_message} | Created: ${s.created_at}`);
    });
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
