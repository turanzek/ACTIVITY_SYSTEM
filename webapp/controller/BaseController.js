sap.ui.define(
	["sap/ui/core/mvc/Controller", "sap/ui/core/routing/History", "sap/m/MessageToast",],
	function (Controller, History, MessageToast,) {
		"use strict";

		var sAddLineCodeId;
		var sAddLineNameId;

		return Controller.extend("zint.activity.system.controller.BaseController", {
			/**
			 * Convenience method for accessing the router in every controller of the application.
			 * @public
			 * @returns {sap.ui.core.routing.Router} the router for this component
			 */
			iSelectedIndex: {},

			getRouter: function () {
				return this.getOwnerComponent().getRouter();
			},

			/**
			 * Convenience method for getting the view model by name in every controller of the application.
			 * @public
			 * @param {string} sName the model name
			 * @returns {sap.ui.model.Model} the model instance
			 */
			getModel: function (sName) {
				return this.getView().getModel(sName);
			},

			/**
			 * Convenience method for setting the view model in every controller of the application.
			 * @public
			 * @param {sap.ui.model.Model} oModel the model instance
			 * @param {string} sName the model name
			 * @returns {sap.ui.mvc.View} the view instance
			 */
			setModel: function (oModel, sName) {
				return this.getView().setModel(oModel, sName);
			},

			/**
			 * Convenience method for getting the resource bundle.
			 * @public
			 * @returns {sap.ui.model.resource.ResourceModel} the resourceModel of the component
			 */
			getResourceBundle: function () {
				return this.getOwnerComponent().getModel("i18n").getResourceBundle();
			},

			/**
			 * Event handler for navigating back.
			 * It there is a history entry we go one step back in the browser history
			 * If not, it will replace the current entry of the browser history with the master route.
			 * @public
			 */
			onNavBack: function () {
				var sPreviousHash = History.getInstance().getPreviousHash();

				if (sPreviousHash !== undefined) {
					history.go(-1);
				} else {
					this.getRouter().navTo("master", {}, true);
				}
			},

			onCostDateChange: function (oEvent) {
				var oDatePicker = oEvent.getSource();
				var sSelectedDate = oDatePicker.getDateValue();
				sSelectedDate.setHours(3, 0, 0);

				var oModel = this.getView().getModel();

				this.byId("inputProjectCodeCost").setValue("");
				this.byId("inputProjectNameCost").setValue("");



				return new Promise(function (resolve) {
				oModel.callFunction("/FilterProjects", { 
					method: "GET", 
					urlParameters: {
						DATE: sSelectedDate 
					},
					success: function(oData, response) {
						this.byId("inputProjectCodeCost").setEditable(true);;
						this.getOwnerComponent().getModel("projectValueHelp").setProperty("/list", oData.results);
						resolve("");
					}.bind(this),
					error: function(oError) {
						this.getOwnerComponent().getModel("projectValueHelp").setProperty("/list",  [] );
						sap.m.MessageBox.error(this.parseErrorMessage(oError), {
							title: "Error",
							onClose: function () {
								resolve();
							}
						});
					}.bind(this)
				});
			}.bind(this));
			},

			handleInputProjectCodeValueHelp: function (oEvent) {

				// var aProjectModelData = oProjectModel.getData().list;

				// var oProjectValueHelpModel = new sap.ui.model.json.JSONModel();
				// var aValueHelpProjectCode = [];
				// var oValueHelpProjectCode = {};

				// var oSelectProjectModel = this.getOwnerComponent().getModel("projectValueHelp");

				sAddLineCodeId = oEvent.getSource().getId();
				sAddLineNameId = sAddLineCodeId.replace("inputProjectCode", "inputProjectName");;
				var bAddLineAct = sAddLineCodeId.includes("lineItemsList");
		
				if (this.byId("entryActivity") || bAddLineAct){
					var oProjectCodeModel = this.getOwnerComponent().getModel("projectCodeModel");
					this.getView().setModel(oProjectCodeModel, "projectValueHelp");
				}else{
					var oProjectValueHelp = this.getOwnerComponent().getModel("projectValueHelp"); 
					this.getView().setModel(oProjectValueHelp, "projectValueHelp");
				}
				
				
				
				var oBindingContext = oEvent
					.getSource()
					.getBindingContext("detailModel");
				if (oBindingContext) {
					// this.iSelectedIndex = oBindingContext.getPath().substring(1);

					this.iSelectedIndex = oEvent
						.getSource()
						.getBindingContext("detailModel")
						.getPath()
						.substring(1, 3);
				} else {
					this.iSelectedIndex = null;
				}

				if (!this._oDialogProjectCode) {
					this._oDialogProjectCode = sap.ui.xmlfragment(
						"zint.activity.system.fragment.SelectProjectCode",
						this
					);
				}

				this.getView().addDependent(this._oDialogProjectCode);
				jQuery.sap.syncStyleClass(
					"sapUiSizeCompact",
					this.getView(),
					this._oDialogProjectCode
				);
				this._oDialogProjectCode.open();
			},

			handleCloseSelectProject: function (oEvent) {
				var sValueCode,
				 	sValueName;

				//  var oModel = this.getView().getModel();
				//  oModel.setDefaultBindingMode(sap.ui.model.BindingMode.TwoWay);

				if (this.byId("entryCost")) {
                    sValueCode = "inputProjectCodeCost";
					sValueName = "inputProjectNameCost";
				}
			    else if (this.byId("entryActivity")) {
					sValueCode = "inputProjectCodeAct";
					sValueName = "inputProjectNameAct";
                }
				else{
					sValueCode = sAddLineCodeId;
					sValueName = sAddLineNameId;
				}

				var aSelectedItems = oEvent.getParameter("selectedContexts");
				if (aSelectedItems && aSelectedItems.length > 0) {
					// Bind the selected value to the specific row if the index is set
					if (this.iSelectedIndex !== null) {
						var oDetailModel = this.getView().getModel("detailModel");
						var aDetails = oDetailModel.getData();

						aDetails[this.iSelectedIndex].ProjectCode =
							aSelectedItems[0].getObject().ProjectCode;
						aDetails[this.iSelectedIndex].ProjectName =
							aSelectedItems[0].getObject().ProjectName;

						oDetailModel.setData(aDetails);
					}

				if (sValueCode.includes("lineItemsList")){
					var oLine= this.byId(sAddLineCodeId);
					var oContext = oLine.getBindingContext();
					var sPath = oContext.getPath();
					var oPreviousDatas = oContext.getModel().getProperty(sPath);
					oContext.getModel().setProperty(sPath + "/ProjectCode", aSelectedItems[0].getObject().ProjectCode);
					oContext.getModel().setProperty(sPath + "/ProjectName", aSelectedItems[0].getObject().ProjectName);
					oContext.getModel().setProperty(sPath + "/ActivityDuration", oPreviousDatas.ActivityDuration);
					oContext.getModel().setProperty(sPath + "/CostDetails", oPreviousDatas.CostDetails); 
					oContext.getModel().setProperty(sPath + "/ActivityDate", oPreviousDatas.ActivityDate); 
					oContext.getModel().setProperty(sPath + "/Weekend", oPreviousDatas.Weekend); 

				
				}

				else{				
				var oProjectCode = this.byId(sValueCode);
				oProjectCode.setValue(aSelectedItems[0].getObject().ProjectCode);

				var oProjectName = this.byId(sValueName);
				oProjectName.setValue(aSelectedItems[0].getObject().ProjectName);
			
				// // Close the dialog
				// if (this._oDialogProjectCode && this._oDialogProjectCode instanceof sap.m.TableSelectDialog) {
				//     this._oDialogProjectCode.close();
				// }
			}
			
				var oSelectedProject = { ProjectCode: aSelectedItems[0].getObject().ProjectCode ,
										ProjectName: aSelectedItems[0].getObject().ProjectName };
				this.getOwnerComponent().setSelectedProject(oSelectedProject);
				
				// this._oDialogProjectCode.close();
			}
				
				
			},
			handleSearchSelectProject: function (oEvent) {
				var sValue = oEvent.getParameter("value");
				var oFilter = new Filter(
					"ProjectCode",
					sap.ui.model.FilterOperator.Contains,
					sValue
				);
				var oBinding = oEvent.getSource().getBinding("items");
				oBinding.filter([oFilter]);
			},


			handleInputCostTypeValueHelp: function (oEvent) {
				var oCostTypeModel =
					this.getOwnerComponent().getModel("costTypeModel");
				// var aCostTypeModelData = oCostTypeModel.getData().list;

				// var oCostTypeHelpModel = new sap.ui.model.json.JSONModel();
				// var aValueHelpCostType = [];
				// var oValueHelpCostType = {};

				this.getView().setModel(oCostTypeModel, "costTypeValueHelp");

				var oBindingContext = oEvent
					.getSource()
					.getBindingContext("detailModel");
				if (oBindingContext) {
					// this.iSelectedIndex = oBindingContext.getPath().substring(1);

					this.iSelectedIndex = oEvent
						.getSource()
						.getBindingContext("detailModel")
						.getPath()
						.substring(1, 3);
				} else {
					this.iSelectedIndex = null;
				}

				if (!this._oDialogCostType) {
					this._oDialogCostType = sap.ui.xmlfragment(
						"zint.activity.system.fragment.SelectCostType",
						this
					);
				}

				this.getView().addDependent(this._oDialogCostType);
				jQuery.sap.syncStyleClass(
					"sapUiSizeCompact",
					this.getView(),
					this._oDialogCostType
				);
				this._oDialogCostType.open();
			},

			handleCloseSelectCostType: function (oEvent) {
				var aSelectedItems = oEvent.getParameter("selectedContexts");
				if (aSelectedItems && aSelectedItems.length > 0) {
					// Bind the selected value to the specific row if the index is set
					if (this.iSelectedIndex !== null) {
						var oDetailModel = this.getView().getModel("detailModel");
						var aDetails = oDetailModel.getData();

						aDetails[this.iSelectedIndex].Cos =
							aSelectedItems[0].getObject().CostType;
						aDetails[this.iSelectedIndex].CostType=
							aSelectedItems[0].getObject().CostName;

						oDetailModel.setData(aDetails);
					}
				

				var oCostType = this.byId("inputCostType");
				oCostType.setValue(aSelectedItems[0].getObject().CostType);

				var oCostName = this.byId("inputCostName");
				oCostName.setValue(aSelectedItems[0].getObject().CostName);
			}

			},
			handleSearchSelectCostType: function (oEvent) {
				var sValue = oEvent.getParameter("value");
				var oFilter = new Filter(
					"CostType",
					sap.ui.model.FilterOperator.Contains,
					sValue
				);
				var oBinding = oEvent.getSource().getBinding("items");
				oBinding.filter([oFilter]);
			},
			parseErrorMessage: function (oError) {

				var oResourceBundle = this.getResourceBundle();
				try {
					var sErrorMessage = JSON.parse(oError.responseText).error.innererror.errordetails[0].message;
				} catch (error) {
					sErrorMessage = oResourceBundle.getText("TechnicalErrorHappenedMessage");
				}
	
				return sErrorMessage;
	
			},

			updateModel: function (oNewEntry,sSource) {

				if (sSource === "details") {
					var oDetailModel = this.getView().getModel("detailModel");
					var oDetailModelData = oDetailModel.getData();
	
					
				} else {
					
				}
			},


		});
	}
);
