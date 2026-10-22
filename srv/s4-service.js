
import cds from '@sap/cds';

export class S4BusinessPartnerService extends cds.ApplicationService {
  async init() {
    // Connect to the remote S/4HANA service
    const bupa = await cds.connect.to('API_BUSINESS_PARTNER');

    // Get the entities exposed by your CAP service
    const {
      BusinessPartners,
      BusinessPartnerAddresses,
      Suppliers,
      Customers
    } = this.entities;

    // Forward READ requests to S/4HANA
    for (const entity of [
      BusinessPartners,
      BusinessPartnerAddresses,
      Suppliers,
      Customers
    ]) {
      if (entity) {
        this.on('READ', entity, req => bupa.run(req.query));
      }
    }

    return super.init();
  }
}
