import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { ResendProvider } from './resend.provider';

describe('ResendProvider', () => {
  it('fails as a service-unavailable dependency when delivery is not configured', async () => {
    const configService = {
      get: jest.fn().mockReturnValue({ apiKey: undefined, from: undefined }),
    } as unknown as ConfigService;
    const provider = new ResendProvider(configService as never);

    await expect(
      provider.send({
        to: 'user@example.com',
        subject: 'Subject',
        html: '<p>Message</p>',
        text: 'Message',
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
