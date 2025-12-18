# PlayDate 🎮

**Video call your friend and play games together on the same screen.**

PlayDate is a real-time 1-on-1 video calling web app with integrated multiplayer games. Create a private room, invite a friend, and play 10+ games while video chatting.

## Features

- 🎥 **HD Video Calling** - WebRTC-based peer-to-peer video calls with screen sharing
- 🎮 **10+ Games** - From classics like Chess and Tic-Tac-Toe to word games like Wordle
- 💬 **Real-time Chat** - In-room chat with emoji reactions
- 🔒 **Private Rooms** - Password-protected rooms with rate limiting
- 📱 **Mobile-First** - Responsive design that works on all devices

## Tech Stack

- **Frontend**: Next.js 14+ (App Router), Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express, Socket.IO
- **Database**: PostgreSQL (Prisma ORM)
- **Video**: WebRTC with Cloudflare TURN
- **Monorepo**: Nx with npm workspaces
- **Testing**: Vitest

## Project Structure

```
playdate/
├── apps/
│   ├── web/           # Next.js frontend
│   └── server/        # Express + Socket.IO backend
├── packages/
│   ├── shared/        # Shared types, schemas, constants
│   └── game-core/     # Game logic engines
├── .github/workflows/ # CI/CD
└── docker-compose.yml # Local development
```

## Games

| Game | Type | Description |
|------|------|-------------|
| Tic Tac Toe | Classic | 3x3 grid, get three in a row |
| Connect 4 | Classic | Drop discs, connect four in a row |
| Chess | Classic | Full chess with chess.js |
| Trivia | Quiz | Race to answer 10 questions first |
| Speed Wordle | Word | Same word, race to solve first |
| Connections | Word | Find 4 groups of 4 related items |
| Hangman | Word | Guess the word letter by letter |
| 20 Questions | Quiz | Ask yes/no questions to guess the object |
| Pictionary | Drawing | Draw and guess |
| Co-op Crossword | Word | Solve the puzzle together |

## Getting Started

### Prerequisites

Before starting, ensure you have:
- **Node.js 20+** - Check with `node --version`
- **npm 9+** - Check with `npm --version`
- **Docker Desktop** - Required for local PostgreSQL database

### Step-by-Step Setup

#### Step 1: Install Dependencies

```bash
# Navigate to project directory
cd /path/to/Playdate

# Install all dependencies (root + all workspaces)
npm install
```

#### Step 2: Build Shared Packages

```bash
# Build shared TypeScript packages
npm run build
```

Expected output: All packages should build successfully without errors.

#### Step 3: Set Up Environment Variables

Create the following environment files:

**Create `apps/server/.env`:**
```bash
cat > apps/server/.env << 'EOF'
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://playdate:playdate_dev_password@localhost:5432/playdate
CORS_ORIGIN=http://localhost:3000
TURN_SECRET=
TURN_URLS=stun:stun.cloudflare.com:3478
EOF
```

**Create `apps/web/.env.local`:**
```bash
cat > apps/web/.env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:3001
EOF
```

#### Step 4: Start Docker Desktop

1. Open **Docker Desktop** application on your Mac
2. Wait for Docker to fully start (whale icon appears in menu bar)
3. Verify Docker is running: `docker ps` should work without errors

#### Step 5: Start PostgreSQL Database

```bash
# Start PostgreSQL container
docker-compose up -d postgres
```

Expected output:
```
✔ Container playdate-postgres Running
```

**Verify database is running:**
```bash
docker-compose ps
```

You should see `playdate-postgres` with status "Up".

#### Step 6: Set Up Database Schema

```bash
# Navigate to server directory
cd apps/server

# Push database schema (creates tables)
npm run db:push

# Return to root directory
cd ../..
```

Expected output: Prisma should successfully push the schema and create all tables.

#### Step 7: Start the Backend Server

**Open Terminal 1:**

```bash
# From project root directory
cd /path/to/Playdate

# Start backend server
npm run dev:server
```

**Expected output:**
```
PlayDate server started
port: 3001
Socket.IO handlers registered
```

✅ **Keep this terminal open** - The server must stay running.

#### Step 8: Start the Frontend Server

**Open Terminal 2 (new terminal window):**

```bash
# From project root directory
cd /path/to/Playdate

# Start frontend server
npm run dev:web
```

**Expected output:**
```
▲ Next.js 14.2.35
- Local: http://localhost:3000
✓ Ready in Xms
```

✅ **Keep this terminal open** - The frontend must stay running.

#### Step 9: Open the Application

1. Open your web browser
2. Navigate to: **http://localhost:3000**
3. You should see the PlayDate homepage

### Testing the Application

#### Create a Room:
1. Click **"Create Room"** button
2. Enter a display name (e.g., "Alice")
3. Copy the **Room ID** and **Password** shown on screen

#### Join the Room:
1. Open a **new incognito/private window** (or different browser)
2. Navigate to **http://localhost:3000/join**
3. Enter the Room ID and Password you copied
4. Enter a display name (e.g., "Bob")
5. Click **"Join Room"**

#### Once Both Are Connected:
- ✅ Video call should work (allow camera/mic permissions when prompted)
- ✅ Chat messages should appear in real-time
- ✅ Games can be selected from the game launcher
- ✅ Both players can interact with games simultaneously

### Stopping the Application

**To stop servers:**
- Press `Ctrl+C` in each terminal (Terminal 1 and Terminal 2)

**To stop database:**
```bash
docker-compose down
```

**To stop Docker Desktop:**
- Quit Docker Desktop from the menu bar (optional - only when not developing)

### Troubleshooting

**Port already in use:**
```bash
# Check what's using the ports
lsof -i :3000  # Frontend
lsof -i :3001  # Backend

# Kill processes if needed
lsof -ti :3000 | xargs kill -9
lsof -ti :3001 | xargs kill -9
```

**Database connection errors:**
```bash
# Check if PostgreSQL container is running
docker-compose ps

# View database logs
docker-compose logs postgres

# Restart database
docker-compose restart postgres
```

**Module not found errors:**
```bash
# Rebuild packages
npm run build
```

**Docker not running:**
- Make sure Docker Desktop is open and running
- Check Docker status: `docker ps`

## Development Commands

```bash
# Build all packages
npm run build

# Run tests
npm run test

# Lint code
npm run lint

# Type check
npm run typecheck

# Format code
npm run format
```

## Architecture

### Socket.IO Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `room:create` | Client → Server | Create a new room |
| `room:join` | Client → Server | Join existing room |
| `room:ready` | Server → Client | Both participants connected |
| `chat:send` | Client → Server | Send chat message |
| `chat:message` | Server → Client | Receive chat message |
| `game:select` | Client → Server | Select game to play |
| `game:action` | Client → Server | Send game move |
| `game:state` | Server → Client | Updated game state |
| `rtc:offer/answer/ice` | Both | WebRTC signaling |

### Game Architecture

Games are implemented as pure functions in `packages/game-core`:

```typescript
interface Game<TState, TAction, TView> {
  init(seed?: string): TState;
  validateAction(state: TState, role: PlayerRole, action: TAction): ValidationResult;
  applyAction(state: TState, role: PlayerRole, action: TAction): TState;
  getView(state: TState, role: PlayerRole): TView;
  checkWinCondition(state: TState): WinResult | null;
}
```

The server acts as the authoritative state holder - clients send actions, server validates and broadcasts the new state.

## Deployment

### Frontend (Vercel)

1. Connect your repository to Vercel
2. Set `NEXT_PUBLIC_API_URL` to your backend URL
3. Deploy

### Backend (Oracle Free Tier / Any VPS)

```bash
# Build the server
cd apps/server
npm run build

# Run with PM2 or systemd
pm2 start dist/index.js --name playdate-server
```

### Database (Neon Free Tier)

1. Create a project at neon.tech
2. Copy the connection string
3. Set `DATABASE_URL` in your backend

## Security

- Passwords hashed with Argon2
- Rate limiting on room join (5 attempts, 15-min lockout)
- Strict 2-participant room limit
- Short-lived TURN credentials
- No persistent user data by default

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

MIT
