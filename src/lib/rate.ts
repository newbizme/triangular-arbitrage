import * as types from './type';
import { BigNumber } from 'bignumber.js';

export class Rate {
  /**
   * Преобразование объектов обменного курса (возвращаемое количество покупаемых товаров)
   *
   * @param rateQuote Объект преобразования
   */
  static convert(rateQuote: types.IRateQuote): BigNumber {
    const bigAmount = new BigNumber(rateQuote.amount);
    if (rateQuote.side === 'buy') {
      return bigAmount.div(rateQuote.exchangeRate);
    }
    return bigAmount.times(rateQuote.exchangeRate);
  }

  /**
   * Преобразование количества, которое будет использоваться
   *
   * @param price цена
   * @param cost Количество * цена = общая стоимость
   */
  static convertAmount(price: number, cost: number, side: 'sell' | 'buy') {
    const bigCost = new BigNumber(cost);
    if (side === 'buy') {
      // amount / price = cost
      return bigCost.times(price);
    }
    // amount * price = cost
    return bigCost.div(price);
  }
}
