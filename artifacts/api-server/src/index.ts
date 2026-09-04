import app from "./app.js";
import { logger } from "./lib/logger.js";

const rawPort = process.env["PORT"] || "5000";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = app.listen(port, () => {
  logger.info({ port }, "Server listening");
});

server.on("error", (err: any) => {
  if (err.code === "EADDRINUSE") {
    logger.error({ port, err }, `Port ${port} is already in use. Waiting briefly or terminating lingering process will resolve this.`);
  } else {
    logger.error({ err }, "Error listening on port");
  }
  process.exit(1);
});

const shutdown = () => {
  server.close(() => {
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
