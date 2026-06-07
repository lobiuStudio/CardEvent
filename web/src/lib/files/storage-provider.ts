import type { FileStorage } from "./file-storage";
import { localFileStorage } from "./local-file-storage";
import { r2FileStorage } from "./r2-storage";

export function getFileStorage(): FileStorage {
  const provider = process.env.FILE_STORAGE_PROVIDER ?? "local";

  if (provider === "local") {
    return localFileStorage;
  }

  if (provider === "r2") {
    return r2FileStorage;
  }

  throw new Error("FILE_STORAGE_PROVIDER must be local or r2.");
}
