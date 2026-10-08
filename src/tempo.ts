const OFFSET_MS = -3 * 60 * 60 * 1000;

const deslocado = (): Date => new Date(Date.now() + OFFSET_MS);

export function agoraIso(): string {
  return deslocado().toISOString().replace("Z", "-03:00");
}

export function hojeLocal(): string {
  return deslocado().toISOString().slice(0, 10);
}