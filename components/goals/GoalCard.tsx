"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronDown,
  Landmark,
  LoaderCircle,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import GoalModal, { ExistingGoal, type GoalAccount } from "./GoalModal";
import GoalContributionModal from "./GoalContributionModal";
import {
  getGoalPresentation,
  type GoalPresentationAssignment,
} from "./goal-icons";
import { useProgressReveal, useReducedMotion } from "./use-animated-goal-value";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { Button } from "@/components/ui/button";
import { calculateGoalProgress } from "@/lib/planning/calculations";
import { getUserMutationError } from "@/lib/user-errors";

interface GoalContribution {
  id: string;
  amount: number;
  contributed_at: string;
  note: string | null;
  contribution_account?: GoalAccount | null;
}

interface GoalWithContributions extends ExistingGoal {
  linked_account?: GoalAccount | null;
  goal_contributions?: GoalContribution[];
}

export default function GoalCard({
  goal,
  accounts,
  presentation,
}: {
  goal: GoalWithContributions;
  accounts: GoalAccount[];
  presentation?: GoalPresentationAssignment;
}) {
  const router = useRouter();
  const supabase = createClient();
  const { formatCurrency } = useCurrency();

  const [editOpen, setEditOpen] = useState(false);
  const [contributionOpen, setContributionOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingContributionId, setDeletingContributionId] = useState<string | null>(null);
  const [now] = useState(() => Date.now());
  const reduceMotion = useReducedMotion();

  const progress = calculateGoalProgress(
    goal.current_amount,
    goal.target_amount,
  );
  const safeCurrent = progress.current;
  const safeTarget = progress.target;
  const pct = progress.percentage;
  const done = progress.completed;
  const progressReady = useProgressReveal(
    reduceMotion,
    `${goal.id}:${safeCurrent}:${safeTarget}`,
  );
  const resolvedPresentation = getGoalPresentation(goal, presentation);
  const accent = resolvedPresentation.accent;
  const GoalIcon = done ? CheckCircle2 : resolvedPresentation.entry.icon;

  let daysLeft: number | null = null;
  if (goal.deadline) {
    daysLeft = Math.ceil(
      (new Date(goal.deadline).getTime() - now) / 86400000,
    );
  }

  async function handleDelete() {
    if (deleting) return;
    if (!confirm(`Delete "${goal.name}"?`)) return;
    setDeleting(true);
    const { error } = await supabase.from("goals").delete().eq("id", goal.id);

    if (error) {
      setDeleting(false);
      toast.error("Could not delete the goal. Please try again.");
      return;
    }

    toast.success("Goal deleted");
    router.refresh();
  }

  async function handleDeleteContribution(contribution: GoalContribution) {
    if (deletingContributionId) return;
    if (!confirm(`Remove the ${formatCurrency(Number(contribution.amount))} contribution?`)) return;

    setDeletingContributionId(contribution.id);
    const { error } = await supabase.rpc("delete_goal_contribution", {
      p_contribution_id: contribution.id,
    });
    setDeletingContributionId(null);

    if (error) {
      toast.error(getUserMutationError(error, "Contribution could not be removed. Try again."));
      return;
    }

    toast.success("Contribution removed");
    router.refresh();
  }

  const cardStyle = {
    "--goal-accent": accent,
    "--progress-accent": accent,
    "--progress-duration": reduceMotion ? "0ms" : "820ms",
    "--progress-scale": progressReady && pct > 0 ? pct / 100 : 0,
  } as CSSProperties;
  const progressTrackStyle = {
    backgroundColor: `color-mix(in srgb, ${accent}, transparent 82%)`,
  } as CSSProperties;

  const statusText = done ? "Completed" : resolvedPresentation.label;

  return (
    <>
      <div
        className="finance-reference-card card-hover group relative flex h-full min-h-[270px] flex-col overflow-hidden p-4 sm:p-5"
        style={cardStyle}
      >
        <div className="absolute right-3 top-3 flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="icon-button"
            aria-label="Edit goal"
          >
            <Pencil size={12} />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            aria-busy={deleting || undefined}
            className="icon-button hover:border-danger/30 hover:bg-danger/10 hover:text-danger"
            aria-label="Delete goal"
            title="Delete goal"
          >
            {deleting ? (
              <LoaderCircle className="animate-spin motion-reduce:animate-none" size={12} aria-hidden="true" />
            ) : (
              <Trash2 size={12} aria-hidden="true" />
            )}
          </button>
        </div>

        <div className="mb-4 flex min-w-0 items-start gap-3 pr-24">
          <span
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border"
            style={{
              color: accent,
              borderColor: `color-mix(in srgb, ${accent}, transparent 76%)`,
              backgroundColor: `color-mix(in srgb, ${accent}, transparent 92%)`,
            }}
          >
            <GoalIcon size={18} strokeWidth={2.15} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold leading-6 text-text-primary">
              {goal.name}
            </p>
            <p className="text-xs font-semibold leading-5 text-[var(--goal-accent)]">
              {statusText}
            </p>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between gap-3">
          <p
            className={`min-w-0 truncate text-xs font-medium ${
              done || daysLeft === null || daysLeft >= 30
                ? "text-text-secondary"
                : "text-danger"
            }`}
          >
            {done
              ? "Goal reached"
              : daysLeft !== null
                ? daysLeft > 0
                  ? `${daysLeft} days left`
                  : daysLeft === 0
                    ? "Due today"
                    : "Overdue"
                : "No deadline"}
          </p>
          <span className="shrink-0 text-sm font-bold leading-5 text-[var(--goal-accent)]">
            {Math.round(pct)}%
          </span>
        </div>

        <div className="dashboard-progress-track" style={progressTrackStyle}>
          <div className="dashboard-progress-fill" />
        </div>

        <div className="mt-auto flex min-w-0 items-end justify-between gap-3 border-t border-border pt-4">
          <div className="min-w-0">
            <p className="finance-amount break-words text-sm font-bold text-text-primary [overflow-wrap:anywhere]">
              {formatCurrency(safeCurrent)}
            </p>
            <p className="mt-0.5 break-words text-xs text-text-secondary [overflow-wrap:anywhere]">
              of {formatCurrency(safeTarget)}
            </p>
          </div>
          <div className="min-w-0 max-w-[48%] text-right">
            <p className="finance-amount break-words text-sm font-bold text-[var(--goal-accent)] [overflow-wrap:anywhere]">
              {formatCurrency(progress.remaining)}
            </p>
            {!done && (
              <p className="break-words text-xs text-text-secondary">
                to go
              </p>
            )}
          </div>
        </div>

        {goal.linked_account ? (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-text-secondary">
            <Landmark size={13} aria-hidden="true" />
            Linked to <span className="font-semibold text-text-primary">{goal.linked_account.name}</span>
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-2">
          {!done ? (
            <Button className="min-h-11" size="sm" type="button" onClick={() => setContributionOpen(true)}>
              <Plus aria-hidden="true" />
              Add contribution
            </Button>
          ) : null}
          {(goal.goal_contributions?.length ?? 0) > 0 ? (
            <Button
              size="sm"
              className="min-h-11"
              variant="outline"
              type="button"
              aria-expanded={historyOpen}
              onClick={() => setHistoryOpen((value) => !value)}
            >
              History ({goal.goal_contributions?.length})
              <ChevronDown
                aria-hidden="true"
                className={historyOpen ? "rotate-180 transition-transform" : "transition-transform"}
              />
            </Button>
          ) : null}
        </div>

        {historyOpen ? (
          <div className="mt-3 space-y-2 border-t border-border pt-3">
            {goal.goal_contributions?.map((contribution) => (
              <div key={contribution.id} className="flex items-start justify-between gap-3 rounded-xl bg-surface-secondary p-3">
                <div className="min-w-0">
                  <p className="finance-amount text-sm font-semibold text-text-primary">
                    {formatCurrency(Number(contribution.amount))}
                  </p>
                  <p className="text-xs text-text-secondary">
                    <time dateTime={contribution.contributed_at}>
                      {new Intl.DateTimeFormat("en-PK", { dateStyle: "medium", timeZone: "UTC" }).format(
                        new Date(`${contribution.contributed_at}T00:00:00Z`),
                      )}
                    </time>
                    {contribution.contribution_account?.name
                      ? ` · ${contribution.contribution_account.name}`
                      : ""}
                  </p>
                  {contribution.note ? (
                    <p className="mt-1 break-words text-xs text-text-secondary">{contribution.note}</p>
                  ) : null}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  type="button"
                  aria-label="Remove contribution"
                  loading={deletingContributionId === contribution.id}
                  onClick={() => handleDeleteContribution(contribution)}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <GoalModal
        accounts={accounts}
        open={editOpen}
        goal={goal}
        onClose={() => setEditOpen(false)}
        onSuccess={() => {
          setEditOpen(false);
          router.refresh();
        }}
      />
      <GoalContributionModal
        open={contributionOpen}
        goal={goal}
        accounts={accounts}
        onClose={() => setContributionOpen(false)}
        onSuccess={() => router.refresh()}
      />
    </>
  );
}
