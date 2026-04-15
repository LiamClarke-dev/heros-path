import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { pinoHttp } from "pino-http";
import logger from "./logger.js";
import apiRoutes from "./routes/index.js";

const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        origin.includes(".replit.dev") ||
        origin.includes(".repl.co") ||
        origin.includes(".replit.app") ||
        origin.includes("localhost")
      ) {
        return callback(null, true);
      }
      callback(null, true);
    },
    credentials: true,
  })
);

app.use(pinoHttp({ logger }));
app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api", apiRoutes);

app.get("/favicon.ico", (_req, res) => res.status(204).end());

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

export default app;
