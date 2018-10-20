const moment = require('moment');
const config = require('config');
import * as fs from 'fs';

// Подготовьте журнал
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, label, printf, colorize } = format;
timestamp();
const logDir = 'log';
// Если каталог не существует
if (!fs.existsSync(logDir)) {
  // Создать каталог журнала
  fs.mkdirSync(logDir);
}

const tsFormat = () => moment().format();
const myFormat = printf((info: any) => {
  return `${info.timestamp} [${info.level}] ${info.message}`;
});
let myTransports = [
  // Цветной вывод на консоль
  new transports.File({
    filename: `${logDir}/error.log`,
    level: 'error',
  }),
  new transports.File({
    filename: `${logDir}/combined.log`,
    level: 'info',
  }),
  new transports.Console({
    format: combine(colorize(), myFormat),
    level: 'info',
  }),
];

if (config.log.debug) {
  myTransports = myTransports.concat([
    new transports.File({
      filename: `${logDir}/debug.log`,
      level: 'debug',
    }),
    new transports.Console({
      format: combine(colorize(), myFormat),
      level: 'debug',
    }),
  ]);
}

export const logger = createLogger({
  format: combine(
    label({ label: '' }),
    timestamp({
      format: tsFormat,
    }),
    myFormat,
  ),
  transports: myTransports,
});
