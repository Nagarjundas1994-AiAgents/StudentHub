using { studenthub as db } from '../db/schema';

service StudentService @(path: '/student-service') {
  entity Students as projection on db.Students;
  entity Teachers as projection on db.Teachers;
  entity Courses as projection on db.Courses;
  entity Enrollments as projection on db.Enrollments;
  entity Departments as projection on db.Departments;
  entity StudentStatus as projection on db.StudentStatus;
}