export type ResultExportInput = {
  activityTitle: string;
  mode: string;
  groupName: string;
  participantDisplayName: string;
  cardName: string;
  status: string;
  paymentStatus: string;
  finalScore: number;
  criterionAverages: Array<{ name: string; average: number }>;
  driveLinks: string[];
};

export function buildResultsCsvRows(results: ResultExportInput[]) {
  return results.map((result) => ({
    activity: result.activityTitle,
    mode: result.mode,
    group: result.groupName,
    participant: result.participantDisplayName,
    card: result.cardName,
    status: result.status,
    paymentStatus: result.paymentStatus,
    finalScore: String(result.finalScore),
    criterionAverages: result.criterionAverages.map((item) => `${item.name}: ${item.average}`).join("; "),
    driveLinks: result.driveLinks.join("; "),
  }));
}
