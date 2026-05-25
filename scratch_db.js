const url = "https://supabase45a.doobot.ai";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc3OTcwOTIyLCJleHAiOjIwOTM1NDY5MjJ9.9671S_02vtH0_-IUSpVKKkBVukijoeWzLxWZEYeLJTo";

async function run() {
  try {
    console.log("Fetching companies...");
    const res = await fetch(`${url}/rest/v1/companies?select=id,name`, {
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
    console.log("Companies found in DB:", data);
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
