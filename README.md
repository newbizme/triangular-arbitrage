# triangular-arbitrage
Цифровая валюта - треугольный арбитражный робот


## конфигурация
1、config/default.org.toml Изменить на config/default.toml

2、config/default.tomlИзменения конфигурации в файле，Например：ваши apikey

## запуск
Запуск автоматической процедуры арбитража

```js
// Необходимо запускать только при первом запуске программы
npm install
// Запустить автоматическую основную программу арбитража
npm start
```

## запуска консоли
<p align="center"><img src="assets/running-result.png"></p>


## web запуск

Нет необходимости запускать элемент. Только учащимся, которые хотят видеть страницу ранжирования, необходимо настроить следующее

-Загрузите и установите CouchDB база данных
https://couchdb.apache.org/#download

- default.toml конфигурация

найти storage В проекте`url = ""`Изменить на`url = "http://127.0.0.1:5984"`

- CMD Перейдите к пути к проекту и выполните следующую команду
```js
npm run ws
```

## Отображение страницы
открытый `127.0.0.1：3000` После этого дисплей выглядит следующим образом：
<p align="center"><img src="assets/webui.png"></p>

## Схема составления системы
<p align="center"><img src="assets/diagram.png"></p>

## Концептуальная карта
<p align="center"><img src="assets/ta-chart.png"></p>
<p align="center"><img src="assets/a-b-c.png"></p>

## Обмен торговой группой QQ
310298370

## поиск неисправностей

Q：toml Как изменить конфигурацию json Формат?

A：Можно положить toml Суффикс изменен на json,Затем пройдите [Этот адрес](https://toml-to-json.matiaskorhonen.fi/)，把 tomlКонфигурация формата, преобразованная в json Формат
