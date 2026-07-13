export interface DatasetTableCounts {
  [table: string]: number;
}

export interface DatasetReadRepository {
  getCounts(): Promise<DatasetTableCounts>;
  getExistingBookIds(bookIds: string[]): Promise<Set<string>>;
}

export interface DatasetDryRunPlan {
  countsBefore: DatasetTableCounts;
  countsAfter: DatasetTableCounts;
  existingBookIds: Set<string>;
  willCreate: number;
  willUpdate: number;
}

function sameCounts(before: DatasetTableCounts, after: DatasetTableCounts): boolean {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys].every((key) => before[key] === after[key]);
}

export async function buildReadOnlyDryRunPlan(
  repository: DatasetReadRepository,
  bookIds: string[],
): Promise<DatasetDryRunPlan> {
  const countsBefore = await repository.getCounts();
  const existingBookIds = await repository.getExistingBookIds(bookIds);
  const countsAfter = await repository.getCounts();

  if (!sameCounts(countsBefore, countsAfter)) {
    throw new Error("Dry-run safety assertion failed: database counts changed.");
  }

  return {
    countsBefore,
    countsAfter,
    existingBookIds,
    willCreate: bookIds.filter((id) => !existingBookIds.has(id)).length,
    willUpdate: bookIds.filter((id) => existingBookIds.has(id)).length,
  };
}
