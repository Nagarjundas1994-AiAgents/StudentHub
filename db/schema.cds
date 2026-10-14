namespace studenthub;

using {
  cuid,
  managed
} from '@sap/cds/common';

/** A student. The ID is the login name, e.g. 'arjun' */
entity Students : managed {
  key ID          : String(20);
      name        : String(100)  @mandatory;
      email       : String(120)  @mandatory  @assert.format: '^[^@\s]+@[^@\s]+\.[^@\s]+$';
      department  : String(3); // CSE, ECE or MBA
      status      : String(10) enum {
        applied;
        admitted;
      } default 'applied';
      bpNumber    : String(10); // business partner number in SAP S/4HANA
      enrollments : Composition of many Enrollments
                      on enrollments.student = $self;
}

/** A course students can enroll in */

entity Courses : managed {
  key code     : String(10);
      title    : String(100) @mandatory;
      credits  : Integer     @assert.range: [ 1, 6 ];
      capacity : Integer     @assert.range: [1,  300 ];
      teacher  : String(100);
}

/** One student in one course */
entity Enrollments : cuid, managed {
  student : Association to Students;
  course  : Association to Courses @mandatory;
}
