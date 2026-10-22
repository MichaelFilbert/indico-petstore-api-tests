import { test, expect } from '@playwright/test';
import { buildPet, createPet, deletePetQuietly, expectPetShape, waitUntilPetExists, PetStatus } from '../helpers/pet';

test.describe('GET /pet/findByStatus - Find pets by status', () => {
  for (const status of ['available', 'pending', 'sold'] as PetStatus[]) {
    test(`TC-GET-01 status=${status} returns 200 and only pets with that status`, async ({ request }) => {
      const res = await request.get('pet/findByStatus', { params: { status } });
      expect(res.status()).toBe(200);

      const pets = await res.json();
      expect(Array.isArray(pets)).toBe(true);
      for (const pet of pets) expect(pet.status).toBe(status);
    });
  }

  test('TC-GET-02 a newly created sold pet appears in the sold results', async ({ request }) => {
    const pet = await createPet(request, buildPet({ status: 'sold' }));
    try {
      await waitUntilPetExists(request, pet.id);
      await expect
        .poll(async () => {
          const pets = await (await request.get('pet/findByStatus', { params: { status: 'sold' } })).json();
          return pets.some((p: { id: number }) => p.id === pet.id);
        }, { timeout: 15_000 })
        .toBe(true);
    } finally {
      await deletePetQuietly(request, pet.id);
    }
  });

  test('TC-GET-03 response items follow the Pet schema (id, name, photoUrls)', async ({ request }) => {
    const pets = await (await request.get('pet/findByStatus', { params: { status: 'pending' } })).json();
    expect(pets.length).toBeGreaterThan(0);
    for (const pet of pets) expectPetShape(pet);
  });

  test('TC-GET-04 [BUG-04] invalid status value should return 400', async ({ request }) => {
    test.fail(true, 'BUG-04: API returns 200 with an empty list');
    const res = await request.get('pet/findByStatus', { params: { status: 'invalidstatus' } });
    expect(res.status()).toBe(400);
  });

  test('TC-GET-05 [BUG-05] missing required status parameter should return 400', async ({ request }) => {
    test.fail(true, 'BUG-05: API returns 200 with an empty list');
    const res = await request.get('pet/findByStatus');
    expect(res.status()).toBe(400);
  });

  test('TC-GET-06 [BUG-06] repeated status params (collectionFormat: multi) should return both statuses', async ({ request }) => {
    test.fail(true, 'BUG-06: only the first status value is used');
    const res = await request.get('pet/findByStatus?status=sold&status=pending');
    const statuses = new Set((await res.json()).map((p: { status: string }) => p.status));
    expect(statuses).toEqual(new Set(['sold', 'pending']));
  });
});
