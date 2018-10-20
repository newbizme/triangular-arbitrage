import { BigNumber } from 'bignumber.js';
import * as ccxt from 'ccxt';
import * as types from '../type';
import { logger, Helper } from '../common';
import { Storage } from '../storage';
import { Mocker } from './mocker';
import { Order } from './order';
import { Daemon } from './daemon';

const clc = require('cli-color');
const config = require('config');

export class Trading {
  mocker: Mocker;
  order: Order;
  storage: Storage;
  daemon: Daemon;

  constructor() {
    this.mocker = new Mocker();
    this.storage = new Storage();
    this.order = new Order(this.storage);
    this.daemon = new Daemon(this.storage);
  }
  async testOrder(exchange: types.IExchange, triangle: types.ITriangle) {
    return await this.mocker.testOrder(exchange, triangle);
  }
  // заказ
  async placeOrder(exchange: types.IExchange, triangle: types.ITriangle) {
    try {
      // Данные таймаута очистки
      await this.storage.queue.clearQueue();
      // Продолжить обработку неудавшейся очереди
      await this.daemon.continueTrade(exchange);

      const limitCheck = await Helper.checkQueueLimit(this.storage.queue)
      if (!limitCheck) {
        return;
      }
      const testTrade = await this.testOrder(exchange, triangle);
      // Вернитесь, если не пройдете проверку
      if (!testTrade || !testTrade.id) {
        // logger.info(`Комбинация арбитража не смогла выполнить технико-экономическое обоснование! !`);
        return;
      }

      if (config.trading.mock) {
        logger.info('Настройте, чтобы имитировать торговлю и прекратить реальную торговлю!');
        return;
      }

      logger.info('----- Арбитраж начинается -----');
      logger.info(`путь：${clc.cyanBright(triangle.id)} Процентная ставка: ${triangle.rate}`);

      // Положить в очередь на торговлю
      const queueId = await this.storage.openTradingSession({
        mock: testTrade,
        real: testTrade
      });
      if (!queueId) {
        return;
      }
      testTrade.queueId = queueId;
      // Выполнить заказ
      await this.order.orderA(exchange, testTrade);
    } catch (err) {
      logger.error(`Ошибка порядка обработки： ${err.message ? err.message : err.msg}`);
      // Выйти из торговой очереди
      // await this.storage.clearQueue(triangle.id, exchange.id);
    }
  }
}
