import { test, expect } from '@playwright/test';
import { buildPet, deletePetQuietly, waitUntilPetExists } from '../helpers/pet';

test.describe('POST /pet - Add a new pet', () => {
  const created: number[] = [];
  test.afterEach(async ({ request }) => {
    for (const id of created.splice(0)) await deletePetQuietly(request, id);
  });

  test('TC-POST-01 create a pet with all fields returns 200 and echoes the body', async ({ request }) => {
    const pet = buildPet();
    const res = await request.post('pet', { data: pet });
    created.push(pet.id);

    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('application/json');
    expect(await res.json()).toEqual(pet);
  });

  test('TC-POST-02 created pet can be read back with GET /pet/{petId}', async ({ request }) => {
    const pet = buildPet({ status: 'pending' });
    await request.post('pet', { data: pet });
    created.push(pet.id);

    await waitUntilPetExists(request, pet.id);
    const body = await (await request.get(`pet/${pet.id}`)).json();
    expect(body).toMatchObject({ id: pet.id, name: pet.name, status: 'pending' });
  });

  test('TC-POST-03 create a pet with only the required fields (name, photoUrls)', async ({ request }) => {
    const res = await request.post('pet', { data: { name: 'minimal-pet', photoUrls: [] } });
    const body = await res.json();
    created.push(body.id);

    expect(res.status()).toBe(200);
    expect(body.name).toBe('minimal-pet');
    expect(typeof body.id).toBe('number'); // server generates an id
  });

  test('TC-POST-04 malformed JSON body is rejected', async ({ request }) => {
    const res = await request.post('pet', {
      headers: { 'Content-Type': 'application/json' },
      data: Buffer.from('{not valid json'),
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('TC-POST-05 [BUG-01] missing required fields name and photoUrls should be rejected with 405', async ({ request }) => {
    test.fail(true, 'BUG-01: API returns 200 and creates the pet');
    const res = await request.post('pet', { data: { status: 'available' } });
    const body = await res.json().catch(() => ({}));
    if (body.id) created.push(body.id);
    expect(res.status()).toBe(405);
  });

  test('TC-POST-06 [BUG-02] status outside the enum should be rejected with 405', async ({ request }) => {
    test.fail(true, 'BUG-02: API accepts status "flying"');
    const pet = buildPet({ status: 'flying' });
    const res = await request.post('pet', { data: pet });
    created.push(pet.id);
    expect(res.status()).toBe(405);
  });

  test('TC-POST-07 [BUG-03] wrong data type for id should be a 4xx client error, not 500', async ({ request }) => {
    test.fail(true, 'BUG-03: API returns 500 "something bad happened"');
    const res = await request.post('pet', { data: { id: 'abc', name: 'x', photoUrls: [] } });
    expect(res.status()).toBe(405);
  });
});
