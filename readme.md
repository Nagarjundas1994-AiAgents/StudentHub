# Getting Started

Welcome to your new CAP project.

It contains these folders and files, following our recommended project layout:

File or Folder | Purpose
---------|----------
`app/` | content for UI frontends goes here
`db/` | your domain models and data go here
`srv/` | your service models and code go here
`readme.md` | this getting started guide

## Next Steps

- Open a new terminal and run `cds watch`
- (in VS Code simply choose _**Terminal** > Run Task > cds watch_)
- Start with your domain model, in a CDS file in `db/`

## Learn More

Learn more at <https://cap.cloud.sap>.

## Run locally (CAP + App Router)

1. `npm install` and `npm install --prefix approuter`
2. Terminal 1: `cds watch` (CAP on http://localhost:4004, in-memory SQLite with CSV data)
3. Terminal 2: `cd approuter && npm run dev` (App Router on http://localhost:5000)
4. Open http://localhost:5000 → **Open StudentHub App**, log in with a mocked user from `package.json` (e.g. `Nagarjun` / `nagarjun`)

`npm run dev` copies `app/students/webapp` into `approuter/resources/students` and starts the router without XSUAA.
On Cloud Foundry (`mbt build && cf deploy mta_archives/*.mtar`) the same `xs-app.json` routes run with XSUAA login.

## MCP endpoints (local)

`S4BusinessPartnerService` is annotated `@mcp.instructions` with `@protocol: [odata, mcp]` (an MCP-annotated service otherwise drops OData) and served directly; `StudentService` goes through the `StudentTools` facade because its actions are bound to `Students`, which the generic MCP `call` tool cannot invoke:

| CAP service | MCP endpoint | Tools |
|---|---|---|
| `StudentService` | `http://localhost:4004/mcp/student-tools` | `getTotalStudent`, `getStudentsByDepartment`, `getDepartmentSummary`, `getEnrolledCourses`, `getCourseAvailability`, `changeDepartment`, `graduate`, `admitStudent`, `enrollStudent`, `dropCourse` |
| `S4BusinessPartnerService` | `http://localhost:4004/mcp/s4-business-partner` | `describe`, `query`, `call` (`getBusinessPartnerCount`, `getBusinessPartner`, `searchBusinessPartners`, `getBusinessPartnersByCategory`, `searchSuppliers`, `searchCustomers`, `getSupplierCount`, `getCustomerCount`, `getStudentBusinessPartner`, `getUnlinkedStudents`, `customerCountByCountry`, `linkStudentToBusinessPartner`, `unlinkStudentFromBusinessPartner`) |

The `StudentTools` facade exposes no entities, so there is no generic `query` tool over student data and every tool forwards to `StudentService`.
The S/4HANA endpoint offers a read-only `query` over its `@readonly` projections; `@requires` rules apply.
`changeDepartment`, `graduate`, `admitStudent`, `enrollStudent`, `dropCourse`, `linkStudentToBusinessPartner` and `unlinkStudentFromBusinessPartner` require `admin` or `manager`.

Authenticate with a mocked user from `package.json` (e.g. `Nagarjun` / `nagarjun`).

Autowire is disabled in `package.json` (`cds.mcp.autowire: false`), so CAP does not write the
endpoints into your global OpenCode/Claude config. Register the URLs manually in your MCP client.

## Tests

`npm test` runs [test/student-service.test.js](test/student-service.test.js) (authorization, input validation, actions).
Courses (`db/data/`) are deployed to HANA as master data; demo Students/Enrollments (`test/data/`) load only locally and in tests.

## Deploy to SAP BTP (Cloud Foundry)

1. `mbt build && cf deploy mta_archives/StudentHub_1.0.0.mtar`
2. In the BTP cockpit, assign the role collections `admin|manager|User (StudentHub <org>-<space>)` to users.
3. Open the `StudentHub-approuter` URL.

## S/4HANA API key

The `APIKey` header is not stored in `package.json`. Locally, put it in the git-ignored `.cdsrc-private.json`:

```json
{ "requires": { "API_BUSINESS_PARTNER": { "credentials": { "headers": { "APIKey": "<your key>" } } } } }
```

For deployments, supply the same structure through the `CDS_CONFIG` environment variable or a bound destination.
