/**
 * Shared OpenAPI Schema Definitions
 * These schemas are reusable across all API handlers
 */

// ===== Common Error Schemas =====

export const errorSchema = {
  type: 'object',
  required: ['error', 'message'],
  properties: {
    error: { type: 'string', example: 'Internal Server Error' },
    message: { type: 'string', example: 'An unexpected error occurred' },
  },
};

export const validationErrorSchema = {
  type: 'object',
  required: ['error', 'message'],
  properties: {
    error: { type: 'string', example: 'Invalid request body' },
    message: { type: 'string', example: 'required properties missing' },
    details: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          field: { type: 'string' },
          message: { type: 'string' },
        },
      },
    },
  },
};

export const forbiddenErrorSchema = {
  type: 'object',
  required: ['error', 'message'],
  properties: {
    error: { type: 'string', example: 'Forbidden' },
    message: { type: 'string', example: 'Access denied' },
  },
};

// ===== Common Response Wrappers =====

export const dataWrapper = (schema: any) => ({
  type: 'object',
  required: ['data'],
  properties: {
    data: schema,
  },
});

export const arrayDataWrapper = (itemSchema: any) => ({
  type: 'object',
  required: ['data'],
  properties: {
    data: {
      type: 'array',
      items: itemSchema,
    },
  },
});

// ===== User Schemas =====

export const depositLimitSchema = {
  type: 'object',
  required: ['daily', 'weekly', 'monthly'],
  properties: {
    daily: { type: 'number', nullable: true, minimum: 0, description: 'Daily deposit limit' },
    weekly: { type: 'number', nullable: true, minimum: 0, description: 'Weekly deposit limit' },
    monthly: { type: 'number', nullable: true, minimum: 0, description: 'Monthly deposit limit' },
  },
};

export const addressSchema = {
  type: 'object',
  required: ['line1', 'line2', 'town', 'postcode', 'country'],
  properties: {
    line1: { type: 'string', description: 'Address line 1 (street name and number)' },
    line2: { type: 'string', description: 'Address line 2' },
    line3: { type: 'string', nullable: true, description: 'Address line 3 (optional)' },
    town: { type: 'string', description: 'Town or city' },
    county: { type: 'string', nullable: true, description: 'County or state (optional)' },
    postcode: { type: 'string', description: 'Postal code or ZIP code' },
    country: {
      type: 'string',
      pattern: '^[A-Z]{2}$',
      description: 'ISO 3166-1 alpha-2 country code (e.g., US, GB, CA)',
    },
  },
};

export const userSchema = {
  type: 'object',
  required: ['id', 'email', 'created_at', 'updated_at'],
  properties: {
    id: { type: 'string', format: 'uuid', description: 'Unique user identifier' },
    first_name: { type: 'string', nullable: true, maxLength: 100 },
    last_name: { type: 'string', nullable: true, maxLength: 100 },
    nickname: { type: 'string', nullable: true, maxLength: 50 },
    email: { type: 'string', format: 'email', description: 'User email address' },
    date_of_birth: { type: 'string', nullable: true, description: 'User date of birth' },
    bio: { type: 'string', nullable: true, maxLength: 500 },
    profile_picture: { type: 'string', format: 'uri', nullable: true },
    phone_number: { type: 'string', nullable: true, pattern: '^\\+[1-9]\\d{1,14}$' },
    game_stop_id: { type: 'string', nullable: true },
    is_auth_verified: { type: 'boolean', default: false },
    is_identity_verified: { type: 'boolean', default: false },
    deposit_limit: depositLimitSchema,
    betting_limit: { type: 'number', minimum: 0, description: 'Maximum betting amount per bet' },
    payment_id: { type: 'string', nullable: true },
    current_balance: {
      type: 'number',
      minimum: 0,
      default: 0,
      description: 'Current account balance',
    },
    is_self_excluded: { type: 'boolean', default: false },
    is_admin: { type: 'boolean', default: false },
    kyc_completed: { type: 'boolean', default: false },
    kyc_instance_id: { type: 'string', nullable: true },
    exclusion_ending: {
      type: 'string',
      format: 'date-time',
      nullable: true,
      description: 'Self-exclusion end date',
    },
    address: { ...addressSchema, nullable: true },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
  },
};

// ===== League Schemas =====

export const leagueSchema = {
  type: 'object',
  required: ['id', 'name', 'entry_fee', 'start_time', 'end_time', 'tournament_id', 'owner_id'],
  properties: {
    id: { type: 'string', format: 'uuid', description: 'Unique league identifier' },
    name: { type: 'string', minLength: 1, maxLength: 200, description: 'League name' },
    description: { type: 'string', default: '', maxLength: 1000 },
    entry_fee: { type: 'number', minimum: 0, description: 'Entry fee to join the league' },
    contact_phone: { type: 'string', default: '', pattern: '^\\+[1-9]\\d{1,14}$' },
    contact_email: { type: 'string', format: 'email', default: '' },
    contact_visibility: { type: 'boolean', default: false },
    join_code: {
      type: 'string',
      default: '',
      description: 'Code to join the league (only visible to league owner)',
    },
    max_participants: { type: 'number', minimum: 2, default: 100 },
    rewards: { type: 'array', items: { type: 'object' }, default: [] },
    start_time: { type: 'string', format: 'date-time', description: 'League start time' },
    end_time: { type: 'string', format: 'date-time', description: 'League end time' },
    type: { type: 'string', enum: ['public', 'private'], default: 'public' },
    user_id_list: { type: 'array', items: { type: 'string' }, default: [] },
    is_featured: { type: 'boolean', default: false, description: 'Whether the league is featured' },
    joined_players: {
      type: 'array',
      items: { type: 'string' },
      default: [],
      description: 'Array of user IDs who have joined',
    },
    tournament_id: { type: 'string', description: 'Associated tournament ID' },
    owner_id: { type: 'string', description: 'League owner user ID' },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
  },
};

// ===== Player Schemas =====

export const playerAttemptSchema = {
  type: 'object',
  required: ['day', 'hole_id', 'hole_name', 'par', 'attempt'],
  properties: {
    day: { type: 'string', description: 'Day of the attempt' },
    hole_id: { type: 'string', description: 'Hole identifier' },
    hole_name: { type: 'string', description: 'Hole name' },
    par: { type: 'number', description: 'Par for the hole' },
    attempt: { type: 'number', minimum: 0, description: 'Number of attempts' },
  },
};

export const playerAttemptsSchema = {
  type: 'array',
  items: playerAttemptSchema,
  default: [],
  description: 'Array of player attempts by hole',
};

export const playerSchema = {
  type: 'object',
  required: ['id', 'external_id', 'level', 'profile_id', 'tournament_id'],
  properties: {
    id: { type: 'string', format: 'uuid', description: 'Unique player identifier' },
    external_id: { type: 'string', description: 'External API player identifier' },
    level: { type: 'number', minimum: 1, maximum: 5, description: 'Player skill level' },
    current_score: { type: 'number', default: 0, description: 'Current tournament score' },
    position: { type: 'number', default: 0, description: 'Current leaderboard position' },
    attempts: playerAttemptsSchema,
    missed_cut: { type: 'boolean', default: false },
    odds: { type: 'number', minimum: 0, default: 0, description: 'Betting odds' },
    profile_id: { type: 'string', description: 'Player profile reference' },
    tournament_id: { type: 'string', description: 'Reference to tournament' },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
  },
};

export const playerProfileSchema = {
  type: 'object',
  required: [
    'id',
    'external_id',
    'first_name',
    'last_name',
    'country',
    'age',
    'ranking',
    'profile_picture',
  ],
  properties: {
    id: { type: 'string', format: 'uuid', description: 'Unique profile identifier' },
    external_id: { type: 'string', description: 'External API player identifier', default: '' },
    first_name: { type: 'string', minLength: 1, maxLength: 100 },
    last_name: { type: 'string', minLength: 1, maxLength: 100 },
    country: { type: 'string', pattern: '^[A-Z]{2,3}$', description: 'ISO country code' },
    age: { type: 'number', minimum: 18, maximum: 100, description: 'Player age' },
    ranking: { type: 'number', minimum: 1, description: 'World ranking' },
    profile_picture: { type: 'string', description: 'Profile picture URL' },
    group: { type: 'string', description: 'Player group', default: '' },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
  },
};

// ===== Tournament Schemas =====

export const tournamentHoleSchema = {
  type: 'object',
  required: ['id', 'name', 'position', 'par', 'distance', 'cover_image'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string', minLength: 1, maxLength: 100 },
    description: { type: 'string', default: '', maxLength: 500 },
    position: { type: 'number', minimum: 1, maximum: 18 },
    cover_image: { type: 'string', default: '', description: 'Cover image URL' },
    par: { type: 'number', minimum: 3, maximum: 6 },
    distance: { type: 'number', minimum: 0, description: 'Distance in yards' },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
  },
};

export const tournamentAdSchema = {
  type: 'object',
  required: ['id', 'name', 'position'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string', minLength: 1, maxLength: 200 },
    description: { type: 'string', nullable: true, maxLength: 1000 },
    position: { type: 'number', minimum: 1 },
    website: { type: 'string', format: 'uri', nullable: true },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
  },
};

export const tournamentSchema = {
  type: 'object',
  required: [
    'id',
    'external_id',
    'name',
    'starts_at',
    'finishes_at',
    'proposed_entry_fee',
    'maximum_cut_amount',
    'maximum_score_generator',
    'colours',
    'sport',
    'rules',
  ],
  properties: {
    id: { type: 'string', format: 'uuid', description: 'Unique tournament identifier' },
    external_id: { type: 'string', description: 'External tournament identifier' },
    name: { type: 'string', minLength: 1, maxLength: 200 },
    starts_at: { type: 'string', format: 'date-time', description: 'Tournament start date' },
    finishes_at: { type: 'string', format: 'date-time', description: 'Tournament end date' },
    description: { type: 'string', default: '', maxLength: 2000 },
    url: { type: 'string', default: '', description: 'Tournament URL' },
    cover_picture: { type: 'string', default: '', description: 'Cover picture URL' },
    gallery: { type: 'array', items: { type: 'string', format: 'uri' }, default: [] },
    holes: { type: 'array', items: tournamentHoleSchema, default: [] },
    ads: { type: 'array', items: tournamentAdSchema, default: [] },
    proposed_entry_fee: { type: 'number', minimum: 0, description: 'Proposed entry fee' },
    maximum_cut_amount: { type: 'number', minimum: 0, description: 'Maximum cut amount' },
    maximum_score_generator: { type: 'number', minimum: 0, description: 'Maximum score generator' },
    players: { type: 'array', items: playerSchema, default: [] },
    colours: {
      type: 'object',
      properties: {
        primary: { type: 'string', description: 'Primary colour' },
        secondary: { type: 'string', description: 'Secondary colour' },
        highlight: { type: 'string', description: 'Highlight colour' },
      },
    },
    sport: { type: 'string', enum: ['Golf'], default: 'Golf', description: 'Sport type' },
    rules: { type: 'array', items: { type: 'string' }, description: 'Tournament rules' },
    instructions: {
      type: 'array',
      items: { type: 'string' },
      default: [],
      description: 'Tournament instructions',
    },
    course_name: { type: 'string', default: '', description: 'Course name' },
    tour: {
      type: 'string',
      enum: ['pga', 'euro', 'kft', 'opp', 'alt', 'major'],
      default: 'pga',
      description:
        'Tournament tour type: pga (PGA Tour), euro (European Tour), kft (Korn Ferry Tour), opp (opposite field), alt (alternate event), major (Major Championship)',
    },
    is_live: {
      type: 'boolean',
      description: 'Whether the tournament is currently live (started but not finished)',
    },
    is_finished: {
      type: 'boolean',
      description: 'Whether the tournament has finished',
    },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
  },
};

// ===== Team & Bet Schemas =====

export const teamSchema = {
  type: 'object',
  required: ['id', 'owner_id', 'league_id', 'player_ids'],
  properties: {
    id: { type: 'string', format: 'uuid', description: 'Unique team identifier' },
    owner_id: { type: 'string', description: 'User who owns this team' },
    league_id: { type: 'string', description: 'League this team belongs to' },
    name: { type: 'string', nullable: true, description: 'Team name' },
    position: { type: 'string', nullable: true, description: 'Team position/rank' },
    player_ids: {
      type: 'array',
      items: { type: 'string' },
      default: [],
      description: 'Array of player IDs in the team',
    },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
  },
};

export const betSchema = {
  type: 'object',
  required: ['id', 'owner_id', 'league_id', 'team_id', 'amount'],
  properties: {
    id: { type: 'string', format: 'uuid', description: 'Unique bet identifier' },
    owner_id: { type: 'string', description: 'User who placed the bet' },
    league_id: { type: 'string', description: 'League this bet is for' },
    team_id: { type: 'string', description: 'Team selected for this bet' },
    amount: { type: 'number', minimum: 1, description: 'Bet amount in currency units' },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
  },
};

// ===== Transaction Schemas =====

export const transactionSchema = {
  type: 'object',
  required: ['id', 'name', 'user_id', 'type', 'value'],
  properties: {
    id: { type: 'string', format: 'uuid', description: 'Unique transaction identifier' },
    name: { type: 'string', maxLength: 200, description: 'Transaction name' },
    value: { type: 'number', minimum: 0, description: 'Transaction amount' },
    type: { type: 'string', enum: ['deposit', 'withdrawal'], description: 'Transaction type' },
    charge_id: { type: 'string', default: '', description: 'Payment processor charge ID' },
    user_id: { type: 'string', description: 'User who made the transaction' },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
  },
};

export const transactionSummarySchema = {
  type: 'object',
  required: ['deposited', 'withdrawn', 'netProfit', 'transactions'],
  properties: {
    deposited: { type: 'number', minimum: 0, description: 'Total amount deposited' },
    withdrawn: { type: 'number', minimum: 0, description: 'Total amount withdrawn' },
    netProfit: { type: 'number', description: 'Net profit (withdrawn - deposited)' },
    transactions: {
      type: 'array',
      items: transactionSchema,
      description: 'List of transactions',
    },
  },
};

// ===== Common Response Schemas =====

export const standardResponses = {
  200: {
    description: 'Successful operation',
  },
  201: {
    description: 'Resource created successfully',
  },
  204: {
    description: 'No Content - Operation successful with no response body',
  },
  400: {
    description: 'Bad Request',
    content: {
      'application/json': {
        schema: errorSchema,
        example: {
          error: 'Bad Request',
          message: 'Invalid request format',
        },
      },
    },
  },
  401: {
    description: 'Unauthorized - Authentication required',
    content: {
      'application/json': {
        schema: errorSchema,
        example: {
          error: 'Unauthorized',
          message: 'Authentication required',
        },
      },
    },
  },
  403: {
    description: 'Forbidden - Insufficient permissions',
    content: {
      'application/json': {
        schema: forbiddenErrorSchema,
        example: {
          error: 'Forbidden',
          message: 'You do not have permission to access this resource',
        },
      },
    },
  },
  404: {
    description: 'Not Found',
    content: {
      'application/json': {
        schema: errorSchema,
        example: {
          error: 'Not Found',
          message: 'Resource not found',
        },
      },
    },
  },
  422: {
    description: 'Validation Error - Invalid or missing required fields',
    content: {
      'application/json': {
        schema: validationErrorSchema,
        example: {
          error: 'Invalid request body',
          message: 'required properties missing',
          details: [{ field: 'amount', message: 'Amount must be greater than 0' }],
        },
      },
    },
  },
  500: {
    description: 'Internal Server Error',
    content: {
      'application/json': {
        schema: errorSchema,
        example: {
          error: 'Internal Server Error',
          message: 'An unexpected error occurred',
        },
      },
    },
  },
};

// ===== Security Schemas =====

export const apiKeyAuth = {
  ApiKeyAuth: [],
};
