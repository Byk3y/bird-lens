# v2 & v3 Notification Upgrade Plan

## Current State (v1 — shipped)
- Trial-end reminder removed
- Single "morning activation" notification at 8:00 AM local time (one-time, local)
- Notification permission requested via paywall toggle + in-app home screen prompt
- All notifications are local (no push infrastructure)

---

## v2: Smart Local Notifications

Replace the flat 8AM notification with context-aware, location-based local notifications scheduled on each app foreground.

### Notification Types

#### 1. Golden Hour Reminder
- **Message**: "Dawn chorus starts in 30 minutes. Best birding window of the day."
- **How**: Pure JS sunrise calculation (NOAA solar algorithm, ~40 lines, no API) from user's lat/lng. Schedule notification for sunrise minus 30 minutes tomorrow. Recalculate every app open.
- **Seasonal variants**: Spring (warblers/thrushes), Summer (generic), Fall (migrating birds), Winter (feeders/woodland edges)
- **Why highest priority**: Contextual, changes daily, makes BirdMark feel like it knows birding

#### 2. Life List Momentum
- **Message**: "You've spotted 12 species this month — 3 more than last month! Keep going."
- **How**: Query `sightings` table for unique species counts (this month vs last month, all-time total). Schedule for Sunday 6 PM weekly.
- **Milestone messages**: "You're at 47 species — just 3 from 50!"
- **Skip if**: User has fewer than 3 total sightings (too new)
- **Why**: Taps into collector psychology. Birders are list-builders by nature.

#### 3. Migration Alerts
- **Message**: "Spring warblers are arriving in your area this week."
- **How**: Curated JSON dataset (~30-50 iconic species) with region-specific arrival/departure windows in ISO week numbers. Match current week + user's region. Schedule up to 2 per week (Tue/Thu 7 AM).
- **Regions**: northeast_us, southeast_us, midwest_us, west_us, pacific_us, europe_west, europe_north, uk
- **Why highest value**: Migration windows are 2-3 weeks. Birders obsess over them. Missing peak migration is a real loss.

#### 4. Seasonal Firsts
- **Message**: "First hummingbirds being reported in the Southeast! Keep an eye out."
- **How**: Same dataset as migration, filtered to iconic "first of season" species. Deduped per species per year.
- **Why**: These are moments birders talk about in forums and Facebook groups.

### Architecture

**Scheduling loop** — On every app foreground (`AppState` listener):
1. Cancel all previously scheduled smart notifications (by stored IDs)
2. Load preferences + cached location
3. Calculate and schedule next occurrence of each enabled type
4. Store new notification IDs in AsyncStorage

**Location cache** — AsyncStorage backed, 7-day TTL. Sources:
1. Most recent sighting coordinates (Supabase query)
2. Current foreground location (existing `getCurrentLocation()`)
3. Fallback: skip location-dependent notifications

**Preferences** — AsyncStorage per-type toggles. Settings screen gets a "Notifications" section with 4 toggles.

**iOS limit**: Max 64 local notifications. We cap at ~6 per refresh: 1 golden hour + 1 life list + 2 migration + 2 seasonal.

### New Files
```
lib/notifications/types.ts          — shared types
lib/notifications/preferences.ts    — AsyncStorage read/write for toggles
lib/notifications/solar.ts          — NOAA sunrise/sunset calculator
lib/notifications/locationCache.ts  — cached user location + region derivation
lib/notifications/migrationData.ts  — curated species migration dataset
lib/notifications/goldenHour.ts     — sunrise-based scheduling
lib/notifications/lifeListMomentum.ts — weekly progress digest
lib/notifications/migrationAlerts.ts  — migration + seasonal first scheduling
lib/notifications/scheduler.ts      — orchestrator (single entry point)
hooks/useNotificationScheduler.ts   — React hook for AppState listener
components/settings/NotificationSettings.tsx — settings UI (4 toggles)
```

### Modified Files
```
app/_layout.tsx         — mount NotificationScheduler component in AppContent
app/settings.tsx        — add Notifications section
app/(tabs)/index.tsx    — update permission prompt to reference smart notifications
hooks/useLocation.ts    — fire-and-forget location cache update
lib/analytics.ts        — add notification events
lib/notifications.ts    — deprecate scheduleMorningActivation()
```

### Build Order
1. Foundation (types, preferences, locationCache, solar + tests)
2. Golden Hour (replaces 8AM notification)
3. Life List Momentum
4. Migration & Seasonal Firsts (requires curating the dataset)
5. Settings UI & polish

### No Database Migrations Required
All state lives in AsyncStorage on the client. Sighting queries use existing schema.

---

## v3: Server-Side Push Notifications

For reaching users who haven't opened the app recently, and for real-time alerts that can't wait for an app foreground.

### Infrastructure Required
- **Push token registration**: Register Expo push tokens with Supabase on app launch
- **`push_tokens` table**: `user_id`, `token`, `platform`, `created_at`, `updated_at`
- **`notification_log` table**: `id`, `user_id`, `notification_type`, `content_json`, `sent_at`, `opened_at`
- **New Edge Function**: `send-push-notification/` — sends via Expo Push API
- **Scheduled Edge Function / Cron**: Runs daily to check migration windows and send push notifications to relevant users

### New Notification Types

#### 5. Nearby Rare Sighting (requires community data)
- **Message**: "A Painted Bunting was spotted 2 miles from you."
- **How**: When a user saves a sighting of a rare species, check for nearby users (within X miles) and push notify them.
- **Prerequisites**: Enough active users contributing sightings to make this useful. Community reporting infrastructure.
- **Why the holy grail**: Birders literally drive hours for rare sightings.

#### 6. Inactivity Re-engagement
- **Message**: "You haven't been birding in 2 weeks. Spring migration is peaking — don't miss it!"
- **How**: Server-side cron checks users whose last sighting was >14 days ago during active migration season. Push notification.
- **Careful with frequency**: Max 1 per month. Too aggressive = uninstalls.

#### 7. Location-Based Species Tips
- **Message**: "Tip: Great Blue Herons are common near waterways in your area this time of year."
- **How**: Combine user's cached region + season + species distribution data to suggest what to look for.
- **Triggered**: After identification, or as a weekly push suggestion.

### Database Migrations
```sql
-- push_tokens table
CREATE TABLE push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL, -- 'ios' | 'android'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, token)
);

-- notification_log table
CREATE TABLE notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  metadata JSONB,
  sent_at TIMESTAMPTZ DEFAULT now(),
  opened_at TIMESTAMPTZ
);
```

### Requires New Native Build
Push notifications require the `expo-notifications` push token APIs and proper APN/FCM configuration. This is NOT OTA-deployable — requires an EAS build.

---

## Priority Matrix

| Notification | Impact | Effort | Phase |
|---|---|---|---|
| Golden Hour (sunrise) | High | Low | v2 |
| Life List Momentum | Medium | Low | v2 |
| Migration Alerts | Very High | Medium | v2 |
| Seasonal Firsts | High | Low (shares migration data) | v2 |
| Nearby Rare Sighting | Very High | Very High | v3+ |
| Inactivity Re-engagement | Medium | Medium | v3 |
| Location-Based Tips | Medium | Medium | v3 |

---

## Key Dependencies
- `date-fns` (already installed) — ISO week calculation, date formatting
- `expo-notifications` (already installed) — local scheduling
- `expo-location` (already installed) — foreground location
- No new packages needed for v2
- v3 needs Expo Push Notification service configuration + server-side cron (Supabase pg_cron or external)
