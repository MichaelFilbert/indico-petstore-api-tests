import { test, expect } from '@playwright/test';
import { buildPet, createPet, waitUntilPetExists } from '../helpers/pet';

test.describe('DELETE /pet/{petId} - Delete a pet', () => {
  test('TC-DEL-01 delete an existing pet returns 200 and the pet is gone', async ({ request }) => {
    const pet = await createPet(request, buildPet());
    await waitUntilPetExists(request, pet.id);

    const res = await request.delete(`pet/${pet.id}`);
    expect(res.status()).toBe(200);
    expect((await res.json()).message).toBe(String(pet.id));

    await expect.poll(async () => (await request.get(`pet/${pet.id}`)).status(), { timeout: 10_000 }).toBe(404);
  });

  test('TC-DEL-02 delete the same pet twice returns 404 the second time', async ({ request }) => {
    const pet = await createPet(request, buildPet());
    await waitUntilPetExists(request, pet.id);
    await request.delete(`pet/${pet.id}`);

    await expect.poll(async () => (await request.delete(`pet/${pet.id}`)).status(), { timeout: 10_000 }).toBe(404);
  });

  for (const id of ['8999999999', '0', '-1']) {
    test(`TC-DEL-03 delete a pet id that doesn't exist (${id}) returns 404`, async ({ request }) => {
      const res = await request.delete(`pet/${id}`);
      expect(res.status()).toBe(404);
    });
  }

  test('TC-DEL-04 delete with api_key header (documented optional header) still works', async ({ request }) => {
    const pet = await createPet(request, buildPet());
    await waitUntilPetExists(request, pet.id);
    const res = await request.delete(`pet/${pet.id}`, { headers: { api_key: 'special-key' } });
    expect(res.status()).toBe(200);
  });

  test('TC-DEL-05 [BUG-07] non-numeric id should return 400 "Invalid ID supplied"', async ({ request }) => {
    test.fail(true, 'BUG-07: API returns 404 and leaks java.lang.NumberFormatException');
    const res = await request.delete('pet/abc');
    expect(res.status()).toBe(400);
  });

  test('TC-DEL-06 [BUG-07] id larger than int64 should return 400 "Invalid ID supplied"', async ({ request }) => {
    test.fail(true, 'BUG-07: API returns 404 and leaks java.lang.NumberFormatException');
    const res = await request.delete('pet/99999999999999999999');
    expect(res.status()).toBe(400);
    expect(await res.text()).not.toContain('Exception');
  });
});
