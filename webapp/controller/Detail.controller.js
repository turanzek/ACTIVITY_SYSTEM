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
				this.setModel(oViewModel, "editModel");
			},

			_onObjectMatched: function (oEvent) {
				var oArguments = oEvent.getParameter("arguments");
				if (
					this.getModel("appView").getProperty("/layout") !==
					"MidColumnFullScreen"
				) {
					this.getModel("appView").setProperty(
						"/layout",
						"TwoColumnsMidExpanded"
					);
				}

				var sGUID = oArguments.Guid;
				var sPernr = oArguments.Pernr;
				var sMonth = oArguments.Month;
				var sYear = oArguments.ActivityYear;

				var sDetailPath =
					"/ActivityDaysSet(Guid='" +
					sGUID +
					"',Pernr='" +
					sPernr +
					"',Month='" +
					sMonth +
					"',Year='" +
					sYear +
					"')"; // this.getView().bindElement(sPath, {

				//    this.getView().bindElement({
				//        path: sDetailPath,
				//        model: this.getModel("detailModel")
				//    });
				// this._bindView("/ActivityDaysSet(Month='sMonth',Guid='sGUID',Pernr='sPernr',Year='sYear')");
				// this._bindView(sDetailPath);

				this.getModel()
					.metadataLoaded()
					.then(
						function () {
							var sObjectPath = this.getModel().createKey("ActivityDaysSet", {
								Guid: sGUID,
								Pernr: sPernr,
								Month: sMonth,
								Year: sYear,
							});
							this._bindView("/" + sObjectPath);
						}.bind(this)
					);
			},

			_bindView: function (sDetailPath) {
				var oViewModel = this.getModel("detailView");
				oViewModel.setProperty("/busy", false);
				var oView = this.getView();

				oView.bindElement({
					path: sDetailPath,
					events: {
						dataRequested: function () {
							oViewModel.setProperty("/busy", true);
						}.bind(this),
						dataReceived: function () {
							oViewModel.setProperty("/busy", false);
						}.bind(this),
						change: this._onBindingChange.bind(this),
						// change: function() {
						// 	this.getView().getModel("detailView").setProperty("/busy", false);
						// }.bind(this),
						error: function () {
							this.getView().getModel("detailView").setProperty("/busy", false);
							MessageToast.show("Failed to load data.");
						}.bind(this),
					},
				});
			},

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
					// sMonth = oDetail.ActivityMonth,
					// oDetailName = oDetail.ActivityMonthName,
					oViewModel = this.getModel("detailView");

				if (oDetail) {
					var sMonth = oDetail.ActivityMonth;
					var oDetailName = oDetail.ActivityMonthName;
					var sGuid = oDetail.Guid;
					var sPernr = oDetail.Pernr;
					var sYear = oDetail.Year;
				}

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
			},

			onEdit: function (oEvent) {
				var bEditable = this.getView()
					.getModel("editModel")
					.getProperty("/editMode");
				this.getView()
					.getModel("editModel")
					.setProperty("/editMode", !bEditable);
			},

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

			_onObjectMatched2: function (oEvent) {
				var oArguments = oEvent.getParameter("arguments");
				if (
					this.getModel("appView").getProperty("/layout") !==
					"MidColumnFullScreen"
				) {
					this.getModel("appView").setProperty(
						"/layout",
						"TwoColumnsMidExpanded"
					);
				}

				if (this.getOwnerComponent().getModel("activityDaysModel")) {
					var sGUID = oArguments.Guid;
					var sPernr = oArguments.Pernr;
					var sMonth = oArguments.Month;
					var sYear = oArguments.ActivityYear;

					var sDetailPath =
						"/ActivityDaysSet(Guid='" +
						sGUID +
						"',Pernr='" +
						sPernr +
						"',Month='" +
						sMonth +
						"',Year='" +
						sYear +
						"')";
				}

				this.getModel()
					.metadataLoaded()
					.then(
						function () {
							this._bindView(sDetailPath);
						}.bind(this)
					);
			},

			_isWeekend: function (date) {
				var day = date.getDay();
				// Cumartesi (6) veya Pazar (0) olup olmadığını kontrol eder
				return day === 0 || day === 6;
			},

			onSelectBox: function(oEvent) {
				// var oTable = this.byId("lineItemsList"); // ActivityDetails tablosu
				// var oSelectedItem = oEvent.getParameter("listItem");
				// var oContext = oSelectedItem.getBindingContext();
			
				var oSelectedItem = oEvent.getSource().getBindingContext().getObject();
				var oContext = oEvent.getSource().getBindingContext();
				
			
				// Seçilen satırın verisini al
				var oSelectedActivity = oContext.getObject();
				
				// Seçilen activity'nin CostDetails verisini al
				var sPath = oContext.getPath() + "/CostDetails"; // CostDetails'e gidiyoruz
				var oModel = this.getView().getModel();
			
				oModel.read(sPath, {
					success: function(oData) {
						if (oData.results && oData.results.length > 0) {
							// CostDetails verilerini başarıyla aldık
							var oDetailTable = this.byId("idDetailCostModel");
							oDetailTable.setModel(new sap.ui.model.json.JSONModel(oData.results));
						} else {
							// CostDetails verisi boşsa
							sap.m.MessageToast.show("No cost details found for this activity.");
						}
					}.bind(this),
					error: function(oError) {
						// Hata mesajı
						sap.m.MessageToast.show("Error retrieving cost details.");
					}
				});
			},
			// onSelectBox: function (oEvent) {
			// 	// Seçilen satır verisini al
			// 	var oSelectedItem = oEvent.getSource().getBindingContext().getObject();
			// 	var sGuid = oSelectedItem.Guid;
			// 	var sPernr = oSelectedItem.Pernr;
			// 	var sActivityDate = oSelectedItem.ActivityDate;
			
			// 	// Alt tablo için filtreleri oluştur
			// 	var oFilterGuid = new sap.ui.model.Filter("Guid", sap.ui.model.FilterOperator.EQ, sGuid);
			// 	var oFilterPernr = new sap.ui.model.Filter("Pernr", sap.ui.model.FilterOperator.EQ, sPernr);
			// 	var oFilterDate = new sap.ui.model.Filter("ActivityDate", sap.ui.model.FilterOperator.EQ, sActivityDate);
			
			// 	// Alt tabloyu al ve filtreleri uygulayın
			// 	var oTable = this.byId("idDetailCostModel"); // Alt tablo ID'sini kullanın
			// 	var oBinding = oTable.getBinding("items");
				
			// 	// Tablodaki veri bağlamlarını al
			// 		// var aItems = oBinding.getContexts().map(function(oContext) {
			// 		// 	return oContext.getObject();
			// 		// });
				
			// 	// Veriyi konsola yazdır
			// 	// oBinding.filter([oFilterGuid, oFilterPernr, oFilterDate]);
			// },

			// onSelectBox: function (oEvent) {
			// 	var oCheckbox = oEvent.getSource();
			// 	var bSelected = oCheckbox.getSelected();

			// 	// Get the binding context of the checkbox directly from the OData model
			// 	var oContext = oCheckbox.getBindingContext();

			// 	// Get the path of the current item
			// 	var sPath = oContext.getPath();

			// 	// Retrieve the OData model
			// 	var oODataModel = this.getView().getModel();

			// 	// Fetch the current item's data
			// 	var oItemData = oContext.getObject();

			// 	// Set the selected status
			// 	oItemData.Box = bSelected;

			// 	// Update the OData model with the new state
			// 	// oODataModel.update(sPath, oItemData, {
			// 	// 	success: function() {
			// 	// 		// Successfully updated
			// 	// 	},
			// 	// 	error: function() {
			// 	// 		// Handle error
			// 	// 	}
			// 	// });

			// 	// Check if the activity date is on a weekend
			// 	if (this._isWeekend(oItemData.ActivityDate) && bSelected) {
			// 		MessageBox.warning(
			// 			"Attention! You are writing a cost for the weekend!"
			// 		);
			// 	}
			// },

			// onSelectBox: function (oEvent) {
			// 	var oCheckbox = oEvent.getSource();
			// 	var bSelected = oCheckbox.getSelected();
			// 	// var iSelectedIndex = oCheckbox.getBindingContext("detailModel").getPath().substring(1, 3);
			// 	var iSelectedIndex = oCheckbox
			// 		.getBindingContext("detailModel")
			// 		.getPath()
			// 		.split("/")
			// 		.pop();
			// 	var oDetailModel = this.getView().getModel("detailModel");
			// 	var oDetailModelData = oDetailModel.getData();
			// 	var aCostData = oDetailModelData[iSelectedIndex].CostDetails.results;

			// 	oDetailModelData[iSelectedIndex].selected = bSelected;
			// 	oDetailModel.setData(oDetailModelData);

			// 	aCostData.PersonnelName =
			// 		oDetailModel.getData()[iSelectedIndex].PersonnelName;
			// 	aCostData.PersonnelSurname =
			// 		oDetailModel.getData()[iSelectedIndex].PersonnelSurname;
			// 	aCostData.ProjectName =
			// 		oDetailModel.getData()[iSelectedIndex].ProjectName;

			// 	var oDetailMasrafModel = new sap.ui.model.json.JSONModel();
			// 	if (!bSelected) {
			// 		aCostData = [];
			// 	}
			// 	oDetailMasrafModel.setData(aCostData);
			// 	this.getView().setModel(oDetailMasrafModel, "detailCostModel");

			// 	oDetailModel.refresh(true);

			// 	if (
			// 		this._isWeekend(oDetailModelData[iSelectedIndex].ActivityDate) &&
			// 		bSelected
			// 	) {
			// 		MessageBox.warning(
			// 			"Attention! You are writing an cost for the weekend!"
			// 		);
			// 	}
			// },

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

			onDeleteLine: function (oEvent) {
				var oDetailModel = this.getView().getModel("detailModel");
				var oDetailModelData = oDetailModel.getData();
				var oSelection = oEvent.getSource().getId();
				var selectedItems = oDetailModelData.filter(function (item) {
					return item.selected === true;
				});

				if (oSelection.includes("delete")) {
					if (selectedItems.length === 0) {
						MessageToast.show("Please select a row to delete.");
					} else {
						// Remove the selected items from the model data
						if (oSelection.includes("Act")) {
							oDetailModelData = oDetailModelData.filter(function (item) {
								return item.selected !== true;
							});
						} else if (oSelection.includes("Cost")) {
							oDetailModelData.CostDetails = oDetailModelData.CostDetails.filter(
								function (item) {
									return item.selected !== true;
								}
							);
						}
						// Update the model with the modified data
						oDetailModel.setData(oDetailModelData);
					}
				} else if (oSelection.includes("add")) {
				}

				// Filter the selected items
			},

			// onAddLine: function (oEvent) {
			// 	// var oDetailModel = this.getView().getModel("detailModel");
			// 	// var oDetailModelData = oDetailModel.getData();

			// 	var selectedIndex = oDetailModelData.findIndex(function (item) {
			// 		return item.selected === true;
			// 	});

			// 	var selectedItems = oDetailModelData.filter(function (item) {
			// 		return item.selected === true;
			// 	});

			// 	if (selectedItems.length > 1) {
			// 		MessageToast.show(
			// 			"Birden fazla satır seçili. Lütfen sadece bir tane seçin."
			// 		);
			// 	} else if (selectedItems.length === 0) {
			// 		var currentIndex = oDetailModelData.findIndex(function (item) {
			// 			return item.ActivityDate === new Date();
			// 		});

			// 		if (currentIndex === -1) {
			// 			currentIndex = oDetailModelData.length - 1;
			// 		}

			// 		var oNewLine = {
			// 			selected: false,
			// 			PersonnelName: oDetailModelData[0].PersonnelName,
			// 			PersonnelSurname: oDetailModelData[0].PersonnelSurname,
			// 			ActivityDate: oDetailModelData[currentIndex].ActivityDate,
			// 			ProjectCode: "",
			// 			ProjectName: "",
			// 			ActivityDuration: "",
			// 			Description: "",
			// 			Weekend: this._isWeekend(
			// 				oDetailModelData[currentIndex].ActivityDate
			// 			),
			// 		};

			// 		oDetailModelData.splice(currentIndex + 1, 0, oNewLine);

			// 		// Update the model
			// 		oDetailModel.setData(oDetailModelData);
			// 	} else {
			// 		// Create a new line object with default values
			// 		var oNewLine = {
			// 			selected: false,
			// 			PersonnelName: oDetailModelData[selectedIndex].PersonnelName,
			// 			PersonnelSurname: oDetailModelData[selectedIndex].PersonnelSurname,
			// 			ActivityDate: oDetailModelData[selectedIndex].ActivityDate,
			// 			ProjectCode: "",
			// 			ProjectName: "",
			// 			ActivityDuration: oDetailModelData[selectedIndex].ActivityDuration,
			// 			Description: "",
			// 			Weekend: this._isWeekend(
			// 				oDetailModelData[selectedIndex].ActivityDate
			// 			),
			// 		};
			// 		// Insert the new line at the selected index
			// 		oDetailModelData.splice(selectedIndex + 1, 0, oNewLine);

			// 		// Update the model
			// 		oDetailModel.setData(oDetailModelData);
			// 	}
			// },
			// onAddLine: function (oEvent) {
			// 	// Get the OData model directly from the view
			// 	var oTable = this.getView().byId("lineItemsList");
			// 	var oBinding = oTable.getBinding("items");
			// 	var oData = oBinding.getModel().getProperty("/"); // Access root property, or adjust the path as needed

			// 	// Determine the selected items
			// 	var selectedItems = "X";//oData.filter(function (item) {
			// 	// 	return item.selected === true;
			// 	// });

			// 	if (selectedItems.length > 1) {
			// 		MessageToast.show("Birden fazla satır seçili. Lütfen sadece bir tane seçin.");
			// 		return;
			// 	}

			// 	var currentIndex = selectedItems.length === 0 ? -1 : oData.findIndex(item => item.selected);

			// 	if (currentIndex === -1) {
			// 		// If no items are selected, find the last item with today's ActivityDate
			// 		currentIndex = oData.findIndex(function (item) {
			// 			return item.ActivityDate === new Date().toISOString().slice(0, 10); // Adjust date comparison as necessary
			// 		});

			// 		if (currentIndex === -1) {
			// 			currentIndex = oData.length - 1;
			// 		}
			// 	}

			// 	// Create a new line object with default values
			// 	var oNewLine = {
			// 		selected: false,
			// 		PersonnelName: selectedItems.length === 0 ? oData[currentIndex].PersonnelName : selectedItems[0].PersonnelName,
			// 		PersonnelSurname: selectedItems.length === 0 ? oData[currentIndex].PersonnelSurname : selectedItems[0].PersonnelSurname,
			// 		ActivityDate: oData[currentIndex].ActivityDate,
			// 		ProjectCode: "",
			// 		ProjectName: "",
			// 		ActivityDuration: "",
			// 		Description: "",
			// 		Weekend: this._isWeekend(oData[currentIndex].ActivityDate),
			// 	};

			// 	// Insert the new line at the correct index
			// 	oData.splice(currentIndex + 1, 0, oNewLine);

			// 	// Update the OData model to reflect the new data
			// 	oBinding.getModel().setProperty("/", oData); // Update the OData model at the root level or appropriate path

			// 	// Refresh the binding if necessary
			// 	oBinding.refresh(true);
			// },
			onAddLine: function (oEvent) {
				// OData modelini doğrudan görünümden al
				var oTable = this.getView().byId("lineItemsList");
				var oBinding = oTable.getBinding("items");
				var oData = oBinding.getModel().getProperty(oBinding.getPath()); // Bağlama yolundaki veriye eriş

				// OData'nın boş olup olmadığını kontrol et
				if (!oData || !Array.isArray(oData)) {
					MessageToast.show("Veri bulunamadı. Lütfen tekrar deneyin.");
					return;
				}
				// Seçili öğeleri belirle
				var selectedItems = oData.filter((item) => item.selected === true); // Seçili öğeleri filtrele

				if (selectedItems.length > 1) {
					MessageToast.show(
						"Birden fazla satır seçili. Lütfen sadece bir tane seçin."
					);
					return;
				}

				var currentIndex =
					selectedItems.length === 0
						? -1
						: oData.findIndex((item) => item.selected);

				if (currentIndex === -1) {
					// Hiçbir öğe seçilmemişse, bugünkü ActivityDate ile son öğeyi bul
					currentIndex = oData.findIndex(function (item) {
						return item.ActivityDate === new Date().toISOString().slice(0, 10); // Tarih karşılaştırmasını gerektiği gibi ayarlayın
					});

					if (currentIndex === -1) {
						currentIndex = oData.length - 1; // Varsayılan olarak son öğeyi al
					}
				}

				// Varsayılan değerlerle yeni bir satır nesnesi oluştur
				var oNewLine = {
					selected: false,
					PersonnelName:
						selectedItems.length === 0
							? oData[currentIndex].PersonnelName
							: selectedItems[0].PersonnelName,
					PersonnelSurname:
						selectedItems.length === 0
							? oData[currentIndex].PersonnelSurname
							: selectedItems[0].PersonnelSurname,
					ActivityDate: oData[currentIndex].ActivityDate,
					ProjectCode: "",
					ProjectName: "",
					ActivityDuration: "",
					Description: "",
					Weekend: this._isWeekend(oData[currentIndex].ActivityDate),
				};

				// Yeni satırı doğru indekse ekle
				oData.splice(currentIndex + 1, 0, oNewLine);

				// OData modelini güncelle
				oBinding.getModel().setProperty(oBinding.getPath(), oData); // OData modelini uygun yolda güncelle

				// Gerekirse bağlamayı yenile
				oBinding.refresh(true);
			},
			onAddLine: function (oEvent) {
				// Get the OData model directly from the view
				var oTable = this.getView().byId("lineItemsList");
				var oBinding = oTable.getBinding("items");
				var oData = oBinding.getModel().getProperty(oBinding.getPath());

				// Check if the OData is not empty
				if (!oData || !Array.isArray(oData)) {
					MessageToast.show("Data not found. Please try again.");
					return;
				}

				// Determine the selected items
				var selectedItems = oData.filter((item) => item.selected === true);

				if (selectedItems.length > 1) {
					MessageToast.show(
						"Multiple rows are selected. Please select only one row."
					);
					return;
				}

				var currentIndex =
					selectedItems.length === 0
						? -1
						: oData.findIndex((item) => item.selected);

				if (currentIndex === -1) {
					// If no item is selected, find the last item with the current date
					currentIndex = oData.findIndex(function (item) {
						return item.ActivityDate === new Date().toISOString().slice(0, 10);
					});

					if (currentIndex === -1) {
						currentIndex = oData.length - 1; // Default to the last item
					}
				}

				// Create a new row object with default values
				var oNewLine = {
					selected: false,
					PersonnelName:
						selectedItems.length === 0
							? oData[currentIndex].PersonnelName
							: selectedItems[0].PersonnelName,
					PersonnelSurname:
						selectedItems.length === 0
							? oData[currentIndex].PersonnelSurname
							: selectedItems[0].PersonnelSurname,
					ActivityDate: oData[currentIndex].ActivityDate,
					ProjectCode: "",
					ProjectName: "",
					ActivityDuration: "",
					Description: "",
					Weekend: this._isWeekend(oData[currentIndex].ActivityDate),
				};

				// Insert the new row at the correct index
				oData.splice(currentIndex + 1, 0, oNewLine);

				// Update the OData model
				oBinding.getModel().setProperty(oBinding.getPath(), oData);

				// Refresh the binding if necessary
				oBinding.refresh(true);
			},
			onSaveActivities: function (oEvent) {
				var oDetailModel = this.getView().getModel("detailModel");
				var oDetailModelData = oDetailModel.getData();
				var sPernr = this.getView().getModel("activityDaysModel").getData()
					.selectedItem.Pernr;
				var oActivityDays = {
					Month: oDetailModelData[0].ActivityMonth,
					Pernr: sPernr,
					PersonnelName: oDetailModelData[0].PersonnelName,
					PersonnelSurname: oDetailModelData[0].PersonnelSurname,
					MonthName: oDetailModelData[0].MonthName,
					Year: oDetailModelData[0].ActivityYear,
					Guid: "GUID_DEFAULT",
					Status: "DETAIL",
					ActivityDetails: oDetailModelData.map(function (item) {
						return {
							Guid: "GUID_DEFAULT",
							Pernr: sPernr,
							PersonnelName: item.PersonnelName,
							PersonnelSurname: item.PersonnelSurname,
							ActivityDate: item.ActivityDate,
							ProjectCode: item.ProjectCode,
							ProjectName: item.ProjectName,
							ActivityMonth: item.ActivityMonth,
							ActivityMonthName: item.ActivityMonthName,
							ActivityYear: item.ActivityYear,
							ActivityDuration: parseFloat(item.ActivityDuration).toFixed(2),
							Description: item.Description,
							CostDetails: item.CostDetails,
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

				// Get theCostDetails data from detailModel
				var aCostData = [];
				aData.forEach(function (item) {
					if (item.CostDetails && item.CostDetails.results) {
						aCostData = aCostData.concat(item.CostDetails.results);
					}
				});

				// Convert the CostDetails data to a format suitable for SheetJS
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
				wsCost["!cols"] = wsCostcols;
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
