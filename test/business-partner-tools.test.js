import cds from '@sap/cds';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mcpClient } from './mcp-client.js';

// ponytail: like s4-service.test.js, this hits the live SAP API Business Hub
// sandbox, so it needs network and a valid APIKey
const { POST } = cds.test(import.meta.dirname + '/..');

const URL = '/mcp/business-partner-tools';
const admin = mcpClient(POST, ['Nagarjun', 'nagarjun']);
const manager = mcpClient(POST, ['sukriti', 'sukriti']);
const user = mcpClient(POST, ['meera', 'meera']);

const callToolFor = async (client) => (await client.tools(URL)).find(t => t.name === 'call');

describe('BusinessPartnerTools MCP facade', () => {

  it('exposes named tools only, with no generic query over entities', async () => {
    const tools = await admin.tools(URL);
    assert.deepEqual(tools.map(t => t.name).sort(), ['call', 'describe']);
    assert.ok(!tools.some(t => t.name === 'query'));
  });

  it('shows the write action only to admin and manager', async () => {
    const adminCall = await callToolFor(admin);
    const userCall = await callToolFor(user);

    assert.deepEqual(adminCall.inputSchema.properties.action.enum, [
      'getBusinessPartnerCount', 'searchBusinessPartners', 'getAddresses',
      'getStudentBusinessPartner', 'customerCountByCountry', 'linkStudentToBusinessPartner'
    ]);
    assert.ok(!userCall.inputSchema.properties.action.enum.includes('linkStudentToBusinessPartner'));
  });

  it('reads the business partner count and searches by name', async () => {
    const count = await user.call(URL, 'getBusinessPartnerCount');
    assert.ok(count.result.structuredContent.result > 0);

    const search = await user.call(URL, 'searchBusinessPartners', { name: 'tech', top: 3 });
    const partners = search.result.structuredContent.result;
    assert.ok(partners.length > 0 && partners.length <= 3);
    assert.ok(partners.every(p => p.BusinessPartner));
  });

  it('lists addresses of one business partner', async () => {
    const addresses = await user.call(URL, 'getAddresses', { businessPartner: '202' });
    const result = addresses.result.structuredContent.result;
    assert.ok(result.every(a => a.BusinessPartner === '202'));
  });

  it('links a student as manager and resolves it again', async () => {
    const linked = await manager.call(URL, 'linkStudentToBusinessPartner', {
      studentID: 'rohan', bpNumber: '202'
    });
    assert.equal(linked.result.structuredContent.result.BusinessPartner, '202');

    const resolved = await user.call(URL, 'getStudentBusinessPartner', { studentID: 'rohan' });
    assert.equal(resolved.result.structuredContent.result.BusinessPartnerFullName, 'Nue tech inc');
  });

  it('aggregates customers per country', async () => {
    const result = await user.call(URL, 'customerCountByCountry', { top: 100 });
    const { countries, totalCustomers, truncated } = JSON.parse(result.result.structuredContent.result);
    assert.equal(truncated, false);
    assert.ok(countries.length > 0 && countries[0].customers <= totalCustomers);
  });

  it('blocks a plain user from linking a student', async () => {
    const denied = await user.call(URL, 'linkStudentToBusinessPartner', { studentID: 'rohan', bpNumber: '202' });
    assert.equal(denied.result.isError, true);
  });
});
