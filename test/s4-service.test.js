import cds from '@sap/cds';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// ponytail: hits the live SAP API Business Hub sandbox, so it needs network and a valid APIKey
const { GET, POST } = cds.test(import.meta.dirname + '/..');

const admin = { auth: { username: 'Nagarjun', password: 'nagarjun' } };
const base = '/odata/v4/s4-business-partner';
const status = (p) => p.then(r => r.status, e => e.status ?? e.response?.status);

describe('S4BusinessPartnerService', () => {

  it('reads real business partners from S/4HANA', async () => {
    const { data } = await GET(`${base}/getBusinessPartnerCount()`, admin);
    assert.ok(data.value > 0);
  });

  it('searches by name', async () => {
    const { data } = await GET(`${base}/searchBusinessPartners(name='tech',top=3)`, admin);
    assert.ok(data.value.length > 0 && data.value.length <= 3);
    assert.equal(await status(GET(`${base}/searchBusinessPartners(name='',top=3)`, admin)), 400);
  });

  it('counts customers per country consistently', async () => {
    const { data } = await POST(`${base}/customerCountByCountry`, { top: 100 }, admin);
    const { countries, totalCustomers, truncated } = JSON.parse(data.value);
    assert.equal(truncated, false);
    assert.ok(countries.length > 0);
    // sorted descending, and no country can have more customers than exist
    assert.deepEqual(countries.map(c => c.customers), countries.map(c => c.customers).sort((a, b) => b - a));
    assert.ok(countries[0].customers <= totalCustomers);
  });

  it('links a student only to an existing business partner', async () => {
    const link = (bpNumber, who = admin) => POST(`${base}/linkStudentToBusinessPartner`, { studentID: 'meera', bpNumber }, who);
    assert.equal(await status(link('202', {})), 401);
    assert.equal(await status(link('NOPE000000')), 404);
    assert.equal((await link('202')).data.BusinessPartner, '202');

    const { data } = await GET(`${base}/getStudentBusinessPartner(studentID='meera')`, admin);
    assert.equal(data.BusinessPartnerFullName, 'Nue tech inc');
  });

  it('lists addresses of a business partner', async () => {
    const { data } = await GET(`${base}/BusinessPartners('202')/S4BusinessPartnerService.getAddresses()`, admin);
    assert.ok(data.value.every(a => a.BusinessPartner === '202'));
  });
});
