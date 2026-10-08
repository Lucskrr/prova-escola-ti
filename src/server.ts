import express from "express";

const app = express();
app.disable("x-powered-by");
app.use(express.json());

app.get("/healthz", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

const PORT = Number(process.env.PORT ?? 8080);
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`API ouvindo em 0.0.0.0:${PORT}`);
});

// O node como PID 1 não encerra sozinho com SIGTERM.
// Sem isso, o "docker stop" demora 10s e mata com SIGKILL.
for (const sinal of ["SIGTERM", "SIGINT"] as const) {
  process.on(sinal, () => server.close(() => process.exit(0)));
}