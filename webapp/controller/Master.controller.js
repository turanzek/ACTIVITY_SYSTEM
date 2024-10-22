sap.ui.define([
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
], function (BaseController, JSONModel, Filter, Sorter, FilterOperator, 
			 GroupHeaderListItem, Device, Fragment, formatter, 
			 Message,MessageBox,MessageToast) {
	"use strict";

	return BaseController.extend("zint.activity.system.controller.Master", {

		formatter: formatter,
		_aProjectLists: [],

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * Called when the master list controller is instantiated. It sets up the event handling for the master/detail communication and other lifecycle tasks.
		 * @public
		 */
		onInit : function () {
	
			// Control state model
			var oList = this.byId("masterlist"),
				oViewModel = this._createViewModel(),
				// Put down master list's original value for busy indicator delay,
				// so it can be restored later on. Busy handling on the master list is
				// taken care of by the master list itself.
				iOriginalBusyDelay = oList.getBusyIndicatorDelay();

			this._oGroupFunctions = {
				UnitNumber : function(oContext) {
					var iNumber = oContext.getProperty('UnitNumber'),
						key, text;
					if (iNumber <= 20) {
						key = "LE20";
						text = this.getResourceBundle().getText("masterGroup1Header1");
					} else {
						key = "GT20";
						text = this.getResourceBundle().getText("masterGroup1Header2");
					}
					return {
						key: key,
						text: text
					};
				}.bind(this)
			};

			this._oList = oList;
			// keeps the filter and search state
			this._oListFilterState = {
				aFilter : [],
				aSearch : []
			};

			
			this.setModel(oViewModel, "masterView");
			




			// Make sure, busy indication is showing immediately so there is no
			// break after the busy indication for loading the view's meta data is
			// ended (see promise 'oWhenMetadataIsLoaded' in AppController)
			oList.attachEventOnce("updateFinished", function(){
				// Restore original busy indicator delay for the list
				oViewModel.setProperty("/delay", iOriginalBusyDelay);
			});

			this.getView().addEventDelegate({
				onBeforeFirstShow: function () {
					this.getOwnerComponent().oListSelector.setBoundMasterList(oList);
				}.bind(this)
			});

			this.getRouter().getRoute("master").attachPatternMatched(this._onMasterMatched, this);
			this.getRouter().attachBypassed(this.onBypassed, this);
		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		/**
		 * After list data is available, this handler method updates the
		 * master list counter
		 * @param {sap.ui.base.Event} oEvent the update finished event
		 * @public
		 */
		onUpdateFinished : function (oEvent) {
			// update the master list object counter after new data is loade
			this._updateListItemCount(oEvent.getParameter("total"));
			var oMasterData = this.getView().byId("masterlist").getBinding("items").getContexts()[0].getObject()
			var oPersonnelModel = new sap.ui.model.json.JSONModel();
			this.setModel(oPersonnelModel, "personnelModel");
			
			oPersonnelModel.setData({
				Pernr: oMasterData.Pernr,
				PersonnelName: oMasterData.PersonnelName,
				PersonnelSurname: oMasterData.PersonnelSurname,
				Year: oMasterData.Year
			})

			// var oProjectCodeModel = new sap.ui.model.json.JSONModel();
			// sap.ui.getCore().setModel(oProjectCodeModel , "projectCode");
			// this.setModel(oProjectCodeModel , "projectCode");

			// var m = this.getOwnerComponent().getModel();

			// var path = "/ProjectSet";
	
			// m.read(path, {
			//   success: function (oData) {
			// 	var oProjectModel = this.getView().getModel("projectCode");
			// 	oProjectModel.setData(oData.results);
			//   }.bind(this),
			//   error: function (error) { },
			// });
		  



			// odataModel.read("/EGITIM_MASRAF_YERISET", {
			// 	groupId: "group1",
			// 	urlParameters: {
			// 		"$expand": ["toOnayci"]
			// 	},
			// 	filters: [
			// 		new sap.ui.model.Filter({
			// 			path: "Usern",
			// 			operator: sap.ui.model.FilterOperator.EQ,
			// 			value1: userId
			// 		}),
			// 		new sap.ui.model.Filter({
			// 			path: "Appty",
			// 			operator: sap.ui.model.FilterOperator.EQ,
			// 			value1: this._appType
			// 		})]
			// });

		},

		/**
		 * Event handler for the master search field. Applies current
		 * filter value and triggers a new search. If the search field's
		 * 'refresh' button has been pressed, no new search is triggered
		 * and the list binding is refresh instead.
		 * @param {sap.ui.base.Event} oEvent the search event
		 * @public
		 */
		onSearch : function (oEvent) {
			if (oEvent.getParameters().refreshButtonPressed) {
				// Search field's 'refresh' button has been pressed.
				// This is visible if you select any master list item.
				// In this case no new search is triggered, we only
				// refresh the list binding.
				this.onRefresh();
				return;
			}

			var sQuery = oEvent.getParameter("query");

			if (sQuery) {
				this._oListFilterState.aSearch = [new Filter("MonthName", FilterOperator.EQ, sQuery)
												
				];
			} else {
				this._oListFilterState.aSearch = [];
			}
			this._applyFilterSearch();

		},

		/**
		 * Event handler for refresh event. Keeps filter, sort
		 * and group settings and refreshes the list binding.
		 * @public
		 */
		onRefresh : function () {
			this._oList.getBinding("items").refresh();
		},

		/**
		 * Event handler for the filter, sort and group buttons to open the ViewSettingsDialog.
		 * @param {sap.ui.base.Event} oEvent the button press event
		 * @public
		 */
		onOpenViewSettings : function (oEvent) {
			var sDialogTab = "filter";
			if (oEvent.getSource() instanceof sap.m.Button) {
				var sButtonId = oEvent.getSource().getId();
				if (sButtonId.match("sort")) {
					sDialogTab = "sort";
				} else if (sButtonId.match("group")) {
					sDialogTab = "group";
				}
			}
			// load asynchronous XML fragment
			if (!this.byId("viewSettingsDialog")) {
				Fragment.load({
					id: this.getView().getId(),
					name: "zint.activity.system.view.ViewSettingsDialog",
					controller: this
				}).then(function(oDialog){
					// connect dialog to the root view of this component (models, lifecycle)
					this.getView().addDependent(oDialog);
					oDialog.addStyleClass(this.getOwnerComponent().getContentDensityClass());
					oDialog.open(sDialogTab);
				}.bind(this));
			} else {
				this.byId("viewSettingsDialog").open(sDialogTab);
			}
		},

		/**
		 * Event handler called when ViewSettingsDialog has been confirmed, i.e.
		 * has been closed with 'OK'. In the case, the currently chosen filters, sorters or groupers
		 * are applied to the master list, which can also mean that they
		 * are removed from the master list, in case they are
		 * removed in the ViewSettingsDialog.
		 * @param {sap.ui.base.Event} oEvent the confirm event
		 * @public
		 */
		onConfirmViewSettingsDialog : function (oEvent) {
			var aFilterItems = oEvent.getParameters().filterItems,
				aFilters = [],
				aCaptions = [];

			// update filter state:
			// combine the filter array and the filter string
			aFilterItems.forEach(function (oItem) {
				switch (oItem.getKey()) {
					case "Filter1" :
						aFilters.push(new Filter("UnitNumber", FilterOperator.LE, 100));
						break;
					case "Filter2" :
						aFilters.push(new Filter("UnitNumber", FilterOperator.GT, 100));
						break;
					default :
						break;
				}
				aCaptions.push(oItem.getText());
			});

			this._oListFilterState.aFilter = aFilters;
			this._updateFilterBar(aCaptions.join(", "));
			this._applyFilterSearch();
			this._applySortGroup(oEvent);
		},

		/**
		 * Apply the chosen sorter and grouper to the master list
		 * @param {sap.ui.base.Event} oEvent the confirm event
		 * @private
		 */
		_applySortGroup: function (oEvent) {
			var mParams = oEvent.getParameters(),
				sPath,
				bDescending,
				aSorters = [];
			// apply sorter to binding
			// (grouping comes before sorting)
			if (mParams.groupItem) {
				sPath = mParams.groupItem.getKey();
				bDescending = mParams.groupDescending;
				var vGroup = this._oGroupFunctions[sPath];
				aSorters.push(new Sorter(sPath, bDescending, vGroup));
			}
			sPath = mParams.sortItem.getKey();
			bDescending = mParams.sortDescending;
			aSorters.push(new Sorter(sPath, bDescending));
			this._oList.getBinding("items").sort(aSorters);
		},

		/**
		 * Event handler for the list selection event
		 * @param {sap.ui.base.Event} oEvent the list selectionChange event
		 * @public
		 */
		onSelectionChange : function (oEvent) {
			var oList = oEvent.getSource(),
				bSelected = oEvent.getParameter("selected");

			// skip navigation when deselecting an item in multi selection mode
			if (!(oList.getMode() === "MultiSelect" && !bSelected)) {
				// get the list item, either from the listItem parameter or from the event's source itself (will depend on the device-dependent mode).
				this._showDetail(oEvent.getParameter("listItem") || oEvent.getSource());
			}
		},

		/**
		 * Event handler for the bypassed event, which is fired when no routing pattern matched.
		 * If there was an object selected in the master list, that selection is removed.
		 * @public
		 */
		onBypassed : function () {
			this._oList.removeSelections(true);
		},

		/**
		 * Used to create GroupHeaders with non-capitalized caption.
		 * These headers are inserted into the master list to
		 * group the master list's items.
		 * @param {Object} oGroup group whose text is to be displayed
		 * @public
		 * @returns {sap.m.GroupHeaderListItem} group header with non-capitalized caption.
		 */
		createGroupHeader : function (oGroup) {
			return new GroupHeaderListItem({
				title : oGroup.text,
				upperCase : false
			});
		},

		/**
		 * Event handler for navigating back.
		 * We navigate back in the browser historz
		 * @public
		 */
		onNavBack : function() {
			history.go(-1);
		},

		/* =========================================================== */
		/* begin: internal methods                                     */
		/* =========================================================== */


		_createViewModel : function() {
			return new JSONModel({
				isFilterBarVisible: false,
				filterBarLabel: "",
				delay: 0,
				title: this.getResourceBundle().getText("masterTitleCount", [0]),
				noDataText: this.getResourceBundle().getText("masterListNoDataText"),
				sortBy: "Name",
				groupBy: "None"
			});
		},

		_onMasterMatched :  function() {
			//Set the layout property of the FCL control to 'OneColumn'
			this.getModel("appView").setProperty("/layout", "OneColumn");
		},

		/**
		 * Shows the selected item on the detail page
		 * On phones a additional history entry is created
		 * @param {sap.m.ObjectListItem} oItem selected Item
		 * @private
		 */
		_showDetail : function (oItem) {

			var oContext = oItem.getBindingContext();
			var sMonth = oContext.getProperty("Month");
			var sGuid = oContext.getProperty("Guid");
			var sPernr = oContext.getProperty("Pernr");
			// var sProjectCode = oContext.getProperty("ProjectCode");
			var sActivityYear = oContext.getProperty("Year");


			var oActivityDaysModel = this.getOwnerComponent().getModel("activityDaysModel");

			var oActivityDay = {
				Month: sMonth,
				Guid: sGuid,
				Pernr: sPernr,
				ActivityYear: sActivityYear
			}

			
			oActivityDaysModel.setData({
				selectedItem: oActivityDay
			});  

			var bReplace = !Device.system.phone;
			// set the layout property of FCL control to show two columns
			this.getModel("appView").setProperty("/layout", "TwoColumnsMidExpanded");
			this.getRouter().navTo("detail", {
				// Month : oItem.getBindingContext().getProperty("Month")
				Month: sMonth,
				// Guid: sGuid,
				// Pernr: sPernr,
				// ProjectCode: sProjectCode,
				ActivityYear: sActivityYear
			}, bReplace);
		},

		/**
		 * Sets the item count on the master list header
		 * @param {integer} iTotalItems the total number of items in the list
		 * @private
		 */
		_updateListItemCount : function (iTotalItems) {
			var sTitle;
			var sYear;
			// only update the counter if the length is final
			if (this._oList.getBinding("items").isLengthFinal()) {
				sYear = this.getView().byId("masterlist").getBinding("items").getContexts()[0].getObject().Year;
				// sTitle = this.getResourceBundle().getText("masterTitleCount", [iTotalItems]);
				sTitle = sYear + '  (' + iTotalItems + ')';
				this.getModel("masterView").setProperty("/title", sTitle);
			}
		},

		/**
		 * Internal helper method to apply both filter and search state together on the list binding
		 * @private
		 */
		_applyFilterSearch : function () {
			var aFilters = this._oListFilterState.aSearch.concat(this._oListFilterState.aFilter),
				oViewModel = this.getModel("masterView");
			this._oList.getBinding("items").filter(aFilters, "Application");
			// changes the noDataText of the list in case there are no filter results
			if (aFilters.length !== 0) {
				oViewModel.setProperty("/noDataText", this.getResourceBundle().getText("masterListNoDataWithFilterOrSearchText"));
			} else if (this._oListFilterState.aSearch.length > 0) {
				// only reset the no data text to default when no new search was triggered
				oViewModel.setProperty("/noDataText", this.getResourceBundle().getText("masterListNoDataText"));
			}
		},

		/**
		 * Internal helper method that sets the filter bar visibility property and the label's caption to be shown
		 * @param {string} sFilterBarText the selected filter value
		 * @private
		 */
		_updateFilterBar : function (sFilterBarText) {
			var oViewModel = this.getModel("masterView");
			oViewModel.setProperty("/isFilterBarVisible", (this._oListFilterState.aFilter.length > 0));
			oViewModel.setProperty("/filterBarLabel", this.getResourceBundle().getText("masterFilterBarText", [sFilterBarText]));
		},

		
		onPressEntryActivityButton: function () {
			var oView = this.getView();
			// var oProjectCode = this.byId("inputProjectCode");
			// oProjectCode.setValue(aContexts[0].getObject().ProjectCode);
 
           
 
            if (!this.byId("entryActivity")) {
              // load asynchronous XML fragment
              Fragment.load({
     
                id: oView.getId(),
                name: "zint.activity.system.fragment.AddActivity",
                controller: this
              }).then(function (oDialog) {
     
                // connect dialog to the root view of this component (models, lifecycle)
                oView.addDependent(oDialog);
                oDialog.open();
                this._dialog = oDialog;
     
              }.bind(this));
     
            } else {
     
              this.byId("entryActivity").open();
     
            }
		},

		onPressEntryCostButton: function () {
			var oView = this.getView();

			// var oProjectCode = this.byId("inputProjectCode");
			// oProjectCode.setValue(aContexts[0].getObject().ProjectCode);
 
           
 
            if (!this.byId("entryCost")) {
              // load asynchronous XML fragment
              Fragment.load({
     
                id: oView.getId(),
                name: "zint.activity.system.fragment.AddCost",
                controller: this
              }).then(function (oDialog) {
     
                // connect dialog to the root view of this component (models, lifecycle)
                oView.addDependent(oDialog);
                oDialog.open();
                this._dialog = oDialog;
     
              }.bind(this));
     
            } else {
     
              this.byId("entryCost").open();
     
            }
		},


		_onPressEntryCostButton2: function (oItem) {
			var bReplace = !Device.system.phone;
			// set the layout property of FCL control to show two columns
			this.getModel("appView").setProperty("/layout", "TwoColumnsMidExpanded");
			this.getRouter().navTo("detail", {
				Month : oItem.getBindingContext().getProperty("Month")
			}, bReplace);
		},

	
          onSaveActivity: function () {
			
			var oMasterData = this.getView().byId("masterlist").getBinding("items").getContexts()[0].getObject();
			var ui5Date = this.getView().byId("inputActivityMasterDate").getDateValue();
			if (ui5Date){
				ui5Date.setHours(3, 0, 0);
			}


			var sDate = this.getView().byId("inputActivityMasterDate").getValue();
			if ( sDate.substring(1, 2) == '.'){
				var sMonth = sDate.substring(2, 4);
			} else	{
				sMonth = sDate.substring(3, 5);
			};
	
			

			var oActivityDays = {

				Guid 			: "GUID_DEFAULT",
				Pernr			: oMasterData.Pernr,
				PersonnelName   : oMasterData.PersonnelName,
				PersonnelSurname: oMasterData.PersonnelSurname,
				Month           : sMonth,
				MonthName       : "",
				Year            : oMasterData.Year,
				Status			: "MASTER",
				ActivityDetailsSet: [
					{
						 Guid 			  : "GUID_DEFAULT",
						Pernr			  : oMasterData.Pernr,
						PersonnelName     : oMasterData.PersonnelName,
						PersonnelSurname  : oMasterData.PersonnelSurname,
						ActivityDate      :  ui5Date,
						ProjectCode		  : this.getView().byId("inputProjectCode").getValue(),
						ProjectName  	  : this.getView().byId("inputProjectName").getValue(),
						ActivityMonth     : sMonth,
						ActivityMonthName : "",
						ActivityYear      : oMasterData.Year,
						ActivityDuration  : parseFloat(this.getView().byId("inputActivityHour").getValue()).toFixed(2),
						Description       : this.getView().byId("inputDescription").getValue(),
						CostsSet          : [],
					}
				]
				
			};


			if (this.getView().byId("inputActivityMasterDate").getValue() === "") {
				
				this.getView().byId("inputActivityMasterDate").setValueState("Error");
				//  MessageToast.show("Fill the activity date");
				//  return;
				MessageBox.error("Fill the activity date.");
				return false;
			};

			if (this.getView().byId("inputProjectCode").getValue() === "") {
				
				this.getView().byId("inputProjectCode").setValueState("Error");
				MessageBox.error("Fill the project code.");
				return false;
			};



			if (this.getView().byId("inputActivityHour").getValue() === "") {
				
				this.getView().byId("inputActivityHour").setValueState("Error");
				MessageBox.error("Fill the activity hour.");
				return false;
			};


			this.BusyDialog = new sap.m.BusyDialog({});
            this.BusyDialog.open();
            this.getOwnerComponent()
              .getModel()
              .create("/ActivityDaysSet", oActivityDays  , {
                success: function () {
                 var Msg = "Activity entry is successfull."
				//  this.getOwnerComponent().refreshApplication();
				this.getView().getModel().refresh(true);
				 MessageBox.show(Msg);
				 this.BusyDialog.close();
				// TO DO clear data ve model yapılacak
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
            // this.getView().byId("selectProjectModel").setSelectedKey("");
           
     
     
            this.byId("entryActivity").destroy();
          },


		  onSaveCostType: function () {

			var sActivityDate = this.getView().byId("inputActivityMasterDateCost").getValue();
		
			var oMasterData = this.getView().byId("masterlist").getBinding("items").getContexts()[0].getObject();
			var ui5Date = this.getView().byId("inputActivityMasterDateCost").getDateValue();
			if (ui5Date){
				ui5Date.setHours(3, 0, 0);
			}
			

			var sDate = sActivityDate;
			if ( sDate.substring(1, 2) == '.'){
				var sMonth = sDate.substring(2, 4);
			} else	{
				sMonth = sDate.substring(3, 5);
			};
	
			

			var oActivityDays = {

				Guid 			: "GUID_DEFAULT",
				Pernr			: oMasterData.Pernr,
				PersonnelName   : oMasterData.PersonnelName,
				PersonnelSurname: oMasterData.PersonnelSurname,
				Month           : sMonth,
				MonthName       : "",
				Year            : oMasterData.Year,
				Status			: "COST",
				ActivityDetailsSet: [
					{
					    Guid 			  : "GUID_DEFAULT",
						Pernr			  : oMasterData.Pernr,
						PersonnelName     : oMasterData.PersonnelName,
						PersonnelSurname  : oMasterData.PersonnelSurname,
						ActivityDate      :  ui5Date,
						ProjectCode		  : this.getView().byId("inputProjectCode").getValue(),
						ProjectName  	  : this.getView().byId("inputProjectName").getValue(),
						ActivityMonth     : sMonth,
						ActivityMonthName : "",
						ActivityYear      : oMasterData.Year,
						// ActivityDuration  : parseFloat(this.getView().byId("inputActivityHour").getValue()).toFixed(2),
						// Description       : this.getView().byId("inputDescription").getValue(),
						CostsSet          : [ 
						{
							ActivityMonth : sMonth,
							CostName      : this.getView().byId("inputCostName").getValue(), 
							CostType      : this.getView().byId("inputCostType").getValue(),
							Guid 	      : "GUID_DEFAULT",
							Pernr	      : oMasterData.Pernr,
							ActivityYear  : oMasterData.Year,
							CostAmount    : this.getView().byId("inputCostAmountCost").getValue(),
							ProjectCode   : this.getView().byId("inputProjectCode").getValue(),
							ActivityDate  : ui5Date,
							CostCurrency  : this.getView().byId("inputCostCurrencyCost").getValue(),
							Description   : this.getView().byId("inputDescriptionCost").getValue(),
						}
						]
					}
				]
				
			};


			if (this.getView().byId("inputActivityMasterDateCost").getValue() === "") {
				
				this.getView().byId("inputActivityMasterDateCost").setValueState("Error");
				//  MessageToast.show("Fill the activity date");
				//  return;
				MessageBox.error("Fill the activity date.");
				return false;
			};

			if (this.getView().byId("inputProjectCode").getValue() === "") {
				
				this.getView().byId("inputProjectCode").setValueState("Error");
				MessageBox.error("Fill the project code.");
				return false;
			};

			if (this.getView().byId("inputCostType").getValue() === "") {
				
				this.getView().byId("inputCostType").setValueState("Error");
				MessageBox.error("Select the cost type.");
				return false;
			};

			if (this.getView().byId("inputCostAmountCost").getValue() === "") {
				
				this.getView().byId("inputCostAmountCost").setValueState("Error");
				MessageBox.error("Fill the cost amount.");
				return false;
			};

			if (this.getView().byId("inputDescriptionCost").getValue() === "") {
				
				this.getView().byId("inputDescriptionCost").setValueState("Error");
				MessageBox.error("Fill the description.");
				return false;
			};


			// if (this.getView().byId("inputActivityHour").getValue() === "") {
				
			// 	this.getView().byId("inputActivityHour").setValueState("Error");
			// 	MessageBox.error("Fill the activity hour.");
			// 	return false;
			// };


			this.BusyDialog = new sap.m.BusyDialog({});
            this.BusyDialog.open();
            this.getOwnerComponent()
              .getModel()
              .create("/ActivityDaysSet", oActivityDays  , {
                success: function () {
                 var Msg = "Cost entry is successfull."
				//  this.getOwnerComponent().refreshApplication();
				this.getView().getModel().refresh(true);
				 MessageBox.show(Msg);
				 this.BusyDialog.close();
				// TO DO clear data ve model yapılacak
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
            // this.getView().byId("selectProjectModel").setSelectedKey("");
            this.byId("entryCost").destroy();
          },

		  handleInputProjectCodeChange: function (oEvent) {
			var sValue = oEvent.getParameter("value");
			// var oProjectCode = this.byId("inputProjectCode");
			// oProjectCode.setValue(aContexts[0].getObject().ProjectCode);


		  },

		  handleInputCostChange: function (oEvent) {
			var sValueCost = oEvent.getParameter("value");
			// var oProjectCode = this.byId("inputProjectCode");
			// oProjectCode.setValue(aContexts[0].getObject().ProjectCode);


		  },
 
		//   handleCloseSelectProject: function (oEvent) {
		// 	var aContexts = oEvent.getParameter("selectedContexts");
		
		// 	var oProjectCode = this.byId("inputProjectCode");
		// 	oProjectCode.setValue(aContexts[0].getObject().ProjectCode);

		// 	var oProjectName = this.byId("inputProjectName");
		// 	oProjectName.setValue(aContexts[0].getObject().ProjectName);

		//   },  

		//   handleSearchSelectProject: function (oEvent) {
		// 	var sValue = oEvent.getParameter("value");
		// 	var oFilter = new Filter(
		// 	  "ProjectCode",
		// 	  sap.ui.model.FilterOperator.Contains,
		// 	  sValue
		// 	);
		// 	var oBinding = oEvent.getSource().getBinding("items");
		// 	oBinding.filter([oFilter]);
		//   },

	});

});
