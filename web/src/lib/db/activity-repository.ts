import type { z } from "zod";
import { prisma } from "./prisma";
import type { createActivitySchema } from "@/lib/validation/activity";

export type CreateActivityInput = z.infer<typeof createActivitySchema>;

export async function listPublishedActivities() {
  return prisma.activity.findMany({
    orderBy: { submissionStartAt: "desc" },
    include: {
      groups: { orderBy: { displayOrder: "asc" } },
      criteria: { orderBy: { displayOrder: "asc" } },
    },
  });
}

export async function getActivityBySlug(slug: string) {
  return prisma.activity.findUnique({
    where: { slug },
    include: {
      groups: { orderBy: { displayOrder: "asc" } },
      criteria: { orderBy: { displayOrder: "asc" } },
    },
  });
}

export async function createActivity(input: CreateActivityInput) {
  return prisma.activity.create({
    data: {
      slug: input.slug,
      title: input.title,
      description: input.description,
      mode: input.mode,
      rulesMarkdown: input.rulesMarkdown,
      submissionStartAt: input.submissionStartAt,
      submissionDeadlineAt: input.submissionDeadlineAt,
      judgingDeadlineAt: input.judgingDeadlineAt,
      expectedResultAnnouncementAt: input.expectedResultAnnouncementAt,
      perParticipantSubmissionLimit: input.perParticipantSubmissionLimit,
      maxImagesPerSubmission: input.maxImagesPerSubmission,
      reviewRequired: input.reviewRequired,
      anonymousJudging: input.anonymousJudging,
      paymentRequired: input.paymentRequired,
      paymentInstructions: input.paymentInstructions,
      paymentChargingMode: input.paymentChargingMode,
      groups: { create: input.groups },
      criteria: { create: input.criteria },
    },
  });
}
