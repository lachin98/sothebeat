import { sql } from '@vercel/postgres';

// Мок данные для начала
let gameState = {
  currentPhase: 'lobby',
  onlineUsers: 0,
  totalRegistered: 4,
  phases: {
    quiz: false,
    logic: false,
    contact: false,
    survey: false,
    auction: false
  },
  lastUpdated: new Date().toISOString()
};

let leaderboard = [
  { rank: 1, name: 'Lina', points: 500 },
  { rank: 2, name: 'Dmitriy', points: 180 },
  { rank: 3, name: 'Lachin', points: 50 },
  { rank: 4, name: 'Suhrab', points: 50 }
];

export default async function handler(req, res) {
  const { method, body, query } = req;
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Простая проверка токена
  const adminToken = query.token || body.token;
  if (adminToken !== 'a') {
    return res.status(401).json({ error: 'Invalid admin token' });
  }

  try {
    switch (method) {
      case 'GET':
        if (query.action === 'status') {
          return res.json(gameState);
        }
        
        if (query.action === 'leaderboard') {
          return res.json(leaderboard);
        }
        
        if (query.action === 'participants') {
          // Мок участников
          const participants = [
            { id: 1, name: 'Lina', username: 'lina_bar', points: 500 },
            { id: 2, name: 'Dmitriy', username: 'dmitriy_mix', points: 180 },
            { id: 3, name: 'Lachin', username: 'lachin_beat', points: 50 },
            { id: 4, name: 'Suhrab', username: 'suhrab_pro', points: 50 }
          ];
          return res.json(participants);
        }
        
        break;

      case 'POST':
        if (body.action === 'updatePhase') {
          gameState.currentPhase = body.phase;
          gameState.lastUpdated = new Date().toISOString();
          return res.json({ success: true, gameState });
        }
        
        if (body.action === 'togglePhase') {
          gameState.phases[body.phase] = !gameState.phases[body.phase];
          gameState.lastUpdated = new Date().toISOString();
          return res.json({ success: true, gameState });
        }
        
        if (body.action === 'updatePoints') {
          const participant = leaderboard.find(p => p.name === body.name);
          if (participant) {
            participant.points += body.points;
            // Пересортируем лидерборд
            leaderboard.sort((a, b) => b.points - a.points);
            leaderboard.forEach((p, i) => p.rank = i + 1);
          }
          return res.json({ success: true, leaderboard });
        }
        
        break;

      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }
    
    res.status(400).json({ message: 'Invalid request' });
  } catch (error) {
    console.error('Admin API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
