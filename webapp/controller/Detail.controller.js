sap.ui.define(
	[
		"./BaseController",
		"sap/ui/model/json/JSONModel",
		"../model/formatter",
		"sap/m/library",
		"sap/ui/export/Spreadsheet",
		"sap/m/MessageBox",
		"sap/m/MessageToast",
		"sap/ui/core/Fragment",
		"sap/m/upload/UploadSet",
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
		MessageToast,
		Fragment,
		UploadSet
		// "exceljs",  // Exceljs modülünü ekleyin
		// Exceljs,
		// FileSaver
	) {
		"use strict";

		// shortcut for sap.m.URLHelper
		var URLHelper = mobileLibrary.URLHelper;

		return BaseController.extend("zint.activity.system.controller.Detail", {
			formatter: formatter,
			oTemplateBox: {},
			costFileData: {
				Value: "", // Remove data URL prefix
				FileName: "",
				MimeType: "",
			},

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

				var oUploadModel = new sap.ui.model.json.JSONModel({
					items: [], // Başlangıçta boş bir liste
				});
				this.getView().setModel(oUploadModel, "uploadModel");

				this.oEventBus = sap.ui.getCore().getEventBus();
				this.oEventBus.subscribe(
					"master",
					"masterToDetail",
					this.onMasterButtonPressed,
					this
				);
			},

			onAfterRendering: function () {
				var oChristmasModeModel =
					this.getOwnerComponent().getModel("christmasMode");
				var boChristmasMode = oChristmasModeModel.getData().christmasMode;

				if (boChristmasMode) {
					this.addDetailStyleClass();
				} else {
					this.removeDetailStyleClass();
				}
			},
			onMasterButtonPressed: function (sChannel, sEvent, oData) {
				if (oData.mode) {
					this.addDetailStyleClass();
				} else {
					this.removeDetailStyleClass();
				}
			},

			addDetailStyleClass: function () {
				this.byId("addActButton").addStyleClass("christmasPanelStyle");
				this.byId("deleteActButton").addStyleClass("christmasPanelStyle");
				this.byId("editButton2").addStyleClass("christmasPanelStyle");
				this.byId("exportButton").addStyleClass("christmasPanelStyle");
				this.byId("addCostButton").addStyleClass("christmasPanelStyle");
				this.byId("deleteCostButton").addStyleClass("christmasPanelStyle");
				this.byId("idDetailTitle").addStyleClass("customTitle");
				this.byId("idCostTableTitle").addStyleClass("customTableTitle");
				this.byId("idDetailTableTitle").addStyleClass("customTableTitle");
				this.byId("idChristmasImage").setVisible(true);
			},

			removeDetailStyleClass: function () {
				this.byId("addActButton").removeStyleClass("christmasPanelStyle");
				this.byId("deleteActButton").removeStyleClass("christmasPanelStyle");
				this.byId("editButton2").removeStyleClass("christmasPanelStyle");
				this.byId("exportButton").removeStyleClass("christmasPanelStyle");
				this.byId("addCostButton").removeStyleClass("christmasPanelStyle");
				this.byId("deleteCostButton").removeStyleClass("christmasPanelStyle");
				this.byId("idDetailTitle").removeStyleClass("customTitle");
				this.byId("idCostTableTitle").removeStyleClass("customTableTitle");
				this.byId("idDetailTableTitle").removeStyleClass("customTableTitle");
				this.byId("idChristmasImage").setVisible(false);
			},
			onExit: function () {
				if (this.oEventBus) {
					this.oEventBus.unsubscribe(
						"master",
						"masterToDetail",
						this.onMasterButtonPressed,
						this
					);
				}
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
					if (oCostTable && this.oTemplateBox.hasOwnProperty("sId")) {
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

				// İlk satırdan verileri al
				var sPernr = aData[0].Pernr;
				var sActivityYear = aData[0].ActivityYear;
				var sActivityMonth = aData[0].ActivityMonthName;
				var sRecipient = "yunus.tuzun@interise.com.tr"; // Gönderilecek kişi e-posta adresi

				// E-posta bilgileri
				var sSubject =
					"Monthly Activity Report - " + sActivityYear + " " + sActivityMonth;
				var sBody =
					"Hello,\n\nPlease find the activity report for " +
					sActivityMonth +
					" " +
					sActivityYear; // + ".\n\nBest regards,\nYour Team";

				// mailto protokolü ile varsayılan e-posta uygulamasını aç
				var sMailTo =
					"mailto:" +
					encodeURIComponent(sRecipient) +
					"?subject=" +
					encodeURIComponent(sSubject) +
					"&body=" +
					encodeURIComponent(sBody);

				// Yeni bir pencere veya sekme açarak e-posta istemcisini tetikle
				window.location.href = sMailTo;
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
				// var oTable = this.byId("lineItemsList"); // Tabloyu alıyoruz
				// var oBinding = oTable.getBinding("items"); // Tabloyu bağlayan bindingi alıyoruz

				// // Tabloyu bağlayan modelin "ActivityDetails" path'ine veri eklemek için,
				// // veri setini alıyoruz ve yeni satırı ekliyoruz
				// var oModel = this.getView().getModel();
				// var aData = oBinding.getCurrentContexts().map(function (context) {
				// 	return context.getObject();
				// });

				// // Yeni satır verisini hazırlıyoruz
				// var oNewLine = {
				// 	PersonnelName: aData[0].PersonnelName,
				// 	ActivityDate: aData[0].ActivityDate,
				// 	ProjectCode: "",
				// 	ProjectName: "",
				// 	ActivityHour: 0,
				// 	Description: "",
				// 	Box: false, // Eğer checkbox varsa
				// 	Weekend: false, // Weekend durumunu da dahil edebiliriz
				// };
				// // Yeni satırı veriye ekliyoruz
				// aData.push(oNewLine);

				// // Veriyi backend'e eklemeden yalnızca frontend'de güncelledik
				// oBinding.refresh(); // Tabloyu güncelliyoruz

				// Tabloya bağlı olan modeli alın
				var oModel = this.getView().getModel("ActivityDetails");

				// Modelin mevcut verilerini alın
				var aData = oModel.getProperty("/");

				// Yeni bir satır için varsayılan veriler
				var oNewActivity = {
					PersonnelName: "John Doe", // Bu kısmı kendi dinamik verinize göre düzenleyebilirsiniz
					ActivityDate: new Date(),
					ProjectCode: "",
					ProjectName: "",
					ActivityDuration: 0,
					Description: "",
					Weekend: false, // Varsayılan olarak hafta sonu değil
					Box: false, // Varsayılan olarak seçim kutusu işaretli değil
				};

				// Yeni satırı mevcut verilere ekleyin
				aData.push(oNewActivity);

				// Güncellenmiş verileri modele geri yazın
				oModel.setProperty("/", aData);
			},

			onSaveActivities: function (oEvent) {
				var oHeaderInfos = oEvent.getSource().getBindingContext().getObject();
				var oTable = this.byId("lineItemsList");
				var aItems = oTable.getItems(); 
				var aData = aItems.map(function (oItem) {
					return oItem.getBindingContext().getObject(); 
				});
				var sPernr = oHeaderInfos.Pernr;
				var oActivityDays = {
					Month: oHeaderInfos.Month,
					Pernr: sPernr,
					PersonnelName: oHeaderInfos.PersonnelName,
					PersonnelSurname: oHeaderInfos.PersonnelSurname,
					MonthName: oHeaderInfos.MonthName,
					Year: oHeaderInfos.Year,
					Guid: "GUID_DEFAULT",
					Status: "DETAIL",
					ActivityDetails: aData.map(function (item) {
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
						MessageBox.error("Hata!");
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

			onViewFilePress: function (oEvent) {
				var oView = this.getView();
				var sButtonText = oEvent.getSource().getText();

				if (!this.byId("idEditFile")) {
					Fragment.load({
						id: oView.getId(),
						name: "zint.activity.system.fragment.EditFile",
						controller: this,
					}).then(
						function (oDialog) {
							oView.addDependent(oDialog);
							oDialog.data("sourceFragment", sButtonText);
							this.onFetchFiles(oEvent);
							oDialog.open();
							this._dialog = oDialog;
						}.bind(this)
					);
				} else {
					this.onFetchFiles(oEvent);
					this.byId("idEditFile").open();
				}
			},

			onFetchFiles: function (oEvent) {
				var oKeys = oEvent.getSource().getBindingContext().getObject();

				var oImage = this.getView().byId("idImageControl");

				var sPernr = oKeys.Pernr;
				var sProjectCode = oKeys.ProjectCode;
				var sActivityDate = oKeys.ActivityDate; // Tarih formatı datetime olmalı
				var sCostType = oKeys.CostType;

				var year = sActivityDate.getUTCFullYear();
				var month = ("0" + (sActivityDate.getUTCMonth() + 1)).slice(-2); // Aylar 0'dan başlar, bu yüzden 1 ekliyoruz
				var day = ("0" + sActivityDate.getUTCDate()).slice(-2);
				var hours = ("0" + sActivityDate.getUTCHours()).slice(-2);
				var minutes = ("0" + sActivityDate.getUTCMinutes()).slice(-2);
				var seconds = ("0" + sActivityDate.getUTCSeconds()).slice(-2);
				var formattedDate =
					"datetime'" +
					year +
					"-" +
					month +
					"-" +
					day +
					"T" +
					hours +
					"%3A" +
					minutes +
					"%3A" +
					seconds +
					"'";

				var sPath =
					"/FilesSet(Pernr='" +
					sPernr +
					"',ProjectCode='" +
					sProjectCode +
					"',ActivityDate=" +
					formattedDate +
					",CostType='" +
					sCostType +
					"')/$value";

				var oModel = new sap.ui.model.odata.v2.ODataModel(
					"/sap/opu/odata/sap/ZINT_ACTIVITY_SRV/",
					true
				);

				// // Path'i tanımlayın
				// var sPath =
				// 	"/FilesSet(Pernr='ACETIN',ProjectCode='AR04',ActivityDate=datetime'2024-01-05T00%3A00%3A00',CostType='SYH')/$value";

				// Binary veri için HTTP GET isteği gönderin
				var oRequest = new XMLHttpRequest();
				oRequest.open("GET", oModel.sServiceUrl + sPath, true);
				oRequest.responseType = "blob"; // Binary veri alacağımız için 'blob' formatı kullanıyoruz
				oRequest.setRequestHeader(
					"Authorization",
					oModel.getHeaders()["Authorization"]
				); // OData modelinin oturum bilgilerini aktar
				oRequest.onload = function () {
					if (oRequest.status === 200) {
						var oBlob = oRequest.response;
						var sMimeType = oBlob.type;
						var sBlobUrl = URL.createObjectURL(oBlob);

						// Set appropriate preview control based on file type
						var oImage = this.byId("idPreviewImage");
						var oIcon = this.byId("idFileIcon");
						var oObject = this.byId("idPreviewObject");

						if (
							oRequest
								.getResponseHeader("Content-Disposition")
								.match(/filename="(.+)"/) !== null &&
							oRequest
								.getResponseHeader("Content-Disposition")
								.match(/filename="(.+)"/)
						) {
							var sFileName = oRequest
								.getResponseHeader("Content-Disposition")
								.match(/filename="(.+)"/)[1];
							sFileName = decodeURIComponent(sFileName);
						}

						if (sFileName) {
							// File details (FileName, MimeType, etc.)
							var aFiles = [];
							aFiles.FileName = sFileName;
							aFiles.MimeType = sMimeType;
							aFiles.url = sBlobUrl; // Blob URL for preview

							var oUploadSetModel = this.getView().getModel("uploadModel");
							oUploadSetModel.setProperty("/items", aFiles);

							if (sMimeType === "application/pdf") {
								oIcon.setSrc("images/pdf-icon.png");
							} else if (
								sMimeType === "application/msword" ||
								sMimeType ===
									"application/vnd.openxmlformats-officedocument.wordprocessingml.document"
							) {
								oIcon.setSrc("images/word-icon.jpg"); // Word simgesi
							} else if (
								sMimeType === "application/vnd.ms-excel" ||
								sMimeType === "text/csv" ||
								sMimeType ===
									"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
							) {
								oIcon.setSrc("images/excel-icon.png"); // Excel simgesi
							} else if (sMimeType === "text/plain") {
								oIcon.setSrc("images/txt-icon.png");
							} else if (
								sMimeType === "application/vnd.ms-powerpoint" ||
								sMimeType ===
									"application/vnd.openxmlformats-officedocument.presentationml.presentation"
							) {
								oIcon.setSrc("images/ppt-icon.png");
							} else if (sMimeType.startsWith("image/")) {
								oImage.setSrc(sBlobUrl); // Resmi göster
								oImage.setVisible(true); // Görünür yap
								oObject.setVisible(false); // PDF veya Word gibi diğer dosyaları gizle
								oIcon.setVisible(false); // İconu gizle
							}

							// Resim için kontrol (image/ MIME tipi)
							if (!sMimeType.startsWith("image/")) {
								// Resim değilse dosya adı tıklanabilir yapılacak
								oObject.setTitle(sFileName); // Dosya adını link olarak yaz
								oObject.setVisible(true); // Dosya adını görünür yap
								oImage.setVisible(false); // Resmi gizle
								oIcon.setVisible(true);
							}
						} else {
							var aFiles = [];

							var oUploadSetModel = this.getView().getModel("uploadModel");
							oUploadSetModel.setProperty("/items", aFiles);
							oImage.setVisible(false); // Görünür yap
							oObject.setVisible(false);
							oIcon.setVisible(false);
						}
					} else {
						// Hata durumunu yönetin
						sap.m.MessageBox.error(
							"Dosya alınırken hata oluştu. HTTP Durum: " + oRequest.status
						);
					}
				}.bind(this);
				oRequest.onerror = function () {
					// Ağ hatası durumunda
					sap.m.MessageBox.error("Dosya alınamadı. Ağ hatası oluştu.");
				};
				oRequest.send();
			},

			onFileChangeCost: function (oEvent) {
				var oFileUploader = oEvent.getSource();
				var oFile =
					oEvent.getParameter("files") && oFileUploader.oFileUpload.files[0];
				var that = this;

				if (!oFile) {
					console.error("No file selected!");
					return;
				}

				var reader = new FileReader();

				reader.onload = function (e) {
					// Base64 string of the file
					that.costFileData = {
						Value: e.target.result.split(",")[1], // Remove data URL prefix
						FileName: oFile.name,
						MimeType: oFile.type,
					};
					console.log("File loaded successfully:", that.costFileData);
					// var oImageControl = that.byId("idImageControl2");
					// oImageControl.setSrc("data:" + oFile.type + ";base64," + e.target.result.split(",")[1]);
				};

				reader.onerror = function (error) {
					console.error("Error reading file:", error);
				};

				reader.readAsDataURL(oFile); // Read as Base64
			},

			onDownloadPress: function () {
				var aFiles = this.getView()
					.getModel("uploadModel")
					.getProperty("/items");
				var sFileUrl = aFiles.url;

				if (sFileUrl) {
					var oLink = document.createElement("a");
					oLink.href = sFileUrl;
					oLink.download = aFiles.FileName; // Download file with the original name
					oLink.click();
				} else {
					sap.m.MessageBox.error("No file available for download.");
				}
			},

			onClosePress: function () {
				var oDialog = this.byId("idEditFile");
				oDialog.close();
			},

			onSaveFile: function () {
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
					ProjectCode: this.getView().byId("inputProjectCodeCost").getValue(),
					ProjectName: this.getView().byId("inputProjectNameCost").getValue(),
					ActivityMonth: sMonth,
					ActivityMonthName: "",
					ActivityYear: oMasterData.Year,
					CostDetails: [
						{
							// TO DO burası seçili satırdan alınacak
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
							this.byId("idEditFile").destroy();
						}.bind(this),
						error: function (error) {
							MessageBox.error("Hata!");
							this.BusyDialog.close();
						}.bind(this),
					});
			},

			onPressCancelFile: function () {
				this.byId("idEditFile").destroy();
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
