import { Market as IMarket } from 'ccxt';

export { IMarket };

export interface ISupportExchange {
  id: string;
  name: string;
}

export interface IExchange {
  id: ExchangeId;
  endpoint: {
    public?: any;
    private?: any;
    ws?: any;
    rest?: any;
  };
  markets?: IMarkets;
  pairs?: IPairs;
}

export interface IMarkets {
  [baseCoin: string]: IMarket[];
}

export interface IPairs {
  [pair: string]: IMarket;
}

export enum ExchangeId {
  KuCoin = 'kucoin',
  Binance = 'binance',
  Bitbank = 'bitbank',
}

export const SupportExchanges = [
  {
    id: ExchangeId.KuCoin,
    name: 'Библиотека монет',
  },
  {
    id: ExchangeId.Binance,
    name: 'An монеты',
  },
  {
    id: ExchangeId.Bitbank,
    name: 'Bitbank',
  },
];

export interface ICredentials {
  apiKey: string;
  secret: string;
}
