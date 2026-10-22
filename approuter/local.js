// Local run without XSUAA: same routes with auth switched off, CAP's mocked users still log in.
const xsapp = require('./xs-app.json');
process.env.destinations ??= JSON.stringify([{ name: 'srv-api', url: 'http://localhost:4004', forwardAuthToken: true }]);
require('@sap/approuter')().start({ port: process.env.PORT || 5000, xsappConfig: { ...xsapp, authenticationMethod: 'none' } });
