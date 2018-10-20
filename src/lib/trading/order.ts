import * as types from '../type';
import { ApiHandler } from '../api-handler';
import { logger, Helper } from '../common';
import { Storage } from '../storage';

const clc = require('cli-color');
export class Order extends ApiHandler {

  private worker = 0;
  storage: Storage;

  constructor(storage: Storage) {
    super();
    this.storage = storage;
  }

  async orderA(exchange: types.IExchange, testTrade: types.ITradeTriangle) {
    try {
      const timer = Helper.getTimer();
      // Пропустить при размещении заказа
      if (!testTrade.a.orderId) {
        // Получить сумму транзакции
        logger.info(`Первый шаг：${clc.blueBright(testTrade.a.pair)}`);
        testTrade.a.timecost = '';
        logger.info(`Предельная цена：${testTrade.a.price}, количество：${testTrade.a.amount}, направление：${testTrade.a.side}`);
        const order = <types.IOrder>{
          symbol: testTrade.a.pair,
          side: testTrade.a.side.toLowerCase(),
          type: 'limit',
          price: testTrade.a.price,
          amount: testTrade.a.amount,
        };
        const orderInfo = await this.createOrder(exchange, order);
        if (!orderInfo) {
          return;
        }
        logger.debug(`Возвращаемое значение заказа: ${JSON.stringify(orderInfo, null, 2)}`);

        testTrade.a.status = orderInfo.status;
        testTrade.a.orderId = orderInfo.id;

        // Обновить очередь
        await this.storage.updateTradingSession(testTrade, 0);
      }
      const nextB = async () => {
        logger.info('выполнение nextB...');
        const orderRes = await this.queryOrder(exchange, testTrade.a.orderId, testTrade.a.pair);
        if (!orderRes) {
          return false;
        }
        logger.info(`Статус заказа запроса： ${orderRes.status}`);
        // Когда транзакция успешна
        if (orderRes.status === 'closed') {
          testTrade.a.timecost = Helper.endTimer(timer);
          // Исправленное количество
          testTrade.a.amount = orderRes.amount;
          testTrade.a.status = orderRes.status;
          // Обновить очередь
          await this.storage.updateTradingSession(testTrade, 0);

          if (this.worker) {
            clearInterval(this.worker);
          }
          await this.orderB(exchange, testTrade);
          return true;
        }
        return false;
      };

      // Когда заказ не заполнен
      if (!await nextB()) {
        logger.info('Заказ не заполняется и циклически выполняется каждую секунду.');
        this.worker = setInterval(nextB.bind(this), 1000);
      }
    } catch (err) {
      const errMsg = err.message ? err.message : err.msg;
      logger.error(`Ошибка заказа： ${errMsg}`);
      await this.errorHandle(testTrade.queueId, errMsg);
    }
  }

  async orderB(exchange: types.IExchange, trade: types.ITradeTriangle) {
    try {
      const timer = Helper.getTimer();
      const tradeB = trade.b;
      // Пропустить при размещении заказа
      if (!tradeB.orderId) {

        logger.info(`Второй шаг：${clc.blueBright(trade.b.pair)}`);
        logger.info(`Предельная цена：${tradeB.price}, количество：${tradeB.amount}, направление：${tradeB.side}`);
        const order = <types.IOrder>{
          symbol: tradeB.pair,
          side: tradeB.side.toLowerCase(),
          type: 'limit',
          price: tradeB.price,
          amount: tradeB.amount,
        };
        const orderInfo = await this.createOrder(exchange, order);
        if (!orderInfo) {
          return;
        }
        logger.debug(`Возвращаемое значение заказа: ${JSON.stringify(orderInfo, null, 2)}`);

        trade.b.status = <any>orderInfo.status;
        trade.b.orderId = orderInfo.id;
        // Обновить очередь
        await this.storage.updateTradingSession(trade, 1);
      }
      const nextC = async () => {
        logger.info('выполнение nextC...');

        const orderRes = await this.queryOrder(exchange, tradeB.orderId, tradeB.pair);
        if (!orderRes) {
          return false;
        }
        logger.info(`Статус заказа запроса： ${orderRes.status}`);
        // Когда транзакция успешна
        if (orderRes.status === 'closed') {
          if (this.worker) {
            clearInterval(this.worker);
          }
          trade.b.timecost = Helper.endTimer(timer);
          // Исправленное количество
          trade.b.amount = orderRes.amount;
          trade.b.status = orderRes.status;
          // Обновить очередь
          await this.storage.updateTradingSession(trade, 1);
          await this.orderC(exchange, trade);
          return true;
        }
        return false;
      };

      // Когда заказ не заполнен
      if (!await nextC()) {
        logger.info('Заказ не заполняется и циклически выполняется каждую секунду');
        this.worker = setInterval(nextC.bind(this), 1000);
      }
    } catch (err) {
      const errMsg = err.message ? err.message : err.msg;
      logger.error(`Ошибка заказа B： ${errMsg}`);
      await this.errorHandle(trade.queueId, errMsg);
    }
  }

  async orderC(exchange: types.IExchange, trade: types.ITradeTriangle) {
    try {
      const timer = Helper.getTimer();
      const tradeC = trade.c;
      // Пропустить при размещении заказа
      if (!tradeC.orderId) {
        logger.info(`Третий этап：${clc.blueBright(trade.c.pair)}`);
        logger.info(`Предельная цена：${tradeC.price}, количество：${tradeC.amount}, направление：${tradeC.side}`);
        if (tradeC.side.toLowerCase() === 'sell' && tradeC.amount > trade.b.amount) {
          tradeC.amount = trade.b.amount;
        }
        const order = <types.IOrder>{
          symbol: tradeC.pair,
          side: tradeC.side.toLowerCase(),
          type: 'limit',
          price: tradeC.price,
          amount: tradeC.amount,
        };
        const orderInfo = await this.createOrder(exchange, order);
        if (!orderInfo) {
          return;
        }
        logger.debug(`Возвращаемое значение заказа: ${JSON.stringify(orderInfo, null, 2)}`);

        trade.c.status = orderInfo.status;
        trade.c.orderId = orderInfo.id;
        // Обновить очередь
        await this.storage.updateTradingSession(trade, 2);
      }
      const completedC = async () => {
        logger.info('completedC...');
        const orderRes = await this.queryOrder(exchange, tradeC.orderId, tradeC.pair);
        if (!orderRes) {
          return false;
        }
        logger.info(`Статус заказа запроса： ${orderRes.status}`);
        // Когда транзакция успешна
        if (orderRes.status === 'closed') {
          if (this.worker) {
            clearInterval(this.worker);
          }
          logger.info(`Треугольный арбитраж завершен и, наконец, получен：${orderRes.amount}...`);
          trade.c.timecost = Helper.endTimer(timer);
          // Исправленное количество
          trade.c.amount = orderRes.amount;
          trade.c.status = orderRes.status;
          // Очистить эти данные в очереди транзакций
          await this.storage.closeTradingSession(trade);
        }
        return false;
      };

      // Когда заказ не заполнен
      if (!await completedC()) {
        logger.info('Заказ не заполняется и циклически выполняется каждую секунду.');
        this.worker = setInterval(completedC.bind(this), 1000);
      }
    } catch (err) {
      const errMsg = err.message ? err.message : err.msg;
      logger.error(`Ошибка заказа C： ${errMsg}`);
      await this.errorHandle(trade.queueId, errMsg);
    }
  }

  private async errorHandle(queueId: string, error: string) {
    const res: types.IQueue = <any>await this.storage.queue.get(queueId);
    res.error = error;
    await this.storage.queue.updateQueue(res);
  }
}
