
import cds from '@sap/cds';

const { SELECT, INSERT, UPDATE, DELETE } = cds.ql;

export default class StudentService extends cds.ApplicationService {

    async init() {

        const { Students, Courses, Enrollments } = this.entities;

        // =====================================
        // 1. CREATE: Validate a new student
        // =====================================

        this.before('CREATE', 'Students', req => {

            if (!req.data.name?.trim()) {
                req.error(400, 'Name is required');
            }

            if (!req.data.email?.trim()) {
                req.error(400, 'Email is required');
            }

        });

        // =====================================
        // 2. READ: getTotalStudent
        // =====================================
        this.on('getTotalStudent', async (req) => {
            const result = await SELECT.from(Students).columns('count(*) as total');
            return result[0].total;
        });

        // =====================================
        // 3. UPDATE: Change department of a student
        // =====================================

        this.on('changeDepartment', 'Students', async (req) => {
            const ID = req.params[0].ID;
            const newDepartment = req.data.department;

            // Check if the student exists
            const student = await SELECT.one.from(Students).where({ ID });
            if (!student) {
                return req.reject(404, `Student with ID ${ID} not found`);
            }

            // Update the department of the student (via the service, so @assert.range applies)
            await this.run(UPDATE(Students).set({ department: newDepartment }).where({ ID }));

            return SELECT.one.from(Students).where({ ID });

        });

        // =====================================
        //getEnrolledCourses for the student
        // =====================================
        this.on('getEnrolledCourses', 'Students', async (req) => {
            const studentID = req.params[0].ID;

            // Check if the student exists
            const student = await SELECT.one.from(Students).where({ ID: studentID });
            if (!student) {
                return req.reject(404, `Student with ID ${studentID} not found`);
            }

            // Fetch the enrolled courses for the student
            const enrolledCourses = await SELECT.from(Enrollments)
                .columns('course_code')
                .where({ student_ID: studentID });

            // If no courses are found, return an empty array
            if (enrolledCourses.length === 0) {
                return [];
            }

            // Fetch course details for the enrolled courses
            const courseCodes = enrolledCourses.map(enrollment => enrollment.course_code);
            const courses = await SELECT.from(Courses).where({ code: courseCodes });

            return courses;
        });

        // =====================================
        // 4. DELETE: Delete a student by ID
        // =====================================
        this.on('deleteStudent', 'Students', async (req) => {
            const ID = req.params[0].ID;

            const student = await SELECT.one
                .from(Students)
                .where({ ID });

            if (!student) {
                return req.reject(404, `Student ${ID} not found`);
            }

            await DELETE.from(Students).where({ ID });

            return true;
        });

        // =====================================
        // BOUND ACTION: Graduate a student
        // =====================================
        this.on('graduate', 'Students', async (req) => {
            const ID = req.params[0].ID;

            const updated = await UPDATE(Students).set({ status: 'graduated' }).where({ ID });
            if (!updated) {
                return req.reject(404, `Student ${ID} not found`);
            }

            return SELECT.one.from(Students).where({ ID });
        });

        // =====================================
        // 5. UNBOUND ACTION: Admit all CSE applicants
        // =====================================
        this.on('admitAllCSEApplicants', async (req) => {
            const where = { department: 'CSE', status: 'applied' };
            const cseApplicants = await SELECT.from(Students).columns('ID').where(where);

            if (cseApplicants.length === 0) {
                return [];
            }

            await UPDATE(Students).set({ status: 'admitted' }).where(where);

            return SELECT.from(Students).where({ ID: cseApplicants.map(s => s.ID) });
        });

        // =====================================
        // 6. UNBOUND ACTION: Create a student
        // =====================================
        this.on('createStudent', async (req) => {
            const { ID, ...fields } = req.data;

            if (!ID?.trim()) {
                return req.reject(400, 'ID is required');
            }

            if (await SELECT.one.from(Students).columns('ID').where({ ID })) {
                return req.reject(409, `Student ${ID} already exists`);
            }

            // via the service, so @mandatory / @assert and the before-CREATE check run
            await this.run(INSERT.into(Students).entries({ ID, ...sent(fields) }));

            return SELECT.one.from(Students).where({ ID });
        });

        // =====================================
        // FUNCTIONS: department / course reads
        // =====================================
        const availability = async (code) => {
            const course = await SELECT.one.from(Courses).where({ code });
            if (!course) return null;
            const { n } = await SELECT.one.from(Enrollments).columns('count(*) as n').where({ course_code: code });
            return { code, title: course.title, capacity: course.capacity, enrolled: n, seatsLeft: course.capacity - n };
        };

        this.on('getStudentsByDepartment', async (req) => {
            const department = req.data.department?.trim().toUpperCase();
            if (!department) return req.reject(400, 'department is required');
            return SELECT.from(Students).where({ department });
        });

        this.on('getDepartmentSummary', () =>
            SELECT.from(Students).columns('department', 'count(*) as total').groupBy('department')
        );

        this.on('getCourseAvailability', async (req) => {
            const code = req.data.courseCode?.trim();
            if (!code) return req.reject(400, 'courseCode is required');
            return (await availability(code)) ?? req.reject(404, `Course ${code} not found`);
        });

        // =====================================
        // ACTIONS: admit, enroll, drop
        // =====================================
        this.on('admitStudent', async (req) => {
            const ID = req.data.studentID?.trim();
            if (!ID) return req.reject(400, 'studentID is required');

            const student = await SELECT.one.from(Students).where({ ID });
            if (!student) return req.reject(404, `Student ${ID} not found`);
            if (student.status !== 'applied') {
                return req.reject(409, `Student ${ID} is already ${student.status}`);
            }

            await this.run(UPDATE(Students).set({ status: 'admitted' }).where({ ID }));
            return SELECT.one.from(Students).where({ ID });
        });

        this.on('enrollStudent', async (req) => {
            const student_ID = req.data.studentID?.trim();
            const course_code = req.data.courseCode?.trim();
            if (!student_ID) return req.reject(400, 'studentID is required');
            if (!course_code) return req.reject(400, 'courseCode is required');

            const student = await SELECT.one.from(Students).where({ ID: student_ID });
            if (!student) return req.reject(404, `Student ${student_ID} not found`);
            if (student.status !== 'admitted') {
                return req.reject(409, `Student ${student_ID} must be admitted to enroll (status: ${student.status})`);
            }

            const course = await availability(course_code);
            if (!course) return req.reject(404, `Course ${course_code} not found`);
            if (course.seatsLeft <= 0) return req.reject(409, `Course ${course_code} is full`);

            if (await SELECT.one.from(Enrollments).where({ student_ID, course_code })) {
                return req.reject(409, `Student ${student_ID} is already enrolled in ${course_code}`);
            }

            await this.run(INSERT.into(Enrollments).entries({ student_ID, course_code }));
            return availability(course_code);
        });

        this.on('dropCourse', async (req) => {
            const student_ID = req.data.studentID?.trim();
            const course_code = req.data.courseCode?.trim();
            if (!student_ID) return req.reject(400, 'studentID is required');
            if (!course_code) return req.reject(400, 'courseCode is required');

            const dropped = await this.run(DELETE.from(Enrollments).where({ student_ID, course_code }));
            if (!dropped) return req.reject(404, `Student ${student_ID} is not enrolled in ${course_code}`);
            return true;
        });

        // =====================================
        // 7. UNBOUND ACTION: Update a student
        // =====================================
        this.on('updateStudent', async (req) => {
            const { ID, ...fields } = req.data;

            const student = await SELECT.one.from(Students).where({ ID });

            if (!student) {
                return req.reject(404, `Student ${ID} not found`);
            }

            // only the fields the caller sent; omitted ones keep their value
            const data = sent(fields);
            if (Object.keys(data).length) {
                await this.run(UPDATE(Students).set(data).where({ ID }));
            }

            return SELECT.one.from(Students).where({ ID });
        });

        return super.init();
    }
}

// ponytail: null counts as "not sent", so a field can't be cleared through these actions
const sent = (data) => Object.fromEntries(Object.entries(data).filter(([, v]) => v != null));
