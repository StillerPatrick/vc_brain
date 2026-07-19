import type { StartupApplication } from "@/lib/api";
import { InvestorConsole } from "./investor-console";

export const dynamic = "force-dynamic";

const backendUrl = (process.env.BACKEND_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

async function loadApplications(): Promise<{
  applications: StartupApplication[];
  error: string | null;
  responseTime: number;
}> {
  try {
    const response = await fetch(`${backendUrl}/api/v1/applications`, {
      cache: "no-store",
    });
    if (!response.ok) {
      return {
        applications: [],
        error: `Backend request failed (${response.status})`,
        responseTime: 0,
      };
    }
    const applications = (await response.json()) as StartupApplication[];
    const headerTime = Date.parse(response.headers.get("date") ?? "");
    const latestApplicationTime = Math.max(
      0,
      ...applications.map((application) => Date.parse(application.created_at)),
    );
    return {
      applications,
      error: null,
      responseTime: Number.isFinite(headerTime) ? headerTime : latestApplicationTime,
    };
  } catch {
    return {
      applications: [],
      error: "Backend unavailable",
      responseTime: 0,
    };
  }
}

export default async function Home() {
  const { applications, error, responseTime } = await loadApplications();
  return (
    <InvestorConsole
      initialApplications={applications}
      initialBackendError={error}
      initialTime={responseTime}
    />
  );
}
