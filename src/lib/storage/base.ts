import * as PouchDB from 'pouchdb';
import { logger } from '../common';

export class StorageBase extends PouchDB {
  constructor(url: string) {
    super(url, <any>{
      prefix: './db/',
    });
  }

  /**
   * Хранение данных
   * @todo Магазин, подлежащий изменению
   * @param rows
   */
  async putRows(rows: { [attr: string]: any }[]) {
    try {
      const docs = await this.allDocs({
        include_docs: true,
        attachments: true,
      });
      for (const [i, row] of rows.entries()) {
        if (docs.rows[i]) {
          rows[i] = Object.assign({}, docs.rows[i].doc, row);
        }
      }
      return await this.bulkDocs(rows);
    } catch (err) {
      logger.error(`Ошибка хранения набора данных: ${err.message}`);
    }
  }

  async putRow(row: { [attr: string]: any }) {
    try {
      const docs = await this.allDocs({
        include_docs: true,
        attachments: true,
      });
      if (!docs) {
        return;
      }
      const dbRow = Object.assign({}, docs.rows.find((o) => o.id === row.id), row);
      return await this.put(dbRow);
    } catch (err) {
      logger.error(`Ошибка хранения данных: ${err.message}`);
    }
  }

  async getAllDocs() {
    try {
      const docsInfo = await this.allDocs({
        include_docs: true,
        attachments: true,
      });
      const docs: any[] = [];
      if (docsInfo && docsInfo.rows && docsInfo.rows.length > 0) {
        const rows: any[] = docsInfo.rows;
        rows.reduce(
          (pre, row) => {
            if (row && row.doc) {
              docs.push(row.doc);
            }
          },
          <any>{},
        );
      }
      return docs;
    } catch (err) {
      logger.error(`Ошибка при получении данных: ${err.message}`);
    }
  }

  async removeAllDocs() {
    try {
      const docsInfo = await this.allDocs({
        include_docs: true,
        attachments: true,
      });
      if (docsInfo && docsInfo.rows && docsInfo.rows.length > 0) {
        const docs: any[] = [];
        if (docsInfo && docsInfo.rows && docsInfo.rows.length > 0) {
          const rows: any[] = docsInfo.rows;
          rows.reduce(
            (pre, row) => {
              if (row && row.doc) {
                row.doc._deleted = true;
                docs.push(row.doc);
              }
            },
            <any>{},
          );
        }
        return await this.bulkDocs(docs);
      }
    } catch (err) {
      logger.error(`Ошибка удаления данных: ${err.message}`);
    }
  }

  onChanged(fn: (change: any) => {}) {
    this.changes({
      live: true,
      include_docs: true,
    }).on('change', fn);
  }
}
