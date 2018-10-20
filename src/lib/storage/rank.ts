import * as types from '../type';
import { logger } from '../common';
import { StorageBase } from './base';
const config = require('config');

export class Rank extends StorageBase {
  static id = 'rank';

  constructor(url: string) {
    super(url + Rank.id);
  }

  async putRanks(ranks: types.IRank[]) {
    try {
      logger.info('Сохраните данные ранжирования, размер：' + ranks.length);
      const docs = await this.allDocs({
        include_docs: true,
        attachments: true,
      });
      if (docs.rows.length > config.display.maxRows) {
        // Превышено максимальное число отображения, пустая база данных
        await this.removeAllDocs();
      }

      const removeList = [];
      for (const [i, row] of docs.rows.entries()) {
        if (ranks[i]) {
          ranks[i] = Object.assign({}, row.doc, ranks[i]);
        } else {
          removeList.push(row.doc);
        }
      }

      for (const doc of removeList) {
        if (doc) {
          await this.remove(doc);
        }
      }
      return await this.bulkDocs(ranks);
    } catch (err) {
      logger.error(`Ошибка хранения данных строки: ${err.message}`);
    }
  }
}
