require('dotenv').config();
const { Telegraf } = require('telegraf');
const { message } = require('telegraf/filters');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');
// const installer = require('@ffmpeg-installer/ffmpeg');
const ffmpegPath = require('ffmpeg-static');

const allowedUsers = JSON.parse(process.env.ALLOWED_USER_IDS);
const OpenAI = require('openai')
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});
async function transcribeAudio(filePath) {
    const audioFile = fs.createReadStream(filePath);
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1'
    });
    return transcription.text;
  };

const bot = new Telegraf(process.env.BOT_API_KEY); 
ffmpeg.setFfmpegPath(ffmpegPath);
const convertOggToMp3 = (inputPath, outputPath) => {
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .toFormat('mp3')
            .on('end', () => {
                // console.log('Конвертация завершена.');
                resolve();
                fs.unlink(inputPath, (err) => {
                    if (err) {
                        console.log('Ошибка удаления файла:', err);
                        return;
                    }
                    console.log('Файл успешно удален');
                });
            })
            .on('error', (err) => {
                console.error('Ошибка при конвертации:', err);
                reject(err);
            })
            .save(outputPath);
    });
};


bot.start((ctx) => {
    ctx.reply('Привет! Я бот, который использует Speech!')
   
});
bot.on('voice', async (ctx) => {
    const userMessage = ctx.message.text;
    const userId = ctx.message.from.id;
    const chatId = ctx.chat.id;

    console.log('User ID:', userId);
    if (allowedUsers.includes(userId)) {
        try {
            const voiceFileId = ctx.message.voice.file_id;
            const fileLink = await ctx.telegram.getFileLink(voiceFileId);
            const response = await axios({
                method: 'get',
                url: fileLink,
                responseType: 'stream'
            });
            const outputFilePath = path.join(__dirname, `${voiceFileId}.ogg`);
            await new Promise((resolve, reject) => {
                const writer = fs.createWriteStream(outputFilePath);
                response.data.pipe(writer);
                writer.on('finish',  async () => {
                    const localOggPath = path.join(__dirname, `${voiceFileId}.ogg`);
                    const localMp3Path = path.join(__dirname, `${voiceFileId}.mp3`);
                    await convertOggToMp3(localOggPath, localMp3Path);
            
                    console.log('Файл успешно скачан и сохранен как voice_message.ogg');
                    ctx.reply('Ваше сообщение обрабатывается, ожидайте ответа');
                    resolve();
                    const transcription = await transcribeAudio(localMp3Path);
                    await fs.unlink(localMp3Path, (err) => {
                        if (err) {
                            console.log('Ошибка удаления файла:', err);
                            return;
                        }
                        console.log('Файл успешно удален');
                    });
                    ctx.reply(`Транскрипция:\n${transcription}`);
                   
                    if (transcription.startsWith('Нарис')) {
                        // Код, который выполняется, если сообщение начинается с "нартсовать"
                        ctx.reply('Вы начали процесс рисования!');
                        try {
                            const response = await openai.images.generate({
                                    model: "dall-e-3",
                                    prompt: transcription,
                                    n: 1,
                                    size: '1024x1792' // можете настроить размер по вашему усмотрению
                                });
                                const imageUrl = response.data[0].url;
                                ctx.replyWithPhoto(imageUrl);
                
                            } catch (err) {
                                console.log('Ошибка при обращении к OpenAI:', err);
                                ctx.reply('Извините, произошла ошибка при обработке вашего запроса.');
                            }
                      } else {
                        // Код, который выполняется, если сообщение не начинается с "нарисовать"
                       
                        try {
                            const response = await openai.chat.completions.create({
                                model: 'gpt-4o-mini', 
                                messages: [{ role: 'user', content: transcription }],
                            });
                    
                            const botReply = response.choices[0].message.content;
                            ctx.reply(botReply);
                        } catch (error) {
                            console.error('Ошибка при обращении к OpenAI:', error);
                            ctx.reply('Извините, произошла ошибка при обработке вашего запроса.');
                        }
                      }
                });
                writer.on('error', (err) => {
                    console.error('Ошибка при сохранении файла:', err);
                    ctx.reply('Произошла ошибка при сохранении вашего сообщения.');
                    reject(err);
                });
            });
        } catch (err) {
            console.log('Error while creating ogg', err.message)
        }
    }else{
        ctx.reply('Извините, не работаем.');
    }
});
bot.on('text', async (ctx) => {
    const userMessage = ctx.message.text;
    const userId = ctx.message.from.id;
    const chatId = ctx.chat.id;

    console.log('User ID:', userId);
    if (allowedUsers.includes(userId)) {
        if (userMessage.toLowerCase().startsWith('нарис')) {
            // Код, который выполняется, если сообщение начинается с "нартсовать"
            ctx.reply('Вы начали процесс рисования!');
            try {
                const response = await openai.images.generate({
                        model: "dall-e-3",
                        prompt: userMessage,
                        n: 1,
                        size: '1024x1024' // можете настроить размер по вашему усмотрению
                    });
                    const imageUrl = response.data[0].url;
                    ctx.replyWithPhoto(imageUrl);
    
                } catch (err) {
                    console.log('Ошибка при обращении к OpenAI:', err);
                    ctx.reply('Извините, произошла ошибка при обработке вашего запроса.');
                }
          } else {
            // Код, который выполняется, если сообщение не начинается с "нартсовать"
           
            try {
                const response = await openai.chat.completions.create({
                    model: 'gpt-4o-mini', 
                    messages: [{ role: 'user', content: userMessage }],
                });
        
                const botReply = response.choices[0].message.content;
                ctx.reply(botReply);
            } catch (error) {
                console.error('Ошибка при обращении к OpenAI:', error);
                ctx.reply('Извините, произошла ошибка при обработке вашего запроса.');
            }
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
