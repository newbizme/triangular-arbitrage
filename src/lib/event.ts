import { EventEmitter } from 'events';
import { Trading } from './trading';
import * as types from './type';
import { logger, Helper } from './common';

/**
 * Общий обработчик событий
 */
export class Event extends EventEmitter {
  trading: Trading;

  constructor() {
    super();
    this.trading = new Trading();
    this.on('placeOrder', this.onPlaceOrder);
    this.on('updateArbitage', this.onUpdateArbitage);
  }

  async onPlaceOrder(exchange: types.IExchange, triangle: types.ITriangle) {
    const timer = Helper.getTimer();
    logger.debug('Событие заказа выполнения [начало]');
    await this.trading.placeOrder(exchange, triangle);
  }

  async onUpdateArbitage(ranks: types.IRank[]) {
    if (ranks.length > 0) {
      await this.trading.storage.rank.putRanks(ranks);
    }
  }
}
