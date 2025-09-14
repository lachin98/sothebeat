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

    // Создаем форму с правильным синтаксисом для новой версии
    const form = new IncomingForm({
      uploadDir: '/tmp',
      keepExtensions: true,
      maxFileSize: 5 * 1024 * 1024, // 5MB
      multiples: false
    });

    // Парсим форму
    const parseForm = () => {
      return new Promise((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
          if (err) {
            console.error('Form parse error:', err);
            reject(err);
          } else {
            console.log('📋 Fields:', fields);
            console.log('📎 Files:', Object.keys(files));
            resolve({ fields, files });
          }
        });
      });
    };

    const { fields, files } = await parseForm();

    // Проверяем админ токен
    const token = fields.token || fields.token?.[0];
    if (token !== 'a') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Получаем загруженный файл
    const uploadedFile = files.file || files.file?.[0];
    if (!uploadedFile) {
      return res.status(400).json({ error: 'No file uploaded' });
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
        error: 'Invalid file type. Only images are allowed.' 
      });
    }

    // Читаем файл
    const fileData = fs.readFileSync(uploadedFile.filepath);
    
    // Генерируем уникальное имя файла
    const fileExtension = path.extname(uploadedFile.originalFilename || '.jpg');
    const fileName = `upload_${Date.now()}${fileExtension}`;
    
    // В production на Vercel файлы нельзя сохранять локально,
    // поэтому возвращаем Base64 или используем внешний сервис
    const base64Data = fileData.toString('base64');
    const dataUrl = `data:${uploadedFile.mimetype};base64,${base64Data}`;

    // Очищаем временный файл
    try {
      fs.unlinkSync(uploadedFile.filepath);
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError);
    }

    console.log('✅ File upload completed');

    return res.json({
      success: true,
      filename: fileName,
      size: uploadedFile.size,
      mimetype: uploadedFile.mimetype,
      // В реальном проекте здесь должна быть ссылка на CDN или файловое хранилище
      url: dataUrl, // Временное решение - base64 data URL
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
