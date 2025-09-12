const { sql } = require('@vercel/postgres');

// Данные вопросов из ТЗ
const quizQuestions = [
  {
    question: "Когда и кем был основан бренд Ballantine's?",
    options: ["В 1902 году шеф-поваром лондонского ресторана", "В 1790 году монахами из Глазго", "В 1827 году Джорджем Баллантайном", "В 1963 году сыном Винстона Черчилля"],
    correct: 2
  },
  {
    question: "Какую награду получил Ballantine's от королевы Виктории?",
    options: ["Орден Британской империи", "Лицензия на поставку воды", "Статус официального поставщика двора (Royal Warrant)", "Королевский бочонок доверия"],
    correct: 2
  },
  {
    question: "Что изображено на гербе Ballantine's?",
    options: ["Ячмень, вода, бочка и перегонный куб", "Единорог, кельтский узор, арфа и ключ от Эдинбурга", "Подкова, хмель, бочка и меч", "Три короны и замок Стерлинг"],
    correct: 0
  },
  {
    question: "Почему бутылка Ballantine's квадратной формы?",
    options: ["Для прочности при перевозке по морю", "Необычная форма выделяет бренд среди конкурентов и облегчает транспортировку", "Это дизайнерская ошибка, оставшаяся в производстве", "Чтобы экономить стекло на заводе"],
    correct: 1
  },
  {
    question: "Кто охранял склады Ballantine's более 50 лет?",
    options: ["Роботы-солдаты", "Специально обученные псы колли", "Королевская гвардия Великобритании", "Гуси, известные как Scotch Watch"],
    correct: 3
  },
  {
    question: "Какое место занимает Ballantine's по объёму продаж в мире среди шотландских виски?",
    options: ["Первое", "Четвёртое", "Второе", "Седьмое"],
    correct: 2
  },
  {
    question: "Какие два солодовых виски составляют «отпечаток» вкуса Ballantine's?",
    options: ["Glenlivet и Macallan", "Miltonduff и Glenburgie", "Auchentoshan и Lagavulin", "Glenfiddich и Talisker"],
    correct: 1
  },
  {
    question: "В коллаборации с какими культовыми рок группами Ballantine's выпустил лимитированные релизы в 2024 году?",
    options: ["Linkin Park, Limp Bizkit", "Black Sabbath, Nirvana", "AC/DC, Queen", "The Doors, The Rolling Stones"],
    correct: 2
  },
  {
    question: "Какой релиз Ballantine's проходит финальную выдержку в бочках из под бурбона первого налива?",
    options: ["Однозерновой (Single Grain) Ballantine's Single Distillery", "Ballantine's 7 YO", "Ballantine's 12 YO", "Ballantine's Finest"],
    correct: 1
  },
  {
    question: "Какой главный девиз компании Ballantine's?",
    options: ["Stay Gold", "Be a Ballantine's", "Stay True", "Stay Finest"],
    correct: 2
  }
];

const logicQuestions = [
  { images: ["��", "😊", "🍸", "👔"], question: "Кто это? Только имя.", answer: "remi", alternatives: ["remi", "реми"] },
  { images: ["🤫", "🔒", "👨‍💼", "🍸"], question: "Что за формат бара? (2 слова на английском)", answer: "speak easy", alternatives: ["speak easy", "speakeasy"] },
  { images: ["🤸‍♂️", "🥤", "🍾", "🔥"], question: "Что за искусство?", answer: "flairing", alternatives: ["flairing", "флейринг"] },
  { images: ["🥛", "0️⃣%", "🌿", "🥤"], question: "Что за напиток?", answer: "mocktail", alternatives: ["mocktail", "моктейл"] },
  { images: ["🍅", "🍋", "🌶️", "🧛‍♂️"], question: "Что за коктейль?", answer: "bloody mary", alternatives: ["bloody mary", "кровавая мэри"] },
  { images: ["🌪️", "🎉", "👨‍🏫", "🥃"], question: "Что за должность? (2 слова на русском)", answer: "бренд амбассадор", alternatives: ["бренд амбассадор", "brand ambassador"] },
  { images: ["🧪", "👨‍🔬", "🧬", "⚗️"], question: "Что это? (1 слово на русском)", answer: "миксология", alternatives: ["миксология", "mixology"] },
  { images: ["👘", "🛋️", "🥛", "🎳"], question: "Что за фильм? (2 слова)", answer: "big lebowski", alternatives: ["big lebowski", "большой лебовски"] },
  { images: ["🇺🇿", "🇬🇧", "📖", "⛑️"], question: "Что за спикер 2022 года? (имя фамилия)", answer: "бек нарзи", alternatives: ["бек нарзи", "bek narzi"] },
  { images: ["🏴󠁧󠁢󠁳󠁣󠁴󠁿", "🌾", "✅", "🥃"], question: "Что за бренд? (1 слово на английском)", answer: "ballantines", alternatives: ["ballantines", "ballantine's"] }
];

const surveyQuestions = [
  {
    question: "Коктейль, который бармены ненавидят готовить?",
    answers: [
      { text: "Рамос Джин Физз", points: 47 },
      { text: "Лонг Айленд", points: 33 },
      { text: "Пина Колада", points: 8 },
      { text: "Мохито", points: 6 },
      { text: "Виски Кола", points: 3 },
      { text: "Негрони", points: 2 }
    ]
  },
  {
    question: "Какой барный инструмент вы чаще всего держите в руках?",
    answers: [
      { text: "Джиггер", points: 41 },
      { text: "Шейкер", points: 27 },
      { text: "Барная ложка", points: 15 },
      { text: "Смесительный стакан", points: 9 },
      { text: "Бутылка", points: 4 },
      { text: "Нарзанник", points: 2 }
    ]
  },
  {
    question: "Какой коктейль чаще всего просят сделать «безалкогольным»?",
    answers: [
      { text: "Мохито", points: 46 },
      { text: "Апероль", points: 28 },
      { text: "Джин тоник", points: 11 },
      { text: "Гимлет", points: 6 },
      { text: "Пина Колада", points: 4 },
      { text: "Мичелада", points: 2 }
    ]
  },
  {
    question: "Самый популярный напиток бармена перед сменой?",
    answers: [
      { text: "Кофе", points: 45 },
      { text: "Энергетик", points: 24 },
      { text: "Вода", points: 16 },
      { text: "Чай", points: 8 },
      { text: "Кола/газировка", points: 6 },
      { text: "Сок", points: 1 }
    ]
  },
  {
    question: "Самый переоцененный коктейль по мнению барменов?",
    answers: [
      { text: "Негрони", points: 34 },
      { text: "Апероль Шприц", points: 27 },
      { text: "Виски Сауэр", points: 16 },
      { text: "Олд фэшн", points: 11 },
      { text: "Мохито", points: 7 },
      { text: "Маргарита", points: 5 }
    ]
  },
  {
    question: "Что гости чаще всего забывают в баре?",
    answers: [
      { text: "Телефон", points: 36 },
      { text: "Наушники", points: 28 },
      { text: "Верхнюю одежду", points: 14 },
      { text: "Документы/кошелёк", points: 10 },
      { text: "Сумку", points: 7 },
      { text: "Шарф/шапку/перчатки", points: 5 }
    ]
  },
  {
    question: "Что бармены делают после смены?",
    answers: [
      { text: "Идут покушать", points: 26 },
      { text: "Домой/спать", points: 25 },
      { text: "Идут выпить/тусить", points: 23 },
      { text: "Считают кассу", points: 15 },
      { text: "Перекур", points: 11 }
    ]
  },
  {
    question: "Почему ты выбрал индустрию гостеприимства?",
    answers: [
      { text: "Живое общение с гостями", points: 22 },
      { text: "За атмосферу", points: 20 },
      { text: "Командная работа", points: 18 },
      { text: "Зарплата", points: 16 },
      { text: "Подработка", points: 14 },
      { text: "Больше ничего не умею", points: 10 }
    ]
  },
  {
    question: "За что ты любишь свою работу?",
    answers: [
      { text: "Команда", points: 24 },
      { text: "Творчество и креатив", points: 21 },
      { text: "Не люблю офисную работу", points: 19 },
      { text: "График", points: 15 },
      { text: "Зарплата", points: 12 },
      { text: "Чаевые", points: 9 }
    ]
  },
  {
    question: "Как бармен называет «самую тяжёлую часть смены»?",
    answers: [
      { text: "Зашив", points: 45 },
      { text: "Запара", points: 24 },
      { text: "Жара", points: 15 },
      { text: "Мясо", points: 8 },
      { text: "Суета", points: 6 },
      { text: "Давка", points: 2 }
    ]
  }
];

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { secret } = req.body;
  if (secret !== 'add-questions-2025') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('🎯 Добавляем вопросы в базу данных...');

    // Получаем ID раундов
    const rounds = await sql`SELECT id, round_type FROM game_rounds ORDER BY round_number`;
    const quizRoundId = rounds.rows.find(r => r.round_type === 'quiz')?.id;
    const logicRoundId = rounds.rows.find(r => r.round_type === 'logic')?.id;
    const surveyRoundId = rounds.rows.find(r => r.round_type === 'survey')?.id;

    // Добавляем вопросы квиза
    for (let i = 0; i < quizQuestions.length; i++) {
      const q = quizQuestions[i];
      await sql`
        INSERT INTO quiz_questions 
        (round_id, question_text, option_a, option_b, option_c, option_d, correct_answer, points, order_num)
        VALUES (${quizRoundId}, ${q.question}, ${q.options[0]}, ${q.options[1]}, 
                ${q.options[2]}, ${q.options[3]}, ${q.correct}, 10, ${i + 1})
        ON CONFLICT DO NOTHING
      `;
    }

    // Добавляем вопросы "Где логика?"
    for (let i = 0; i < logicQuestions.length; i++) {
      const q = logicQuestions[i];
      await sql`
        INSERT INTO logic_questions 
        (round_id, question_text, images, correct_answer, alternatives, points, order_num)
        VALUES (${logicRoundId}, ${q.question}, ${JSON.stringify(q.images)}, 
                ${q.answer}, ${JSON.stringify(q.alternatives)}, 15, ${i + 1})
        ON CONFLICT DO NOTHING
      `;
    }

    // Добавляем вопросы "100 к 1"
    for (let i = 0; i < surveyQuestions.length; i++) {
      const q = surveyQuestions[i];
      await sql`
        INSERT INTO survey_questions 
        (round_id, question_text, answers, order_num)
        VALUES (${surveyRoundId}, ${q.question}, ${JSON.stringify(q.answers)}, ${i + 1})
        ON CONFLICT DO NOTHING
      `;
    }

    // Подсчитываем добавленные вопросы
    const quizCount = await sql`SELECT COUNT(*) as count FROM quiz_questions`;
    const logicCount = await sql`SELECT COUNT(*) as count FROM logic_questions`;
    const surveyCount = await sql`SELECT COUNT(*) as count FROM survey_questions`;

    console.log('✅ Вопросы успешно добавлены!');

    return res.status(200).json({
      success: true,
      message: 'Все вопросы успешно добавлены в базу данных',
      stats: {
        quiz_questions: parseInt(quizCount.rows[0].count),
        logic_questions: parseInt(logicCount.rows[0].count),
        survey_questions: parseInt(surveyCount.rows[0].count)
      }
    });

  } catch (error) {
    console.error('❌ Ошибка добавления вопросов:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
