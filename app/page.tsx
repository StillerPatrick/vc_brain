import type { StartupApplication } from "@/lib/api";
import { InvestorConsole } from "./investor-console";

export const dynamic = "force-dynamic";

const backendUrl = (process.env.BACKEND_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

async function loadApplications(): Promise<{
  applications: StartupApplication[];
  error: string | null;
}> {
  try {
    const response = await fetch(`${backendUrl}/api/v1/applications`, {
      cache: "no-store",
    });
    if (!response.ok) {
      return {
        applications: [],
        error: `Backend request failed (${response.status})`,
      };
    }
    return {
      applications: (await response.json()) as StartupApplication[],
      error: null,
    };
  } catch {
    return {
      applications: [],
      error: "Backend unavailable",
    };
  }
}

export default async function Home() {
  const { applications, error } = await loadApplications();
  return (
    <InvestorConsole
      initialApplications={applications}
      initialBackendError={error}
    />
  );
}
