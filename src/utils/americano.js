// Balanced Americano rotation for 8 players over 7 rounds × 2 courts.
// This schedule is mathematically optimal:
//   • Every pair partners EXACTLY once  (everyone is your partner one round)
//   • Every pair opposes EXACTLY twice  (you face each opponent exactly 2 times)
// Slots are 1-indexed (1–8). The players array is shuffled before mapping,
// so each session produces a fresh set of matchups while keeping the balance.
export const ROTATION = [
  { round: 1, court: 'A', teamA: [1,2], teamB: [3,4] },
  { round: 1, court: 'B', teamA: [5,6], teamB: [7,8] },
  { round: 2, court: 'A', teamA: [1,3], teamB: [5,7] },
  { round: 2, court: 'B', teamA: [2,4], teamB: [6,8] },
  { round: 3, court: 'A', teamA: [1,4], teamB: [5,8] },
  { round: 3, court: 'B', teamA: [2,3], teamB: [6,7] },
  { round: 4, court: 'A', teamA: [1,5], teamB: [2,6] },
  { round: 4, court: 'B', teamA: [3,7], teamB: [4,8] },
  { round: 5, court: 'A', teamA: [1,6], teamB: [3,8] },
  { round: 5, court: 'B', teamA: [2,5], teamB: [4,7] },
  { round: 6, court: 'A', teamA: [1,7], teamB: [4,6] },
  { round: 6, court: 'B', teamA: [2,8], teamB: [3,5] },
  { round: 7, court: 'A', teamA: [1,8], teamB: [2,7] },
  { round: 7, court: 'B', teamA: [3,6], teamB: [4,5] },
]

// Fisher-Yates shuffle (returns a new array, does not mutate input)
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// players: array of exactly 8 player objects ordered by slot (index 0 = slot 1).
// The players are shuffled into the rotation slots so each session is different,
// while the partner-once / oppose-twice balance is preserved.
export function generateMatches(sessionId, players) {
  const shuffled = shuffle(players)
  return ROTATION.map(({ round, court, teamA, teamB }) => ({
    session_id: sessionId,
    round,
    court,
    team_a_p1: shuffled[teamA[0] - 1].id,
    team_a_p2: shuffled[teamA[1] - 1].id,
    team_b_p1: shuffled[teamB[0] - 1].id,
    team_b_p2: shuffled[teamB[1] - 1].id,
    score_a: null,
    score_b: null,
  }))
}
