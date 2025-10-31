# Daily Habit Tracker - Backend API

A robust Express.js backend for a daily habit tracking application with authentication, Google SSO, and comprehensive habit management features.

## Features

### Authentication
- **Email/Password Registration & Login** with bcrypt password hashing
- **Google OAuth 2.0 SSO** with Passport.js
- **JWT Token-based Authentication** for API access
- **User Profile Management**

### Habit Management
- **CRUD Operations** for daily habits
- **Daily Completion Tracking** with toggle functionality
- **Streak Calculation** (current and longest streaks)
- **Completion History** with configurable date ranges
- **User-specific Habit Isolation**

### Database
- **Supabase PostgreSQL** integration
- **Optimized Database Schema** with proper indexing
- **Automatic Timestamp Management**
- **Referential Integrity** with foreign key constraints

## Quick Start

### Prerequisites
- Node.js (v16 or higher)
- Supabase account and project
- Google OAuth credentials (optional, for SSO)

### Installation

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your actual credentials:
   ```env
   # Supabase Configuration
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   
   # JWT Configuration
   JWT_SECRET=your_super_secret_jwt_key
   
   # Google OAuth (Optional)
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   ```

3. **Database Setup**
   
   Run the SQL commands in `database_schema.sql` in your Supabase SQL editor to create the required tables.

4. **Start Development Server**
   ```bash
   npm run dev
   ```

   The server will start on `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login with email/password
- `GET /api/auth/google` - Initiate Google OAuth
- `GET /api/auth/google/callback` - Google OAuth callback
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/logout` - Logout (client-side token removal)

### Habits
- `GET /api/habits` - Get all user habits with completion history
- `POST /api/habits` - Create new habit
- `GET /api/habits/:id` - Get specific habit
- `PUT /api/habits/:id` - Update habit
- `DELETE /api/habits/:id` - Delete habit
- `POST /api/habits/:id/toggle` - Toggle daily completion
- `GET /api/habits/:id/completions` - Get completion history
- `POST /api/habits/:id/streaks/recalculate` - Recalculate streaks

### Utility
- `GET /health` - Health check endpoint
- `GET /` - API information

## Database Schema

### Users Table
```sql
- id (UUID, Primary Key)
- name (VARCHAR, Required)
- email (VARCHAR, Unique, Required)
- password (VARCHAR, Nullable for Google SSO)
- google_id (VARCHAR, Unique, Nullable)
- display_name (VARCHAR, Nullable)
- created_at, updated_at (Timestamps)
```

### Habits Table
```sql
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key)
- title (VARCHAR, Required)
- description (TEXT, Optional)
- current_streak (INTEGER, Default: 0)
- longest_streak (INTEGER, Default: 0)
- created_at, updated_at (Timestamps)
```

### Habit Completions Table
```sql
- id (UUID, Primary Key)
- habit_id (UUID, Foreign Key)
- user_id (UUID, Foreign Key)
- completion_date (DATE, Required)
- completed (BOOLEAN, Default: true)
- created_at (Timestamp)
- UNIQUE constraint on (habit_id, completion_date)
```

## Testing

Run the test suite:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

The test suite includes:
- Authentication endpoint tests
- Habit CRUD operation tests
- Input validation tests
- Password hashing utility tests

## Security Features

- **Password Hashing** with bcrypt (12 salt rounds)
- **JWT Token Authentication** with configurable expiration
- **Input Validation** with express-validator
- **CORS Configuration** for frontend integration
- **Helmet.js** for security headers
- **Session Security** for OAuth flows

## Streak Calculation Logic

The streak calculation system:
1. **Current Streak**: Counts consecutive days from today/yesterday backwards
2. **Longest Streak**: Tracks the maximum consecutive completion period
3. **Automatic Updates**: Recalculates on each completion toggle
4. **Manual Recalculation**: Available via API endpoint

## Error Handling

- Comprehensive error responses with appropriate HTTP status codes
- Input validation with detailed error messages
- Database error handling with user-friendly messages
- Development vs production error detail levels

## Development

### Project Structure
```
backend/
├── config/          # Database and Passport configuration
├── middleware/      # Authentication and validation middleware
├── routes/          # API route definitions
├── services/        # Business logic layer
├── tests/           # Test files
├── utils/           # Utility functions
├── server.js        # Main application file
└── package.json     # Dependencies and scripts
```

### Available Scripts
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run test suite
- `npm run test:watch` - Run tests in watch mode

## Deployment Considerations

1. **Environment Variables**: Ensure all production environment variables are set
2. **Database**: Run the schema creation SQL in your production Supabase instance
3. **CORS**: Update FRONTEND_URL for your production frontend domain
4. **JWT Secret**: Use a strong, unique JWT secret in production
5. **Google OAuth**: Update callback URLs for production domain

## Contributing

1. Follow the existing code style and patterns
2. Add tests for new features
3. Update documentation for API changes
4. Ensure all tests pass before submitting PRs