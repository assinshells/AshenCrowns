import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import logger from "./config/logger.js";
import { env } from "./config/env.js";
import authRoutes from "./routes/auth.routes.js";
import accountRoutes from "./routes/account.routes.js";
import characterRoutes from "./routes/character.routes.js";
import { csrfProtection } from "./middlewares/csrf.middleware.js";
import { notFoundHandler } from "./middlewares/notFound.middleware.js";
import { globalExceptionHandler } from "./middlewares/globalException.middleware.js";

if (!env.clientUrl) {
  logger.warn("CLIENT_URL is not set — CORS will block all browser requests");
}

const app = express();

app.disable("x-powered-by");
// За nginx нужен доверенный прокси, иначе rate-limit видит IP прокси, а не клиента.
if (env.trustProxy > 0) app.set("trust proxy", env.trustProxy);

app.use(helmet());
app.use(
  cors({
    origin: env.clientUrl || false,
    credentials: true,
  }),
);
app.use(compression());
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.status(200).json({ success: true, status: "ok" });
});

// API с cookie-сессиями: CSRF-защита для всех изменяющих запросов.
app.use("/api", csrfProtection);
app.use("/api/auth", authRoutes);
app.use("/api/account", accountRoutes);
app.use("/api/character", characterRoutes);

app.use(notFoundHandler);
app.use(globalExceptionHandler);

export default app;
