import { Controller, Get, Res } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { join } from 'path';

@ApiTags('app')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({
    summary: 'Live updates dashboard',
    description:
      'Serves the HTML dashboard that displays real-time product and price updates via Server-Sent Events (SSE). Open in a browser to view the live stream from GET /products/stream.',
  })
  @ApiOkResponse({
    description: 'HTML page for the SSE visualization dashboard.',
  })
  index(@Res() res: Response): void {
    res.sendFile(join(process.cwd(), 'public', 'index.html'));
  }
}
