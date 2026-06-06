import { prisma } from "./prisma";
import type { StoredFile } from "@/lib/files/file-storage";

export type SubmissionReviewStatus = "not_required" | "pending";
export type SubmissionPaymentStatus = "not_required" | "pending";

export type CreateSubmissionRecordInput = {
  id?: string;
  activityId: string;
  participantId: string;
  participantSubmissionNumber?: number;
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

export type CreateSubmissionWithImagesInput = CreateSubmissionRecordInput & {
  perParticipantSubmissionLimit: number;
  images: StoredFile[];
};

export class SubmissionLimitReachedError extends Error {
  constructor() {
    super("Submission limit reached.");
    this.name = "SubmissionLimitReachedError";
  }
}

export class SubmissionSlotConflictError extends Error {
  constructor() {
    super("Submission slot conflict.");
    this.name = "SubmissionSlotConflictError";
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

function toSubmissionImageCreateInput(file: StoredFile) {
  return {
    storageProvider: file.provider,
    storageFileId: file.fileId,
    publicUrl: file.publicUrl,
    originalName: file.originalName,
    mimeType: file.mimeType,
    fileSize: file.fileSize,
    active: true,
  };
}

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
      id: input.id,
      activityId: input.activityId,
      participantId: input.participantId,
      participantSubmissionNumber: input.participantSubmissionNumber,
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

export async function createSubmissionWithImages(input: CreateSubmissionWithImagesInput) {
  try {
    return await prisma.$transaction(async (tx) => {
      const activeSubmissionCount = await tx.submission.count({
        where: {
          activityId: input.activityId,
          participantId: input.participantId,
          deletedAt: null,
        },
      });
      const participantSubmissionNumbers = await tx.submission.findMany({
        where: {
          activityId: input.activityId,
          participantId: input.participantId,
          participantSubmissionNumber: {
            not: null,
          },
        },
        select: {
          participantSubmissionNumber: true,
        },
      });

      if (activeSubmissionCount >= input.perParticipantSubmissionLimit) {
        throw new SubmissionLimitReachedError();
      }

      const usedNumbers = new Set(
        participantSubmissionNumbers
          .map(({ participantSubmissionNumber }) => participantSubmissionNumber)
          .filter((value): value is number => typeof value === "number"),
      );
      let participantSubmissionNumber: number | null = null;

      for (let number = 1; number <= input.perParticipantSubmissionLimit; number += 1) {
        if (!usedNumbers.has(number)) {
          participantSubmissionNumber = number;
          break;
        }
      }

      if (!participantSubmissionNumber) {
        throw new SubmissionLimitReachedError();
      }

      return tx.submission.create({
        data: {
          id: input.id,
          activityId: input.activityId,
          participantId: input.participantId,
          participantSubmissionNumber,
          groupId: input.groupId,
          cardName: input.cardName,
          gameOrSeries: input.gameOrSeries,
          characterOrType: input.characterOrType,
          description: input.description,
          authorDisplayName: input.authorDisplayName,
          reviewStatus: input.reviewStatus,
          paymentStatus: input.paymentStatus,
          images: {
            create: input.images.map(toSubmissionImageCreateInput),
          },
        },
      });
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new SubmissionSlotConflictError();
    }

    throw error;
  }
}

export function addSubmissionImage(input: AddSubmissionImageInput) {
  return prisma.submissionImage.create({
    data: {
      submissionId: input.submissionId,
      ...toSubmissionImageCreateInput(input.file),
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
