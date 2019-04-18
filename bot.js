process.env.NTBA_FIX_319 = 1; //FIX

//Модули
var request = require('request-promise');
var cheerio = require('cheerio');
var TelegramBot = require('node-telegram-bot-api');
var util = require('util');
util.inspect.defaultOptions.maxArrayLength = null;
//Token
var token = '';
// Включить опрос сервера
var bot = new TelegramBot(token, { polling: true });

var BotUtils = {

    // Создание обычной кнопки с callback_data
    buildDefaultButton: function (text, callback_data, link) {
        return [{
            text: text,
            callback_data: callback_data,
        }]
    },

    // Создание обычной кнопки с callback_data для двумерного массива
    buildDefaultButtonArr: function (text, callback_data, link) {
        return {
            text: text,
            callback_data: callback_data,
            link: link
        }
    },

    // Сборка настроек для сообщения
    buildMessageOptions: function (buttons) {
        return {
            parse_mode: "HTML",
            disable_web_page_preview: false,
            reply_markup: JSON.stringify({
                inline_keyboard: buttons
            })
        }
    },
};

var nums = "123456789";
var counter = 1;
var buttons_arr_num = [];
var last = true;


for (i = 0; i < 3; i++) { //двумерный массив для клавиатуры
    buttons_arr_num[i] = new Array;
    for (j = 0; j < 3; j++) {
        buttons_arr_num[i][j] = BotUtils.buildDefaultButtonArr(counter, counter, "http://vsegost.com/NCategories/n_" + counter + ".shtml");
        counter++;
    }
}

bot.onText(new RegExp('\/start'), function (message, match) {
    var clientId = message.hasOwnProperty('chat') ? message.chat.id : message.from.id;
    bot.sendMessage(clientId, 'Выберите цифру, с которой начинается ГОСТ:',
        BotUtils.buildMessageOptions(buttons_arr_num));
});

bot.on('callback_query', function (message) {
    var clientId = message.hasOwnProperty('chat') ? message.chat.id : message.from.id;
    if (message.data == 'back_to_keyboard') {
        bot.editMessageText('Выберите цифру, с которой начинается ГОСТ:', { chat_id: clientId, message_id: message.message.message_id, parse_mode: 'HTML', disable_web_page_preview: false, reply_markup: JSON.stringify({ inline_keyboard: buttons_arr_num }) });
    }
    if (nums.split('').indexOf(message.data) != -1) { //для цифр
        searchLink(buttons_arr_num, message.data, clientId, 10, message.message.message_id);
    }
    if (message.data.match(/([0-9]+)d/) && message.data.match(/([0-9]+)d?/)[1] < 10 || (message.data > 10 && message.data < 100)) {
        Aparse("http://vsegost.com/NCategories/n_" + message.data + ".shtml", 100, message.data).then(function () {
            newArr.push(BotUtils.buildDefaultButton('Назад', message.data.match(/([0-9]+)d?/)[1] > 9 ? Math.floor(message.data.match(/([0-9]+)d?/)[1] / 10) : message.data.match(/([0-9]+)d?/)[1]))
            bot.editMessageText(last ? 'Список ГОСТов:' : 'ГОСТы, начинающиеся с: ', { chat_id: clientId, message_id: message.message.message_id, parse_mode: 'HTML', disable_web_page_preview: false, reply_markup: JSON.stringify({ inline_keyboard: newArr }) });
        })
    }
    if (message.data.match(/([0-9]+)d/) && message.data.match(/([0-9]+)d?/)[1] < 100 && message.data.match(/([0-9]+)d?/)[1] > 10 || (message.data > 100)) {
        Aparse("http://vsegost.com/NCategories/n_" + message.data + ".shtml", 1000, message.data).then(function () {
            newArr.push(BotUtils.buildDefaultButton('Назад',
             message.data.match(/([0-9]+)d?/)[1] > 99 ? Math.floor(message.data.match(/([0-9]+)d?/)[1] / 10) : message.data.match(/([0-9]+)d?/)[1]))
            bot.editMessageText(last ? 'Список ГОСТов:' : 'ГОСТы, начинающиеся с: ', { chat_id: clientId,
                 message_id: message.message.message_id, parse_mode: 'HTML', 
                 disable_web_page_preview: false, reply_markup: JSON.stringify({ inline_keyboard: newArr }) });

        })
    }
    if (message.data.match(/Catalog/)) {
        parsePhotos('http://vsegost.com' + message.data).then(function () {
            if (message.data.match(/Catalog\S55\S55714.shtml/)) { //фикс картинки маленького размера
                newArr.splice(newArr.length, 1)
            }
            while (newArr.length) {
                newArr.length < 10 ? bot.sendMediaGroup(clientId, 
                    newArr.splice(0, newArr.length)) : bot.sendMediaGroup(clientId, newArr.splice(0, 10))
            }
        })

    }
});

function searchLink(array, msgdata, clientId, num, msg_id) {
    for (i = 0; i < array.length; i++) {
        for (j = 0; j < array[i].length; j++) {
            if (array[i][j].callback_data == msgdata) {
                Aparse(array[i][j].link, num, msgdata).then(function () {
                    newArr.push(BotUtils.buildDefaultButton('Назад', 'back_to_keyboard'))
                    bot.editMessageText('ГОСТы, начинающиеся с: ', { chat_id: clientId, message_id: msg_id, parse_mode: 'HTML', disable_web_page_preview: false, reply_markup: JSON.stringify({ inline_keyboard: newArr }) });
                })
            }
        }
    }
}

const parsePhotos = async (URL, clientId, msgdata) => {
    arr = [];
    arr0 = [];
    newArr = [];
    counter = 0;
    await request(URL, function (error, response, body) {
        if (!error) {
            var $ = cheerio.load(body, { decodeEntities: false });
            $('.main > a').each(function () {
                arr.push($(this).attr('href'))
                arr0.push($(this).attr('title'))
            })
            for (i = 0; i < arr.length; i++) {
                if (arr[i].match(/(\SData(.*))/) && arr[i].match(/\SData.*/)[0] !== '/Data/662/66259/0.gif') {
                    newArr[counter] = {
                        type: 'photo',
                        media: 'http://vsegost.com' + arr[i].match(/(\SData(.*))/)[0],
                        caption: arr0[i],
                    };
                    counter++
                }
            }
        } else { console.log(error) }
    })
}

const Aparse = async (URL, num, msgdata) => {
    newArr = [];
    arr = [];
    arr0 = [];
    reg = /^([0-9])+(\S)?([0-9])?/;
    await request(URL, function (error, response, body) {
        if (!error) {
            var $ = cheerio.load(body, { decodeEntities: false });
            $('.main table tbody tr').each(function () {
                arr.push($(this).text());
            })
            $('.main > table > tbody > tr > td > a').each(function () {
                arr0.push($(this).attr('href'));
            })
            counter = 0;
            for (i = 0; i < arr.length; i++) {
                if (arr[i].match(reg) || arr[i].match(/^ГОСТ/)) {
                    newArr[counter] = BotUtils.buildDefaultButton((arr[i].match(reg) ? arr[i].match(reg)[2] === '.' ? arr[i].match(reg)[3] == undefined ? arr[i].match(reg)[0].replace('.', '') + " — " : arr[i].match(reg)[0] + " — " : arr[i].match(reg)[0] + " — " : "") + arr[i].match(/гост\s?((?:.+?[\d-]+-)?\d{2,4})/i)[0],
                        (arr[i].match(reg) ? arr[i].match(reg)[0] < num ? arr[i].match(reg)[2] === '.' ? arr[i].match(reg)[0].replace('.', 'd') : arr[i].match(reg)[0] + 'd' : arr[i].match(reg)[0] : arr0[counter]));
                    counter++;
                }
            }
            if (newArr[0][0].text.match(reg)) {
                last = false
            } else { last = true }
        }
    })
}

console.log("Started ");
