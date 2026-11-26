import { randomUUID } from "node:crypto";
import { closeSync, constants, fstatSync, fsyncSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";

export const CVAT_FILE_LIMIT = 512 * 1024;

export function readCvatFile(path: string) {
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const stat = fstatSync(fd);
    if (!stat.isFile() || stat.size > CVAT_FILE_LIMIT) throw new Error("Arquivo CVAT inválido.");
    const bytes = readFileSync(fd);
    if (bytes.length > CVAT_FILE_LIMIT) throw new Error("Arquivo CVAT fora do limite.");
    return bytes;
  } finally {
    closeSync(fd);
  }
}

export function writeCvatFile(path: string, value: Buffer) {
  if (value.length > CVAT_FILE_LIMIT) throw new Error("Arquivo CVAT fora do limite.");
  const staged = `${path}.${randomUUID()}.tmp`;
  const fd = openSync(staged, "wx", 0o600);
  try {
    try {
      writeFileSync(fd, value);
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    renameSync(staged, path);
  } catch (error) {
    unlinkSync(staged);
    throw error;
  }
}
