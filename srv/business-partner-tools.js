import cds from '@sap/cds';

// Thin door: every tool forwards to S4BusinessPartnerService in the same request
// context, so authorization and S/4HANA access live in exactly one place.
const s4Service = () => cds.connect.to('S4BusinessPartnerService');

// Return only the fields the tool promises.
const pick = (obj, fields) =>
  Object.fromEntries(fields.filter(f => f in obj).map(f => [f, obj[f]]));

const BUSINESS_PARTNER_FIELDS = [
  'BusinessPartner', 'Customer', 'Supplier', 'BusinessPartnerCategory',
  'BusinessPartnerFullName', 'BusinessPartnerName', 'FirstName', 'LastName',
  'OrganizationBPName1', 'OrganizationBPName2', 'CorrespondenceLanguage',
  'CreatedByUser', 'CreationDate', 'Industry'
];

const ADDRESS_FIELDS = [
  'BusinessPartner', 'AddressID', 'CityName', 'Country', 'PostalCode',
  'StreetName', 'HouseNumber', 'Region', 'FullName'
];

const businessPartnerInfo = (bp) => pick(bp, BUSINESS_PARTNER_FIELDS);
const addressInfo = (address) => pick(address, ADDRESS_FIELDS);

export default class BusinessPartnerTools extends cds.ApplicationService {

  async init() {

    this.on('getBusinessPartnerCount', () =>
      s4Service().then(srv => srv.send({ event: 'getBusinessPartnerCount' }))
    );

    this.on('searchBusinessPartners', async (req) => {
      const name = req.data.name?.trim();
      if (!name) return req.reject(400, 'name is required');

      const partners = await s4Service().then(srv => srv.send({
        event: 'searchBusinessPartners',
        data: { name, top: req.data.top }
      }));

      return partners.map(businessPartnerInfo);
    });

    this.on('getAddresses', async (req) => {
      const businessPartner = req.data.businessPartner?.trim();
      if (!businessPartner) return req.reject(400, 'businessPartner is required');

      const addresses = await s4Service().then(srv => srv.send({
        event: 'getAddresses',
        entity: 'BusinessPartners',
        params: [{ BusinessPartner: businessPartner }]
      }));

      return addresses.map(addressInfo);
    });

    this.on('getStudentBusinessPartner', async (req) => {
      const studentID = req.data.studentID?.trim();
      if (!studentID) return req.reject(400, 'studentID is required');

      const partner = await s4Service().then(srv => srv.send({
        event: 'getStudentBusinessPartner',
        data: { studentID }
      }));

      return businessPartnerInfo(partner);
    });

    this.on('customerCountByCountry', (req) =>
      s4Service().then(srv => srv.send({
        event: 'customerCountByCountry',
        data: { top: req.data.top }
      }))
    );

    this.on('linkStudentToBusinessPartner', async (req) => {
      const studentID = req.data.studentID?.trim();
      const bpNumber = req.data.bpNumber?.trim();
      if (!studentID) return req.reject(400, 'studentID is required');
      if (!bpNumber) return req.reject(400, 'bpNumber is required');

      const partner = await s4Service().then(srv => srv.send({
        event: 'linkStudentToBusinessPartner',
        data: { studentID, bpNumber }
      }));

      return businessPartnerInfo(partner);
    });

    return super.init();
  }
}
