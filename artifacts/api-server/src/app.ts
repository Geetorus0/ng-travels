import express from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";

const app: any = express();

// This API serves dynamic, frequently-polled JSON — disable Express's default
// weak ETag generation so responses aren't treated as cacheable and clients
// don't get 304s for data that's meant to be re-fetched every time.
app.set("etag", false);

const httpLogger = typeof pinoHttp === "function" ? pinoHttp : (pinoHttp as any).default || pinoHttp;

app.use(
  httpLogger({
    logger,
    serializers: {
      req(req: any) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res: any) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);
app.use(router);

export default app;
