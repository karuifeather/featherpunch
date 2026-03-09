# FeatherPunch — Data Model

## SQLite Schema

### roles

| Column      | Type    | Constraints                          |
|-------------|---------|--------------------------------------|
| id          | TEXT    | PRIMARY KEY                          |
| name        | TEXT    | NOT NULL                             |
| color       | TEXT    | NOT NULL                             |
| icon        | TEXT    | NOT NULL                             |
| tag         | TEXT    | NOT NULL, CHECK(IN ('me', 'other'))  |
| hourly_rate | REAL    | nullable                             |
| is_archived | INTEGER | NOT NULL DEFAULT 0                   |
| sort_order  | INTEGER | NOT NULL DEFAULT 0                   |
| created_at  | TEXT    | NOT NULL (ISO 8601 UTC)              |
| updated_at  | TEXT    | NOT NULL (ISO 8601 UTC)              |

### sessions

| Column      | Type    | Constraints                                    |
|-------------|---------|------------------------------------------------|
| id          | TEXT    | PRIMARY KEY                                    |
| role_id     | TEXT    | NOT NULL, REFERENCES roles(id)                 |
| start_at    | TEXT    | NOT NULL (ISO 8601 UTC)                        |
| end_at      | TEXT    | nullable (ISO 8601 UTC) — null = active        |
| duration_ms | INTEGER | nullable — computed on close                   |
| source      | TEXT    | NOT NULL DEFAULT 'manual', CHECK(IN (...))     |
| notes       | TEXT    | nullable                                       |
| created_at  | TEXT    | NOT NULL (ISO 8601 UTC)                        |
| updated_at  | TEXT    | NOT NULL (ISO 8601 UTC)                        |

**source values:** `manual`, `import`, `edited`

### app_settings

| Column | Type | Constraints   |
|--------|------|---------------|
| key    | TEXT | PRIMARY KEY   |
| value  | TEXT | NOT NULL      |

**Known keys:**
- `week_start_day` — 0 (Sun) to 6 (Sat), default 1 (Mon)
- `currency` — ISO code, default 'USD'
- `privacy_lock` — '0' or '1'
- `export_format` — 'csv'

## Indexes

- `idx_sessions_role_id` ON sessions(role_id)
- `idx_sessions_start_at` ON sessions(start_at)
- `idx_sessions_end_at` ON sessions(end_at)
- `idx_roles_is_archived` ON roles(is_archived)

## Rules

- Only **one active session** at a time (end_at IS NULL)
- Sessions cannot overlap
- Sessions can cross midnight
- Time stored in UTC, displayed in local
- Archived roles keep historical data
- duration_ms is computed as end_at - start_at on close

## Derived Metrics (computed, not stored)

- Total duration by role
- Total duration by tag (me / other)
- Average session duration by role
- Session count by role / day / week / month
- Distribution by weekday
- Distribution by hour-of-day
- Streaks (consecutive days with a role)
- Role-switch count per day
- Me/Other ratio over time
- Estimated value by role (duration × hourly_rate)
- Sleep-specific: avg duration, bedtime/wake consistency, weekday vs weekend

## CSV Export Format

### roles.csv

```csv
id,name,tag,hourly_rate,color,icon,archived,created_at,updated_at
```

### sessions.csv

```csv
id,role_id,role_name,tag,start_at,end_at,duration_minutes,hourly_rate_at_time,estimated_value,source,notes
```

## Default Roles (first launch presets)

| Name      | Icon            | Color   | Tag   |
|-----------|-----------------|---------|-------|
| Sleeping  | moon            | #6366f1 | me    |
| Working   | briefcase       | #f59e0b | other |
| Studying  | book-open       | #3b82f6 | me    |
| Exercise  | dumbbell        | #22c55e | me    |
| Family    | users           | #ec4899 | other |
| Building  | hammer          | #8b5cf6 | me    |
| Commute   | car             | #64748b | other |
| Rest      | coffee          | #14b8a6 | me    |
| Scrolling | smartphone      | #ef4444 | other |
