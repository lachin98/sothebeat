const { sql } = require('@vercel/postgres');

module.exports = async (req, res) => {
  const { method, body, query } = req;
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    console.log(`Questions API: ${method}`, body || query);

    switch (method) {
      case 'GET':
        if (query.action === 'quiz') {
          const questions = await sql`
            SELECT q.*, r.title as round_title
            FROM quiz_questions q
            JOIN game_rounds r ON q.round_id = r.id
            WHERE r.round_type = 'quiz'
            ORDER BY q.order_num, q.id
          `;
          return res.json(questions.rows);
        }
        
        if (query.action === 'logic') {
          console.log('🔍 Fetching logic questions...');
          
          try {
            const questions = await sql`
              SELECT q.*, r.title as round_title
              FROM logic_questions q
              JOIN game_rounds r ON q.round_id = r.id
              WHERE r.round_type = 'logic'
              ORDER BY q.order_num, q.id
            `;
            
            console.log(`📋 Found ${questions.rows.length} logic questions`);
            return res.json(questions.rows);
          } catch (error) {
            if (error.code === '42703') { // Column does not exist
              console.log('⚠️ Missing columns detected, need migration');
              return res.status(500).json({ 
                error: 'Database migration required',
                message: 'Please run migration first: /api/migrate-logic-questions?token=a'
              });
            }
            throw error;
          }
        }
        
        if (query.action === 'survey') {
          const questions = await sql`
            SELECT q.*, r.title as round_title
            FROM survey_questions q
            JOIN game_rounds r ON q.round_id = r.id
            WHERE r.round_type = 'survey'
            ORDER BY q.order_num, q.id
          `;
          return res.json(questions.rows);
        }
        
        break;

      case 'POST':
        if (body.admin_token !== 'a') {
          return res.status(401).json({ error: 'Unauthorized' });
        }

        if (body.action === 'add_quiz_question') {
          const result = await sql`
            INSERT INTO quiz_questions 
            (round_id, question_text, option_a, option_b, option_c, option_d, correct_answer, points, order_num)
            VALUES (${body.round_id}, ${body.question_text}, ${body.option_a}, ${body.option_b}, 
                    ${body.option_c}, ${body.option_d}, ${body.correct_answer}, ${body.points}, ${body.order_num})
            RETURNING id
          `;
          return res.json({ success: true, id: result.rows[0].id });
        }

        if (body.action === 'add_logic_question') {
          console.log('➕ Adding logic question:', body.question_text);
          
          try {
            const result = await sql`
              INSERT INTO logic_questions 
              (round_id, question_text, images, image_urls, use_images, correct_answer, alternatives, points, order_num)
              VALUES (${body.round_id}, ${body.question_text}, ${JSON.stringify(body.images || [])}, 
                      ${JSON.stringify(body.image_urls || [])}, ${body.use_images || false},
                      ${body.correct_answer}, ${JSON.stringify(body.alternatives)}, ${body.points}, ${body.order_num})
              RETURNING id
            `;
            
            console.log('✅ Logic question added with ID:', result.rows[0].id);
            return res.json({ success: true, id: result.rows[0].id });
          } catch (error) {
            if (error.code === '42703') {
              return res.status(500).json({ 
                error: 'Database migration required',
                message: 'Missing columns. Please run: /api/migrate-logic-questions?token=a'
              });
            }
            throw error;
          }
        }

        if (body.action === 'add_survey_question') {
          const result = await sql`
            INSERT INTO survey_questions 
            (round_id, question_text, answers, order_num)
            VALUES (${body.round_id}, ${body.question_text}, ${JSON.stringify(body.answers)}, ${body.order_num})
            RETURNING id
          `;
          return res.json({ success: true, id: result.rows[0].id });
        }

        break;

      case 'PUT':
        if (body.admin_token !== 'a') {
          return res.status(401).json({ error: 'Unauthorized' });
        }

        if (body.action === 'update_quiz_question') {
          await sql`
            UPDATE quiz_questions 
            SET question_text = ${body.question_text}, option_a = ${body.option_a}, 
                option_b = ${body.option_b}, option_c = ${body.option_c}, 
                option_d = ${body.option_d}, correct_answer = ${body.correct_answer}, 
                points = ${body.points}
            WHERE id = ${body.question_id}
          `;
          return res.json({ success: true });
        }

        if (body.action === 'update_logic_question') {
          console.log('✏️ Updating logic question:', body.question_id);
          
          try {
            await sql`
              UPDATE logic_questions 
              SET question_text = ${body.question_text}, 
                  images = ${JSON.stringify(body.images || [])}, 
                  image_urls = ${JSON.stringify(body.image_urls || [])},
                  use_images = ${body.use_images || false},
                  correct_answer = ${body.correct_answer}, 
                  alternatives = ${JSON.stringify(body.alternatives)}, 
                  points = ${body.points}
              WHERE id = ${body.question_id}
            `;
            
            console.log('✅ Logic question updated');
            return res.json({ success: true });
          } catch (error) {
            if (error.code === '42703') {
              return res.status(500).json({ 
                error: 'Database migration required',
                message: 'Missing columns. Please run: /api/migrate-logic-questions?token=a'
              });
            }
            throw error;
          }
        }

        if (body.action === 'update_survey_question') {
          await sql`
            UPDATE survey_questions 
            SET question_text = ${body.question_text}, answers = ${JSON.stringify(body.answers)}
            WHERE id = ${body.question_id}
          `;
          return res.json({ success: true });
        }

        break;

      case 'DELETE':
        if (body.admin_token !== 'a') {
          return res.status(401).json({ error: 'Unauthorized' });
        }

        if (body.action === 'delete_quiz_question') {
          await sql`DELETE FROM quiz_questions WHERE id = ${body.question_id}`;
          return res.json({ success: true });
        }

        if (body.action === 'delete_logic_question') {
          console.log('🗑️ Deleting logic question:', body.question_id);
          await sql`DELETE FROM logic_questions WHERE id = ${body.question_id}`;
          return res.json({ success: true });
        }

        if (body.action === 'delete_survey_question') {
          await sql`DELETE FROM survey_questions WHERE id = ${body.question_id}`;
          return res.json({ success: true });
        }

        break;

      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }
    
    res.status(400).json({ message: 'Invalid request' });
  } catch (error) {
    console.error('Questions API error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};
