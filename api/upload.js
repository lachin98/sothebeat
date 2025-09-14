const { IncomingForm } = require('formidable');
const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  // Настройка CORS
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
    console.log('📁 Starting file upload...');
    console.log('🔍 Query params:', req.query);
    console.log('🔍 URL:', req.url);

    // ИСПРАВЛЯЕМ: получаем токен из query параметров
    const token = req.query.token;
    console.log('🔑 Token from query:', token);

    if (token !== 'a') {
      console.log('❌ Invalid token, expected "a", got:', token);
      return res.status(401).json({ 
        error: 'Unauthorized',
        received_token: token,
        query: req.query
      });
    }

    // Создаем форму с правильным синтаксисом для новой версии
    const form = new IncomingForm({
      uploadDir: '/tmp',
      keepExtensions: true,
      maxFileSize: 5 * 1024 * 1024, // 5MB
      multiples: true // Разрешаем множественные файлы
    });

    // Парсим форму
    const parseForm = () => {
      return new Promise((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
          if (err) {
            console.error('Form parse error:', err);
            reject(err);
          } else {
            console.log('📋 Raw fields:', fields);
            console.log('📎 Raw files keys:', Object.keys(files));
            resolve({ fields, files });
          }
        });
      });
    };

    const { fields, files } = await parseForm();

    // Ищем любой загруженный файл
    let uploadedFile;
    const fileKeys = Object.keys(files);
    
    if (fileKeys.length > 0) {
      const firstKey = fileKeys[0];
      const fileData = files[firstKey];
      
      if (Array.isArray(fileData)) {
        uploadedFile = fileData[0];
      } else {
        uploadedFile = fileData;
      }
    }

    if (!uploadedFile) {
      console.log('❌ No file found in upload');
      return res.status(400).json({ 
        error: 'No file uploaded',
        received_files: fileKeys
      });
    }

    console.log('📄 File details:', {
      originalFilename: uploadedFile.originalFilename,
      mimetype: uploadedFile.mimetype,
      size: uploadedFile.size,
      filepath: uploadedFile.filepath
    });

    // Проверяем тип файла
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(uploadedFile.mimetype)) {
      return res.status(400).json({ 
        error: 'Invalid file type. Only images are allowed.',
        received_type: uploadedFile.mimetype,
        allowed_types: allowedTypes
      });
    }

    // Проверяем размер файла
    if (uploadedFile.size > 5 * 1024 * 1024) {
      return res.status(400).json({ 
        error: 'File too large. Maximum size is 5MB.',
        received_size: uploadedFile.size
      });
    }

    // Читаем файл
    const fileData = fs.readFileSync(uploadedFile.filepath);
    
    // Генерируем уникальное имя файла
    const fileExtension = path.extname(uploadedFile.originalFilename || '.jpg');
    const fileName = `upload_${Date.now()}${fileExtension}`;
    
    // Возвращаем Base64 data URL
    const base64Data = fileData.toString('base64');
    const dataUrl = `data:${uploadedFile.mimetype};base64,${base64Data}`;

    // Очищаем временный файл
    try {
      fs.unlinkSync(uploadedFile.filepath);
      console.log('🗑️ Temporary file cleaned up');
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError);
    }

    console.log('✅ File upload completed successfully');

    return res.json({
      success: true,
      filename: fileName,
      originalFilename: uploadedFile.originalFilename,
      size: uploadedFile.size,
      mimetype: uploadedFile.mimetype,
      url: dataUrl,
      message: 'File uploaded successfully'
    });

  } catch (error) {
    console.error('❌ Upload error:', error);
    
    return res.status(500).json({
      error: 'Upload failed',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
