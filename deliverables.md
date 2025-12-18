## **PlayDate 1-on-1 — Detailed Project Overview**

### **Core premise**

A **strict 1-on-1 video calling web app** where two people join a **created room (ID \+ password)** and play **shared 2-player games** on the same screen, with chat/reactions and optional sign-in.

### **Access, accounts, and rooms**

* **Guest join** (fast start)

* **Optional sign-in** (to save history, favorites, recent rooms, basic profile like display name)

* **Room creation**

  * Host can **auto-generate** Room ID \+ Password, or **edit** them

  * Share invite link that pre-fills Room ID (password entered manually or optionally included if host wants)

* **Room security**

  * Password required to enter

  * **Rate-limit** password attempts \+ temporary lockout for repeated failures

* **Waiting flow**

  * Host creates room → “Waiting for partner…”

  * Joiner enters Room ID \+ password → lands in “waiting” until host is present (or vice versa)

### **Call experience (1-on-1)**

* **Video \+ audio**

* **Mic toggle / camera toggle**

* **Leave call**

* **Host can close room**

* **Screen share**

* **Chat** (in-room)

* **Reactions** (quick emoji overlays)

* **Mobile-first video dock**

  * Game is the main view

  * Video is **collapsed by default on small screens**

  * User can **pop video out** as a small draggable tile (FaceTime-style)

### **“Game Hub” inside the room**

* A game launcher panel where either:

  * Host selects game, or

  * Both must “Ready” to start (prevents accidental switches)

* Each game runs as **shared synchronized state** (both players always see the same board/timer/turn).

---

## **Two-player games included**

### **Keep (from your original list)**

1. **Tic Tac Toe** (2p)

2. **Connect 4** (2p)

3. **Chess** (2p)

4. **Trivia** (2p): first to **10 correct** wins

5. **Co-op Crossword** (2p): both fill the same puzzle together

### **Added (new)**

6. **Speed Wordle**

* Both get the same 5-letter word

* Race to solve first (timer \+ win condition)

7. **Connections (clone)**

* 16 words/phrases

* Players sort them into linked groups   
* Shared board \+ strikes \+ progress

8. **Hangman**

* Player A enters a word/phrase (with optional “hide while typing”)

* Player B guesses letters

* Turn swap each round (optional)

9. **20 Questions**

* App assigns an object to Player A

* Player B asks yes/no questions

* App tracks question count; win if guessed within limit (ex: 20\)

10. **Pictionary (2-player version)**

* Turn-based: drawer gets a prompt, guesser types guesses

* Timer \+ round scoring

* Roles rotate every round

### **Shared game features (applies across games)**

* Turn indicator (“Your turn”)

* Round timer (where relevant)

* Simple **scoreboard**

* “Rematch” / “Switch game” controls

* Rules panel per game

---

# **Tech Stack (TypeScript, low-cost, reliable)**

## **Frontend**

* **Next.js \+ TypeScript**

* UI styling: Tailwind (or similar)

* WebRTC call UI (camera/mic/screen share)

* One **Room page** containing: Game Panel \+ Chat \+ Collapsible Video Dock

## **Realtime \+ signaling backend**

* **Node.js \+ TypeScript \+ Express**

* **Socket.IO (WebSockets)** for:

  * WebRTC signaling (offer/answer/ICE candidates)

  * game moves \+ timers

  * chat \+ reactions

  * room presence \+ host-close events

Note: **Vercel Functions do not support persistent WebSocket connections**, so the Socket.IO server should not live on Vercel. 

## **“Reliable” connectivity (STUN \+ TURN)**

WebRTC uses **ICE** with **STUN and/or TURN** for connecting peers across real-world networks. 

* **STUN:** stun.cloudflare.com is **free and unlimited**. 

* **TURN fallback (reliable):** Cloudflare Realtime TURN with **1,000 GB free tier**, then $0.05/GB egress. 

* TURN credentials should be **generated server-side** using Cloudflare’s TURN key flow (short-lived creds). 

## **Storage \+ optional auth**

* **Postgres** (for accounts, room metadata, game history if you want)

  * **Neon Free** is $0/month with set usage allowances (including **0.5 GB storage per branch**). 

* Auth: **guest-by-default**, optional sign-in (OAuth or email magic link) backed by your DB.

## **Hosting that stays near $0**

* **Frontend:** Vercel (free)

* **Realtime server:** a small VM that supports long-lived WebSockets

  * Oracle lists **Always Free compute** options (AMD VMs and Arm Ampere A1 instances). 

---

# **Deliverable 1 — Product Scope and UX Flows**

## **1.1 Core user flows**

**A) Create Room (Host)**

1. Choose **Guest** or **Sign in**

2. Click **Create Room**

3. System generates:

   * roomId (short, shareable)

   * roomPassword (auto-generated; host can edit)

4. Host shares invite link (pre-fills roomId)

**B) Join Room (Partner)**

1. Guest or Sign in

2. Enter roomId \+ password

3. If correct → waiting screen → “Connecting…”

4. When both present → auto-start call \+ room UI

**C) In-room**

* Collapsible video dock (mobile: collapsed by default)

* Game launcher (host controls OR “both ready to switch”)

* Chat \+ reactions

* Leave call / host close room

* Screen share toggle

---

# **Deliverable 2 — System Architecture**

## **2.1 High-level components**

**Frontend (Next.js \+ TS)**

* / Home

* /create Create Room

* /join Join Room

* /room/\[roomId\] Room UI (call \+ game \+ chat)

**Realtime Server (Node/Express \+ TS \+ Socket.IO)**

* Room auth (password attempts, lockouts)

* Presence \+ session control (who’s host, who’s connected)

* WebRTC signaling relay (offer/answer/ICE)

* Game state authority (moves, validation, timers)

* Chat \+ reactions relay

* TURN credential issuance (server-side)

**Database (Postgres)**

* Optional sign-in users

* Rooms metadata (hashed password)

* Rate-limit/lockout state

* (Optional) saved game summaries/history

## **2.2 “Authoritative server” rule**

Clients send **intents** (ex: “drop in column 3”), server validates and broadcasts canonical state. This prevents cheating and desync.

---

# **Deliverable 3 — Repo Structure (TypeScript Monorepo)**

Use a monorepo so types are shared everywhere:

playdate/

  apps/

    web/                \# Next.js (TS)

    server/             \# Express \+ Socket.IO (TS)

  packages/

    shared/             \# Types \+ Zod schemas \+ constants

    game-core/          \# Deterministic game engines (pure TS)

**Key idea:** game-core contains pure deterministic logic (no sockets). The server uses it to validate/advance state; the web uses it to render.

---

# **Deliverable 4 — Data Model Blueprint (Postgres)**

## **4.1 Tables**

### **users**

###  **(optional sign-in)**

* id (uuid)

* email (nullable if OAuth provider)

* display\_name

* created\_at

### **rooms**

* id (uuid)

* room\_id (string, unique, shareable)

* password\_hash (string)

* host\_user\_id (nullable if guest host)

* status enum: open | closed

* created\_at, closed\_at

### **room\_security**

* room\_id (fk)

* failed\_attempts (int)

* locked\_until (timestamp nullable)

* updated\_at

### **room\_sessions**

###  **(ephemeral tracking)**

* room\_id (fk)

* host\_socket\_id

* peer\_socket\_id

* host\_connected\_at

* peer\_connected\_at

### **Optional:** 

### **game\_history**

* room\_id

* game\_key

* winner (host/peer/draw)

* summary\_json

* created\_at

---

# **Deliverable 5 — Socket.IO Event Contract (Typed)**

Put these event names \+ payload types in packages/shared.

## **5.1 Connection \+ room events**

**Client → Server**

* ROOM\_CREATE → { desiredRoomId?, desiredPassword? }

* ROOM\_JOIN → { roomId, password, clientMeta }

* ROOM\_LEAVE → { roomId }

* ROOM\_CLOSE → { roomId } (host only)

**Server → Client**

* ROOM\_CREATED → { roomId, inviteLink }

* ROOM\_JOINED → { roomId, role: 'host'|'peer', roomState }

* ROOM\_WAITING → { roomId }

* ROOM\_READY → { roomId, peerConnected: true }

* ROOM\_ERROR → { code, message }

## **5.2 Chat \+ reactions**

**Client → Server**

* CHAT\_SEND → { roomId, message }

* REACTION\_SEND → { roomId, emoji }

**Server → Client**

* CHAT\_MESSAGE → { from, message, ts }

* REACTION → { from, emoji, ts }

## **5.3 WebRTC signaling relay**

**Client → Server**

* RTC\_OFFER → { roomId, sdp }

* RTC\_ANSWER → { roomId, sdp }

* RTC\_ICE → { roomId, candidate }

* RTC\_RENEGOTIATE (optional)

**Server → Client**

* RTC\_OFFER / RTC\_ANSWER / RTC\_ICE forwarded to the other peer

## **5.4 Games (generic)**

**Client → Server**

* GAME\_SELECT → { roomId, gameKey } (host OR both-ready)

* GAME\_READY → { roomId, gameKey, ready: true }

* GAME\_ACTION → { roomId, gameKey, action, clientSeq }

**Server → Client**

* GAME\_STATE → { roomId, gameKey, state, serverSeq }

* GAME\_ERROR → { roomId, gameKey, message }

---

# **Deliverable 6 — WebRTC Blueprint (Reliable 1-on-1)**

## **6.1 Media rules**

* Default: camera+mic on (user controlled)

* Mobile during games: video dock **collapsed by default**

* Screen share supported (desktop first; mobile optional later)

## **6.2 ICE configuration (reliable)**

* Always include a STUN server

* Include TURN fallback with **short-lived credentials** minted by your server:

  * GET /api/turn-credentials returns { urls, username, credential, ttl }

* Client uses these in RTCPeerConnection({ iceServers })

## **6.3 Signaling sequence**

1. Both clients connect to Socket.IO room

2. Server assigns roles: host/peer

3. Host creates RTCPeerConnection, adds tracks, creates offer

4. Send RTC\_OFFER → server → peer

5. Peer sets remote, creates answer → RTC\_ANSWER

6. Both exchange RTC\_ICE candidates until connected

7. Handle reconnect:

   * if socket reconnects, server rebinds socket to role and triggers renegotiation if needed

---

# **Deliverable 7 — Game Module Specs (Per Game)**

All games follow the same pattern:

* init(seed?) \-\> state

* validateAction(state, role, action) \-\> ok|error

* applyAction(state, role, action) \-\> newState

* getView(state, role) \-\> role-specific view (for hidden info games)

## **7.1 Game list (2-player only)**

### **Tic Tac Toe**

* Actions: place(r,c)

* Win/draw detection

### **Connect 4**

* Actions: drop(col)

* Gravity \+ win detection

### **Chess**

* Prefer using a battle-tested rules engine in game-core (deterministic, no UI)

* Actions: move(from,to,promotion?)

* Server validates legal moves, checkmate/stalemate

### **Trivia (race to 10\)**

* State: current question, answered flags, scores

* Actions: answer(choiceId)

* Anti-cheat: server timestamps; accept first answer only

### **Co-op Crossword**

* State: grid, clues, cursor positions

* Actions: setCell(index, letter), clearCell

* Both can edit; conflicts resolved by last-write wins (server seq)

### **Speed Wordle**

* Same word for both; each submits guesses

* Actions: submitGuess(word)

* Winner: first solve (or best within max tries \+ time)

### **Connections (clone) — groups of 4**

* State: 16 tiles, groups found, remaining strikes

* Action: selectTiles(\[id,id,id,id\]) \-\> submitGroup

* Validation:

  * correct grouping by server’s hidden solution set

* Optional: shuffle button per round

### **Hangman**

* Round-based; roles alternate

* Actions: setSecretWord(masked) by setter, guessLetter(letter) by guesser

### **20 Questions**

* App assigns object to Player A (from a dataset)

* Player B asks yes/no questions (text)

* Actions: ask(questionText) → server increments count

* Player A responds: answerYesNo(yes|no)

* Guess action: guess(objectName)

* Win if correct within 20 questions

### **Pictionary (2-player)**

* Prompt delivered by server to drawer only

* Actions:

  * Drawer: stroke(points...) (throttled/batched)

  * Guesser: guess(text)

* Timer \+ round scoring; rotate roles each round

---

# **Deliverable 8 — UI Blueprint (Single Room Screen)**

## **8.1 Room layout (desktop/tablets/biggerscreens)**

* Main: **Game Panel**

* Side drawer: **Chat**

* Floating/collapsible: **Video Dock**

* Top bar:

  * mic/cam toggles

  * screen share

  * reactions

  * leave / close (host)

## **8.2 Room layout (mobile/small screens)**

* Default: **Game full screen**

* Video hidden by default; toggle to “pop out” small tile

* Chat opens as bottom sheet

---

# **Deliverable 9 — Security and Abuse Controls**

## **9.1 Password handling**

* Store password\_hash (bcrypt/argon2)

* Never store plaintext

* Rate-limit join attempts per room \+ per IP

* Temporary lockout on repeated failures

## **9.2 Room rules**

* Strictly enforce max 2 participants connected

* Host-only ROOM\_CLOSE

* Kick is optional in 1-on-1 (but you can keep it for safety)

## **9.3 Data safety**

* Minimal PII (email optional)

* Don’t log SDP/candidates in production logs (sensitive-ish)

---

# **Deliverable 10 — Deployment Blueprint (Budget-Friendly)**

## **10.1 Services**

* **Web (Next.js):** Vercel free (or similar)

* **Server (Socket.IO):** small VM / container host that supports WebSockets

* **DB:** Neon free (or any free Postgres)

* **TURN:** Cloud provider TURN or self-host coturn

## **10.2 Environments**

* dev (local STUN, optional TURN)

* staging (real TURN creds)

* prod (real TURN creds \+ rate limits)

---

# **Deliverable 11 — Testing Strategy**

## **11.1 Unit tests (game-core)**

* Deterministic tests for every game:

  * invalid move rejected

  * win conditions correct

  * role-based hidden info correct (20Q, pictionary prompts)

## **11.2 Integration tests (server)**

* Socket event tests: join/auth/lockout

* Game action sequencing: clientSeq/serverSeq ordering

## **11.3 Manual QA checklist**

* Call connects on:

  * same network

  * different networks (Wi-Fi \+ LTE)

  * campus/work network (TURN fallback)

* Screen share works

* Reconnect recovers session

---

# **Deliverable 12 — Milestones as “Deliverables” (Build Order)**

**D1 — Foundation**

* Monorepo \+ shared types

* Room create/join/password \+ lockout

* Presence (host/peer) \+ room close

**D2 — WebRTC 1-on-1**

* Signaling via Socket.IO

* Camera/mic toggles

* Collapsible video dock

* Screen share

**D3 — Realtime primitives**

* Chat \+ reactions

* Game launcher framework

* Scoreboard \+ rematch framework

**D4 — Games v1 (core set)**

* TicTacToe, Connect4, Trivia, Hangman

**D5 — Games v2**

* Speed Wordle, Connections (groups of 4), 20 Questions

**D6 — “Heavier” games**

* Chess engine integration

* Co-op Crossword

* Pictionary (canvas \+ stroke batching)

**D7 — Optional sign-in**

* Auth, recent rooms, basic history

  

