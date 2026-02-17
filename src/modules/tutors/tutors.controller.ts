import { Controller } from '@nestjs/common';
import { TutorsService } from './tutors.service';

@Controller('tutors')
export class TutorsController {
  constructor(private readonly tutorsService: TutorsService) {}

  // TODO: Implementar endpoints de perfiles académicos
}




