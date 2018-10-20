import { ITriangle } from './trading';

export interface IRank {
  stepA: string;
  stepB: string;
  stepC: string;
  rate: number;
  fee: number[];
  profitRate: number[];
  ts: number;
}

/**
 * Запись транзакции со стороны треугольной комбинации
 */
export interface ITradeEdge {
  pair: string;
  side: 'buy' | 'sell';
  // Цена сделки
  price: number;
  // Количество заказов
  amount: number;
  // Плата за обработку (недисконтированная)
  fee: string;
  orderId: string;
  status: 'open' | 'closed' | 'canceled';
  // При использовании
  timecost: string;
}

export interface ITradeTriangle {
  // Треугольная комбинация уникальный id (пример:btc-bnb-bcd）
  id: string;
  // очередь id
  queueId: string;
  a: ITradeEdge;
  b: ITradeEdge;
  c: ITradeEdge;
  // Валюта арбитража
  coin: string;
  exchange: string;
  // Начальный капитал покупки
  before: number;
  // Получать средства после арбитража
  after: number;
  profit: string;
  rate: string;
  ts: number;
}

export type tradeStep = 0 | 1 | 2;

export interface ITrade {
  _id?: string;
  real?: ITradeTriangle;
  mock: ITradeTriangle;
}

export interface IQueue {
  _id?: string;
  _rev?: string;
  triangleId: string;
  exchange: string;
  step: tradeStep;
  error?: string;
  ts?: number;
}
