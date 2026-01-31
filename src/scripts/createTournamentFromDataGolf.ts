import { createId } from '@paralleldrive/cuid2';
import axios from 'axios';
import * as dotenv from 'dotenv';
import { tournaments } from '../models';
import { database, ensureDatabaseReady } from '../services';
dotenv.config();

interface DataGolfScheduleEvent {
  event_id: string;
  event_name: string;
  country: string;
  course: string;
  start_date?: string;
  end_date?: string;
  date?: string; // Alternative date field
  tour: string;
  latitude?: number;
  longitude?: number;
  prize_fund?: number;
  [key: string]: any;
}

interface DataGolfScheduleResponse {
  schedule: DataGolfScheduleEvent[];
}

const DATAGOLF_API_KEY = process.env.DATAGOLF_API_KEY;
const DATAGOLF_BASE_URL = 'https://feeds.datagolf.com';

if (!DATAGOLF_API_KEY) {
  console.error('ERROR: DATAGOLF_API_KEY environment variable is not set');
  process.exit(1);
}

/**
 * Fetch tournament schedule from DataGolf
 * @param tour - Tour type (pga, euro, kft, opp, alt)
 * @param season - Season year (optional, defaults to current year)
 * @param upcomingOnly - Only show upcoming tournaments (optional, defaults to false)
 */
async function fetchTournamentSchedule(
  tour: string = 'pga',
  season?: number,
  upcomingOnly: boolean = false,
): Promise<DataGolfScheduleEvent[]> {
  try {
    const currentSeason = season || new Date().getFullYear();
    const upcomingParam = upcomingOnly ? '&upcoming_only=true' : '';
    const endpoint = `/get-schedule?tour=${tour}&season=${currentSeason}${upcomingParam}&file_format=json&key=${DATAGOLF_API_KEY}`;

    console.log(`📡 Fetching ${tour.toUpperCase()} tournament schedule for ${currentSeason}${upcomingOnly ? ' (upcoming only)' : ''}...`);

    const response = await axios.get(`${DATAGOLF_BASE_URL}${endpoint}`, {
      headers: {
        Accept: 'application/json',
      },
      timeout: 15000,
    });

    const schedule = response.data.schedule || [];
    console.log(`✅ Found ${schedule.length} tournaments\n`);

    // Debug: Log first tournament to see data structure
    if (schedule.length > 0) {
      console.log('📝 Sample tournament data structure:');
      console.log(JSON.stringify(schedule[0], null, 2));
      console.log('\n');
    }

    return schedule;
  } catch (error: any) {
    console.error('Error fetching tournament schedule:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return [];
  }
}

/**
 * Parse date safely from DataGolf data
 */
function parseTournamentDate(eventData: DataGolfScheduleEvent, isEndDate: boolean = false): Date {
  // Try different date field names that DataGolf might use
  const dateStr = eventData.start_date || eventData.end_date || eventData.date;

  if (!dateStr) {
    console.warn('⚠️  No date found in event data:', eventData);
    throw new Error('No valid date field found in tournament data');
  }

  // For end_date, if it exists use it, otherwise use start_date + 3 days as default
  if (isEndDate && eventData.end_date) {
    const date = new Date(eventData.end_date);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid end_date format: ${eventData.end_date}`);
    }
    return date;
  }

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date format: ${dateStr}`);
  }

  // If this is end date and we only have start_date, add 3 days (typical tournament length)
  if (isEndDate && !eventData.end_date) {
    date.setDate(date.getDate() + 3);
  }

  return date;
}

/**
 * Display available tournaments and let user select one
 */
function displayTournaments(tournaments: DataGolfScheduleEvent[]): void {
  console.log('📋 Available Tournaments:\n');
  console.log('═'.repeat(100));

  tournaments.forEach((tournament, index) => {
    try {
      const startDate = parseTournamentDate(tournament, false).toLocaleDateString();
      const endDate = parseTournamentDate(tournament, true).toLocaleDateString();

      console.log(`${(index + 1).toString().padStart(3)}. ${tournament.event_name}`);
      console.log(`     ID: ${tournament.event_id} | Tour: ${tournament.tour.toUpperCase()}`);
      console.log(`     Course: ${tournament.course} (${tournament.country})`);
      console.log(`     Dates: ${startDate} - ${endDate}`);
      console.log('─'.repeat(100));
    } catch (error: any) {
      console.error(`⚠️  Error parsing dates for ${tournament.event_name}:`, error.message);
      console.log(`     Raw data:`, JSON.stringify(tournament, null, 2));
    }
  });

  console.log('\n');
}

/**
 * Create a tournament in the database from DataGolf data
 */
async function createTournament(
  eventData: DataGolfScheduleEvent,
  options: {
    proposedEntryFee?: number;
    maximumCutAmount?: number;
    maximumScoreGenerator?: number;
    description?: string;
    coverPicture?: string;
    rules?: string[];
  } = {},
): Promise<string> {
  try {
    const tournamentId = createId();

    // Parse dates safely
    const startsAt = parseTournamentDate(eventData, false);
    const finishesAt = parseTournamentDate(eventData, true);

    // Default values for game-specific fields
    const defaultRules = [
      'Select your team of golfers within the entry fee limit',
      'Players earn points based on their tournament performance',
      'Lower scores relative to par earn more points',
      'The team with the highest total score wins',
    ];

    const tournamentData = {
      id: tournamentId,
      external_id: eventData.event_id,
      name: eventData.event_name,
      short_name: eventData.event_name.length > 30
        ? eventData.event_name.substring(0, 27) + '...'
        : eventData.event_name,
      starts_at: startsAt,
      finishes_at: finishesAt,
      description: options.description || `${eventData.event_name} at ${eventData.course}`,
      url: '',
      cover_picture: options.coverPicture || '',
      gallery: [],
      holes: [],
      ads: [],
      proposed_entry_fee: options.proposedEntryFee || 1000, // Default: 10.00 (in cents)
      maximum_cut_amount: options.maximumCutAmount || 5000, // Default: 50.00 (in cents)
      maximum_score_generator: options.maximumScoreGenerator || 400, // Default maximum score
      players: [],
      colours: {
        primary: '#1a472a',
        secondary: '#2d5f3e',
        highlight: '#4ade80',
      },
      sport: 'Golf',
      rules: options.rules || defaultRules,
      instructions: [],
      course_name: eventData.course || '',
      tour: eventData.tour.toLowerCase(),
      created_at: new Date(),
      updated_at: new Date(),
    };

    await database.insert(tournaments).values(tournamentData).execute();

    console.log('✅ Tournament created successfully!');
    console.log(`   ID: ${tournamentId}`);
    console.log(`   External ID: ${eventData.event_id}`);
    console.log(`   Name: ${eventData.event_name}`);
    console.log(`   Tour: ${eventData.tour.toUpperCase()}`);
    console.log(`   Dates: ${tournamentData.starts_at.toLocaleDateString()} - ${tournamentData.finishes_at.toLocaleDateString()}`);

    return tournamentId;
  } catch (error: any) {
    console.error('Error creating tournament:', error.message);
    throw error;
  }
}

/**
 * Main execution function
 */
async function main() {
  try {
    console.log('🏌️  DataGolf Tournament Creator\n');

    // Get command line arguments
    const args = process.argv.slice(2);
    const tour = args[0] || 'pga'; // Default to PGA
    const season = args[1] ? parseInt(args[1]) : undefined;
    const eventId = args[2]; // Optional: specific event ID
    const upcomingOnly = args[3] === '--upcoming' || args[3] === '-u'; // Optional: upcoming only flag

    // Validate tour
    const validTours = ['pga', 'euro', 'kft', 'opp', 'alt'];
    if (!validTours.includes(tour.toLowerCase())) {
      console.error(`❌ Invalid tour: ${tour}`);
      console.log(`Valid tours: ${validTours.join(', ')}`);
      process.exit(1);
    }

    // Connect to database
    console.log('⏳ Connecting to database...');
    await ensureDatabaseReady();
    console.log('✅ Database connected\n');

    // Fetch tournament schedule
    const schedule = await fetchTournamentSchedule(tour, season, upcomingOnly);

    if (schedule.length === 0) {
      console.log('❌ No tournaments found');
      process.exit(1);
    }

    // If event ID is provided, find and create that tournament
    if (eventId) {
      const tournament = schedule.find(t => t.event_id === eventId);

      if (!tournament) {
        console.error(`❌ Tournament with ID "${eventId}" not found`);
        process.exit(1);
      }

      console.log(`\n📌 Creating tournament: ${tournament.event_name}\n`);

      const tournamentId = await createTournament(tournament, {
        proposedEntryFee: 1000, // $10.00
        maximumCutAmount: 5000, // $50.00
        maximumScoreGenerator: 400,
      });

      console.log(`\n✨ Done! Tournament ID: ${tournamentId}`);
      process.exit(0);
    }

    // Otherwise, display all tournaments for manual selection
    displayTournaments(schedule);

    console.log('💡 Usage:');
    console.log('   npm run create-tournament <tour> <season> <event_id> [--upcoming]');
    console.log('\n   Examples:');
    console.log('   npm run create-tournament pga 2025 12           # Create The Masters');
    console.log('   npm run create-tournament euro 2025 478         # Create European Tour event');
    console.log('   npm run create-tournament pga                   # Show all PGA tournaments for current season');
    console.log('   npm run create-tournament pga 2026 --upcoming   # Show only upcoming PGA tournaments');
    console.log('\n   Tours: pga, euro, kft, opp, alt');
    console.log('   Flags: --upcoming or -u (show only future tournaments)');

  } catch (error: any) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
}

// Run the script
main();
