import { sql } from "@vercel/postgres";

export default async function handler(req, res) {
  const { method, body } = req;

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  try {
    switch (method) {
      case "GET":
        if (req.query.action === "user" && req.query.userId) {
          // Пока просто заглушка
          return res.json({
            id: req.query.userId,
            first_name: "Тестовый пользователь",
            total_points: 0,
            current_phase: "lobby",
          });
        }
        break;

      case "POST":
        if (body.action === "update_points") {
          // Заглушка для обновления баллов
          return res.json({ success: true });
        }
        break;

      default:
        return res.status(405).json({ message: "Method not allowed" });
    }

    res.status(400).json({ message: "Invalid request" });
  } catch (error) {
    console.error("API error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
