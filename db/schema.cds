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
      department  : String(3) @assert.range enum {
        CSE;
        ECE;
        MBA;
      };
      status      : String(10) @assert.range enum {
        applied;
        admitted;
        graduated;
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

/** A dog managed through The Dog API and mirrored locally */
entity Dogs : managed {
  key ID                 : String(100);
      name               : String(120)  @mandatory;
      breedID            : String(100);
      breedName          : String(120);
      speciesID          : String(100);
      description        : String(2000);
      microchipID        : String(100);
      subID              : String(100);
      externalOwnerID    : String(255);
      country            : String(2);
      dateOfBirth        : Date;
      gender             : String(10) @assert.range enum {
        male;
        female;
        unknown;
      } default 'unknown';
      neuterStatus       : String(10) @assert.range enum {
        neutered;
        intact;
        unknown;
      } default 'unknown';
      bodyConditionScore : Integer @assert.range: [ 1, 9 ];
      imageURL           : LargeString;
}
