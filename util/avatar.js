import { createReadStream } from 'fs';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import logger from '../util/logging.js';

const client = new S3Client({});
const pathPrefix = 'staff'

export async function uploadImage(filePath, extension, id) {
  const stream = createReadStream(filePath);

  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: `${pathPrefix}/${id}/avatar`,
    Body: stream,
    ContentType: `image/${extension}`
  });
  await client.send(command);
  logger.verbose(`Uploaded avatar to ${process.env.S3_BUCKET_NAME} S3 bucket for ${id}`);
}

export async function deleteImage(id) {
  
  const command = new DeleteObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: `${pathPrefix}/${id}/avatar`
  });
  await client.send(command);
  logger.verbose(`Deleted avatar successfully from ${process.env.S3_BUCKET_NAME} S3 bucket for ${id}`);
}
