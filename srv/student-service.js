
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
