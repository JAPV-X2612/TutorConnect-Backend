import { Injectable } from '@nestjs/common';

// TODO: Validate use
@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }
}
