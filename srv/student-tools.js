import cds from '@sap/cds';

// Thin door: every tool forwards to StudentService in the same request context,
// so authorization and business rules live in exactly one place.
const studentService = () => cds.connect.to('StudentService');

// Return only the fields the tool promises; never leak audit columns.
const studentInfo = ({ ID, name, email, department, status, bpNumber }) =>
  ({ ID, name, email, department, status, bpNumber });

const courseInfo = ({ code, title, credits, capacity, teacher }) =>
  ({ code, title, credits, capacity, teacher });

// Forward an operation whose required string arguments are trimmed and checked.
const forward = (event, required, shape = x => x) => async (req) => {
  const data = Object.fromEntries(required.map(f => [f, req.data[f]?.trim()]));
  const missing = required.find(f => !data[f]);
  if (missing) return req.reject(400, `${missing} is required`);
  return shape(await studentService().then(srv => srv.send({ event, data })));
};

export default class StudentTools extends cds.ApplicationService {

  async init() {

    this.on('getTotalStudent', () =>
      studentService().then(srv => srv.send({ event: 'getTotalStudent' }))
    );

    this.on('getEnrolledCourses', async (req) => {
      const studentID = req.data.studentID?.trim();
      if (!studentID) return req.reject(400, 'studentID is required');

      const courses = await studentService().then(srv => srv.send({
        event: 'getEnrolledCourses',
        entity: 'Students',
        params: [{ ID: studentID }]
      }));

      return courses.map(courseInfo);
    });

    this.on('changeDepartment', async (req) => {
      const studentID = req.data.studentID?.trim();
      const department = req.data.department?.trim();
      if (!studentID) return req.reject(400, 'studentID is required');
      if (!department) return req.reject(400, 'department is required');

      const student = await studentService().then(srv => srv.send({
        event: 'changeDepartment',
        entity: 'Students',
        params: [{ ID: studentID }],
        data: { department }
      }));

      return studentInfo(student);
    });

    this.on('graduate', async (req) => {
      const studentID = req.data.studentID?.trim();
      if (!studentID) return req.reject(400, 'studentID is required');

      const student = await studentService().then(srv => srv.send({
        event: 'graduate',
        entity: 'Students',
        params: [{ ID: studentID }]
      }));

      return studentInfo(student);
    });

    this.on('getStudentsByDepartment', forward('getStudentsByDepartment', ['department'], r => r.map(studentInfo)));
    this.on('getDepartmentSummary', forward('getDepartmentSummary', []));
    this.on('getCourseAvailability', forward('getCourseAvailability', ['courseCode']));
    this.on('admitStudent', forward('admitStudent', ['studentID'], studentInfo));
    this.on('enrollStudent', forward('enrollStudent', ['studentID', 'courseCode']));
    this.on('dropCourse', forward('dropCourse', ['studentID', 'courseCode']));

    return super.init();
  }
}
