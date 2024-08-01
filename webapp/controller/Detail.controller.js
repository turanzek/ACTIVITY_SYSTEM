sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"../model/formatter",
	"sap/m/library"
], function (BaseController, JSONModel, formatter, mobileLibrary) {
	"use strict";

	// shortcut for sap.m.URLHelper
	var URLHelper = mobileLibrary.URLHelper;

	return BaseController.extend("zint.activity.system.controller.Detail", {

		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		onInit : function () {
			// Model used to manipulate control states. The chosen values make sure,
			// detail page is busy indication immediately so there is no break in
			// between the busy indication for loading the view's meta data
			var oViewModel = new JSONModel({
				busy : false,
				delay : 0,
				lineItemListTitle : this.getResourceBundle().getText("detailLineItemTableHeading")
			});

			this.getRouter().getRoute("detail").attachPatternMatched(this._onObjectMatched, this);

			this.setModel(oViewModel, "detailView");

			this.getOwnerComponent().getModel().metadataLoaded().then(this._onMetadataLoaded.bind(this));
		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		/**
		 * Event handler when the share by E-Mail button has been clicked
		 * @public
		 */
		onSendEmailPress : function () {
			var oViewModel = this.getModel("detailView");

			URLHelper.triggerEmail(
				null,
				oViewModel.getProperty("/shareSendEmailSubject"),
				oViewModel.getProperty("/shareSendEmailMessage")
			);
		},


		/**
		 * Updates the item count within the line item table's header
		 * @param {object} oEvent an event containing the total number of items in the list
		 * @private
		 */
		onListUpdateFinished : function (oEvent) {
			var sTitle,
				iTotalItems = oEvent.getParameter("total"),
				oViewModel = this.getModel("detailView");

			// only update the counter if the length is final
			if (this.byId("lineItemsList").getBinding("items").isLengthFinal()) {
				if (iTotalItems) {
					sTitle = this.getResourceBundle().getText("detailLineItemTableHeadingCount", [iTotalItems]);
				} else {
					//Display 'Line Items' instead of 'Line items (0)'
					sTitle = this.getResourceBundle().getText("detailLineItemTableHeading");
				}
				oViewModel.setProperty("/lineItemListTitle", sTitle);
			}
		},

		/* =========================================================== */
		/* begin: internal methods                                     */
		/* =========================================================== */

		/**
		 * Binds the view to the object path and expands the aggregated line items.
		 * @function
		 * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
		 * @private
		 */
		_onObjectMatched : function (oEvent) {

//var app = sap.ui.getCore().byId("splitApp");
var oMasterList = sap.ui.getCore().byId("idMasterList");
var oSelItem = oMasterList.getSelectedItem();

var sPath = oSelItem.oBindingContexts.druginfo.sPath; 
var oItem = sap.ui.getCore().getModel("activityModel").getProperty(sPath);
var oSelModel = new sap.ui.model.json.JSONModel(oItem) ;
sap.ui.getCore().setModel(oSelModel, "SelectedItem");



			var sMonth =  oEvent.getParameter("arguments").Month;
			// var sYear =  this.getView().byId("masterlist").getBinding("items").getContexts()[0].getObject().Year;
			this.getModel("appView").setProperty("/layout", "TwoColumnsMidExpanded");
			this.getModel().metadataLoaded().then( function() {
				var sDetailPath = this.getModel().createKey("/ActivityDetailsSet", {
					ActivityMonth :   parseInt(sMonth, 10),
					Guid: 'GUID_DEFAULT',
					Pernr: 'ZTURAN',
					ProjectCode: 'GM01',
					ActivityYear: '2024',
				});
				this._bindView(sDetailPath);

				// var oModel = this.getModel();
				// var sMonth =  oEvent.getParameter("arguments").Month;
				// var sYear  = '2024';//oEvent.getParameter("arguments").Year;

				// oModel.metadataLoaded().then(function () {
				// 	var oView = this.getView(),
				// 		sPath = "/" + this.getModel().createKey("ActivityDaysSet", {

							
				// 			Guid: "GUID_DEFAULT",
				// 			Year: sYear,
				// 			Month: sMonth,
				// 		});
				// 	oView.bindElement({
				// 		path: sPath,
				// 		parameters: {
				// 			expand: "ActivityDetails"
				// 		},
				// 		events: {
				// 			dataRequested: function () {
				// 				oView.setBusy(true);
				// 			},
				// 			dataReceived: function () {
				// 				oView.setBusy(false);
				// 			}
				// 		}
				// 	});




					// events: {
					// 	dataRequested: function () {
					// 		this.getView().setBusy(true);
					// 	},
					// 	dataReceived: function () {
					// 		this.getView().setBusy(false);
					// 	}
				// 	// }
				// });



			}.bind(this));
		},

		/**
		 * Binds the view to the object path. Makes sure that detail view displays
		 * a busy indicator while data for the corresponding element binding is loaded.
		 * @function
		 * @param {string} sDetailPath path to the object to be bound to the view.
		 * @private
		 */
		_bindView : function (sDetailPath) {
			// Set busy indicator during view binding
			var oViewModel = this.getModel("detailView");

			// If the view was not bound yet its not busy, only if the binding requests data it is set to busy again
			oViewModel.setProperty("/busy", false);

			this.getView().bindElement({
				path : sDetailPath,
				// events: {
				// 	change : this._onBindingChange.bind(this),
				// 	dataRequested : function () {
				// 		oViewModel.setProperty("/busy", true);
				// 	},
				// 	dataReceived: function () {
				// 		oViewModel.setProperty("/busy", false);
				// 	}
				// }
			});
		},

		_onBindingChange : function () {
			var oView = this.getView(),
				oElementBinding = oView.getElementBinding();

			// No data for the binding
			if (!oElementBinding.getBoundContext()) {
				this.getRouter().getTargets().display("detailObjectNotFound");
				// if object could not be found, the selection in the master list
				// does not make sense anymore.
				this.getOwnerComponent().oListSelector.clearMasterListSelection();
				return;
			}

			var sPath = oElementBinding.getPath(),
				oResourceBundle = this.getResourceBundle(),
				oDetail = oView.getModel().getObject(sPath),
				sMonth = oDetail.ActivityMonth,
				oDetailName = oDetail.ActivityMonthName,
				oViewModel = this.getModel("detailView");

			this.getOwnerComponent().oListSelector.selectAListItem(sPath);

			oViewModel.setProperty("/shareSendEmailSubject",
				oResourceBundle.getText("shareSendEmailObjectSubject", [sMonth]));
			oViewModel.setProperty("/shareSendEmailMessage",
				oResourceBundle.getText("shareSendEmailObjectMessage", [oDetailName, sMonth, location.href]));
		},

		_onMetadataLoaded : function () {
			// Store original busy indicator delay for the detail view
			var iOriginalViewBusyDelay = this.getView().getBusyIndicatorDelay(),
				oViewModel = this.getModel("detailView"),
				oLineItemTable = this.byId("lineItemsList"),
				iOriginalLineItemTableBusyDelay = oLineItemTable.getBusyIndicatorDelay();

			// Make sure busy indicator is displayed immediately when
			// detail view is displayed for the first time
			oViewModel.setProperty("/delay", 0);
			oViewModel.setProperty("/lineItemTableDelay", 0);

			oLineItemTable.attachEventOnce("updateFinished", function() {
				// Restore original busy indicator delay for line item table
				oViewModel.setProperty("/lineItemTableDelay", iOriginalLineItemTableBusyDelay);
			});

			// Binding the view will set it to not busy - so the view is always busy if it is not bound
			oViewModel.setProperty("/busy", true);
			// Restore original busy indicator delay for the detail view
			oViewModel.setProperty("/delay", iOriginalViewBusyDelay);
		},

		/**
		 * Set the full screen mode to false and navigate to master page
		 */
		onCloseDetailPress: function () {
			this.getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen", false);
			// No item should be selected on master after detail page is closed
			this.getOwnerComponent().oListSelector.clearMasterListSelection();
			this.getRouter().navTo("master");
		},

		/**
		 * Toggle between full and non full screen mode.
		 */
		toggleFullScreen: function () {
			var bFullScreen = this.getModel("appView").getProperty("/actionButtonsInfo/midColumn/fullScreen");
			this.getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen", !bFullScreen);
			if (!bFullScreen) {
				// store current layout and go full screen
				this.getModel("appView").setProperty("/previousLayout", this.getModel("appView").getProperty("/layout"));
				this.getModel("appView").setProperty("/layout", "MidColumnFullScreen");
			} else {
				// reset to previous layout
				this.getModel("appView").setProperty("/layout",  this.getModel("appView").getProperty("/previousLayout"));
			}
		}
	});

});