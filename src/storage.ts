import fs from "node:fs";
import path from "node:path";

const DATA_DIR = process.env.DATA_DIR ?? "/data";
const ARQUIVO = path.join(DATA_DIR, "estado.json");

function podeGravar(): boolean {
  try {
    fs.accessSync(DATA_DIR, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

export class Persistencia<T> {
  private readonly ativa = podeGravar();

  constructor(private readonly inicial: () => T) {}

  carregar(): T {
    if (!this.ativa || !fs.existsSync(ARQUIVO)) return this.inicial();
    try {
      return JSON.parse(fs.readFileSync(ARQUIVO, "utf8")) as T;
    } catch (err) {
      console.error("estado.json ilegivel, iniciando vazio:", err);
      return this.inicial();
    }
  }

  salvar(estado: T): void {
    if (!this.ativa) return;
    const tmp = `${ARQUIVO}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(estado));
    fs.renameSync(tmp, ARQUIVO);
  }
}