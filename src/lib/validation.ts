import { z } from "zod";
import { isIP } from "node:net";
import { lookup } from "node:dns/promises";

const forbiddenHosts = [
  /^localhost$/i,
  /^127\./,
  /^0\./,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^\[?::1\]?$/,
];

export function isSafePublicUrl(value: string) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !forbiddenHosts.some((rule) => rule.test(url.hostname));
  } catch {
    return false;
  }
}

function isPrivateIp(address: string) {
  const normalized = address.toLowerCase();
  if (isIP(normalized) === 4) {
    const [a, b] = normalized.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
      || a >= 224;
  }
  if (isIP(normalized) === 6) {
    if (normalized.startsWith("::ffff:")) return isPrivateIp(normalized.slice(7));
    return normalized === "::" || normalized === "::1" || normalized.startsWith("fc")
      || normalized.startsWith("fd") || /^fe[89ab]/.test(normalized) || normalized.startsWith("ff");
  }
  return true;
}

export async function assertSafeResolvedUrl(value: string) {
  if (!isSafePublicUrl(value)) throw new Error("Destino local ou privado não permitido");
  const url = new URL(value);
  const addresses = await lookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateIp(address))) {
    throw new Error("O domínio resolve para uma rede local ou privada");
  }
}

const urlSchema = z.string().url().refine(isSafePublicUrl, "Use uma URL HTTP(S) pública");

export const createMonitorSchema = z.object({
  name: z.string().trim().min(2).max(80),
  url: urlSchema,
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"]).default("GET"),
  intervalMinutes: z.coerce.number().int().min(1).max(1440),
  timeoutMs: z.coerce.number().int().min(1000).max(30000).default(10000),
  headers: z.record(z.string()).default({}),
  alertWebhook: z.union([urlSchema, z.literal(""), z.null()]).optional().transform((value) => value || null),
});

export const updateMonitorSchema = createMonitorSchema.partial().extend({
  active: z.boolean().optional(),
});
