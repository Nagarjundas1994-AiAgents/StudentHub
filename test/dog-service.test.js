import cds from '@sap/cds';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// no key: run against the local mirror only (no network calls in tests)
process.env.DOG_API_KEY = '';

const { GET, POST } = cds.test(import.meta.dirname + '/..', '--in-memory');

const admin = { auth: { username: 'Nagarjun', password: 'nagarjun' } };
const manager = { auth: { username: 'sukriti', password: 'sukriti' } };
const base = '/dog-service';
const status = (p) => p.then(r => r.status, e => e.status ?? e.response?.status);

const dog = (name) => ({
  name,
  breedID: '15',
  breedName: 'Golden Retriever',
  gender: 'male',
  neuterStatus: 'neutered',
  country: 'US',
  bodyConditionScore: 5
});

const PNG_1PX = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

describe('DogService', () => {

  it('rejects anonymous access', async () => {
    assert.equal(await status(GET(`${base}/Dogs`)), 401);
  });

  it('reads the local mirror', async () => {
    const { data } = await GET(`${base}/Dogs`, admin);
    assert.ok(Array.isArray(data.value));
  });

  it('validates and creates a dog', async () => {
    assert.equal(await status(POST(`${base}/createDog`, {}, admin)), 400);
    assert.equal(await status(POST(`${base}/createDog`, { name: 'Rex', gender: 'zzz' }, admin)), 400);
    assert.equal(await status(POST(`${base}/createDog`, { name: 'Rex', bodyConditionScore: 12 }, admin)), 400);
    assert.equal(await status(POST(`${base}/createDog`, { name: 'Rex', imageType: 'text/plain', imageData: PNG_1PX }, admin)), 400);

    const { data } = await POST(`${base}/createDog`, dog('Rex'), admin);
    assert.equal(data.name, 'Rex');
    assert.equal(data.gender, 'male');
    assert.equal(data.breedName, 'Golden Retriever');
    assert.ok(data.ID);
  });

  it('stores an uploaded image in the local mirror', async () => {
    const { data } = await POST(`${base}/createDog`, {
      name: 'Photo',
      imageType: 'image/png',
      imageData: PNG_1PX
    }, admin);

    assert.ok(data.imageURL.startsWith('data:image/png;base64,'));
  });

  it('lets only admin delete dogs', async () => {
    const { data } = await POST(`${base}/createDog`, dog('Milo'), manager);
    const del = (who) => POST(`${base}/Dogs('${data.ID}')/DogService.deleteDog`, {}, who);

    assert.equal(await status(del(manager)), 403);
    assert.equal((await del(admin)).data.value, true);
  });

  it('updateDog keeps fields that were not sent', async () => {
    const { data: created } = await POST(`${base}/createDog`, dog('Luna'), admin);

    const { data } = await POST(`${base}/updateDog`, {
      ID: created.ID,
      description: 'Very good dog'
    }, admin);

    assert.equal(data.description, 'Very good dog');
    assert.equal(data.name, 'Luna');
    assert.equal(data.breedName, 'Golden Retriever');
    assert.equal(data.bodyConditionScore, 5);

    assert.equal(await status(POST(`${base}/updateDog`, {}, admin)), 400);
    assert.equal(await status(POST(`${base}/updateDog`, { ID: 'missing', name: 'Ghost' }, admin)), 404);
  });

  it('serves live breeds and pets from The Dog API', async () => {
    const breedsUrl = (q, limit, page) => `${base}/getBreeds(search='${q}',limit=${limit},page=${page})`;
    assert.equal(await status(GET(breedsUrl('', 1, 0))), 401);
    // no key configured
    assert.equal(await status(GET(breedsUrl('', 1, 0), admin)), 503);
    assert.equal(await status(GET(`${base}/getPets(limit=1,page=0)`, admin)), 503);

    const realFetch = globalThis.fetch;
    const urls = [];
    process.env.DOG_API_KEY = 'test-key';
    globalThis.fetch = async (url, init) => {
      if (String(url).startsWith(cds.server.url ?? 'http://localhost')) return realFetch(url, init); // the test client itself
      urls.push(String(url));
      const body = String(url).includes('/pets')
        ? [{ id: 'p1', name: 'Rex', sex: 'male' }]
        : [{ id: 1, name: 'Affenpinscher', breed_group: 'Toy', life_span: '12-15',
             weight: { metric: '3.2-4.5' }, image: { url: 'https://img/1.jpg' } }];
      return new Response(JSON.stringify(body), { status: 200 });
    };
    try {
      const breeds = (await GET(breedsUrl('', 500, -3), admin)).data.value;
      assert.deepEqual(
        [breeds[0].name, breeds[0].breedGroup, breeds[0].weight, breeds[0].imageURL],
        ['Affenpinscher', 'Toy', '3.2-4.5', 'https://img/1.jpg']);
      assert.ok(urls[0].endsWith('/breeds?limit=100&page=0'), 'limit and page are clamped');

      await GET(breedsUrl('lab', 5, 0), admin);
      assert.ok(urls[1].endsWith('/breeds/search?q=lab'));

      const pets = (await GET(`${base}/getPets(limit=5,page=0)`, admin)).data.value;
      assert.deepEqual([pets[0].ID, pets[0].name, pets[0].gender], ['p1', 'Rex', 'male']);
    } finally {
      globalThis.fetch = realFetch;
      process.env.DOG_API_KEY = '';
    }
  });
});
