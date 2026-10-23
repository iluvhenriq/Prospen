import { randomBytes } from "node:crypto";

// Gera um segredo aleatório e seguro para o login (AUTH_SECRET).
// Copie a linha exibida para o seu .env.local. Nunca compartilhe esse valor.
console.log(`AUTH_SECRET=${randomBytes(48).toString("base64url")}`);
