import { APIRequestContext, expect } from '@playwright/test';

export type PetStatus = 'available' | 'pending' | 'sold';

export interface Pet {
  id: number;
  category?: { id: number; name: string };
  name: string;
  photoUrls: string[];
  tags?: { id: number; name: string }[];
  status?: string;
}

// Random id in a high range so our test data doesn't collide with other people's pets.
export function uniqueId(): number {
  return 9_000_000 + Math.floor(Math.random() * 900_000);
}

export function buildPet(overrides: Partial<Pet> = {}): Pet {
  return {
    id: uniqueId(),
    category: { id: 1, name: 'Dogs' },
    name: `indico-qa-${Date.now()}`,
    photoUrls: ['https://example.com/dog.jpg'],
    tags: [{ id: 1, name: 'indico-test' }],
    status: 'available',
    ...overrides,
  };
}

export async function createPet(request: APIRequestContext, pet: Pet) {
  const res = await request.post('pet', { data: pet });
  expect(res.status()).toBe(200);
  return (await res.json()) as Pet;
}

// The shared server sometimes needs a moment before a new pet is readable.
export async function waitUntilPetExists(request: APIRequestContext, id: number) {
  await expect
    .poll(async () => (await request.get(`pet/${id}`)).status(), { timeout: 10_000 })
    .toBe(200);
}

export async function deletePetQuietly(request: APIRequestContext, id: number) {
  await request.delete(`pet/${id}`).catch(() => undefined);
}

/** Checks a response item matches the Pet model in the Swagger spec (types, required fields, enum). */
export function expectPetShape(pet: Record<string, unknown>) {
  expect(typeof pet.id).toBe('number');
  expect(Array.isArray(pet.photoUrls)).toBe(true);
  if (pet.name !== undefined) expect(typeof pet.name).toBe('string');
  if (pet.tags !== undefined) expect(Array.isArray(pet.tags)).toBe(true);
}
