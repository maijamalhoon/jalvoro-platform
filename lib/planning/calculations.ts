const COMPLETION_EPSILON = 0.000001;

function toNonNegativeFiniteNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export type ProgressCalculation = {
  current: number;
  target: number;
  ratio: number;
  percentage: number;
  remaining: number;
  completed: boolean;
};

export function calculateGoalProgress(
  currentValue: unknown,
  targetValue: unknown,
): ProgressCalculation {
  const current = toNonNegativeFiniteNumber(currentValue);
  const target = toNonNegativeFiniteNumber(targetValue);
  const ratio = target > 0 ? Math.min(Math.max(current / target, 0), 1) : 0;

  return {
    current,
    target,
    ratio,
    percentage: ratio * 100,
    remaining: Math.max(target - current, 0),
    completed: target > 0 && current >= target,
  };
}

export function calculatePayableProgress(
  paidValue: unknown,
  totalValue: unknown,
): ProgressCalculation {
  const paid = toNonNegativeFiniteNumber(paidValue);
  const total = toNonNegativeFiniteNumber(totalValue);
  const ratio = total > 0 ? Math.min(Math.max(paid / total, 0), 1) : 0;

  return {
    current: paid,
    target: total,
    ratio,
    percentage: ratio * 100,
    remaining: Math.max(total - paid, 0),
    completed: total > 0 && paid + COMPLETION_EPSILON >= total,
  };
}

export type PayableDisplayStatus =
  | "pending"
  | "partial"
  | "overdue"
  | "completed";

export function resolvePayableStatus(
  payable: {
    paidAmount: unknown;
    remainingAmount: unknown;
    dueDate: string | null | undefined;
  },
  todayKey: string,
): PayableDisplayStatus {
  const paid = toNonNegativeFiniteNumber(payable.paidAmount);
  const remaining = toNonNegativeFiniteNumber(payable.remainingAmount);

  if (remaining <= COMPLETION_EPSILON) return "completed";
  if (payable.dueDate && payable.dueDate < todayKey) return "overdue";
  if (paid > COMPLETION_EPSILON) return "partial";
  return "pending";
}
