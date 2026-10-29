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

## Dog Details (The Dog API)

The **Dog Details** tab (next to **Business Partners**) is backed by a separate service, `DogService` (`srv/dog-service.cds` / `.js`) at `/dog-service`.

- Opening the tab reads `GET /dog-service/Dogs`, which synchronizes the authenticated account's pets from `GET /pets` on The Dog API into the local `Dogs` mirror.
- `createDog`, `updateDog` and the bound `deleteDog` action call `POST /pets`, `PATCH /pets/{petId}` and `DELETE /pets/{petId}` respectively, then keep the mirror in sync.
- The create/update dialog accepts an optional JPEG, PNG or WebP photo up to 10 MB. It is uploaded as `POST /pets` multipart data or through `POST /pets/{petId}/images` when editing; in local-only mode it is stored as a data URL.
- The UI calls the field **Gender**; it maps to The Dog API's `sex` field.
- Set `DOG_API_KEY` in `.env` (or the environment / `cds.dogApi.apiKey` in `package.json`) before starting the server. Without a key the service works in local-only mode, like the DogAPI project.
- The key is read only by the backend and is never sent to the browser.
- Permissions match Students: `user` can read, `admin`/`manager` can create and update, and only `admin` can delete.

`test/dog-service.test.js` covers authorization, validation and CRUD in local-only mode.

## Tests

`npm test` runs [test/student-service.test.js](test/student-service.test.js) (authorization, input validation, actions) and [test/dog-service.test.js](test/dog-service.test.js).
Courses (`db/data/`) are deployed to HANA as master data; demo Students/Enrollments (`test/data/`) load only locally and in tests.

## Deploy to SAP BTP (Cloud Foundry)

1. `mbt build && cf deploy mta_archives/StudentHub_1.0.0.mtar`
2. In the BTP cockpit, assign the role collections `admin|manager|User (StudentHub <org>-<space>)` to users.
3. Open the `StudentHub-approuter` URL.
