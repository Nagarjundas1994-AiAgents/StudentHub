using {studenthub as db} from '../db/schema';

//@requires: 'admin'
service StudentService @(path: '/student-service') {
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
      to   : ['User']
    },
    {
      grant: [
        'CREATE',
        'UPDATE'
      ],
      to   : [
        'admin',
        'manager'
      ]
    },
    {
      grant: 'DELETE',
      to   : 'admin'
    }
  ]

  entity Courses     as projection on db.Courses;

  entity Enrollments as projection on db.Enrollments;


  //get total student count
  function getTotalStudent()             returns Integer;

  //UNBOUND ACTION: ADMIT ALL CSE APPLICANTS

  action   admitAllCSEApplicants()       returns array of Students;

  //CREATE A STUDENT
  action   createStudent(name: String,
                         email: String,
                         department: String,
                         status: String,
                         ID: String,
                         bpNumber: String) returns Students;


  //UNBOUND ACTION: Update a student
  @restrict: [
    {
      grant: 'READ',
      to   : ['User']
    },
    {
      grant: [
        'CREATE',
        'UPDATE'
      ],
      to   : ['manager']
    },
    {
      grant: 'DELETE',
      to   : 'admin'
    }
  ]
  action   updateStudent(studentId: Integer,
                         name: String,
                         email: String,
                         department: String,
                         status: String,
                         ID: String,
                         bpNumber: String)   returns Students;
}
