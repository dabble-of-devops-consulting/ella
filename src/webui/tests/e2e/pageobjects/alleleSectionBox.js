let Page = require('./page')
let util = require('./util')

const SELECTOR_ACMG_INCLUDED = '.id-acmg-included'

const SELECTOR_INSERT_TEMPLATE_BUTTON = '.id-insert-template-button'
const SELECTOR_INSERT_REFERENCE_BUTTON = '.id-insert-references-button'
const SELECTOR_COMMENT_ANALYSIS = 'allele-sectionbox .id-comment-analysis'
const SELECTOR_COMMENT_ANALYSIS_EDITOR = `${SELECTOR_COMMENT_ANALYSIS} .wysiwygeditor`
const SELECTOR_COMMENT_CLASSIFICATION = 'allele-sectionbox .id-comment-classification'
const SELECTOR_COMMENT_CLASSIFICATION_EDITOR = `${SELECTOR_COMMENT_CLASSIFICATION} .wysiwygeditor`
const SELECTOR_COMMENT_FREQUENCY = 'allele-sectionbox .id-comment-frequency'
const SELECTOR_COMMENT_FREQUENCY_EDITOR = `${SELECTOR_COMMENT_FREQUENCY} .wysiwygeditor`
const SELECTOR_COMMENT_EXTERNAL = 'allele-sectionbox .id-comment-external'
const SELECTOR_COMMENT_EXTERNAL_EDITOR = `${SELECTOR_COMMENT_EXTERNAL} .wysiwygeditor`
const SELECTOR_COMMENT_PREDICTION = 'allele-sectionbox .id-comment-prediction'
const SELECTOR_COMMENT_PREDICTION_EDITOR = `${SELECTOR_COMMENT_PREDICTION} .wysiwygeditor`
const SELECTOR_COMMENT_REPORT = 'allele-sectionbox .id-comment-report'
const SELECTOR_COMMENT_REPORT_EDITOR = `${SELECTOR_COMMENT_REPORT} .wysiwygeditor`

const SELECTOR_FREQ_EXAC = `allele-sectionbox contentbox[title="ExAC"]`
const SELECTOR_FREQ_GNOMAD_EXOMES = `allele-sectionbox contentbox[title="GNOMAD_EXOMES"]`
const SELECTOR_FREQ_GNOMAD_GENOMES = `allele-sectionbox contentbox[title="GNOMAD_GENOMES"]`

const SELECTOR_EXISTING_CLASSIFICATION =
    'allele-sectionbox contentbox.vardb .id-classification-name'

class AlleleSectionBox {
    get exacElement() {
        return util.elementIntoView(SELECTOR_FREQ_EXAC)
    }
    get gnomADExomesElement() {
        return $(SELECTOR_FREQ_GNOMAD_EXOMES)
    }
    get gnomADGenomesElement() {
        return $(SELECTOR_FREQ_GNOMAD_GENOMES)
    }

    get analysisCommentElement() {
        return util.elementIntoView(SELECTOR_COMMENT_ANALYSIS)
    }

    get analysisComment() {
        return $(SELECTOR_COMMENT_ANALYSIS_EDITOR).getText()
    }

    setAnalysisSpecificComment(text) {
        this.analysisCommentElement.click()
        $(SELECTOR_COMMENT_ANALYSIS_EDITOR).setValue(text)
    }

    get classificationCommentElement() {
        return util.elementIntoView(SELECTOR_COMMENT_CLASSIFICATION)
    }
    get classificationComment() {
        return $(SELECTOR_COMMENT_CLASSIFICATION_EDITOR).getText()
    }
    get existingClassificationName() {
        return $(SELECTOR_EXISTING_CLASSIFICATION).getText()
    }

    setClassificationComment(text) {
        util.elementIntoView(SELECTOR_COMMENT_CLASSIFICATION)
        browser.setWysiwygValue(
            SELECTOR_COMMENT_CLASSIFICATION,
            SELECTOR_COMMENT_CLASSIFICATION_EDITOR,
            text
        )
    }

    get frequencyCommentElement() {
        return util.elementIntoView(SELECTOR_COMMENT_FREQUENCY)
    }
    get frequencyComment() {
        return $(SELECTOR_COMMENT_FREQUENCY_EDITOR).getText()
    }

    setFrequencyComment(text) {
        util.elementIntoView(SELECTOR_COMMENT_FREQUENCY)
        browser.setWysiwygValue(SELECTOR_COMMENT_FREQUENCY, SELECTOR_COMMENT_FREQUENCY_EDITOR, text)
    }

    get externalCommentElement() {
        return util.elementIntoView(SELECTOR_COMMENT_EXTERNAL)
    }
    get externalComment() {
        return $(SELECTOR_COMMENT_EXTERNAL_EDITOR).getText()
    }

    setExternalComment(text) {
        util.elementIntoView(SELECTOR_COMMENT_EXTERNAL)
        browser.setWysiwygValue(SELECTOR_COMMENT_EXTERNAL, SELECTOR_COMMENT_EXTERNAL_EDITOR, text)
    }

    get predictionCommentElement() {
        return util.elementIntoView(SELECTOR_COMMENT_PREDICTION)
    }
    get predictionComment() {
        return $(SELECTOR_COMMENT_PREDICTION_EDITOR).getText()
    }

    setPredictionComment(text) {
        util.elementIntoView(SELECTOR_COMMENT_PREDICTION)
        browser.setWysiwygValue(
            SELECTOR_COMMENT_PREDICTION,
            SELECTOR_COMMENT_PREDICTION_EDITOR,
            text
        )
    }

    get reportCommentElement() {
        return util.elementIntoView(SELECTOR_COMMENT_REPORT)
    }
    get reportComment() {
        return $(SELECTOR_COMMENT_REPORT_EDITOR).getText()
    }
    get reportCommentEditable() {
        return browser.isCommentEditable(SELECTOR_COMMENT_REPORT_EDITOR)
    }

    setReportComment(text) {
        util.elementIntoView(SELECTOR_COMMENT_REPORT)
        browser.setWysiwygValue(SELECTOR_COMMENT_REPORT, SELECTOR_COMMENT_REPORT_EDITOR, text)
    }

    get classSelection() {
        return util.elementIntoView('allele-sectionbox select.id-select-classification')
    }
    get setClassBtn() {
        return util.elementIntoView('allele-sectionbox button.id-set-class')
    }
    get addExternalBtn() {
        return util.elementIntoView('allele-sectionbox button.id-add-external')
    }
    get addPredictionBtn() {
        return util.elementIntoView('allele-sectionbox button.id-add-prediction')
    }
    get addReferencesBtn() {
        return util.elementIntoView('allele-sectionbox button.id-add-references')
    }
    get reevaluateBtn() {
        return util.elementIntoView('allele-sectionbox .id-reevaluate')
    }
    get undoRevaluationBtn() {
        return util.elementIntoView('allele-sectionbox .id-undo-reevaluate > button:first-of-type')
    }

    get undoRevaluationConfirmBtn() {
        return util.elementIntoView('allele-sectionbox .id-undo-reevaluate > button:nth-of-type(2)')
    }

    get undoReportChangesBtn() {
        return util.elementIntoView('allele-sectionbox .id-undo-report > button:first-of-type')
    }

    get undoReportChangesConfirmBtn() {
        return util.elementIntoView('allele-sectionbox .id-undo-report > button:nth-of-type(2)')
    }

    get finalizeBtn() {
        return util.elementIntoView('allele-sectionbox .id-finalize-button')
    }

    get alleleWarningText() {
        return util.element('.warning-box .sb-body').getText()
    }

    undoReevaluation() {
        this.undoRevaluationBtn.click()
        this.undoRevaluationConfirmBtn.click()
    }

    undoReportChanges() {
        this.undoReportChangesBtn.click()
        this.undoReportChangesConfirmBtn.click()
    }

    finalize() {
        this.finalizeBtn.click()
    }

    _setClassification(index) {
        let dropdownOption = `select.id-select-classification option:nth-child(${index})`
        $(dropdownOption).click()
    }

    setClassificationByText(value) {
        let option = this.classSelection.selectByVisibleText(value)
        if (!option) {
            console.error(`Didn't find classifiation option with value '${value}'`)
        }
    }

    getClassificationValue() {
        // the value of the selected option element. This is different than the label shown.
        return this.classSelection.getValue()
    }

    _getClassificationLabel() {
        return this.classSelection.$('option:checked').getText()
    }

    isClassNP() {
        return this._getClassificationLabel().toLowerCase() === 'Not provided'.toLowerCase()
    }

    isClass1() {
        return this._getClassificationLabel().toLowerCase() === 'Class 1'.toLowerCase()
    }

    isClass2() {
        return this._getClassificationLabel().toLowerCase() === 'Class 2'.toLowerCase()
    }

    isClass3() {
        return this._getClassificationLabel().toLowerCase() === 'Class 3'.toLowerCase()
    }

    isClass4() {
        return this._getClassificationLabel().toLowerCase() === 'Class 4'.toLowerCase()
    }

    isClass5() {
        return this._getClassificationLabel().toLowerCase() === 'Class 5'.toLowerCase()
    }

    classifyAsNP() {
        this._setClassification(9)
    }

    classifyAs1() {
        this._setClassification(2)
    }

    classifyAs2() {
        this._setClassification(3)
    }

    classifyAs3() {
        this._setClassification(4)
    }

    classifyAs4() {
        this._setClassification(5)
    }

    classifyAs5() {
        this._setClassification(6)
    }

    unclassify() {
        // go through all possible buttons that 'unclassifies':
        let selectors = ['.id-accept-classification', '.id-marked-class1', '.id-marked-class2']

        for (let s of selectors) {
            const el = $(s)
            if (el.isExisting()) {
                console.info(`Unclassified variant using using button selector ${s}`)
                el.click()
                return
            }
        }
    }

    getNumberOfAttachments() {
        let elements = $$('.attachment-wrapper attachment')
        return elements.length
    }

    evaluateReference(index) {
        let referenceSelector = `article:nth-of-type(${index}).id-reference-pending-published`
        let title = $(`${referenceSelector} .id-reference-title`).getText()
        $(`${referenceSelector} button.id-reference-evaluate`).click()
        return title
    }

    reEvaluateReference(index) {
        // index is number in evaluated list, unpublished + published together
        let title = $(`.id-reference-title`).getText()
        $(`article:nth-of-type(${index}) button.id-reference-evaluate`).click()
        return title
    }

    getReferenceComment(index) {
        const selector = `article:nth-of-type(${index}) .id-reference-comment`
        return $(selector).getText()
    }

    getExternalOtherAnnotation() {
        $('allele-info-external-other div.cell h5').waitForExist()
        return $('allele-info-external-other div.cell h5').getText()
    }

    getExternalOtherValue() {
        return $('allele-info-external-other div.cell p').getText()
    }

    getPredictionOtherAnnotation() {
        $('allele-info-prediction-other div.cell h5').waitForExist()
        return $('allele-info-prediction-other div.cell h5').getText()
    }

    getPredictionOtherValue() {
        return $('allele-info-prediction-other div.cell p').getText()
    }

    getExistingClassificationClass() {
        return $('allele-info-classification contentbox cbbody section h2').getText()
    }

    hasExistingClassification() {
        $('allele-info-classification').waitForExist()
        return $('allele-info-classification contentbox').isExisting()
    }

    expandSectionClassification() {
        let sectionSelector = 'allele-sectionbox .id-sectionbox-classification section'
        let comment = browser.selectorExecute(
            'allele-sectionbox .id-sectionbox-classification section',
            function(matchingElements) {
                return (matchingElements[0].className = matchingElements[0].className.replace(
                    'collapsed',
                    ''
                ))
            }
        )
        util.log(`CSS class of ${sectionSelector} is now ${comment}`)
    }

    getReferences() {
        return $$('allele-sectionbox .id-references-box article')
    }

    getAcmgCode(idx) {
        return $(`.id-acmg-included acmg:nth-child(${idx}) .acmg-title-wrapper h4`).getText()
    }

    getAcmgComment(idx) {
        return $(
            `.id-acmg-included acmg:nth-child(${idx})  wysiwyg-editor div.wysiwygeditor`
        ).getText()
    }

    insertClassificationTemplate(idx) {
        this.classificationCommentElement.click()
        util.element(SELECTOR_INSERT_TEMPLATE_BUTTON).click()
        $(`.wysiwygtemplatespopover .template-item:nth-child(${idx}) > .template-button`).click()
    }

    insertFrequencyReference(idx) {
        this.frequencyCommentElement.click()
        util.element(`${SELECTOR_COMMENT_FREQUENCY} ${SELECTOR_INSERT_REFERENCE_BUTTON}`).click()
        $(
            `${SELECTOR_COMMENT_FREQUENCY} .wysiwygreferencespopover .reference-item:nth-child(${idx +
                1}) > .reference-button`
        ).click()
    }
}

module.exports = AlleleSectionBox
