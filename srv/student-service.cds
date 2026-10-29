using {studenthub as db} from '../db/schema';

// roles: admin, manager, user (xs-security.json scopes; mocked users in package.json)
service StudentService @(
  path    : '/student-service',
  requires: 'user'
) {
  @restrict: [
    {
      grant: [
        'READ',
        'getEnrolledCourses'
      ],
      to   : 'user'
    },
    {
      grant: [
        'CREATE',
        'UPDATE',
        'changeDepartment',
        'graduate'
      ],
      to   : [
        'admin',
        'manager'
      ]
    },
    {
      grant: [
        'DELETE',
        'deleteStudent'
      ],
      to   : 'admin'
    }
  ]
  entity Students    as projection on db.Students
    actions {

      //change the department
      action   changeDepartment(department: String) returns Students;

      //bound function to read the information bout enrolled courses for a student
      function getEnrolledCourses()                 returns array of Courses;

      //covert the stautes of a student to graduated
      action   graduate()                           returns Students;

      //delete a student
      action   deleteStudent()                      returns Boolean;
    };

  @restrict: [
    {
      grant: 'READ',
      to   : 'user'
    },
    {
      grant: '*',
      to   : 'admin'
    }
  ]
  entity Courses     as projection on db.Courses;

  @restrict: [
    {
      grant: 'READ',
      to   : 'user'
    },
    {
      grant: '*',
      to   : [
        'admin',
        'manager'
      ]
    }
  ]
  entity Enrollments as projection on db.Enrollments;


  type CourseAvailability : {
    code      : String;
    title     : String;
    capacity  : Integer;
    enrolled  : Integer;
    seatsLeft : Integer;
  };

  type DepartmentSummary : {
    department : String;
    total      : Integer;
  };

  //get total student count
  function getTotalStudent()             returns Integer;

  //students of one department (CSE, ECE, MBA)
  function getStudentsByDepartment(department: String) returns array of Students;

  //number of students per department
  function getDepartmentSummary()        returns array of DepartmentSummary;

  //capacity, enrolled count and free seats of one course
  function getCourseAvailability(courseCode: String) returns CourseAvailability;

  //admit an applied student
  @requires: ['admin', 'manager']
  action   admitStudent(studentID: String) returns Students;

  //enroll an admitted student in a course that still has seats
  @requires: ['admin', 'manager']
  action   enrollStudent(studentID: String, courseCode: String) returns CourseAvailability;

  //remove a student from a course
  @requires: ['admin', 'manager']
  action   dropCourse(studentID: String, courseCode: String) returns Boolean;

  //UNBOUND ACTION: ADMIT ALL CSE APPLICANTS
  @requires: ['admin', 'manager']
  action   admitAllCSEApplicants()       returns array of Students;

  //CREATE A STUDENT
  @requires: ['admin', 'manager']
  action   createStudent(name: String,
                         email: String,
                         department: String,
                         status: String,
                         ID: String,
                         bpNumber: String) returns Students;


  //UNBOUND ACTION: Update a student
  @requires: ['admin', 'manager']
  action   updateStudent(name: String,
                         email: String,
                         department: String,
                         status: String,
                         ID: String,
                         bpNumber: String)   returns Students;
}
