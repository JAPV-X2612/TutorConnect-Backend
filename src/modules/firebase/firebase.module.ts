import { Global, Module } from '@nestjs/common';
import { FirebaseService } from './firebase.service';

/**
 * Global module that provides {@link FirebaseService} to all feature modules.
 *
 * Marked as global so it only needs to be imported once in {@link AppModule}.
 *
 * @author Camilo Quintero, Jesús Pinzón, Laura Rodríguez, Santiago Díaz, Sergio Bejarano
 * @version 1.0
 * @since 2026-05-03
 */
@Global()
@Module({
  providers: [FirebaseService],
  exports: [FirebaseService],
})
export class FirebaseModule {}
