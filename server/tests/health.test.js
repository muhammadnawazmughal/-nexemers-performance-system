import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

describe('Phase 1 API foundation', () => {
  it('returns the health status', async () => {
    const response = await request(createApp()).get('/api/v1/health');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      service: 'Nexemers Performance API',
      status: 'ok',
    });
  });

  it('returns a standard 404 response for unknown routes', async () => {
    const response = await request(createApp()).get('/api/v1/unknown');
    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      message: 'Route not found',
    });
  });
});
