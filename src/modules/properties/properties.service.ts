import { Injectable } from '@nestjs/common';

@Injectable()
export class PropertiesService {
  findAll() {
    return { message: 'Properties endpoint - Coming soon' };
  }
}