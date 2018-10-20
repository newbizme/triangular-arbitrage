import * as express from 'express';
import * as socketIO from 'socket.io';
import { logger } from './common';
import { Storage } from './storage';

const path = require('path');
const app = express();
const server = require('http').createServer(app);
const io = socketIO(server);
const port = process.env.PORT || 3000;

export class WebService {
  storage: Storage;
  // Связанный массив ws
  connected: any[] = [];

  constructor() {
    this.storage = new Storage();
  }

  start() {
    try {
      const that = this;
      io.on('connection', (socket: any) => {
        logger.info('Клиент подключен!');

        that.connected.push(socket);
        socket.on('disconnect', (client: any) => {
          // when client disconnects
          logger.info('Клиент отключен!');
          const index = that.connected.indexOf(client);
          that.connected.splice(index, 1); // remove client from the list of connected clients
        });
      });

      // express logic
      app.get('/', (req, res) => {
        res.sendFile(path.resolve(__dirname, '../../..') + '/public/index.html'); // serve index.html
      });
      app.use('/', express.static(path.resolve(__dirname, '../../..') + '/public')); // serve js and css static files in public

      server.listen(port, () => {
        logger.info('Услуга уже открыта!');
        logger.info('Пожалуйста, используйте браузер для открытия: http://127.0.0.1:' + port);
        that.storage.rank.onChanged(async (change: any) => {
          const docs = await that.storage.rank.getAllDocs();
          for (const ws of that.connected) {
            if (ws) {
              ws.emit('updateArbitage', docs);
            }
          }
        });
      });
    } catch (err) {
      logger.error(`Ошибка при запуске веб-службы: ${err}`);
    }
  }
}
