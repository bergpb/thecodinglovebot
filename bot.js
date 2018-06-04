//https://github.com/mullwar/telebot

const TeleBot = require('telebot');
const cheerio = require('cheerio');
const request = require('request');
const winston = require('winston');
//const mytoken = process.env.TELEGRAM_TOKEN;
//const myport = process.env.PORT;

let page = 1;
const timestamp = () => (new Date()).toLocaleTimeString();

const BUTTONS = {
    previous: {
        label: '⏪ Previous',
        command: '/previous'
    },
    next: {
        label: 'Next ⏩',
        command: '/next'
    },
    //random: {
    //    label: '🔀 Random Post',
    //    command: '/random_post'
    //},
    info: {
        label: 'Info',
        command: '/info'
    },
    back_to_first: {
        label: 'Back to First Page',
        command: '/back_to_first'
    }
};

/*const bot = new TeleBot({
    token: mytoken,
    usePlugins: ['namedButtons'],
    pluginConfig: {
        namedButtons: {
            buttons: BUTTONS
        }
    }
});*/

const bot = new TeleBot({
    token: '510299277:AAGVuQ9hMSJF80AdIknQRbZ9Bh5tywf82FE',
    usePlugins: ['namedButtons'],
    pluginConfig: {
        namedButtons: {
            buttons: BUTTONS
        }
    },
    //webhook: {
        // Self-signed certificate:
        // key: './key.pem',
        // cert: './cert.pem',
        //url: 'https://thecodinglovebot.glitch.me/',
        //host: '0.0.0.0',
        //port: myport
    //}
});

const logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({
      timestamp,
      level: 'info'
    }),
    new (winston.transports.File)({
      filename: 'logger.log',
      timestamp,
      level: 'info'
    })
  ]
});
    
let replyMarkup = bot.keyboard([
        //[BUTTONS.random.label],
        [BUTTONS.previous.label, BUTTONS.next.label],
        [BUTTONS.back_to_first.label, BUTTONS.info.label],
    ], {resize: true});

function getInfo(msg){
  logger.info('\n'+`User information: ${JSON.stringify(msg)}`+'\n');
}

function getData(msg, replyMarkup, page){
  
  let url = 'http://thecodinglove.com/page/'+page;
  
  request(url, function (error, response, body) {
    
    let promisse;
    
    var titles = [];
    var images = [];
    
    if(!error){
       let $ = cheerio.load(body);

        let allTitles = $('.blog-post').find('.blog-post-title')
        let allImages = $('.blog-post').find('.blog-post-content')

        allTitles.each(function (index, element){
            let title = $(element).find('a').text();
            titles.push(title);
        })

        allImages.each(function (index, element){
            let image = $(element).find('p').find('img').attr("src");
            images.push(image);
        })
      
      for (let i=0; i<=3; i++){
        let extension = images[i].split('.').pop()
        if (extension === 'gif' || extension === 'gif?1'){
          bot.sendAction(msg.chat.id, 'typing');
          bot.sendDocument(msg.chat.id, images[i],{caption: titles[i]+'\n', replyMarkup})
              .catch(err => {
                bot.sendMessage(msg.chat.id, `Fail to send image.`)
                logger.info(err);
            });
        }

        else {
            bot.sendPhoto(msg.chat.id, images[i],{caption: titles[i]+'\n', replyMarkup})
              .catch(err => {
                bot.sendMessage(msg.chat.id, `Fail to send image.`);
                logger.info(err);
            });
          }
        }
      }
    else{
      logger.info(error);
    }
  });
}

function getRandompost(msg, replyMarkup){
  
  var urlRandom;
  let url = 'http://thecodinglove.com/page/1';
  
  // this can help here
  //https://www.davidbcalhoun.com/2009/passing-data-to-functions-in-javascript/
  
  request(url, function (error, response, body) {
    let $ = cheerio.load(body);
    urlRandom = $('.nav-item').find('a.nav-link').attr("href");
  });
  
  console.log("url: "+urlRandom);

  request(urlRandom, function (error, response, body) {
    
    console.log(urlRandom);
    
    if(!error){
       let $ = cheerio.load(body);

        let title = $('.blog-post').find('.blog-post-title').find('a').text();
        let image = $('.blog-post').find('.blog-post-content').find('p').find('img').attr("src");
      
        if (image.endswith === 'gif' || image.endswith === 'gif?1'){
          bot.sendDocument(msg.chat.id, image,{caption: title+'\n', replyMarkup})
          bot.sendGif(msg.chat.id, image,{caption: title+'\n', replyMarkup})
              .catch(err => {
                bot.sendMessage(msg.chat.id, `Fail to send image.`);
                logger.info(err);
            });
        }

        else {
            bot.sendPhoto(msg.chat.id, image,{caption: title+'\n', replyMarkup})
              .catch(err => {
                bot.sendMessage(msg.chat.id, `Fail to send image.`);
                logger.info(err);
            });
          }
        }
    else{
      console.log(error);
    }
  });
}

bot.on('/start', (msg) =>{
  page = 1;
  getInfo(msg);
  replyMarkup = bot.keyboard([
      [BUTTONS.next.label],
      [BUTTONS.back_to_first.label, BUTTONS.info.label],
    ], {resize: true});
  getData(msg, replyMarkup, page);
});

bot.on('/previous', (msg) =>{
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

bot.on('/next', (msg) =>{
  getInfo(msg);
  page = page + 1;
  bot.sendMessage(msg.chat.id, `Page: ${page}`);
  replyMarkup = bot.keyboard([
        //[BUTTONS.random.label],
        [BUTTONS.previous.label, BUTTONS.next.label],
        [BUTTONS.back_to_first.label, BUTTONS.info.label],
    ], {resize: true});
  getData(msg, replyMarkup, page);
});

bot.on('/back_to_first', (msg) =>{
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

//bot.on('/random_post', (msg) => {
//  getInfo(msg);
//    replyMarkup = bot.keyboard([
//      [BUTTONS.random.label],
//      [BUTTONS.back_to_first.label, BUTTONS.info.label],
//    ], {resize: true});
//  getRandompost(msg, replyMarkup);
//});

bot.start();
