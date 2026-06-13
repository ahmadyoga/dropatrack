# Product Requirements Document (PRD)

# Multiplayer Mini Games System — Minesweeper (V1)

Version: 1.0
Status: MVP
Game: Minesweeper
Platform: Web
Backend: Supabase

---

# 1. Overview

Introduce a multiplayer mini-game system inside existing music rooms.

The first supported game is **Minesweeper**, allowing room members to play together without leaving the room.

Games are designed as secondary social activities and should feel naturally integrated into the existing experience.

The architecture should support future games such as:

* Tic Tac Toe
* Connect Four
* UNO
* Chess
* Poker

without requiring major redesign.

---

# 2. Objectives

### Primary Objectives

* Increase user engagement inside rooms.
* Encourage interaction between members.
* Extend session duration.
* Create replayability.
* Provide a foundation for future mini-games.

---

# 3. User Experience

Games should behave like temporary activities inside a room rather than separate pages.

Players should:

* Create a game.
* Invite other members.
* Play multiple matches continuously.
* Resume an active game after accidentally closing the modal.
* Finish the session whenever they want.

---

# 4. Entry Points

## Games Button

Located near the chat input.

Example:

```
[📷] [🎮 Games] Message Input...
```

Selecting the button opens:

```
Games

- Minesweeper
```

---

## Slash Command

Users may also type:

```
/game
```

which opens the same game menu.

---

# 5. Create Game Flow

User selects:

```
🎮 Minesweeper
```

A create room modal appears.

```
Create Minesweeper Session

Difficulty

○ Easy
○ Medium
○ Hard

[ Create ]
```

---

# 6. Difficulty Levels

## Easy

Board Size

8 × 8

Mines

10

---

## Medium

Board Size

12 × 12

Mines

20

---

## Hard

Board Size

16 × 16

Mines

40

---

# 7. Session Creation

After pressing Create:

1. Session is stored in database.
2. Session status becomes active.
3. Chat automatically sends an invitation message.

Example:

```
🎮 admin cuy started Minesweeper

Difficulty: Medium

[ Join Game ]
```

The invitation appears as a rich chat card.

---

# 8. Joining Players

Users can press:

```
Join Game
```

to join the active session.

Players may join while the session is active.

---

# 9. Active Game Button

Because users may accidentally close the modal, an active game indicator should remain visible.

Example:

```
🎮 Active Game
Minesweeper • Match #3
```

Clicking the button reopens the game modal.

---

# 10. Session Structure

One music room can contain multiple Minesweeper sessions.

Each session contains multiple matches.

Example:

```
Music Room

└── Minesweeper Session
      ├── Match #1
      ├── Match #2
      ├── Match #3
      └── Match #4
```

---

# 11. Match Lifecycle

A session starts with Match #1.

When a match ends, players can:

```
Play Again
```

or

```
Finish Game
```

If they choose Play Again:

* Board resets.
* Match number increases.
* Previous scores remain.
* Turn order is randomized again.

Example:

```
Match #1

↓

Match #2

↓

Match #3
```

---

# 12. Turn Order

At the beginning of every match:

Players are shuffled randomly.

Example:

```
1. admin cuy
2. ogah
3. andi
```

Current turn:

```
admin cuy
```

After a move:

```
ogah
```

Then:

```
andi
```

Then cycle repeats.

---

# 13. Gameplay Rules

## Opening a Cell

Player selects a cell.

### Safe Cell

* Cell becomes revealed.
* Number is shown.
* Turn passes to the next player.

---

### Mine Cell

If a player opens a mine:

* Match ends immediately.
* That player loses.
* Remaining players are considered winners.

Example:

```
💣 BOOM!

ogah opened a mine.
```

---

# 14. Match End Modal

Example:

```
BOOM! 💣

ogah hit a mine.

Scoreboard

admin cuy     2 wins
andi          1 win
ogah          1 loss

[ Play Again ]
[ Finish Game ]
```

---

# 15. Session Finish

When users choose:

```
Finish Game
```

Session status becomes:

```
finished
```

Active Game button disappears.

Chat sends a summary.

Example:

```
🎮 Minesweeper Finished

Final Score

admin cuy : 4 wins
andi      : 2 wins
ogah      : 1 win
```

---

# 16. Realtime Synchronization

All players see:

* Board updates.
* Turn changes.
* Match results.
* Session status.

in real time.

---

# 17. Reconnect Behavior

If a player refreshes the page:

System checks for active sessions.

If found:

```
Resume Active Game?

Minesweeper
Match #4

[ Resume ]
```

---

# 18. Database Architecture

Because Supabase Presence is already used by the music room itself, game state should use dedicated tables.

---

## minesweeper_sessions

Stores the overall game session.

Fields:

* id
* music_room_id
* difficulty
* status
* created_by
* created_at
* finished_at

Status values:

* active
* finished

---

## minesweeper_players

Stores players and cumulative scores.

Fields:

* id
* session_id
* user_id
* wins
* losses
* joined_at

---

## minesweeper_matches

Stores each round.

Fields:

* id
* session_id
* match_number
* status
* loser_user_id
* started_at
* finished_at

Status values:

* playing
* finished

---

## minesweeper_turns

Stores randomized order.

Fields:

* id
* match_id
* user_id
* turn_order
* is_current

---

## minesweeper_cells

Stores board state.

Fields:

* id
* match_id
* x
* y
* is_mine
* is_opened
* adjacent_count
* opened_by
* opened_at

---

# 19. Session State Machine

```
active
    ↓

match #1

    ↓

match #2

    ↓

match #3

    ↓

finished
```

---

# 20. Edge Cases

## User closes modal

No issue.

Session continues.

User can reopen using:

```
🎮 Active Game
```

---

## User refreshes page

Session can be resumed.

---

## Creator leaves

Game continues.

Ownership is not required.

---

## All players leave

Session automatically finishes after 5 minutes of inactivity.

---

## Multiple active sessions

MVP only supports:

```
1 active Minesweeper session per music room
```

New sessions cannot be created until the current one is finished.

---

# 21. Future Expansion

The mini-game framework should support:

```
🎮 Games

- Minesweeper
- Tic Tac Toe
- Connect Four
- UNO
- Chess
- Poker
```

using the same architecture:

```
Game Session

↓

Invitation Message

↓

Join Players

↓

Multiple Matches

↓

Score Tracking

↓

Finish Session
```

---

# 22. Technical Notes

Supabase Presence should not be used for game state.

Presence is already responsible for:

* Room members
* User online status

Game state should rely on dedicated database tables and realtime subscriptions.

Subscriptions:

* minesweeper_sessions
* minesweeper_matches
* minesweeper_players
* minesweeper_turns
* minesweeper_cells

This approach provides:

* persistence
* reconnect support
* replay support
* future game extensibility
