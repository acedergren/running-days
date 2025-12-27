import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { eq, desc, sql, and, gte } from "drizzle-orm";
import { z } from "zod";
import { existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// Schema definitions (mirrored from main app)
const workouts = sqliteTable("workouts", {
  id: text("id").primaryKey(),
  date: text("date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  durationSeconds: integer("duration_seconds").notNull(),
  distanceMeters: real("distance_meters").notNull(),
  avgPaceSecondsPerKm: real("avg_pace_seconds_per_km"),
  createdAt: text("created_at").notNull(),
});

const goals = sqliteTable("goals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  year: integer("year").notNull().unique(),
  targetDays: integer("target_days").notNull(),
});

const dailyStats = sqliteTable("daily_stats", {
  date: text("date").primaryKey(),
  year: integer("year").notNull(),
  runCount: integer("run_count").notNull(),
  totalDistanceMeters: real("total_distance_meters").notNull(),
  totalDurationSeconds: integer("total_duration_seconds").notNull(),
  avgPaceSecondsPerKm: real("avg_pace_seconds_per_km"),
});

// Find database path
function findDatabasePath(): string {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const possiblePaths = [
    resolve(__dirname, "../../data/running-days.db"),
    resolve(__dirname, "../../../data/running-days.db"),
    "/data/running-days.db",
  ];

  for (const p of possiblePaths) {
    if (existsSync(p)) {
      return p;
    }
  }

  throw new Error(
    `Database not found. Checked: ${possiblePaths.join(", ")}`
  );
}

// Initialize database
const dbPath = findDatabasePath();
const sqlite = new Database(dbPath, { readonly: true });
const db = drizzle(sqlite);

// Helper functions
function formatPace(secondsPerKm: number): string {
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.round(secondsPerKm % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatDistance(meters: number): string {
  return (meters / 1000).toFixed(2);
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

// Create MCP server
const server = new McpServer({
  name: "running-days",
  version: "1.0.0",
});

// Tool: Get running stats
server.tool(
  "running_days_get_stats",
  "Get running statistics including total days, distance, duration, and pace for a given year",
  {
    year: z
      .number()
      .optional()
      .describe("Year to get stats for (defaults to current year)"),
  },
  async ({ year }) => {
    const targetYear = year ?? new Date().getFullYear();

    const stats = await db
      .select({
        totalDays: sql<number>`count(*)`,
        totalDistance: sql<number>`sum(${dailyStats.totalDistanceMeters})`,
        totalDuration: sql<number>`sum(${dailyStats.totalDurationSeconds})`,
        avgPace: sql<number>`avg(${dailyStats.avgPaceSecondsPerKm})`,
      })
      .from(dailyStats)
      .where(eq(dailyStats.year, targetYear));

    const result = stats[0];

    if (!result || result.totalDays === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: `No running data found for ${targetYear}.`,
          },
        ],
      };
    }

    const summary = `## Running Stats for ${targetYear}

| Metric | Value |
|--------|-------|
| **Total Running Days** | ${result.totalDays} days |
| **Total Distance** | ${formatDistance(result.totalDistance || 0)} km |
| **Total Duration** | ${formatDuration(result.totalDuration || 0)} |
| **Average Pace** | ${result.avgPace ? formatPace(result.avgPace) : "N/A"} /km |
| **Avg Distance/Run** | ${formatDistance((result.totalDistance || 0) / result.totalDays)} km |
| **Avg Duration/Run** | ${formatDuration((result.totalDuration || 0) / result.totalDays)} |`;

    return {
      content: [{ type: "text" as const, text: summary }],
    };
  }
);

// Tool: Get recent runs
server.tool(
  "running_days_get_recent_runs",
  "Get a list of recent running activities with date, distance, duration, and pace",
  {
    limit: z
      .number()
      .min(1)
      .max(50)
      .optional()
      .describe("Number of runs to return (1-50, defaults to 10)"),
  },
  async ({ limit }) => {
    const count = limit ?? 10;

    const runs = await db
      .select()
      .from(workouts)
      .orderBy(desc(workouts.date))
      .limit(count);

    if (runs.length === 0) {
      return {
        content: [{ type: "text" as const, text: "No runs found." }],
      };
    }

    let table = `## Recent Runs (Last ${runs.length})\n\n`;
    table += "| Date | Distance | Duration | Pace |\n";
    table += "|------|----------|----------|------|\n";

    for (const run of runs) {
      const date = new Date(run.date).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      const distance = formatDistance(run.distanceMeters);
      const duration = formatDuration(run.durationSeconds);
      const pace = run.avgPaceSecondsPerKm
        ? formatPace(run.avgPaceSecondsPerKm)
        : "N/A";

      table += `| ${date} | ${distance} km | ${duration} | ${pace} /km |\n`;
    }

    return {
      content: [{ type: "text" as const, text: table }],
    };
  }
);

// Tool: Get goal progress
server.tool(
  "running_days_get_goal_progress",
  "Get progress toward the yearly running days goal, including days completed, days remaining, and pace status",
  {
    year: z
      .number()
      .optional()
      .describe("Year to check progress for (defaults to current year)"),
  },
  async ({ year }) => {
    const targetYear = year ?? new Date().getFullYear();

    // Get goal
    const goalResult = await db
      .select()
      .from(goals)
      .where(eq(goals.year, targetYear));

    const goal = goalResult[0] ?? { targetDays: 300 };

    // Get days completed
    const statsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(dailyStats)
      .where(eq(dailyStats.year, targetYear));

    const daysCompleted = statsResult[0]?.count ?? 0;

    // Calculate progress
    const daysInYear =
      new Date(targetYear, 11, 31).getDate() === 31 ? 365 : 366;
    const dayOfYear = Math.floor(
      (Date.now() - new Date(targetYear, 0, 0).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    const expectedDays = Math.round((dayOfYear / daysInYear) * goal.targetDays);
    const aheadBehind = daysCompleted - expectedDays;
    const percentComplete = Math.round(
      (daysCompleted / goal.targetDays) * 100
    );
    const daysRemaining = goal.targetDays - daysCompleted;

    const status =
      aheadBehind >= 0
        ? `🟢 ${aheadBehind} days ahead of pace`
        : `🟡 ${Math.abs(aheadBehind)} days behind pace`;

    const summary = `## ${targetYear} Goal Progress

**Goal**: ${goal.targetDays} running days

| Metric | Value |
|--------|-------|
| **Days Completed** | ${daysCompleted} / ${goal.targetDays} |
| **Progress** | ${percentComplete}% |
| **Days Remaining** | ${daysRemaining} |
| **Expected by Today** | ${expectedDays} days |
| **Status** | ${status} |
| **Day of Year** | ${dayOfYear} / ${daysInYear} |

${
  aheadBehind >= 0
    ? `Great job! You're on track to exceed your goal.`
    : `Keep pushing! You need to average ${(daysRemaining / (daysInYear - dayOfYear)).toFixed(2)} runs per remaining day.`
}`;

    return {
      content: [{ type: "text" as const, text: summary }],
    };
  }
);

// Tool: Get monthly breakdown
server.tool(
  "running_days_get_monthly_breakdown",
  "Get a monthly breakdown of running days, distance, and duration for a given year",
  {
    year: z
      .number()
      .optional()
      .describe("Year to get breakdown for (defaults to current year)"),
  },
  async ({ year }) => {
    const targetYear = year ?? new Date().getFullYear();

    const monthly = await db
      .select({
        month: sql<string>`strftime('%Y-%m', ${dailyStats.date})`,
        days: sql<number>`count(*)`,
        distance: sql<number>`sum(${dailyStats.totalDistanceMeters})`,
        duration: sql<number>`sum(${dailyStats.totalDurationSeconds})`,
      })
      .from(dailyStats)
      .where(eq(dailyStats.year, targetYear))
      .groupBy(sql`strftime('%Y-%m', ${dailyStats.date})`)
      .orderBy(sql`strftime('%Y-%m', ${dailyStats.date})`);

    if (monthly.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: `No data found for ${targetYear}.`,
          },
        ],
      };
    }

    let table = `## Monthly Breakdown for ${targetYear}\n\n`;
    table += "| Month | Days | Distance | Duration |\n";
    table += "|-------|------|----------|----------|\n";

    for (const m of monthly) {
      const monthName = new Date(m.month + "-01").toLocaleDateString("en-US", {
        month: "long",
      });
      table += `| ${monthName} | ${m.days} | ${formatDistance(m.distance || 0)} km | ${formatDuration(m.duration || 0)} |\n`;
    }

    return {
      content: [{ type: "text" as const, text: table }],
    };
  }
);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Running Days MCP server started");
}

main().catch(console.error);
