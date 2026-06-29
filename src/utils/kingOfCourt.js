// King of Court round-robin generator.
// Each team plays every other team exactly TWICE.
// Supports 3–6 teams. Uses the circle method; odd team counts get a rotating bye.

function scheduleRoundRobin(n) {
  let slots = Array.from({ length: n }, (_, i) => i)
  if (n % 2 === 1) slots.push(null) // null = bye
  const total = slots.length

  const fixed = slots[0]
  const rotating = slots.slice(1)
  const rounds = []

  for (let r = 0; r < total - 1; r++) {
    const current = [fixed, ...rotating]
    const round = []
    for (let i = 0; i < total / 2; i++) {
      const a = current[i]
      const b = current[total - 1 - i]
      if (a !== null && b !== null) round.push([a, b])
    }
    rounds.push(round)
    rotating.unshift(rotating.pop()) // rotate
  }

  return rounds
}

// teams: array of { p1: uuid, p2: uuid }
export function generateKingOfCourtMatches(sessionId, teams) {
  const singlePass = scheduleRoundRobin(teams.length)
  const allRounds = [...singlePass, ...singlePass] // play each matchup twice

  const matches = []
  allRounds.forEach((round, roundIdx) => {
    round.forEach((matchup, courtIdx) => {
      const [tA, tB] = matchup
      matches.push({
        session_id: sessionId,
        round: roundIdx + 1,
        court: String.fromCharCode(65 + courtIdx),
        team_a_p1: teams[tA].p1,
        team_a_p2: teams[tA].p2,
        team_b_p1: teams[tB].p1,
        team_b_p2: teams[tB].p2,
        score_a: null,
        score_b: null,
      })
    })
  })

  return matches
}
