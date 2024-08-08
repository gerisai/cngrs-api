import { createReadStream, unlink } from 'fs';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import QRCode from 'qrcode';
import logger from '../util/logging.js';
import { promisify } from 'util';

const unLink = promisify(unlink);
const qrOptions = {
  png: {
    width: 300, // Force a width for better resolution
    margin: 0
  },
  svg: {
    margin: 4 // Better for fullscreen
  }
}
const client = new S3Client({});

export async function createUploadQr(resource, id) {
  const files = ['png', 'svg'];
  let filename, stream, command;

  for (const file of files) {
    filename = `${id}.${file}`
    await QRCode.toFile(filename, `${process.env.API_URL}/${resource}/${id}`, qrOptions[file]);
    logger.debug(`Created ${file.toUpperCase()} image for ${filename} locally`);
    
    stream = createReadStream(filename);

    command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: `${id}/${filename}`,
      Body: stream,
      ContentType: `image/${ file === 'png' ? 'png' : 'svg+xml'}`
    });
    await client.send(command);
    logger.verbose(`Uploaded ${filename} to ${process.env.S3_BUCKET_NAME} S3 bucket`);

    await unLink(filename);
    logger.debug(`Removed local ${filename} successfully`);
  }

}

export async function deleteQr(id) {
  const files = ['png', 'svg'];
  let filename, command;

  for (const file of files) {
    filename = `${id}.${file}`
    
    command = new DeleteObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: `${id}/${filename}`
    });
    await client.send(command);
    logger.verbose(`Deleted ${filename} successfully from ${process.env.S3_BUCKET_NAME} S3 bucket`);
  }
}
