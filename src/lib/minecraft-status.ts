import "server-only";

import { connect } from "node:net";
import { lookup, resolveSrv } from "node:dns/promises";
import type { MinecraftServerStatus } from "@/lib/forum-store";

type StatusCache = { key: string; expiresAt: number; value: MinecraftServerStatus };
type StatusGlobal = typeof globalThis & { cloudWorldMinecraftStatus?: StatusCache };

const statusGlobal = globalThis as StatusGlobal;

function encodeVarInt(value: number) {
  const bytes: number[] = [];
  let current = value >>> 0;
  do {
    let byte = current & 0x7f;
    current >>>= 7;
    if (current) byte |= 0x80;
    bytes.push(byte);
  } while (current);
  return Buffer.from(bytes);
}

function decodeVarInt(buffer: Buffer, offset: number) {
  let value = 0;
  let size = 0;
  let byte = 0;
  do {
    if (offset + size >= buffer.length || size >= 5) return null;
    byte = buffer[offset + size];
    value |= (byte & 0x7f) << (7 * size);
    size += 1;
  } while ((byte & 0x80) !== 0);
  return { value, size };
}

function minecraftString(value: string) {
  const body = Buffer.from(value, "utf8");
  return Buffer.concat([encodeVarInt(body.length), body]);
}

async function parseAddress(value: string) {
  const cleaned = value.trim().replace(/^minecraft:\/\//i, "").split("/")[0];
  const match = cleaned.match(/^(.+?)(?::(\d{1,5}))?$/);
  const host = match?.[1] || "cloudworldmc.ru";
  if (match?.[2]) return { host, connectHost: host, port: Math.max(1, Math.min(65535, Number(match[2]))) };
  try {
    const records = await resolveSrv(`_minecraft._tcp.${host}`);
    const record = [...records].sort((a, b) => a.priority - b.priority || b.weight - a.weight)[0];
    if (record) return { host, connectHost: record.name, port: record.port };
  } catch { /* Сервер может работать без SRV-записи. */ }
  return { host, connectHost: host, port: 25565 };
}

async function queryMinecraftStatus(address: string): Promise<MinecraftServerStatus> {
  const { host, connectHost, port } = await parseAddress(address);
  const startedAt = Date.now();
  let connectAddress = "";
  try {
    const resolved = await lookup(connectHost, { all: true });
    const publicAddress = resolved.find((entry) => !isPrivateAddress(entry.address));
    if (!publicAddress) throw new Error("private address");
    connectAddress = publicAddress.address;
  } catch {
    return { online: false, playersOnline: 0, playersMax: 0, latencyMs: null, version: "", checkedAt: new Date().toISOString() };
  }
  return new Promise((resolve) => {
    const socket = connect({ host: connectAddress, port });
    const chunks: Buffer[] = [];
    let settled = false;
    const finish = (value: MinecraftServerStatus) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(value);
    };
    const offline = () => finish({ online: false, playersOnline: 0, playersMax: 0, latencyMs: null, version: "", checkedAt: new Date().toISOString() });
    socket.setTimeout(2800, offline);
    socket.once("error", offline);
    socket.once("connect", () => {
      const portBuffer = Buffer.allocUnsafe(2);
      portBuffer.writeUInt16BE(port);
      const handshakeBody = Buffer.concat([encodeVarInt(0), encodeVarInt(767), minecraftString(host), portBuffer, encodeVarInt(1)]);
      socket.write(Buffer.concat([encodeVarInt(handshakeBody.length), handshakeBody, Buffer.from([1, 0])]));
    });
    socket.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
      const buffer = Buffer.concat(chunks);
      const packetLength = decodeVarInt(buffer, 0);
      if (!packetLength || buffer.length < packetLength.size + packetLength.value) return;
      const packetId = decodeVarInt(buffer, packetLength.size);
      if (!packetId || packetId.value !== 0) return offline();
      const jsonLength = decodeVarInt(buffer, packetLength.size + packetId.size);
      if (!jsonLength) return;
      const jsonOffset = packetLength.size + packetId.size + jsonLength.size;
      if (buffer.length < jsonOffset + jsonLength.value) return;
      try {
        const parsed = JSON.parse(buffer.subarray(jsonOffset, jsonOffset + jsonLength.value).toString("utf8")) as { players?: { online?: number; max?: number }; version?: { name?: string } };
        finish({
          online: true,
          playersOnline: Number(parsed.players?.online || 0),
          playersMax: Number(parsed.players?.max || 0),
          latencyMs: Date.now() - startedAt,
          version: String(parsed.version?.name || ""),
          checkedAt: new Date().toISOString(),
        });
      } catch {
        offline();
      }
    });
  });
}

function isPrivateAddress(address: string) {
  const normalized = address.toLowerCase();
  if (normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb")) return true;
  const parts = normalized.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return false;
  return parts[0] === 10 || parts[0] === 127 || parts[0] === 0 || (parts[0] === 169 && parts[1] === 254) || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || (parts[0] === 192 && parts[1] === 168);
}

export async function getMinecraftServerStatus(address: string) {
  const now = Date.now();
  if (statusGlobal.cloudWorldMinecraftStatus?.key === address && statusGlobal.cloudWorldMinecraftStatus.expiresAt > now) {
    return statusGlobal.cloudWorldMinecraftStatus.value;
  }
  const value = await queryMinecraftStatus(address);
  statusGlobal.cloudWorldMinecraftStatus = { key: address, expiresAt: now + 30_000, value };
  return value;
}
