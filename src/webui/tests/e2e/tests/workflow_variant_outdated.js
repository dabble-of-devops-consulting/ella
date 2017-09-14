require('core-js/fn/object/entries');

/**
 * Checks if the interpretation page is read-only in the correct situations
 */

let LoginPage = require('../pageobjects/loginPage');
let VariantSelectionPage = require('../pageobjects/overview_variants');
let AnalysisPage = require('../pageobjects/analysisPage');
let AlleleSectionBox = require('../pageobjects/alleleSectionBox');
let failFast = require('jasmine-fail-fast');

let loginPage = new LoginPage();
let variantSelectionPage = new VariantSelectionPage();
let analysisPage = new AnalysisPage();
let alleleSectionBox = new AlleleSectionBox();

jasmine.getEnv().addReporter(failFast.init());

const OUR_VARIANT =  'c.581G>A';

describe('Read-only version of variant workflow ', function () {

    beforeAll(() => {
        browser.resetDb();
    });

    it('A pending variant that is started is editable', function () {
        loginPage.selectFirstUser();
        variantSelectionPage.selectPending(5);
        analysisPage.startButton.click();

        alleleSectionBox.markAsTechnical();

        analysisPage.saveButton.click();
    });

    it('others\' ongoing work is read-only', function () {
        loginPage.selectSecondUser();
        variantSelectionPage.expandOthersSection();
        variantSelectionPage.selectOthers(1);
        expect(alleleSectionBox.classSelection.isEnabled()).toBe(false);
    });

    it('own ongoing work is writeable', function () {
        loginPage.selectFirstUser();
        variantSelectionPage.expandOwnSection();
        variantSelectionPage.selectOwn(1);

        expect(alleleSectionBox.isClassT()).toBe(true);

        expect(alleleSectionBox.classSelection.isEnabled()).toBe(true);
    });

    it('others review is read-only until started', function () {
        // own classifies as class1 and sets to review
        loginPage.selectFirstUser();
        variantSelectionPage.expandOwnSection();
        variantSelectionPage.selectOwn(1);

        alleleSectionBox.markAsClass1();
        analysisPage.finishButton.click();
        analysisPage.markReviewButton.click();

        // other user see a read-only
        loginPage.selectSecondUser();
        variantSelectionPage.expandReviewSection();
        variantSelectionPage.selectReview(1);

        expect(alleleSectionBox.classSelection.isEnabled()).toBe(false);
        expect(alleleSectionBox.isClass1()).toBe(true);

        // other user starts a review
        analysisPage.startButton.click();
        expect(alleleSectionBox.classSelection.isEnabled()).toBe(true);
        analysisPage.finishButton.click();
        analysisPage.finalizeButton.click();
    });

    it('finalized is read-only until reopened and review is started', function () {
        loginPage.selectThirdUser();
        variantSelectionPage.expandFinishedSection();
        variantSelectionPage.selectFinished(1);

        expect(alleleSectionBox.classSelection.isEnabled()).toBe(false);

        analysisPage.reopenButton.click();
        expect(alleleSectionBox.classSelection.isEnabled()).toBe(false);

        analysisPage.startButton.click();
        expect(alleleSectionBox.classSelection.isEnabled()).toBe(false);

        alleleSectionBox.classificationAcceptedToggleBtn.click();
        expect(alleleSectionBox.classSelection.isEnabled()).toBe(true);

        analysisPage.finishButton.click();
        analysisPage.finalizeButton.click();

    });

        it('finalized is read-only, but report is editable', function () {
        loginPage.selectThirdUser();
        variantSelectionPage.expandFinishedSection();
        variantSelectionPage.selectFinished(1);

        alleleSectionBox.reportCommentElement.click();
        expect(alleleSectionBox.reportCommentEditable).toBe(false);

        analysisPage.startButton.click();
        alleleSectionBox.reportCommentElement.click();
        expect(alleleSectionBox.reportCommentEditable).toBe(true);

        alleleSectionBox.setReportComment('report changed'); // not taking effect; stays blank!
        analysisPage.finishButton.click();
        analysisPage.finalizeButton.click();

        loginPage.selectSecondUser();
        variantSelectionPage.expandFinishedSection();
        variantSelectionPage.selectFinished(1);
        alleleSectionBox.reportCommentElement.click();
        expect(alleleSectionBox.reportCommentEditable).toBe(false);
        // expect(alleleSectionBox.reportComment).toBe('report changed'); // still blank!?

    });

});