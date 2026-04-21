import { stableJsonStringify } from "./stableJson";

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function sha256Hex(value: unknown): Promise<string> {
  const data = new TextEncoder().encode(stableJsonStringify(value));
  const digest = await crypto.subtle.digest("SHA-256", data);
  return bytesToHex(new Uint8Array(digest));
}
