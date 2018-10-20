import { BigNumber } from 'bignumber.js';
import * as ccxt from 'ccxt';
import { logger, Helper } from '../common';
import { ApiHandler } from '../api-handler';
import * as types from '../type';

const clc = require('cli-color');
const config = require('config');

export class Mocker extends ApiHandler {
  constructor() {
    super();
  }

  /**
   * Имитировать информацию транзакции для каждой стороны
   *
   * @param pairs Полная рыночная сделка
   * @param edge Комбинированная сторона
   * @param amount Количество ожидающих транзакций
   */
  getMockTradeEdge(pairs: types.IPairs, edge: types.IEdge, amount: BigNumber) {
    const tradeEdge = <types.ITradeEdge>{
      pair: edge.pair,
      side: edge.side,
    };
    const timer = Helper.getTimer();

    // Получить точность транзакции
    const priceScale = Helper.getPriceScale(pairs, edge.pair);
    if (!priceScale) {
      logger.debug(`Нет точности транзакций! !`);
      return;
    }
    // Получите точность форматирования (buy-> price precision, sell-> quantity precision)
    const precision = edge.side.toLowerCase() === 'buy' ? priceScale.price : priceScale.amount;
    // Получите точность форматирования (buy-> price precision, sell-> quantity precision)
    const fmAmount = new BigNumber(amount.toFixed(precision, 1));
    if (fmAmount.isZero()) {
      logger.debug(`Результатом является 0 после форматирования количества покупки! !`);
      return;
    }
    // Плата за транзакцию
    const feeRate = pairs[edge.pair].maker;
    if (!feeRate || feeRate <= 0) {
      logger.debug(`Не получил комиссию за транзакцию! !`);
      return;
    }
    tradeEdge.amount = +amount.toFixed(priceScale.amount, 1);
    tradeEdge.price = edge.price;
    tradeEdge.fee = Helper.getConvertedAmount({
      side: edge.side,
      exchangeRate: edge.price,
      amount: tradeEdge.amount
    }).times(feeRate).toFixed(8) + ' ' + edge.coinTo;
    tradeEdge.timecost = Helper.endTimer(timer);
    return tradeEdge;
  }

  // Проверка осуществимости до выполнения заказа
  async testOrder(exchange: types.IExchange, triangle: types.ITriangle) {
    // logger.info(`Треугольное арбитражное сочетание：${triangle.id}, Заказать технико-экономическое обоснование ...`);
    if (!exchange.endpoint.private || !exchange.pairs) {
      logger.error('Параметры, связанные с обменом, неверны! !');
      return;
    }

    // Активы запроса
    const balances = await this.getBalance(exchange);
    if (!balances) {
      logger.debug('Не найдено активов холдинга! !');
      return;
    }

    const tradeTriangle = <types.ITradeTriangle>{
      coin: triangle.a.coinFrom,
      exchange: config.exchange.active,
    };

    const asset = balances[tradeTriangle.coin];
    if (!asset) {
      logger.debug(`Не найдено${tradeTriangle.coin}！！`);
      return;
    }
    const free = new BigNumber(asset.free);
    if (free.isZero()) {
      logger.debug(`Не найдено${tradeTriangle.coin}！！`);
      return;
    }
    // Получить точность транзакции
    const priceScale = Helper.getPriceScale(exchange.pairs, triangle.a.pair);
    if (!priceScale || !priceScale.cost) {
      return;
    }
    // Проверьте минимальное количество транзакций
    let minAmount;
    if (triangle.a.coinFrom.toUpperCase() !== 'BTC') {
      minAmount = Helper.convertAmount(triangle.a.price, priceScale.cost, triangle.a.side).times(1.1);
    } else {
      minAmount = Helper.getConvertedAmount({
        side: triangle.a.side,
        exchangeRate: triangle.a.price,
        amount: priceScale.cost
      }).times(1.1);
    }

    if (triangle.a.side === 'sell' && free.isLessThanOrEqualTo(minAmount)) {
     // logger.debug(`держать${free + ' ' + triangle.a.coinFrom},Меньше минимального количества транзакций（${minAmount}）！！`);
      return;
    }
    // Найдите лучший объем сделки
    const tradeAmount = Helper.getBaseAmountByBC(triangle, free, minAmount);

    // ---------------------- Начиная с точки A------------------------
    const tradeEdgeA = this.getMockTradeEdge(exchange.pairs, triangle.a, tradeAmount);
    if (!tradeEdgeA) {
      return;
    }
    tradeTriangle.a = tradeEdgeA;
    tradeTriangle.before = tradeEdgeA.amount;

    // ---------------------- Начиная с точки B------------------------
    let aAmount = tradeEdgeA.amount;
    if (tradeEdgeA.side === 'sell') {
      tradeTriangle.before = tradeEdgeA.amount;
      aAmount = +Helper.getConvertedAmount({
        side: tradeEdgeA.side,
        exchangeRate: tradeEdgeA.price,
        amount: tradeEdgeA.amount
      }).toFixed(8);
    } else {
      tradeTriangle.before = +Helper.convertAmount(tradeEdgeA.price, tradeEdgeA.amount, tradeEdgeA.side).toFixed(8);
    }
    const bAmount = Helper.getConvertedAmount({
      side: triangle.b.side,
      exchangeRate: triangle.b.price,
      amount: +aAmount.toFixed(8)
    });
    const tradeEdgeB = this.getMockTradeEdge(exchange.pairs, triangle.b, bAmount);
    if (!tradeEdgeB) {
      return;
    }
    tradeTriangle.b = tradeEdgeB;

    // ---------------------- Начиная с точки C------------------------
    let cAmount = bAmount;
    if (triangle.c.side === 'buy') {
      cAmount = Helper.getConvertedAmount({
        side: triangle.c.side,
        exchangeRate: triangle.c.price,
        amount: tradeEdgeB.amount
      });
    }
    const tradeEdgeC = this.getMockTradeEdge(exchange.pairs, triangle.c, cAmount);
    if (!tradeEdgeC) {
      return;
    }
    tradeTriangle.c = tradeEdgeC;

    // const after = tradeTriangle.c.amount;
    const after = Helper.getConvertedAmount({
      side: tradeTriangle.c.side,
      exchangeRate: tradeTriangle.c.price,
      amount: tradeTriangle.c.amount
    })
    tradeTriangle.after = +after.toFixed(8);

    const profit = new BigNumber(after).minus(tradeTriangle.before);
    // прибыль
    tradeTriangle.profit = profit.toFixed(8);
    if (profit.isLessThanOrEqualTo(0)) {
      // logger.info(`Заказать результат выполнимости, прибыль(${clc.redBright(tradeTriangle.profit)})Для отрицательных чисел прекратите размещение заказов!`);
      return tradeTriangle;
    }
    tradeTriangle.id = triangle.id;
    // Процентная ставка
    tradeTriangle.rate =
      profit
        .div(tradeTriangle.before)
        .times(100)
        .toFixed(3) + '%';
    tradeTriangle.ts = Date.now();
    logger.info(clc.yellowBright('----- Имитированные результаты торгов -----'));
    logger.info(`Валюта арбитража：${tradeTriangle.coin}`);
    logger.info(`Арбитражные активы：${tradeTriangle.before}, Арбитражные активы：${tradeTriangle.after}`);
    logger.info(`прибыль：${clc.greenBright(tradeTriangle.profit)}, Процентная ставка：${clc.greenBright(tradeTriangle.rate)}`);
    return tradeTriangle;
  }
}
