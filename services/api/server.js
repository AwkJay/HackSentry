import http from "http";
import app from "./app/app.js";

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`🚀 Server up & running on port ${PORT}`);
});

// CATCH UNHANDLED PROMISE REJECTIONS
process.on("unhandledRejection", (err) => {
  console.log("UNHANDLED REJECTION 🔥 Shutting down...");
  console.log(err.name, err.message);
  process.exit(1);
});
