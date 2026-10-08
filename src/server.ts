import { criarApp } from "./app.js";

const PORT = Number(process.env.PORT ?? 8080);
const server = criarApp().listen(PORT, "0.0.0.0", () => {
  console.log(`API ouvindo em 0.0.0.0:${PORT}`);
});

// O node como PID 1 não encerra sozinho com SIGTERM.
// Sem isso, o "docker stop" demora 10s e mata com SIGKILL.
for (const sinal of ["SIGTERM", "SIGINT"] as const) {
  process.on(sinal, () => server.close(() => process.exit(0)));
}