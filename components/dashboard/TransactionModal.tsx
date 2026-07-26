"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import DatePicker from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import AccountSelect from "@/components/accounts/AccountSelect";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { getAppDateKey } from "@/lib/dates";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import TouchWheelPicker, {
  useTouchWheelPickerMode,
} from "@/components/ui/touch-wheel-picker";
import { useScrollSelectBehavior } from "@/components/ui/use-scroll-select-behavior";
import scrollSelectStyles from "@/components/ui/ScrollSelect.module.css";
import {
  FinanceModalBody,
  FinanceModalFooter,
  FinanceFormField,
  financeErrorClass,
  financeModalContentClass,
} from "@/components/ui/finance-modal";
import { toast } from "sonner";
import { getEditableMoneyValue } from "@/lib/currency-input";
import {
  CategoryVisualIcon,
  getCategoryVisual,
  type CategoryVisualSource,
} from "@/lib/category-visuals";
import { getUserMutationError } from "@/lib/user-errors";

import styles from "./TransactionModal.module.css";

interface Category extends CategoryVisualSource {
  id: string;
  name: string;
  type: "income" | "expense";
  color: string | null;
  icon_key: string | null;
  parent_id?: string | null;
}

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
}

export interface ExistingTransaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  amount_original?: number | string | null;
  currency?: string | null;
  exchange_rate_to_pkr?: number | string | null;
  category_id: string;
  account_id: string;
  date: string;
  note: string | null;
  source_name?: string | null;
  person_name?: string | null;
  item_name?: string | null;
  reference?: string | null;
}

interface Props {
  open: boolean;
  defaultType: "income" | "expense";
  onClose: () => void;
  onSuccess: () => void;
  transaction?: ExistingTransaction;
}

interface CategoryOption {
  category: Category;
  label: string;
  parentLabel?: string;
  depth: number;
}

function formatEditableAmount(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "";
  return value.toFixed(8).replace(/\.?0+$/, "");
}

function CategorySummary({
  option,
  placeholder,
}: {
  option?: CategoryOption;
  placeholder: string;
}) {
  if (!option) {
    return (
      <span className="flex min-w-0 flex-1 items-center gap-3 text-text-secondary">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-border bg-surface-secondary text-text-tertiary">
          <span className="size-2.5 rounded-full bg-text-tertiary" />
        </span>
        <span className="truncate">{placeholder}</span>
      </span>
    );
  }

  return (
    <span className="flex min-w-0 flex-1 items-center gap-3 text-left">
      <CategoryVisualIcon category={option.category} size="sm" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-text-primary">
          {option.label}
        </span>
        <span className="block truncate text-[11px] font-medium text-text-secondary">
          {option.parentLabel ? "Child category" : "Parent category"}
        </span>
      </span>
    </span>
  );
}

export default function TransactionModal({
  open,
  defaultType,
  onClose,
  onSuccess,
  transaction,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const isEditing = !!transaction;
  const { currency, rates, ratesReady } = useCurrency();

  const [type, setType] = useState<"income" | "expense">(defaultType);
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [date, setDate] = useState(getAppDateKey());
  const [note, setNote] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [personName, setPersonName] = useState("");
  const [itemName, setItemName] = useState("");
  const [reference, setReference] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const touchPickerMode = useTouchWheelPickerMode(true);

  useEffect(() => {
    if (!open) return;
    setCategoryOpen(false);
    if (transaction) {
      const editableAmount = getEditableMoneyValue({
        amountPkr: transaction.amount,
        originalAmount: transaction.amount_original,
        originalCurrency: transaction.currency,
        displayCurrency: currency,
        rates,
      });

      setType(transaction.type);
      setAmount(formatEditableAmount(editableAmount));
      setCategoryId(transaction.category_id || "");
      setAccountId(transaction.account_id || "");
      setDate(transaction.date);
      setNote(transaction.note || "");
      setSourceName(transaction.source_name || "");
      setPersonName(transaction.person_name || "");
      setItemName(transaction.item_name || "");
      setReference(transaction.reference || "");
    } else {
      setType(defaultType);
      setAmount("");
      setCategoryId("");
      setAccountId("");
      setDate(getAppDateKey());
      setNote("");
      setSourceName("");
      setPersonName("");
      setItemName("");
      setReference("");
    }
    setError("");
  }, [currency, defaultType, open, rates, transaction]);

  useEffect(() => {
    if (touchPickerMode) setCategoryOpen(false);
  }, [touchPickerMode]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function load() {
      setLoadingOptions(true);
      setError("");
      setCategories([]);
      setCategoryId("");
      const [
        { data: cats, error: catsError },
        { data: accs, error: accsError },
      ] = await Promise.all([
        supabase
          .from("categories")
          .select("id, name, type, color, icon_key, parent_id")
          .eq("type", type)
          .is("archived_at", null)
          .order("parent_id", { ascending: true, nullsFirst: true })
          .order("name"),
        supabase
          .from("accounts")
          .select("id, name, type, balance")
          .eq("status", "active")
          .order("name"),
      ]);
      if (cancelled) return;
      setLoadingOptions(false);

      if (catsError || accsError) {
        setCategories([]);
        setAccounts([]);
        setCategoryId("");
        setAccountId("");
        setError(
          "Categories or accounts could not be loaded. Check your connection and try again.",
        );
        return;
      }

      const nextCategories = ((cats || []) as Category[]).filter(
        (category) => category.type === type,
      );
      const nextAccounts = (accs || []) as Account[];
      setCategories(nextCategories);
      setAccounts(nextAccounts);
      setCategoryId((current) => {
        const preferred = transaction?.category_id || current;
        return nextCategories.some((category) => category.id === preferred)
          ? preferred
          : nextCategories[0]?.id || "";
      });
      setAccountId((current) => {
        const preferred = transaction?.account_id || current;
        return nextAccounts.some((account) => account.id === preferred)
          ? preferred
          : nextAccounts[0]?.id || "";
      });
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [open, supabase, transaction?.account_id, transaction?.category_id, type]);

  async function handleSave() {
    if (loading) return;

    if (loadingOptions) {
      setError("Please wait while categories and accounts load.");
      return;
    }

    if (!amount || !categoryId || !accountId) {
      setError("Please fill in all required fields.");
      return;
    }

    if (!date) {
      setError("Enter a valid date as DD/MM/YYYY.");
      return;
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Enter an amount greater than 0.");
      return;
    }
    if (currency !== "PKR" && !ratesReady) {
      setError("Exchange rates are unavailable. The transaction was not saved.");
      return;
    }

    setLoading(true);
    setError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("Not logged in. Please sign in again.");
      toast.error("Please sign in again");
      setLoading(false);
      return;
    }

    const payload = {
      user_id: user.id,
      type,
      amount: parsedAmount,
      category_id: categoryId,
      account_id: accountId,
      date,
      note: note.trim() || null,
      source_name: type === "income" ? sourceName.trim() || null : null,
      person_name: personName.trim() || null,
      item_name: itemName.trim() || null,
      reference: reference.trim() || null,
    };

    const { error: saveError } = isEditing
      ? await supabase
          .from("transactions")
          .update(payload)
          .eq("id", transaction!.id)
      : await supabase.from("transactions").insert(payload);

    setLoading(false);

    if (saveError) {
      setError(
        getUserMutationError(
          saveError,
          "Transaction could not be saved. Try again.",
        ),
      );
      toast.error("Failed to save transaction");
      return;
    }

    setAmount("");
    setNote("");
    setError("");
    toast.success(isEditing ? "Transaction updated!" : "Transaction saved!");
    onSuccess();
  }

  const isIncome = type === "income";
  const btnLabel = loading
    ? "Saving..."
    : isEditing
      ? `Update ${isIncome ? "Income" : "Expense"}`
      : `Add ${isIncome ? "Income" : "Expense"}`;
  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );
  const categoryOptions = useMemo<CategoryOption[]>(() => {
    const sortedCategories = [...categories].sort((first, second) =>
      first.name.localeCompare(second.name),
    );
    const childrenByParent = sortedCategories.reduce<Record<string, Category[]>>(
      (grouped, category) => {
        if (!category.parent_id) return grouped;
        const parent = categoryById.get(category.parent_id);
        if (!parent || parent.type !== category.type) return grouped;

        grouped[category.parent_id] = [
          ...(grouped[category.parent_id] ?? []),
          category,
        ];
        return grouped;
      },
      {},
    );
    const roots = sortedCategories.filter((category) => {
      if (!category.parent_id) return true;
      const parent = categoryById.get(category.parent_id);
      return !parent || parent.type !== category.type;
    });

    return roots.flatMap((category) => {
      const rootOption: CategoryOption = {
        category,
        label: category.name,
        depth: 0,
      };
      const childOptions = (childrenByParent[category.id] ?? []).map(
        (child) => ({
          category: child,
          label: `${category.name} / ${child.name}`,
          parentLabel: category.name,
          depth: 1,
        }),
      );

      return [rootOption, ...childOptions];
    });
  }, [categories, categoryById]);
  const selectedCategoryOption = categoryOptions.find(
    (option) => option.category.id === categoryId,
  );
  const {
    contentRef: categoryContentRef,
    isTouchScrollOnly: isCategoryTouchScrollOnly,
    onContentScroll: handleCategoryContentScroll,
    onContentTouchMove: handleCategoryContentTouchMove,
    onContentTouchStart: handleCategoryContentTouchStart,
    onContentWheel: handleCategoryContentWheel,
    onTriggerWheel: handleCategoryTriggerWheel,
  } = useScrollSelectBehavior({
    open: categoryOpen,
    value: categoryId,
    values: categoryOptions.map((option) => option.category.id),
    onValueChange: setCategoryId,
  });
  const typeLocked = !isEditing;
  const formTitle = isEditing
    ? `Edit ${isIncome ? "Income" : "Expense"}`
    : isIncome
      ? "Income"
      : "Expense";
  const categoryPlaceholder = loadingOptions
    ? "Loading categories..."
    : `Select ${isIncome ? "income" : "expense"} category`;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent
        className={`${financeModalContentClass} ${styles.dialog}`}
        style={{
          "--transaction-accent": isIncome ? "var(--income)" : "var(--expense)",
        } as React.CSSProperties}
      >
        <DialogHeader className={styles.header}>
          <DialogTitle className={styles.title}>{formTitle}</DialogTitle>
          <DialogDescription className="sr-only">
            Enter amount, account, category, date, and an optional note.
          </DialogDescription>
        </DialogHeader>

        <FinanceModalBody className={styles.body}>
          {!typeLocked && (
            <div className={styles.typeSwitch}>
              {(["income", "expense"] as const).map((nextType) => (
                <Button
                  key={nextType}
                  type="button"
                  variant="ghost"
                  onClick={() => setType(nextType)}
                  aria-pressed={type === nextType}
                  className={`${styles.typeButton} ${
                    type === nextType
                      ? nextType === "income"
                        ? "bg-income-soft text-income"
                        : "bg-expense-soft text-expense"
                      : "text-text-secondary hover:bg-hover hover:text-text-primary"
                  }`}
                >
                  {nextType === "income" ? "Income" : "Expense"}
                </Button>
              ))}
            </div>
          )}

          <FinanceFormField
            label={`Amount (${currency})`}
            htmlFor="transaction-amount"
            className={styles.amountField}
          >
            <Input
              id="transaction-amount"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0"
              className={styles.amountInput}
            />
          </FinanceFormField>

          <FinanceFormField label="Account" className={styles.accountField}>
            <AccountSelect
              value={accountId}
              onValueChange={setAccountId}
              accounts={accounts}
              loading={loadingOptions}
              placeholder="Select account"
              className={styles.compactSelect}
              scrollPicker
            />
          </FinanceFormField>

          <FinanceFormField
            label="Category"
            htmlFor="transaction-category"
            className={styles.categoryField}
          >
            {touchPickerMode ? (
              <TouchWheelPicker
                id="transaction-category"
                value={categoryId}
                onValueChange={setCategoryId}
                options={categoryOptions.map((option) => ({
                  value: option.category.id,
                  ariaLabel: option.label,
                  content: (
                    <CategorySummary
                      option={option}
                      placeholder={categoryPlaceholder}
                    />
                  ),
                }))}
                ariaLabel={`${isIncome ? "Income" : "Expense"} category`}
                disabled={loadingOptions || categoryOptions.length === 0}
                className={`field-input h-auto w-full gap-3 px-3 pr-3 text-left ${styles.categoryTrigger}`}
                itemClassName="px-3"
                emptyContent={
                  <CategorySummary
                    option={selectedCategoryOption}
                    placeholder={categoryPlaceholder}
                  />
                }
              />
            ) : (
              <Select
                value={categoryId}
                onValueChange={(nextValue) => {
                  if (nextValue) setCategoryId(nextValue);
                }}
                disabled={loadingOptions || categoryOptions.length === 0}
                open={categoryOpen}
                onOpenChange={setCategoryOpen}
              >
                <SelectTrigger
                  id="transaction-category"
                  aria-label={`${isIncome ? "Income" : "Expense"} category`}
                  aria-describedby="transaction-category-help"
                  onWheel={handleCategoryTriggerWheel}
                  className={`field-input h-auto w-full gap-3 px-3 pr-3 text-left data-placeholder:text-text-secondary [&>svg]:ml-1 ${styles.categoryTrigger} ${scrollSelectStyles.trigger}`}
                >
                  <CategorySummary
                    option={selectedCategoryOption}
                    placeholder={categoryPlaceholder}
                  />
                </SelectTrigger>
                <SelectContent
                  ref={categoryContentRef}
                  align="start"
                  sideOffset={8}
                  alignItemWithTrigger={false}
                  data-scroll-touch={
                    isCategoryTouchScrollOnly ? "true" : undefined
                  }
                  onScroll={handleCategoryContentScroll}
                  onWheel={handleCategoryContentWheel}
                  onTouchStart={handleCategoryContentTouchStart}
                  onTouchMove={handleCategoryContentTouchMove}
                  className={`z-[90] max-h-[min(20rem,var(--available-height))] max-w-[calc(100vw-1.5rem)] rounded-[18px] p-1.5 ${scrollSelectStyles.content}`}
                >
                  {categoryOptions.map((option) => {
                    const visual = getCategoryVisual(option.category);
                    return (
                      <SelectItem
                        key={option.category.id}
                        value={option.category.id}
                        data-scroll-select-value={option.category.id}
                        className={`min-h-16 py-2 pr-8 pl-2.5 ${scrollSelectStyles.item}`}
                      >
                        <span className="flex min-w-0 flex-1 items-center gap-3">
                          <CategoryVisualIcon category={option.category} size="sm" />
                          <span
                            className="min-w-0 flex-1"
                            style={{ paddingLeft: option.depth ? "0.5rem" : 0 }}
                          >
                            <span className="block truncate text-sm font-semibold">
                              {option.label}
                            </span>
                            <span className="block truncate text-[11px] text-text-secondary">
                              {option.parentLabel
                                ? `Under ${option.parentLabel}`
                                : "Parent category"}
                            </span>
                            <span className="sr-only">
                              Category color {visual.color}
                            </span>
                          </span>
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}
            <div id="transaction-category-help">
              {!loadingOptions && categoryOptions.length === 0 ? (
                <div className={styles.emptyCategory}>
                  <p>No {isIncome ? "income" : "expense"} categories yet.</p>
                  <Link
                    href="/dashboard/settings"
                    className="finance-focus mt-1 inline-flex rounded-md font-semibold text-active hover:underline"
                    onClick={onClose}
                  >
                    Open Settings categories
                  </Link>
                </div>
              ) : (
                <p className="sr-only">
                  Category options use their permanently assigned icon and color.
                  Selected items are also marked with a check.
                </p>
              )}
            </div>
          </FinanceFormField>

          <FinanceFormField
            label="Date"
            htmlFor="transaction-date"
            className={styles.dateField}
          >
            <DatePicker
              id="transaction-date"
              value={date}
              onChange={setDate}
              placeholder="DD/MM/YYYY"
              ariaLabel="Transaction date"
              className={styles.dateControl}
            />
          </FinanceFormField>

          <FinanceFormField
            label="Note (Optional)"
            htmlFor="transaction-note"
            className={styles.noteField}
          >
            <Textarea
              id="transaction-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="What was this for?"
              rows={2}
              className={styles.noteInput}
            />
          </FinanceFormField>

          {error && (
            <p className={`${financeErrorClass} ${styles.error}`}>{error}</p>
          )}
        </FinanceModalBody>

        <FinanceModalFooter className={styles.footer}>
          <Button
            type="button"
            onClick={handleSave}
            disabled={
              loading ||
              loadingOptions ||
              (currency !== "PKR" && !ratesReady)
            }
            loading={loading}
            loadingLabel="Saving transaction…"
            className={`${styles.submit} ${
              isIncome ? "success-action" : "danger-action"
            }`}
          >
            {btnLabel}
          </Button>
        </FinanceModalFooter>
      </DialogContent>
    </Dialog>
  );
}
