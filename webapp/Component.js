sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/Device",
	"./model/models",
	"./controller/ListSelector",
	"./controller/ErrorHandler"
], function (UIComponent, Device, models, ListSelector, ErrorHandler) {
	"use strict";

	return UIComponent.extend("zint.activity.system.Component", {

		metadata : {
			manifest : "json"
		},

		/**
		 * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
		 * In this method, the device models are set and the router is initialized.
		 * @public
		 * @override
		 */
		init : function () {
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

			var odataModel = this.getModel();
			var oMainModel = new sap.ui.model.json.JSONModel();
			var oProjectCodeModel = new sap.ui.model.json.JSONModel();
			var oActivityDaysModel = new sap.ui.model.json.JSONModel();
			this.setModel(oMainModel, "mainModel");
			this.setModel(oProjectCodeModel, "projectCodeModel");
			this.setModel(oActivityDaysModel, "activityDaysModel");
			
			odataModel.setUseBatch(true);
			odataModel.setDeferredGroups(["group1"]);
			
			// Yapılacak okuma işlemlerini batch grubuna ekleyin
			odataModel.read("/ProjectSet", {
				groupId: "group1",
				// Hata ayıklama amacıyla loglama
				success: function(oData) {
					console.log("ProjectSet read success");
				},
				error: function(oError) {
					console.error("ProjectSet read error", oError);
				}
			});
			
			odataModel.read("/ActivityDaysSet", {
				groupId: "group1",
				// Hata ayıklama amacıyla loglama
				success: function(oData) {
					console.log("ActivityDaysSet read success");
				},
				error: function(oError) {
					console.error("ActivityDaysSet read error", oError);
				}
			});
			
			// Batch işlemini gönder
			odataModel.submitChanges({
				groupId: "group1",
				success: function(oData) {
					console.log("Batch submitChanges success");
			
					var aProjectCode = [];
					var aActivityDays = [];
			
					// OData sonuçlarının işlenmesi
					if (oData.__batchResponses && oData.__batchResponses.length > 0) {
						aProjectCode = oData.__batchResponses[0].data.results;
						if (oData.__batchResponses.length > 1) {
							aActivityDays = oData.__batchResponses[1].data.results;
						}
			
						oProjectCodeModel.setData({
							list: aProjectCode
						});
			
						oActivityDaysModel.setData({
							list: aActivityDays
						});
					} else {
						console.warn("No batch responses found");
					}
				},
				error: function(oError) {
					console.error("Batch submitChanges error", oError);
				}
			});



            // var odataModel = this.getModel();
			// var oMainModel = new sap.ui.model.json.JSONModel();
            // var oProjectCodeModel= new sap.ui.model.json.JSONModel();
			// var oActivityDaysModel= new sap.ui.model.json.JSONModel();
			// this.setModel(oMainModel, "mainModel");
			// this.setModel(oProjectCodeModel, "projectCodeModel");
			// this.setModel(oActivityDaysModel, "activityDaysModel");
			
            

            // odataModel.setUseBatch(true);
			// odataModel.setDeferredGroups(["group1"]);

			// odataModel.read("/ProjectSet", {
			// 	groupId: "group1"
			// });

<<<<<<< HEAD
			// odataModel.read("/ActivityDaysSet", {
			// 	groupId: "group1"
			// });
=======
>>>>>>> 6c91c6e62d6f9ecaa1d61fabbb7702452761b8a0


            // odataModel.submitChanges({
			// 	groupId: "group1",
			// 	success: function (oData) {

<<<<<<< HEAD
			// 		var aProjectCode= [];
			// 		var aActivityDays= [];
                  

			// 		aProjectCode = oData.__batchResponses[0].data.results;
			// 		aActivityDays = oData.__batchResponses[1].data.results;

			// 		oProjectCodeModel.setData({
			// 			list: aProjectCode
			// 		});

			// 		oActivityDaysModel.setData({
			// 			list: aActivityDays
			// 		});

  
=======
					var aProjectCode= [];
                  

					aProjectCode = oData.__batchResponses[0].data.results;

					oProjectCodeModel.setData({
						list: aProjectCode
					});  
>>>>>>> 6c91c6e62d6f9ecaa1d61fabbb7702452761b8a0

			// 	}.bind(this),
			// 	error: function () { }
			// });


         },

		/**
		 * The component is destroyed by UI5 automatically.
		 * In this method, the ListSelector and ErrorHandler are destroyed.
		 * @public
		 * @override
		 */
		destroy : function () {
			this.oListSelector.destroy();
			this._oErrorHandler.destroy();
			// call the base component's destroy function
			UIComponent.prototype.destroy.apply(this, arguments);
		},

		/**
		 * This method can be called to determine whether the sapUiSizeCompact or sapUiSizeCozy
		 * design mode class should be set, which influences the size appearance of some controls.
		 * @public
		 * @return {string} css class, either 'sapUiSizeCompact' or 'sapUiSizeCozy' - or an empty string if no css class should be set
		 */
		getContentDensityClass : function() {
			if (this._sContentDensityClass === undefined) {
				// check whether FLP has already set the content density class; do nothing in this case
				if (document.body.classList.contains("sapUiSizeCozy") || document.body.classList.contains("sapUiSizeCompact")) {
					this._sContentDensityClass = "";
				} else if (!Device.support.touch) { // apply "compact" mode if touch is not supported
					this._sContentDensityClass = "sapUiSizeCompact";
				} else {
					// "cozy" in case of touch support; default for most sap.m controls, but needed for desktop-first controls like sap.ui.table.Table
					this._sContentDensityClass = "sapUiSizeCozy";
				}
			}
			return this._sContentDensityClass;
		}

	});
});
