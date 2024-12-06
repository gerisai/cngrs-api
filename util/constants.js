export const s3Bucket = process.env.S3_BUCKET_NAME;
export const sqsUrl = process.env.SQS_URL;
export const s3BucketUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com`;
export const s3UserKeyPrefix = 'staff';
export const s3PersonKeyPrefix = 'person';
