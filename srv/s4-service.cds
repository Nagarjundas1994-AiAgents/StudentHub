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

  /**
   * Customers per country, aggregated server-side.
   * Pages BusinessPartnerAddresses sequentially (sandbox-safe) and counts
   * addresses whose BusinessPartner is a Customer. Returns compact JSON:
   * `{ countries: [{ country, customers }], totalCustomers, scanned, truncated }`.
   * Use this instead of GROUP BY (unsupported) or one query per country.
   * @param top max countries returned, sorted descending (default 20, max 100)
   */
  action customerCountByCountry(top: Integer) returns String;
}
