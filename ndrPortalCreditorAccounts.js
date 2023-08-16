import { LightningElement, api } from 'lwc';
import ndrPortalAssets from '@salesforce/resourceUrl/ndrPortalAssets';
import { wire } from 'lwc';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import USER_ID from '@salesforce/user/Id';
import CONTACT_ID_FIELD from '@salesforce/schema/User.ContactId';
import DS_ID from '@salesforce/schema/Contact.Portal_Deal__r.Id';
import CLIENT_NAME from '@salesforce/schema/Contact.Portal_Deal__r.Client_Name_Formula__c';
import getCreditorsData from '@salesforce/apex/ndrLWCPortalController.getCreditorsData';
import { CurrentPageReference } from 'lightning/navigation';
import { formatCurrency, truncateName, getIsSitePreview } from 'c/ndrPortalUtils'
import validateAndApproveSettlement from '@salesforce/apex/ndrLWCPortalController.validateAndApproveSettlement';
import basePath from '@salesforce/community/basePath';

const USER_FIELDS = [CONTACT_ID_FIELD];
const CONTACT_FIELDS = [DS_ID, CLIENT_NAME];

export default class NdrPortalCreditorAccounts extends LightningElement {
    @api paymentCol1 = "Date";
    @api paymentCol2 = "Amount";
    @api paymentCol3 = "Status";
    @api creditorRowItemLabel1 = "Paid to Creditor";
    @api creditorRowItemLabel2 = "Settlement & Fee";
    @api creditorRowItemLabel3 = "Balance at Settlement";
    @api creditorSummaryItemLabel1 = "BALANCE AT ENROLLMENT";
    @api creditorSummaryItemLabel2 = "SETTLEMENT";
    @api creditorSummaryItemLabel3 = "SETTLEMENT PERCENTAGE";
    @api creditorSummaryItemLabel4 = "TOTAL FEES";
    @api modalHeader = "Settlement Approval Confirmation";
    @api modalDisplayText = "Please Review the settlement details below and click the ‘Approve’ button to agree to these terms. Once you approve, we we will confirm with your creditor and begin to make payments from your dedicated savings account.";
    @api modalCancelText = "Cancel";
    @api modalApproveText = "Approve";
    isLoading = true;
    backdropClass = "slds-backdrop";
    isModalLoading = false;
    showModal = false;
    progressBarMaskURL = `${'url(#maskprogress-bar-6)'}`;
    progressBarMaskId = "maskprogress-bar-6";
    pageIndex = "0";
    sortValue = "Status(All-Priority-First)";
    sortTrigger = false;
    triggerAnimation = "";
    pageTriggerDirection = "right";
    prevPageIndex = 0;
    credAcctType = "All";
    selectedOffer;
    clientName = "";
    pageIndexRange = "";
    directoryLookup = [0];
    prevDirectoryLookup = [0];
    dsId;
    needApprovalList;
    messageType;
    message;
    contactId;
    creditorList = [];
    creditorDirectory = [];
    creditorTableClass = "creditor_table_wrapper";
    credTableShowClass = "show";
    credTableHideClass = "hide";
    defaultCreditorItemClass = "creditor_item_wrapper default_creditor_item";
    callUsCreditorItemClass = "creditor_item_wrapper --onHold default_creditor_item";
    needApprovalCreditorItemClass = "creditor_item_wrapper need_approved_item";
    AllDirectoryIndex;
    IssuingPaymentsDirectoryIndex;
    PaidinFullDirectoryIndex;
    EnrolledDirectoryIndex;
    CallUsDirectoryIndex;
    ReworkingOfferDirectoryIndex;
    FinalizingOfferDirectoryIndex;
    NeedApprovalDirectoryIndex;
    AllPageIndex;
    IssuingPaymentsPageIndex;
    PaidinFullPageIndex;
    EnrolledPageIndex;
    CallUsPageIndex;
    ReworkingOfferPageIndex;
    FinalizingOfferPageIndex;
    NeedApprovalPageIndex;
    fullDirectory;
    creditorTablePageList = [];
    credIndexItems;
    typeCountObject;
    typeCountAll;
    typeCountReworkingOffer;
    typeCountNeedApproval;
    typeCountFinalizingOffer;
    typeCountEnrolled;
    typeCountPaidInFull;
    typeCountCallUs;
    cidQuery;
    targetPageIndex;
    targetDirectoryIndex;
    hasRendered = true;
    /*Creditor Type Classes*/
    IssuingPaymentsClass = "type--issuingPayments";
    async submitApproval(event) {
        try {

            this.isModalLoading = true;

            var credId = event.target.dataset.ciid;
            console.log('review cred Id', credId);
            var response = await validateAndApproveSettlement({ ciId: credId });
            if (response) {
                console.log('review submit approval resposne', response);


                if (response == "Settlement Approved") {
                    this.messageType = "success";
                    this.message = "Settlement Approval has been processed successfully";
                    window.location.href = basePath + '/dashboard'

                } else {
                    this.messageType = "error";
                    this.message = "There was an error processing your request."
                }
                this.isModalLoading = false;

            }
            /*
            this.messageType = "success";
            this.message = "Password changed successfully."*/




        } catch (error) {
            console.log('error', error);
            this.messageType = "error";
            this.message = "Sorry there was an error processing the request...";
        } finally {
            this.isModalLoading = false;
        }
    }
    closeModal(event) {

        event.preventDefault();
        if (event.type == "keypress") {
            if (event.which == "13" || event.which == "32") {
                this.message = "";
                this.messageType = "";
                this.showModal = !this.showModal;

                document.querySelector('html').style.overflowY = `${this.showModal ? 'hidden' : 'scroll'}`
                this.backdropClass = `${this.showModal ? 'slds-backdrop slds-backdrop_open' : 'slds-backdrop'}`
            }
        } else {
            this.message = "";
            this.messageType = "";
            this.showModal = !this.showModal;

            document.querySelector('html').style.overflowY = `${this.showModal ? 'hidden' : 'scroll'}`
            this.backdropClass = `${this.showModal ? 'slds-backdrop slds-backdrop_open' : 'slds-backdrop'}`

        }
    }

    openModal() {
        this.showModal = !this.showModal;

        document.querySelector('html').style.overflowY = `${this.showModal ? 'hidden' : 'scroll'}`
        this.backdropClass = `${this.showModal ? 'slds-backdrop slds-backdrop_open' : 'slds-backdrop'}`

    }
    @wire(getRecord, { recordId: USER_ID, fields: USER_FIELDS })
    wiredCRecord({ error, data }) {

        if (error) {
            let message = 'Unknown error';
            if (Array.isArray(error.body)) {
                message = error.body.map(e => e.message).join(', ');
            } else if (typeof error.body.message === 'string') {
                message = error.body.message;
            }
            console.log('error', message);

        } else if (data) {

            this.contactId = getFieldValue(data, CONTACT_ID_FIELD);
        }
    }
    @wire(getRecord, { recordId: '$contactId', fields: CONTACT_FIELDS })
    wiredDRecord({ error, data }) {
        if (error) {
            let message = 'Unknown error';
            if (Array.isArray(error.body)) {
                message = error.body.map(e => e.message).join(', ');
            } else if (typeof error.body.message === 'string') {
                message = error.body.message;
            }
            console.log('error', message);

        } else if (data) {

            //this.isLoading = false;
            this.dsId = getFieldValue(data, DS_ID);
            this.clientName = getFieldValue(data, CLIENT_NAME);
            this.getCreditorAccounts();

        }
    }
    getCredTypeText(credStatusType) {
        var credTypeDisplay;
        if (credStatusType == "Paid In Full") {
            credTypeDisplay = `Paid In Full ` + String.fromCharCode(10003);

        }

        return credTypeDisplay;

    }

    getColorByProgType(statusType) {

        if (statusType == "Issuing Payments") {
            return "#20037d";
        }
        if (statusType == "Paid In Full") {
            return "#0074e1";
        }
        if (statusType == "Enrolled") {
            return "#000000";
        }
        if (statusType == "Call Us") {
            return "#d82c50";
        }
        if (statusType == "Finalizing Offer") {
            return "#4f81bd";
        } else if (statusType == "Reworking Offer") {
            return "#00467D";
        }
    };
    getCredTypeClass(credStatusType) {
        var credTypeStyle;
        if (credStatusType == "Issuing Payments") {
            credTypeStyle = "type--issuingPayments";
        }
        if (credStatusType == "Paid In Full") {
            credTypeStyle = "type--paidinFull";



        }
        if (credStatusType == "Enrolled") {
            credTypeStyle = "type--enrolled";
        }

        if (credStatusType == "Reworking Offer") {
            credTypeStyle = "type--reworkingOffer";
        }
        if (credStatusType == "Call Us") {
            credTypeStyle = "type--callUs";
        }
        if (credStatusType == "Finalizing Offer") {
            credTypeStyle = "type--finalizingOffer";
        }
        return credTypeStyle;
    }
    paginateGen(pages, lookupDirectory) {
        let key = 0;

        if (pages.length > 1) {
            return pages.map((page, index) => { return Object.assign({ index: index + 1, lookupPage: lookupDirectory[page] }) })
        } else {
            return false;
        }
    }
    getCredAmountTypeClass(credStatusType) {
        var credTypeStyle;
        if (credStatusType == "Issuing Payments") {
            credTypeStyle = "creditor_amount type--issuingPayments";
        }
        if (credStatusType == "Paid In Full") {
            credTypeStyle = "creditor_amount type--paidinFull";



        }
        if (credStatusType == "Needs Your Approval") {
            credTypeStyle = "creditor_amount type--callUs";



        }
        if (credStatusType == "Enrolled") {
            credTypeStyle = "creditor_amount type--enrolled";
        }

        if (credStatusType == "Reworking Offer") {
            credTypeStyle = "creditor_amount type--reworkingOffer";
        }
        if (credStatusType == "Call Us") {
            credTypeStyle = "creditor_amount type--callUs";
        }
        if (credStatusType == "Finalizing Offer") {
            credTypeStyle = "creditor_amount type--finalizingOffer";
        }
        return credTypeStyle;
    }
    getTotalClearedPS(PS) {
        var clearedPS = [];
        for (let i = 0; i < PS.length; i++) {

            if (PS[i].paymentStatus == "Cleared") {

                clearedPS.push(PS[i]);
            }
        }
        return clearedPS.length;

    }

    formatPSList(PS) {

        var PSList = [...PS];
        console.log('Ps list', PSList);
        var newPSObject = {};

        //PL-187 Creditor Payments and Fees 

        var PSCreditorList = [...PS].filter(ps => ps.type.includes('Creditor') == true);
        var PSFeeList = [...PS].filter(ps => ps.type.includes('PB Fee') == true);
        var newCreditors = [];
        var newFees = [];
        console.log('review cred list', PSCreditorList);
        console.log('review cred fee list', PSFeeList);
        //PL-70 SORT BY DATE ASC
        //Safari Bug -- hyphenated date NaN



        //Sort
        if (PSCreditorList.length > 1) {
            PSCreditorList = [...PSCreditorList].sort(function(a, b) {
                var dateA = new Date(a.paymentDate);
                var dateB = new Date(b.paymentDate);
                if (dateA < dateB) return -1;
                if (dateB > dateA) return 1;
                return 0;
            })
        }
        //Sort
        if (PSFeeList.length > 1) {
            PSFeeList = [...PSFeeList].sort(function(a, b) {
                var dateA = new Date(a.paymentDate);
                var dateB = new Date(b.paymentDate);
                if (dateA < dateB) return -1;
                if (dateB > dateA) return 1;
                return 0;
            })
        }


        //Format
        for (let i = 0; i < PSCreditorList.length; i++) {
            var tempDate = PSCreditorList[i].paymentDate;
            var tempStatus = PSCreditorList[i].paymentStatus;

            var tempAmount = PSCreditorList[i].creditorPayments != null ? formatCurrency(PSCreditorList[i].creditorPayments) : '';

            if (PSCreditorList[i].paymentStatus == "Cleared") {
                tempStatus = String.fromCharCode(10003) + PSCreditorList[i].paymentStatus;

            }
            tempDate = new Date(tempDate);
            let tempMonth = tempDate.getMonth() + 1;
            newCreditors.push({ paymentStatus: tempStatus, paymentDate: (tempMonth < 10 ? '0' + tempMonth : tempMonth) + '-' + (tempDate.getDate() < 10 ? '0' + tempDate.getDate() : tempDate.getDate()) + '-' + tempDate.getFullYear(), creditorPayments: tempAmount })

        }

        for (let i = 0; i < PSFeeList.length; i++) {
            var tempDate = PSFeeList[i].paymentDate;
            var tempStatus = PSFeeList[i].paymentStatus;

            var tempAmount = PSFeeList[i].creditorPayments != null ? formatCurrency(PSFeeList[i].creditorPayments) : '';

            if (PSFeeList[i].paymentStatus == "Cleared") {
                tempStatus = String.fromCharCode(10003) + PSFeeList[i].paymentStatus;

            }
            tempDate = new Date(tempDate);
            let tempMonth = tempDate.getMonth() + 1;
            newFees.push({ paymentStatus: tempStatus, paymentDate: (tempMonth < 10 ? '0' + tempMonth : tempMonth) + '-' + (tempDate.getDate() < 10 ? '0' + tempDate.getDate() : tempDate.getDate()) + '-' + tempDate.getFullYear(), creditorPayments: tempAmount })

        }
        newPSObject = { Creditors: [...newCreditors], Fees: [...newFees] };
        console.log('new ps object', JSON.stringify(newPSObject));

        return newPSObject;

    }

    formatSIFList(cred) {
        var newSIFList = [];
        var creditorAccountsSIFPhase5Payment = cred.creditorAccountsSIFPhase5Payment;
        var creditorAccountsSIFphase5Months = cred.creditorAccountsSIFphase5Months;
        var creditorAccountsSIFPhase4Payment = cred.creditorAccountsSIFPhase4Payment
        var creditorAccountsSIFphase4Months = cred.creditorAccountsSIFphase4Months;
        var creditorAccountsSIFPhase3Payment = cred.creditorAccountsSIFPhase3Payment;
        var creditorAccountsSIFphase3Months = cred.creditorAccountsSIFphase3Months;
        var creditorAccountsSIFPhase2Payment = cred.creditorAccountsSIFPhase2Payment;
        var creditorAccountsSIFphase2Months = cred.creditorAccountsSIFphase2Months;
        var creditorAccountsSIFPhase1Payment = cred.creditorAccountsSIFPhase1Payment;
        var creditorAccountsSIFphase1Months = cred.creditorAccountsSIFphase1Months;
        if (creditorAccountsSIFphase1Months != null) {
            newSIFList.push({ months: creditorAccountsSIFphase1Months == 1 ? creditorAccountsSIFphase1Months + ' month' : creditorAccountsSIFphase1Months + ' months', amount: formatCurrency(creditorAccountsSIFPhase1Payment) });
        }
        if (creditorAccountsSIFphase2Months != null) {
            newSIFList.push({ months: creditorAccountsSIFphase2Months == 1 ? creditorAccountsSIFphase2Months + ' month' : creditorAccountsSIFphase2Months + ' months', amount: formatCurrency(creditorAccountsSIFPhase2Payment) });
        }
        if (creditorAccountsSIFphase3Months != null) {
            newSIFList.push({ months: creditorAccountsSIFphase3Months == 1 ? creditorAccountsSIFphase3Months + ' month' : creditorAccountsSIFphase3Months + ' months', amount: formatCurrency(creditorAccountsSIFPhase3Payment) });
        }
        if (creditorAccountsSIFphase4Months != null) {
            newSIFList.push({ months: creditorAccountsSIFphase4Months == 1 ? creditorAccountsSIFphase4Months + ' month' : creditorAccountsSIFphase4Months + ' months', amount: formatCurrency(creditorAccountsSIFPhase4Payment) });
        }
        if (creditorAccountsSIFphase5Months != null) {
            newSIFList.push({ months: creditorAccountsSIFphase5Months == 1 ? creditorAccountsSIFphase5Months + ' month' : creditorAccountsSIFphase5Months + ' months', amount: formatCurrency(creditorAccountsSIFPhase5Payment) });
        }


        return newSIFList;

    }
    getTotalSIFPayments(cred) {
        var creditorAccountsSIFPhase5Payment = cred.creditorAccountsSIFPhase5Payment != null ? cred.creditorAccountsSIFPhase5Payment : 0;
        var creditorAccountsSIFphase5Months = cred.creditorAccountsSIFphase5Months != null ? cred.creditorAccountsSIFphase5Months : 0;
        var creditorAccountsSIFPhase4Payment = cred.creditorAccountsSIFPhase4Payment != null ? cred.creditorAccountsSIFPhase4Payment : 0;
        var creditorAccountsSIFphase4Months = cred.creditorAccountsSIFphase4Months != null ? cred.creditorAccountsSIFphase4Months : 0;
        var creditorAccountsSIFPhase3Payment = cred.creditorAccountsSIFPhase3Payment != null ? cred.creditorAccountsSIFPhase3Payment : 0;
        var creditorAccountsSIFphase3Months = cred.creditorAccountsSIFphase3Months != null ? cred.creditorAccountsSIFphase3Months : 0;
        var creditorAccountsSIFPhase2Payment = cred.creditorAccountsSIFPhase2Payment != null ? cred.creditorAccountsSIFPhase2Payment : 0;
        var creditorAccountsSIFphase2Months = cred.creditorAccountsSIFphase2Months != null ? cred.creditorAccountsSIFphase2Months : 0;
        var creditorAccountsSIFPhase1Payment = cred.creditorAccountsSIFPhase1Payment != null ? cred.creditorAccountsSIFPhase1Payment : 0;
        var creditorAccountsSIFphase1Months = cred.creditorAccountsSIFphase1Months != null ? cred.creditorAccountsSIFphase1Months : 0;

        var totalPayments = creditorAccountsSIFphase5Months + creditorAccountsSIFphase4Months + creditorAccountsSIFphase3Months + creditorAccountsSIFphase2Months + creditorAccountsSIFphase1Months;

        return totalPayments;
    }

    async getCreditorAccounts() {
        try {
            if (this.dsId) {
                var creditorsData = await getCreditorsData({ dsId: this.dsId });

                console.log('creditor data', creditorsData)

                this.creditorList = JSON.parse(creditorsData).map(creditorData => {

                    return Object.assign({}, {
                        isNeedApproval: creditorData.progressStatus == "Needs Your Approval",
                        isEnrolled: creditorData.progressStatus == "Enrolled",
                        isCallUs: creditorData.progressStatus == "Call Us",
                        isDefault: creditorData.progressStatus != "Needs Your Approval" && creditorData.progressStatus != "Enrolled" && creditorData.progressStatus != "Call Us",
                        creditorId: creditorData.creditorAccountsCreditorID,
                        creditorLogo: creditorData.creditorLogo != null ? 'data:image/jpeg;base64,' + creditorData.creditorLogo : 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAA8ADwDASIAAhEBAxEB/8QAGgABAAMBAQEAAAAAAAAAAAAAAAQGBwUCA//EADIQAAEDAgQEAwYHAQAAAAAAAAECAwQABQYRITEHEhNRQWGxFBUWM3GRIjKBkqGi0fD/xAAaAQEAAgMBAAAAAAAAAAAAAAAAAQIEBQYH/8QAIhEAAgICAgEFAQAAAAAAAAAAAQIAAwQREiFBMTJRcdFC/9oADAMBAAIRAxEAPwCgOLW64pxxSlrUc1KUcyT3NeaUq89zilK7cLCWIJzAeiWWe60RmFhhWRHlprSUstSsbcgfc4lKk3CBMtz5YuEV+K8NeR5soP2NRqSysGGweoqTGuEyK2URpT7KCcyltwpGffSo1KQVDDREUpXbwPFanYxs0aQAppyW2FJOxHMNKSttgrQufA3L/BiWrhth+Jc7vEbn4pmo6saK9qiMnwUod/5z0GWRNWSzRuIuJIZucu/ItLTzJdisgJTznTLMZaJ131O2lZtxlmOzOI136xJDK0tIB8EhI/2tXsN5sGPLKUrnKt93ZtS4bwc+W2g8vMvXIZZgeI3qJx+aliY9eW68mftmK8uIPYAHgeN/srUzFM+BdPhrirBYmw3ACmSEjnbB0DiVDcfTX0rP+IeFlYVvvs7bnXgPoD0R/fqNnbXuP+3qZxQsd+sl2joxBcF3FLjZMaSVlQUgHUDPbcaedd7FJ94cEMMzZGsiLLXGbUd+TJWn9U/ak2OLxxjTdSRxsOiF9u9HRA8emiPyZdSlKmdFFSbZNdt1xizY5AejupdRn3Scx6VGpSQyhho+k1Hi3afe4jY1sqC9bJ7aTI5dSw6NCFen1H0q1YZu2C8R2qY8YxtNwbtbjU1EVkISWsxzLGQyJz28dfGsrwXjW54VW43F6ciA986G+OZtzvp4HKrUcQ8NbgevPwzcIcg6qbiuAt5+X4h6ConMZOFcla0MrFV9rIRvXwwJG/uRMb3j48vFkseFYj64cBr2eN1PzrzCQVK7DJKd+1fXizKj2q1WTB0F1LotiOpLcTsp5Q2/TNX7qTOJEG1Q3YeBLI3aQ6OVcx0hb6h5b5fc1mzzq3nVuvLU44slSlKOZUTuSamZmFhuWQsvCuvZUE7JJ/ptdeT18nc80pSk3kUqTdGERblKjtlRQ06pCSrfIEjWo1IB2NxSlKRFKUpEUpVtwnhuHd7a5IkuPpWl0oAbUAMgAfEHvSUssFa8jP/Z',
                        creditorInteractionsId: creditorData.creditorAccountsCreditorInteractionsID,
                        creditorItemClass: creditorData.progressStatus == "Needs Your Approval" ? this.needApprovalCreditorItemClass : this.defaultCreditorItemClass,
                        progressStatus: creditorData.progressStatus,
                        creditorTypeClass: this.getCredTypeClass(creditorData.progressStatus),
                        creditorTypeColor: this.getColorByProgType(creditorData.progressStatus),
                        creditorAmountTypeClass: this.getCredAmountTypeClass(creditorData.progressStatus),
                        percentage: Math.round(creditorData.creditorProgress * 100),
                        creditorTotalPayments: creditorData.offerTerm,
                        creditorPaymentsMade: this.getTotalClearedPS(creditorData.PS),
                        creditorName: truncateName(creditorData.creditorName),
                        accountNo: creditorData.accountNo,
                        amountPaid: creditorData.amountPaid != null ? formatCurrency(creditorData.amountPaid) : '0.00',
                        amountPaidDollars: creditorData.amountPaid != null ? formatCurrency(creditorData.amountPaid).split(".")[0] : '0',
                        amountPaidCents: creditorData.amountPaid != null ? formatCurrency(creditorData.amountPaid).split(".")[1] : '00',
                        settlePayFee: creditorData.creditorPaymentsAndFees != null ? formatCurrency(creditorData.creditorPaymentsAndFees) : '0.00',
                        settlePayFeeDollars: creditorData.creditorPaymentsAndFees != null ? formatCurrency(creditorData.creditorPaymentsAndFees).split(".")[0] : '0',
                        settlePayFeeCents: creditorData.creditorPaymentsAndFees != null ? formatCurrency(creditorData.creditorPaymentsAndFees).split(".")[1] : '00',
                        currentBalance: creditorData.currentBalance != null ? formatCurrency(creditorData.currentBalance) : '0.00',
                        currentBalanceDollars: creditorData.currentBalance != null ? formatCurrency(creditorData.currentBalance).split(".")[0] : '0',
                        currentBalanceCents: creditorData.currentBalance != null ? formatCurrency(creditorData.currentBalance).split(".")[1] : '00',
                        originalBalanceDollars: creditorData.originalBalance != null ? formatCurrency(creditorData.originalBalance).split(".")[0] : '0',
                        originalBalanceCents: creditorData.originalBalance != null ? formatCurrency(creditorData.originalBalance).split(".")[1] : '00',
                        settlementAmount: creditorData.settlementAmountOrTotalCommittedCP != null ? formatCurrency(creditorData.settlementAmountOrTotalCommittedCP) : '0.00',
                        settlementAmountDollars: creditorData.settlementAmountOrTotalCommittedCP != null ? formatCurrency(creditorData.settlementAmountOrTotalCommittedCP).split(".")[0] : '0',
                        settlementAmountCents: creditorData.settlementAmountOrTotalCommittedCP != null ? formatCurrency(creditorData.settlementAmountOrTotalCommittedCP).split(".")[1] : '00',
                        settlementPct: creditorData.settlementPct,
                        totalFeesDollars: creditorData.FeesTotalBilled != null ? formatCurrency(creditorData.FeesTotalBilled).split(".")[0] : '0',
                        totalFeesCents: creditorData.FeesTotalBilled != null ? formatCurrency(creditorData.FeesTotalBilled).split(".")[1] : '00',
                        clientSavings: creditorData.clientSavings != null ? formatCurrency(creditorData.clientSavings) : '0.00',
                        clientSavingsDollars: creditorData.clientSavings != null ? formatCurrency(creditorData.clientSavings).split(".")[0] : '0',
                        clientSavingsCents: creditorData.clientSavings != null ? formatCurrency(creditorData.clientSavings).split(".")[1] : '00',
                        offerTerm: creditorData.offerTerm,
                        PSItems: creditorData.PS.length > 0 ? this.formatPSList(creditorData.PS) : false,
                        SIFItems: this.formatSIFList(creditorData)
                    })

                });




                //  console.log('this creditor list', this.creditorList);

                /* Create List Directory */
                this.creditorDirectory = await this.createCreditorDirectory(this.creditorList);

                this.creditorTablePageList = this.creditorDirectory.FullDirectory;


                this.AllDirectoryIndex = this.creditorDirectory.AllDirectoryIndex;
                this.IssuingPaymentsDirectoryIndex = this.creditorDirectory.IssuingPaymentsDirectoryIndex;
                this.PaidinFullDirectoryIndex = this.creditorDirectory.PaidinFullDirectoryIndex;
                this.EnrolledDirectoryIndex = this.creditorDirectory.EnrolledDirectoryIndex;
                this.CallUsDirectoryIndex = this.creditorDirectory.CallUsDirectoryIndex;
                this.ReworkingOfferDirectoryIndex = this.creditorDirectory.ReworkingOfferDirectoryIndex;
                this.FinalizingOfferDirectoryIndex = this.creditorDirectory.FinalizingOfferDirectoryIndex;

                this.NeedApprovalDirectoryIndex = this.creditorDirectory.NeedApprovalDirectoryIndex;
                this.AllPageIndex = this.creditorDirectory.AllPageIndex;
                this.IssuingPaymentsPageIndex = this.creditorDirectory.IssuingPaymentsPageIndex;
                this.PaidinFullPageIndex = this.creditorDirectory.PaidinFullPageIndex;
                this.EnrolledPageIndex = this.creditorDirectory.EnrolledPageIndex;
                this.CallUsPageIndex = this.creditorDirectory.CallUsPageIndex;
                this.ReworkingOfferPageIndex = this.creditorDirectory.ReworkingOfferPageIndex;
                this.FinalizingOfferPageIndex = this.creditorDirectory.FinalizingOfferPageIndex;
                this.NeedApprovalPageIndex = this.creditorDirectory.NeedApprovalPageIndex;
                this.fullDirectory = this.creditorDirectory.FullDirectory;
                this.credIndexItems = this.paginateGen(this.AllPageIndex, this.AllDirectoryIndex);


                this.typeCountObject = this.getCreditorCount(this.creditorDirectory.credObject);

                this.typeCountAll = this.typeCountObject.All;
                this.typeCountCallUs = this.typeCountObject.CallUs;
                this.typeCountPaidInFull = this.typeCountObject.PaidInFull;
                this.typeCountReworkingOffer = this.typeCountObject.ReworkingOffer;
                this.typeCountFinalizingOffer = this.typeCountObject.FinalizingOffer;
                this.typeCountIssuingPayments = this.typeCountObject.IssuingPayments;
                this.typeCountEnrolled = this.typeCountObject.Enrolled;
                this.typeCountNeedApproval = this.typeCountObject.NeedApproval;




            }
        } catch (error) {
            console.log('error', error);
        } finally {
            this.isLoading = false;
        }
    }

    resetSelectedPages() {
            var pageSelect = this.template.querySelectorAll(".paginate_list li");
            if (pageSelect) {
                for (let i = 0; i < pageSelect.length; i++) {
                    if (pageSelect[i].dataset.lookid == this.pageIndex) {
                        pageSelect[i].className = "selectedPage";

                    } else if (pageSelect[i].dataset.lookid == this.prevPageIndex) {

                        pageSelect[i].className = "";
                    }
                }
            }
        }
        /* Manage CredTable UI  Animation State Behavior*/
    updateCredTables() {

        this.collapseAll();
        this.hideSort(this.credAcctType);

        var creditorPages = this.template.querySelectorAll("div.creditor_table_wrapper");
        var defaultTableClassName = "creditor_table_wrapper";

        var animateSelect = this.triggerAnimation;

        var currentIndex = this.pageIndex;

        var pageDirection = this.pageTriggerDirection;
        var prevPageIndex = this.prevPageIndex;





        var animateTrigger = "";
        var previousPageTrigger = "";

        if (animateSelect == "") {
            creditorPages[0].className = defaultTableClassName + ' ' + 'show';
            creditorPages[this.prevDirectoryLookup].className = defaultTableClassName + ' ' + 'hide';
        } else if (animateSelect == "typeSelect") {
            this.resetSelectTabState();
            var currentDirectoryIndex = this.directoryLookup;


            this.getTypePageIndex(this.credAcctType);
            console.log('type select check');

            // this.credIndexItems = this.paginateGen(this.targetPageIndex, this.targetDirectoryIndex);


            var activeLi = this.template.querySelector(`.creditorTabSelectRow li[data-type="${this.credAcctType}"]`);
            if (this.prevPageIndex != this.pageIndex) {
                creditorPages[this.pageIndex].className = defaultTableClassName + ' ' + 'show';


                creditorPages[this.prevPageIndex].className = defaultTableClassName + ' ' + 'hide';
            }

            if (activeLi) {
                if (activeLi.className.includes('type--callUs') == true) {
                    activeLi.className = "navigation-item-title selected type--callUs"
                } else {
                    activeLi.className = "navigation-item-title selected";
                }

            }


            this.resetSelectedPages();



        } else if (animateSelect == "pageChange") {

            if (pageDirection == "left") {
                animateTrigger = "animatePageEnterLeft";
                previousPageTrigger = "animatePageLeaveRight";

            } else if (pageDirection == "right") {
                animateTrigger = "animatePageEnterRight";
                previousPageTrigger = "animatePageLeaveLeft"

            }


            creditorPages[currentIndex].className = defaultTableClassName + ' ' + animateTrigger
            creditorPages[prevPageIndex].className = defaultTableClassName + ' ' + previousPageTrigger
            this.resetSelectedPages();
        } else if (animateSelect == "sort") {



            animateTrigger = "animateSortOutput"
            previousPageTrigger = "animateSortQuery";
            creditorPages[this.prevPageIndex].className = defaultTableClassName + ' ' + previousPageTrigger
            creditorPages[this.pageIndex].className = defaultTableClassName + ' ' + animateTrigger




            this.resetSelectedPages();
        }





    }

    getTypePageIndex(progType) {


        if (progType == "All") {
            this.targetPageIndex = this.AllPageIndex;
            this.targetDirectoryIndex = this.AllDirectoryIndex;
        }
        if (progType == "Paid In Full") {
            this.targetPageIndex = this.PaidinFullPageIndex;
            this.targetDirectoryIndex = this.PaidinFullDirectoryIndex;




        } else if (progType == "Issuing Payments") {
            this.targetPageIndex = this.IssuingPaymentsPageIndex;
            this.targetDirectoryIndex = this.IssuingPaymentsDirectoryIndex;



        } else if (progType == "Enrolled") {
            this.targetPageIndex = this.EnrolledPageIndex;
            this.targetDirectoryIndex = this.EnrolledDirectoryIndex;
        } else if (progType == "Call Us") {

            this.targetPageIndex = this.CallUsPageIndex;
            this.targetDirectoryIndex = this.CallUsDirectoryIndex;
        } else if (progType == "Finalizing Offer") {

            this.targetPageIndex = this.FinalizingOfferPageIndex;
            this.targetDirectoryIndex = this.FinalizingOfferDirectoryIndex;
        } else if (progType == "Reworking Offer") {

            this.targetPageIndex = this.ReworkingOfferPageIndex;
            this.targetDirectoryIndex = this.ReworkingOfferDirectoryIndex;
        } else if (progType == "Needs Your Approval") {
            this.targetPageIndex = this.NeedApprovalPageIndex;
            this.targetDirectoryIndex = this.NeedApprovalDirectoryIndex;
        }

        this.credIndexItems = this.paginateGen(this.targetPageIndex, this.targetDirectoryIndex)


    }
    setSelectedOffer(event) {
        if (event.type == "keypress") {
            if (event.which == "13" || event.which == "32") {
                var credid = event.target.dataset.cid;

                if (credid) {
                    this.selectedOffer = this.needApprovalList.filter(
                        cred => cred.creditorId == credid
                    )[0]

                    this.openModal();

                }
            }
        } else {
            var credid = event.target.dataset.cid;

            if (credid) {
                this.selectedOffer = this.needApprovalList.filter(
                    cred => cred.creditorId == credid
                )[0]

                this.openModal();

            }
        }
    }
    getCreditorCount(creditorList) {
        let typeCountObject = {
            All: 0,
            PaidInFull: 0,
            IssuingPayments: 0,
            Enrolled: 0,
            CallUs: 0,
            FinalizingOffer: 0,
            ReworkingOffer: 0,
            Settlements: 0,
            NeedApproval: 0,

        };
        let newCredList = creditorList.creditors.slice(
            0,
            creditorList.creditors.length
        );
        typeCountObject.All = newCredList.length;

        let paidinFullList = newCredList.filter(
            cred => cred.progressStatus == "Paid In Full"
        );
        typeCountObject.PaidInFull = paidinFullList.length;

        let enrolledList = newCredList.filter(
            cred => cred.progressStatus == "Enrolled"
        );
        typeCountObject.Enrolled = enrolledList.length;

        let callUsList = newCredList.filter(
            cred => cred.progressStatus == "Call Us"
        );
        typeCountObject.CallUs = callUsList.length;

        let finalizingOfferList = newCredList.filter(
            cred => cred.progressStatus == "Finalizing Offer"
        );
        typeCountObject.FinalizingOffer = finalizingOfferList.length;
        let reworkingOfferList = newCredList.filter(
            cred => cred.progressStatus == "Reworking Offer"
        );
        typeCountObject.ReworkingOffer = reworkingOfferList.length;

        let issuePymtList = newCredList.filter(
            cred => cred.progressStatus == "Issuing Payments"
        );
        typeCountObject.IssuingPayments = issuePymtList.length;

        let needApproveList = newCredList.filter(
            cred => cred.progressStatus == "Needs Your Approval"
        );
        typeCountObject.NeedApproval = needApproveList.length;





        return typeCountObject;
    }
    createCredObject(creditors) {
        for (let i = 0; i < creditors.length; i++) {

            creditors[i] = Object.assign({ uniqueIndex: i }, creditors[i]);
        }
        const credItemCount = creditors.length;
        const credObject = { creditors, credItemCount };
        return credObject;
    }



    onTypeFilterObject(creditorList, progressType) {
        let progType = progressType;

        let newCredList = creditorList.creditors.slice(
            0,
            creditorList.creditors.length
        );


        let typeFilterCredList = [];

        if (progType == "Paid In Full") {

            typeFilterCredList = newCredList.filter(
                cred => cred.progressStatus == "Paid In Full"
            );


            return typeFilterCredList;
        } else if (progType == "Issuing Payments") {

            typeFilterCredList = newCredList.filter(
                cred => cred.progressStatus == "Issuing Payments"
            );


            return typeFilterCredList;
        } else if (progType == "Enrolled") {

            typeFilterCredList = newCredList.filter(
                cred => cred.progressStatus == "Enrolled"
            );


            return typeFilterCredList;
        } else if (progType == "Call Us") {

            typeFilterCredList = newCredList.filter(
                cred => cred.progressStatus == "Call Us"
            );

            return typeFilterCredList;
        } else if (progType == "Finalizing Offer") {

            typeFilterCredList = newCredList.filter(
                cred => cred.progressStatus == "Finalizing Offer"
            );

            return typeFilterCredList;
        } else if (progType == "Reworking Offer") {

            typeFilterCredList = newCredList.filter(
                cred => cred.progressStatus == "Reworking Offer"
            );

            return typeFilterCredList;
        } else if (progType == "Needs Your Approval") {
            typeFilterCredList = newCredList.filter(
                cred => cred.progressStatus == "Needs Your Approval"
            );

            return typeFilterCredList;
        }

        /* else if (progType == "All") {
                    typeFilterCredList = newCredList.filter(
                        cred =>
                            cred.settlementOfferStatus !== "Need Approval" 
                    );
    
                    return typeFilterCredList;
                } */
        else {
            return newCredList;
        }
    }
    createSortedPages(creditorList, sortValue) {
        const statusPriorityPickList = {
            "Issuing Payments": 1,
            "Enrolled": 2,
            "Paid In Full": 3,
            "Call Us": 4,
            "Finalizing Offer": 5,
            "Reworking Offer": 6,
            "Needs Your Approval": 7,
        };



        let newCredList = creditorList.slice(
            0,
            creditorList.length
        );


        if (sortValue == "Alphabetically(AZ)") {
            newCredList.sort(function(a, b) {
                var nameA = a.creditorName;
                var nameB = b.creditorName;
                if (nameA < nameB) return -1;
                if (nameA > nameB) return 1;
                return 0;
            });

            return newCredList;
        } else if (sortValue == "Status(All-Priority-First)") {
            newCredList.sort(function(a, b) {
                var nameA = a.progressStatus;
                var nameB = b.progressStatus;
                var important_a = statusPriorityPickList[nameA],
                    important_b = statusPriorityPickList[nameB],
                    ret;

                if (important_a && !important_b) {
                    ret = -1;
                } else if (important_b && !important_a) {
                    ret = 1;
                } else if (important_a && important_b) {
                    ret = important_a - important_b;
                } else {
                    ret = 0;
                }

                return ret;
            });
            return newCredList;
        }


    }
    generateDirectory(generatedCredLists) {
        var uniqueid = 1;
        var Directory = [];

        var credLists = generatedCredLists.slice(0, generatedCredLists.length);

        var tempPages = [];
        var tempIndexRange = [];

        for (let i = 0; i < credLists.length; i++) {
            //  console.log('check cred List iteration', i);

            let tempCredList = credLists[i].slice(0, credLists[i].length);


            var tempPagesList = [];
            for (let j = 0; j <= tempCredList.length; j++) {
                let pageList = tempCredList.splice(0, 5);

                tempPagesList.push(pageList);
            }
            if (tempCredList.length > 0) {
                tempPagesList.push(tempCredList);
            }

            Directory[i] = tempPagesList;
        }


        return Directory





    }
    createCreditorDirectory(creditorList) {
        //Create Creditor Array with Logo Information 
        var credObject = this.createCredObject(creditorList);


        //Apply Type Filter 
        var typeFilterCredArray = this.onTypeFilterObject(credObject, 'All');
        let typePaidinFullArray = this.onTypeFilterObject(credObject, 'Paid In Full');
        let typeIssuingPaymentsArray = this.onTypeFilterObject(credObject, 'Issuing Payments');
        let typeEnrolledArray = this.onTypeFilterObject(credObject, 'Enrolled');
        let typeCallUsArray = this.onTypeFilterObject(credObject, 'Call Us');
        let typeFinalizingOfferArray = this.onTypeFilterObject(credObject, 'Finalizing Offer');
        let typeNeedApprovalArray = this.onTypeFilterObject(credObject, 'Needs Your Approval');
        this.needApprovalList = typeNeedApprovalArray.slice();
        let typeReworkingOfferArray = this.onTypeFilterObject(credObject, 'Reworking Offer');
        // console.log('temp need approva', typeNeedApprovalArray);

        //Apply Sort 
        let sortedCredArrayA = this.createSortedPages(typeFilterCredArray, 'Status(All-Priority-First)');
        let sortedCredArrayB = this.createSortedPages(typeFilterCredArray, 'Alphabetically(AZ)');
        let sortedPaidinFullArray = this.createSortedPages(typePaidinFullArray, 'Alphabetically(AZ)');

        // console.log('get sorted paid in full array', sortedPaidinFullArray);
        let sortedIssuingPaymentsArray = this.createSortedPages(typeIssuingPaymentsArray, 'Alphabetically(AZ)');
        let sortedCallUsArray = this.createSortedPages(typeCallUsArray, 'Alphabetically(AZ)');
        let sortedEnrolledArray = this.createSortedPages(typeEnrolledArray, 'Alphabetically(AZ)');
        let sortedNeedApproveArray = this.createSortedPages(typeNeedApprovalArray, 'Alphabetically(AZ)');
        let sortedFinalizingOfferArray = this.createSortedPages(typeFinalizingOfferArray, 'Alphabetically(AZ)');
        let sortedReworkingOfferArray = this.createSortedPages(typeReworkingOfferArray, 'Alphabetically(AZ)');
        //Duplicate
        let tempAllByStatus = sortedCredArrayA.slice(0, sortedCredArrayA.length);
        let tempAllByAZ = sortedCredArrayB.slice(0, sortedCredArrayB.length);
        let tempPaidinFullAZ = sortedPaidinFullArray.slice(0, sortedPaidinFullArray.length);
        let tempIssuingPaymentsAZ = sortedIssuingPaymentsArray.slice(0, sortedIssuingPaymentsArray.length);
        let tempCallUsAZ = sortedCallUsArray.slice(0, sortedCallUsArray.length);
        let tempEnrolledAZ = sortedEnrolledArray.slice(0, sortedEnrolledArray.length);
        let tempNeedApprovalAZ = sortedNeedApproveArray.slice(0, sortedNeedApproveArray.length);
        let tempFinalizingOfferAZ = sortedFinalizingOfferArray.slice(0, sortedFinalizingOfferArray.length);
        let tempReworkingOfferAZ = sortedReworkingOfferArray.slice(0, sortedReworkingOfferArray.length);

        //Resultant Creditor Array
        var generatedCredLists = [
            [...tempAllByStatus],
            [...tempAllByAZ],
            [...tempIssuingPaymentsAZ],
            [...tempEnrolledAZ],
            [...tempPaidinFullAZ],
            [...tempFinalizingOfferAZ],
            [...tempReworkingOfferAZ],
            [...tempCallUsAZ],
            [...tempNeedApprovalAZ]
        ];
        // console.log('temp need approva', tempNeedApprovalAZ);
        var generatedDirectory = this.generateDirectory(generatedCredLists);

        //   console.log('check generated directory', generatedDirectory);


        var AllPageIndex = [];
        var IssuingPaymentsPageIndex = [];
        var PaidinFullPageIndex = [];
        var EnrolledPageIndex = [];
        var ReworkingOfferPageIndex = [];
        var FinalizingOfferPageIndex = [];
        var CallUsPageIndex = [];
        var NeedApprovalPageIndex = [];


        var AllDirectoryIndex = [];
        var IssuingPaymentsDirectoryIndex = [];
        var PaidinFullDirectoryIndex = [];
        var EnrolledDirectoryIndex = [];
        var ReworkingOfferDirectoryIndex = [];
        var FinalizingOfferDirectoryIndex = [];
        var CallUsDirectoryIndex = [];
        var NeedApprovalDirectoryIndex = [];



        var allDirectory = [...generatedDirectory[0], ...generatedDirectory[1]];
        var fullDirectory = [...generatedDirectory[0], ...generatedDirectory[1], ...generatedDirectory[2], ...generatedDirectory[3], ...generatedDirectory[4], ...generatedDirectory[5], ...generatedDirectory[6], ...generatedDirectory[7], ...generatedDirectory[8]];

        for (let i = 0; i < generatedDirectory[0].length; i++) {
            AllPageIndex.push(i);
            AllDirectoryIndex.push(i);
        }

        for (let i = 0; i < generatedDirectory[2].length; i++) {
            IssuingPaymentsPageIndex.push(i);
            IssuingPaymentsDirectoryIndex.push((AllDirectoryIndex.length) + (AllDirectoryIndex.length) + i);
        }
        for (let i = 0; i < generatedDirectory[3].length; i++) {

            EnrolledPageIndex.push(i);

            EnrolledDirectoryIndex.push(IssuingPaymentsDirectoryIndex[IssuingPaymentsDirectoryIndex.length - 1] + 1 + i);
        }
        for (let i = 0; i < generatedDirectory[4].length; i++) {
            PaidinFullPageIndex.push(i);
            PaidinFullDirectoryIndex.push(EnrolledDirectoryIndex[EnrolledDirectoryIndex.length - 1] + 1 + i);
        }

        for (let i = 0; i < generatedDirectory[5].length; i++) {
            FinalizingOfferPageIndex.push(i);
            FinalizingOfferDirectoryIndex.push(PaidinFullDirectoryIndex[PaidinFullDirectoryIndex.length - 1] + 1 + i);
        }

        for (let i = 0; i < generatedDirectory[6].length; i++) {
            ReworkingOfferPageIndex.push(i);
            ReworkingOfferDirectoryIndex.push(FinalizingOfferDirectoryIndex[FinalizingOfferDirectoryIndex.length - 1] + 1 + i);
        }
        for (let i = 0; i < generatedDirectory[7].length; i++) {
            CallUsPageIndex.push(i);
            CallUsDirectoryIndex.push(ReworkingOfferDirectoryIndex[ReworkingOfferDirectoryIndex.length - 1] + 1 + i);
        }




        for (let i = 0; i < generatedDirectory[8].length; i++) {
            NeedApprovalPageIndex.push(i);
            NeedApprovalDirectoryIndex.push(CallUsDirectoryIndex[CallUsDirectoryIndex.length - 1] + 1 + i);
        }

        var creditorDirectory = {
            credObject: credObject,
            FullDirectory: fullDirectory,
            AllDirectory: [...generatedDirectory[0], ...generatedDirectory[1]],
            IssuingPaymentsDirectory: [...generatedDirectory[2]],
            PaidinFullDirectory: [...generatedDirectory[4]],
            EnrolledDirectory: [...generatedDirectory[3]],

            FinalizingOfferDirectory: [...generatedDirectory[5]],
            ReworkingOfferDirectory: [...generatedDirectory[6]],
            CallUsDirectory: [...generatedDirectory[7]],
            NeedApprovalDirectory: [...generatedDirectory[8]],
            AllDirectoryIndex: AllDirectoryIndex,
            IssuingPaymentsDirectoryIndex: IssuingPaymentsDirectoryIndex,
            PaidinFullDirectoryIndex: PaidinFullDirectoryIndex,
            EnrolledDirectoryIndex: EnrolledDirectoryIndex,
            FinalizingOfferDirectoryIndex: FinalizingOfferDirectoryIndex,
            ReworkingOfferDirectoryIndex: ReworkingOfferDirectoryIndex,
            CallUsDirectoryIndex: CallUsDirectoryIndex,
            NeedApprovalDirectoryIndex: NeedApprovalDirectoryIndex,
            AllPageIndex: AllPageIndex,
            IssuingPaymentsPageIndex: IssuingPaymentsPageIndex,
            PaidinFullPageIndex: PaidinFullPageIndex,
            EnrolledPageIndex: EnrolledPageIndex,
            FinalizingOfferPageIndex: FinalizingOfferPageIndex,
            ReworkingOfferPageIndex: ReworkingOfferPageIndex,
            CallUsPageIndex: CallUsPageIndex,
            NeedApprovalPageIndex: NeedApprovalPageIndex
        }



        return creditorDirectory;

    }
    collapseAll() {

        var expandedCredItems = this.template.querySelectorAll('.expanded');
        // console.log('expanded cred items', expandedCredItems);
        for (let i = 0; i < expandedCredItems.length; i++) {

            if (


                expandedCredItems[i].classList.contains("approved_item_wrapper") || expandedCredItems[i].classList.contains("creditorSummaryRow") || expandedCredItems[i].classList.contains("creditorSummaryWrapper")
            ) {
                // expandedCredItems[i].classList.add('hide'); 
            } else {
                expandedCredItems[i].classList.remove('expanded');
                if (expandedCredItems[i].children[2]) {
                    if (expandedCredItems[i].children[2].children[1]) {
                        expandedCredItems[i].children[2].children[1].style.display = "none";
                    }
                    if (expandedCredItems[i].children[2].children[2]) {
                        expandedCredItems[i].children[2].children[2].style.display = "none";
                    }
                }
                if (expandedCredItems[i].classList.contains("creditem_expandbtn--mobile")) {
                    expandedCredItems[i].children[0].style.transform = "rotate(0deg)";

                    //   el.style.transform = "rotate(180deg)";

                } else {
                    expandedCredItems[i].children[0].innerHTML = "[ + ]";


                }

            }
            //mobile expand

        }
    }
    onSortHandler(event) {

        var originalIndex = this.pageIndex;
        var pagesLength = this.AllPageIndex.length;
        var sectionB = pagesLength;


        var optionBIndex = (0 + sectionB).toString();

        //console.log('optionB index', optionBIndex);


        let option = event.target.value;


        var newArray = []
        if (option == 'Status(All-Priority-First)') {

            for (let i = 0; i < pagesLength; i++) {
                newArray.push(i);
            };

            this.pageIndex = "0",
                this.sortTrigger = true;
            this.triggerAnimation = "sort";
            this.prevPageIndex = originalIndex;
            this.prevDirectoryLookup = this.directoryLookup
            this.directoryLookup = newArray;

            this.credIndexItems = this.paginateGen(this.AllPageIndex, newArray)



        } else if (option == 'Alphabetically(AZ)') {

            for (let i = 0; i < pagesLength; i++) {
                newArray.push(i + pagesLength);
            };
            //      console.log('check new range', newArray);
            this.pageIndex = optionBIndex;
            this.sortTrigger = true;
            this.triggerAnimation = "sort";
            this.prevPageIndex = originalIndex;
            this.prevDirectoryLookup = this.directoryLookup
            this.directoryLookup = newArray;
            this.credIndexItems = this.paginateGen(this.AllPageIndex, newArray)

        }

        this.sortValue = option;
        this.updateCredTables();


    };
    onCredPageChange(event) {
        // console.log('check event page change', event);
        if (event.type == "keypress") {
            if (event.which == "13" || event.which == "32") {
                var index = event.target.dataset.lookid;
                // console.log('check page change ', index);
                var originalIndex = this.pageIndex;
                //     console.log('check page change ', originalIndex);

                if (this.pageIndex > index) {
                    this.triggerAnimation = "pageChange";
                    this.pageTriggerDirection = "left";
                    this.prevPageIndex = originalIndex;
                    // this.prevDirectoryLookup
                    this.pageIndex = index;
                } else if (this.pageIndex < index) {
                    this.triggerAnimation = "pageChange";
                    this.pageTriggerDirection = "right";
                    this.prevPageIndex = originalIndex;
                    this.pageIndex = index;
                }
                this.updateCredTables();
            }
        } else {
            var index = event.target.dataset.lookid;
            // console.log('check page change ', index);
            var originalIndex = this.pageIndex;
            //     console.log('check page change ', originalIndex);

            if (this.pageIndex > index) {


                this.triggerAnimation = "pageChange";
                this.pageTriggerDirection = "left";
                this.prevPageIndex = originalIndex;
                // this.prevDirectoryLookup
                this.pageIndex = index;

            } else if (this.pageIndex < index) {


                this.triggerAnimation = "pageChange";
                this.pageTriggerDirection = "right";
                this.prevPageIndex = originalIndex;
                this.pageIndex = index;
            }
            this.updateCredTables();
        }
    };

    hideSort(credType) {
        if (credType != "All" && credType != "") {
            this.template.querySelector('.sort_wrapper').style.display = "none";
            this.template.querySelector('.creditors_module--accounts').classList.add('hidesort')
        } else if (credType == "All") {

            if (this.creditorList.length == 1) {
                this.template.querySelector('.creditors_module--accounts').classList.add('hidesort')
                this.template.querySelector('.sort_wrapper').style.display = "none";
            } else {
                this.template.querySelector('.creditors_module--accounts').classList.remove('hidesort')

                this.template.querySelector('.sort_wrapper').style.display = "flex";
            }
        }


    }
    resetSelectTabState() {

        var settleChildrenEl = this.template.querySelector('.creditorTabSelectRow').children[0].children;

        for (let t = 0; t < settleChildrenEl.length; t++) {
            if (settleChildrenEl[t].classList.contains("selected")) {
                settleChildrenEl[t].classList.remove("selected");
            }
        }
    }
    handleCredTypeSelect(event) {
        if (event.type == "keypress") {
            if (event.which == "13" || event.which == "32") {
                var credType = event.target.dataset.type;

                console.log('event cred type', credType);
                console.log('event value', event.target.value);

                this.credAcctType = credType;
                // this.hideSort(credType);
                //var settleChildrenEl = event.target.parentElement.children;
                //  this.resetSelectTabState();

                var selectIndexRange;
                var selectLookup;
                var selectType;


                //Handle Event from Mobile Dropdown Select 
                if (credType == undefined) {
                    if (event.target.options) {
                        console.log('event options', event.target.selectedIndex)
                    }
                    if (event.target.options[event.target.selectedIndex].dataset.indexrange) {
                        selectIndexRange = event.target.options[event.target.selectedIndex].dataset.indexrange.split(',').map(Number);
                        console.log('select index range', selectIndexRange);
                    }
                    if (
                        event.target.options[event.target.selectedIndex].dataset.lookup) {
                        selectLookup = event.target.options[event.target.selectedIndex].dataset.lookup.split(',').map(Number);
                        console.log('select lookup', selectLookup);

                    }

                    if (event.target.options[event.target.selectedIndex].value) {

                        console.log('event.target.options[event.target.options.selectedIndex].value', event.target.options[event.target.selectedIndex].value);
                    }
                    this.prevPageIndex = this.pageIndex;
                    this.pageIndex = selectLookup.toString().split(',')[0];
                    this.pageIndexRange = selectIndexRange;
                    this.sortValue = 'Alphabetically(AZ)';
                    this.triggerAnimation = "typeSelect";
                    this.credAcctType = event.target.value;

                    this.prevDirectoryLookup = this.directoryLookup;
                    this.directoryLookup = selectLookup;


                }
                //Handle Event from Desktop Tab Select 
                else {


                    this.prevPageIndex = this.pageIndex;

                    this.pageIndexRange = event.target.dataset.indexrange;

                    this.pageIndex = event.target.dataset.lookup.toString().split(',')[0];

                    this.triggerAnimation = "typeSelect";

                    this.credAcctType = credType;

                    this.prevDirectoryLookup = this.directoryLookup;


                    this.directoryLookup = event.target.dataset.lookup;
                    console.log('review select tab bug prev page', this.prevPageIndex);
                    console.log('review select tab bug prev page', this.pageIndexRange);
                    console.log('review select tab bug prev page', this.pageIndex);
                    console.log('review select tab bug prev page', this.triggerAnimation);
                    console.log('review select tab bug prev page', this.credAcctType);
                    console.log('review select tab bug prev page', this.prevDirectoryLookup);
                }
                this.updateCredTables();
            }
        } else {
            var credType = event.target.dataset.type;

            console.log('event cred type', credType);
            console.log('event value', event.target.value);

            this.credAcctType = credType;
            // this.hideSort(credType);
            //var settleChildrenEl = event.target.parentElement.children;
            //  this.resetSelectTabState();

            var selectIndexRange;
            var selectLookup;
            var selectType;


            //Handle Event from Mobile Dropdown Select 
            if (credType == undefined) {
                if (event.target.options) {
                    console.log('event options', event.target.selectedIndex)
                }
                if (event.target.options[event.target.selectedIndex].dataset.indexrange) {
                    selectIndexRange = event.target.options[event.target.selectedIndex].dataset.indexrange.split(',').map(Number);
                    console.log('select index range', selectIndexRange);
                }
                if (
                    event.target.options[event.target.selectedIndex].dataset.lookup) {
                    selectLookup = event.target.options[event.target.selectedIndex].dataset.lookup.split(',').map(Number);
                    console.log('select lookup', selectLookup);

                }

                if (event.target.options[event.target.selectedIndex].value) {

                    console.log('event.target.options[event.target.options.selectedIndex].value', event.target.options[event.target.selectedIndex].value);
                }
                this.prevPageIndex = this.pageIndex;
                this.pageIndex = selectLookup.toString().split(',')[0];
                this.pageIndexRange = selectIndexRange;
                this.sortValue = 'Alphabetically(AZ)';
                this.triggerAnimation = "typeSelect";
                this.credAcctType = event.target.value;

                this.prevDirectoryLookup = this.directoryLookup;
                this.directoryLookup = selectLookup;


            }
            //Handle Event from Desktop Tab Select 
            else {


                this.prevPageIndex = this.pageIndex;

                this.pageIndexRange = event.target.dataset.indexrange;

                this.pageIndex = event.target.dataset.lookup.toString().split(',')[0];

                this.triggerAnimation = "typeSelect";

                this.credAcctType = credType;

                this.prevDirectoryLookup = this.directoryLookup;


                this.directoryLookup = event.target.dataset.lookup;
                console.log('review select tab bug prev page', this.prevPageIndex);
                console.log('review select tab bug prev page', this.pageIndexRange);
                console.log('review select tab bug prev page', this.pageIndex);
                console.log('review select tab bug prev page', this.triggerAnimation);
                console.log('review select tab bug prev page', this.credAcctType);
                console.log('review select tab bug prev page', this.prevDirectoryLookup);
            }
            this.updateCredTables();
        }
    };
    onHandleExpand(event) {
        console.log('review handle expand');
        event.preventDefault();
        console.log('review handle expand');
        if (event.type == "keypress") {
            if (event.which == "13" || event.which == "32") {
                var el = event.target;

                var temp = el.classList;
                var item = el.parentNode;

                var siblings;

                if (temp.contains("creditem_expandbtn--mobile")) {

                    siblings = el.nextSibling.children;
                } else {
                    siblings = el.nextSibling.nextSibling.children;
                }


                if (item.classList.contains("expanded")) {
                    if (siblings[1]) {
                        siblings[1].style.display = "none";
                    }
                    if (siblings[2]) {
                        siblings[2].style.display = "none";
                    }
                    item.classList.remove("expanded");
                    if (el.classList.contains("creditem_expandbtn--mobile")) {
                        el.style.transform = "rotate(0deg)";

                    } else {
                        el.innerHTML = "[ + ]";
                    }

                } else {

                    item.classList.add("expanded");
                    if (siblings[1]) {
                        siblings[1].style.display = "initial";
                    }
                    if (siblings[2]) {
                        siblings[2].style.display = "flex";

                    }
                    if (el.classList.contains("creditem_expandbtn--mobile")) {

                        el.style.transform = "rotate(180deg)";

                    } else {
                        el.innerHTML = "[ - ]";
                    }
                }

            }
        } else {
            var el = event.target;

            var temp = el.classList;
            var item = el.parentNode;

            var siblings;

            if (temp.contains("creditem_expandbtn--mobile")) {

                siblings = el.nextSibling.children;
            } else {
                siblings = el.nextSibling.nextSibling.children;
            }


            if (item.classList.contains("expanded")) {
                if (siblings[1]) {
                    siblings[1].style.display = "none";
                }
                if (siblings[2]) {
                    siblings[2].style.display = "none";
                }
                item.classList.remove("expanded");
                if (el.classList.contains("creditem_expandbtn--mobile")) {
                    el.style.transform = "rotate(0deg)";

                } else {
                    el.innerHTML = "[ + ]";
                }

            } else {

                item.classList.add("expanded");
                if (siblings[1]) {
                    siblings[1].style.display = "initial";
                }
                if (siblings[2]) {
                    siblings[2].style.display = "flex";

                }
                if (el.classList.contains("creditem_expandbtn--mobile")) {

                    el.style.transform = "rotate(180deg)";

                } else {
                    el.innerHTML = "[ - ]";
                }
            }
        }
    }
    @wire(CurrentPageReference)
    currentPageReference;

    renderedCallback() {


        var loc = new URL(document.URL);
        var isSitePreview = getIsSitePreview(loc.hostname);

        if (!isSitePreview) {
            //  this.cidQuery = this.currentPageReference.state.cid;
            var vQuery = this.currentPageReference.state.v;

            if (vQuery != undefined && this.hasRendered == true) {
                if (vQuery == "n") {
                    this.prevPageIndex = this.pageIndex;
                    this.pageIndexRange = this.NeedApprovalPageIndex;
                    this.pageIndex = this.NeedApprovalDirectoryIndex.toString().split(',')[0];
                    this.triggerAnimation = "typeSelect";
                    this.credAcctType = 'Needs Your Approval';
                    this.prevDirectoryLookup = this.directoryLookup;
                    this.directoryLookup = this.NeedApprovalDirectoryIndex;


                    this.hideSort(this.credAcctType);
                    this.hasRendered = false;
                    this.updateCredTables();
                    this.scrollToCreditors();
                }
            } else {

                console.log('check rerender');
                var firstCreditor = this.template.querySelectorAll(".creditor_table_wrapper")[0];

                var firstPageSelect = this.template.querySelectorAll(".paginate_list li")[0];

                /* Cred Pagination Rerender Reselect Page*/
                if (firstPageSelect) {
                    console.log('reselect');
                    firstPageSelect.className = 'selectedPage';
                }

                if (firstCreditor && this.hasRendered == true) {

                    firstCreditor.className = "creditor_table_wrapper show";


                    if (firstPageSelect) {
                        firstPageSelect.className = 'selectedPage';
                    }
                    this.hideSort(this.credAcctType);
                    this.hasRendered = false;
                }



            }


        }



    }

    /*Approve Settlement*/
    scrollToCreditors() {
        var target = this.template.querySelector('div[data-id="credwrapper"]');
        var offsetTop = target.offsetTop;


        if (offsetTop > 0) {
            window.scroll({ behavior: "auto", left: 0, top: offsetTop });
        }

    }
}