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

  // one dog breed from The Dog API /breeds
  type Breed {
    id          : String;
    name        : String;
    breedGroup  : String;
    origin      : String;
    lifeSpan    : String; // years, e.g. 12-15
    weight      : String; // kg, e.g. 3.2-4.5
    height      : String; // cm, e.g. 23-29
    temperament : String;
    bredFor     : String;
    description : String;
    imageURL    : String;
  };

  //LIVE breed catalogue from The Dog API (/breeds); search is a name filter, otherwise paged
  function getBreeds(search: String, limit: Integer, page: Integer) returns array of Breed;

  //LIVE pets of the authenticated Dog API account (/pets), straight from the API
  function getPets(limit: Integer, page: Integer)                    returns array of Dogs;

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
