import { describe, expect, it } from "vitest";
import {
  judgeInvitationEmail,
  registrationVerificationEmail,
  resultsAvailableEmail,
  submissionReceivedEmail,
  submissionRejectedEmail,
} from "./messages";

describe("email message builders", () => {
  it("builds stable notification messages", () => {
    expect(
      registrationVerificationEmail({
        to: "participant@example.com",
        verifyUrl: "https://cardevent.test/account/verify-email/token",
      }),
    ).toEqual({
      to: "participant@example.com",
      subject: "Verify your Card Grading account",
      text: "Verify your account by opening this link:\n\nhttps://cardevent.test/account/verify-email/token",
    });

    expect(
      judgeInvitationEmail({
        to: "judge@example.com",
        activityTitle: "Summer Cards",
        inviteUrl: "https://cardevent.test/judge/invite/token",
      }),
    ).toEqual({
      to: "judge@example.com",
      subject: "Judge invitation: Summer Cards",
      text: "You have been invited to judge Summer Cards.\n\nOpen this link: https://cardevent.test/judge/invite/token",
    });

    expect(
      submissionReceivedEmail({
        to: "participant@example.com",
        cardName: "Blue Dragon",
        activityTitle: "Summer Cards",
      }),
    ).toEqual({
      to: "participant@example.com",
      subject: "Submission received: Blue Dragon",
      text: 'Your card "Blue Dragon" was submitted to Summer Cards.',
    });

    expect(
      submissionRejectedEmail({
        to: "participant@example.com",
        cardName: "Blue Dragon",
        reason: "Image is blurry.",
      }),
    ).toEqual({
      to: "participant@example.com",
      subject: "Submission needs changes: Blue Dragon",
      text: "Your submission was rejected for this reason:\n\nImage is blurry.",
    });

    expect(
      resultsAvailableEmail({
        to: "participant@example.com",
        activityTitle: "Summer Cards",
        resultUrl: "https://cardevent.test/account/results",
      }),
    ).toEqual({
      to: "participant@example.com",
      subject: "Results available: Summer Cards",
      text: "Results for Summer Cards are available here:\n\nhttps://cardevent.test/account/results",
    });
  });
});
