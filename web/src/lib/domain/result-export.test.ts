import { describe, expect, it } from "vitest";
import { buildResultsCsvRows } from "./result-export";

describe("buildResultsCsvRows", () => {
  it("creates stable export rows", () => {
    expect(
      buildResultsCsvRows([
        {
          activityTitle: "Summer Cards",
          mode: "competition",
          groupName: "Open",
          participantDisplayName: "Aki",
          cardName: "Blue Dragon",
          status: "completed",
          paymentStatus: "confirmed",
          finalScore: 8.5,
          criterionAverages: [{ name: "Creativity", average: 9 }],
          driveLinks: ["https://drive.example/file-a"],
        },
      ]),
    ).toEqual([
      {
        activity: "Summer Cards",
        mode: "competition",
        group: "Open",
        participant: "Aki",
        card: "Blue Dragon",
        status: "completed",
        paymentStatus: "confirmed",
        finalScore: "8.5",
        criterionAverages: "Creativity: 9",
        driveLinks: "https://drive.example/file-a",
      },
    ]);
  });
});
