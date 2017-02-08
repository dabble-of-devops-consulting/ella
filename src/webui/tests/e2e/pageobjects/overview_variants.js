var Page = require('./page');

const SELECTOR_FINISHED = '.id-variants-finished';
const SELECTOR_PENDING = '.id-variants-pending'; // no assessment
const SELECTOR_REVIEW = '.id-variants-review';
const SELECTOR_YOURS = '.id-variants-yours';
const SELECTOR_OTHERS = '.id-variants-others';


const SELECTOR_VARIANT_NAME = ".id-variant-name";

const SECTION_EXPAND_SELECTOR  = " header .sb-title-container";

class VariantSelection extends Page {

    open() {
        super.open('overview/variants');
    }

    get variantList() { return browser.element('allele-list') }
    get yoursSection() { return browser.element(SELECTOR_YOURS) };
    get othersSection() { return browser.element(SELECTOR_OTHERS) };
    get pendingSection() { return browser.element(SELECTOR_PENDING) }
    get reviewSection() { return browser.element(SELECTOR_REVIEW) }
    get finishedSection() { return browser.element(SELECTOR_FINISHED) }


    variantNamePending(number) {
        let selector = `${SELECTOR_PENDING} .id-variant:nth-child(${number})`;
        let element = browser.element(selector);
        return element.getText('.id-variant-name');
    }

    expandPendingSection() {
        this._expandSection(SELECTOR_PENDING);
    }

    expandReviewSection() {
        this._expandSection(SELECTOR_REVIEW);
    }

    expandFinishedSection() {
        this._expandSection(SELECTOR_FINISHED);
    }

    _expandSection(sectionSelector) {
        this.open();
        browser.waitForExist(sectionSelector);
        browser.click(sectionSelector + SECTION_EXPAND_SELECTOR);
    }

    selectItemInSection(number, sectionSelector) {
        this.open();
        // expand box:
        browser.waitForExist(sectionSelector);
        browser.click(sectionSelector + SECTION_EXPAND_SELECTOR);
        let selector = `${sectionSelector} .id-variant:nth-child(${number})`;
        console.log('Going to click selector:' + selector);
        browser.waitForExist(selector);
        browser.click(selector);
        let element = browser.element(selector);
        console.log('found element using selector:' + element);
        browser.waitForExist('allele-list', 5000, true);
        return element;
    }

    selectFinished(number) {
        this.selectItemInSection(number, SELECTOR_FINISHED);
    }

    selectPending(number) {
        this.selectItemInSection(number, SELECTOR_PENDING);
    }

    selectReview(number) {
        this.selectItemInSection(number, SELECTOR_REVIEW);
    }

    selectFinished(number) {
        this.selectItemInSection(number, SELECTOR_FINISHED);
    }

    selectYours(number) {
        this.selectItemInSection(number, SELECTOR_YOURS);
    }

    selectOthers(number) {
        this.selectItemInSection(number, SELECTOR_OTHERS);
    }


    selectTopPending() {
        this.selectPending(1);
    }

    selectTopReview() {
        this.selectReview(1);
    }


    getReviewComment() {
        let selector = `${SELECTOR_REVIEW} .allele-extras .id-allele-comment`;
        return browser.getText(selector)
    }

}

module.exports = VariantSelection;