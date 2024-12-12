sap.ui.define(
	[
		"sap/ui/core/UIComponent",
		"sap/ui/Device",
		"./model/models",
		"./controller/ListSelector",
		"./controller/ErrorHandler",
	],
	function (UIComponent, Device, models, ListSelector, ErrorHandler) {
		"use strict";
		var oSelectedProject = { ProjectCode: "", ProjectName: "" };
		return UIComponent.extend("zint.activity.system.Component", {
			metadata: {
				manifest: "json",
			},

			/**
			 * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
			 * In this method, the device models are set and the router is initialized.
			 * @public
			 * @override
			 */
			init: function () {
				this.oListSelector = new ListSelector();
				this._oErrorHandler = new ErrorHandler(this);

				// set the device model
				this.setModel(models.createDeviceModel(), "device");

				// call the base component's init function and create the App view
				UIComponent.prototype.init.apply(this, arguments);

				// create the views based on the url/hash
				this.getRouter().initialize();
				this._initApplication();
			},

			_initApplication: function () {
				// var oProjectCodeModel = new sap.ui.model.json.JSONModel();
				// sap.ui.getCore().setModel(oProjectCodeModel , "projectCode");
				// this.setModel(oProjectCodeModel , "projectCode");

				// var path = "/ProjectSet";

				// this.getOwnerComponent().getModel().read(path, {
				//   success: function (oData) {
				// 	var oProjectModel = this.getView().getModel("projectCode");
				// 	oProjectModel.setData(oData.results);
				//   }.bind(this),
				//   error: function (error) { },
				// });

				var odataModel = this.getModel();
				var oMainModel = new sap.ui.model.json.JSONModel();
				var oProjectCodeModel = new sap.ui.model.json.JSONModel();
				var oCostTypeModel = new sap.ui.model.json.JSONModel();
				var oActivityDaysModel = new sap.ui.model.json.JSONModel();
				var oProjectsValueHelpModel = new sap.ui.model.json.JSONModel();
				var oChristmasModeModel = new sap.ui.model.json.JSONModel();
				this.setModel(oMainModel, "mainModel");
				this.setModel(oProjectCodeModel, "projectCodeModel");
				this.setModel(oCostTypeModel, "costTypeModel");
				this.setModel(oActivityDaysModel, "activityDaysModel");
				this.setModel(oProjectsValueHelpModel, "projectValueHelp");
				this.setModel(oChristmasModeModel, "christmasMode");

				oChristmasModeModel.setData({
					christmasMode: true,
				});


				// TODO: Move it to OData Model.
				odataModel.setUseBatch(true);
				odataModel.setDeferredGroups(["group1"]);

				odataModel.read("/ProjectSet", {
					groupId: "group1",
				});

				odataModel.submitChanges({
					groupId: "group1",
					success: function (oData) {
						var aProjectCode = [];

						aProjectCode = oData.__batchResponses[0].data.results;

						oProjectCodeModel.setData({
							list: aProjectCode,
						});
					}.bind(this),
					error: function () {},
				});

				odataModel.setUseBatch(true);
				odataModel.setDeferredGroups(["group1"]);

				odataModel.read("/CostTypesSet", {
					groupId: "group1",
				});

				odataModel.submitChanges({
					groupId: "group1",
					success: function (oData) {
						var aCostTypes = [];

						aCostTypes = oData.__batchResponses[0].data.results;

						oCostTypeModel.setData({
							list: aCostTypes,
						});
					}.bind(this),
					error: function () {},
				});
			},

			/**
			 * The component is destroyed by UI5 automatically.
			 * In this method, the ListSelector and ErrorHandler are destroyed.
			 * @public
			 * @override
			 */
			destroy: function () {
				this.oListSelector.destroy();
				this._oErrorHandler.destroy();
				// call the base component's destroy function
				UIComponent.prototype.destroy.apply(this, arguments);
			},

			getSelectedProject: function () {
				return oSelectedProject;
			},

			setSelectedProject: function (oValue) {
				if (oValue && oValue.ProjectCode && oValue.ProjectName) {
					oSelectedProject = {
						ProjectCode: oValue.ProjectCode,
						ProjectName: oValue.ProjectName,
					};
				} else {
					oSelectedProject = { ProjectCode: "", ProjectName: "" };
				}
			},

			/**
			 * This method can be called to determine whether the sapUiSizeCompact or sapUiSizeCozy
			 * design mode class should be set, which influences the size appearance of some controls.
			 * @public
			 * @return {string} css class, either 'sapUiSizeCompact' or 'sapUiSizeCozy' - or an empty string if no css class should be set
			 */
			getContentDensityClass: function () {
				if (this._sContentDensityClass === undefined) {
					// check whether FLP has already set the content density class; do nothing in this case
					if (
						document.body.classList.contains("sapUiSizeCozy") ||
						document.body.classList.contains("sapUiSizeCompact")
					) {
						this._sContentDensityClass = "";
					} else if (!Device.support.touch) {
						// apply "compact" mode if touch is not supported
						this._sContentDensityClass = "sapUiSizeCompact";
					} else {
						// "cozy" in case of touch support; default for most sap.m controls, but needed for desktop-first controls like sap.ui.table.Table
						this._sContentDensityClass = "sapUiSizeCozy";
					}
				}
				return this._sContentDensityClass;
			},
		});
	}
);
