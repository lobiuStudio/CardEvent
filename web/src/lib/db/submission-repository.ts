import { prisma } from "./prisma";
import type { StoredFile } from "@/lib/files/file-storage";

export type SubmissionReviewStatus = "not_required" | "pending";
export type SubmissionPaymentStatus = "not_required" | "pending";

export type CreateSubmissionRecordInput = {
  activityId: string;
  participantId: string;
  groupId?: string;
  cardName: string;
  gameOrSeries?: string;
  characterOrType?: string;
  description?: string;
  authorDisplayName?: string;
  reviewStatus: SubmissionReviewStatus;
  paymentStatus: SubmissionPaymentStatus;
};

export type AddSubmissionImageInput = {
  submissionId: string;
  file: StoredFile;
};

export function countParticipantSubmissions(activityId: string, participantId: string): Promise<number> {
  return prisma.submission.count({
    where: {
      activityId,
      participantId,
      deletedAt: null,
    },
  });
}

export function createSubmissionRecord(input: CreateSubmissionRecordInput) {
  return prisma.submission.create({
    data: {
      activityId: input.activityId,
      participantId: input.participantId,
      groupId: input.groupId,
      cardName: input.cardName,
      gameOrSeries: input.gameOrSeries,
      characterOrType: input.characterOrType,
      description: input.description,
      authorDisplayName: input.authorDisplayName,
      reviewStatus: input.reviewStatus,
      paymentStatus: input.paymentStatus,
    },
  });
}

export function addSubmissionImage(input: AddSubmissionImageInput) {
  return prisma.submissionImage.create({
    data: {
      submissionId: input.submissionId,
      storageProvider: input.file.provider,
      storageFileId: input.file.fileId,
      publicUrl: input.file.publicUrl,
      originalName: input.file.originalName,
      mimeType: input.file.mimeType,
      fileSize: input.file.fileSize,
      active: true,
    },
  });
}

export function markSubmissionImagesInactive(submissionId: string) {
  return prisma.submissionImage.updateMany({
    where: {
      submissionId,
      active: true,
    },
    data: {
      active: false,
    },
  });
}

export function listParticipantSubmissions(participantId: string) {
  return prisma.submission.findMany({
    where: {
      participantId,
      deletedAt: null,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      activity: true,
      group: true,
      images: {
        where: {
          active: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });
}
