import cds from '@sap/cds';

const { SELECT, UPDATE } = cds.ql;

// ponytail: hard stop so one call can't page a whole real tenant; raise if you have more customers
const MAX_CUSTOMERS = 5000;
const PAGE_SIZE = 200;

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

    // Local students, for the student <-> business partner link
    const { Students } = cds.entities('studenthub');

    const findPartner = (BusinessPartner) =>
      bupa.run(SELECT.one.from(BusinessPartners).where({ BusinessPartner }));

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

    // =====================================
    // FUNCTION: total business partners in S/4HANA
    // =====================================
    this.on('getBusinessPartnerCount', () => bupa.send('GET', 'A_BusinessPartner/$count'));

    // =====================================
    // FUNCTION: search business partners by name
    // =====================================
    this.on('searchBusinessPartners', async (req) => {
      const name = req.data.name?.trim();
      if (!name) {
        return req.reject(400, 'name is required');
      }

      return bupa.run(
        SELECT.from(BusinessPartners)
          .where`contains(BusinessPartnerFullName, ${name})`
          .limit(clamp(req.data.top, 10, 100))
      );
    });

    // =====================================
    // BOUND FUNCTION: addresses of one business partner
    // =====================================
    this.on('getAddresses', BusinessPartners, async (req) => {
      const { BusinessPartner } = req.params[0];
      return bupa.run(SELECT.from(BusinessPartnerAddresses).where({ BusinessPartner }));
    });

    // =====================================
    // FUNCTION: business partner of a local student
    // =====================================
    this.on('getStudentBusinessPartner', async (req) => {
      const { studentID } = req.data;

      const student = await SELECT.one.from(Students).columns('bpNumber').where({ ID: studentID });
      if (!student) {
        return req.reject(404, `Student ${studentID} not found`);
      }
      if (!student.bpNumber) {
        return req.reject(404, `Student ${studentID} has no business partner`);
      }

      const partner = await findPartner(student.bpNumber);
      return partner ?? req.reject(404, `Business partner ${student.bpNumber} not found in S/4HANA`);
    });

    // =====================================
    // ACTION: customers per country
    // =====================================
    this.on('customerCountByCountry', async (req) => {
      const { A_BusinessPartner } = bupa.entities;
      const perCountry = {};
      let scanned = 0, page;

      do {
        page = await bupa.run(
          SELECT.from(A_BusinessPartner)
            .columns(bp => { bp.BusinessPartner, bp.to_BusinessPartnerAddress(a => { a.Country }) })
            .where`Customer != ''`
            .orderBy('BusinessPartner')
            .limit(PAGE_SIZE, scanned)
        );

        for (const bp of page) {
          // a customer with two addresses in one country counts once there
          for (const country of new Set(bp.to_BusinessPartnerAddress.map(a => a.Country))) {
            if (country) perCountry[country] = (perCountry[country] ?? 0) + 1;
          }
        }
        scanned += page.length;
      } while (page.length === PAGE_SIZE && scanned < MAX_CUSTOMERS);

      const countries = Object.entries(perCountry)
        .map(([country, customers]) => ({ country, customers }))
        .sort((a, b) => b.customers - a.customers)
        .slice(0, clamp(req.data.top, 20, 100));

      return JSON.stringify({ countries, totalCustomers: scanned, truncated: page.length === PAGE_SIZE });
    });

    // =====================================
    // ACTION: link a student to an S/4HANA business partner
    // =====================================
    this.on('linkStudentToBusinessPartner', async (req) => {
      const { studentID } = req.data;
      const bpNumber = req.data.bpNumber?.trim();
      if (!bpNumber) {
        return req.reject(400, 'bpNumber is required');
      }

      if (!await SELECT.one.from(Students).columns('ID').where({ ID: studentID })) {
        return req.reject(404, `Student ${studentID} not found`);
      }

      const partner = await findPartner(bpNumber);
      if (!partner) {
        return req.reject(404, `Business partner ${bpNumber} not found in S/4HANA`);
      }

      await UPDATE(Students).set({ bpNumber }).where({ ID: studentID });
      return partner;
    });

    return super.init();
  }
}

// missing or out-of-range `top` falls back to `dflt`, capped at `max`
const clamp = (n, dflt, max) => Math.min(n > 0 ? n : dflt, max);
