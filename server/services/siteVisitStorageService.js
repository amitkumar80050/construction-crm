const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const Minio = require('minio');
require('../config/env');

const hasMinioConfig = process.env.MINIO_ENDPOINT && process.env.MINIO_ACCESS_KEY && process.env.MINIO_SECRET_KEY;
const minioClient = hasMinioConfig ? new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT,
  port: Number(process.env.MINIO_PORT || 9000),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY,
}) : null;
const bucket = process.env.MINIO_BUCKET || 'construction-crm';

const storeSiteVisitPhoto = async (file) => {
  const extension = path.extname(file.originalname) || '.jpg';
  const objectName = `site-visits/${Date.now()}-${crypto.randomUUID()}${extension}`;
  if (minioClient) {
    const exists = await minioClient.bucketExists(bucket).catch(() => false);
    if (!exists) await minioClient.makeBucket(bucket);
    await minioClient.putObject(bucket, objectName, file.buffer, file.size, { 'Content-Type': file.mimetype });
    const publicBase = process.env.MINIO_PUBLIC_URL || `http://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT || 9000}`;
    return `${publicBase}/${bucket}/${objectName}`;
  }
  const directory = path.join(__dirname, '..', 'uploads', 'site-visits');
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, objectName.replace('/', path.sep)), file.buffer);
  return `/uploads/${objectName}`;
};

module.exports = { storeSiteVisitPhoto };