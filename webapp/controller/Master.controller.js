sap.ui.define(
	[
		"./BaseController",
		"sap/ui/model/json/JSONModel",
		"sap/ui/model/Filter",
		"sap/ui/model/Sorter",
		"sap/ui/model/FilterOperator",
		"sap/m/GroupHeaderListItem",
		"sap/ui/Device",
		"sap/ui/core/Fragment",
		"../model/formatter",
		"sap/ui/commons/Message",
		"sap/m/MessageBox",
		"sap/m/MessageToast",
	],
	function (
		BaseController,
		JSONModel,
		Filter,
		Sorter,
		FilterOperator,
		GroupHeaderListItem,
		Device,
		Fragment,
		formatter,
		Message,
		MessageBox,
		MessageToast
	) {
		"use strict";

		return BaseController.extend("zint.activity.system.controller.Master", {
			formatter: formatter,
			_aProjectLists: [],

					onInit: function () {
				
				var oList = this.byId("masterlist"),
					oViewModel = this._createViewModel(),
					iOriginalBusyDelay = oList.getBusyIndicatorDelay();
				this._oList = oList;
				this._oListFilterState = {
					aFilter: [],
					aSearch: [],
				};

				this.setModel(oViewModel, "masterView");
				oList.attachEventOnce("updateFinished", function () {
					oViewModel.setProperty("/delay", iOriginalBusyDelay);
				});

				this.getView().addEventDelegate({
					onBeforeFirstShow: function () {
						this.getOwnerComponent().oListSelector.setBoundMasterList(oList);
					}.bind(this),
				});

				this.getRouter()
					.getRoute("master")
					.attachPatternMatched(this._onMasterMatched, this);
				this.getRouter().attachBypassed(this.onBypassed, this);
			},

			/* =========================================================== */
			/* event handlers                                              */
			/* =========================================================== */

			
			onUpdateFinished: function (oEvent) {
				// update the master list object counter after new data is loade
				this._updateListItemCount(oEvent.getParameter("total"));
				var oMasterData = this.getView()
					.byId("masterlist")
					.getBinding("items")
					.getContexts()[0]
					.getObject();
				var oPersonnelModel = new sap.ui.model.json.JSONModel();
				this.setModel(oPersonnelModel, "personnelModel");

				oPersonnelModel.setData({
					Pernr: oMasterData.Pernr,
					PersonnelName: oMasterData.PersonnelName,
					PersonnelSurname: oMasterData.PersonnelSurname,
					Year: oMasterData.Year,
				});
			},

			
			onSearch: function (oEvent) {
				if (oEvent.getParameters().refreshButtonPressed) {
					this.onRefresh();
					return;
				}

				var sQuery = oEvent.getParameter("query");

				if (sQuery) {
					this._oListFilterState.aSearch = [
						new Filter("MonthName", FilterOperator.EQ, sQuery),
					];
				} else {
					this._oListFilterState.aSearch = [];
				}
				this._applyFilterSearch();
			},

			onRefresh: function () {
				this._oList.getBinding("items").refresh();
			},


			onOpenViewSettings: function (oEvent) {
				var sDialogTab = "filter";
				if (oEvent.getSource() instanceof sap.m.Button) {
					var sButtonId = oEvent.getSource().getId();
					if (sButtonId.match("sort")) {
						sDialogTab = "sort";
					} else if (sButtonId.match("group")) {
						sDialogTab = "group";
					}
				}

				if (!this.byId("viewSettingsDialog")) {
					Fragment.load({
						id: this.getView().getId(),
						name: "zint.activity.system.view.ViewSettingsDialog",
						controller: this,
					}).then(
						function (oDialog) {
							this.getView().addDependent(oDialog);
							oDialog.addStyleClass(
								this.getOwnerComponent().getContentDensityClass()
							);
							oDialog.open(sDialogTab);
						}.bind(this)
					);
				} else {
					this.byId("viewSettingsDialog").open(sDialogTab);
				}
			},


			onSelectionChange: function (oEvent) {
				var oList = oEvent.getSource(),
					bSelected = oEvent.getParameter("selected");

				if (!(oList.getMode() === "MultiSelect" && !bSelected)) {

					this._showDetail(
						oEvent.getParameter("listItem") || oEvent.getSource()
					);
				}
			},


			onBypassed: function () {
				this._oList.removeSelections(true);
			},

			createGroupHeader: function (oGroup) {
				return new GroupHeaderListItem({
					title: oGroup.text,
					upperCase: false,
				});
			},

			onNavBack: function () {
				history.go(-1);
			},

			/* =========================================================== */
			/* begin: internal methods                                     */
			/* =========================================================== */

			_createViewModel: function () {
				return new JSONModel({
					isFilterBarVisible: false,
					filterBarLabel: "",
					delay: 0,
					title: this.getResourceBundle().getText("masterTitleCount", [0]),
					noDataText: this.getResourceBundle().getText("masterListNoDataText"),
					sortBy: "Name",
					groupBy: "None",
				});
			},

			_onMasterMatched: function () {
				this.getModel("appView").setProperty("/layout", "OneColumn");
			},

			_showDetail: function (oItem) {
				var oContext = oItem.getBindingContext();
				var sMonth = oContext.getProperty("Month");
				var sGuid = oContext.getProperty("Guid");
				var sPernr = oContext.getProperty("Pernr");
				var sActivityYear = oContext.getProperty("Year");
				var oActivityDaysModel = this.getOwnerComponent().getModel("activityDaysModel");

				var oActivityDay = {
					Month: sMonth,
					Guid: sGuid,
					Pernr: sPernr,
					ActivityYear: sActivityYear,
				};

				oActivityDaysModel.setData({
					selectedItem: oActivityDay,
				});

				var bReplace = !Device.system.phone;
				this.getModel("appView").setProperty(
					"/layout",
					"TwoColumnsMidExpanded"
				);
				this.getRouter().navTo(
					"detail",
					{
						Month: sMonth,
						Guid: "GUID_DEFAULT",
						Pernr: sPernr,
						ActivityYear: sActivityYear,
					},
					bReplace
				);
			},


			_updateListItemCount: function (iTotalItems) {
				var sTitle;
				var sYear;
				if (this._oList.getBinding("items").isLengthFinal()) {
					sYear = this.getView()
						.byId("masterlist")
						.getBinding("items")
						.getContexts()[0]
						.getObject().Year;
					sTitle = sYear + "  (" + iTotalItems + ")";
					this.getModel("masterView").setProperty("/title", sTitle);
				}
			},


			_applyFilterSearch: function () {
				var aFilters = this._oListFilterState.aSearch.concat(
						this._oListFilterState.aFilter
					),
					oViewModel = this.getModel("masterView");
				this._oList.getBinding("items").filter(aFilters, "Application");
				if (aFilters.length !== 0) {
					oViewModel.setProperty(
						"/noDataText",
						this.getResourceBundle().getText(
							"masterListNoDataWithFilterOrSearchText"
						)
					);
				} else if (this._oListFilterState.aSearch.length > 0) {
					oViewModel.setProperty(
						"/noDataText",
						this.getResourceBundle().getText("masterListNoDataText")
					);
				}
			},

			onPressEntryActivityButton: function () {
				var oView = this.getView();

				if (!this.byId("entryActivity")) {
					Fragment.load({
						id: oView.getId(),
						name: "zint.activity.system.fragment.AddActivity",
						controller: this,
					}).then(
						function (oDialog) {
							oView.addDependent(oDialog);
							oDialog.data("sourceFragment", "AddActivity");
							oDialog.open();
							this._dialog = oDialog;
						}.bind(this)
					);
				} else {
					this.byId("entryActivity").open();
				}
			},

			onPressEntryCostButton: function () {
				var oView = this.getView();

				if (!this.byId("entryCost")) {
					Fragment.load({
						id: oView.getId(),
						name: "zint.activity.system.fragment.AddCost",
						controller: this,
					}).then(
						function (oDialog) {
							oView.addDependent(oDialog);
							oDialog.data("sourceFragment", "AddCost");
							oDialog.open();
							this._dialog = oDialog;
						}.bind(this)
					);
				} else {
					this.byId("entryCost").open();
				}
			},

			onSaveActivity: function () {
				var oMasterData = this.getView()
					.byId("masterlist")
					.getBinding("items")
					.getContexts()[0]
					.getObject();
				var ui5Date = this.getView()
					.byId("inputActivityMasterDate")
					.getDateValue();
				if (ui5Date) {
					ui5Date.setHours(3, 0, 0);
				}

				var sDate = this.getView().byId("inputActivityMasterDate").getValue();
				if (sDate.substring(1, 2) == ".") {
					var sMonth = sDate.substring(2, 4);
				} else {
					sMonth = sDate.substring(3, 5);
				}

				var oActivityDays = {
					Guid: "GUID_DEFAULT",
					Pernr: oMasterData.Pernr,
					PersonnelName: oMasterData.PersonnelName,
					PersonnelSurname: oMasterData.PersonnelSurname,
					Month: sMonth,
					MonthName: "",
					Year: oMasterData.Year,
					Status: "MASTER",
					ActivityDetails: [
						{
							Guid: "GUID_DEFAULT",
							Pernr: oMasterData.Pernr,
							PersonnelName: oMasterData.PersonnelName,
							PersonnelSurname: oMasterData.PersonnelSurname,
							ActivityDate: ui5Date,
							ProjectCode: this.getView().byId("inputProjectCode").getValue(),
							ProjectName: this.getView().byId("inputProjectName").getValue(),
							ActivityMonth: sMonth,
							ActivityMonthName: "",
							ActivityYear: oMasterData.Year,
							ActivityDuration: parseFloat(
								this.getView().byId("inputActivityHour").getValue()
							).toFixed(2),
							Description: this.getView().byId("inputDescription").getValue(),
							CostDetails: [],
						},
					],
				};

				if (this.getView().byId("inputActivityMasterDate").getValue() === "") {
					this.getView().byId("inputActivityMasterDate").setValueState("Error");
					MessageBox.error("Fill the activity date.");
					return false;
				}

				if (this.getView().byId("inputProjectCode").getValue() === "") {
					this.getView().byId("inputProjectCode").setValueState("Error");
					MessageBox.error("Fill the project code.");
					return false;
				}

				if (this.getView().byId("inputActivityHour").getValue() === "") {
					this.getView().byId("inputActivityHour").setValueState("Error");
					MessageBox.error("Fill the activity hour.");
					return false;
				}

				this.BusyDialog = new sap.m.BusyDialog({});
				this.BusyDialog.open();
				this.getOwnerComponent()
					.getModel()
					.create("/ActivityDaysSet", oActivityDays, {
						urlParameters: {
							expand: "ActivityDetails",
							// refreshAfterChange: true
						},
						success: function () {
							var Msg = "Activity entry is successfull.";
							// this.getView().getModel().refresh(true);
							MessageBox.show(Msg);
							this.BusyDialog.close();
							this.byId("entryActivity").destroy();
						}.bind(this),
						error: function (error) {
							MessageBox.error(
								JSON.parse(error.responseText).error.message.value
							);
							this.BusyDialog.close();
						}.bind(this),
					});
			},

			onPressCancelActivity: function () {
				this.byId("entryActivity").destroy();
			},

			onSaveCostType: function () {
				var sActivityDate = this.getView()
					.byId("inputActivityMasterDateCost")
					.getValue();
				var oMasterData = this.getView()
					.byId("masterlist")
					.getBinding("items")
					.getContexts()[0]
					.getObject();
				var ui5Date = this.getView()
					.byId("inputActivityMasterDateCost")
					.getDateValue();
				if (ui5Date) {
					ui5Date.setHours(3, 0, 0);
				}

				var sDate = sActivityDate;
				if (sDate.substring(1, 2) == ".") {
					var sMonth = sDate.substring(2, 4);
				} else {
					sMonth = sDate.substring(3, 5);
				}

				var oActivityDetails = {
					Guid: "GUID_DEFAULT",
					Pernr: oMasterData.Pernr,
					PersonnelName: oMasterData.PersonnelName,
					PersonnelSurname: oMasterData.PersonnelSurname,
					ActivityDate: ui5Date,
					ProjectCode: this.getView().byId("inputProjectCode").getValue(),
					ProjectName: this.getView().byId("inputProjectName").getValue(),
					ActivityMonth: sMonth,
					ActivityMonthName: "",
					ActivityYear: oMasterData.Year,
					CostDetails: [
						{
							ActivityMonth: sMonth,
							CostName: this.getView().byId("inputCostName").getValue(),
							CostType: this.getView().byId("inputCostType").getValue(),
							Guid: "GUID_DEFAULT",
							Pernr: oMasterData.Pernr,
							PersonnelName: oMasterData.PersonnelName,
							PersonnelSurname: oMasterData.PersonnelSurname,
							ActivityYear: oMasterData.Year,
							CostAmount: this.getView().byId("inputCostAmountCost").getValue(),
							ProjectCode: this.getView().byId("inputProjectCode").getValue(),
							ProjectName: this.getView().byId("inputProjectName").getValue(),
							ActivityDate: ui5Date,
							CostCurrency: this.getView()
								.byId("inputCostCurrencyCost")
								.getValue(),
							Description: this.getView()
								.byId("inputDescriptionCost")
								.getValue(),
						},
					],

				};

				if (
					this.getView().byId("inputActivityMasterDateCost").getValue() === ""
				) {
					this.getView()
						.byId("inputActivityMasterDateCost")
						.setValueState("Error");
					MessageBox.error("Fill the activity date.");
					return false;
				}

				if (this.getView().byId("inputProjectCode").getValue() === "") {
					this.getView().byId("inputProjectCode").setValueState("Error");
					MessageBox.error("Fill the project code.");
					return false;
				}

				if (this.getView().byId("inputCostType").getValue() === "") {
					this.getView().byId("inputCostType").setValueState("Error");
					MessageBox.error("Select the cost type.");
					return false;
				}

				if (this.getView().byId("inputCostAmountCost").getValue() === "") {
					this.getView().byId("inputCostAmountCost").setValueState("Error");
					MessageBox.error("Fill the cost amount.");
					return false;
				}

				if (this.getView().byId("inputDescriptionCost").getValue() === "") {
					this.getView().byId("inputDescriptionCost").setValueState("Error");
					MessageBox.error("Fill the description.");
					return false;
				}

				this.BusyDialog = new sap.m.BusyDialog({});
				this.BusyDialog.open();
				this.getOwnerComponent()
					.getModel()
					.create("/ActivityDetailsSet", oActivityDetails, {
						success: function (oData, response) {
							var Msg = "Cost entry is successfull.";
							this.getView().getModel().refresh(true);
							MessageBox.show(Msg);
							this.BusyDialog.close();
							this.byId("entryCost").destroy();
						}.bind(this),
						error: function (error) {
							MessageBox.error(
								JSON.parse(error.responseText).error.message.value
							);
							this.BusyDialog.close();
						}.bind(this),
					});
			},

			onPressCancelCostType: function () {
				this.byId("entryCost").destroy();
			},
		});
	}
);
