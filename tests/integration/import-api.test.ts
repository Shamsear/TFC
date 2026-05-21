/**
 * Integration tests for /api/import endpoint
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '@/app/api/import/route';
import { NextRequest } from 'next/server';
import * as authModule from '@/lib/auth';
import * as importService from '@/lib/import-service';
import type { Session } from 'next-auth';

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn()
}));

// Mock import service
vi.mock('@/lib/import-service', () => ({
  importSeasonData: vi.fn()
}));

describe('POST /api/import', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reject unauthenticated requests', async () => {
    vi.mocked(authModule.auth as any).mockResolvedValue(null);

    const formData = new FormData();
    formData.append('file', new File(['test'], 'test.db'));
    formData.append('seasonId', 'season-123');

    const request = new NextRequest('http://localhost:3000/api/import', {
      method: 'POST',
      body: formData
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toContain('Unauthorized');
  });

  it('should reject non-Super Admin users', async () => {
    vi.mocked(authModule.auth as any).mockResolvedValue({
      user: {
        id: 'user-123',
        email: 'subadmin@test.com',
        role: 'SUB_ADMIN'
      },
      expires: new Date(Date.now() + 86400000).toISOString()
    } as Session);

    const formData = new FormData();
    formData.append('file', new File(['test'], 'test.db'));
    formData.append('seasonId', 'season-123');

    const request = new NextRequest('http://localhost:3000/api/import', {
      method: 'POST',
      body: formData
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain('Forbidden');
  });

  it('should reject requests without file', async () => {
    vi.mocked(authModule.auth as any).mockResolvedValue({
      user: {
        id: 'user-123',
        email: 'admin@test.com',
        role: 'SUPER_ADMIN'
      },
      expires: new Date(Date.now() + 86400000).toISOString()
    } as Session);

    const formData = new FormData();
    formData.append('seasonId', 'season-123');

    const request = new NextRequest('http://localhost:3000/api/import', {
      method: 'POST',
      body: formData
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Missing required field: file');
  });

  it('should reject requests without seasonId', async () => {
    vi.mocked(authModule.auth as any).mockResolvedValue({
      user: {
        id: 'user-123',
        email: 'admin@test.com',
        role: 'SUPER_ADMIN'
      },
      expires: new Date(Date.now() + 86400000).toISOString()
    } as Session);

    const formData = new FormData();
    formData.append('file', new File(['test'], 'test.db'));

    const request = new NextRequest('http://localhost:3000/api/import', {
      method: 'POST',
      body: formData
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Missing required field: seasonId');
  });

  it('should reject non-.db files', async () => {
    vi.mocked(authModule.auth as any).mockResolvedValue({
      user: {
        id: 'user-123',
        email: 'admin@test.com',
        role: 'SUPER_ADMIN'
      },
      expires: new Date(Date.now() + 86400000).toISOString()
    } as Session);

    const formData = new FormData();
    formData.append('file', new File(['test'], 'test.txt'));
    formData.append('seasonId', 'season-123');

    const request = new NextRequest('http://localhost:3000/api/import', {
      method: 'POST',
      body: formData
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid file type');
  });

  it('should reject empty files', async () => {
    vi.mocked(authModule.auth as any).mockResolvedValue({
      user: {
        id: 'user-123',
        email: 'admin@test.com',
        role: 'SUPER_ADMIN'
      },
      expires: new Date(Date.now() + 86400000).toISOString()
    } as Session);

    const formData = new FormData();
    formData.append('file', new File([''], 'test.db'));
    formData.append('seasonId', 'season-123');

    const request = new NextRequest('http://localhost:3000/api/import', {
      method: 'POST',
      body: formData
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('File is empty');
  });

  it('should successfully import valid .db file', async () => {
    vi.mocked(authModule.auth as any).mockResolvedValue({
      user: {
        id: 'user-123',
        email: 'admin@test.com',
        role: 'SUPER_ADMIN'
      },
      expires: new Date(Date.now() + 86400000).toISOString()
    } as Session);

    vi.mocked(importService.importSeasonData).mockResolvedValue({
      newPlayers: 5,
      updatedStats: 10,
      unchangedPlayers: 3,
      errors: []
    });

    const fileContent = '1|Player One|ST|Manchester United|89|http://example.com/photo1.jpg';
    const formData = new FormData();
    formData.append('file', new File([fileContent], 'players.db'));
    formData.append('seasonId', 'season-123');

    const request = new NextRequest('http://localhost:3000/api/import', {
      method: 'POST',
      body: formData
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe('Import completed');
    expect(data.summary).toEqual({
      newPlayers: 5,
      updatedStats: 10,
      unchangedPlayers: 3,
      errors: []
    });
    expect(importService.importSeasonData).toHaveBeenCalledWith(fileContent, 'season-123');
  });

  it('should return partial success with errors', async () => {
    vi.mocked(authModule.auth as any).mockResolvedValue({
      user: {
        id: 'user-123',
        email: 'admin@test.com',
        role: 'SUPER_ADMIN'
      },
      expires: new Date(Date.now() + 86400000).toISOString()
    } as Session);

    vi.mocked(importService.importSeasonData).mockResolvedValue({
      newPlayers: 3,
      updatedStats: 5,
      unchangedPlayers: 2,
      errors: ['Failed to import player X: Database error']
    });

    const fileContent = '1|Player One|ST|Manchester United|89|http://example.com/photo1.jpg';
    const formData = new FormData();
    formData.append('file', new File([fileContent], 'players.db'));
    formData.append('seasonId', 'season-123');

    const request = new NextRequest('http://localhost:3000/api/import', {
      method: 'POST',
      body: formData
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.summary.errors).toHaveLength(1);
    expect(data.summary.newPlayers).toBe(3);
  });

  it('should return error when import completely fails', async () => {
    vi.mocked(authModule.auth as any).mockResolvedValue({
      user: {
        id: 'user-123',
        email: 'admin@test.com',
        role: 'SUPER_ADMIN'
      },
      expires: new Date(Date.now() + 86400000).toISOString()
    } as Session);

    vi.mocked(importService.importSeasonData).mockResolvedValue({
      newPlayers: 0,
      updatedStats: 0,
      unchangedPlayers: 0,
      errors: ['Season with ID season-123 not found']
    });

    const fileContent = '1|Player One|ST|Manchester United|89|http://example.com/photo1.jpg';
    const formData = new FormData();
    formData.append('file', new File([fileContent], 'players.db'));
    formData.append('seasonId', 'season-123');

    const request = new NextRequest('http://localhost:3000/api/import', {
      method: 'POST',
      body: formData
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Import failed');
    expect(data.summary.errors).toHaveLength(1);
  });
});
