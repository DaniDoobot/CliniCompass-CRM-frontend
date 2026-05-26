const token = "EAAHZCWCjz1FwBPvwsX2wtcBAM7q5aDUSpEOgbTtRy6yDnrkFPJAyzvwcWlMwlGuyG1loDnl0u9sHEYinZArCnF1qLUlnC1c63CVa6kBJvdRjwZCWHWpIKZAk8X9LZAPJgJowctT4TatIgbOkPjCnosFlruvytQh3u5JG2K1xPoMQFWdFpiRZAXsZBdjOx7DkwZDZD";
const phoneId = "321568811036009";

async function run() {
  try {
    console.log("Querying phone ID with fields...");
    const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}?fields=whatsapp_business_account_id,name,verified_name&access_token=${token}`);
    const data = await res.json();
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
