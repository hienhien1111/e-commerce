import { registerAs } from '@nestjs/config';
import { IsOptional, IsString } from 'class-validator';
import validateConfig from '@/utils/validate-config';
import { CloudinaryConfig } from './cloudinary-config.type';

class EnvironmentVariablesValidator {
  @IsString()
  @IsOptional()
  CLOUDINARY_CLOUD_NAME: string;

  @IsString()
  @IsOptional()
  CLOUDINARY_API_KEY: string;

  @IsString()
  @IsOptional()
  CLOUDINARY_API_SECRET: string;
}

export default registerAs<CloudinaryConfig>('cloudinary', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);
  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  };
});
