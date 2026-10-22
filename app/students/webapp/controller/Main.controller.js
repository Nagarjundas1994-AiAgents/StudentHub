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
  const NS = "StudentService.";

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
    async _call(name, params = {}, ctx) {
      const model = this.getView().getModel();
      const op = ctx
        ? model.bindContext(NS + name + "(...)", ctx)
        : model.bindContext("/" + name + "(...)");
      Object.entries(params).forEach(([k, v]) => v !== undefined && v !== "" && op.setParameter(k, v));
      await op.execute();
      return op.getBoundContext().getObject();
    },

    // back to the approuter landing page
    onHome() { window.location.href = "/"; },

    // approuter logout endpoint (xs-app.json), ends the XSUAA session
    onLogout() { window.location.replace("/do/logout"); },

    onSelect() {
      const on = !!this._ctx();
      ["btnEdit", "btnDept", "btnCourses", "btnGrad", "btnDel"].forEach(id => this.byId(id).setEnabled(on));
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
      const input = new Input({ placeholder: "CSE, ECE or MBA", maxLength: 3 });
      const dlg = new Dialog({
        title: "Change department", content: [input],
        beginButton: new Button({
          text: "Apply", type: "Emphasized",
          press: async () => {
            try {
              await this._call("changeDepartment", { department: input.getValue().toUpperCase() }, ctx);
              MessageToast.show("Department changed");
              dlg.close();
              this._refresh();
            } catch (e) { this._err(e); }
          }
        }),
        endButton: new Button({ text: "Cancel", press: () => dlg.close() }),
        afterClose: () => dlg.destroy()
      });
      dlg.addStyleClass("sapUiContentPadding").open();
    },

    // ---------- bound function: getEnrolledCourses ----------
    async onCourses() {
      const ctx = this._ctx();
      try {
        const r = await this._call("getEnrolledCourses", {}, ctx);
        const dlg = new Dialog({
          title: `Courses of ${ctx.getProperty("name")}`,
          content: [new List({
            noDataText: "Not enrolled in any course",
            items: r.value.map(c => new StandardListItem({ title: c.title, description: c.code, info: c.teacher }))
          })],
          endButton: new Button({ text: "Close", press: () => dlg.close() }),
          afterClose: () => dlg.destroy()
        });
        dlg.open();
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
