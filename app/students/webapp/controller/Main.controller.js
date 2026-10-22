sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/core/Fragment",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageBox",
  "sap/m/MessageToast",
  "sap/m/Dialog",
  "sap/m/Button",
  "sap/m/Input",
  "sap/m/List",
  "sap/m/StandardListItem"
], (Controller, Fragment, JSONModel, MessageBox, MessageToast, Dialog, Button, Input, List, StandardListItem) => {
  "use strict";
  // namespace for bound operations, per model ("" = StudentService, "s4" = S4BusinessPartnerService)
  const NS = { "": "StudentService.", s4: "S4BusinessPartnerService." };
  const BP_CATEGORY = { 1: "Person", 2: "Organization", 3: "Group" };

  return Controller.extend("studenthub.ui.controller.Main", {

    onInit() {
      this.getView().setModel(new JSONModel({}), "form");
    },

    // ---------- helpers ----------
    _table() { return this.byId("studentTable"); },
    _ctx() { return this._table().getSelectedItem()?.getBindingContext(); },
    _refresh() {
      this._table().getBinding("items").refresh();
      this._table().removeSelections(true);
      this.onSelect();
    },
    _err(e) { MessageBox.error(e.message || String(e)); },

    // Calls an OData V4 action/function. ctx given => bound, otherwise unbound.
    async _call(name, params = {}, ctx, modelName = "") {
      const model = this.getView().getModel(modelName || undefined);
      const op = ctx
        ? model.bindContext(NS[modelName] + name + "(...)", ctx)
        : model.bindContext("/" + name + "(...)");
      Object.entries(params).forEach(([k, v]) => v !== undefined && v !== "" && op.setParameter(k, v));
      await op.execute();
      return op.getBoundContext().getObject();
    },

    // read-only list in a dialog; items are { title, description, info }
    _listDialog(title, items, noDataText) {
      const dlg = new Dialog({
        title, contentWidth: "28rem",
        content: [new List({ noDataText, items: items.map(i => new StandardListItem(i)) })],
        endButton: new Button({ text: "Close", press: () => dlg.close() }),
        afterClose: () => dlg.destroy()
      });
      dlg.open();
    },

    // single-input dialog; onApply(value) returns a promise, the dialog closes when it resolves
    _prompt(title, input, onApply) {
      const dlg = new Dialog({
        title, content: [input],
        beginButton: new Button({
          text: "Apply", type: "Emphasized",
          press: async () => {
            try {
              await onApply(input.getValue().trim());
              dlg.close();
            } catch (e) { this._err(e); }
          }
        }),
        endButton: new Button({ text: "Cancel", press: () => dlg.close() }),
        afterClose: () => dlg.destroy()
      });
      dlg.addStyleClass("sapUiContentPadding").open();
    },

    _bpItem(bp) {
      return { title: bp.BusinessPartnerFullName, description: bp.BusinessPartner, info: BP_CATEGORY[bp.BusinessPartnerCategory] };
    },

    // back to the approuter landing page
    onHome() { window.location.href = "/"; },

    // approuter logout endpoint (xs-app.json), ends the XSUAA session
    onLogout() { window.location.replace("/do/logout"); },

    onSelect() {
      const on = !!this._ctx();
      ["btnEdit", "btnDept", "btnCourses", "btnGrad", "btnBP", "btnLink", "btnDel"].forEach(id => this.byId(id).setEnabled(on));
    },

    // ---------- unbound function: getTotalStudent ----------
    async onTotal() {
      try {
        const r = await this._call("getTotalStudent");
        this.byId("total").setText("Total: " + r.value);
      } catch (e) { this._err(e); }
    },

    // ---------- unbound action: admitAllCSEApplicants ----------
    async onAdmitCSE() {
      try {
        const r = await this._call("admitAllCSEApplicants");
        MessageToast.show(`${r.value.length} CSE applicant(s) processed`);
        this._refresh();
      } catch (e) { this._err(e); }
    },

    // ---------- unbound actions: createStudent / updateStudent ----------
    onCreate() {
      this._openForm({ title: "Create student", isNew: true, status: "applied" });
    },
    onEdit() {
      const s = this._ctx().getObject();
      this._openForm({ title: "Update student", isNew: false, ...s });
    },
    async _openForm(data) {
      this.getView().getModel("form").setData(data);
      this._dialog ??= await Fragment.load({
        id: this.getView().getId(), name: "studenthub.ui.fragment.StudentDialog", controller: this
      }).then(d => { this.getView().addDependent(d); return d; });
      this._dialog.open();
    },
    onCancel() { this._dialog.close(); },
    async onSave() {
      const d = this.getView().getModel("form").getData();
      if (!d.ID?.trim() || !d.name?.trim() || !d.email?.trim()) {
        return MessageBox.error("ID, name and email are required");
      }
      const p = { name: d.name, email: d.email, department: d.department, status: d.status, ID: d.ID, bpNumber: d.bpNumber };
      try {
        await this._call(d.isNew ? "createStudent" : "updateStudent", p);
        MessageToast.show(d.isNew ? "Student created" : "Student updated");
        this._dialog.close();
        this._refresh();
      } catch (e) { this._err(e); }
    },

    // ---------- bound action: changeDepartment ----------
    onChangeDept() {
      const ctx = this._ctx();
      this._prompt("Change department", new Input({ placeholder: "CSE, ECE or MBA", maxLength: 3 }), async (v) => {
        await this._call("changeDepartment", { department: v.toUpperCase() }, ctx);
        MessageToast.show("Department changed");
        this._refresh();
      });
    },

    // ---------- bound function: getEnrolledCourses ----------
    async onCourses() {
      const ctx = this._ctx();
      try {
        const r = await this._call("getEnrolledCourses", {}, ctx);
        this._listDialog(`Courses of ${ctx.getProperty("name")}`,
          r.value.map(c => ({ title: c.title, description: c.code, info: c.teacher })),
          "Not enrolled in any course");
      } catch (e) { this._err(e); }
    },

    // ---------- S/4HANA function: getStudentBusinessPartner ----------
    async onStudentBP() {
      const s = this._ctx().getObject();
      try {
        const bp = await this._call("getStudentBusinessPartner", { studentID: s.ID }, null, "s4");
        this._listDialog(`Business partner of ${s.name}`, [this._bpItem(bp)]);
      } catch (e) { this._err(e); }
    },

    // ---------- S/4HANA action: linkStudentToBusinessPartner ----------
    onLinkBP() {
      const s = this._ctx().getObject();
      const input = new Input({ value: s.bpNumber, placeholder: "S/4HANA BP number, e.g. 202", maxLength: 10 });
      this._prompt(`Link ${s.name} to a business partner`, input, async (bpNumber) => {
        const bp = await this._call("linkStudentToBusinessPartner", { studentID: s.ID, bpNumber }, null, "s4");
        MessageToast.show(`Linked to ${bp.BusinessPartnerFullName}`);
        this._refresh();
      });
    },

    // ---------- S/4HANA tab ----------
    onSelectBP() {
      this.byId("btnAddr").setEnabled(!!this.byId("bpTable").getSelectedItem());
    },

    // function: getBusinessPartnerCount
    async onCountBP() {
      try {
        const r = await this._call("getBusinessPartnerCount", {}, null, "s4");
        this.byId("bpTotal").setText("Total: " + r.value);
      } catch (e) { this._err(e); }
    },

    // function: searchBusinessPartners
    async onSearchBP(e) {
      const name = e.getParameter("query")?.trim();
      if (!name) return;
      try {
        const r = await this._call("searchBusinessPartners", { name, top: 50 }, null, "s4");
        this._listDialog(`Business partners matching "${name}"`, r.value.map(bp => this._bpItem(bp)), "No business partner found");
      } catch (err) { this._err(err); }
    },

    // action: customerCountByCountry (returns a JSON string)
    async onCustomersByCountry() {
      try {
        const r = await this._call("customerCountByCountry", { top: 20 }, null, "s4");
        const { countries, totalCustomers, truncated } = JSON.parse(r.value);
        this._listDialog(`Customers by country (${totalCustomers}${truncated ? "+" : ""} customers)`,
          countries.map(c => ({ title: c.country, info: `${c.customers} customer${c.customers === 1 ? "" : "s"}` })), "No customers");
      } catch (e) { this._err(e); }
    },

    // bound function: getAddresses
    async onAddresses() {
      const ctx = this.byId("bpTable").getSelectedItem().getBindingContext("s4");
      try {
        const r = await this._call("getAddresses", {}, ctx, "s4");
        this._listDialog(`Addresses of ${ctx.getProperty("BusinessPartnerFullName")}`,
          r.value.map(a => ({
            title: [a.StreetName, a.HouseNumber].filter(Boolean).join(" ") || "(no street)",
            description: [a.PostalCode, a.CityName, a.Region].filter(Boolean).join(" "),
            info: a.Country
          })), "No addresses");
      } catch (e) { this._err(e); }
    },

    // ---------- bound action: graduate ----------
    onGraduate() {
      const ctx = this._ctx();
      MessageBox.confirm(`Graduate ${ctx.getProperty("name")}?`, {
        onClose: async (a) => {
          if (a !== "OK") return;
          try {
            await this._call("graduate", {}, ctx);
            MessageToast.show("Student graduated");
            this._refresh();
          } catch (e) { this._err(e); }
        }
      });
    },

    // ---------- bound action: deleteStudent ----------
    onDelete() {
      const ctx = this._ctx();
      MessageBox.confirm(`Delete ${ctx.getProperty("name")}?`, {
        emphasizedAction: MessageBox.Action.OK,
        onClose: async (a) => {
          if (a !== "OK") return;
          try {
            const r = await this._call("deleteStudent", {}, ctx);
            MessageToast.show(r.value ? "Student deleted" : "Nothing deleted");
            this._refresh();
          } catch (e) { this._err(e); }
        }
      });
    }
  });
});
