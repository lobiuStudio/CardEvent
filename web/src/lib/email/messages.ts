import type { EmailMessage } from "./email-service";

export function registrationVerificationEmail(input: { to: string; verifyUrl: string }): EmailMessage {
  return {
    to: input.to,
    subject: "Verify your Card Grading account",
    text: `Verify your account by opening this link:\n\n${input.verifyUrl}`,
  };
}

export function judgeInvitationEmail(input: { to: string; activityTitle: string; inviteUrl: string }): EmailMessage {
  return {
    to: input.to,
    subject: `Judge invitation: ${input.activityTitle}`,
    text: `You have been invited to judge ${input.activityTitle}.\n\nOpen this link: ${input.inviteUrl}`,
  };
}

export function submissionReceivedEmail(input: { to: string; cardName: string; activityTitle: string }): EmailMessage {
  return {
    to: input.to,
    subject: `Submission received: ${input.cardName}`,
    text: `Your card "${input.cardName}" was submitted to ${input.activityTitle}.`,
  };
}

export function submissionRejectedEmail(input: { to: string; cardName: string; reason: string }): EmailMessage {
  return {
    to: input.to,
    subject: `Submission needs changes: ${input.cardName}`,
    text: `Your submission was rejected for this reason:\n\n${input.reason}`,
  };
}

export function resultsAvailableEmail(input: { to: string; activityTitle: string; resultUrl: string }): EmailMessage {
  return {
    to: input.to,
    subject: `Results available: ${input.activityTitle}`,
    text: `Results for ${input.activityTitle} are available here:\n\n${input.resultUrl}`,
  };
}
