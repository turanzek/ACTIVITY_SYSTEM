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
					"')"; 
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

				if (!oElementBinding.getBoundContext()) {
					this.getRouter().getTargets().display("detailObjectNotFound");

					this.getOwnerComponent().oListSelector.clearMasterListSelection();
					return;
				}

				var sPath = oElementBinding.getPath(),
					oResourceBundle = this.getResourceBundle(),
					oDetail = oView.getModel().getObject(sPath),
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
				var iOriginalViewBusyDelay = this.getView().getBusyIndicatorDelay(),
					oViewModel = this.getModel("detailView"),
					oLineItemTable = this.byId("lineItemsList"),
					iOriginalLineItemTableBusyDelay =
						oLineItemTable.getBusyIndicatorDelay();

				oViewModel.setProperty("/delay", 0);
				oViewModel.setProperty("/lineItemTableDelay", 0);

				oLineItemTable.attachEventOnce("updateFinished", function () {
					oViewModel.setProperty(
						"/lineItemTableDelay",
						iOriginalLineItemTableBusyDelay
					);
				});

				oViewModel.setProperty("/busy", true);
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

			onSendEmailPress: function () {
				var oViewModel = this.getModel("detailView");

				URLHelper.triggerEmail(
					null,
					oViewModel.getProperty("/shareSendEmailSubject"),
					oViewModel.getProperty("/shareSendEmailMessage")
				);
			},

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

			_isWeekend: function (date) {
				var day = date.getDay();
				// Cumartesi (6) veya Pazar (0) olup olmadığını kontrol eder
				return day === 0 || day === 6;
			},


			onSelectBox: function (oEvent) {
                // var oSelectedItem = oEvent.getSource().getParent();
                // var oContext = oSelectedItem.getBindingContext();
				var oContext = oEvent.getSource().getBindingContext();
                var sPath = oContext.getPath();
                sPath = sPath + "/CostDetails";
 
                var oCostTable = this.byId("idDetailCostModel");
                oCostTable.bindItems({
                    path: sPath,
                    template: oCostTable.getBindingInfo("items").template
                });
            },

			onCloseDetailPress: function () {
				this.getModel("appView").setProperty(
					"/actionButtonsInfo/midColumn/fullScreen",
					false
				);
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

						oDetailModel.setData(oDetailModelData);
					}
				} else if (oSelection.includes("add")) {
				}

			},

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
					
					currentIndex = oData.findIndex(function (item) {
						return item.ActivityDate === new Date().toISOString().slice(0, 10); // Tarih karşılaştırmasını gerektiği gibi ayarlayın
					});

					if (currentIndex === -1) {
						currentIndex = oData.length - 1; // Varsayılan olarak son öğeyi al
					}
				}

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

				oData.splice(currentIndex + 1, 0, oNewLine);


				oBinding.getModel().setProperty(oBinding.getPath(), oData); // OData modelini uygun yolda güncelle

				oBinding.refresh(true);
			},
			onAddLine: function (oEvent) {

				var oTable = this.getView().byId("lineItemsList");
				var oBinding = oTable.getBinding("items");
				var oData = oBinding.getModel().getProperty(oBinding.getPath());

				if (!oData || !Array.isArray(oData)) {
					MessageToast.show("Data not found. Please try again.");
					return;
				}

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
					currentIndex = oData.findIndex(function (item) {
						return item.ActivityDate === new Date().toISOString().slice(0, 10);
					});

					if (currentIndex === -1) {
						currentIndex = oData.length - 1; 
					}
				}

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
				oData.splice(currentIndex + 1, 0, oNewLine);
				oBinding.getModel().setProperty(oBinding.getPath(), oData);
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

				var aCostData = [];
				aData.forEach(function (item) {
					if (item.CostDetails && item.CostDetails.results) {
						aCostData = aCostData.concat(item.CostDetails.results);
					}
				});

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
				XLSX.writeFile(wb, "DetailData.xlsx");
			},
			onLiveChangeRestrictToNumbers: function (oEvent) {
				var oInput = oEvent.getSource();
				var sValue = oInput.getValue();

				if (!/^\d*\.?\d*$/.test(sValue)) {
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
					this.getModel("appView").setProperty(
						"/previousLayout",
						this.getModel("appView").getProperty("/layout")
					);
					this.getModel("appView").setProperty(
						"/layout",
						"MidColumnFullScreen"
					);
				} else {
					this.getModel("appView").setProperty(
						"/layout",
						this.getModel("appView").getProperty("/previousLayout")
					);
				}
			},
		});
	}
);
