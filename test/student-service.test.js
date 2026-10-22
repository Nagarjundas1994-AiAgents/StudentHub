import cds from '@sap/cds';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { GET, POST, DELETE } = cds.test(import.meta.dirname + '/..');

const admin = { auth: { username: 'Nagarjun', password: 'nagarjun' } };
const manager = { auth: { username: 'sukriti', password: 'sukriti' } };
const status = (p) => p.then(r => r.status, e => e.status ?? e.response?.status);

describe('StudentService', () => {

  it('rejects anonymous access', async () => {
    assert.equal(await status(GET('/student-service/Students')), 401);
  });

  it('lets only admin change courses, managers enrollments', async () => {
    assert.equal(await status(DELETE("/student-service/Courses('CS101')", manager)), 403);
    assert.equal(await status(POST('/student-service/Enrollments', { student_ID: 'rohan', course_code: 'EC101' }, manager)), 201);
  });

  it('lets only admin delete students', async () => {
    assert.equal(await status(POST("/student-service/Students('meera')/StudentService.deleteStudent", {}, manager)), 403);
  });

  it('validates createStudent input', async () => {
    const create = (data) => status(POST('/student-service/createStudent', data, admin));
    assert.equal(await create({ ID: 'bad1', name: 'X', email: 'not-an-email' }), 400);
    assert.equal(await create({ ID: 'bad2', name: 'X', email: 'x@x.io', department: 'ZZZ' }), 400);
    assert.equal(await create({ ID: 'arjun', name: 'X', email: 'x@x.io' }), 409);
    assert.equal(await create({ ID: 'zoe', name: 'Zoe', email: 'zoe@x.io', department: 'CSE' }), 200);
  });

  it('updateStudent keeps fields that were not sent', async () => {
    const { data } = await POST('/student-service/updateStudent', { ID: 'meera', bpNumber: 'BP9' }, admin);
    assert.equal(data.bpNumber, 'BP9');
    assert.ok(data.name && data.email && data.status);
  });

  it('changeDepartment rejects unknown departments', async () => {
    const url = "/student-service/Students('rohan')/StudentService.changeDepartment";
    assert.equal(await status(POST(url, { department: 'ZZZZZZ' }, admin)), 400);
    assert.equal((await POST(url, { department: 'MBA' }, admin)).data.department, 'MBA');
  });

  it('admits CSE applicants and graduates a student', async () => {
    const { data } = await POST('/student-service/admitAllCSEApplicants', {}, admin);
    assert.ok(data.value.every(s => s.status === 'admitted'));
    const grad = await POST("/student-service/Students('arjun')/StudentService.graduate", {}, admin);
    assert.equal(grad.data.status, 'graduated');
  });
});
