sap.ui.define(
	[
		"./BaseController",
		"sap/ui/model/json/JSONModel",
		"../model/formatter",
		"sap/m/library",
		"sap/ui/export/Spreadsheet",
		"sap/m/MessageBox",
		"sap/m/MessageToast",
	],
	function (
		BaseController,
		JSONModel,
		formatter,
		mobileLibrary,
		Spreadsheet,
		MessageBox,
		MessageToast
	) {
		"use strict";

		// shortcut for sap.m.URLHelper
		var URLHelper = mobileLibrary.URLHelper;

		return BaseController.extend("zint.activity.system.controller.Detail", {
			formatter: formatter,

			/* =========================================================== */
			/* lifecycle methods                                           */
			/* =========================================================== */

			onInit: function () {
				// Model used to manipulate control states. The chosen values make sure,
				// detail page is busy indication immediately so there is no break in
				// between the busy indication for loading the view's meta data

				this.getView().setModel(oViewModel, "viewModel");
				var oViewModel = new JSONModel({
					busy: false,
					delay: 0,
					lineItemListTitle: this.getResourceBundle().getText(
						"detailLineItemTableHeading"
					),
				});

				this.getRouter()
					.getRoute("detail")
					.attachPatternMatched(this._onObjectMatched, this);

				this.setModel(oViewModel, "detailView");

				this.getOwnerComponent()
					.getModel()
					.metadataLoaded()
					.then(this._onMetadataLoaded.bind(this));

				// Edit mode için bir model ayarla
				var oViewModel = new sap.ui.model.json.JSONModel({
					editMode: false,
				});

    document.addEventListener("focus", this._setRowFromClipboard.bind(this), { once: true });
    document.activeElement.focus();

				window.addEventListener("paste", function (oEvent) {
					// this._onImportFromClipboard();
					this._setRowFromClipboard(oEvent);

				  }.bind(this), false);
			},
			onEdit: function (oEvent) {
				var bEditable = this.getView()
					.getModel("detailModel")
					.getProperty("/editMode");
				this.getView()
					.getModel("detailModel")
					.setProperty("/editMode", !bEditable);

				// var oButton = this.byId("editButton");
				// if (bEditable) {
				// 	// oButton.setIcon("sap-icon://edit");
				// 	// oButton.setText("Edit")
				// } else {
				// 	// oButton.setIcon("sap-icon://display");
				// 	// oButton.setText("Display")
				// }
			},

			// handleCloseSelectProject: function (oEvent) {

			// 	var aContexts = oEvent.getParameter("selectedContexts");

			// 	var oDetailModel = this.getView().getModel("detailModel");
			// 	var aDetails = oDetailModel.getData();

			// 	aDetails[this.iSelectedIndex].ProjectCode = aContexts[0].getObject().ProjectCode;
			// 	aDetails[this.iSelectedIndex].ProjectName = aContexts[0].getObject().ProjectName;

			// 	oDetailModel.setData(aDetails);

			//   },

			handleInputProjectCodeChange: function (oEvent) {
				var sValue = oEvent.getParameter("value");
				// var oProjectCode = this.byId("inputProjectCode");
				// oProjectCode.setValue(aContexts[0].getObject().ProjectCode);
			},

			/* =========================================================== */
			/* event handlers                                              */
			/* =========================================================== */

			/**
			 * Event handler when the share by E-Mail button has been clicked
			 * @public
			 */
			onSendEmailPress: function () {
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
			onListUpdateFinished: function (oEvent) {
				var sTitle,
					iTotalItems = oEvent.getParameter("total"),
					oViewModel = this.getModel("detailView");

				// only update the counter if the length is final
				if (this.byId("lineItemsList").getBinding("items").isLengthFinal()) {
					if (iTotalItems) {
						sTitle = this.getResourceBundle().getText(
							"detailLineItemTableHeadingCount",
							[iTotalItems]
						);
					} else {
						//Display 'Line Items' instead of 'Line items (0)'
						sTitle = this.getResourceBundle().getText(
							"detailLineItemTableHeading"
						);
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
			// _onObjectMatched : function (oEvent) {
			// 	// var sMonth =  oEvent.getParameter("arguments").Month;

			// 	if(this.getOwnerComponent().getModel("activityDaysModel")){
			// 		var oSelectedItem = this.getOwnerComponent().getModel("activityDaysModel").getData().selectedItem;

			// 	// var sYear =  this.getView().byId("masterlist").getBinding("items").getContexts()[0].getObject().Year;
			// 	this.getModel("appView").setProperty("/layout", "TwoColumnsMidExpanded");
			// 	this.getModel().metadataLoaded().then( function() {
			// 		var sDetailPath = this.getModel().createKey("/ActivityDetailsSet", {
			// 			ActivityMonth :   parseInt(oSelectedItem.Month, 10),
			// 			Guid: 'GUID_DEFAULT',
			// 			Pernr: oSelectedItem.Pernr,
			// 			ProjectCode: 'ALL',
			// 			ActivityYear: oSelectedItem.ActivityYear,
			// 		});
			// 		this._bindView(sDetailPath);
			// 		     // OData read request
			// 			 this.getModel().read(sDetailPath, {
			// 				success: function (oData) {
			// 					// Set the data to a JSON model
			// 					var oJsonModel = new sap.ui.model.json.JSONModel();
			// 					oJsonModel.setData(oData);
			// 					this.getView().setModel(oJsonModel, "detailModel");
			// 				}.bind(this),
			// 				error: function (oError) {
			// 					// Handle error
			// 					console.error("Error reading data", oError);
			// 				}
			// 			});

			// 	}.bind(this));
			// }
			// },

			_onObjectMatched: function (oEvent) {
				if (this.getOwnerComponent().getModel("activityDaysModel")) {
					// var oSelectedItem = this.getOwnerComponent()
					// 	.getModel("activityDaysModel")
					// 	.getData().selectedItem;

					var sMonth =  oEvent.getParameter("arguments").Month;
					var sYear =  oEvent.getParameter("arguments").ActivityYear;

					this.getModel("appView").setProperty(
						"/layout",
						"TwoColumnsMidExpanded"
					);

					this.getModel()
						.metadataLoaded()
						.then(
							function () {
								var aFilters = [
									new sap.ui.model.Filter(
										"ActivityMonth",
										sap.ui.model.FilterOperator.EQ,
										parseInt(sMonth, 10)
									),
									
									new sap.ui.model.Filter(
										"Guid",
										sap.ui.model.FilterOperator.EQ,
										"GUID_DEFAULT"
									),
									new sap.ui.model.Filter(
										"ActivityYear",
										sap.ui.model.FilterOperator.EQ,
										sYear
									),
								];

								// OData read request
								this.getModel().read("/ActivityDetailsSet", {
									urlParameters: {
										$expand: "CostsSet",
									},
									filters: aFilters,
									success: function (oData) {
										// Set the data to a JSON model

										for (var i = 0; i < oData.results.length; i++) {
											oData.results[i].selected = false;
											var bIsWeekend = this._isWeekend(
												oData.results[i].ActivityDate
											);

											oData.results[i].Weekend = bIsWeekend;
										}

										var oDetailModel = new sap.ui.model.json.JSONModel();
										oDetailModel.setData(oData.results);

										oDetailModel.setProperty("/editMode", false);
										this.getView().setModel(oDetailModel, "detailModel");
										 // Set busy state to false
										 this.getModel("detailView").setProperty("/busy", false);
									}.bind(this),
									error: function (oError) {
										// Handle error
										console.error("Error reading data", oError);
										this.getModel("detailView").setProperty("/busy", false);
									},
								});
							}.bind(this)
						);
				}
				var oDetailCostModel = this.getView().getModel("detailCostModel");
				if (oDetailCostModel) {
					oDetailCostModel.setData({});
				}
			},

			_isWeekend: function (date) {
				var day = date.getDay();
				// Cumartesi (6) veya Pazar (0) olup olmadığını kontrol eder
				return day === 0 || day === 6;
			},

			onSelectBox: function (oEvent) {
				var oCheckbox = oEvent.getSource();
				var bSelected = oCheckbox.getSelected();
				// var iSelectedIndex = oCheckbox.getBindingContext("detailModel").getPath().substring(1, 3);
				var iSelectedIndex = oCheckbox
					.getBindingContext("detailModel")
					.getPath()
					.split("/")
					.pop();
				var oDetailModel = this.getView().getModel("detailModel");
				var oDetailModelData = oDetailModel.getData();
				var aCostData = oDetailModelData[iSelectedIndex].CostsSet.results;

				oDetailModelData[iSelectedIndex].selected = bSelected;
				oDetailModel.setData(oDetailModelData);

				aCostData.PersonnelName =
					oDetailModel.getData()[iSelectedIndex].PersonnelName;
				aCostData.PersonnelSurname =
					oDetailModel.getData()[iSelectedIndex].PersonnelSurname;
				aCostData.ProjectName =
					oDetailModel.getData()[iSelectedIndex].ProjectName;

				var oDetailMasrafModel = new sap.ui.model.json.JSONModel();
				if (!bSelected) {
					aCostData = [];
				}
				oDetailMasrafModel.setData(aCostData);
				this.getView().setModel(oDetailMasrafModel, "detailCostModel");

				oDetailModel.refresh(true);

				if (
					this._isWeekend(oDetailModelData[iSelectedIndex].ActivityDate) &&
					bSelected
				) {
					MessageBox.warning(
						"Attention! You are writing an cost for the weekend!"
					);
				}
			},

			onExportToExcel: function () {
				var oModel = this.getView().getModel("detailModel");
				var aData = oModel.getData();

				// Convert the data to a format suitable for SheetJS
				var aExportData = aData.map(function (item) {
					return {
						"Personnel Name": item.PersonnelName,
						"Activity Date": item.ActivityDate,
						"Project Code": item.ProjectCode,
						"Project Name": item.ProjectName,
						"Activity Hour": item.ActivityHour,
						Description: item.Description,
					};
				});

				// Create a new workbook and add the data
				var wb = XLSX.utils.book_new();
				var ws = XLSX.utils.json_to_sheet(aExportData);
				XLSX.utils.book_append_sheet(wb, ws, "Details");

				// Set column widths
				var wscols = [
					{ wch: 20 }, // "Personnel Name" column width
					{ wch: 15 }, // "Activity Date" column width
					{ wch: 15 }, // "Project Code" column width
					{ wch: 20 }, // "Project Name" column width
					{ wch: 15 }, // "Activity Hour" column width
					{ wch: 30 }, // "Description" column width
				];
				ws["!cols"] = wscols;

				// Get the CostsSet data from detailModel
				var aCostData = [];
				aData.forEach(function (item) {
					if (item.CostsSet && item.CostsSet.results) {
						aCostData = aCostData.concat(item.CostsSet.results);
					}
				});

				// Convert the CostsSet data to a format suitable for SheetJS
				var aExportCostData = aCostData.map(function (item) {
					return {
						"Cost Personnel Name": item.PersonnelName,
						"Cost Activity Date": item.ActivityDate,
						"Cost Project Code": item.ProjectCode,
						"Cost Project Name": item.ProjectName,
						"Cost Activity Hour": item.ActivityHour,
						"Cost Description": item.Description,
					};
				});

				// Add the detailCostModel data to a new sheet
				var wsCost = XLSX.utils.json_to_sheet(aExportCostData);
				XLSX.utils.book_append_sheet(wb, wsCost, "Detail Costs");

				// Set column widths
				var wsCostcols = [
					{ wch: 20 }, // "Cost Personnel Name" column width
					{ wch: 15 }, // "Cost Activity Date" column width
					{ wch: 15 }, // "Cost Project Code" column width
					{ wch: 20 }, // "CostProject Name" column width
					{ wch: 15 }, // "Activity Hour" column width
					{ wch: 30 }, // "Description" column width
				];
				wsCost["!cols"] =  wsCostcols;
				// Export the workbook
				XLSX.writeFile(wb, "DetailData.xlsx");
			},
			onLiveChangeRestrictToNumbers: function (oEvent) {
				var oInput = oEvent.getSource();
				var sValue = oInput.getValue();

				// Allow only numbers and a decimal point
				if (!/^\d*\.?\d*$/.test(sValue)) {
					// If not valid, revert to the previous value
					oInput.setValue(sValue.slice(0, -1));
				}
			},
			_bindView: function (sDetailPath) {
				var oView = this.getView();
				oView.bindElement({
					path: sDetailPath,
					parameters: {
						expand: "ActivityDetails",
					},
					events: {
						dataRequested: function () {
							oView.setBusy(true);
						},
						dataReceived: function () {
							oView.setBusy(false);
						},
					},
				});
			},

			/**
			 * Binds the view to the object path. Makes sure that detail view displays
			 * a busy indicator while data for the corresponding element binding is loaded.
			 * @function
			 * @param {string} sDetailPath path to the object to be bound to the view.
			 * @private
			 */
			// _bindView : function (sDetailPath) {
			// 	// Set busy indicator during view binding
			// 	var oViewModel = this.getModel("detailView");

			// 	// If the view was not bound yet its not busy, only if the binding requests data it is set to busy again
			// 	oViewModel.setProperty("/busy", false);

			// 	this.getView().bindElement({
			// 		path : sDetailPath,
			// 		events: {
			// 			// change : this._onBindingChange.bind(this),
			// 			// dataRequested : function () {
			// 			// 	oViewModel.setProperty("/busy", true);
			// 			// },
			// 			// dataReceived: function () {
			// 			// 	oViewModel.setProperty("/busy", false);
			// 			// }
			// 		}
			// 	});
			// },

			_onBindingChange: function () {
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

				oViewModel.setProperty(
					"/shareSendEmailSubject",
					oResourceBundle.getText("shareSendEmailObjectSubject", [sMonth])
				);
				oViewModel.setProperty(
					"/shareSendEmailMessage",
					oResourceBundle.getText("shareSendEmailObjectMessage", [
						oDetailName,
						sMonth,
						location.href,
					])
				);
				//  // Store the current detail data in the local storage zek
  				// localStorage.setItem("detailData", JSON.stringify(oDetail));
			},

			_onMetadataLoaded: function () {
				// Store original busy indicator delay for the detail view
				var iOriginalViewBusyDelay = this.getView().getBusyIndicatorDelay(),
					oViewModel = this.getModel("detailView"),
					oLineItemTable = this.byId("lineItemsList"),
					iOriginalLineItemTableBusyDelay =
						oLineItemTable.getBusyIndicatorDelay();

				// Make sure busy indicator is displayed immediately when
				// detail view is displayed for the first time
				oViewModel.setProperty("/delay", 0);
				oViewModel.setProperty("/lineItemTableDelay", 0);

				oLineItemTable.attachEventOnce("updateFinished", function () {
					// Restore original busy indicator delay for line item table
					oViewModel.setProperty(
						"/lineItemTableDelay",
						iOriginalLineItemTableBusyDelay
					);
				});

				// Binding the view will set it to not busy - so the view is always busy if it is not bound
				oViewModel.setProperty("/busy", true);
				// Restore original busy indicator delay for the detail view
				oViewModel.setProperty("/delay", iOriginalViewBusyDelay);

				  // Retrieve the stored detail data from the local storage zek
//   var sDetailData = localStorage.getItem("detailData");
//   if (sDetailData) {
//     var oDetailData = JSON.parse(sDetailData);
//     // Update the model with the stored detail data
//     this.getView().getModel("detailModel").setData(oDetailData);
//   }
			},

			/**
			 * Set the full screen mode to false and navigate to master page
			 */
			onCloseDetailPress: function () {
				this.getModel("appView").setProperty(
					"/actionButtonsInfo/midColumn/fullScreen",
					false
				);
				// No item should be selected on master after detail page is closed
				this.getOwnerComponent().oListSelector.clearMasterListSelection();
				this.getRouter().navTo("master");
			},

			onDeleteActivityLine: function (oEvent) {
				var oDetailModel = this.getView().getModel("detailModel");
				var oDetailModelData = oDetailModel.getData();
			
				// Filter the selected items
				var selectedItems = oDetailModelData.filter(function (item) {
					return item.selected === true;
				});
			
				if (selectedItems.length === 0) {
					MessageToast.show("Please select a row to delete.");
				} else {
					// Remove the selected items from the model data
					oDetailModelData = oDetailModelData.filter(function (item) {
						return item.selected !== true;
					});
			
					// Update the model with the modified data
					oDetailModel.setData(oDetailModelData);
				}
			},

			onAddActivityLine: function (oEvent) {
			
				var oDetailModel = this.getView().getModel("detailModel");
				var oDetailModelData = oDetailModel.getData();

				var selectedIndex = oDetailModelData.findIndex(function(item) {
					return item.selected === true;
				});

				var selectedItems = oDetailModelData.filter(function(item) {
					return item.selected === true;
				});

				if (selectedItems.length > 1) {
					MessageToast.show("Birden fazla satır seçili. Lütfen sadece bir tane seçin.");

				}
				else if (selectedItems.length === 0) {
				var currentIndex = oDetailModelData.findIndex(function(item) {
					return item.ActivityDate === new Date();
				});

				if (currentIndex === -1) {
					currentIndex = oDetailModelData.length - 1;
				}
				
					var oNewLine = {
						selected: false,
						PersonnelName: oDetailModelData[0].PersonnelName,
						PersonnelSurname: oDetailModelData[0].PersonnelSurname,
						ActivityDate: oDetailModelData[currentIndex].ActivityDate,
						ProjectCode: "",
						ProjectName:"",
						ActivityDuration: "",
						Description: "",
						Weekend: this._isWeekend(oDetailModelData[currentIndex].ActivityDate),
					  };		

					oDetailModelData.splice(currentIndex+ 1, 0, oNewLine);
				  
					// Update the model
					oDetailModel.setData(oDetailModelData);
				

				}  else {

				// Create a new line object with default values
				var oNewLine = {
					selected: false,
					PersonnelName: oDetailModelData[selectedIndex].PersonnelName,
					PersonnelSurname: oDetailModelData[selectedIndex].PersonnelSurname,
					ActivityDate: oDetailModelData[selectedIndex].ActivityDate,
					ProjectCode: "",
					ProjectName: "",
					ActivityDuration: oDetailModelData[selectedIndex].ActivityDuration,
					Description: "",
					Weekend: this._isWeekend(oDetailModelData[selectedIndex].ActivityDate),
				  };		
				// Insert the new line at the selected index
				oDetailModelData.splice(selectedIndex+ 1, 0, oNewLine);
			  
				// Update the model
				oDetailModel.setData(oDetailModelData);

				}

			},

			onSaveActivities: function(oEvent){
				var oDetailModel = this.getView().getModel("detailModel")
				var oDetailModelData = oDetailModel.getData();

				// var oObject = this.getView().getBindingContext().getObject();
				
				// var oModel = this.getView().getModel();
				// RootInfo.SellAmount = RootInfo.FlexibleBudget;
				var sPernr = this.getView().getModel("activityDaysModel").getData().selectedItem.Pernr;
				var oActivityDays = {
					Month: oDetailModelData[0].ActivityMonth,
					Pernr: sPernr,
					PersonnelName: oDetailModelData[0].PersonnelName,
					PersonnelSurname: oDetailModelData[0].PersonnelSurname,
					MonthName       : oDetailModelData[0].MonthName,
					Year: oDetailModelData[0].ActivityYear,
					Guid: "GUID_DEFAULT",
					Status: "Status",
					ActivityDetailsSet: oDetailModelData.map(function(item) {
						return {
							Guid: "GUID_DEFAULT",
							Pernr: sPernr,
							PersonnelName: item.PersonnelName,
							PersonnelSurname: item.PersonnelSurname,
							ActivityDate: item.ActivityDate,
							ProjectCode: item.ProjectCode,
							ProjectName     : item.ProjectName,
							ActivityMonth   : item.ActivityMonth,
							ActivityMonthName : item.ActivityMonthName,
							ActivityYear    : item.ActivityYear,
							ActivityDuration: item.ActivityDuration,
							Description     : item.Description,
							CostsSet: item.CostsSet
						};
					}),
				};
		
				  var oModel = this.getOwnerComponent().getModel();
				  oModel.create("/ActivityDaysSet", oActivityDays, {
					success: function (data) {
					 
					  MessageToast.show("Activity entry is successfull.");
					}.bind(this),
		
					error: function (error) {
					  MessageBox.error(
						JSON.parse(error.responseText).error.message.value
					  );
					}.bind(this),
				  });

			},


			_setRowFromClipboard2: function (oEvent) {
				// Check if the document is focused
				if (document.activeElement !== document.body) {
				  // Focus the document
				  document.body.focus();
				  // Wait for a short period before attempting to read from the clipboard
				  setTimeout(function () {
					this._setRowFromClipboard(oEvent);
				  }.bind(this), 100);
				  return;
				}
			  
				// Read the clipboard data
				navigator.clipboard.readText().then(function (sText) {
				  // Process the clipboard data
				  var aRows = sText.split("\n");
				  var aData = aRows.map(function (sRow) {
					var aColumns = sRow.split("\t");
					return {
					  // Map the clipboard data to the model properties
					  // Example:
					  // PersonnelName: aColumns[0],
					  // ActivityDate: aColumns[1],
					  // ProjectCode: aColumns[2],
					  // ...
					};
				  });
			  
				  // Update the model with the clipboard data
				  var oDetailModel = this.getView().getModel("detailModel");
				  var aDetailData = oDetailModel.getData();
				  aData.forEach(function (oRow) {
					aDetailData.push(oRow);
				  });
				  oDetailModel.setData(aDetailData);
				}.bind(this));
			  },
			  _removeWord: function (string, searchWord) {
				var str = string;
				var n = str.search(searchWord);
				while (str.search(searchWord) > -1) {
				  n = str.search(searchWord);
				  str = str.substring(0, n) + str.substring(n + searchWord.length, str.length);
				}
				return str;
			  },
			_setRowFromClipboard: function (oEvent) {
				try {
					var inputId = this._removeWord(oEvent.target.id, '-inner');
					var arr1 = inputId.split("-");
					var cursorFname = arr1[0];
					var oInput = sap.ui.getCore().byId(inputId);
					var rowData = oInput.getBindingContext().getObject();
					var clipboardData = oEvent.clipboardData;
					var tobePasted = clipboardData.getData("text/plain");
					tobePasted = tobePasted.replace("\n", "");
					var clipCol = tobePasted.split("\t");
		  
					var oTable = this.getView().getModel();
					var rows = oTable.getRows();
					var oTableModel = oTable.getModel();
					var aColumnData = oTableModel.getData().columns;
					this._aTableData = oTableModel.getData().rows;
					// var talepNedeni = oTableModel.getData().Kalme;
		  
					var cursorIndex = aColumnData.findIndex(function (element) {
					  return (element.columnId === cursorFname)
					})
		  
					switch (rowData.ItemType) {
		  
					  case 'Birim Fiyat':
						rowIndex = 0
						break;
					  case 'Miktar':
						rowIndex = 1
						break;
					  case 'Hesaplanan Tutar:':
						rowIndex = 2
						break;
		  
					  default:
						break;
					}
		  
		  
					var oFormatOptions = {};
		  
					var oLocale = new sap.ui.core.Locale("tr-TR");
					// oFormatOptions.maxFractionDigits = 4;
					// oFormatOptions.minFractionDigits = 4;
					// oFormatOptions.groupingEnabled = true;
					// oFormatOptions.groupingSeparator = ".";
					// oFormatOptions.decimalSeparator = ",";
		  
					oFormatOptions.maxFractionDigits = 4,
					  oFormatOptions.minFractionDigits = 1,
					  oFormatOptions.groupingEnabled = true,
					  oFormatOptions.groupingSeparator = ".",
					  oFormatOptions.decimalSeparator = ","
		  
		  
					var oFloatFormat = sap.ui.core.format.NumberFormat.getFloatInstance(oFormatOptions, oLocale);
		  
					var t = cursorIndex;
		  
					// var tableLength = ( this._aTableData.length - 1 )
		  
					for (let index = 0; index < this._aTableData.length; index++) {
					  if (this._aTableData[index].ItemType === rowData.ItemType) {
						// if ( index !== rowIndex ) {
						//   this.onTablePaste();
						// }else{
		  
						for (let k = 0; k < clipCol.length; k++) {
		  
						  if (typeof oTable.getRows()[0].getCells()[t] === "undefined") {
							continue
						  };
						  if (!oTable.getRows()[0].getCells()[t].getId().includes("key")) {
							break
						  };
		  
						  var deger = oFloatFormat.parse(clipCol[k]);
		  
						  rows[index].getCells()[t].setValue(deger);
		  
						  var fname = aColumnData[t].columnId;
						  this._aTableData[index][fname] = deger;
		  
						  // rows[index].getCells()[t].fireChange();
						  this.onTablePaste();
		  
						  t += 1;
						}
					  }
					  // }
					}
		  
		  
					oTableModel.setData({
					  rows: this._aTableData,
					  Skdef: oTableModel.getData().Skdef,
					  Kalme: talepNedeni,
					  columns: aColumnData
					});
		  
					MessageToast.show(rowData.ItemType + " için veri yapıştırıldı");
					oEvent.preventDefault();
		  
				  } catch (error) {
					console.log(error);
				  }
			},
			_onImportFromClipboard: function () {
				document.addEventListener("focus", this._setRowFromClipboard.bind(this), { once: true });
				document.activeElement.focus();
			},
			// onTablePaste
			// onFileUploadChange: function (oEvent) {
			// 	var oFileUploader = oEvent.getSource();
			// 	var oFile = oFileUploader.getFiles()[0];
		
			// 	if (oFile) {
			// 		var oFileReader = new FileReader();
			// 		oFileReader.onload = function (oEvent) {
			// 			var oData = oEvent.target.result;
			// 			var oWorkbook = XLSX.read(oData, { type: "array" });
			// 			var oFirstSheet = oWorkbook.Sheets[0];
			// 			var aData = XLSX.utils.sheet_to_json(oFirstSheet);
		
			// 			// Assuming the clipboard data is in the same order as the columns
			// 			var aDetailData = aData.map(function (oRow) {
			// 				return {
			// 					PersonnelName: oRow["Personnel Name"],
			// 					PersonnelSurname: oRow["Personnel Surname"],
			// 					ActivityDate: new Date(oRow["Activity Date"]),
			// 					ProjectCode: oRow["Project Code"],
			// 					ProjectName: oRow["Project Name"],
			// 					ActivityDuration: parseFloat(oRow["Activity Duration"]),
			// 					Description: oRow["Description"],
			// 					selected: false,
			// 					Weekend: false
			// 				};
			// 			});
		
			// 			// Get the detailModel from the view
			// 			var oDetailModel = this.getView().getModel("detailModel");
		
			// 			// Set the clipboard data to the detailModel
			// 			oDetailModel.setData(aDetailData);
			// 		};
		
			// 		oFileReader.readAsArrayBuffer(oFile);
			// 	}
			// },
			// onImportFromExcel: function () {
			// 	var oFileUploader = this.byId("fileUploader");
			// 	var oFile = oFileUploader.oFileUpload.files[0];
			// 	if (oFile) {
			// 		var oFileReader = new FileReader();
			// 		oFileReader.onload = function (e) {
			// 			var oData = e.target.result;
			// 			var oWorkbook = XLSX.read(oData, { type: "array" });
			// 			var oFirstSheetName = oWorkbook.SheetNames[0];
			// 			var oSheetData = oWorkbook.Sheets[oFirstSheetName];
			// 			var aRows = XLSX.utils.sheet_to_json(oSheetData);
			// 			var aDetailModelData = this.getView().getModel("detailModel").getData();
			// 			aRows.forEach(function (oRow) {
			// 				aDetailModelData.push(oRow);
			// 			});
			// 			this.getView().getModel("detailModel").setData(aDetailModelData);
			// 		}.bind(this);
			// 		oFileReader.readAsArrayBuffer(oFile);
			// 	}
			// },
		
			// onFileUploadChange: function () {
			// 	this.byId("importButton").setEnabled(true);
			// },

			/**
			 * Toggle between full and non full screen mode.
			 */
			toggleFullScreen: function () {
				var bFullScreen = this.getModel("appView").getProperty(
					"/actionButtonsInfo/midColumn/fullScreen"
				);
				this.getModel("appView").setProperty(
					"/actionButtonsInfo/midColumn/fullScreen",
					!bFullScreen
				);
				if (!bFullScreen) {
					// store current layout and go full screen
					this.getModel("appView").setProperty(
						"/previousLayout",
						this.getModel("appView").getProperty("/layout")
					);
					this.getModel("appView").setProperty(
						"/layout",
						"MidColumnFullScreen"
					);
				} else {
					// reset to previous layout
					this.getModel("appView").setProperty(
						"/layout",
						this.getModel("appView").getProperty("/previousLayout")
					);
				}
			},
		});
	}
);
