const TeleBot = require('telebot');
const cheerio = require('cheerio');
const request = require('request');
const winston = require('winston');
const ConfigParser = require('configparser');

const config = new ConfigParser();
config.read('config.cfg');

let page = 1;
const timestamp = () => (new Date()).toLocaleTimeString();

const BUTTONS = {
    previous: { label: '⏪ Previous', command: '/previous' },
    next: { label: 'Next ⏩', command: '/next' },
    info: { label: 'Info', command: '/info' },
    back_to_first: { label: 'Back to First Page', command: '/back_to_first' }
};

const bot = new TeleBot({
    token: config.get(process.env.NODE_ENV, 'token'),
    usePlugins: ['namedButtons'],
    pluginConfig: {
        namedButtons: {
            buttons: BUTTONS
        }
    }
});

const logger = winston.createLogger({
  transports: [
    new (winston.transports.Console)({
      timestamp,
      level: 'info'
    }),
    new (winston.transports.File)({
      name: 'info-file',
      filename: 'logger-info.log',
      timestamp,
      level: 'info'
    }),
    new (winston.transports.File)({
      name: 'error-file',
      filename: 'logger-error.log',
      timestamp,
      level: 'error'
    })
  ]
});
    
let replyMarkup = bot.keyboard([
        [BUTTONS.previous.label, BUTTONS.next.label],
        [BUTTONS.back_to_first.label, BUTTONS.info.label],
    ], {resize: true});

function getInfo(msg){
  logger.info('\n'+`User information: ${JSON.stringify(msg)}`+'\n');
}

function getData(msg, replyMarkup, page){
  
  let url = 'http://thecodinglove.com/page/'+page;
  
  request(url, function (error, response, body) {
    
    var titles = [];
    var images = [];
    
    if(!error){
       let $ = cheerio.load(body);

        let allTitles = $('.blog-post').find('.blog-post-title');
        let allImages = $('.blog-post').find('.blog-post-content').find('p');

        allTitles.each(function (index, element){
            let title = $(element).find('a').text();
            titles.push(title);
        });

        allImages.each(function (index, element){
          if ($(element).find('video').find('object').attr("data") !== undefined){
            images.push($(element).find('video').find('object').attr("data"));
          }
          else if($(element).find('img').attr("src") !== undefined){
            images.push($(element).find('img').attr("src"));
          }
          else{
            logger.error(err);
          }
        });
      
      for (let i=0; i<=3; i++){
        let extension = images[i] !== undefined ? images[i].split('.').pop() : undefined;
        if (extension === 'gif' || extension === 'gif?1'){
          bot.sendChatAction(msg.chat.id, 'typing');
          bot.sendDocument(msg.chat.id, images[i],{caption: titles[i]+'\n', replyMarkup})
              .catch(err => {
                bot.sendMessage(msg.chat.id, `Fail to send image.`);
                logger.error(err);
            });
        }
        
        else if (extension === 'jpg'){
          bot.sendChatAction(msg.chat.id, 'typing');
          bot.sendPhoto(msg.chat.id, images[i],{caption: titles[i]+'\n', replyMarkup})
              .catch(err => {
                bot.sendMessage(msg.chat.id, `Fail to send image.`);
                logger.error(err);
            });
        }

        else {
            bot.sendPhoto(msg.chat.id, images[i],{caption: titles[i]+'\n', replyMarkup})
              .catch(err => {
                bot.sendMessage(msg.chat.id, `Fail to send image.`);
                logger.error(err);
            });
          }
        }
      }
    else{
      logger.error(error);
    }
  });
}

function getRandompost(msg, replyMarkup){
  
  var urlRandom;
  let url = 'http://thecodinglove.com/page/1';
  request(url, function (error, response, body) {
    let $ = cheerio.load(body);
    urlRandom = $('.nav-item').find('a.nav-link').attr("href");
  });
  
  request(urlRandom, function (error, response, body) {
    if(!error){
      let $ = cheerio.load(body);
      let title = $('.blog-post').find('.blog-post-title').find('a').text();
      let image = $('.blog-post').find('.blog-post-content').find('p').find('img').attr("src");
      
      if (image.endswith === 'gif' || image.endswith === 'gif?1'){
        bot.sendDocument(msg.chat.id, image,{caption: title+'\n', replyMarkup});
        bot.sendGif(msg.chat.id, image,{caption: title+'\n', replyMarkup})
            .catch(err => {
              bot.sendMessage(msg.chat.id, `Fail to send image.`);
              logger.error(err);
          });
      }
      else {
          bot.sendPhoto(msg.chat.id, image,{caption: title+'\n', replyMarkup})
            .catch(err => {
              bot.sendMessage(msg.chat.id, `Fail to send image.`);
              logger.error(err);
          });
        }
      }
    else{
      logger.error(error);
    }
  });
}

bot.on('/start', (msg) => {
  page = 1;
  getInfo(msg);
  replyMarkup = bot.keyboard([
    [BUTTONS.next.label],
    [BUTTONS.back_to_first.label, BUTTONS.info.label],
  ], {resize: true});
  getData(msg, replyMarkup, page);
});

bot.on('/previous', (msg) => {
  getInfo(msg);
  if (page === 1){
    replyMarkup = bot.keyboard([
      [BUTTONS.next.label],
      [BUTTONS.back_to_first.label, BUTTONS.info.label],
    ], {resize: true});
    bot.sendMessage(msg.chat.id, 'You\'re on the first page.', {replyMarkup});
  } else {
    page = page - 1;
    bot.sendMessage(msg.chat.id, `Page: ${page}`);
    getData(msg, replyMarkup, page);
  }
});

bot.on('/next', (msg) => {
  getInfo(msg);
  page = page + 1;
  bot.sendMessage(msg.chat.id, `Getting information for page: ${page}`);
  replyMarkup = bot.keyboard([
    [BUTTONS.previous.label, BUTTONS.next.label],
    [BUTTONS.back_to_first.label, BUTTONS.info.label],
  ], {resize: true});
  getData(msg, replyMarkup, page);
});

bot.on('/back_to_first', (msg) => {
  page = 1;
  replyMarkup = bot.keyboard([
    [BUTTONS.next.label],
    [BUTTONS.back_to_first.label, BUTTONS.info.label],
  ], {resize: true});
  getInfo(msg);
  getData(msg, replyMarkup, page);
  bot.sendMessage(msg.chat.id, 'You\'re on the first page.', {replyMarkup});
});

bot.on('/info', (msg) => {
  getInfo(msg);
  bot.sendMessage(msg.chat.id, 'This bot get images and description from thecodinglove.com and send to you, please use commands of the keyboard.\nBot made by @bergpb.');
});

bot.start();
