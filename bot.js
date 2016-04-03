// Created by ByteScout, Copyright 2016, // https://bytescout.com/blog/

var config = require('./config'); // rename config.js.sample into config.js and set keys and tokens inside it
var zlib = require('zlib');
var fs = require('fs');
var request = require('request');

var Bot = require('node-telegram-bot-api');
var bot;

if (process.env.NODE_ENV === 'production') {
    bot = new Bot(config.TelegramToken);
    bot.setWebHook(config.TelegramUrl + bot.token);
}
else {
    bot = new Bot(config.TelegramToken, { polling: true });
}

function guid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
          .toString(16)
          .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
      s4() + '-' + s4() + s4() + s4();
}

function getFileName(response){
    var dir = './tmp';

    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
    }

    dir = dir + "/" + guid();

    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
    }
    
    var regexp = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
    var filename = dir + "/" + regexp.exec(response.headers['content-disposition'])[1];
    return filename;
}


console.log('bytescout-telegram-bot server started...');


bot.on('text', function (msg) {
    var messageChatId = msg.chat.id;
    var messageText = msg.text;
    var messageDate = msg.date;
    var messageUser = msg.from.username;

    if (messageText.indexOf('/start') === 0) {        
        CommandStart(messageChatId);
        setTimeout(function(){
            CommandShowCommands(messageChatId);            
        }, 1000);
        return;
    }

   if (messageText.indexOf('barcoderead') === 0 || messageText.indexOf('barcoderead') === 1) {
        var text = messageText.substr(('barcoderead').length).trim();
        CommandBarcodeRead(messageChatId, text);
        SuccessHint(messageChatId); // add success hint
        return;
    }

    if (messageText.indexOf('barcode') === 0 || messageText.indexOf('barcode') === 1) {
        var text = messageText.substr(('barcode').length).trim();
        CommandBarcodeGenerator(messageChatId, text);
        SuccessHint(messageChatId); // add success hint        
        return;
    }


    if (messageText.indexOf('htmltopdf') === 0 || messageText.indexOf('htmltopdf') === 1) {
        var text = messageText.substr(('htmltopdf').length).trim();
        CommandHTMLToPDF(messageChatId, text);
        return;
    }

    if (messageText.indexOf('pdftoxml') === 0 || messageText.indexOf('pdftoxml') === 1) {
        var text = messageText.substr(('pdftoxml').length).trim();
        CommandPDFToXML(messageChatId, text);
        return;
    }

    if (messageText.indexOf('pdftotext') === 0 || messageText.indexOf('pdftotext') === 1) {
        var text = messageText.substr(('pdftotext').length).trim();
        CommandPDFToText(messageChatId, text);
        return;
    }

    if (messageText.indexOf('pdftocsv') === 0 || messageText.indexOf('pdftocsv') === 1) {
        var text = messageText.substr(('pdftocsv').length).trim();
        CommandPDFToCSV(messageChatId, text);
        return;
    }

    if (messageText.indexOf('pdfinfo') === 0 || messageText.indexOf('pdfinfo') === 1) {
        var text = messageText.substr(('pdfinfo').length).trim();
        CommandPDFInfo(messageChatId, text);
        return;
    }

    if (messageText.indexOf('spreadtocsv') === 0 || messageText.indexOf('spreadtocsv') === 1) {
        var text = messageText.substr(('spreadtocsv').length).trim();
        CommandSpreadToCSV(messageChatId, text);
        SuccessHint(messageChatId); // add success hint
        return;
    }


    if (messageText.indexOf('spreadtotxt') === 0 || messageText.indexOf('spreadtotxt') === 1) {
        var text = messageText.substr(('spreadtotxt').length).trim();
        CommandSpreadToTXT(messageChatId, text);
        return;
    }

    if(messageText.indexOf('/') === 0){
        CommandUnknown(messageChatId);
        CommandStart(messageChatId);
        return;
    }

    // else executing barcode generator
    CommandBarcodeGenerator(messageChatId, messageText.trim());
    SuccessHint(messageChatId); // add success hint
})

bot.on('photo', function(msg){
    var requestData =
    {
        url: 'https://api.telegram.org/bot'+config.TelegramToken+'/getFile',
        qs: {
            'file_id': msg.photo[msg.photo.length-1]['file_id']
        }
    };

    request.get(requestData, function (error, response, body) {
        var bodyObj = JSON.parse(body);
        var url = 'https://api.telegram.org/file/bot'+config.TelegramToken+'/'+bodyObj.result['file_path'];
        CommandBarcodeRead(msg.chat.id, url);
    });
});

var CommandStart = function (chatId) {
    var message = config.WelcomeMessage;
    bot.sendMessage(chatId, message);
};

var CommandShowCommands = function(chatId){
    var message = "ByteScout Bot Commands:\r\n"+ 
    '\u27a1' + "<value> - will generate QR Code for value\r\n" +
    '\u27a1' + "barcode <value> or <type of Barcode>:<value> - will generate barcode\r\n"+
    '\u27a1' + "barcoderead <url to image> OR just send in image to the chat - will read barcode\r\n"+
    '\u27a1' + "htmltopdf <inputurl> - will convert to pdf\r\n" + 
    '\u27a1' + "pdftoxml <url to pdf> - will convert pdf to xml\r\n" + 
    '\u27a1' + "pdftotext <url to pdf> - will convert pdf to text\r\n" + 
    '\u27a1' + "pdftocsv <url to pdf> - will convert pdf to csv\r\n" + 
    '\u27a1' + "pdfinfo <url to pdf> - will show pdf infor\r\n" + 
    '\u27a1' + "spreadtocsv <url to spreadsheet> - will convert xls/xlsx to csv\r\n" + 
    '\u27a1' + "spreadtotxt <url to spreadsheet> - will convert xls/xlsx to text\r\n";
    bot.sendMessage(chatId, message);
}

var CommandBarcodeGenerator = function (chatId, text) {
    var barcodeType = 'qrcode';
    var value = '';

    if (text.indexOf(':') > -1 && !(text.indexOf('http') === 0)) {
        var keys = text.split(':');
        barcodeType = keys.shift();
        value = keys.join(':');
    } else {
        value = text;
    }

    var requestData =
    {
        url: 'https://bytescout.io/api/v1/barcode/generate',
        encoding: 'binary',
        qs: {
            'apikey': config.ByteScoutAPIKEY,
            'properties.symbology': barcodeType.trim(),
            'input': value.trim(),
            'inputType': 'value'
        }
    };


    request.get(requestData, function (error, response, body) {
        if (error || response.statusCode != 200) {
            switch (response.statusCode) {
                case 400:
                    var body = JSON.parse(body);
                    bot.sendMessage(chatId, config.ErrorInput + "\r\n" + body.errors.join("\r\n"));
                    CommandShowCommands(chatId);
                    break;
                case 500:
                    bot.sendMessage(chatId, config.ErrorResponse);
                    break;
                default:
            }
        } else {
            var filename = getFileName(response);
            fs.writeFile(filename, body, 'binary', function (err) {
                if (err)
                    console.log(err);
                else {
                    bot.sendPhoto(chatId, filename).then(function () {
                        fs.unlinkSync(filename);
                    });
                }
            });
            SuccessHint(chatId); // add success hint
        }
    });
};

var CommandBarcodeRead = function (chatId, text) {
    var requestData =
    {
        url: 'https://bytescout.io/api/v1/barcodereader/read',
        encoding: 'binary',
        qs: {
            'apikey': config.ByteScoutAPIKEY,
            'input': text.trim(),
            'inputType': 'link'
        }
    };

    // console.log("barcode reader from url: "  + text);
    
    request.get(requestData, function (error, response, body) {
        if (error || response.statusCode != 200) {
            switch (response.statusCode) {
                case 400:
                    var body = JSON.parse(body);
                    bot.sendMessage(chatId, config.ErrorInput + "\r\n" + body.errors.join("\r\n"));
                    CommandShowCommands(chatId);
                    break;
                case 500:
                    bot.sendMessage(chatId, config.ErrorResponse);
                    break;
                default:
            }
        } else {
            // RegExp to extract the filename from Content-Disposition
            bot.sendMessage(chatId, body);
            SuccessHint(chatId); // add success hint            
        }
    });
};

var CommandHTMLToPDF = function (chatId, text) {

    var requestData =
    {
        url: 'https://bytescout.io/api/v1/htmltopdf/convert',
        encoding: 'binary',
        qs: {
            'apikey': config.ByteScoutAPIKEY,
            'input': text.trim(),
            'inputType': 'link',
            'properties.FooterText': config.HTMLtoPDFHeaderText
        }
    };


    request.get(requestData, function (error, response, body) {
        if (error || response.statusCode != 200) {
            switch (response.statusCode) {
                case 400:
                    var body = JSON.parse(body);
                    bot.sendMessage(chatId, config.ErrorInput + "\r\n" + body.errors.join("\r\n"));
                    CommandShowCommands(chatId);
                    break;
                case 500:
                    bot.sendMessage(chatId, config.ErrorResponse);
                    break;
                default:
            }
        } else {
            var filename = getFileName(response);
            fs.writeFile(filename, body, 'binary', function (err) {
                if (err)
                    console.log(err);
                else {
                    bot.sendDocument(chatId, filename).then(function () {
                        fs.unlinkSync(filename);
                    });
                }
            });
            SuccessHint(chatId); // add success hint
        }
    });
};

var CommandPDFToXML = function (chatId, text) {

    var requestData =
    {
        url: 'https://bytescout.io/api/v1/pdfextractor/xmlextractor/extract',
        encoding: 'binary',
        qs: {
            'apikey': config.ByteScoutAPIKEY,
            'input': text.trim(),
            'inputType': 'link',
            'Properties.StartPageIndex': 0,
            'Properties.EndPageIndex': 0
        }
    };


    request.get(requestData, function (error, response, body) {
        if (error || response.statusCode != 200) {
            switch (response.statusCode) {
                case 400:
                    var body = JSON.parse(body);
                    bot.sendMessage(chatId, config.ErrorInput + "\r\n" + body.errors.join("\r\n"));
                    CommandShowCommands(chatId);
                    break;
                default:
                    bot.sendMessage(chatId, config.ErrorResponse);
                    break;
            }
        } else {
            var filename = getFileName(response);
            fs.writeFile(filename, body, 'binary', function (err) {
                if (err)
                    console.log(err);
                else {
                    bot.sendDocument(chatId, filename).then(function () {
                        fs.unlinkSync(filename);
                    });
                }
            });

        }
    });
};


var CommandPDFToText = function (chatId, text) {

    var requestData =
    {
        url: 'https://bytescout.io/api/v1/pdfextractor/textextractor/extract',
        encoding: 'binary',
        qs: {
            'apikey': config.ByteScoutAPIKEY,
            'input': text.trim(),
            'inputType': 'link',
            'Properties.StartPageIndex': 0,
            'Properties.EndPageIndex': 0
        }
    };


    request.get(requestData, function (error, response, body) {
        if (error || response.statusCode != 200) {
            switch (response.statusCode) {
                case 400:
                    var body = JSON.parse(body);
                    bot.sendMessage(chatId, config.ErrorInput + "\r\n" + body.errors.join("\r\n"));
                    CommandShowCommands(chatId);
                    break;
                case 500:
                    bot.sendMessage(chatId, config.ErrorResponse);
                    break;
                default:
            }
        } else {
            var filename = getFileName(response);
            fs.writeFile(filename, body, 'binary', function (err) {
                if (err)
                    console.log(err);
                else {
                    bot.sendDocument(chatId, filename).then(function () {
                        fs.unlinkSync(filename);
                    });
                }
            });
            SuccessHint(chatId); // add success hint            
        }
    });
};

var CommandPDFToCSV = function (chatId, text) {

    var requestData =
    {
        url: 'https://bytescout.io/api/v1/pdfextractor/csvextractor/extract',
        encoding: 'binary',
        qs: {
            'apikey': config.ByteScoutAPIKEY,
            'input': text.trim(),
            'inputType': 'link',
            'Properties.StartPageIndex': 0,
            'Properties.EndPageIndex': 0
        }
    };

    request.get(requestData, function (error, response, body) {
        if (error || response.statusCode != 200) {
            switch (response.statusCode) {
                case 400:
                    var body = JSON.parse(body);
                    bot.sendMessage(chatId, config.ErrorInput + "\r\n" + body.errors.join("\r\n"));
                    CommandShowCommands(chatId);
                    break;
                case 500:
                    bot.sendMessage(chatId, config.ErrorResponse);
                    break;
                default:
            }
        } else {
            var filename = getFileName(response);
            fs.writeFile(filename, body, 'binary', function (err) {
                if (err)
                    console.log(err);
                else {
                    bot.sendDocument(chatId, filename).then(function () {
                        fs.unlinkSync(filename);
                    });
                }
            });
            SuccessHint(chatId); // add success hint            
        }
    });
};


var CommandPDFInfo = function (chatId, text) {

    var requestData =
    {
        url: 'https://bytescout.io/api/v1/pdfextractor/infoextractor/extract',
        encoding: 'binary',
        qs: {
            'apikey': config.ByteScoutAPIKEY,
            'input': text.trim(),
            'inputType': 'link',
        }
    };

    request.get(requestData, function (error, response, body) {
        if (error || response.statusCode != 200) {
            switch (response.statusCode) {
                case 400:
                    var body = JSON.parse(body);
                    bot.sendMessage(chatId, config.ErrorInput + "\r\n" + body.errors.join("\r\n"));
                    CommandShowCommands(chatId);
                    break;
                case 500:
                    bot.sendMessage(chatId, config.ErrorResponse);
                    break;
                default:
            }
        } else {
            // RegExp to extract the filename from Content-Disposition
            bot.sendMessage(chatId, body);
            SuccessHint(chatId); // add success hint            
        }
    });
};

var CommandSpreadToCSV = function (chatId, text) {

    var requestData =
    {
        url: 'https://bytescout.io/api/v1/spreadsheet/convert',
        encoding: 'binary',
        qs: {
            'apikey': config.ByteScoutAPIKEY,
            'input': text.trim(),
            'inputType': 'link',
            'Properties.ConvertType': 'csv'
        }
    };

    request.get(requestData, function (error, response, body) {
        if (error || response.statusCode != 200) {
            switch (response.statusCode) {
                case 400:
                    var body = JSON.parse(body);
                    bot.sendMessage(chatId, config.ErrorInput + "\r\n" + body.errors.join("\r\n"));
                    CommandShowCommands(chatId);
                    break;
                case 500:
                    bot.sendMessage(chatId, config.ErrorResponse);
                    break;
                default:
            }
        } else {
            var filename = getFileName(response);
            fs.writeFile(filename, body, 'binary', function (err) {
                if (err)
                    console.log(err);
                else {
                    bot.sendDocument(chatId, filename).then(function () {
                        fs.unlinkSync(filename);
                    });
                }
            });
            SuccessHint(chatId); // add success hint            
        }
    });
};

var CommandSpreadToTXT = function (chatId, text) {

    var requestData =
    {
        url: 'https://bytescout.io/api/v1/spreadsheet/convert',
        encoding: 'binary',
        qs: {
            'apikey': config.ByteScoutAPIKEY,
            'input': text.trim(),
            'inputType': 'link',
            'Properties.ConvertType': 'txt'
        }
    };

    request.get(requestData, function (error, response, body) {
        if (error || response.statusCode != 200) {
            switch (response.statusCode) {
                case 400:
                    var body = JSON.parse(body);
                    bot.sendMessage(chatId, config.ErrorInput + "\r\n" + body.errors.join("\r\n"));
                    CommandShowCommands(chatId);
                    break;
                case 500:
                    bot.sendMessage(chatId, config.ErrorResponse);
                    break;
                default:
            }
        } else {
            var filename = getFileName(response);
            fs.writeFile(filename, body, 'binary', function (err) {
                if (err)
                    console.log(err);
                else {
                    bot.sendDocument(chatId, filename).then(function () {
                        fs.unlinkSync(filename);
                    });
                }
            });
            SuccessHint(chatId); // add success hint            
        }
    });
};

// send unknown command help
var CommandUnknown = function (chatId) {
    bot.sendMessage(chatId, config.UnknownCommand);
};

// send success hint
var SuccessHint = function (chatId) {
    bot.sendMessage(chatId, config.SuccessMessage);
};

module.exports = bot;

