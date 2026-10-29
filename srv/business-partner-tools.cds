/**
 * Narrow MCP facade over S4BusinessPartnerService.
 *
 * No entities are exposed, so @cap-js/mcp does not add its generic `query`
 * tool over the S/4HANA business partner data. Only the named operations below
 * are offered, and every one forwards to S4BusinessPartnerService, where the
 * same @requires rules apply again.
 */
@mcp
@mcp.instructions: 'Use getBusinessPartnerCount and searchBusinessPartners to explore S/4HANA business partners, getAddresses for one partner, getStudentBusinessPartner to resolve the partner linked to a student, and customerCountByCountry for an aggregated customer overview. linkStudentToBusinessPartner requires admin or manager.'
@requires: 'user'
service BusinessPartnerTools {

  /** Public fields of a business partner. */
  type BusinessPartnerInfo : {
    BusinessPartner         : String(10);
    Customer                : String(10);
    Supplier                : String(10);
    BusinessPartnerCategory : String(1);
    BusinessPartnerFullName : String(81);
    BusinessPartnerName     : String(81);
    FirstName               : String(40);
    LastName                : String(40);
    OrganizationBPName1     : String(40);
    OrganizationBPName2     : String(40);
    CorrespondenceLanguage  : String(2);
    CreatedByUser           : String(12);
    CreationDate            : Date;
    Industry                : String(10);
  };

  /** Public fields of a business partner address. */
  type AddressInfo : {
    BusinessPartner : String(10);
    AddressID       : String(10);
    CityName        : String(40);
    Country         : String(3);
    PostalCode      : String(10);
    StreetName      : String(60);
    HouseNumber     : String(10);
    Region          : String(3);
    FullName        : String(80);
  };

  /** Total number of business partners in S/4HANA. */
  function getBusinessPartnerCount() returns Integer;

  /** Business partners whose full name contains `name` (top: default 10, max 100). */
  function searchBusinessPartners(name: String, top: Integer) returns array of BusinessPartnerInfo;

  /** All addresses of one business partner. */
  function getAddresses(businessPartner: String) returns array of AddressInfo;

  /** The S/4HANA business partner linked to a local student (Students.bpNumber). */
  function getStudentBusinessPartner(studentID: String) returns BusinessPartnerInfo;

  /** Customers per country as compact JSON: { countries, totalCustomers, truncated }. */
  function customerCountByCountry(top: Integer) returns String;

  /** Link a local student to an S/4HANA business partner, after checking it exists there. */
  @requires: ['admin', 'manager']
  action linkStudentToBusinessPartner(studentID: String, bpNumber: String) returns BusinessPartnerInfo;
}
