
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
                req.error(404, `Student with ID ${ID} not found`);
            }

            // Update the department of the student
            await UPDATE(Students).set({ department: newDepartment }).where({ ID });

            console.log(`Student with ID ${ID} has been updated to department ${newDepartment}`);

            return { message: `Student with ID ${ID} has been updated to department ${newDepartment}` };

        });

        // =====================================
        //getEnrolledCourses for the student
        // =====================================
        this.on('getEnrolledCourses', 'Students', async (req) => {
            const studentID = req.params[0].ID;

            // Check if the student exists
            const student = await SELECT.one.from(Students).where({ ID: studentID });
            if (!student) {
                req.error(404, `Student with ID ${studentID} not found`);
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
        // 5. UNBOUND ACTION: Admit all CSE applicants
        // =====================================
        this.on('admitAllCSEApplicants', async (req) => {
            const cseApplicants = await SELECT.from(Students).where({ department: 'CSE' });

            if (cseApplicants.length === 0) {
                return [];
            }

            const admittedStudents = await INSERT.into(Students).entries(cseApplicants);

            return admittedStudents;
        });

        // =====================================
        // 6. UNBOUND ACTION: Create a student
        // =====================================
        this.on('createStudent', async (req) => {
            const { name, email, department, status,ID,bpNumber} = req.data;

            const newStudent = await INSERT.into(Students).entries({
                name,
                email,
                department,
                status, 
                ID, 
                bpNumber
            });

            return newStudent;
        });

        // =====================================
        // 7. UNBOUND ACTION: Update a student
        // =====================================
        this.on('updateStudent', async (req) => {
            const { ID, name, email, department, status } = req.data;

            const student = await SELECT.one.from(Students).where({ ID });

            if (!student) {
                return req.reject(404, `Student ${ID} not found`);
            }

            await UPDATE(Students).set({
                name,
                email,
                department,
                status
            }).where({ ID });

            return { message: `Student with ID ${ID} has been updated` };
        });




        return super.init();
    }
}
