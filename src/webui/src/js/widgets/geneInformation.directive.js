import app from '../ng-decorators'
import { connect } from '@cerebral/angularjs'
import { state, props, signal } from 'cerebral/tags'
import { Compute } from 'cerebral'
import getGenepanelValuesForGene from '../store/common/computes/getGenepanelValuesForGene'
import isReadOnly from '../store/modules/views/workflows/computed/isReadOnly'
import template from './geneInformation.ngtmpl.html'
import getGeneAssessment from '../store/modules/views/workflows/interpretation/computed/getGeneAssessment'

const geneComment = Compute(props`hgncId`, state`views.workflows.data`, (hgncId, data) => {
    console.log(hgncId)
})

app.component('geneInformation', {
    bindings: {
        hgncId: '<',
        hgncSymbol: '<'
    },
    templateUrl: 'geneInformation.ngtmpl.html',
    controller: connect(
        {
            config: state`app.config`,
            isReadOnly,
            genepanelValues: getGenepanelValuesForGene(
                props`hgncId`,
                state`views.workflows.interpretation.data.genepanel`,
                props`hgncSymbol`
            ),
            geneAssessment: getGeneAssessment(props`hgncId`),
            userGeneAssessment: state`views.workflows.interpretation.userState.geneassessment.${props`hgncId`}`,
            geneAssessmentChanged: signal`views.workflows.interpretation.geneAssessmentChanged`,
            undoGeneAssessmentClicked: signal`views.workflows.interpretation.undoGeneAssessmentClicked`,
            updateGeneAssessmentClicked: signal`views.workflows.interpretation.updateGeneAssessmentClicked`
        },
        'GeneInformation',
        [
            '$scope',
            function($scope) {
                const $ctrl = $scope.$ctrl
                Object.assign($ctrl, {
                    geneCommentEditable: false,
                    editedGeneComment: null,
                    toggleGeneCommentEdit() {
                        $ctrl.geneCommentEditable = !$ctrl.geneCommentEditable
                    },
                    getOmimLink() {
                        const entryId = $ctrl.genepanelValues.omimEntryId
                        return entryId
                            ? `https://www.omim.org/entry/${entryId}`
                            : `https://www.omim.org/search/?search=${$ctrl.hgncSymbol}`
                    },
                    getHgmdLink() {
                        return `https://portal.biobase-international.com/hgmd/pro/gene.php?gene=${$ctrl.hgncSymbol}`
                    },
                    getFrequencyExternal() {
                        return `${$ctrl.genepanelValues.freqCutoffs.value.external.lo_freq_cutoff}/${$ctrl.genepanelValues.freqCutoffs.value.external.hi_freq_cutoff}`
                    },
                    getFrequencyInternal() {
                        return `${$ctrl.genepanelValues.freqCutoffs.value.internal.lo_freq_cutoff}/${$ctrl.genepanelValues.freqCutoffs.value.internal.hi_freq_cutoff}`
                    },
                    getGeneCommentModel() {
                        return $ctrl.userGeneAssessment
                            ? $ctrl.userGeneAssessment.evaluation
                            : $ctrl.geneAssessment.evaluation
                    },
                    isCommmentEditable() {
                        // If there's a userGeneAssessment, it's per definition
                        // editable
                        return Boolean($ctrl.userGeneAssessment) && !$ctrl.isReadOnly
                    },
                    editClicked() {
                        if (!$ctrl.hgncId) {
                            throw Error("Missing property 'hgncId'")
                        }
                        const copiedGeneAssessment = JSON.parse(
                            JSON.stringify($ctrl.geneAssessment)
                        )
                        $ctrl.geneAssessmentChanged({
                            hgncId: $ctrl.hgncId,
                            geneAssessment: copiedGeneAssessment
                        })
                    },
                    geneCommentChanged() {
                        $ctrl.geneAssessmentChanged({
                            hgncId: $ctrl.hgncId,
                            geneAssessment: $ctrl.userGeneAssessment
                        })
                    },
                    undoGeneAssessment() {
                        $ctrl.undoGeneAssessmentClicked({ hgncId: $ctrl.hgncId })
                    },
                    isGeneCommentChanged() {
                        if ($ctrl.geneAssessment && $ctrl.userGeneAssessment) {
                            return (
                                $ctrl.geneAssessment.evaluation.comment !==
                                $ctrl.userGeneAssessment.evaluation.comment
                            )
                        }
                        return false
                    }
                })
            }
        ]
    )
})
