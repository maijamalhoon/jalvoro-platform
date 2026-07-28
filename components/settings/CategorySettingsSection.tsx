"use client";

import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  Check,
  ChevronRight,
  Eye,
  LayoutGrid,
  Loader2,
  MoreHorizontal,
  Palette,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import CategoryAppearancePicker from "@/components/settings/CategoryAppearancePicker";
import type { PersistentSettingsCategory } from "@/components/settings/CategoryManagementExperience";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FinanceFormField,
  FinanceModalBody,
  FinanceModalFooter,
  FinanceModalHeader,
  financeModalContentClass,
} from "@/components/ui/finance-modal";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CategoryColorDot,
  CategoryVisualIcon,
  getCategoryVisual,
  getNextCategoryVisual,
  type CategoryKind,
  type CategoryVisual,
} from "@/lib/category-visuals";
import {
  CATEGORY_DELETE_VERIFICATION_ERROR,
  validateCategoryDeleteReadiness,
} from "@/lib/settings/security";
import { createClient } from "@/lib/supabase/client";

type CategoryDialogMode = "create" | "view" | null;
type AppearanceTarget = "create" | "edit" | null;
type CategorySort = "name" | "usage" | "newest";

type Props = {
  initialCategories: PersistentSettingsCategory[];
  initialUsage: Record<string, number>;
  userId: string;
  available: boolean;
};

const EMPTY_VISUAL: CategoryVisual = {
  color: "#2563EB",
  iconKey: "tags",
};

function createRequestKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  const seed = `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`
    .replace(/[^0-9a-f]/gi, "")
    .padEnd(32, "0")
    .slice(0, 32);
  return `${seed.slice(0, 8)}-${seed.slice(8, 12)}-4${seed.slice(13, 16)}-8${seed.slice(17, 20)}-${seed.slice(20, 32)}`;
}

function IconBubble({ children }: { children: ReactNode }) {
  return (
    <span className="finance-icon-bubble h-11 w-11 rounded-full text-active">
      {children}
    </span>
  );
}

function CategoryActionRow({
  icon,
  title,
  description,
  onClick,
  disabled = false,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="finance-focus flex w-full min-w-0 items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-hover focus-visible:bg-hover disabled:cursor-not-allowed disabled:opacity-55 sm:px-5"
    >
      {icon}
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold leading-5 text-text-primary">
          {title}
        </span>
        <span className="mt-0.5 block text-xs leading-5 text-text-secondary">
          {description}
        </span>
      </span>
      <ChevronRight size={18} className="shrink-0 text-text-secondary" />
    </button>
  );
}

function TypeSelector({
  value,
  onChange,
  disabled = false,
}: {
  value: CategoryKind;
  onChange: (value: CategoryKind) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className="grid grid-cols-2 rounded-[14px] border border-border bg-surface-secondary p-1"
      role="radiogroup"
      aria-label="Category type"
    >
      {(["income", "expense"] as const).map((type) => {
        const active = type === value;
        return (
          <button
            key={type}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(type)}
            className={`finance-focus inline-flex min-h-10 items-center justify-center gap-2 rounded-[10px] px-3 text-sm font-bold capitalize transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${
              active
                ? type === "income"
                  ? "bg-success text-[var(--status-foreground)] shadow-sm"
                  : "bg-danger text-[var(--status-foreground)] shadow-sm"
                : "text-text-secondary hover:bg-hover hover:text-text-primary"
            }`}
          >
            {active ? <Check size={14} aria-hidden="true" /> : null}
            {type}
          </button>
        );
      })}
    </div>
  );
}

function normalizeRpcCategory(data: unknown): PersistentSettingsCategory | null {
  const candidate = Array.isArray(data) ? data[0] : data;
  if (!candidate || typeof candidate !== "object") return null;
  const row = candidate as Record<string, unknown>;
  if (
    typeof row.id !== "string" ||
    typeof row.name !== "string" ||
    (row.type !== "income" && row.type !== "expense")
  ) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    type: row.type,
    color: typeof row.color === "string" ? row.color : null,
    icon_key: typeof row.icon_key === "string" ? row.icon_key : null,
    parent_id: typeof row.parent_id === "string" ? row.parent_id : null,
    created_at: typeof row.created_at === "string" ? row.created_at : null,
    archived_at: typeof row.archived_at === "string" ? row.archived_at : null,
    sort_order: typeof row.sort_order === "number" ? row.sort_order : 0,
  };
}

function mutationErrorMessage(error: { message?: string } | null, fallback: string) {
  const message = error?.message?.toLowerCase() ?? "";
  if (message.includes("already exists") || message.includes("duplicate")) {
    return "A category with this name already exists.";
  }
  if (message.includes("type cannot change")) {
    return "Category type cannot change while the category is in use.";
  }
  if (message.includes("parent category")) {
    return "The selected parent category is unavailable.";
  }
  if (message.includes("transactions") && message.includes("cannot")) {
    return "This category is used by transactions. Archive it instead of deleting it.";
  }
  if (message.includes("subcategories")) {
    return "Move or archive the subcategories first.";
  }
  return fallback;
}

export default function CategorySettingsSection({
  initialCategories,
  initialUsage,
  available,
}: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [dialogMode, setDialogMode] = useState<CategoryDialogMode>(null);
  const [appearanceTarget, setAppearanceTarget] =
    useState<AppearanceTarget>(null);
  const [categories, setCategories] = useState(initialCategories);
  const [usage, setUsage] = useState(initialUsage);
  const [activeTab, setActiveTab] = useState<CategoryKind>("income");
  const [managerQuery, setManagerQuery] = useState("");
  const [sortMode, setSortMode] = useState<CategorySort>("name");

  const [draftName, setDraftName] = useState("");
  const [draftType, setDraftType] = useState<CategoryKind>("income");
  const [draftParentId, setDraftParentId] = useState("");
  const [draftVisual, setDraftVisual] = useState<CategoryVisual>(EMPTY_VISUAL);
  const [draftVisualTouched, setDraftVisualTouched] = useState(false);

  const [detailId, setDetailId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<CategoryKind>("income");
  const [editParentId, setEditParentId] = useState("");
  const [editVisual, setEditVisual] = useState<CategoryVisual>(EMPTY_VISUAL);

  const [workingAction, setWorkingAction] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] =
    useState<PersistentSettingsCategory | null>(null);
  const [deleteFeedback, setDeleteFeedback] = useState<string | null>(null);

  useEffect(() => setCategories(initialCategories), [initialCategories]);
  useEffect(() => setUsage(initialUsage), [initialUsage]);

  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );

  const childCountByParent = useMemo(
    () =>
      categories.reduce<Record<string, number>>((counts, category) => {
        if (category.parent_id) {
          counts[category.parent_id] = (counts[category.parent_id] ?? 0) + 1;
        }
        return counts;
      }, {}),
    [categories],
  );

  const detailCategory = detailId ? categoryById.get(detailId) ?? null : null;

  const topLevelExpenseCategories = useMemo(
    () =>
      categories
        .filter(
          (category) =>
            category.type === "expense" &&
            !category.parent_id &&
            category.id !== detailId,
        )
        .sort((left, right) => left.name.localeCompare(right.name)),
    [categories, detailId],
  );

  const suggestedDraftVisual = useMemo(
    () => getNextCategoryVisual(categories, draftName || "Category", draftType),
    [categories, draftName, draftType],
  );
  const resolvedDraftVisual = draftVisualTouched
    ? draftVisual
    : suggestedDraftVisual;

  function openCreateDialog(type: CategoryKind = "income") {
    setDraftName("");
    setDraftType(type);
    setDraftParentId("");
    setDraftVisual(getNextCategoryVisual(categories, "Category", type));
    setDraftVisualTouched(false);
    setDetailId(null);
    setDialogMode("create");
  }

  function openViewDialog() {
    setDetailId(null);
    setManagerQuery("");
    setDialogMode("view");
  }

  function closeMainDialog() {
    setDialogMode(null);
    setDetailId(null);
    setAppearanceTarget(null);
    setDraftName("");
    setDraftParentId("");
    setDraftVisualTouched(false);
  }

  function openDetails(category: PersistentSettingsCategory) {
    setEditName(category.name);
    setEditType(category.type);
    setEditParentId(category.parent_id ?? "");
    setEditVisual(getCategoryVisual(category));
    setDetailId(category.id);
  }

  function closeDetails() {
    setDetailId(null);
    setAppearanceTarget(null);
    setEditName("");
    setEditParentId("");
  }

  function hasDuplicateName(
    name: string,
    type: CategoryKind,
    excludeId?: string,
  ) {
    const normalized = name.trim().toLocaleLowerCase();
    return categories.some(
      (category) =>
        category.id !== excludeId &&
        category.type === type &&
        category.name.trim().toLocaleLowerCase() === normalized,
    );
  }

  async function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = draftName.trim();

    if (!name) {
      toast.error("Enter a category name.");
      return;
    }
    if (hasDuplicateName(name, draftType)) {
      toast.error("A category with this name already exists.");
      return;
    }

    setWorkingAction("create");
    const { data, error } = await supabase.rpc("create_category_v2", {
      p_name: name,
      p_type: draftType,
      p_color: resolvedDraftVisual.color,
      p_icon_key: resolvedDraftVisual.iconKey,
      p_parent_id:
        draftType === "expense" && draftParentId ? draftParentId : null,
      p_request_key: createRequestKey(),
    });
    setWorkingAction(null);

    const created = normalizeRpcCategory(data);
    if (error || !created) {
      toast.error(
        mutationErrorMessage(error, "Could not create category. Please try again."),
      );
      return;
    }

    setCategories((current) => [...current, created]);
    setUsage((current) => ({ ...current, [created.id]: 0 }));
    setActiveTab(created.type);
    closeMainDialog();
    toast.success(`${created.name} created.`);
    router.refresh();
  }

  async function saveCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const category = detailCategory;
    if (!category) return;

    const name = editName.trim();
    const usageCount = usage[category.id] ?? 0;
    const childCount = childCountByParent[category.id] ?? 0;
    const canChangeType = usageCount === 0 && childCount === 0;
    const nextType = canChangeType ? editType : category.type;

    if (!name) {
      toast.error("Enter a category name.");
      return;
    }
    if (hasDuplicateName(name, nextType, category.id)) {
      toast.error("A category with this name already exists.");
      return;
    }

    setWorkingAction(`save:${category.id}`);
    const { data, error } = await supabase.rpc("update_category_v2", {
      p_category_id: category.id,
      p_name: name,
      p_type: nextType,
      p_color: editVisual.color,
      p_icon_key: editVisual.iconKey,
      p_parent_id:
        nextType === "expense" && editParentId ? editParentId : null,
      p_request_key: createRequestKey(),
    });
    setWorkingAction(null);

    const updated = normalizeRpcCategory(data);
    if (error || !updated) {
      toast.error(
        mutationErrorMessage(error, "Could not update category. Please try again."),
      );
      return;
    }

    setCategories((current) =>
      current.map((item) => (item.id === updated.id ? updated : item)),
    );
    setActiveTab(updated.type);
    closeDetails();
    toast.success(`${updated.name} updated.`);
    router.refresh();
  }

  async function archiveCategory(category: PersistentSettingsCategory) {
    if (workingAction) return;
    setWorkingAction(`archive:${category.id}`);
    const { error } = await supabase.rpc("archive_category_v2", {
      p_category_id: category.id,
      p_request_key: createRequestKey(),
    });
    setWorkingAction(null);

    if (error) {
      toast.error(
        mutationErrorMessage(error, "Could not archive category. Please try again."),
      );
      return;
    }

    const removedIds = new Set(
      categories
        .filter(
          (item) => item.id === category.id || item.parent_id === category.id,
        )
        .map((item) => item.id),
    );
    setCategories((current) =>
      current.filter((item) => !removedIds.has(item.id)),
    );
    setUsage((current) => {
      const next = { ...current };
      removedIds.forEach((id) => delete next[id]);
      return next;
    });
    closeDetails();
    toast.success(`${category.name} archived. Existing transactions are unchanged.`);
    router.refresh();
  }

  function requestCategoryDelete(category: PersistentSettingsCategory) {
    const readiness = validateCategoryDeleteReadiness({
      usageCount: usage[category.id] ?? 0,
      childCount: childCountByParent[category.id] ?? 0,
    });

    if (!readiness.ok) {
      toast.error(
        readiness.error === CATEGORY_DELETE_VERIFICATION_ERROR
          ? "Could not verify category usage. Archive it instead."
          : readiness.error,
      );
      return;
    }

    setDeleteFeedback(null);
    setPendingDelete(category);
  }

  async function confirmCategoryDelete() {
    const category = pendingDelete;
    if (!category || workingAction) return;

    setWorkingAction(`delete:${category.id}`);
    setDeleteFeedback(null);
    const { error } = await supabase.rpc("delete_category_v2", {
      p_category_id: category.id,
      p_request_key: createRequestKey(),
    });
    setWorkingAction(null);

    if (error) {
      setDeleteFeedback(
        mutationErrorMessage(error, "Could not permanently delete category."),
      );
      return;
    }

    setCategories((current) =>
      current.filter((item) => item.id !== category.id),
    );
    setUsage((current) => {
      const next = { ...current };
      delete next[category.id];
      return next;
    });
    setPendingDelete(null);
    closeDetails();
    toast.success(`${category.name} permanently deleted.`);
    router.refresh();
  }

  function filteredCategories(type: CategoryKind) {
    const normalizedQuery = managerQuery.trim().toLocaleLowerCase();
    const items = categories.filter((category) => {
      if (category.type !== type) return false;
      if (!normalizedQuery) return true;
      const parentName = category.parent_id
        ? categoryById.get(category.parent_id)?.name ?? ""
        : "";
      return `${category.name} ${parentName}`
        .toLocaleLowerCase()
        .includes(normalizedQuery);
    });

    return items.sort((left, right) => {
      if (sortMode === "usage") {
        const usageDifference = (usage[right.id] ?? 0) - (usage[left.id] ?? 0);
        if (usageDifference !== 0) return usageDifference;
      }
      if (sortMode === "newest") {
        const leftTime = left.created_at ? Date.parse(left.created_at) : 0;
        const rightTime = right.created_at ? Date.parse(right.created_at) : 0;
        if (rightTime !== leftTime) return rightTime - leftTime;
      }
      return left.name.localeCompare(right.name);
    });
  }

  function CategoryList({ type }: { type: CategoryKind }) {
    const items = filteredCategories(type);

    if (items.length === 0) {
      return (
        <div className="rounded-[18px] border border-dashed border-border px-5 py-10 text-center">
          <p className="text-sm font-bold text-text-primary">
            {managerQuery ? "No matching categories" : `No ${type} categories yet`}
          </p>
          <p className="mt-1 text-xs leading-5 text-text-secondary">
            {managerQuery
              ? "Try another search term."
              : "Create a category to keep transactions organised."}
          </p>
          {!managerQuery ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => openCreateDialog(type)}
              className="mt-4"
            >
              <Plus size={14} /> New category
            </Button>
          ) : null}
        </div>
      );
    }

    return (
      <div className="overflow-hidden rounded-[18px] border border-border bg-card">
        {items.map((category, index) => {
          const usageCount = usage[category.id] ?? 0;
          const childCount = childCountByParent[category.id] ?? 0;
          const parent = category.parent_id
            ? categoryById.get(category.parent_id)
            : null;
          const deleting = workingAction === `delete:${category.id}`;
          const archiving = workingAction === `archive:${category.id}`;
          const canDelete = usageCount === 0 && childCount === 0;

          return (
            <div
              key={category.id}
              className={`flex min-w-0 items-center gap-1 px-3 py-2.5 transition-colors hover:bg-hover sm:px-4 ${
                index > 0 ? "border-t border-border" : ""
              }`}
            >
              <button
                type="button"
                onClick={() => openDetails(category)}
                className="finance-focus flex min-w-0 flex-1 items-center gap-3 rounded-[12px] px-1 py-1.5 text-left"
              >
                <CategoryVisualIcon category={category} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-text-primary">
                    {category.name}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] leading-4 text-text-secondary">
                    {parent ? `Under ${parent.name}` : "Top level"}
                    {` · ${usageCount} ${usageCount === 1 ? "transaction" : "transactions"}`}
                    {childCount > 0 ? ` · ${childCount} subcategories` : ""}
                  </span>
                </span>
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger
                  type="button"
                  aria-label={`More actions for ${category.name}`}
                  className="finance-focus grid size-10 shrink-0 place-items-center rounded-[12px] text-text-secondary hover:bg-surface-secondary hover:text-text-primary"
                >
                  {deleting || archiving ? (
                    <Loader2 size={17} className="animate-spin" />
                  ) : (
                    <MoreHorizontal size={18} />
                  )}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => openDetails(category)}>
                    <Pencil /> Edit details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void archiveCategory(category)}>
                    <Archive /> Archive
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    disabled={!canDelete}
                    onClick={() => requestCategoryDelete(category)}
                  >
                    <Trash2 /> Delete permanently
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        })}
      </div>
    );
  }

  const detailUsageCount = detailCategory ? usage[detailCategory.id] ?? 0 : 0;
  const detailChildCount = detailCategory
    ? childCountByParent[detailCategory.id] ?? 0
    : 0;
  const detailCanChangeType = detailUsageCount === 0 && detailChildCount === 0;
  const detailCanDelete = detailCanChangeType;

  return (
    <>
      <section className="mx-auto mt-5 max-w-4xl">
        <p className="px-2 pb-2 pt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-text-secondary">
          Categories
        </p>
        <div className="finance-panel min-w-0 overflow-hidden">
          <CategoryActionRow
            icon={
              <IconBubble>
                <Plus size={21} aria-hidden="true" />
              </IconBubble>
            }
            title="Create Category"
            description={
              available
                ? "Add a clean income or expense category"
                : "Category data is currently unavailable"
            }
            onClick={() => openCreateDialog()}
            disabled={!available}
          />
          <div className="ml-[76px] h-px bg-border" />
          <CategoryActionRow
            icon={
              <IconBubble>
                <Eye size={21} aria-hidden="true" />
              </IconBubble>
            }
            title="Manage Categories"
            description={
              available
                ? "Search, edit, archive, or safely delete categories"
                : "Category data is currently unavailable"
            }
            onClick={openViewDialog}
            disabled={!available}
          />
        </div>
      </section>

      <Dialog
        open={dialogMode !== null}
        onOpenChange={(nextOpen: boolean) => {
          if (!nextOpen) closeMainDialog();
        }}
      >
        <DialogContent
          className={`${financeModalContentClass} w-[calc(100vw-0.75rem)] ${
            dialogMode === "view"
              ? "sm:[--finance-modal-max-width:42rem]"
              : "sm:[--finance-modal-max-width:34rem]"
          }`}
        >
          <FinanceModalHeader
            title={dialogMode === "create" ? "Create category" : "Categories"}
            description={
              dialogMode === "view"
                ? "A clean manager for every saved category."
                : "Name it, choose its type, then set one clear visual."
            }
            icon={dialogMode === "view" ? LayoutGrid : undefined}
            tone={dialogMode === "create" ? "success" : "info"}
            badge={
              dialogMode === "view" ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => openCreateDialog(activeTab)}
                  className="shrink-0"
                >
                  <Plus size={14} /> New
                </Button>
              ) : undefined
            }
          />

          {dialogMode === "create" ? (
            <form onSubmit={addCategory} className="flex min-h-0 flex-1 flex-col">
              <FinanceModalBody className="space-y-4">
                <FinanceFormField label="Category type">
                  <TypeSelector
                    value={draftType}
                    onChange={(type) => {
                      setDraftType(type);
                      setDraftParentId("");
                      if (!draftVisualTouched) {
                        setDraftVisual(
                          getNextCategoryVisual(
                            categories,
                            draftName || "Category",
                            type,
                          ),
                        );
                      }
                    }}
                  />
                </FinanceFormField>

                <FinanceFormField
                  label="Category name"
                  htmlFor="settings-category-name"
                >
                  <div className="flex min-h-12 min-w-0 items-center rounded-[14px] border border-border bg-card px-2.5 transition-colors focus-within:border-active focus-within:ring-3 focus-within:ring-active/15">
                    <button
                      type="button"
                      onClick={() => setAppearanceTarget("create")}
                      aria-label="Choose category icon and color"
                      className="finance-focus grid size-9 shrink-0 place-items-center rounded-[10px] hover:bg-hover"
                    >
                      <CategoryVisualIcon
                        color={resolvedDraftVisual.color}
                        iconKey={resolvedDraftVisual.iconKey}
                        label={draftName || `New ${draftType}`}
                        size="xs"
                      />
                    </button>
                    <span
                      aria-hidden="true"
                      className="mx-1.5 h-7 w-px shrink-0 bg-border"
                    />
                    <input
                      id="settings-category-name"
                      value={draftName}
                      onChange={(event) => setDraftName(event.target.value)}
                      placeholder="e.g. Salary, Rent, Fuel"
                      autoComplete="off"
                      autoFocus
                      maxLength={80}
                      className="min-h-11 min-w-0 flex-1 bg-transparent px-2 text-sm font-semibold text-text-primary outline-none placeholder:font-medium placeholder:text-text-tertiary sm:text-base"
                    />
                  </div>
                </FinanceFormField>

                <button
                  type="button"
                  onClick={() => setAppearanceTarget("create")}
                  className="finance-focus flex w-full min-w-0 items-center gap-3 rounded-[16px] border border-border bg-surface-secondary px-3.5 py-3 text-left transition-colors hover:border-active/25 hover:bg-hover"
                >
                  <CategoryVisualIcon
                    color={resolvedDraftVisual.color}
                    iconKey={resolvedDraftVisual.iconKey}
                    label={draftName || `New ${draftType}`}
                    size="sm"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-text-primary">
                      Icon and color
                    </span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-xs text-text-secondary">
                      <CategoryColorDot color={resolvedDraftVisual.color} />
                      Tap to change appearance
                    </span>
                  </span>
                  <Palette size={17} className="shrink-0 text-text-secondary" />
                </button>

                {draftType === "expense" ? (
                  <FinanceFormField
                    label="Parent category"
                    htmlFor="create-category-parent"
                    hint="Optional. Use a parent only when this is a subcategory."
                  >
                    <select
                      id="create-category-parent"
                      value={draftParentId}
                      onChange={(event) => setDraftParentId(event.target.value)}
                      className="field-input min-h-11 w-full"
                    >
                      <option value="">Top level</option>
                      {topLevelExpenseCategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </FinanceFormField>
                ) : null}
              </FinanceModalBody>

              <FinanceModalFooter>
                <Button
                  type="submit"
                  size="lg"
                  disabled={!draftName.trim() || workingAction === "create"}
                  className="w-full"
                >
                  {workingAction === "create" ? (
                    <Loader2 size={17} className="animate-spin" />
                  ) : (
                    <Plus size={17} />
                  )}
                  {workingAction === "create" ? "Creating..." : "Create category"}
                </Button>
              </FinanceModalFooter>
            </form>
          ) : (
            <FinanceModalBody className="space-y-3 sm:space-y-3">
              <div className="sticky -top-4 z-10 space-y-3 bg-card pb-2 pt-0 sm:-top-4">
                <div className="grid grid-cols-[minmax(0,1fr)_8.5rem] gap-2">
                  <div className="relative">
                    <Search
                      size={16}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
                      aria-hidden="true"
                    />
                    <input
                      value={managerQuery}
                      onChange={(event) => setManagerQuery(event.target.value)}
                      placeholder="Search categories"
                      aria-label="Search categories"
                      className="field-input min-h-10 w-full pl-9"
                    />
                  </div>
                  <div className="relative">
                    <SlidersHorizontal
                      size={14}
                      className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary"
                      aria-hidden="true"
                    />
                    <select
                      value={sortMode}
                      onChange={(event) =>
                        setSortMode(event.target.value as CategorySort)
                      }
                      aria-label="Sort categories"
                      className="field-input min-h-10 w-full pl-8 text-xs font-bold"
                    >
                      <option value="name">A–Z</option>
                      <option value="usage">Most used</option>
                      <option value="newest">Newest</option>
                    </select>
                  </div>
                </div>

                <Tabs
                  value={activeTab}
                  onValueChange={(value: string) =>
                    setActiveTab(value as CategoryKind)
                  }
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="income">
                      Income ({categories.filter((item) => item.type === "income").length})
                    </TabsTrigger>
                    <TabsTrigger value="expense">
                      Expense ({categories.filter((item) => item.type === "expense").length})
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <Tabs value={activeTab} onValueChange={() => undefined}>
                <TabsContent value="income" className="mt-0">
                  <CategoryList type="income" />
                </TabsContent>
                <TabsContent value="expense" className="mt-0">
                  <CategoryList type="expense" />
                </TabsContent>
              </Tabs>
            </FinanceModalBody>
          )}
        </DialogContent>
      </Dialog>

      <CategoryAppearancePicker
        open={appearanceTarget === "create"}
        onOpenChange={(open) => setAppearanceTarget(open ? "create" : null)}
        type={draftType}
        categoryName={draftName}
        value={resolvedDraftVisual}
        onApply={(visual) => {
          setDraftVisual(visual);
          setDraftVisualTouched(true);
        }}
      />

      <Sheet
        open={detailCategory !== null}
        onOpenChange={(open) => {
          if (!open && !workingAction) closeDetails();
        }}
      >
        <SheetContent
          side="bottom"
          className="mx-auto max-h-[min(92svh,46rem)] w-full max-w-2xl gap-0 overflow-hidden rounded-t-[28px] border-x border-t border-border bg-card p-0"
        >
          {detailCategory ? (
            <form onSubmit={saveCategory} className="flex min-h-0 flex-1 flex-col">
              <SheetHeader className="border-b border-border px-4 py-4 pr-14 sm:px-5">
                <div className="flex min-w-0 items-center gap-3">
                  <CategoryVisualIcon
                    color={editVisual.color}
                    iconKey={editVisual.iconKey}
                    label={editName || detailCategory.name}
                    size="md"
                  />
                  <div className="min-w-0">
                    <SheetTitle className="truncate text-base font-black text-text-primary">
                      {detailCategory.name}
                    </SheetTitle>
                    <SheetDescription className="mt-0.5 text-xs text-text-secondary">
                      {detailUsageCount} {detailUsageCount === 1 ? "transaction" : "transactions"}
                      {detailChildCount > 0
                        ? ` · ${detailChildCount} subcategories`
                        : ""}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-5">
                <FinanceFormField label="Category name" htmlFor="edit-category-name">
                  <input
                    id="edit-category-name"
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                    maxLength={80}
                    className="field-input min-h-11 w-full"
                  />
                </FinanceFormField>

                <button
                  type="button"
                  onClick={() => setAppearanceTarget("edit")}
                  className="finance-focus flex w-full min-w-0 items-center gap-3 rounded-[16px] border border-border bg-surface-secondary px-3.5 py-3 text-left transition-colors hover:border-active/25 hover:bg-hover"
                >
                  <CategoryVisualIcon
                    color={editVisual.color}
                    iconKey={editVisual.iconKey}
                    label={editName || detailCategory.name}
                    size="sm"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-text-primary">
                      Icon and color
                    </span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-xs text-text-secondary">
                      <CategoryColorDot color={editVisual.color} />
                      Change appearance
                    </span>
                  </span>
                  <Palette size={17} className="shrink-0 text-text-secondary" />
                </button>

                <FinanceFormField
                  label="Category type"
                  hint={
                    detailCanChangeType
                      ? "Type can change because this category is unused."
                      : "Type is locked to protect linked transactions and subcategories."
                  }
                >
                  <TypeSelector
                    value={editType}
                    onChange={(type) => {
                      setEditType(type);
                      if (type === "income") setEditParentId("");
                    }}
                    disabled={!detailCanChangeType}
                  />
                </FinanceFormField>

                {editType === "expense" ? (
                  <FinanceFormField
                    label="Parent category"
                    htmlFor="edit-category-parent"
                  >
                    <select
                      id="edit-category-parent"
                      value={editParentId}
                      onChange={(event) => setEditParentId(event.target.value)}
                      className="field-input min-h-11 w-full"
                    >
                      <option value="">Top level</option>
                      {topLevelExpenseCategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </FinanceFormField>
                ) : null}

                <div className="rounded-[16px] border border-border bg-surface-secondary p-3.5">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-text-secondary">
                    Data safety
                  </p>
                  <p className="mt-1.5 text-xs leading-5 text-text-secondary">
                    Renaming, recoloring, or changing the icon keeps every existing
                    transaction and report linked to this category.
                  </p>
                </div>

                <div className="grid gap-2 border-t border-border pt-4 sm:grid-cols-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void archiveCategory(detailCategory)}
                    disabled={Boolean(workingAction)}
                    className="w-full"
                  >
                    {workingAction === `archive:${detailCategory.id}` ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Archive size={15} />
                    )}
                    Archive category
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => requestCategoryDelete(detailCategory)}
                    disabled={!detailCanDelete || Boolean(workingAction)}
                    className="w-full text-danger hover:text-danger"
                  >
                    <Trash2 size={15} /> Delete permanently
                  </Button>
                </div>
              </div>

              <SheetFooter className="border-t border-border bg-card px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-5">
                <Button
                  type="submit"
                  size="lg"
                  disabled={!editName.trim() || Boolean(workingAction)}
                  className="w-full"
                >
                  {workingAction === `save:${detailCategory.id}` ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Check size={16} />
                  )}
                  {workingAction === `save:${detailCategory.id}`
                    ? "Saving..."
                    : "Save changes"}
                </Button>
              </SheetFooter>
            </form>
          ) : null}
        </SheetContent>
      </Sheet>

      <CategoryAppearancePicker
        open={appearanceTarget === "edit" && detailCategory !== null}
        onOpenChange={(open) => setAppearanceTarget(open ? "edit" : null)}
        type={editType}
        categoryName={editName}
        value={editVisual}
        onApply={setEditVisual}
      />

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(nextOpen: boolean) => {
          if (!nextOpen && !workingAction) {
            setPendingDelete(null);
            setDeleteFeedback(null);
          }
        }}
      >
        <DialogContent className="rounded-3xl p-5 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {pendingDelete?.name} permanently?</DialogTitle>
            <DialogDescription>
              This is available only when no transaction or subcategory uses it.
              Archiving is safer and keeps historical data intact.
            </DialogDescription>
          </DialogHeader>
          {deleteFeedback ? (
            <p role="alert" className="text-xs font-semibold text-danger">
              {deleteFeedback}
            </p>
          ) : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPendingDelete(null);
                setDeleteFeedback(null);
              }}
              disabled={Boolean(workingAction)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void confirmCategoryDelete()}
              disabled={Boolean(workingAction)}
              className="bg-danger text-[var(--status-foreground)] hover:bg-danger/90"
            >
              {workingAction?.startsWith("delete:") ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Trash2 size={16} />
              )}
              {workingAction?.startsWith("delete:") ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
