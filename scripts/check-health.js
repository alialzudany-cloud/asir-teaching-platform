const http = require("http");

const port = Number(process.env.PORT || 8020);
const url = process.env.HEALTH_URL || `http://127.0.0.1:${port}/api/health`;

http.get(url, (res) => {
  let body = "";
  res.on("data", (chunk) => { body += chunk; });
  res.on("end", () => {
    console.log(body);
    process.exit(res.statusCode >= 200 && res.statusCode < 300 ? 0 : 1);
  });
}).on("error", (error) => {
  console.error(error.message);
  process.exit(1);
});
