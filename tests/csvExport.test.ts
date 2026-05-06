import {
  LOGS_EXPORT_COLUMNS,
  buildLogsExportFilename,
  sessionLogsToCsv,
} from "@/services/csv-export";
import { buildLogsExportSummaryLines } from "@/utils/sessionLogs";
import type { SessionLogEntry, SessionWithRole } from "@/types";

function buildLogEntry(
  overrides: Partial<SessionLogEntry> = {},
): SessionLogEntry {
  return {
    id: "session-1",
    roleId: "role-1",
    roleName: "Sushi, Boxes",
    roleColor: "#ffffff",
    roleIcon: "box",
    roleHourlyRate: 15,
    startAt: "2026-05-06T10:00:00.000Z",
    endAt: "2026-05-06T12:17:00.000Z",
    durationMs: 2 * 60 * 60 * 1000 + 17 * 60 * 1000,
    notes: 'line "one"\nline,two',
    ...overrides,
  };
}

describe("sessionLogsToCsv", () => {
  it("includes required columns and escapes string fields", () => {
    const csv = sessionLogsToCsv([buildLogEntry()]);
    const [header, firstRow] = csv.split("\n");
    expect(header).toBe(LOGS_EXPORT_COLUMNS.join(","));
    expect(firstRow).toContain('"Sushi, Boxes"');
    expect(csv).toContain('"line ""one""\nline,two"');
  });

  it("uses numeric duration minutes and computes earnings", () => {
    const csv = sessionLogsToCsv([buildLogEntry()]);
    const firstRow = csv.split("\n")[1];
    expect(firstRow).toContain(",137,");
    expect(firstRow).toContain(",15.00,34.25,");
  });

  it("keeps earnings numeric with two decimals", () => {
    const csv = sessionLogsToCsv([
      buildLogEntry({
        durationMs: 19.5 * 60 * 60 * 1000,
      }),
    ]);
    const firstRow = csv.split("\n")[1];
    expect(firstRow).toContain(",292.50,");
    expect(firstRow).not.toContain("$292.50");
  });

  it("leaves hourly rate and earnings blank when no rate exists", () => {
    const csv = sessionLogsToCsv([
      buildLogEntry({
        roleHourlyRate: null,
      }),
    ]);
    const firstRow = csv.split("\n")[1];
    expect(firstRow).toContain(",137,,,");
  });

  it("filters out active/open sessions", () => {
    const activeSession: SessionWithRole = {
      id: "active-1",
      roleId: "role-1",
      roleName: "Active Role",
      roleColor: "#fff",
      roleIcon: "clock",
      roleTag: "me",
      roleHourlyRate: 20,
      startAt: "2026-05-06T12:00:00.000Z",
      endAt: null,
      durationMs: null,
      source: "manual",
      notes: null,
      createdAt: "2026-05-06T12:00:00.000Z",
      updatedAt: "2026-05-06T12:00:00.000Z",
    };

    const csv = sessionLogsToCsv([buildLogEntry(), activeSession]);
    expect(csv).toContain("session-1");
    expect(csv).not.toContain("active-1");
  });
});

describe("buildLogsExportFilename", () => {
  it("creates slug-safe selected role filenames", () => {
    const filename = buildLogsExportFilename({
      selectedRange: "last30Days",
      roleName: "Sushi Boxes & Co",
      now: new Date("2026-05-06T10:00:00.000Z"),
    });
    expect(filename).toBe(
      "featherpunch-sushi-boxes-co-last-30-days-2026-05-06.csv",
    );
  });

  it("includes custom range dates in filename", () => {
    const filename = buildLogsExportFilename({
      selectedRange: "custom",
      roleName: "Sushi Boxes",
      customRange: {
        startDate: "2026-04-12T13:00:00.000Z",
        endDate: "2026-04-23T08:00:00.000Z",
      },
    });
    expect(filename).toBe(
      "featherpunch-sushi-boxes-custom-2026-04-12-to-2026-04-23.csv",
    );
  });

  it("uses rolling range label and date safely", () => {
    const filename = buildLogsExportFilename({
      selectedRange: "last7Days",
      now: new Date("2026-05-06T10:00:00.000Z"),
    });
    expect(filename).toBe("featherpunch-logs-last-7-days-2026-05-06.csv");
  });
});

describe("buildLogsExportSummaryLines", () => {
  it("includes selected-role totals and earnings", () => {
    const lines = buildLogsExportSummaryLines({
      count: 10,
      rangeSummary: "Last 30 days · Apr 7 - May 6",
      selectedRoleName: "Sushi Boxes",
      selectedRoleSummary: {
        roleId: "role-1",
        completedSessionCount: 10,
        totalDurationMs: 19.5 * 60 * 60 * 1000,
        hourlyRate: 15,
        estimatedEarnings: 292.5,
      },
    });
    expect(lines).toEqual([
      "Exporting 10 completed logs",
      "Sushi Boxes · Last 30 days · Apr 7 - May 6",
      "Total: 19h 30m",
      "Estimated earnings: $292.50",
    ]);
  });

  it("omits role totals for all-roles summary", () => {
    const lines = buildLogsExportSummaryLines({
      count: 24,
      rangeSummary: "Last 30 days · Apr 7 - May 6",
    });
    expect(lines).toEqual([
      "Exporting 24 completed logs",
      "Last 30 days · Apr 7 - May 6",
      "All roles",
    ]);
  });
});
