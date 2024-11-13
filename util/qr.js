import { unlink } from 'fs';
import QRCode from 'qrcode';
import { uploadObjectFromFile, deleteObject } from './s3.js';
import logger from '../util/logging.js';
import { s3PersonKeyPrefix } from './constants.js';
import { promisify } from 'util';

const pathPrefix = process.env.UPLOAD_TEMP_FILE_DIR;
const unLink = promisify(unlink);

const qrOptions = {
  png: {
    scale: 25,
    margin: 0
  },
  svg: {
    margin: 4 // Better for fullscreen
  },
  jpeg: {
    scale: 25,
    margin: 0
  }
}

export async function createUploadQr(resource, id) {
  const extensions = ['jpeg', 'svg'];
  let filename, filePath;

  for (const ext of extensions) {
    try {
      filename = `${id}.${ext}`;
      filePath = `${pathPrefix}/${filename}`;
      await new Promise(function (resolve, reject) {
        QRCode.toFile(filePath, `${process.env.CORS_ORIGIN}/${resource}/${id}`, qrOptions[ext], function (err) {
          if (err) reject(err);
          resolve('QR created');
        });
      });

      logger.debug(`Created ${ext.toUpperCase()} image for ${filename} locally`);

      await uploadObjectFromFile(filePath, ext, `${s3PersonKeyPrefix}/${id}/${filename}`);

    } catch(err) {
      throw new Error(err);
    } finally {
      await unLink(filePath);
      logger.debug(`Removed local ${filename} successfully`);
    }
  }

}

export async function deleteQr(id) {
  const extensions = ['jpeg', 'svg'];
  let filename;

  try {
    for (const ext of extensions) {
      filename = `${id}.${ext}`
      
      await deleteObject(`${s3PersonKeyPrefix}/${id}/${filename}`);
    }
  } catch(err) {
    throw new Error(err);
  }
}
