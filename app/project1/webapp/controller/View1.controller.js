sap.ui.define([
    "sap/ui/core/mvc/Controller"
], (Controller) => {
    "use strict";

    return Controller.extend("project1.controller.View1", {
        onInit() {
        },
        onCollapseExpandPress() {
            const oSideNavigation = this.byId("sideNavigation"),
                bExpanded = oSideNavigation.getExpanded();

            oSideNavigation.setExpanded(!bExpanded);
        },
        hideAllpanel() {
            this.byId('_IDGenPanel1').setVisible(false);
            this.byId('_IDGenPanel2').setVisible(false);
            this.byId('_IDGenPanel').setVisible(false);
        },
        onRegisterPress: function (oEvent) {
            const oContext = oEvent.getSource().getBindingContext();

            this._selectedContext = oContext;
            this.byId("orderDialog").open();
        },

        onCloseDialog: function () {
            this.byId("orderDialog").close();
            this.byId("_IDGenInput1").setValue("")
            this.byId("_IDGenInput").setValue("")
        },

        onPressVisible() {
            this.hideAllpanel()
            var oPanel = this.byId('_IDGenPanel1')
            oPanel.setVisible(true)
        },

        onPressListProducts(){
            this.hideAllpanel()
            var oPanel = this.byId('_IDGenPanel')
            oPanel.setVisible(true)
        },
        onSubmitOrder: async function () {

            const oModel = this.getView().getModel();

            const quantity = this.byId("_IDGenInput1").getValue();
            const status = this.byId("_IDGenInput").getValue();

            if (!this._selectedContext) {
                sap.m.MessageToast.show("No record selected ");
                return;
            }

            const data = this._selectedContext.getObject();

            const payload = {
                quantity: quantity,
                status: status,
                product: { ID: data.ID }
            };


            try {
                const oBinding = oModel.bindList("/orders");
                await oBinding.create(payload);

                sap.m.MessageToast.show(" Ordered successfully ");

                this.byId("orderDialog").close();
                 this.byId("_IDGenInput1").setValue("")
            this.byId("_IDGenInput").setValue("")

            } catch (err) {
                console.error(err);
                sap.m.MessageToast.show("Error not registered successfully ");
            }
        },
        ASKtoai: function (oEvent) {
            const getQuery = oEvent.getSource().getBindingContext()

            this._selectedgetQuery = getQuery;
            this.byId('askAIdialog').open()
        },
        oncloseAI: function () {
            this.byId('askAIdialog').close();
            this.byId("_IDGenInput2").setValue("");

        },

        onsubmitAI: async function () {

            const oModel = this.getView().getModel();
            console.log(oModel);

            const inputQuery = this.byId('_IDGenInput2').getValue();

            if (!inputQuery) {
                sap.m.MessageToast.show("please enter your query");
                return;
            }

            const oAction = oModel.bindContext("/askAI(...)");

            oAction.setParameter("query", inputQuery);

            try {

                sap.ui.core.BusyIndicator.show(0);
                await oAction.execute()
                 sap.ui.core.BusyIndicator.hide();

                const result = oAction.getBoundContext().getObject()
                console.log(result);

                const JsonModel = new sap.ui.model.json.JSONModel()

                JsonModel.setData(result.value);

                this.getView().setModel(JsonModel, "aiProductModel")

                this.hideAllpanel();

                var oPanel = this.byId("_IDGenPanel2");

                oPanel.setVisible(true)

                console.log("AI is response", result);

                this.byId('askAIdialog').close()

                this.byId("_IDGenInput2").setValue("");
                sap.m.MessageToast.show("AI is now responding");

            }
            catch (err) {
                console.log(err);
                sap.m.MessageToast.show("AI is not responding")

            }
        }
    });
});