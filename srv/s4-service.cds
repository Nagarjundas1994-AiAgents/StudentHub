using {API_BUSINESS_PARTNER as external} from './external/API_BUSINESS_PARTNER';

@odata.draft.enabled
service S4BusinessPartnerService {

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

  //link a local student to an S/4HANA business partner, after checking it exists there
  @requires: ['admin', 'manager']
  action   linkStudentToBusinessPartner(studentID: String,
                                        bpNumber: String)     returns BusinessPartners;
}
