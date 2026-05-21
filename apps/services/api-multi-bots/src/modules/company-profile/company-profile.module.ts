import { Module } from '@nestjs/common';
import { MongoClient } from 'mongodb';
import { CompanyRepository, UserRepository, S3StorageService } from '@multibotagents/db';
import { CompanyProfileController } from './company-profile.controller';
import { CompanyProfileNestService } from './company-profile-nest.service';

@Module({
  controllers: [CompanyProfileController],
  providers: [
    {
      provide: 'MONGO_CLIENT',
      useFactory: () => {
        const uri = process.env.MONGODB_URI;
        if (!uri) throw new Error('MONGODB_URI is required');
        return new MongoClient(uri);
      },
    },
    {
      provide: 'COMPANY_REPO',
      useFactory: (client: MongoClient) => new CompanyRepository(client.db()),
      inject: ['MONGO_CLIENT'],
    },
    {
      provide: 'USER_REPO',
      useFactory: (client: MongoClient) => new UserRepository(client.db()),
      inject: ['MONGO_CLIENT'],
    },
    {
      provide: 'STORAGE_SERVICE',
      useFactory: () => {
        const bucket = process.env.COMPANY_LOGOS_BUCKET;
        const region = process.env.COMPANY_LOGOS_REGION || 'us-east-1';
        if (!bucket) throw new Error('COMPANY_LOGOS_BUCKET is required');
        return new S3StorageService({ bucket, region });
      },
    },
    CompanyProfileNestService,
  ],
})
export class CompanyProfileModule {}
