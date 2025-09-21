# API Endpoints Documentation

## Authentication

All authenticated endpoints require a custom auth token in the x-auth-id header:

```
x-auth-id: <token>
```

## Public Endpoints (No Authentication Required)

### Users

#### Create User

- **Method:** `POST`
- **Route:** `/api/users`
- **Request Body:**

```json
{
  "id": "string",
  "first_name": "string",
  "last_name": "string",
  "email": "string",
  "bio": "string",
  "profile_picture": "string",
  "phone_number": "string",
  "game_stop_id": "string"
}
```

- **Response:** `201 Created`

```json
{
  "id": "user123",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@example.com",
  "bio": "Golf enthusiast",
  "profile_picture": "https://example.com/avatar.jpg",
  "phone_number": "+1234567890",
  "game_stop_id": "gs123",
  "is_auth_verified": false,
  "is_identity_verified": false,
  "deposit_limit": 0,
  "betting_limit": 0,
  "payment_id": "",
  "current_balance": 0,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

## Authenticated User Endpoints

### Current User

#### Get Current User

- **Method:** `GET`
- **Route:** `/api/users/me`
- **Response:** `200 OK`

```json
{
  "id": "user123",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@example.com",
  "bio": "Golf enthusiast",
  "profile_picture": "https://example.com/avatar.jpg",
  "phone_number": "+1234567890",
  "game_stop_id": "gs123",
  "is_auth_verified": true,
  "is_identity_verified": true,
  "deposit_limit": 1000,
  "betting_limit": 500,
  "payment_id": "pay123",
  "current_balance": 250,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

#### Update Current User

- **Method:** `PUT`
- **Route:** `/api/users/me`
- **Request Body:**

```json
{
  "first_name": "string",
  "last_name": "string",
  "bio": "string",
  "profile_picture": "string",
  "phone_number": "string",
  "deposit_limit": 1000,
  "betting_limit": 500
}
```

- **Response:** `200 OK` (Updated user object)

#### Delete Current User

- **Method:** `DELETE`
- **Route:** `/api/users/me`
- **Response:** `204 No Content`

```json
{}
```

### Transactions

#### Get Transactions

- **Method:** `GET`
- **Route:** `/api/transactions`
- **Query Parameters:**
  - `type` (optional): Filter by transaction type
- **Response:** `200 OK`

```json
[
  {
    "id": "txn123",
    "name": "Deposit",
    "value": "100.00",
    "type": "deposit",
    "charge_id": "ch_123",
    "user_id": "user123",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
]
```

### Games

#### Get All Games

- **Method:** `GET`
- **Route:** `/api/games`
- **Query Parameters:**
  - `tournament_id` (optional): Filter by tournament ID
  - `entry_fee` (optional): Filter by entry fee
  - `max_participants` (optional): Filter by maximum participants
- **Response:** `200 OK`

```json
[
  {
    "id": "game123",
    "name": "Masters Tournament Pool",
    "description": "Betting pool for the Masters",
    "entry_fee": 50,
    "contact_phone": "+1234567890",
    "contact_email": "contact@example.com",
    "contact_visibility": true,
    "join_code": "MASTERS2024",
    "max_participants": 100,
    "rewards": [
      {
        "position": 1,
        "percentage": 50,
        "type": "cash",
        "product_id": ""
      }
    ],
    "start_time": "2024-04-11T08:00:00Z",
    "end_time": "2024-04-14T20:00:00Z",
    "owner_id": "user123",
    "tournament_id": "tournament123",
    "user_id_list": ["user123", "user456"],
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
]
```

#### Create Game

- **Method:** `POST`
- **Route:** `/api/games`
- **Request Body:**

```json
{
  "name": "string",
  "description": "string",
  "entry_fee": 50,
  "contact_phone": "string",
  "contact_email": "string",
  "contact_visibility": true,
  "join_code": "string",
  "max_participants": 100,
  "rewards": [
    {
      "position": 1,
      "percentage": 50,
      "type": "cash",
      "product_id": ""
    }
  ],
  "start_time": "2024-04-11T08:00:00Z",
  "end_time": "2024-04-14T20:00:00Z",
  "tournament_id": "string"
}
```

- **Response:** `201 Created` (New game object)

#### Get Game by ID

- **Method:** `GET`
- **Route:** `/api/games/:id`
- **URL Parameters:**
  - `id`: Game ID
- **Response:** `200 OK`

```json
{
  "game": {
    "id": "game123",
    "name": "Masters Tournament Pool",
    "description": "Betting pool for the Masters",
    "entry_fee": 50,
    "contact_phone": "+1234567890",
    "contact_email": "contact@example.com",
    "contact_visibility": true,
    "join_code": "MASTERS2024",
    "max_participants": 100,
    "rewards": [],
    "start_time": "2024-04-11T08:00:00Z",
    "end_time": "2024-04-14T20:00:00Z",
    "owner_id": "user123",
    "tournament_id": "tournament123",
    "user_id_list": ["user123", "user456"],
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  },
  "tournament": {
    "id": "tournament123",
    "name": "Masters Tournament",
    "starts_at": "2024-04-11T08:00:00Z",
    "finishes_at": "2024-04-14T20:00:00Z",
    "description": "The Masters Tournament",
    "url": "https://masters.com",
    "cover_picture": "https://example.com/masters.jpg",
    "gallery": [],
    "holes": [],
    "ads": [],
    "proposed_entry_fee": 50,
    "maximum_cut_amount": 1000,
    "maximum_score_generator": 300,
    "players": [],
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  },
  "user_bets": [
    {
      "id": "bet123",
      "owner_id": "user123",
      "game_id": "game123",
      "player_id": "player123",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### Update Game

- **Method:** `PUT`
- **Route:** `/api/games/:id`
- **URL Parameters:**
  - `id`: Game ID
- **Request Body:** (Same as Create Game)
- **Response:** `200 OK` (Updated game object)

#### Delete Game

- **Method:** `DELETE`
- **Route:** `/api/games/:id`
- **URL Parameters:**
  - `id`: Game ID
- **Response:** `204 No Content`

```json
{}
```

### Bets

#### Get Bets

- **Method:** `GET`
- **Route:** `/api/bets`
- **Query Parameters:**
  - `game_id` (optional): Filter by game ID
- **Response:** `200 OK`

```json
[
  {
    "id": "bet123",
    "owner_id": "user123",
    "game_id": "game123",
    "player_id": "player123",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
]
```

#### Create Bet

- **Method:** `POST`
- **Route:** `/api/bets`
- **Request Body:**

```json
{
  "game_id": "string",
  "player_id": "string"
}
```

- **Response:** `201 Created` (New bet object)

#### Update Bet

- **Method:** `PUT`
- **Route:** `/api/bets/:id`
- **URL Parameters:**
  - `id`: Bet ID
- **Request Body:**

```json
{
  "player_id": "string"
}
```

- **Response:** `200 OK` (Updated bet object)

#### Delete Bet

- **Method:** `DELETE`
- **Route:** `/api/bets/:id`
- **URL Parameters:**
  - `id`: Bet ID
- **Response:** `204 No Content`

```json
{}
```

### Player Profiles

#### Get Player Profiles

- **Method:** `GET`
- **Route:** `/api/player-profiles`
- **Query Parameters:**
  - `country` (optional): Filter by country
- **Response:** `200 OK`

```json
[
  {
    "id": "profile123",
    "external_id": "ext123",
    "first_name": "Tiger",
    "last_name": "Woods",
    "country": "USA",
    "age": 48,
    "ranking": 1,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
]
```

## Super Admin Endpoints

### Users Management

#### Get All Users

- **Method:** `GET`
- **Route:** `/api/admin/users`
- **Response:** `200 OK`

```json
[
  {
    "id": "user123",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@example.com",
    "bio": "Golf enthusiast",
    "profile_picture": "https://example.com/avatar.jpg",
    "phone_number": "+1234567890",
    "game_stop_id": "gs123",
    "is_auth_verified": true,
    "is_identity_verified": true,
    "deposit_limit": 1000,
    "betting_limit": 500,
    "payment_id": "pay123",
    "current_balance": 250,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
]
```

#### Update User

- **Method:** `PUT`
- **Route:** `/api/admin/users/:id`
- **URL Parameters:**
  - `id`: User ID
- **Request Body:** (Same as Update Current User)
- **Response:** `200 OK` (Updated user object)

#### Delete User

- **Method:** `DELETE`
- **Route:** `/api/admin/users/:id`
- **URL Parameters:**
  - `id`: User ID
- **Response:** `204 No Content`

```json
{}
```

### Transactions Management

#### Get All Transactions

- **Method:** `GET`
- **Route:** `/api/admin/transactions`
- **Response:** `200 OK`

```json
[
  {
    "id": "txn123",
    "name": "Deposit",
    "value": "100.00",
    "type": "deposit",
    "charge_id": "ch_123",
    "user_id": "user123",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
]
```

#### Create Transaction

- **Method:** `POST`
- **Route:** `/api/admin/transactions`
- **Request Body:**

```json
{
  "name": "string",
  "value": "string",
  "type": "string",
  "charge_id": "string",
  "user_id": "string"
}
```

- **Response:** `201 Created` (New transaction object)

#### Update Transaction

- **Method:** `PUT`
- **Route:** `/api/admin/transactions/:id`
- **URL Parameters:**
  - `id`: Transaction ID
- **Request Body:** (Same as Create Transaction)
- **Response:** `200 OK` (Updated transaction object)

#### Delete Transaction

- **Method:** `DELETE`
- **Route:** `/api/admin/transactions/:id`
- **URL Parameters:**
  - `id`: Transaction ID
- **Response:** `204 No Content`

```json
{}
```

### Tournaments Management

#### Get All Tournaments

- **Method:** `GET`
- **Route:** `/api/admin/tournaments`
- **Response:** `200 OK`

```json
[
  {
    "id": "tournament123",
    "name": "Masters Tournament",
    "starts_at": "2024-04-11T08:00:00Z",
    "finishes_at": "2024-04-14T20:00:00Z",
    "description": "The Masters Tournament",
    "url": "https://masters.com",
    "cover_picture": "https://example.com/masters.jpg",
    "gallery": ["https://example.com/gallery1.jpg"],
    "holes": [
      {
        "id": "hole1",
        "name": "Hole 1",
        "description": "First hole",
        "position": 1,
        "cover_image": "https://example.com/hole1.jpg",
        "par": 4,
        "distance": 445
      }
    ],
    "ads": [
      {
        "id": "ad1",
        "name": "Sponsor Ad",
        "description": "Advertisement",
        "position": 1,
        "website": "https://sponsor.com"
      }
    ],
    "proposed_entry_fee": 50,
    "maximum_cut_amount": 1000,
    "maximum_score_generator": 300,
    "players": [
      {
        "id": "player123",
        "level": 1
      }
    ],
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
]
```

#### Create Tournament

- **Method:** `POST`
- **Route:** `/api/admin/tournaments`
- **Request Body:**

```json
{
  "name": "string",
  "starts_at": "2024-04-11T08:00:00Z",
  "finishes_at": "2024-04-14T20:00:00Z",
  "description": "string",
  "url": "string",
  "cover_picture": "string",
  "gallery": ["string"],
  "holes": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "position": 1,
      "cover_image": "string",
      "par": 4,
      "distance": 445
    }
  ],
  "ads": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "position": 1,
      "website": "string"
    }
  ],
  "proposed_entry_fee": 50,
  "maximum_cut_amount": 1000,
  "maximum_score_generator": 300,
  "players": [
    {
      "id": "string",
      "level": 1
    }
  ]
}
```

- **Response:** `201 Created` (New tournament object)

#### Update Tournament

- **Method:** `PUT`
- **Route:** `/api/admin/tournaments/:id`
- **URL Parameters:**
  - `id`: Tournament ID
- **Request Body:** (Same as Create Tournament)
- **Response:** `200 OK` (Updated tournament object)

#### Delete Tournament

- **Method:** `DELETE`
- **Route:** `/api/admin/tournaments/:id`
- **URL Parameters:**
  - `id`: Tournament ID
- **Response:** `204 No Content`

```json
{}
```

### Games Management (Admin)

#### Get All Games (Admin)

- **Method:** `GET`
- **Route:** `/api/admin/games`
- **Response:** `200 OK` (Same structure as user games endpoint)

#### Update Game (Admin)

- **Method:** `PUT`
- **Route:** `/api/admin/games/:id`
- **URL Parameters:**
  - `id`: Game ID
- **Request Body:** (Same as Create Game)
- **Response:** `200 OK` (Updated game object)

#### Delete Game (Admin)

- **Method:** `DELETE`
- **Route:** `/api/admin/games/:id`
- **URL Parameters:**
  - `id`: Game ID
- **Response:** `204 No Content`

```json
{}
```

### Player Profiles Management

#### Get All Player Profiles (Admin)

- **Method:** `GET`
- **Route:** `/api/admin/player-profiles`
- **Response:** `200 OK` (Same structure as user player profiles endpoint)

#### Create Player Profile

- **Method:** `POST`
- **Route:** `/api/admin/player-profiles`
- **Request Body:**

```json
{
  "external_id": "string",
  "first_name": "string",
  "last_name": "string",
  "country": "string",
  "age": 25,
  "ranking": 1
}
```

- **Response:** `201 Created` (New player profile object)

#### Update Player Profile

- **Method:** `PUT`
- **Route:** `/api/admin/player-profiles/:id`
- **URL Parameters:**
  - `id`: Player Profile ID
- **Request Body:** (Same as Create Player Profile)
- **Response:** `200 OK` (Updated player profile object)

#### Delete Player Profile

- **Method:** `DELETE`
- **Route:** `/api/admin/player-profiles/:id`
- **URL Parameters:**
  - `id`: Player Profile ID
- **Response:** `204 No Content`

```json
{}
```

### Players Management

#### Get Players by Tournament

- **Method:** `GET`
- **Route:** `/api/admin/tournaments/:tournamentId/players`
- **URL Parameters:**
  - `tournamentId`: Tournament ID
- **Response:** `200 OK`

```json
[
  {
    "id": "player123",
    "external_id": "ext123",
    "level": 1,
    "current_score": 72,
    "position": 1,
    "attempts": [
      {
        "day": "2024-04-11",
        "hole_id": "hole1",
        "hole_name": "Hole 1",
        "par": 4,
        "attempt": 3
      }
    ],
    "missed_cut": false,
    "odds": 150,
    "profile_id": "profile123",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
]
```

#### Create Player

- **Method:** `POST`
- **Route:** `/api/admin/players`
- **Request Body:**

```json
{
  "external_id": "string",
  "level": 1,
  "current_score": 0,
  "position": 0,
  "attempts": [
    {
      "day": "2024-04-11",
      "hole_id": "string",
      "hole_name": "string",
      "par": 4,
      "attempt": 3
    }
  ],
  "missed_cut": false,
  "odds": 150,
  "profile_id": "string"
}
```

- **Response:** `201 Created` (New player object)

#### Get Player by ID

- **Method:** `GET`
- **Route:** `/api/admin/players/:id`
- **URL Parameters:**
  - `id`: Player ID
- **Response:** `200 OK` (Player object)

#### Update Player by ID

- **Method:** `PUT`
- **Route:** `/api/admin/players/:id`
- **URL Parameters:**
  - `id`: Player ID
- **Request Body:** (Same as Create Player)
- **Response:** `200 OK` (Updated player object)

#### Delete Player by ID

- **Method:** `DELETE`
- **Route:** `/api/admin/players/:id`
- **URL Parameters:**
  - `id`: Player ID
- **Response:** `204 No Content`

```json
{}
```

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request

```json
{
  "error": "Bad Request",
  "message": "Invalid request data",
  "details": ["Field 'email' is required"]
}
```

### 401 Unauthorized

```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

### 403 Forbidden

```json
{
  "error": "Forbidden",
  "message": "Insufficient permissions"
}
```

### 404 Not Found

```json
{
  "error": "Not Found",
  "message": "Resource not found"
}
```

### 500 Internal Server Error

```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred"
}
```
