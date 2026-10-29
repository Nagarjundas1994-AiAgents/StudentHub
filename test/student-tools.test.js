import cds from '@sap/cds';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mcpClient } from './mcp-client.js';

const { GET, POST } = cds.test(import.meta.dirname + '/..');

const URL = '/mcp/student-tools';
const admin = mcpClient(POST, ['Nagarjun', 'nagarjun']);
const manager = mcpClient(POST, ['sukriti', 'sukriti']);
const user = mcpClient(POST, ['meera', 'meera']);

const callToolFor = async (client) => (await client.tools(URL)).find(t => t.name === 'call');

describe('StudentTools MCP facade', () => {

  it('rejects anonymous access', async () => {
    const status = await POST(URL, {
      jsonrpc: '2.0', id: 1, method: 'tools/list', params: {}
    }).then(r => r.status, e => e.status ?? e.response?.status);
    assert.equal(status, 401);
  });

  it('exposes named tools only, with no generic query over entities', async () => {
    const tools = await admin.tools(URL);
    assert.deepEqual(tools.map(t => t.name).sort(), ['call', 'describe']);
    assert.ok(!tools.some(t => t.name === 'query'));
  });

  it('shows mutating actions only to admin and manager', async () => {
    const adminCall = await callToolFor(admin);
    const userCall = await callToolFor(user);

    assert.deepEqual(adminCall.inputSchema.properties.action.enum, [
      'getTotalStudent', 'getEnrolledCourses', 'changeDepartment', 'graduate'
    ]);
    assert.deepEqual(userCall.inputSchema.properties.action.enum, [
      'getTotalStudent', 'getEnrolledCourses'
    ]);
  });

  it('lets a plain user read totals and enrolled courses', async () => {
    const total = await user.call(URL, 'getTotalStudent');
    assert.equal(total.result.structuredContent.result, 10);

    const courses = await user.call(URL, 'getEnrolledCourses', { studentID: 'arjun' });
    const result = courses.result.structuredContent.result;
    assert.deepEqual(result.map(c => c.code).sort(), ['CS101', 'EC101']);
    assert.deepEqual(Object.keys(result[0]).sort(), ['capacity', 'code', 'credits', 'teacher', 'title']);
  });

  it('blocks a plain user from calling changeDepartment', async () => {
    const denied = await user.call(URL, 'changeDepartment', { studentID: 'rohan', department: 'MBA' });
    assert.equal(denied.result.isError, true);
  });

  it('lets a manager change a department and graduate through the facade', async () => {
    const changed = await manager.call(URL, 'changeDepartment', { studentID: 'rohan', department: 'MBA' });
    const student = changed.result.structuredContent.result;
    assert.equal(student.department, 'MBA');
    assert.equal(student.createdAt, undefined); // audit columns are not exposed

    // OData (the UI's protocol) is still served and sees the same data
    const { data } = await GET("/student-service/Students('rohan')", {
      auth: { username: 'sukriti', password: 'sukriti' }
    });
    assert.equal(data.department, 'MBA');

    const graduated = await manager.call(URL, 'graduate', { studentID: 'rohan' });
    assert.equal(graduated.result.structuredContent.result.status, 'graduated');
  });
});
