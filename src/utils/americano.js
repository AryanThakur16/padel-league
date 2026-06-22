// Balanced Americano rotation for 8 players over 7 rounds × 2 courts.
// Every player plays 7 matches; every pair partners exactly once.
// Slots are 1-indexed (1–8), matching the order players are selected.
export const ROTATION = [
  { round: 1, court: 'A', teamA: [1,2], teamB: [3,4] },
  { round: 1, court: 'B', teamA: [5,6], teamB: [7,8] },
  { round: 2, court: 'A', teamA: [1,3], teamB: [2,4] },
  { round: 2, court: 'B', teamA: [5,7], teamB: [6,8] },
  { round: 3, court: 'A', teamA: [1,4], teamB: [2,3] },
  { round: 3, court: 'B', teamA: [5,8], teamB: [6,7] },
  { round: 4, court: 'A', teamA: [1,5], teamB: [2,6] },
  { round: 4, court: 'B', teamA: [3,7], teamB: [4,8] },
  { round: 5, court: 'A', teamA: [1,6], teamB: [2,5] },
  { round: 5, court: 'B', teamA: [3,8], teamB: [4,7] },
  { round: 6, court: 'A', teamA: [1,7], teamB: [2,8] },
  { round: 6, court: 'B', teamA: [3,5], teamB: [4,6] },
  { round: 7, court: 'A', teamA: [1,8], teamB: [2,7] },
  { round: 7, court: 'B', teamA: [3,6], teamB: [4,5] },
]

// players: array of exactly 8 player objects ordered by slot (index 0 = slot 1)
export function generateMatches(sessionId, players) {
  return ROTATION.map(({ round, court, teamA, teamB }) => ({
    session_id: sessionId,
    round,
    court,
    team_a_p1: players[teamA[0] - 1].id,
    team_a_p2: players[teamA[1] - 1].id,
    team_b_p1: players[teamB[0] - 1].id,
    team_b_p2: players[teamB[1] - 1].id,
    score_a: null,
    score_b: null,
  }))
}
