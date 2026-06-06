import { v2 as cloudinary } from 'cloudinary';
import { env } from './env.js';

export const initCloudinary = () => {
  try {
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
    });
    console.log('✅ Cloudinary Configured');
  } catch (error) {
    console.error('❌ Cloudinary Configuration Failed:', error);
  }
};