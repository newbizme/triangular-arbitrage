import { BigNumber } from 'bignumber.js';
import { logger, Helper } from './common';
import { Event } from './event';
import { Engine } from './engine';
import { Aggregator } from './aggregator';
import * as types from './type';

const clc = require('cli-color');
const config = require('config');

export class TriangularArbitrage extends Event {
  exchanges: Map<string, types.IExchange> = new Map();
  activeExchangeId: types.ExchangeId;
  // Идентификатор робота
  worker = 0;
  // Соответствующий двигатель
  engine: Engine;
  // Совокупная поставка данных
  aggregator: Aggregator;

  constructor() {
    super();
    this.activeExchangeId = <types.ExchangeId>config.exchange.active;
    this.engine = new Engine();
    this.aggregator = new Aggregator();
  }

  async start(activeExchangeId?: types.ExchangeId) {
    const timer = Helper.getTimer();
    logger.debug('Запуск треугольного арбитражного робота [start]');
    if (activeExchangeId) {
      this.activeExchangeId = activeExchangeId;
    }

    try {
      // Инициализировать обмен
      await this.initExchange(this.activeExchangeId);
      if (types.ExchangeId.Binance === this.activeExchangeId) {
        const exchange = this.exchanges.get(this.activeExchangeId);
        if (!exchange) {
          return;
        }
        exchange.endpoint.ws.onAllTickers(this.estimate.bind(this));
      } else {
        this.worker = setInterval(this.estimate.bind(this), config.arbitrage.interval * 1000);
      }

      logger.info('----- Запуск робота завершен -----');
    } catch (err) {
      logger.error(`Ошибка запуска робота(${Helper.endTimer(timer)}): ${err}`);
    }
    logger.debug(`Запуск треугольного арбитражного робота [end] ${Helper.endTimer(timer)}`);
  }

  destroy() {
    if (this.worker) {
      clearInterval(this.worker);
    }
  }

  public async initExchange(exchangeId: types.ExchangeId) {
    const timer = Helper.getTimer();
    logger.debug('Инициализировать обмен [start]');
    try {
      // Посмотрите, была ли инициализирована api
      if (this.exchanges.get(exchangeId)) {
        return;
      }

      const exchange = Helper.getExchange(exchangeId);
      if (!exchange) {
        return;
      }
      const api = exchange.endpoint.public || exchange.endpoint.private;
      if (api) {
        exchange.pairs = await this.aggregator.getMarkets(exchange);
        if (!exchange.pairs) {
          return;
        }
        const markets: {
          [coin: string]: types.IMarket[];
        } = {};
        const baseCoins = Helper.getMarketCoins(Object.keys(exchange.pairs));
        for (const baseCoin of baseCoins) {
          if (!markets[baseCoin]) {
            markets[baseCoin] = [];
          }
          const pairKeys = Object.keys(exchange.pairs).filter((pair: string) => pair.includes(baseCoin));
          for (const key of pairKeys) {
            markets[baseCoin].push(exchange.pairs[key]);
          }
          exchange.markets = markets;
        }
      }
      this.exchanges.set(exchangeId, exchange);
      logger.debug(`Инициализировать обмен [end] ${Helper.endTimer(timer)}`);
    } catch (err) {
      logger.error(`Инициализировать обмен [ненормальный](${Helper.endTimer(timer)}): ${err}`);
    }
  }

  // 套利测算
  async estimate(tickers?: types.Binance24HrTicker[]) {
    const timer = Helper.getTimer();
    logger.debug('Мониторинг рынка [начало]');
    try {
      // logger.info(clc.magentaBright('----- Расчет арбитража -----'));
      const exchange = this.exchanges.get(this.activeExchangeId);
      if (!exchange) {
        return;
      }
      const allTickers = await this.aggregator.getAllTickers(exchange, tickers);
      if (!allTickers) {
        return;
      }
      // Соответствующий кандидат
      const candidates = await this.engine.getCandidates(exchange, allTickers);
      if (!candidates || candidates.length === 0) {
        return;
      }

      const ranks = Helper.getRanks(exchange.id, candidates);
      if (config.storage.tickRank && ranks.length > 0) {
        // Обновление данных арбитража
        this.emit('updateArbitage', ranks);
      }
      // Обновление данных арбитража
      if (ranks[0]) {
        // logger.info(`Выберите первое место в арбитражном объединении：${candidates[0].id}, Прогнозная процентная ставка (вычитание платы за обработку): ${ranks[0].profitRate[0]}`);
        // Выполнение треугольного арбитража
        this.emit('placeOrder', exchange, candidates[0]);
      }

      /*const output = candidates.length > 5 ? candidates.slice(0, 5) : candidates.slice(0, candidates.length);
      for (const candidate of output) {
        const clcRate = candidate.rate < 0 ? clc.redBright(candidate.rate) : clc.greenBright(candidate.rate);
        const path = candidate.id.length < 15 ? candidate.id + ' '.repeat(15 - candidate.id.length) : candidate.id;
        logger.info(`路径：${clc.cyanBright(path)} 利率: ${clcRate}`);
      }*/
      logger.debug(`Мониторинг рынка [окончательный] ${Helper.endTimer(timer)}`);
    } catch (err) {
      logger.error(`Мониторинг рынка [ненормальный](${Helper.endTimer(timer)}): ${JSON.stringify(err)}`);
    }
  }
}
