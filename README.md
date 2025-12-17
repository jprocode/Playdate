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

- Node.js 20+
- npm 9+
- Docker (optional, for database)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd playdate

# Install dependencies
npm install

# Build shared packages
npm run build
```

### Database Setup

**Option 1: Docker (Recommended)**
```bash
# Start PostgreSQL
docker-compose up -d postgres

# Run migrations
cd apps/server
npm run db:push
```

**Option 2: Local PostgreSQL**
```bash
# Set DATABASE_URL in apps/server/.env
DATABASE_URL=postgresql://user:password@localhost:5432/playdate

# Run migrations
cd apps/server
npm run db:push
```

### Environment Variables

**apps/server/.env**
```env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://playdate:playdate_dev_password@localhost:5432/playdate
CORS_ORIGIN=http://localhost:3000
TURN_SECRET=your-turn-secret
TURN_URLS=turn:your-turn-server:3478
```

**apps/web/.env.local**
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Running Development

```bash
# Start the backend (from root)
npm run dev:server

# Start the frontend (in another terminal)
npm run dev:web
```

Visit `http://localhost:3000` to access the app.

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
