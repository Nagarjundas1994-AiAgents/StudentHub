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

    const names = c => [...c.inputSchema.properties.action.enum].sort();
    const writes = ['admitStudent', 'changeDepartment', 'dropCourse', 'enrollStudent', 'graduate'];
    assert.ok(writes.every(w => names(adminCall).includes(w)));
    assert.ok(writes.every(w => !names(userCall).includes(w)));
    assert.deepEqual(names(userCall), [
      'getCourseAvailability', 'getDepartmentSummary', 'getEnrolledCourses', 'getStudentsByDepartment', 'getTotalStudent'
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

  it('lists students by department and summarises departments', async () => {
    const cse = await user.call(URL, 'getStudentsByDepartment', { department: 'cse' });
    const students = cse.result.structuredContent.result;
    assert.ok(students.length > 0 && students.every(s => s.department === 'CSE'));
    assert.equal(students[0].createdAt, undefined);

    const summary = await user.call(URL, 'getDepartmentSummary');
    const rows = summary.result.structuredContent.result;
    assert.equal(rows.reduce((n, r) => n + r.total, 0), 10);
  });

  it('admits, enrolls and drops through the facade, with seat counts', async () => {
    const before = (await user.call(URL, 'getCourseAvailability', { courseCode: 'CS101' })).result.structuredContent.result;

    const admitted = await manager.call(URL, 'admitStudent', { studentID: 'rahul' });
    assert.equal(admitted.result.structuredContent.result.status, 'admitted');
    const again = await manager.call(URL, 'admitStudent', { studentID: 'rahul' });
    assert.equal(again.result.isError, true);

    const enrolled = await manager.call(URL, 'enrollStudent', { studentID: 'rahul', courseCode: 'CS101' });
    assert.equal(enrolled.result.structuredContent.result.enrolled, before.enrolled + 1);
    const dup = await manager.call(URL, 'enrollStudent', { studentID: 'rahul', courseCode: 'CS101' });
    assert.equal(dup.result.isError, true);

    const dropped = await manager.call(URL, 'dropCourse', { studentID: 'rahul', courseCode: 'CS101' });
    assert.equal(dropped.result.structuredContent.result, true);
    const after = (await user.call(URL, 'getCourseAvailability', { courseCode: 'CS101' })).result.structuredContent.result;
    assert.equal(after.seatsLeft, before.seatsLeft);
  });

  it('refuses to enroll an applicant and blocks plain users', async () => {
    const applicant = await manager.call(URL, 'enrollStudent', { studentID: 'vikram', courseCode: 'CS101' });
    assert.equal(applicant.result.isError, true);
    const denied = await user.call(URL, 'enrollStudent', { studentID: 'arjun', courseCode: 'CS101' });
    assert.equal(denied.result.isError, true);
  });
});
