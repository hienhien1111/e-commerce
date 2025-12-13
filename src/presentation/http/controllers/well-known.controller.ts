import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';

@ApiTags('Well-Known')
@Controller('.well-known')
export class WellKnownController {
  @Get('assetlinks.json')
  @Header('Content-Type', 'application/json')
  @ApiOperation({ summary: 'Android Asset Links for WebAuthn' })
  @ApiOkResponse({ description: 'Asset links configuration' })
  getAssetLinks() {
    // TODO: Configure with actual app package name and SHA256 fingerprint
    return [
      {
        relation: [
          'delegate_permission/common.handle_all_urls',
          'delegate_permission/common.get_login_creds',
        ],
        target: {
          namespace: 'android_app',
          package_name: 'com.teko.app', // Replace with actual package
          sha256_cert_fingerprints: [
            'AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99', // Replace with actual fingerprint
          ],
        },
      },
    ];
  }

  @Get('apple-app-site-association')
  @Header('Content-Type', 'application/json')
  @ApiOperation({ summary: 'iOS Associated Domains for WebAuthn' })
  @ApiOkResponse({ description: 'Apple app site association' })
  getAppleAppSiteAssociation() {
    // TODO: Configure with actual Team ID and Bundle ID
    return {
      webcredentials: {
        apps: [
          'TEAM_ID.com.teko.app', // Replace with actual Team ID and Bundle ID
        ],
      },
    };
  }
}
