import { sql } from "@vercel/postgres";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Проверяем подключение
    const timeResult = await sql`SELECT NOW() as current_time`;

    // Проверяем существование таблиц
    const tablesResult = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    `;

    const tables = tablesResult.rows.map((row) => row.table_name);
    const isInitialized =
      tables.includes("users") && tables.includes("game_config");

    let stats = {};
    if (isInitialized) {
      const userCount = await sql`SELECT COUNT(*) as count FROM users`;
      const configCount = await sql`SELECT COUNT(*) as count FROM game_config`;

      stats = {
        users: parseInt(userCount.rows[0].count),
        config_entries: parseInt(configCount.rows[0].count),
      };
    }

    return res.status(200).json({
      connected: true,
      initialized: isInitialized,
      server_time: timeResult.rows[0].current_time,
      tables: tables,
      stats: stats,
    });
  } catch (error) {
    console.error("Database status error:", error);
    return res.status(500).json({
      connected: false,
      error: error.message,
    });
  }
}
