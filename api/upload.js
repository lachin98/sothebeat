const formidable = require('formidable');
const fs = require('fs');
const path = require('path');

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
    // Проверка токена в query параметрах
    const { token } = req.query;
    if (token !== 'a') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const form = formidable({
      maxFileSize: 5 * 1024 * 1024, // 5MB
      allowEmptyFiles: false
    });

    const [fields, files] = await form.parse(req);
    
    const uploadedFiles = [];
    
    // Обрабатываем каждый загруженный файл
    for (const [fieldName, fileArray] of Object.entries(files)) {
      const file = Array.isArray(fileArray) ? fileArray[0] : fileArray;
      
      if (!file) continue;
      
      // Проверяем тип файла
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.mimetype)) {
        continue;
      }

      // Генерируем уникальное имя файла
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 15);
      const extension = path.extname(file.originalFilename || '.jpg');
      const fileName = `logic_${timestamp}_${randomStr}${extension}`;
      
      // В продакшене файлы будут загружаться в облако (Cloudinary, AWS S3)
      // Пока возвращаем placeholder URL
      const imageUrl = `https://picsum.photos/400/300?random=${timestamp}`;
      
      uploadedFiles.push({
        originalName: file.originalFilename,
        fileName: fileName,
        url: imageUrl,
        size: file.size,
        type: file.mimetype
      });
    }

    return res.json({
      success: true,
      files: uploadedFiles,
      message: `Загружено ${uploadedFiles.length} файлов`
    });

  } catch (error) {
    console.error('Ошибка загрузки файлов:', error);
    return res.status(500).json({
      success: false,
      error: 'Ошибка загрузки файлов'
    });
  }
};

// Отключаем встроенный парсер body для formidable
export const config = {
  api: {
    bodyParser: false,
  },
};
