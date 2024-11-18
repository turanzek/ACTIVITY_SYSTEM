sap.ui.define(
	[
		"./BaseController",
		"sap/ui/model/json/JSONModel",
		"../model/formatter",
		"sap/m/library",
		"sap/ui/export/Spreadsheet",
		"sap/m/MessageBox",
		"sap/m/MessageToast",
		// "exceljs",  // exceljs modülünü ekleyin
		// "file-saver" // FileSaver modülünü ekleyin,
	],
	function (
		BaseController,
		JSONModel,
		formatter,
		mobileLibrary,
		Spreadsheet,
		MessageBox,
		MessageToast
		// Exceljs,
		// FileSaver
	) {
		"use strict";

		// shortcut for sap.m.URLHelper
		var URLHelper = mobileLibrary.URLHelper;

		return BaseController.extend("zint.activity.system.controller.Detail", {
			formatter: formatter,
			oTemplateBox: {},

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

				// Modeldeki tüm bağlamları al
				if (this.getView().getModel().getBindings() !== undefined) {
					var aBindings = this.getView().getModel().getBindings();

					// Binding'lerdeki verileri kontrol et
					aBindings.forEach(function (oBinding) {
						var oContext = oBinding.getContext(); // Bağlamı al
						if (oContext) {
							var sPath = oContext.getPath(); // Bağlamdaki path
							var oData = oContext.getModel().getObject(sPath);

							// Eğer Box özelliği varsa, Box'ı false yap
							if (oData && oData.Box !== undefined) {
								oContext.getModel().setProperty(sPath + "/Box", false);
							}
						}
					});

					// idDetailCostModel tablosunun verisini sıfırla
					var oCostTable = this.byId("idDetailCostModel");
					if (oCostTable &&  this.oTemplateBox.hasOwnProperty("sId") ) {
						oCostTable.unbindItems(); // Tablodaki tüm veriyi kaldırır
					}
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
				var oBinding = this.byId("lineItemsList").getBinding("items");
				var aData = oBinding.getCurrentContexts().map(function (context) {
					return context.getObject();
				});

				var sPernr = aData[0].Pernr;
				var sGuid = aData[0].Guid;
				var sActivityYear = aData[0].ActivityYear;
				var sActivityMonth = aData[0].ActivityMonth;

				// Promisify read request for COSTSSET data
				var aCostDataPromise = new Promise((resolve, reject) => {
					this.getModel().read("/CostsSet", {
						filters: [
							new sap.ui.model.Filter(
								"Pernr",
								sap.ui.model.FilterOperator.EQ,
								sPernr
							),
							new sap.ui.model.Filter(
								"Guid",
								sap.ui.model.FilterOperator.EQ,
								sGuid
							),
							new sap.ui.model.Filter(
								"ActivityYear",
								sap.ui.model.FilterOperator.EQ,
								sActivityYear
							),
							new sap.ui.model.Filter(
								"ActivityMonth",
								sap.ui.model.FilterOperator.EQ,
								sActivityMonth
							),
						],
						success: function (oData) {
							resolve(oData.results || []);
						},
						error: function (error) {
							reject(error);
						},
					});
				});

				// Read request completed, now generate Excel
				aCostDataPromise
					.then((aCostData) => {
						var workbook = new ExcelJS.Workbook();
						var worksheet = [
							workbook.addWorksheet("Details"),
							workbook.addWorksheet("Costs"),
						];

						// Set columns and header styles
						worksheet[0].columns = [
							{ header: "Personnel Name", key: "PersonnelName", width: 18 },
							{ header: "Activity Date", key: "ActivityDate", width: 15 },
							{ header: "Project Code", key: "ProjectCode", width: 15 },
							{ header: "Project Name", key: "ProjectName", width: 25 },
							{ header: "Activity Hour", key: "ActivityHour", width: 12 },
							{ header: "Description", key: "Description", width: 80 },
						];

						worksheet[1].columns = [
							{ header: "Personnel Name", key: "PersonnelName", width: 18 },
							{ header: "Activity Date", key: "ActivityDate", width: 15 },
							{ header: "Project Name", key: "ProjectName", width: 25 },
							{ header: "Cost Type", key: "CostType", width: 10 },
							{ header: "Cost Name", key: "CostName", width: 20 },
							{ header: "Amount", key: "Amount", width: 15 },
							{ header: "Currency", key: "Currency", width: 10 },
							{ header: "Description", key: "Description", width: 80 },
						];

						// Apply header styling
						worksheet.forEach((ws) => {
							ws.getRow(1).eachCell(function (cell) {
								cell.fill = {
									type: "pattern",
									pattern: "solid",
									fgColor: { argb: "FFFFFF00" }, // Yellow background
								};
								cell.font = { bold: true, color: { argb: "FF000000" } }; // Bold text
								cell.border = {
									top: { style: "thin", color: { argb: "FF000000" } },
									left: { style: "thin", color: { argb: "FF000000" } },
									bottom: { style: "thin", color: { argb: "FF000000" } },
									right: { style: "thin", color: { argb: "FF000000" } },
								};
							});
						});

						// Add data to the first sheet
						aData.map(function (item) {
							worksheet[0].addRow({
								PersonnelName: item.PersonnelName + " " + item.PersonnelSurname,
								ActivityDate: item.ActivityDate,
								ProjectCode: item.ProjectCode,
								ProjectName: item.ProjectName,
								ActivityHour: item.ActivityHour,
								Description: item.Description,
							});
						});

						// Add cost data to the second sheet
						aCostData.map(function (item) {
							worksheet[1].addRow({
								PersonnelName: item.PersonnelName + " " + item.PersonnelSurname,
								ActivityDate: item.ActivityDate,
								ProjectName: item.ProjectName,
								CostName: item.CostName,
								CostType: item.CostType,
								Amount: item.CostAmount,
								Currency: item.CostCurrency,
								Description: item.Description,
							});
						});

						var sExcelName =
							aData[0].PersonnelName +
							"_" +
							aData[0].PersonnelSurname +
							"_" +
							aData[0].ActivityYear +
							"_" +
							aData[0].ActivityMonthName +
							"_" +
							"Activity" +
							".xlsx";

						// Create the Excel buffer
						workbook.xlsx.writeBuffer().then(function (buffer) {
							var blob = new Blob([buffer], {
								type: "application/octet-stream",
							});

							// Prepare FormData with the file to send it to the backend
							var formData = new FormData();
							formData.append("file", blob, sExcelName);

							// Send data to backend (make sure to replace with your backend URL)

							// POST https://graph.microsoft.com/v1.0/me/messages/{id}/attachments
							// Content-type: application/json

							// {
							//   "@odata.type": "microsoft.graph.fileAttachment",
							//   "name": "name-value",
							//   "contentType": "contentType-value",
							//   "isInline": false,
							//   "contentLocation": "contentLocation-value",
							//   "contentBytes": "base64-contentBytes-value"
							// }

							fetch(
								"https://graph.microsoft.com/v1.0/me/messages/{id}/attachments",
								{
									method: "POST",
									body: formData,
								}
							)
								.then((response) => response.json())
								.then((data) => {
									if (data.success) {
										MessageBox.success("E-mail sent successfully!");
									} else {
										MessageBox.error("Error sending e-mail: " + data.error);
									}
								})
								.catch((error) => {
									MessageBox.error("Error sending e-mail: " + error.message);
								});
						});
					})
					.catch((error) => {
						MessageBox.error("Error fetching COSTSSET data: " + error.message);
					});
			},
			onSendEmailPress4: function () {
				var oBinding = this.byId("lineItemsList").getBinding("items");
				var aData = oBinding.getCurrentContexts().map(function (context) {
					return context.getObject();
				});

				var sPernr = aData[0].Pernr;
				var sGuid = aData[0].Guid;
				var sActivityYear = aData[0].ActivityYear;
				var sActivityMonth = aData[0].ActivityMonth;

				// Promisify read request for COSTSSET data
				var aCostDataPromise = new Promise((resolve, reject) => {
					this.getModel().read("/CostsSet", {
						filters: [
							new sap.ui.model.Filter(
								"Pernr",
								sap.ui.model.FilterOperator.EQ,
								sPernr
							),
							new sap.ui.model.Filter(
								"Guid",
								sap.ui.model.FilterOperator.EQ,
								sGuid
							),
							new sap.ui.model.Filter(
								"ActivityYear",
								sap.ui.model.FilterOperator.EQ,
								sActivityYear
							),
							new sap.ui.model.Filter(
								"ActivityMonth",
								sap.ui.model.FilterOperator.EQ,
								sActivityMonth
							),
						],
						success: function (oData) {
							resolve(oData.results || []);
						},
						error: function (error) {
							reject(error);
						},
					});
				});

				// Read request completed, now generate Excel
				aCostDataPromise
					.then((aCostData) => {
						var workbook = new ExcelJS.Workbook();
						var worksheet = [
							workbook.addWorksheet("Details"),
							workbook.addWorksheet("Costs"),
						];

						// Set columns and header styles
						worksheet[0].columns = [
							{ header: "Personnel Name", key: "PersonnelName", width: 18 },
							{ header: "Activity Date", key: "ActivityDate", width: 15 },
							{ header: "Project Code", key: "ProjectCode", width: 15 },
							{ header: "Project Name", key: "ProjectName", width: 25 },
							{ header: "Activity Hour", key: "ActivityHour", width: 12 },
							{ header: "Description", key: "Description", width: 80 },
						];

						worksheet[1].columns = [
							{ header: "Personnel Name", key: "PersonnelName", width: 18 },
							{ header: "Activity Date", key: "ActivityDate", width: 15 },
							{ header: "Project Name", key: "ProjectName", width: 25 },
							{ header: "Cost Type", key: "CostType", width: 10 },
							{ header: "Cost Name", key: "CostName", width: 20 },
							{ header: "Amount", key: "Amount", width: 15 },
							{ header: "Currency", key: "Currency", width: 10 },
							{ header: "Description", key: "Description", width: 80 },
						];

						// Apply header styling
						worksheet.forEach((ws) => {
							ws.getRow(1).eachCell(function (cell) {
								cell.fill = {
									type: "pattern",
									pattern: "solid",
									fgColor: { argb: "FFFFFF00" }, // Yellow background
								};
								cell.font = { bold: true, color: { argb: "FF000000" } }; // Bold text
								cell.border = {
									top: { style: "thin", color: { argb: "FF000000" } },
									left: { style: "thin", color: { argb: "FF000000" } },
									bottom: { style: "thin", color: { argb: "FF000000" } },
									right: { style: "thin", color: { argb: "FF000000" } },
								};
							});
						});

						// Add data to the first sheet
						aData.map(function (item) {
							worksheet[0].addRow({
								PersonnelName: item.PersonnelName + " " + item.PersonnelSurname,
								ActivityDate: item.ActivityDate,
								ProjectCode: item.ProjectCode,
								ProjectName: item.ProjectName,
								ActivityHour: item.ActivityHour,
								Description: item.Description,
							});
						});

						// Add cost data to the second sheet
						aCostData.map(function (item) {
							worksheet[1].addRow({
								PersonnelName: item.PersonnelName + " " + item.PersonnelSurname,
								ActivityDate: item.ActivityDate,
								ProjectName: item.ProjectName,
								CostName: item.CostName,
								CostType: item.CostType,
								Amount: item.CostAmount,
								Currency: item.CostCurrency,
								Description: item.Description,
							});
						});

						var sExcelName =
							aData[0].PersonnelName +
							"_" +
							aData[0].PersonnelSurname +
							"_" +
							aData[0].ActivityYear +
							"_" +
							aData[0].ActivityMonthName +
							"_" +
							"Activity" +
							".xlsx";

						// Create the Excel buffer
						// workbook.xlsx.writeBuffer().then(function (buffer) {
						// 	var blob = new Blob([buffer], { type: "application/octet-stream" });

						// Dosyayı oluştur ve indir
						workbook.xlsx.writeBuffer().then(function (buffer) {
							var blob = new Blob([buffer], {
								type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
							});
							var url = URL.createObjectURL(blob);

							// Dosyayı indir
							var a = document.createElement("a");
							a.href = url;
							a.download = sExcelName;
							a.click();

							// `mailto` linki ile e-posta aç
							var sRecipient = "yunus.tuzun@interise.com.tr";
							var sSubject = encodeURIComponent(
								"Aktivite Raporu: " + sExcelName
							);
							var sBody = encodeURIComponent(
								"Merhaba,\n\nLütfen ekteki aktiviteleri inceleyin.\n\nSaygılarımla,\n\n[Adınız]"
							);
							var mailtoLink =
								"mailto:" +
								sRecipient +
								"?subject=" +
								sSubject +
								"&body=" +
								sBody;

							window.location.href = mailtoLink;
						});
					})
					.catch((error) => {
						MessageBox.error("Error fetching COSTSSET data: " + error.message);
					});
			},
			onSendEmailPress2: function () {
				var oMonthTranslations = {
					January: "Ocak",
					February: "Şubat",
					March: "Mart",
					April: "Nisan",
					May: "Mayıs",
					June: "Haziran",
					July: "Temmuz",
					August: "Ağustos",
					September: "Eylül",
					October: "Ekim",
					November: "Kasım",
					December: "Aralık",
				};

				var oViewModel = this.getModel("detailView");
				var oBinding = this.byId("lineItemsList").getBinding("items");
				var aData = oBinding.getCurrentContexts().map(function (context) {
					return context.getObject();
				});
				var sMonth = aData[0].ActivityMonthName;
				var sMonthTurkish = oMonthTranslations[sMonth] || sMonth;
				var sRecipient = "yunus.tuzun@interise.com.tr";
				var sSubject = sMonthTurkish + " Ayı Aktiviteleri";
				var sMessage =
					"Selam abi,\n\n" +
					sMonthTurkish +
					" ayına ait aktivitelerim ektedir.";

				URLHelper.triggerEmail(sRecipient, sSubject, sMessage);
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
				var oModel = oContext.getModel();
				var bCurrentSelected = oModel.getProperty(oContext.getPath() + "/Box");
				var sPath = oContext.getPath();
				sPath = sPath + "/CostDetails";
				var oCostTable = this.byId("idDetailCostModel");

				if (!bCurrentSelected) {
					if (oCostTable.getBindingInfo("items")) {
						this.oTemplateBox = oCostTable.getBindingInfo("items").template;
					}
					oCostTable.bindItems({
						path: sPath,
						template: this.oTemplateBox,
					});
				} else {
					oCostTable.unbindItems();
				}
				oModel.setProperty(oContext.getPath() + "/Box", !bCurrentSelected);
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
							oDetailModelData.CostDetails =
								oDetailModelData.CostDetails.filter(function (item) {
									return item.selected !== true;
								});
						}

						oDetailModel.setData(oDetailModelData);
					}
				} else if (oSelection.includes("add")) {
				}
			},

			onAddLine: function () {
				var oTable = this.byId("lineItemsList"); // Tabloyu alıyoruz
				var oBinding = oTable.getBinding("items"); // Tabloyu bağlayan bindingi alıyoruz

				// Tabloyu bağlayan modelin "ActivityDetails" path'ine veri eklemek için,
				// veri setini alıyoruz ve yeni satırı ekliyoruz
				var oModel = this.getView().getModel();
				var aData = oBinding.getCurrentContexts().map(function (context) {
					return context.getObject();
				});

				// Yeni satır verisini hazırlıyoruz
				var oNewLine = {
					PersonnelName: aData[0].PersonnelName,
					ActivityDate: aData[0].ActivityDate,
					ProjectCode: "",
					ProjectName: "",
					ActivityHour: 0,
					Description: "",
					Box: false, // Eğer checkbox varsa
					Weekend: false, // Weekend durumunu da dahil edebiliriz
				};
				// Yeni satırı veriye ekliyoruz
				aData.push(oNewLine);

				// Veriyi backend'e eklemeden yalnızca frontend'de güncelledik
				oBinding.refresh(); // Tabloyu güncelliyoruz
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
				var oBinding = this.byId("lineItemsList").getBinding("items");
				var aData = oBinding.getCurrentContexts().map(function (context) {
					return context.getObject();
				});

				var sPernr = aData[0].Pernr;
				var sGuid = aData[0].Guid;
				var sActivityYear = aData[0].ActivityYear;
				var sActivityMonth = aData[0].ActivityMonth;

				// Promisify read request for COSTSSET data
				var aCostDataPromise = new Promise((resolve, reject) => {
					this.getModel().read("/CostsSet", {
						filters: [
							new sap.ui.model.Filter(
								"Pernr",
								sap.ui.model.FilterOperator.EQ,
								sPernr
							),
							new sap.ui.model.Filter(
								"Guid",
								sap.ui.model.FilterOperator.EQ,
								sGuid
							),
							new sap.ui.model.Filter(
								"ActivityYear",
								sap.ui.model.FilterOperator.EQ,
								sActivityYear
							),
							new sap.ui.model.Filter(
								"ActivityMonth",
								sap.ui.model.FilterOperator.EQ,
								sActivityMonth
							),
						],
						success: function (oData) {
							resolve(oData.results || []);
						},
						error: function (error) {
							reject(error);
						},
					});
				});

				// Read request completed, now generate Excel
				aCostDataPromise
					.then((aCostData) => {
						var workbook = new ExcelJS.Workbook();
						var worksheet = [
							workbook.addWorksheet("Details"),
							workbook.addWorksheet("Costs"),
						];

						// Set columns and header styles
						worksheet[0].columns = [
							{ header: "Personnel Name", key: "PersonnelName", width: 18 },
							{ header: "Activity Date", key: "ActivityDate", width: 15 },
							{ header: "Project Code", key: "ProjectCode", width: 15 },
							{ header: "Project Name", key: "ProjectName", width: 25 },
							{ header: "Activity Hour", key: "ActivityHour", width: 12 },
							{ header: "Description", key: "Description", width: 80 },
						];

						worksheet[1].columns = [
							{ header: "Personnel Name", key: "PersonnelName", width: 18 },
							{ header: "Activity Date", key: "ActivityDate", width: 15 },
							{ header: "Project Name", key: "ProjectName", width: 25 },
							{ header: "Cost Type", key: "CostType", width: 10 },
							{ header: "Cost Name", key: "CostName", width: 20 },
							{ header: "Amount", key: "Amount", width: 15 },
							{ header: "Currency", key: "Currency", width: 10 },
							{ header: "Description", key: "Description", width: 80 },
						];

						// Apply header styling
						worksheet.forEach((ws) => {
							ws.getRow(1).eachCell(function (cell) {
								cell.fill = {
									type: "pattern",
									pattern: "solid",
									fgColor: { argb: "FFFFFF00" }, // Yellow background
								};
								cell.font = { bold: true, color: { argb: "FF000000" } }; // Bold text
								cell.border = {
									top: { style: "thin", color: { argb: "FF000000" } },
									left: { style: "thin", color: { argb: "FF000000" } },
									bottom: { style: "thin", color: { argb: "FF000000" } },
									right: { style: "thin", color: { argb: "FF000000" } },
								};
							});
						});

						// Add data to the first sheet
						aData.map(function (item) {
							worksheet[0].addRow({
								PersonnelName: item.PersonnelName + " " + item.PersonnelSurname,
								ActivityDate: item.ActivityDate,
								ProjectCode: item.ProjectCode,
								ProjectName: item.ProjectName,
								ActivityHour: item.ActivityHour,
								Description: item.Description,
							});
						});

						// Add cost data to the second sheet
						aCostData.map(function (item) {
							worksheet[1].addRow({
								PersonnelName: item.PersonnelName + " " + item.PersonnelSurname,
								ActivityDate: item.ActivityDate,
								ProjectName: item.ProjectName,
								CostName: item.CostName,
								CostType: item.CostType,
								Amount: item.CostAmount,
								Currency: item.CostCurrency,
								Description: item.Description,
							});
						});

						var sExcelName =
							aData[0].PersonnelName +
							"_" +
							aData[0].PersonnelSurname +
							"_" +
							aData[0].ActivityYear +
							"_" +
							aData[0].ActivityMonthName +
							"_" +
							"Activity" +
							".xlsx";
						// Create and save Excel file
						workbook.xlsx.writeBuffer().then(function (buffer) {
							var blob = new Blob([buffer], {
								type: "application/octet-stream",
							});
							saveAs(blob, sExcelName);
						});
					})
					.catch((error) => {
						MessageBox.error("Error fetching COSTSSET data: " + error.message);
					});
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
