import type { AcceptedImageMimeType, ValidatedImageFile } from "@/lib/validation/submission";

type ValidatedStorageImageFile = Omit<ValidatedImageFile, "fileSize"> & {
  fileSize?: number;
};

export type StoredFile = {
  provider: "local" | "r2";
  fileId: string;
  publicUrl: string;
  originalName: string;
  mimeType: AcceptedImageMimeType;
  fileSize: number;
};

export type StoredFileBody = {
  body: BodyInit;
  mimeType: string;
  fileSize?: number;
};

export type SaveSubmissionImageInput = {
  activitySlug: string;
  submissionId: string;
  file: File;
  validatedImage?: ValidatedStorageImageFile;
};

export type SavePaymentProofInput = {
  activitySlug: string;
  ownerId: string;
  file: File;
  validatedImage?: ValidatedStorageImageFile;
};

export type SaveActivityCoverInput = {
  activitySlug: string;
  file: File;
  validatedImage?: ValidatedStorageImageFile;
};

export type FileStorage = {
  saveActivityCover(input: SaveActivityCoverInput): Promise<StoredFile>;
  saveSubmissionImage(input: SaveSubmissionImageInput): Promise<StoredFile>;
  savePaymentProof(input: SavePaymentProofInput): Promise<StoredFile>;
  readFile(fileId: string): Promise<StoredFileBody | null>;
  deleteFile(file: StoredFile): Promise<void>;
};
