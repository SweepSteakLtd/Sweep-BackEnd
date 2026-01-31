# Scripts

This directory contains utility scripts for managing player and tournament data.

## Player Profile Sync Script

The `syncPlayerProfiles.ts` script fetches player data from DataGolf API for a specific tournament and creates or updates both PlayerProfile and Player records in the database.

### Overview

- Fetches tournament field from DataGolf API using tournament ID
- Retrieves player details (name, country) from player list endpoint
- Retrieves player rankings from rankings endpoint
- Creates or updates PlayerProfile records in the database
- Creates or updates Player entries linked to PlayerProfiles via `profile_id`
- Uses placeholder values for age (0) and profile_picture ('') as these aren't available from DataGolf
- Automatically assigns player levels based on ranking (1-3)

### Usage

```bash
# Sync player profiles for a tournament
yarn sync:player-profiles <tournament_id>

# Example
yarn sync:player-profiles 12
```

### What it does

1. Fetches tournament field using DataGolf's `/field-updates` endpoint
2. Enriches player data with information from `/get-player-list` endpoint (country)
3. Adds ranking information from `/preds/get-dg-rankings` endpoint
4. Intelligently creates or updates PlayerProfile records using a 3-step matching process:
   - **Step 1**: Match by `external_id` (DataGolf ID) - most reliable
   - **Step 2**: Match by `first_name` + `last_name` + `country` (case-insensitive) - prevents duplicates
   - **Step 3**: Create new profile only if no match found
5. Creates Player entries for the tournament, linked to the PlayerProfile via `profile_id`
6. Updates the tournament's `players` array with all player IDs (if tournament exists with matching `external_id`)

### Duplicate Prevention

The script uses intelligent matching to prevent duplicate player profiles:

- **Primary Match**: Searches by DataGolf ID (`external_id`) first
- **Secondary Match**: If no DataGolf ID match, searches by name and country combination
- **External ID Backfill**: If matched by name, updates the profile with the DataGolf ID
- **New Profile Creation**: Only creates a new profile if no matches found by either method

This ensures that:
- Players are never duplicated even if their external_id changes
- Existing profiles without external_ids get updated when matched by name
- The database stays clean and consolidated

### PlayerProfile Fields Updated

- `external_id` - DataGolf player ID (dg_id)
- `first_name` - Extracted from player name
- `last_name` - Extracted from player name
- `country` - Player's country
- `ranking` - Player's DataGolf ranking (or 999 if not ranked)
- `age` - Default value: 0 (not provided by DataGolf API)
- `profile_picture` - Default value: '' (not provided by DataGolf API)

### Player Fields Created

- `id` - Format: `player-{dg_id}-{tournament_id}`
- `external_id` - DataGolf player ID (dg_id)
- `level` - Calculated based on ranking:
  - Level 1: Top 50 players
  - Level 2: Ranked 51-150
  - Level 3: Ranked 151+
- `profile_id` - Links to PlayerProfile
- `current_score` - Default: 0 (updated by score update script)
- `position` - Default: 0 (updated by score update script)
- `missed_cut` - Default: false (updated by score update script)
- `odds` - Default: 0

### Tournament Update

After syncing all players, the script automatically updates the tournament record:

- **Finds tournament** by matching `external_id` with the provided tournament ID
- **Updates `players` array** with all player IDs that were created/updated
- **Skips update** if tournament doesn't exist (with helpful warning message)

**Example output:**
```
🏆 Updating tournament with player IDs...
✅ Updated tournament "The Masters" with 156 player IDs
```

**Note:** Make sure your tournament exists in the database with the correct `external_id` before running this script.

---

## Player Score Update Script

This script automatically fetches player scores and leaderboard positions from the DataGolf API and updates the database for all active tournaments.

## Overview

The `updatePlayerScores.ts` script:
- Identifies active tournaments (currently running)
- Fetches real-time leaderboard data from DataGolf API
- Updates player scores, positions, and missed cut status
- Runs every 5 minutes via GitHub Actions (can also be run manually)

## Prerequisites

1. **DataGolf API Key**: Sign up at https://datagolf.com/api-access
2. **Database Access**: Requires connection to Google Cloud SQL PostgreSQL database
3. **Player External IDs**: Players in your database must have `external_id` values matching DataGolf's `dg_id`

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATAGOLF_API_KEY` | Your DataGolf API key | `abc123...` |
| `BE_DATABASE_PASSWORD` | PostgreSQL database password | `secretpass` |
| `APPLIED_ENV` | Environment (local/development/production) | `production` |

### Setting Up Environment Variables

#### For Local Development

Create a `.env` file in the project root:

```bash
APPLIED_ENV=local
BE_DATABASE_PASSWORD=your_db_password
DATAGOLF_API_KEY=your_datagolf_api_key
```

#### For GitHub Actions

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add the following secrets:
   - `BE_DATABASE_PASSWORD`
   - `DATAGOLF_API_KEY`
   - `APPLIED_ENV` (optional, defaults to 'production')

## Usage

### Running Locally

```bash
# Install dependencies
yarn install

# Run the update script
yarn update:players
```

### Running via GitHub Actions

#### Automatic Execution
The script runs automatically every 5 minutes on the `master` branch.

#### Manual Trigger
1. Go to your repository on GitHub
2. Click on **Actions** tab
3. Select **Update Player Data** workflow
4. Click **Run workflow**
5. Select the branch (usually `master`)
6. Click **Run workflow**

## DataGolf API Integration

### API Endpoint Used

The script uses DataGolf's `/field-updates` endpoint:
- **URL**: `https://feeds.datagolf.com/field-updates`
- **Parameters**:
  - `tour=pga` (default, can be modified for other tours)
  - `event_id` (optional, for specific tournaments)
  - `key` (your API key)

### Response Format

DataGolf returns player data including:
- `dg_id` - DataGolf player ID (matches `external_id` in your database)
- `player_name` - Player's full name
- `position` - Current leaderboard position (e.g., "1", "T5")
- `total_score` - Total score relative to par (e.g., -5)
- `mc` - Missed cut indicator ("1" if missed cut)

### Player Matching

Players are matched between your database and DataGolf using:
- **Database field**: `players.external_id`
- **DataGolf field**: `dg_id`

Make sure all players in your database have the correct `external_id` matching their DataGolf ID.

## Database Updates

### Fields Updated

For each player, the script updates:
- `current_score` - Total score
- `position` - Leaderboard position
- `missed_cut` - Boolean indicating if player missed the cut
- `updated_at` - Timestamp of last update

### Update Logic

- Only updates players for **active tournaments** (started but not finished)
- Skips updates if values haven't changed (efficient)
- Logs warnings for players not found in DataGolf data
- Handles ties in positions (e.g., "T5" becomes 5)

## Monitoring & Logs

### Log Output

The script provides detailed logging:
```
🏌️ Starting player score update job...
Timestamp: 2025-11-17T10:30:00.000Z

Found 1 active tournaments

--- Updating players for tournament: Masters Tournament ---
Found 156 players in database
Fetched 156 players from DataGolf
✅ Updated Tiger Woods: Score=-3, Position=5, Missed Cut=false
✅ Updated Rory McIlroy: Score=-5, Position=2, Missed Cut=false
⚠️  Player xyz (external_id: 12345) not found in DataGolf leaderboard

📊 Summary: Updated 155 players, 1 not found in DataGolf data

✅ Player score update job completed successfully
```

### GitHub Actions Logs

View logs in GitHub:
1. Go to **Actions** tab
2. Click on a workflow run
3. Expand the **Update player scores and positions** step

### Error Handling

The script handles common errors:
- DataGolf API timeout (10 second timeout)
- Missing API key (exits with error code 1)
- Database connection issues
- Players not found in DataGolf data (logged as warnings)

## Troubleshooting

### Common Issues

#### "DATAGOLF_API_KEY environment variable is not set"
**Solution**: Add the API key to your environment variables or GitHub Secrets.

#### "No active tournaments found"
**Solution**: Ensure tournaments exist in the database with `starts_at` and `finishes_at` dates that overlap with the current time.

#### "Player not found in DataGolf leaderboard"
**Solution**:
- Verify the player's `external_id` matches their DataGolf `dg_id`
- Check if the player is actually in the tournament field
- Ensure you're using the correct tour parameter (PGA, European, etc.)

#### "Database connection not available"
**Solution**:
- Check `BE_DATABASE_PASSWORD` is set correctly
- Verify Google Cloud SQL instance is accessible
- Check Cloud SQL Connector configuration in `src/services/cloudsql.ts`

### Testing the Script

Test locally before deploying:

```bash
# Test with development environment
APPLIED_ENV=development yarn update:players

# Test with verbose Node logging
NODE_DEBUG=* yarn update:players
```

## DataGolf API Resources

- **Documentation**: https://datagolf.com/api-docs
- **Field Updates Endpoint**: https://datagolf.com/api-docs#field-updates
- **Tour Options**: PGA Tour, European Tour, Korn Ferry, etc.
- **Rate Limits**: Check your DataGolf plan for API rate limits

## Scheduled Workflow Details

The GitHub Action runs on a cron schedule:
```yaml
schedule:
  - cron: '*/5 * * * *'  # Every 5 minutes
```

**Important Notes**:
- Scheduled workflows only run on the default branch (`master`)
- There may be a 5-10 minute delay in execution
- GitHub disables scheduled workflows after 60 days of repo inactivity
- Maximum workflow run time is 6 hours (this script takes ~5-30 seconds)

## Future Enhancements

Potential improvements:
- [ ] Store DataGolf event_id in tournament table for direct lookup
- [ ] Add hole-by-hole scoring updates to `attempts` field
- [ ] Support multiple tours (PGA, European, LIV, etc.)
- [ ] Add webhook support for real-time updates
- [ ] Implement retry logic for failed API calls
- [ ] Add Slack/Discord notifications for errors
- [ ] Track and log API usage/rate limits

---

## Tournament Creation Script

The `createTournamentFromDataGolf.ts` script fetches tournament schedules from DataGolf API and creates tournaments in your database with all required fields pre-populated.

### Overview

- Fetches tournament schedules from DataGolf API for any supported tour
- Displays available tournaments with dates, courses, and IDs
- Creates tournament records in the database with proper structure
- Automatically populates game-specific fields (entry fees, rules, etc.)
- Supports all major tours: PGA, European Tour, Korn Ferry, and more

### Usage

```bash
# Show all tournaments for current season (PGA Tour by default)
yarn create:tournament

# Show tournaments for a specific tour and season
yarn create:tournament pga 2025

# Show only upcoming tournaments
yarn create:tournament pga 2025 --upcoming

# Create a specific tournament by event ID
yarn create:tournament pga 2025 12        # Create The Masters
yarn create:tournament euro 2025 478      # Create European Tour event
```

### Tour Options

| Tour Code | Description |
|-----------|-------------|
| `pga` | PGA Tour |
| `euro` | DP World Tour (European Tour) |
| `kft` | Korn Ferry Tour |
| `opp` | International Tours |
| `alt` | Alternative/LIV Tour |

### What It Does

1. **Fetches Schedule**: Retrieves tournament schedule from DataGolf's `/preds/schedule` endpoint
2. **Displays Tournaments**: Shows a formatted list of all available tournaments
3. **Creates Tournament**: When given an event ID, creates a tournament record with:
   - Basic info (name, dates, course, country)
   - Game settings (entry fees, cut amounts, scoring limits)
   - Default rules and instructions
   - Tour-specific configuration
   - Custom color scheme for the tournament

### Tournament Fields Populated

#### From DataGolf API:
- `external_id` - DataGolf event ID (for matching with live data)
- `name` - Full tournament name
- `short_name` - Abbreviated name (auto-generated if > 30 chars)
- `starts_at` - Tournament start date
- `finishes_at` - Tournament end date
- `course_name` - Golf course name
- `tour` - Tour type (pga, euro, kft, opp, alt)

#### Game-Specific Defaults:
- `proposed_entry_fee` - 1000 (10.00 in cents)
- `maximum_cut_amount` - 5000 (50.00 in cents)
- `maximum_score_generator` - 400 points
- `players` - Empty array (populate with `sync:player-profiles`)
- `rules` - Default game rules array
- `colours` - Green theme for golf tournaments

#### Optional Fields:
- `description` - Auto-generated from tournament and course name
- `url` - Empty (can be added manually)
- `cover_picture` - Empty (can be added manually)
- `gallery` - Empty array
- `holes` - Empty array (can be populated separately)
- `ads` - Empty array
- `instructions` - Empty array

### Example Output

```bash
$ yarn create:tournament pga 2025 12

🏌️  DataGolf Tournament Creator

⏳ Connecting to database...
✅ Database connected

📡 Fetching PGA tournament schedule for 2025...
✅ Found 47 tournaments

📌 Creating tournament: The Masters

✅ Tournament created successfully!
   ID: cm3k5x8y9000008l4abcd1234
   External ID: 12
   Name: The Masters
   Tour: PGA
   Dates: 4/10/2025 - 4/13/2025

✨ Done! Tournament ID: cm3k5x8y9000008l4abcd1234
```

### Browse Available Tournaments

To see all available tournaments without creating one:

```bash
$ yarn create:tournament pga 2025

📋 Available Tournaments:

════════════════════════════════════════════════════════════════════════════
  1. The Sentry
     ID: 570 | Tour: PGA
     Course: Kapalua Resort (USA)
     Dates: 1/2/2025 - 1/5/2025
────────────────────────────────────────────────────────────────────────────
  2. Sony Open in Hawaii
     ID: 571 | Tour: PGA
     Course: Waialae Country Club (USA)
     Dates: 1/9/2025 - 1/12/2025
────────────────────────────────────────────────────────────────────────────
  3. The Masters
     ID: 12 | Tour: PGA
     Course: Augusta National Golf Club (USA)
     Dates: 4/10/2025 - 4/13/2025
────────────────────────────────────────────────────────────────────────────
[... more tournaments ...]
```

### Show Only Upcoming Tournaments

Use the `--upcoming` or `-u` flag to filter for future tournaments only:

```bash
$ yarn create:tournament pga 2025 --upcoming

📡 Fetching PGA tournament schedule for 2025 (upcoming only)...
✅ Found 23 tournaments

📋 Available Tournaments:
[... only shows tournaments that haven't started yet ...]

💡 Usage:
   npm run create-tournament <tour> <season> <event_id> [--upcoming]
```

This is perfect for planning ahead and creating tournaments before they start!

### Workflow

1. **Browse Tournaments**: Run without event ID to see all available tournaments
2. **Select Tournament**: Note the `event_id` of the tournament you want to create
3. **Create Tournament**: Run again with the specific event ID
4. **Sync Players**: Use `yarn sync:player-profiles <event_id>` to add players
5. **Monitor Scores**: The `update:players` script will automatically update scores

### Customization

To customize tournament settings, modify the options in the script:

```typescript
const tournamentId = await createTournament(tournament, {
  proposedEntryFee: 1000,      // $10.00 entry fee
  maximumCutAmount: 5000,      // $50.00 maximum
  maximumScoreGenerator: 400,  // Max 400 points
  description: 'Custom description',
  coverPicture: 'https://...',
  rules: ['Custom rule 1', 'Custom rule 2'],
});
```

### Next Steps After Creating a Tournament

1. **Add Players**:
   ```bash
   yarn sync:player-profiles 12
   ```

2. **Verify Tournament**:
   - Check your database to confirm the tournament was created
   - Review the `external_id` matches the DataGolf event ID
   - Verify dates are correct

3. **Update Scores** (during tournament):
   ```bash
   yarn update:players
   ```

### Error Handling

Common issues:

#### "Invalid tour: xyz"
**Solution**: Use valid tour codes: `pga`, `euro`, `kft`, `opp`, or `alt`

#### "Tournament with ID 'X' not found"
**Solution**:
- Run without event ID to see available tournaments
- Verify the event ID exists in the schedule
- Check you're using the correct tour and year

#### "DATAGOLF_API_KEY not set"
**Solution**: Add your DataGolf API key to `.env` file

### DataGolf API Integration

The script uses the **Get Schedule endpoint**:
- **URL**: `https://feeds.datagolf.com/get-schedule`
- **Parameters**:
  - `tour` - Tour type (pga, euro, kft, opp, alt)
  - `season` - Season year (defaults to current year)
  - `upcoming_only` - Optional flag to show only future tournaments
  - `file_format=json`
  - `key` - Your API key

### Best Practices

1. **Create tournaments ahead of time**: Create tournaments before they start to allow time for player sync
2. **Use correct event IDs**: Always verify event ID from the schedule before creating
3. **One tournament per event**: Don't create duplicate tournaments for the same event
4. **Sync players after creation**: Always run player sync after creating a tournament

## Support

For issues or questions:
- Check DataGolf API documentation: https://datagolf.com/api-docs
- Review GitHub Actions logs for error details
- Verify all environment variables are set correctly
