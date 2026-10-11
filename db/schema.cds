namespace studenthub;

using { cuid, managed, sap.common.CodeList } from '@sap/cds/common';

// ─── Reuse types ───────────────────────────────────────────────────

/** An e-mail address, checked on every write */
type Email : String(120) @assert.format: '^[^@\s]+@[^@\s]+\.[^@\s]+$';

/** Letter grades on a 10-point scale: A=10, B=8, C=6, D=4, F=0 */
type Grade : String(1) @assert.range enum { A; B; C; D; F; }

/** Status of one enrollment */
type EnrollmentStatus : String(1) @assert.range enum {
  enrolled  = 'E';
  dropped   = 'D';
  completed = 'C';
}

/** A postal address (stored as address_street, address_city, ...) */
type Address {
  street  : String(100);
  city    : String(40);
  state   : String(40);
  pincode : String(6) @assert.format: '^[0-9]{6}$';
}

// ─── Aspect: shared fields ─────────────────────────────────────────

/** Contact data shared by students and teachers */
aspect Contact {
  email : Email @mandatory;
  phone : String(15);
}

// ─── Entities ──────────────────────────────────────────────────────

/** Students. ID is the login name, e.g. 'arjun' */
@assert.unique: { rollNo: [ rollNo ] }
entity Students : managed, Contact {
  key ID          : String(20);
      rollNo      : String(10) @mandatory;
      name        : String(100) @mandatory;
      dateOfBirth : Date;
      address     : Address;
      department  : Association to Departments @mandatory;
      status      : Association to StudentStatus default 'P';
      bpNumber    : String(10);       // business partner in SAP S/4HANA (fee billing)
      virtual cgpa : Decimal(4, 2);   // computed when read
      enrollments : Composition of many Enrollments on enrollments.student = $self;
}

/** Teachers. ID is the login name, e.g. 'priya' */
entity Teachers : Contact {
  key ID         : String(20);
      name       : String(100) @mandatory;
      department : Association to Departments;
      courses    : Association to many Courses on courses.teacher = $self;
}

/** Courses offered in a semester */
entity Courses : managed {
  key code       : String(10);
      title      : String(100) @mandatory;
      credits    : Integer @assert.range: [1, 6];
      capacity   : Integer @assert.range: [1, 300];
      department : Association to Departments;
      teacher    : Association to Teachers;
      enrollments : Association to many Enrollments on enrollments.course = $self;
}

/** A student taking a course in a semester. One row per student, course and semester. */
@assert.unique: { oncePerSemester: [ student, course, semester ] }
entity Enrollments : cuid, managed {
  student  : Association to Students;
  course   : Association to Courses @mandatory;
  semester : String(7) @mandatory @assert.format: '^20[0-9]{2}-(S|W)$';  // 2026-W = winter 2026
  status   : EnrollmentStatus default 'E';
  grade    : Grade;
}

/** CSE, ECE, MBA ... */
entity Departments : CodeList {
  key code : String(5);
}

/** P Applied, A Admitted, G Graduated */
entity StudentStatus : CodeList {
  key code        : String(1);
      criticality : Integer;
}
