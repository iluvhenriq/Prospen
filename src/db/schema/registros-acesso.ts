import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// Registros de acesso à aplicação (Marco Civil da Internet, Lei 12.965/2014,
// art. 15): data, hora e endereço IP de cada entrada na conta, guardados por
// 6 meses em sigilo e apagados depois. Decisão de 23/10/2026.
//
// O usuário fica como texto, SEM chave estrangeira: o registro precisa
// sobreviver à exclusão da conta pelo prazo legal (LGPD, art. 16, I).
// Não pertence a uma empresa (exceção declarada em tests/arquitetura.test.ts).
// Todo acesso passa por src/modules/contas/registros-acesso.ts.
export const registrosAcesso = pgTable(
  "registros_acesso",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    usuarioId: text("usuario_id").notNull(),
    // Nulo quando o servidor não sabe o endereço (sem proxy na frente).
    ip: text("ip"),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (tabela) => [
    index("registros_acesso_criado_idx").on(tabela.criadoEm),
    index("registros_acesso_usuario_idx").on(tabela.usuarioId, tabela.criadoEm),
  ],
);
