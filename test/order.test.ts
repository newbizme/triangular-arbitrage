import * as assert from 'power-assert';
const config = require('config');
const api = require('binance');
const exchangeAPI = new api.BinanceRest({
  key: config.binance.apiKey,
  secret: config.binance.secret,
  timeout: parseInt(config.restTimeout, 10), // Необязательно, значение по умолчанию - 15000, а таймаут запроса - миллисекунды.
  recvWindow: parseInt(config.restRecvWindow, 10), // Необязательно, по умолчанию 5000, если вы получаете ошибку временной метки, увеличиваете
  disableBeautification: !config.restBeautify,
});
const testOrder = async () => {
  const unit = 0.0001;
  const orderInfo = {
    symbol: 'BNBBTC',
    side: 'BUY',
    type: 'MARKET',
    // timeInForce: 'GTC',
    quantity: unit,
    timestamp: Date.now(),
  };
  /*const account = await exchangeAPI.account();
  if (account) {
    const btcAsset = (<Array<any>>account.balances).find((o: any, index: number, arr: any[]) => {
      return o.asset === 'BTC';
    })
    console.log(btcAsset)
  }*/
  const res = await exchangeAPI.testOrder(orderInfo);
  // assert(symbolInfo);
};
const exInfo = async () => {
  /*const account = await exchangeAPI.account();
  if (account) {
    const btcAsset = (<Array<any>>account.balances).find((o: any, index: number, arr: any[]) => {
      return o.asset === 'BTC';
    })
    console.log(btcAsset)
  }*/
  const res = await exchangeAPI.exchangeInfo();
  console.log(res);
  // assert(symbolInfo);
};

describe('Заказать тест', () => {
  // it('Сбросить тестовый лист', testOrder);
  it('Информация об обмене информацией', exInfo);
});
