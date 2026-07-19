import { expect, test } from "@playwright/test";

const patrick = {
  name: "Patrick Stiller",
  role: "AI Engineer at tracetronic",
  about:
    "Playwright E2E test application for an AI engineering founder building developer tooling.",
  github: "https://github.com/StillerPatrick",
  linkedin: "https://www.linkedin.com/in/patrick-stiller-ai/",
  x: "https://x.com/PStiller68580/",
};

test("Patrick Stiller submits an application with all public profiles", async ({ page }) => {
  await page.goto("/apply");

  await page.getByLabel("Company name", { exact: true }).fill("TracePilot AI — E2E Test");
  await page
    .getByLabel("One-liner", { exact: true })
    .fill("AI-assisted trace analysis for engineering teams");
  await page.getByRole("combobox").selectOption("Dev tools");
  await page.getByLabel("Location", { exact: true }).fill("Stuttgart, DE");

  await page.getByLabel("Name", { exact: true }).fill(patrick.name);
  await page.getByLabel("Role", { exact: true }).fill(patrick.role);
  await page.getByRole("textbox", { name: /^About/ }).fill(patrick.about);
  await page.getByLabel("GitHub", { exact: true }).fill(patrick.github);
  await page.getByLabel("LinkedIn", { exact: true }).fill(patrick.linkedin);
  await page.getByLabel("X", { exact: true }).fill(patrick.x);

  const [response] = await Promise.all([
    page.waitForResponse(
      (candidate) =>
        candidate.url().endsWith("/backend/api/v1/applications") &&
        candidate.request().method() === "POST",
    ),
    page.getByRole("button", { name: "Submit application" }).click(),
  ]);

  expect(response.status()).toBe(202);
  expect(response.request().postDataJSON()).toEqual({
    company: "TracePilot AI — E2E Test",
    one_liner: "AI-assisted trace analysis for engineering teams",
    sector: "Dev tools",
    location: "Stuttgart, DE",
    founders: [patrick],
  });

  const accepted = await response.json();
  expect(accepted).toMatchObject({ status: "processing" });
  expect(accepted.application_id).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );

  await expect(
    page.getByRole("heading", { name: /Founder diligence (in progress|complete)/ }),
  ).toBeVisible();
  await expect(page.getByText(accepted.application_id, { exact: false })).toBeVisible();

  await page.goto("/");
  await expect(page.getByText("TracePilot AI — E2E Test", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Patrick Stiller", { exact: true })).toBeVisible();
});
