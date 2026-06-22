import "dotenv/config";
import express from "express";
import cors from "cors";
import chatRouter from "./routes/chat";
import { notFoundHandler, globalErrorHandler } from "./middleware/errorHandler";

const app = express();
const PORT = process.env.PORT ?? 3001;

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:3000",
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      // allow non-browser requests (curl, Postman, Render health checks)
      if (!origin) return callback(null, true);
      if (allowedOrigins.some((o) => origin.startsWith(o))) {
        return callback(null, true);
      }
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(express.json({ limit: "10kb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/chat", chatRouter);

app.use(notFoundHandler);
app.use(globalErrorHandler);

app.listen(PORT, () => {
  console.log(`Spur backend running on http://localhost:${PORT}`);
});
