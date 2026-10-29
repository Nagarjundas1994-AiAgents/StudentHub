using { studenthub as db } from '../db/schema';

/**
 * Narrow MCP facade for AI agents.
 *
 * It deliberately exposes no entities, so @cap-js/mcp does not add its generic
 * `query` tool over Students/Courses/Enrollments. Only the named operations
 * below are offered, and every one forwards to StudentService, where the same
 * @restrict rules apply again.
 */
@mcp
@mcp.instructions: 'Read student data with getTotalStudent and getEnrolledCourses. changeDepartment and graduate modify data and are restricted to admin and manager.'
@requires: 'user'
service StudentTools {

  /** Public fields of a student (no audit columns). */
  type StudentInfo : {
    ID         : String(20);
    name       : String(100);
    email      : String(120);
    department : String(3);
    status     : String(10);
    bpNumber   : String(10);
  };

  /** Public fields of a course. */
  type CourseInfo : {
    code     : String(10);
    title    : String(100);
    credits  : Integer;
    capacity : Integer;
    teacher  : String(100);
  };

  /** Total number of students. */
  function getTotalStudent() returns Integer;

  /** Courses the given student is enrolled in. */
  function getEnrolledCourses(studentID: String) returns array of CourseInfo;

  /** Change a student's department. Allowed values: CSE, ECE, MBA. */
  @requires: ['admin', 'manager']
  action changeDepartment(studentID: String, department: String) returns StudentInfo;

  /** Mark a student as graduated. */
  @requires: ['admin', 'manager']
  action graduate(studentID: String) returns StudentInfo;
}
