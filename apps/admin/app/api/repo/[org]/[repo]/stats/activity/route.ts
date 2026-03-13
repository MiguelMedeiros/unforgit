import { NextRequest, NextResponse } from "next/server";
import { getApiUrl } from "@/lib/api-proxy";

interface DailyCount {
  date: string | Date;
  count: number;
}

interface ActivityResponse {
  dailyCounts: DailyCount[];
  hourlyCounts: Array<{ hour: number; count: number }>;
  weeklyTrend: Array<{ week: number; count: number }>;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ org: string; repo: string }> }
) {
  const { org, repo } = await params;
  const authHeader = request.headers.get("authorization");

  if (!authHeader) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Missing Authorization header" },
      { status: 401 }
    );
  }

  try {
    const response = await fetch(
      `${getApiUrl()}/v1/admin/repos/${org}/${repo}/stats/activity`,
      { headers: { Authorization: authHeader } }
    );

    if (!response.ok) {
      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    }

    const data: ActivityResponse = await response.json();

    const normalizedDailyCounts = data.dailyCounts.map((d) => {
      let dateStr: string;
      if (typeof d.date === "string") {
        if (d.date.includes("T")) {
          dateStr = d.date.split("T")[0];
        } else {
          dateStr = d.date;
        }
      } else {
        dateStr = new Date(d.date).toISOString().split("T")[0];
      }
      return { date: dateStr, count: d.count };
    });

    return NextResponse.json({
      dailyCounts: normalizedDailyCounts,
      hourlyCounts: data.hourlyCounts,
      weeklyTrend: data.weeklyTrend,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error", message: String(error) },
      { status: 500 }
    );
  }
}
