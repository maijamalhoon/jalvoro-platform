import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";

const configuredSupabaseUrl = process.env.AUDIT_SUPABASE_URL;
const configuredAnonKey = process.env.AUDIT_SUPABASE_ANON_KEY;

if (!configuredSupabaseUrl || !configuredAnonKey) {
  throw new Error("Local Supabase E2E variables are required.");
}

const supabaseUrl: string = configuredSupabaseUrl;
const anonKey: string = configuredAnonKey;
const password = `Audit-${Date.now()}-safe!9`;
const primaryEmail = `audit-primary-${Date.now()}@example.test`;

test.describe.configure({ mode: "serial" });

function publicHeaders(accessToken = anonKey) {
  return {
    apikey: anonKey,
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}

async function createIndividualUser(
  request: APIRequestContext,
  email: string,
) {
  const signup = await request.post(`${supabaseUrl}/auth/v1/signup`, {
    headers: publicHeaders(),
    data: {
      email,
      password,
      data: { full_name: "Audit User" },
    },
  });
  expect(signup.ok(), await signup.text()).toBeTruthy();
  const payload = await signup.json();
  const accessToken = payload.access_token as string;
  const userId = payload.user?.id as string;
  expect(accessToken).toBeTruthy();
  expect(userId).toBeTruthy();

  const realm = await request.post(
    `${supabaseUrl}/rest/v1/rpc/claim_account_realm`,
    {
      headers: publicHeaders(accessToken),
      data: { p_realm: "individual" },
    },
  );
  expect(realm.ok(), await realm.text()).toBeTruthy();
  return { accessToken, userId };
}

async function login(page: Page, email = primaryEmail) {
  await page.goto("/individual/login");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: /^Sign in/ }).click();
  await expect(page).toHaveURL(/\/dashboard(?:\/|$)/);
}

async function mockSafePasswordCheck(page: Page) {
  await page.route("**/api/security/password-check", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ safe: true }),
    });
  });
}

test("homepage, navigation, SEO metadata, and clean public runtime", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  const failedResponses: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 500) {
      failedResponses.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.goto("/");
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    /.+/,
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "http://127.0.0.1:3100",
  );
  await page.getByRole("link", { name: /Get started/i }).first().click();
  await expect(page).toHaveURL(/\/start/);
  await expect(page.getByRole("heading", { name: /Individual and Business/ })).toBeVisible();

  expect(pageErrors).toEqual([]);
  expect(failedResponses).toEqual([]);
});

test("signup validates input and creates an isolated Individual account", async ({
  page,
}) => {
  await mockSafePasswordCheck(page);
  await page.goto("/individual/signup");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Full name").fill("A");
  await page.getByLabel("Email address").fill("invalid");
  await page.getByLabel("Password", { exact: true }).fill("short");
  await page.getByRole("button", { name: /^Create account/ }).click();
  await expect(page.getByText("Enter a valid email address.")).toBeVisible();

  await page.getByLabel("Full name").fill("Primary Audit User");
  await page.getByLabel("Email address").fill(primaryEmail);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: /^Create account/ }).click();
  await expect(page).toHaveURL(/\/onboarding\?/);
});

test("logout, protected routes, login, and realm permissions", async ({
  page,
}) => {
  await login(page);
  await page.goto("/dashboard/settings");
  await page.getByRole("button", { name: /Log Out/i }).click();
  await expect(page).toHaveURL(/\/start\?mode=login|\/login/);

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/individual\/login\?next=/);

  await login(page);
  await page.goto("/business");
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole("navigation", { name: "Desktop dashboard navigation" }),
  ).toBeVisible();
});

test("database CRUD, balance calculations, and cross-user RLS isolation", async ({
  request,
}) => {
  const ownerEmail = `audit-crud-owner-${Date.now()}@example.test`;
  const outsiderEmail = `audit-crud-outsider-${Date.now()}@example.test`;
  const owner = await createIndividualUser(request, ownerEmail);
  const outsider = await createIndividualUser(request, outsiderEmail);
  const ownerHeaders = {
    ...publicHeaders(owner.accessToken),
    Prefer: "return=representation",
  };

  const categoryCreate = await request.post(
    `${supabaseUrl}/rest/v1/categories`,
    {
      headers: ownerHeaders,
      data: {
        user_id: owner.userId,
        name: "Audit Income",
        type: "income",
        color: "#2563EB",
      },
    },
  );
  expect(categoryCreate.ok(), await categoryCreate.text()).toBeTruthy();
  const categoryId = (await categoryCreate.json())[0].id as string;

  const accountCreate = await request.post(`${supabaseUrl}/rest/v1/accounts`, {
    headers: ownerHeaders,
    data: {
      user_id: owner.userId,
      name: "Audit Ledger",
      type: "bank",
      account_kind: "savings",
      balance: 1000,
    },
  });
  expect(accountCreate.ok(), await accountCreate.text()).toBeTruthy();
  const accountId = (await accountCreate.json())[0].id as string;

  const transactionCreate = await request.post(
    `${supabaseUrl}/rest/v1/transactions`,
    {
      headers: ownerHeaders,
      data: {
        user_id: owner.userId,
        type: "income",
        amount: 250,
        category_id: categoryId,
        account_id: accountId,
        date: "2026-07-28",
        note: "audit create",
      },
    },
  );
  expect(transactionCreate.ok(), await transactionCreate.text()).toBeTruthy();
  const transactionId = (await transactionCreate.json())[0].id as string;

  const afterCreate = await request.get(
    `${supabaseUrl}/rest/v1/accounts?id=eq.${accountId}&select=balance`,
    { headers: ownerHeaders },
  );
  expect((await afterCreate.json())[0].balance).toBe(1250);

  const update = await request.patch(
    `${supabaseUrl}/rest/v1/transactions?id=eq.${transactionId}`,
    {
      headers: ownerHeaders,
      data: { amount: 300, note: "audit update" },
    },
  );
  expect(update.ok(), await update.text()).toBeTruthy();

  const afterUpdate = await request.get(
    `${supabaseUrl}/rest/v1/accounts?id=eq.${accountId}&select=balance`,
    { headers: ownerHeaders },
  );
  expect((await afterUpdate.json())[0].balance).toBe(1300);

  const hiddenFromOutsider = await request.get(
    `${supabaseUrl}/rest/v1/accounts?id=eq.${accountId}&select=id,balance`,
    { headers: publicHeaders(outsider.accessToken) },
  );
  expect(hiddenFromOutsider.ok(), await hiddenFromOutsider.text()).toBeTruthy();
  expect(await hiddenFromOutsider.json()).toEqual([]);

  const remove = await request.delete(
    `${supabaseUrl}/rest/v1/transactions?id=eq.${transactionId}`,
    { headers: ownerHeaders },
  );
  expect(remove.ok(), await remove.text()).toBeTruthy();

  const afterDelete = await request.get(
    `${supabaseUrl}/rest/v1/accounts?id=eq.${accountId}&select=balance`,
    { headers: ownerHeaders },
  );
  expect((await afterDelete.json())[0].balance).toBe(1000);
  const deletedRead = await request.get(
    `${supabaseUrl}/rest/v1/transactions?id=eq.${transactionId}&select=id`,
    { headers: ownerHeaders },
  );
  expect(await deletedRead.json()).toEqual([]);
});

test("duplicate submit guard and authentication failure/loading states", async ({
  page,
}) => {
  let signupRequests = 0;
  await mockSafePasswordCheck(page);
  page.on("request", (request) => {
    if (request.url().includes("/auth/v1/signup")) signupRequests += 1;
  });
  await page.goto("/individual/signup");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Full name").fill("Duplicate Guard User");
  await page
    .getByLabel("Email address")
    .fill(`audit-duplicate-${Date.now()}@example.test`);
  await page.getByLabel("Password", { exact: true }).fill(password);
  const submit = page.getByRole("button", { name: /^Create account/ });
  await submit.evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });
  await expect(page).toHaveURL(/\/onboarding\?/);
  expect(signupRequests).toBe(1);

  await page.context().clearCookies();
  await page.goto("/individual/login");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Email address").fill(primaryEmail);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.route("**/auth/v1/token**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1_500));
    await route.abort("failed");
  });
  await page.getByRole("button", { name: /^Sign in/ }).click();
  await expect(page.getByText("Signing in...")).toBeVisible();
  await expect(
    page.getByText(/temporarily unavailable|could not be completed/i),
  ).toBeVisible();
});

test("mobile layouts avoid horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  for (const route of ["/", "/start", "/individual/login"]) {
    await page.goto(route);
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);
  }
});
