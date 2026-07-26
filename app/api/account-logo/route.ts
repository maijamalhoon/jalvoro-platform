import { NextRequest, NextResponse } from "next/server";

import {
  detectAccountBrand,
  shouldAttemptAccountLogo,
} from "@/lib/account-identity";

const USER_AGENT =
  "JALVORO/1.0 (account logo resolver; https://github.com/maijamalhoon/jalvoro-platform)";
const CACHE_CONTROL =
  "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000";
const MISS_CACHE_CONTROL =
  "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";
const FINANCIAL_ENTITY_PATTERN =
  /\b(bank|banking|banker|financial|finance|fintech|payments?|wallet|credit union|building society|money transfer|e-?money|credit institution)\b/i;

const GLOBAL_BANK_DOMAINS = [
  {
    domain: "icbc.com.cn",
    patterns: [/^icbc$/i, /industrial\s+and\s+commercial\s+bank\s+of\s+china/i],
  },
  {
    domain: "dbs.com",
    patterns: [/^dbs(?:\s+bank)?$/i, /development\s+bank\s+of\s+singapore/i],
  },
  {
    domain: "ocbc.com",
    patterns: [/^ocbc(?:\s+bank)?$/i, /oversea[-\s]+chinese\s+banking\s+corporation/i],
  },
  {
    domain: "uobgroup.com",
    patterns: [/^uob(?:\s+bank)?$/i, /united\s+overseas\s+bank/i],
  },
  {
    domain: "rbc.com",
    patterns: [/^rbc(?:\s+bank)?$/i, /royal\s+bank\s+of\s+canada/i],
  },
  {
    domain: "td.com",
    patterns: [/^td(?:\s+bank)?$/i, /toronto[-\s]+dominion/i],
  },
  {
    domain: "bmo.com",
    patterns: [/^bmo(?:\s+bank)?$/i, /bank\s+of\s+montreal/i],
  },
  {
    domain: "cibc.com",
    patterns: [/^cibc$/i, /canadian\s+imperial\s+bank\s+of\s+commerce/i],
  },
  {
    domain: "commbank.com.au",
    patterns: [/^cba$/i, /commonwealth\s+bank\s+of\s+australia/i],
  },
  {
    domain: "nab.com.au",
    patterns: [/^nab$/i, /national\s+australia\s+bank/i],
  },
  {
    domain: "anz.com",
    patterns: [/^anz$/i, /australia\s+and\s+new\s+zealand\s+banking\s+group/i],
  },
  {
    domain: "westpac.com.au",
    patterns: [/^westpac$/i, /westpac\s+banking\s+corporation/i],
  },
  {
    domain: "sbi.co.in",
    patterns: [/^sbi$/i, /state\s+bank\s+of\s+india/i],
  },
  {
    domain: "hdfcbank.com",
    patterns: [/^hdfc(?:\s+bank)?$/i, /housing\s+development\s+finance\s+corporation\s+bank/i],
  },
  {
    domain: "icicibank.com",
    patterns: [/^icici(?:\s+bank)?$/i, /industrial\s+credit\s+and\s+investment\s+corporation\s+of\s+india/i],
  },
  {
    domain: "axisbank.com",
    patterns: [/^axis(?:\s+bank)?$/i],
  },
  {
    domain: "mufg.jp",
    patterns: [/^mufg$/i, /mitsubishi\s+ufj\s+financial\s+group/i],
  },
  {
    domain: "smbc.co.jp",
    patterns: [/^smbc$/i, /sumitomo\s+mitsui\s+banking\s+corporation/i],
  },
  {
    domain: "maybank.com",
    patterns: [/^maybank$/i, /malayan\s+banking/i],
  },
  {
    domain: "cimb.com",
    patterns: [/^cimb$/i, /commerce\s+international\s+merchant\s+bankers/i],
  },
] as const;

type WikidataSearchResult = {
  id?: string;
  label?: string;
  description?: string;
  aliases?: string[];
};

type WikidataSearchResponse = {
  search?: WikidataSearchResult[];
};

type WikidataClaim = {
  rank?: string;
  mainsnak?: {
    datavalue?: {
      value?: unknown;
    };
  };
};

type WikidataEntity = {
  claims?: Record<string, WikidataClaim[]>;
};

type WikidataEntityResponse = {
  entities?: Record<string, WikidataEntity>;
};

type ClearbitCompany = {
  name?: string;
  domain?: string;
};

type ResolvedWikidataIdentity = {
  domain: string | null;
  logoUrl: string | null;
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function compact(value: string) {
  return normalize(value).replace(/\s+/g, "");
}

function cleanSearchName(value: string) {
  const cleaned = value
    .replace(
      /\b(savings?|current|salary|personal|business|corporate|account|wallet)\b/gi,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();

  return cleaned.length >= 2 ? cleaned : value.trim();
}

function getTokens(value: string) {
  const ignored = new Set([
    "the",
    "of",
    "and",
    "for",
    "de",
    "la",
    "limited",
    "ltd",
    "plc",
    "inc",
    "company",
    "financial",
    "finance",
    "services",
    "group",
    "holdings",
  ]);

  return normalize(value)
    .split(" ")
    .filter((token) => token.length > 1 && !ignored.has(token));
}

function getAcronyms(value: string) {
  const joiners = new Set(["the", "of", "and", "for", "de", "la"]);
  const corporateSuffixes = new Set([
    "limited",
    "ltd",
    "plc",
    "inc",
    "company",
    "group",
    "holdings",
  ]);
  const tokens = normalize(value)
    .split(" ")
    .filter((token) => token && !joiners.has(token));
  const withoutSuffixes = tokens.filter(
    (token) => !corporateSuffixes.has(token),
  );

  return new Set(
    [tokens, withoutSuffixes]
      .map((parts) => parts.map((part) => part[0]).join(""))
      .filter((value) => value.length >= 2),
  );
}

function isLikelyFinancialEntity(name: string, description = "") {
  return FINANCIAL_ENTITY_PATTERN.test(`${name} ${description}`);
}

function scoreMatch(query: string, candidate: string, description = "") {
  const normalizedQuery = normalize(query);
  const normalizedCandidate = normalize(candidate);
  const compactQuery = compact(query);
  const compactCandidate = compact(candidate);

  if (!normalizedCandidate || !compactQuery) return 0;
  if (
    normalizedCandidate === normalizedQuery ||
    compactCandidate === compactQuery
  ) {
    return 140;
  }

  let score = 0;
  if (getAcronyms(candidate).has(compactQuery)) score = Math.max(score, 125);

  if (
    normalizedCandidate.includes(normalizedQuery) ||
    normalizedQuery.includes(normalizedCandidate)
  ) {
    score += 45;
  }

  const queryTokens = getTokens(query);
  const candidateTokens = new Set(getTokens(candidate));
  const overlap = queryTokens.filter((token) => candidateTokens.has(token)).length;
  score += overlap * 18;

  if (isLikelyFinancialEntity(candidate, description)) score += 15;

  return score;
}

function scoreWikidataItem(query: string, item: WikidataSearchResult) {
  const candidates = [item.label ?? "", ...(item.aliases ?? [])].filter(Boolean);
  return candidates.reduce(
    (best, candidate) =>
      Math.max(best, scoreMatch(query, candidate, item.description)),
    0,
  );
}

function getSearchVariants(searchName: string) {
  const cleaned = cleanSearchName(searchName);
  const variants = [cleaned];
  const compactName = compact(cleaned);

  if (
    !FINANCIAL_ENTITY_PATTERN.test(cleaned) &&
    compactName.length >= 2 &&
    compactName.length <= 12
  ) {
    variants.push(`${cleaned} bank`);
  }

  return [...new Set(variants)];
}

function resolveMappedBankDomain(name: string) {
  const cleanName = name.trim();
  return (
    GLOBAL_BANK_DOMAINS.find(({ patterns }) =>
      patterns.some((pattern) => pattern.test(cleanName)),
    )?.domain ?? null
  );
}

function sortedClaims(entity: WikidataEntity, property: string) {
  return [...(entity.claims?.[property] ?? [])].sort((left, right) => {
    if (left.rank === right.rank) return 0;
    if (left.rank === "preferred") return -1;
    if (right.rank === "preferred") return 1;
    return 0;
  });
}

function readCommonsFilename(entity: WikidataEntity) {
  for (const property of ["P154", "P2910"]) {
    for (const claim of sortedClaims(entity, property)) {
      const value = claim.mainsnak?.datavalue?.value;
      if (typeof value === "string" && value.trim()) return value.trim();
    }
  }

  return null;
}

function normalizeWebsiteDomain(value: string) {
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    const domain = url.hostname.replace(/^www\./i, "").toLowerCase();
    return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain) ? domain : null;
  } catch {
    return null;
  }
}

function readOfficialDomain(entity: WikidataEntity) {
  for (const claim of sortedClaims(entity, "P856")) {
    const value = claim.mainsnak?.datavalue?.value;
    if (typeof value !== "string") continue;
    const domain = normalizeWebsiteDomain(value);
    if (domain) return domain;
  }

  return null;
}

async function searchWikidata(searchName: string) {
  const results = new Map<string, WikidataSearchResult>();

  for (const searchTerm of getSearchVariants(searchName)) {
    try {
      const searchUrl = new URL("https://www.wikidata.org/w/api.php");
      searchUrl.searchParams.set("action", "wbsearchentities");
      searchUrl.searchParams.set("search", searchTerm);
      searchUrl.searchParams.set("language", "en");
      searchUrl.searchParams.set("uselang", "en");
      searchUrl.searchParams.set("type", "item");
      searchUrl.searchParams.set("limit", "10");
      searchUrl.searchParams.set("format", "json");
      searchUrl.searchParams.set("origin", "*");

      const response = await fetch(searchUrl, {
        headers: { "User-Agent": USER_AGENT },
        next: { revalidate: 2_592_000 },
      });
      if (!response.ok) continue;

      const data = (await response.json()) as WikidataSearchResponse;
      for (const item of data.search ?? []) {
        if (item.id && !results.has(item.id)) results.set(item.id, item);
      }
    } catch {
      // Try the next search variation.
    }
  }

  return [...results.values()];
}

async function resolveWikidataIdentity(
  searchName: string,
): Promise<ResolvedWikidataIdentity | null> {
  const searchResults = await searchWikidata(searchName);
  const ranked = searchResults
    .map((item) => ({ item, score: scoreWikidataItem(searchName, item) }))
    .filter(({ item, score }) => {
      const identityText = `${item.label ?? ""} ${(item.aliases ?? []).join(" ")}`;
      return (
        Boolean(item.id) &&
        score >= 30 &&
        isLikelyFinancialEntity(identityText, item.description)
      );
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 5);

  let fallbackLogoUrl: string | null = null;

  for (const { item } of ranked) {
    try {
      const entityResponse = await fetch(
        `https://www.wikidata.org/wiki/Special:EntityData/${encodeURIComponent(
          item.id!,
        )}.json`,
        {
          headers: { "User-Agent": USER_AGENT },
          next: { revalidate: 2_592_000 },
        },
      );
      if (!entityResponse.ok) continue;

      const entityData = (await entityResponse.json()) as WikidataEntityResponse;
      const entity = entityData.entities?.[item.id!];
      if (!entity) continue;

      const domain = readOfficialDomain(entity);
      if (domain) return { domain, logoUrl: null };

      if (!fallbackLogoUrl) {
        const filename = readCommonsFilename(entity);
        if (filename) {
          fallbackLogoUrl = `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(
            filename,
          )}?width=192`;
        }
      }
    } catch {
      // Continue through the next verified financial candidate.
    }
  }

  return fallbackLogoUrl ? { domain: null, logoUrl: fallbackLogoUrl } : null;
}

async function resolveCompanyDomain(searchName: string) {
  for (const searchTerm of getSearchVariants(searchName)) {
    try {
      const response = await fetch(
        `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(
          searchTerm,
        )}`,
        {
          headers: { "User-Agent": USER_AGENT },
          next: { revalidate: 2_592_000 },
        },
      );
      if (!response.ok) continue;

      const companies = (await response.json()) as ClearbitCompany[];
      const best = companies
        .map((company) => ({
          company,
          score: scoreMatch(searchName, company.name ?? ""),
        }))
        .filter(({ company, score }) => {
          const identityText = `${company.name ?? ""} ${company.domain ?? ""}`.replace(
            /[.-]/g,
            " ",
          );
          return (
            Boolean(company.domain) &&
            score >= 30 &&
            isLikelyFinancialEntity(identityText)
          );
        })
        .sort((left, right) => right.score - left.score)[0]?.company;

      const domain = best?.domain?.trim().toLowerCase();
      if (domain && /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) return domain;
    } catch {
      // Try the next search variation.
    }
  }

  return null;
}

function faviconUrl(domain: string) {
  const website = `https://${domain}`;
  return `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(
    website,
  )}&sz=256`;
}

function redirectToLogo(url: string) {
  const response = NextResponse.redirect(new URL(url), 307);
  response.headers.set("Cache-Control", CACHE_CONTROL);
  return response;
}

function logoNotFound() {
  return NextResponse.json(
    { error: "No verified logo was found for this account name." },
    {
      status: 404,
      headers: { "Cache-Control": MISS_CACHE_CONTROL },
    },
  );
}

export async function GET(request: NextRequest) {
  const rawName = request.nextUrl.searchParams.get("name")?.trim().slice(0, 120);
  const rawType = request.nextUrl.searchParams.get("type")?.trim().slice(0, 40);
  const rawIconKey = request.nextUrl.searchParams
    .get("iconKey")
    ?.trim()
    .slice(0, 120);

  if (
    !rawName ||
    !shouldAttemptAccountLogo(rawName, rawIconKey, rawType)
  ) {
    return logoNotFound();
  }

  const knownBrand = detectAccountBrand(rawName, rawIconKey);
  const mappedDomain = resolveMappedBankDomain(rawName);
  const directDomain = knownBrand?.domain ?? mappedDomain;
  if (directDomain) return redirectToLogo(faviconUrl(directDomain));

  const searchName = cleanSearchName(rawName);
  const wikidataIdentity = await resolveWikidataIdentity(searchName);
  if (wikidataIdentity?.domain) {
    return redirectToLogo(faviconUrl(wikidataIdentity.domain));
  }

  const companyDomain = await resolveCompanyDomain(searchName);
  if (companyDomain) return redirectToLogo(faviconUrl(companyDomain));

  if (wikidataIdentity?.logoUrl) {
    return redirectToLogo(wikidataIdentity.logoUrl);
  }

  return logoNotFound();
}
