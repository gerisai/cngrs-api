import { createReadStream } from 'fs';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import logger from './logging.js';
import { s3Bucket } from './constants.js';

const client = new S3Client({});

export async function uploadObjectFromFile(filePath, mimeType, key) {
  const stream = createReadStream(filePath);

  const command = new PutObjectCommand({
    Bucket: s3Bucket,
    Key: key,
    Body: stream,
    ContentType: mimeType
  });
  await client.send(command);
  logger.verbose(`Uploaded object to ${s3Bucket} S3 bucket: ${key}`);
}

export async function deleteObject(key) {
  
  const command = new DeleteObjectCommand({
    Bucket: s3Bucket,
    Key: key
  });
  await client.send(command);
  logger.verbose(`Deleted object successfully from ${bucket} S3 bucket: ${key}`);
}
