using {studenthub as db} from '../db/schema';

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

  entity Courses     as projection on db.Courses;
  entity Enrollments as projection on db.Enrollments;


  //get total student count
  function getTotalStudent() returns Integer;
}
