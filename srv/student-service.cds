using { studenthub as db } from '../db/schema';

service StudentService @(path: '/student-service') {
  entity Students as projection on db.Students;
  entity Courses as projection on db.Courses;
  entity Enrollments as projection on db.Enrollments;

  //get total student count
  function getTotalStudent() returns Integer;
}