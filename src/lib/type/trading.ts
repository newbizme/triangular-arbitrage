import { Ticker } from 'ccxt';

export interface ITicker extends Ticker {
  askVolume: number;
  bidVolume: number;
}

export interface ITickers {
  [pair: string]: ITicker;
}

/**
 * Край треугольной комбинации
 */
export interface IEdge {
  pair: string;
  coinFrom: string;
  coinTo: string;
  // Торговое направление
  side: 'sell' | 'buy';
  // Лучшая цена
  price: number;
  // Оптимальное количество
  quantity: number;
}

/**
 * Треугольная комбинация
 */
export interface ITriangle {
  // Только треугольная комбинация一id（пример:btc-bnb-bcd）
  id: string;
  a: IEdge;
  b: IEdge;
  c: IEdge;
  // Процентная ставка
  rate: number;
  // Отметка
  ts: number;
}

export interface IPrecision {
  // Точность количества
  amount: number;
  // Ценовая точность
  price: number;
  // Минимальная сумма транзакции
  cost?: number;
}

/**
 * Исключить цитируемый объект
 */
export interface IRateQuote {
  side: 'sell' | 'buy';
  // Обменный курс
  exchangeRate: number;
  // количество
  amount: number;
}
