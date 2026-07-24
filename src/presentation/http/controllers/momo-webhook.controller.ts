import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { SkipThrottle } from '@nestjs/throttler';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Public } from '@/decorators/public.decorator';
import { SettleMomoWebhookCommand } from '@/application/payment/commands/settle-momo-webhook';
import { MomoWebhookDto } from '@/presentation/http/dtos/momo-webhook.dto';
import { ErrorResponseDto } from '@/presentation/http/dtos/error-response.dto';

@ApiTags('Webhooks')
@Public()
@SkipThrottle()
@Controller({ path: 'webhooks', version: '1' })
export class MomoWebhookController {
  constructor(private readonly commands: CommandBus) {}

  @Post('momo')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receive signed MoMo IPN',
    description:
      'Returns 200 after durable settlement/refund work is recorded. Duplicate callbacks are idempotent.',
  })
  @ApiOkResponse({ schema: { example: { message: 'ok' } } })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  async momo(@Body() body: MomoWebhookDto): Promise<{ message: 'ok' }> {
    await this.commands.execute(new SettleMomoWebhookCommand(body));
    return { message: 'ok' };
  }
}
