require('dotenv').config();
const { Telegraf } = require('telegraf');
const OpenAI = require('openai');

const bot = new Telegraf(process.env.BOT_API_KEY); // Замените на ваш токен
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const allowedUsers = [346013835, 371647873];

bot.start((ctx) => ctx.reply('Привет! Я бот, который использует OpenAI!'));

bot.on('text', async (ctx) => {
    const userMessage = ctx.message.text;
    const userId = ctx.message.from.id;
    const chatId = ctx.chat.id;

    console.log('User ID:', userId);
    if (allowedUsers.includes(userId)) {

        try {
            const response = await openai.chat.completions.create({
                model: 'gpt-4o-mini', // Или другой доступный вам модель
                messages: [{ role: 'user', content: userMessage }],
            });
    
            const botReply = response.choices[0].message.content;
            ctx.reply(botReply);
        } catch (error) {
            console.error('Ошибка при обращении к OpenAI:', error);
            ctx.reply('Извините, произошла ошибка при обработке вашего запроса.');
        }

    }else{
        ctx.reply('Извините, не работаем.');
    }
    
});


bot.launch().then(() => {
    console.log('Бот запущен!');
});
// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
