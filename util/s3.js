import { createReadStream } from 'fs';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import logger from './logging.js';

const client = new S3Client({});
const bucket = process.env.S3_BUCKET_NAME;

export async function uploadObjectFromFile(filePath, mimeType, key) {
  const stream = createReadStream(filePath);

  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    Body: stream,
    ContentType: mimeType
  });
  await client.send(command);
  logger.verbose(`Uploaded object to ${bucket} S3 bucket: ${key}`);
}

export async function deleteObject(key) {
  
  const command = new DeleteObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key
  });
  await client.send(command);
  logger.verbose(`Deleted object successfully from ${bucket} S3 bucket: ${key}`);
}
