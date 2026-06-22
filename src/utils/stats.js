function pct(won, lost) {
  const total = won + lost
  return total > 0 ? (won / total * 100).toFixed(1) : null
}

function gamesFor(m, playerId) {
  const onA = m.team_a_p1 === playerId || m.team_a_p2 === playerId
  return { won: onA ? m.score_a : m.score_b, lost: onA ? m.score_b : m.score_a }
}

export function computeLeagueTable(players, sessionSlots, matches) {
  return players.map(player => {
    const attendedSessions = new Set(
      sessionSlots.filter(s => s.player_id === player.id).map(s => s.session_id)
    )

    const myMatches = matches.filter(m =>
      m.team_a_p1 === player.id || m.team_a_p2 === player.id ||
      m.team_b_p1 === player.id || m.team_b_p2 === player.id
    )

    let gamesWon = 0, gamesLost = 0, matchesPlayed = 0
    for (const m of myMatches) {
      if (m.score_a == null || m.score_b == null) continue
      matchesPlayed++
      const g = gamesFor(m, player.id)
      gamesWon += g.won
      gamesLost += g.lost
    }

    return {
      ...player,
      sessions: attendedSessions.size,
      matchesPlayed,
      gamesWon,
      gamesLost,
      points: gamesWon,
      winPct: pct(gamesWon, gamesLost),
    }
  }).sort((a, b) => b.points - a.points || parseFloat(b.winPct) - parseFloat(a.winPct))
}

export function computePlayerStats(playerId, players, sessions, sessionSlots, matches) {
  const attended = new Set(
    sessionSlots.filter(s => s.player_id === playerId).map(s => s.session_id)
  )
  const playerById = Object.fromEntries(players.map(p => [p.id, p]))

  const myMatches = matches.filter(m =>
    m.team_a_p1 === playerId || m.team_a_p2 === playerId ||
    m.team_b_p1 === playerId || m.team_b_p2 === playerId
  )

  // Per-session
  const bySession = sessions.map(session => {
    if (!attended.has(session.id)) return { session, attended: false, gamesWon: 0, gamesLost: 0, points: 0 }
    const sm = myMatches.filter(m => m.session_id === session.id)
    let gamesWon = 0, gamesLost = 0
    for (const m of sm) {
      if (m.score_a == null || m.score_b == null) continue
      const g = gamesFor(m, playerId)
      gamesWon += g.won
      gamesLost += g.lost
    }
    return { session, attended: true, gamesWon, gamesLost, points: gamesWon }
  })

  // Partners
  const partnerMap = {}
  for (const m of myMatches) {
    if (m.score_a == null || m.score_b == null) continue
    const onA = m.team_a_p1 === playerId || m.team_a_p2 === playerId
    const partnerId = onA
      ? (m.team_a_p1 === playerId ? m.team_a_p2 : m.team_a_p1)
      : (m.team_b_p1 === playerId ? m.team_b_p2 : m.team_b_p1)
    const g = gamesFor(m, playerId)
    if (!partnerMap[partnerId]) partnerMap[partnerId] = { matches: 0, won: 0, lost: 0 }
    partnerMap[partnerId].matches++
    partnerMap[partnerId].won += g.won
    partnerMap[partnerId].lost += g.lost
  }

  // Opponents
  const opponentMap = {}
  for (const m of myMatches) {
    if (m.score_a == null || m.score_b == null) continue
    const onA = m.team_a_p1 === playerId || m.team_a_p2 === playerId
    const opponents = onA ? [m.team_b_p1, m.team_b_p2] : [m.team_a_p1, m.team_a_p2]
    const g = gamesFor(m, playerId)
    for (const oppId of opponents) {
      if (!opponentMap[oppId]) opponentMap[oppId] = { matches: 0, won: 0, lost: 0 }
      opponentMap[oppId].matches++
      opponentMap[oppId].won += g.won
      opponentMap[oppId].lost += g.lost
    }
  }

  const partners = Object.entries(partnerMap).map(([id, s]) => ({
    player: playerById[id], ...s, winPct: pct(s.won, s.lost),
  })).sort((a, b) => parseFloat(b.winPct) - parseFloat(a.winPct))

  const opponents = Object.entries(opponentMap).map(([id, s]) => ({
    player: playerById[id], ...s, winPct: pct(s.won, s.lost),
  })).sort((a, b) => parseFloat(b.winPct) - parseFloat(a.winPct))

  const played = bySession.filter(s => s.attended && (s.gamesWon + s.gamesLost) > 0)
  const bestSession = played.length ? played.reduce((b, s) => s.points > b.points ? s : b) : null
  const worstSession = played.length ? played.reduce((b, s) => s.points < b.points ? s : b) : null

  let totalWon = 0, totalLost = 0, matchesPlayed = 0
  for (const m of myMatches) {
    if (m.score_a == null || m.score_b == null) continue
    matchesPlayed++
    const g = gamesFor(m, playerId)
    totalWon += g.won
    totalLost += g.lost
  }

  return {
    sessionsAttended: attended.size,
    matchesPlayed,
    gamesWon: totalWon,
    gamesLost: totalLost,
    points: totalWon,
    winPct: pct(totalWon, totalLost),
    bySession,
    bestSession,
    worstSession,
    partners,
    opponents,
  }
}

export function sessionSummary(sessions, sessionSlots, matches) {
  return sessions.map(session => {
    const players = sessionSlots.filter(s => s.session_id === session.id).length
    const sm = matches.filter(m => m.session_id === session.id && m.score_a != null && m.score_b != null)
    const totalGames = sm.reduce((sum, m) => sum + m.score_a + m.score_b, 0)

    const playerPoints = {}
    for (const m of sm) {
      for (const [pid, pts] of [[m.team_a_p1, m.score_a],[m.team_a_p2, m.score_a],[m.team_b_p1, m.score_b],[m.team_b_p2, m.score_b]]) {
        playerPoints[pid] = (playerPoints[pid] || 0) + pts
      }
    }
    const topEntry = Object.entries(playerPoints).sort((a,b) => b[1]-a[1])[0]

    return { session, players, matches: sm.length, totalGames, topPlayerId: topEntry?.[0], topPoints: topEntry?.[1] }
  })
}
