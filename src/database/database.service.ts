import { Injectable, OnModuleInit } from '@nestjs/common';

@Injectable()
export class DatabaseService implements OnModuleInit {
  async onModuleInit() {
    console.log('DatabaseModule initialized (placeholder)');
  }
}

