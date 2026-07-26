import { createBrowserClient } from "@supabase/ssr";

import {
  CURRENCY_STORAGE_KEY,
  EXCHANGE_RATE_STORAGE_KEY,
  FALLBACK_CURRENCY_RATES,
  isSupportedCurrency,
  isValidCurrencyRates,
  type CurrencyRates,
  type SupportedCurrency,
} from "@/lib/currency";
import { prepareMoneyInput } from "@/lib/currency-input";

export const SUPABASE_BROWSER_AUTH_OPTIONS = Object.freeze({
  detectSessionInUrl: false,
} as const);

type JsonRecord = Record<string, unknown>;

type CurrencyContext = {
  currency: SupportedCurrency;
  rates: CurrencyRates | null;
};

type NormalizedPayload =
  | { ok: true; payload: unknown }
  | { ok: false; message: string };

type DestructiveMutationOperation = "delete" | "soft delete";

const RATE_ERROR_MESSAGE =
  "Exchange rates are unavailable. Your financial record was not saved, so no incorrect conversion was applied.";
const PRIVATE_AVATAR_BUCKET = "avatars";
const MUTATION_NOT_APPLIED_CODE = "JF_MUTATION_NOT_APPLIED";
const DESTRUCTIVE_FILTER_REQUIRED_CODE = "JF_DESTRUCTIVE_FILTER_REQUIRED";
const DESTRUCTIVE_FILTER_METHODS = new Set([
  "containedBy",
  "contains",
  "eq",
  "filter",
  "gt",
  "gte",
  "ilike",
  "in",
  "is",
  "like",
  "lt",
  "lte",
  "match",
  "neq",
  "not",
  "or",
  "overlaps",
  "rangeAdjacent",
  "rangeGt",
  "rangeGte",
  "rangeLt",
  "rangeLte",
  "textSearch",
]);

function isUsableCachedSnapshot(value: unknown): value is {
  rates: CurrencyRates;
  source: string;
  updatedAt: string;
} {
  if (!value || typeof value !== "object") return false;

  const candidate = value as {
    rates?: unknown;
    source?: unknown;
    updatedAt?: unknown;
  };
  const updatedAt =
    typeof candidate.updatedAt === "string"
      ? Date.parse(candidate.updatedAt)
      : Number.NaN;

  return (
    isValidCurrencyRates(candidate.rates) &&
    typeof candidate.source === "string" &&
    !candidate.source.startsWith("Built-in emergency") &&
    Number.isFinite(updatedAt) &&
    updatedAt > 0
  );
}

function readCurrencyContext(): CurrencyContext {
  if (typeof window === "undefined") {
    return { currency: "PKR", rates: FALLBACK_CURRENCY_RATES };
  }

  const storedCurrency = window.localStorage.getItem(CURRENCY_STORAGE_KEY);
  const currency = isSupportedCurrency(storedCurrency) ? storedCurrency : "PKR";

  if (currency === "PKR") {
    return { currency, rates: FALLBACK_CURRENCY_RATES };
  }

  try {
    const raw = window.localStorage.getItem(EXCHANGE_RATE_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    if (isUsableCachedSnapshot(parsed)) {
      return { currency, rates: parsed.rates };
    }
  } catch {
    // Missing or malformed cache is handled by the safe failure below.
  }

  return { currency, rates: null };
}

function hasOwn(row: JsonRecord, key: string) {
  return Object.prototype.hasOwnProperty.call(row, key);
}

function normalizeField(
  row: JsonRecord,
  amountField: string,
  metadata: {
    originalField: string;
    currencyField: string;
    rateField: string;
  },
  context: CurrencyContext,
): { ok: true; row: JsonRecord } | { ok: false; message: string } {
  if (!hasOwn(row, amountField)) return { ok: true, row };

  const explicitCurrency = row[metadata.currencyField];
  const inputCurrency = (
    isSupportedCurrency(
      typeof explicitCurrency === "string" ? explicitCurrency : null,
    )
      ? explicitCurrency
      : context.currency
  ) as SupportedCurrency;
  const originalValue = hasOwn(row, metadata.originalField)
    ? row[metadata.originalField]
    : row[amountField];

  let rates = context.rates;
  const explicitRate = Number(row[metadata.rateField]);
  if (
    Number.isFinite(explicitRate) &&
    explicitRate > 0 &&
    inputCurrency !== "PKR"
  ) {
    rates = {
      ...FALLBACK_CURRENCY_RATES,
      [inputCurrency]: FALLBACK_CURRENCY_RATES.PKR / explicitRate,
    };
  }

  if (!rates && inputCurrency !== "PKR") {
    return { ok: false, message: RATE_ERROR_MESSAGE };
  }

  const prepared = prepareMoneyInput(
    originalValue as string | number | null | undefined,
    inputCurrency,
    rates ?? FALLBACK_CURRENCY_RATES,
  );
  if (!prepared) {
    return {
      ok: false,
      message: "The amount or exchange rate is invalid. Nothing was saved.",
    };
  }

  const lockedRate =
    Number.isFinite(explicitRate) && explicitRate > 0
      ? explicitRate
      : prepared.exchangeRateToPkr;
  const canonicalAmount = prepared.originalAmount * lockedRate;
  if (!Number.isFinite(canonicalAmount)) {
    return {
      ok: false,
      message: "The converted amount is invalid. Nothing was saved.",
    };
  }

  return {
    ok: true,
    row: {
      ...row,
      [amountField]: canonicalAmount,
      [metadata.originalField]: prepared.originalAmount,
      [metadata.currencyField]: inputCurrency,
      [metadata.rateField]: lockedRate,
    },
  };
}

function normalizeFinancialMutation(
  table: string,
  row: JsonRecord,
): { ok: true; row: JsonRecord } | { ok: false; message: string } {
  const context = readCurrencyContext();

  switch (table) {
    case "transactions":
      return normalizeField(
        row,
        "amount",
        {
          originalField: "amount_original",
          currencyField: "currency",
          rateField: "exchange_rate_to_pkr",
        },
        context,
      );

    case "account_transfers":
      return normalizeField(
        row,
        "amount",
        {
          originalField: "amount_original",
          currencyField: "currency",
          rateField: "exchange_rate_to_pkr",
        },
        context,
      );

    case "accounts":
      return normalizeField(
        row,
        "balance",
        {
          originalField: "opening_balance_original",
          currencyField: "opening_currency",
          rateField: "opening_exchange_rate_to_pkr",
        },
        context,
      );

    case "goals":
      return normalizeField(
        row,
        "target_amount",
        {
          originalField: "target_amount_original",
          currencyField: "currency",
          rateField: "exchange_rate_to_pkr",
        },
        context,
      );

    case "goal_contributions":
      return normalizeField(
        row,
        "amount",
        {
          originalField: "amount_original",
          currencyField: "currency",
          rateField: "exchange_rate_to_pkr",
        },
        context,
      );

    case "liability_payments":
      return normalizeField(
        row,
        "amount",
        {
          originalField: "amount_original",
          currencyField: "currency",
          rateField: "exchange_rate_to_pkr",
        },
        context,
      );

    case "liabilities": {
      const principal = normalizeField(
        row,
        "original_value",
        {
          originalField: "original_value_input",
          currencyField: "currency",
          rateField: "exchange_rate_to_pkr",
        },
        context,
      );
      if (!principal.ok) return principal;

      let next = principal.row;
      for (const field of ["paid_amount", "remaining_amount"] as const) {
        if (!hasOwn(row, field)) continue;

        const value = prepareMoneyInput(
          row[field] as string | number | null | undefined,
          context.currency,
          context.rates ?? FALLBACK_CURRENCY_RATES,
        );
        if (!value) {
          return {
            ok: false,
            message: "The payable amount is invalid. Nothing was saved.",
          };
        }
        next = { ...next, [field]: value.amountPkr };
      }
      return { ok: true, row: next };
    }

    default:
      return { ok: true, row };
  }
}

function normalizePayload(table: string, payload: unknown): NormalizedPayload {
  if (Array.isArray(payload)) {
    const rows: unknown[] = [];
    for (const row of payload) {
      if (!row || typeof row !== "object") {
        rows.push(row);
        continue;
      }

      const normalized = normalizeFinancialMutation(table, row as JsonRecord);
      if (!normalized.ok) return normalized;
      rows.push(normalized.row);
    }
    return { ok: true, payload: rows };
  }

  if (payload && typeof payload === "object") {
    const normalized = normalizeFinancialMutation(table, payload as JsonRecord);
    return normalized.ok
      ? { ok: true, payload: normalized.row }
      : normalized;
  }

  return { ok: true, payload };
}

function createFailedQuery(message: string) {
  const response = Promise.resolve({
    data: null,
    error: {
      message,
      details: null,
      hint: null,
      code: "JF_CURRENCY_RATE_UNAVAILABLE",
    },
  });

  const proxy: object = new Proxy(
    {},
    {
      get(_target, property) {
        if (property === "then") return response.then.bind(response);
        if (property === "catch") return response.catch.bind(response);
        if (property === "finally") return response.finally.bind(response);
        return () => proxy;
      },
    },
  );

  return proxy;
}

function isDestructiveUpdatePayload(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return false;
  }

  const deletedAt = (payload as JsonRecord).deleted_at;
  return typeof deletedAt === "string" && deletedAt.trim().length > 0;
}

function destructiveFilterRequiredError(
  table: string,
  operation: DestructiveMutationOperation,
) {
  return {
    message: `${operation === "delete" ? "Delete" : "Soft delete"} on ${table} requires an explicit filter.`,
    details: null,
    hint: "Target destructive mutations with an id or another ownership-safe filter.",
    code: DESTRUCTIVE_FILTER_REQUIRED_CODE,
  };
}

function mutationNotAppliedError(
  table: string,
  operation: DestructiveMutationOperation,
) {
  return {
    message: `${operation === "delete" ? "Delete" : "Soft delete"} did not affect any ${table} row.`,
    details: null,
    hint: "The record may no longer exist or access may have changed.",
    code: MUTATION_NOT_APPLIED_CODE,
  };
}

export function verifyDestructiveMutationResult(
  result: unknown,
  table: string,
  operation: DestructiveMutationOperation,
) {
  if (!result || typeof result !== "object") return result;

  const response = result as {
    data?: unknown;
    error?: unknown;
    [key: string]: unknown;
  };
  if (response.error) return result;

  const affected = Array.isArray(response.data)
    ? response.data.length > 0
    : response.data !== null && response.data !== undefined;
  if (affected) return result;

  return {
    ...response,
    data: null,
    error: mutationNotAppliedError(table, operation),
  };
}

function addMutationReceipt<T extends object>(builder: T): T {
  const select = Reflect.get(builder, "select", builder);
  if (typeof select !== "function") return builder;

  const selected = Reflect.apply(select, builder, ["id"]);
  return selected && typeof selected === "object" ? (selected as T) : builder;
}

function resolveVerifiedMutation(
  table: string,
  operation: DestructiveMutationOperation,
  builder: object,
  hasReceipt: boolean,
  hasFilter: boolean,
) {
  if (!hasFilter) {
    return Promise.resolve({
      data: null,
      error: destructiveFilterRequiredError(table, operation),
    });
  }

  const query = hasReceipt ? builder : addMutationReceipt(builder);
  return Promise.resolve(query as PromiseLike<unknown>).then((result) =>
    verifyDestructiveMutationResult(result, table, operation),
  );
}

function wrapVerifiedMutationQuery<T extends object>(
  table: string,
  operation: DestructiveMutationOperation,
  builder: T,
  hasReceipt = false,
  hasFilter = false,
): T {
  return new Proxy(builder, {
    get(target, property, receiver) {
      if (property === "then") {
        return (
          onFulfilled?: (value: unknown) => unknown,
          onRejected?: (reason: unknown) => unknown,
        ) =>
          resolveVerifiedMutation(
            table,
            operation,
            target,
            hasReceipt,
            hasFilter,
          ).then(
            onFulfilled,
            onRejected,
          );
      }

      if (property === "catch") {
        return (onRejected?: (reason: unknown) => unknown) =>
          resolveVerifiedMutation(
            table,
            operation,
            target,
            hasReceipt,
            hasFilter,
          ).catch(onRejected);
      }

      if (property === "finally") {
        return (onFinally?: () => void) =>
          resolveVerifiedMutation(
            table,
            operation,
            target,
            hasReceipt,
            hasFilter,
          ).finally(onFinally);
      }

      const value = Reflect.get(target, property, receiver);
      if (typeof value !== "function") return value;

      return (...args: unknown[]) => {
        const next = Reflect.apply(value, target, args);
        return next && typeof next === "object"
          ? wrapVerifiedMutationQuery(
              table,
              operation,
              next as object,
              hasReceipt || property === "select",
              hasFilter ||
                (typeof property === "string" &&
                  DESTRUCTIVE_FILTER_METHODS.has(property)),
            )
          : next;
      };
    },
  });
}

function wrapTableBuilder<T extends object>(table: string, builder: T): T {
  return new Proxy(builder, {
    get(target, property, receiver) {
      if (property === "delete") {
        const method = Reflect.get(target, property, target) as (
          options?: unknown,
        ) => object;

        return (options?: unknown) =>
          wrapVerifiedMutationQuery(
            table,
            "delete",
            method.call(target, options),
          );
      }

      if (
        property === "insert" ||
        property === "update" ||
        property === "upsert"
      ) {
        const method = Reflect.get(target, property, target) as (
          payload: unknown,
          options?: unknown,
        ) => object;

        return (payload: unknown, options?: unknown) => {
          const normalized = normalizePayload(table, payload);
          if (!normalized.ok) return createFailedQuery(normalized.message);

          const query = method.call(target, normalized.payload, options);
          if (
            property === "update" &&
            isDestructiveUpdatePayload(normalized.payload)
          ) {
            return wrapVerifiedMutationQuery(table, "soft delete", query);
          }

          return query;
        };
      }

      const value = Reflect.get(target, property, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

function privateAvatarUrl(path: string) {
  return `/api/profile/avatar?path=${encodeURIComponent(path)}`;
}

function wrapStorageBucket<T extends object>(bucket: string, builder: T): T {
  if (bucket !== PRIVATE_AVATAR_BUCKET) return builder;

  return new Proxy(builder, {
    get(target, property, receiver) {
      if (property === "getPublicUrl") {
        return (path: string) => ({
          data: { publicUrl: privateAvatarUrl(path) },
        });
      }

      if (property === "upload") {
        return async (path: string, body: unknown) => {
          if (!(body instanceof Blob)) {
            return {
              data: null,
              error: {
                message: "Choose a valid avatar image.",
                name: "StorageUnknownError",
                statusCode: "400",
              },
            };
          }
          const form = new FormData();
          const filename =
            body instanceof File
              ? body.name
              : path.slice(path.lastIndexOf("/") + 1) || "avatar";
          form.set("file", body, filename);
          const response = await fetch("/api/profile/avatar", {
            method: "POST",
            body: form,
            credentials: "same-origin",
            cache: "no-store",
          });
          const result = (await response.json().catch(() => null)) as
            | { path?: string; message?: string }
            | null;
          if (!response.ok || !result?.path) {
            return {
              data: null,
              error: {
                message: result?.message ?? "The avatar could not be uploaded.",
                name: "StorageApiError",
                statusCode: String(response.status),
              },
            };
          }
          return {
            data: {
              path: result.path,
              fullPath: `${PRIVATE_AVATAR_BUCKET}/${result.path}`,
            },
            error: null,
          };
        };
      }

      const value = Reflect.get(target, property, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

function wrapStorage<T extends object>(storage: T): T {
  return new Proxy(storage, {
    get(target, property, receiver) {
      if (property === "from") {
        const from = Reflect.get(target, property, target) as (
          bucket: string,
        ) => object;

        return (bucket: string) =>
          wrapStorageBucket(bucket, from.call(target, bucket));
      }

      const value = Reflect.get(target, property, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase browser configuration is unavailable.");
  }

  const client = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: SUPABASE_BROWSER_AUTH_OPTIONS,
  });
  const privateStorage = wrapStorage(client.storage as unknown as object);

  return new Proxy(client, {
    get(target, property, receiver) {
      if (property === "from") {
        return (table: string) =>
          wrapTableBuilder(
            table,
            target.from(table as never) as unknown as object,
          );
      }

      if (property === "storage") {
        return privateStorage;
      }

      const value = Reflect.get(target, property, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  }) as typeof client;
}
