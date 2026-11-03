import cds from '@sap/cds';
import { randomUUID } from 'node:crypto';

const { SELECT, INSERT, UPDATE, DELETE } = cds.ql;

const LOCAL_FIELDS = [
  'name',
  'breedID',
  'breedName',
  'speciesID',
  'description',
  'microchipID',
  'subID',
  'externalOwnerID',
  'country',
  'dateOfBirth',
  'gender',
  'neuterStatus',
  'bodyConditionScore',
  'imageURL'
];

// local (camelCase) -> The Dog API (snake_case)
const API_FIELDS = {
  name: 'name',
  breedID: 'breed_id',
  speciesID: 'species_id',
  description: 'description',
  microchipID: 'microchip_id',
  subID: 'sub_id',
  externalOwnerID: 'external_owner_id',
  country: 'country',
  dateOfBirth: 'date_of_birth',
  gender: 'sex',
  neuterStatus: 'neuter_status',
  bodyConditionScore: 'body_condition_score'
};

const IMAGE_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
};
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const config = () => cds.env.dogApi ?? {};
const apiKey = () => (process.env.DOG_API_KEY || config().apiKey || '').trim();
const apiBase = () => (process.env.DOG_API_URL || config().url || 'https://api.thedogapi.com/v1').replace(/\/+$/, '');

const pickLocal = (row) =>
  Object.fromEntries(LOCAL_FIELDS.filter(f => row[f] !== undefined).map(f => [f, row[f]]));

const sentLocal = (data) =>
  Object.fromEntries(LOCAL_FIELDS.filter(f => data[f] !== undefined && data[f] !== null).map(f => [f, data[f]]));

const toApi = (data) => {
  const api = {};
  for (const [local, remote] of Object.entries(API_FIELDS)) {
    const value = data[local];
    if (value !== undefined && value !== null && value !== '') api[remote] = value;
  }
  return api;
};

const toLocal = (remote = {}, existing = {}) => ({
  ID: String(remote.id ?? existing.ID ?? randomUUID()),
  name: remote.name ?? existing.name ?? '',
  breedID: remote.breed_id ?? existing.breedID ?? '',
  breedName: remote.breed_name ?? existing.breedName ?? '',
  speciesID: remote.species_id ?? existing.speciesID ?? '',
  description: remote.description ?? existing.description ?? '',
  microchipID: remote.microchip_id ?? existing.microchipID ?? '',
  subID: remote.sub_id ?? existing.subID ?? '',
  externalOwnerID: remote.external_owner_id ?? existing.externalOwnerID ?? '',
  country: remote.country ?? existing.country ?? '',
  dateOfBirth: remote.date_of_birth === undefined
    ? existing.dateOfBirth ?? null
    : remote.date_of_birth || null,
  gender: remote.sex ?? existing.gender ?? 'unknown',
  neuterStatus: remote.neuter_status ?? existing.neuterStatus ?? 'unknown',
  bodyConditionScore: remote.body_condition_score === undefined
    ? existing.bodyConditionScore ?? null
    : remote.body_condition_score,
  imageURL: remote.images?.[0]?.url ?? existing.imageURL ?? ''
});

const validateDog = (req, data, { creating = false } = {}) => {
  if (creating && !data.name?.trim()) {
    return req.reject(400, 'Name is required');
  }
  if (data.name !== undefined && !String(data.name).trim()) {
    return req.reject(400, 'Name cannot be empty');
  }
  if (data.gender && !['male', 'female', 'unknown'].includes(data.gender)) {
    return req.reject(400, 'gender must be male, female or unknown');
  }
  if (data.neuterStatus && !['neutered', 'intact', 'unknown'].includes(data.neuterStatus)) {
    return req.reject(400, 'neuterStatus must be neutered, intact or unknown');
  }
  if (data.country && !/^[A-Za-z]{2}$/.test(data.country)) {
    return req.reject(400, 'country must be a two-letter country code');
  }
  if (data.dateOfBirth && !/^\d{4}-\d{2}-\d{2}$/.test(data.dateOfBirth)) {
    return req.reject(400, 'dateOfBirth must use YYYY-MM-DD format');
  }
  if (data.bodyConditionScore !== undefined && data.bodyConditionScore !== null && data.bodyConditionScore !== '') {
    const score = Number(data.bodyConditionScore);
    if (!Number.isInteger(score) || score < 1 || score > 9) {
      return req.reject(400, 'bodyConditionScore must be an integer from 1 to 9');
    }
  }
};

// decode the optional base64 image sent by the UI
function decodeImage(req, data) {
  if (!data.imageData) return null;

  const mime = String(data.imageType || '').toLowerCase();
  const ext = IMAGE_TYPES[mime];
  if (!ext) {
    return req.reject(400, 'Image must be JPEG, PNG or WebP');
  }

  const base64 = String(data.imageData).replace(/^data:[^;]+;base64,/, '');
  const buffer = Buffer.from(base64, 'base64');
  if (!buffer.length) {
    return req.reject(400, 'Invalid image data');
  }
  if (buffer.length > MAX_IMAGE_BYTES) {
    return req.reject(400, 'Image must be 10 MB or smaller');
  }

  return { buffer, mime, ext };
}

const imageForm = (image) => {
  const form = new FormData();
  form.append('images', new Blob([image.buffer], { type: image.mime }), `dog.${image.ext}`);
  return form;
};

const imageDataURL = (image) => `data:${image.mime};base64,${image.buffer.toString('base64')}`;

async function requestDogApi(req, endpoint, { method = 'GET', body } = {}) {
  const headers = { 'x-api-key': apiKey() };
  if (body && !(body instanceof FormData)) {
    headers['content-type'] = 'application/json';
    body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(`${apiBase()}${endpoint}`, { method, headers, body });
  } catch (error) {
    return req.reject(502, `Could not connect to The Dog API: ${error.message}`);
  }

  if (response.status === 204) return null;

  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!response.ok) {
    const detail = typeof payload === 'string' ? payload : payload?.message || payload?.error;
    return req.reject(response.status === 404 ? 404 : 502,
      detail || `The Dog API returned HTTP ${response.status}`);
  }
  return payload;
}

async function save(db, entity, row) {
  const existing = await db.run(SELECT.one.from(entity).columns('ID').where({ ID: row.ID }));
  if (existing) {
    await db.run(UPDATE(entity).set(row).where({ ID: row.ID }));
  } else {
    await db.run(INSERT.into(entity).entries(row));
  }
}

async function syncFromRemote(req, db, entity) {
  if (!apiKey()) return;

  const pets = await requestDogApi(req, '/pets?limit=100&page=0');
  if (!Array.isArray(pets)) {
    return req.reject(502, 'The Dog API returned an invalid pet list');
  }

  for (const pet of pets) {
    const ID = String(pet.id);
    const existing = await db.run(SELECT.one.from(entity).where({ ID }));
    await save(db, entity, toLocal(pet, existing || {}));
  }
}

export default class DogService extends cds.ApplicationService {
  async init() {
    const { Dogs } = this.entities;
    const db = await cds.connect.to('db');
    const { Dogs: DbDogs } = cds.entities('studenthub');

    // fetch the authenticated account's pets before every list/read
    this.before('READ', Dogs, (req) => syncFromRemote(req, db, DbDogs));

    // =====================================
    // CREATE: create a dog (remote + local mirror)
    // =====================================
    this.on('createDog', async (req) => {
      validateDog(req, req.data, { creating: true });
      const image = decodeImage(req, req.data);

      const api = toApi(req.data);
      let pet;

      if (apiKey()) {
        const form = new FormData();
        for (const [field, value] of Object.entries(api)) {
          form.append(field, String(value));
        }
        if (image) {
          form.append('images', new Blob([image.buffer], { type: image.mime }), `dog.${image.ext}`);
        }
        const remote = await requestDogApi(req, '/pets', { method: 'POST', body: form });
        pet = toLocal({ ...remote, breed_name: req.data.breedName });
      } else {
        pet = toLocal({ ...api, id: randomUUID(), breed_name: req.data.breedName });
        if (image) pet.imageURL = imageDataURL(image);
      }

      await save(db, DbDogs, pet);
      return db.run(SELECT.one.from(DbDogs).where({ ID: pet.ID }));
    });

    // =====================================
    // UPDATE: update only the fields that were sent
    // =====================================
    this.on('updateDog', async (req) => {
      const ID = req.data.ID?.trim();
      if (!ID) return req.reject(400, 'ID is required');
      validateDog(req, req.data);
      const image = decodeImage(req, req.data);
      const remoteMode = !!apiKey();

      const existing = await db.run(SELECT.one.from(DbDogs).where({ ID }));

      let remote = null;
      if (remoteMode) {
        const patch = toApi(req.data);
        // The Dog API requires name on PATCH; keep the current one when it was not sent
        if (!patch.name && existing?.name) patch.name = existing.name;

        remote = await requestDogApi(req, `/pets/${encodeURIComponent(ID)}`, {
          method: 'PATCH',
          body: patch
        });

        if (image) {
          const uploaded = await requestDogApi(req, `/pets/${encodeURIComponent(ID)}/images`, {
            method: 'POST',
            body: imageForm(image)
          });
          const url = (Array.isArray(uploaded) ? uploaded[0] : uploaded)?.url;
          if (url) remote = { ...remote, images: [{ url }] };
        }
      } else if (!existing) {
        return req.reject(404, `Dog ${ID} not found`);
      }

      const base = existing ? pickLocal(existing) : {};
      const pet = {
        ...base,
        ...(remote ? toLocal(remote, base) : {}),
        ...sentLocal(req.data),
        ID
      };

      if (!remoteMode && image) pet.imageURL = imageDataURL(image);

      await save(db, DbDogs, pet);
      return db.run(SELECT.one.from(DbDogs).where({ ID }));
    });

    // =====================================
    // DELETE: delete a dog by ID
    // =====================================
    this.on('deleteDog', 'Dogs', async (req) => {
      const ID = req.params[0].ID;

      if (apiKey()) {
        await requestDogApi(req, `/pets/${encodeURIComponent(ID)}`, { method: 'DELETE' });
      }

      const existing = await db.run(SELECT.one.from(DbDogs).columns('ID').where({ ID }));
      if (!existing && !apiKey()) {
        return req.reject(404, `Dog ${ID} not found`);
      }

      await db.run(DELETE.from(DbDogs).where({ ID }));
      return true;
    });

    return super.init();
  }
}
