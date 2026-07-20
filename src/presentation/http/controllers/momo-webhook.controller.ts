import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '@/decorators/public.decorator';
import { SettleMomoWebhookCommand } from '@/application/payment/commands/settle-momo-webhook';
import { MomoWebhookDto } from '@/presentation/http/dtos/momo-webhook.dto';

@ApiTags('Webhooks')
@Public()
@SkipThrottle()
@Controller({ path: 'webhooks', version: '1' })
export class MomoWebhookController {
  constructor(private readonly commands: CommandBus) {}

  @Post('momo')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ schema: { example: { message: 'ok' } } })
  async momo(@Body() body: MomoWebhookDto): Promise<{ message: 'ok' }> {
    await this.commands.execute(new SettleMomoWebhookCommand(body));
    return { message: 'ok' };
  }
}
