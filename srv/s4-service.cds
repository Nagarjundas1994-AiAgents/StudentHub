using {API_BUSINESS_PARTNER as external} from './external/API_BUSINESS_PARTNER';

@protocol: ['odata', 'mcp']
@mcp.instructions: 'Use getBusinessPartnerCount, getBusinessPartner, searchBusinessPartners, getBusinessPartnersByCategory, searchSuppliers, searchCustomers, getSupplierCount, getCustomerCount, getStudentBusinessPartner, getUnlinkedStudents and customerCountByCountry for S/4HANA business partners; read addresses via query on BusinessPartnerAddresses. Avoid GROUP BY in query (unsupported by the remote API). linkStudentToBusinessPartner and unlinkStudentFromBusinessPartner require admin or manager.'
service S4BusinessPartnerService @(requires: 'user') {

  @readonly
  entity BusinessPartners as projection on external.A_BusinessPartner {
    key BusinessPartner,
        Customer,
        Supplier,
        BusinessPartnerCategory,
        BusinessPartnerFullName,
        BusinessPartnerName,
        FirstName,
        LastName,
        OrganizationBPName1,
        OrganizationBPName2,
        CorrespondenceLanguage,
        CreatedByUser,
        CreationDate,
        Industry
  }
    actions {

      //bound function: all addresses of this business partner
      function getAddresses() returns array of BusinessPartnerAddresses;
    };

  @readonly
  entity BusinessPartnerAddresses as projection on external.A_BusinessPartnerAddress {
    key BusinessPartner,
    key AddressID,
        CityName,
        Country,
        PostalCode,
        StreetName,
        HouseNumber,
        Region,
        FullName
  };

  @readonly
  entity Suppliers as projection on external.A_Supplier {
    key Supplier,
        SupplierName,
        SupplierFullName,
        Customer,
        CreatedByUser,
        CreationDate
  };

  @readonly
  entity Customers as projection on external.A_Customer {
    key Customer,
        CustomerFullName,
        CustomerAccountGroup,
        CustomerClassification,
        CreatedByUser,
        CreationDate
  };

  //total number of business partners in S/4HANA
  function getBusinessPartnerCount()                          returns Integer;

  //business partners whose full name contains `name` (top: default 10, max 100)
  function searchBusinessPartners(name: String, top: Integer) returns array of BusinessPartners;

  //one business partner by number
  function getBusinessPartner(businessPartner: String)        returns BusinessPartners;

  //business partners of a category: '1' person, '2' organization, '3' group (top: default 10, max 100)
  function getBusinessPartnersByCategory(category: String, top: Integer)
                                                              returns array of BusinessPartners;

  //suppliers whose full name contains `name` (top: default 10, max 100)
  function searchSuppliers(name: String, top: Integer)        returns array of Suppliers;

  //customers whose full name contains `name` (top: default 10, max 100)
  function searchCustomers(name: String, top: Integer)        returns array of Customers;

  //total number of suppliers in S/4HANA
  function getSupplierCount()                                 returns Integer;

  //total number of customers in S/4HANA
  function getCustomerCount()                                 returns Integer;

  type UnlinkedStudent : {
    ID    : String;
    name  : String;
    email : String;
  };

  //local students that have no business partner yet
  function getUnlinkedStudents()                              returns array of UnlinkedStudent;

  //the S/4HANA business partner linked to a local student (Students.bpNumber)
  function getStudentBusinessPartner(studentID: String)      returns BusinessPartners;

  /**
   * Customers per country, aggregated server-side.
   * Pages customer BusinessPartners sequentially (sandbox-safe) with their
   * addresses expanded, counting each customer once per country. Returns compact JSON:
   * `{ countries: [{ country, customers }], totalCustomers, truncated }`.
   * Use this instead of GROUP BY (unsupported) or one query per country.
   * @param top max countries returned, sorted descending (default 20, max 100)
   */
  action   customerCountByCountry(top: Integer)               returns String;

  //remove the business partner link of a local student
  @requires: ['admin', 'manager']
  action   unlinkStudentFromBusinessPartner(studentID: String) returns Boolean;

  //link a local student to an S/4HANA business partner, after checking it exists there
  @requires: ['admin', 'manager']
  action   linkStudentToBusinessPartner(studentID: String,
                                        bpNumber: String)     returns BusinessPartners;
}


