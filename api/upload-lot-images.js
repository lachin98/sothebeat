const { IncomingForm } = require('formidable');
const { sql } = require('@vercel/postgres');
const fs = require('fs');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('📁 Starting lot images upload...');

    // Проверяем токен из URL
    const token = req.query.token;
    if (token !== 'a') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Создаем форму для загрузки
    const form = new IncomingForm({
      uploadDir: '/tmp',
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      multiples: true
    });

    // Парсим форму
    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    console.log('📋 Files received:', Object.keys(files));

    const uploadedImages = [];
    
    // Обрабатываем каждый файл
    for (const [fieldName, file] of Object.entries(files)) {
      const fileData = Array.isArray(file) ? file[0] : file;
      
      if (!fileData || !fileData.filepath) continue;

      // Читаем файл и создаем data URL
      const fileBuffer = fs.readFileSync(fileData.filepath);
      const base64 = fileBuffer.toString('base64');
      const dataUrl = `data:${fileData.mimetype};base64,${base64}`;
      
      // Извлекаем номер лота из имени поля (lot_1, lot_2, etc.)
      const lotNumber = fieldName.match(/lot_(\d+)/)?.[1];
      
      if (lotNumber) {
        uploadedImages.push({
          lot_id: parseInt(lotNumber),
          image_url: dataUrl,
          filename: fileData.originalFilename,
          size: fileData.size
        });
      }
      
      // Удаляем временный файл
      fs.unlinkSync(fileData.filepath);
    }

    // Обновляем лоты в базе данных
    for (const img of uploadedImages) {
      await sql`
        UPDATE auction_lots 
        SET image_url = ${img.image_url}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${img.lot_id}
      `;
      
      console.log(`✅ Updated lot ${img.lot_id} with image: ${img.filename}`);
    }

    return res.json({
      success: true,
      message: `Uploaded ${uploadedImages.length} lot images`,
      images: uploadedImages.map(img => ({
        lot_id: img.lot_id,
        filename: img.filename,
        size: img.size
      }))
    });

  } catch (error) {
    console.error('❌ Upload error:', error);
    return res.status(500).json({
      error: 'Upload failed',
      details: error.message
    });
  }
};
