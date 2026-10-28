using {studenthub as db} from '../db/schema';

/**
 * Dog details from The Dog API (https://docs.thedogapi.com/reference).
 * READ synchronizes the authenticated account's pets into the local mirror;
 * create/update/delete call The Dog API when DOG_API_KEY is configured and
 * always keep the local mirror in sync.
 */
service DogService @(
  path    : '/dog-service',
  requires: 'user'
) {
  @restrict: [
    {
      grant: 'READ',
      to   : 'user'
    },
    {
      grant: [
        'CREATE',
        'UPDATE',
        'createDog',
        'updateDog'
      ],
      to   : [
        'admin',
        'manager'
      ]
    },
    {
      grant: [
        'DELETE',
        'deleteDog'
      ],
      to   : 'admin'
    }
  ]
  entity Dogs as projection on db.Dogs
    actions {

      //delete a dog by ID
      action   deleteDog()                          returns Boolean;
    };

  //CREATE A DOG (The Dog API generates the ID)
  @requires: ['admin', 'manager']
  action   createDog(name: String,
                     breedID: String,
                     breedName: String,
                     speciesID: String,
                     description: String,
                     microchipID: String,
                     externalOwnerID: String,
                     country: String,
                     dateOfBirth: Date,
                     gender: String,
                     neuterStatus: String,
                     bodyConditionScore: Integer,
                     imageType: String,
                     imageData: LargeString)            returns Dogs;

  //UPDATE A DOG: only the fields that are sent are changed
  @requires: ['admin', 'manager']
  action   updateDog(ID: String,
                     name: String,
                     breedID: String,
                     breedName: String,
                     speciesID: String,
                     description: String,
                     microchipID: String,
                     externalOwnerID: String,
                     country: String,
                     dateOfBirth: Date,
                     gender: String,
                     neuterStatus: String,
                     bodyConditionScore: Integer,
                     imageType: String,
                     imageData: LargeString)            returns Dogs;
}
