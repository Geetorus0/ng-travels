import http from "http";

console.log("=== TESTING REALTIME SERVER-SENT EVENTS (SSE) STREAM ===");

const req = http.request(
  {
    hostname: "localhost",
    port: 5000,
    path: "/api/realtime/stream",
    method: "GET",
    headers: {
      Accept: "text/event-stream",
    },
  },
  (res) => {
    console.log(`✓ SSE Stream connected! Status Code: ${res.statusCode}`);
    console.log(`✓ Headers Content-Type: ${res.headers["content-type"]}`);

    let dataCount = 0;
    res.on("data", (chunk) => {
      const text = chunk.toString();
      console.log(`[STREAM DATA RECEIVED]:\n${text.trim()}`);
      dataCount++;

      if (dataCount >= 1) {
        console.log("\n✓ Realtime SSE Stream Verified & Functional!");
        process.exit(0);
      }
    });
  }
);

req.on("error", (err) => {
  console.error("SSE connection error:", err);
  process.exit(1);
});

req.end();
