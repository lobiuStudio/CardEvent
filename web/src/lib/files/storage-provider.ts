import type { FileStorage } from "./file-storage";
import { googleDriveStorage } from "./google-drive-storage";
import { localFileStorage } from "./local-file-storage";

export function getFileStorage(): FileStorage {
  if (process.env.FILE_STORAGE_PROVIDER === "google_drive") {
    return googleDriveStorage;
  }

  return localFileStorage;
}
