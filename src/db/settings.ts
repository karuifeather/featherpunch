import { getDb } from "./database";
import type { AppSettingKey } from "@/types";

const DEFAULTS: Record<AppSettingKey, string> = {
  week_start_day: "1",
  currency: "USD",
  privacy_lock: "0",
  export_format: "csv",
  onboarding_completed: "0",
  last_engaged_role_id: "",
  weather_latitude: "",
  weather_longitude: "",
  weather_label: "",
  weather_location_prompted: "0",
  weather_temp_unit: "C",
};

export async function getSetting(key: AppSettingKey): Promise<string> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_settings WHERE key = ?",
    [key],
  );
  return row?.value ?? DEFAULTS[key];
}

export async function setSetting(
  key: AppSettingKey,
  value: string,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)",
    [key, value],
  );
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    "SELECT key, value FROM app_settings",
  );
  const result: Record<string, string> = { ...DEFAULTS };
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return result;
}
