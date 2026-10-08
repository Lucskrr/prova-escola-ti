import { Persistencia } from "./storage.js";
import { agoraIso, hojeLocal } from "./tempo.js";

export const PREFIXO = "B";
export const RAZAO_PREFERENCIAL = 3;
const TAMANHO_PAINEL = 5;

export type Tipo = "normal" | "preferencial";
type Status = "aguardando" | "chamada" | "concluida" | "cancelada";

export interface Senha {
  codigo: string;
  tipo: Tipo;
  emissao: string;
  status: Status;
  chamada_em?: string;
}

interface Estado {
  senhas: Senha[];
  painel: number[];
  sequencia: number;
  diaSequencia: string;
  prefsSeguidas: number;
}

export type Resultado =
  | { ok: true; senha: Senha }
  | { ok: false; http: 404 | 409; erro: string };

export const isTipo = (v: unknown): v is Tipo =>
  v === "normal" || v === "preferencial";

const NAO_ENCONTRADA: Resultado = { ok: false, http: 404, erro: "senha_nao_encontrada" };

export class Fila {
  private readonly e: Estado;

  constructor(private readonly db: Persistencia<Estado>) {
    this.e = db.carregar();
  }

  emitir(tipo: Tipo): Senha {
    const dia = hojeLocal();
    if (this.e.diaSequencia !== dia) {
      this.e.diaSequencia = dia;
      this.e.sequencia = 0;
    }
    this.e.sequencia += 1;
    const senha: Senha = {
      codigo: `${PREFIXO}${String(this.e.sequencia).padStart(3, "0")}`,
      tipo,
      emissao: agoraIso(),
      status: "aguardando",
    };
    this.e.senhas.push(senha);
    this.db.salvar(this.e);
    return senha;
  }

  chamarProxima(): Senha | null {
    const aguardando = (t: Tipo) =>
      this.e.senhas.findIndex((s) => s.status === "aguardando" && s.tipo === t);
    const idxPref = aguardando("preferencial");
    const idxNorm = aguardando("normal");
    if (idxPref === -1 && idxNorm === -1) return null;

    const vezDaNormal =
      idxPref === -1 || (idxNorm !== -1 && this.e.prefsSeguidas >= RAZAO_PREFERENCIAL);
    const idx = vezDaNormal ? idxNorm : idxPref;
    this.e.prefsSeguidas = vezDaNormal ? 0 : this.e.prefsSeguidas + 1;

    const senha = this.e.senhas[idx];
    senha.status = "chamada";
    senha.chamada_em = agoraIso();
    this.paraTopoDoPainel(idx);
    this.db.salvar(this.e);
    return senha;
  }

  concluir(codigo: string): Resultado {
    const idx = this.buscar(codigo);
    if (idx === -1) return NAO_ENCONTRADA;
    const senha = this.e.senhas[idx];
    if (senha.status !== "chamada") return { ok: false, http: 409, erro: "senha_nao_chamada" };
    senha.status = "concluida";
    this.db.salvar(this.e);
    return { ok: true, senha };
  }

  rechamar(codigo: string): Resultado {
    const idx = this.buscar(codigo);
    if (idx === -1) return NAO_ENCONTRADA;
    const senha = this.e.senhas[idx];
    if (senha.status !== "chamada") return { ok: false, http: 409, erro: "senha_nao_chamada" };
    senha.chamada_em = agoraIso();
    this.paraTopoDoPainel(idx);
    this.db.salvar(this.e);
    return { ok: true, senha };
  }

  cancelar(codigo: string): Resultado {
    const idx = this.buscar(codigo);
    if (idx === -1) return NAO_ENCONTRADA;
    const senha = this.e.senhas[idx];
    if (senha.status !== "aguardando") return { ok: false, http: 409, erro: "senha_nao_aguardando" };
    senha.status = "cancelada";
    this.db.salvar(this.e);
    return { ok: true, senha };
  }

  painel(): Senha[] {
    return this.e.painel.map((i) => this.e.senhas[i]);
  }

  private buscar(codigo: string): number {
    return this.e.senhas.findLastIndex((s) => s.codigo === codigo);
  }

  private paraTopoDoPainel(idx: number): void {
    this.e.painel = [idx, ...this.e.painel.filter((i) => i !== idx)].slice(0, TAMANHO_PAINEL);
  }
}

export function criarFila(): Fila {
  return new Fila(
    new Persistencia<Estado>(() => ({
      senhas: [],
      painel: [],
      sequencia: 0,
      diaSequencia: "",
      prefsSeguidas: 0,
    })),
  );
}