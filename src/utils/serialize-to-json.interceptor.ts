import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class SerializeToJSONInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((data) => this.serialize(data)));
  }

  private serialize(data: unknown): unknown {
    if (data === null || data === undefined) {
      return data;
    }

    if (
      typeof data === 'object' &&
      'toJSON' in data &&
      typeof data.toJSON === 'function'
    ) {
      return data.toJSON();
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.serialize(item));
    }

    if (typeof data === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data)) {
        result[key] = this.serialize(value);
      }
      return result;
    }

    return data;
  }
}
