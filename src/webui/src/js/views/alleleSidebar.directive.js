import app from '../ng-decorators'
import { connect } from '@cerebral/angularjs'
import { state, signal, props } from 'cerebral/tags'
import { Compute } from 'cerebral'
import isMultipleInGene from '../store/modules/views/workflows/alleleSidebar/computed/isMultipleInGene'
import isSelected from '../store/modules/views/workflows/alleleSidebar/computed/isSelected'
import isNonsense from '../store/modules/views/workflows/alleleSidebar/computed/isNonsense'
import hasReferences from '../store/modules/views/workflows/alleleSidebar/computed/hasReferences'
import isMultipleSampleType from '../store/modules/views/workflows/alleleSidebar/computed/isMultipleSampleType'
import getConsequence from '../store/modules/views/workflows/alleleSidebar/computed/getConsequence'
import getClassification from '../store/modules/views/workflows/alleleSidebar/computed/getClassification'
import getAlleleState from '../store/modules/views/workflows/interpretation/computed/getAlleleState'
import getVerificationStatus from '../store/modules/views/workflows/interpretation/computed/getVerificationStatus'
import template from './alleleSidebar.ngtmpl.html'

const unclassifiedAlleles = Compute(
    state`views.workflows.alleleSidebar.unclassified`,
    state`views.workflows.data.alleles`,
    (unclassified, alleles) => {
        if (!unclassified) {
            return
        }
        return unclassified.map((aId) => alleles[aId])
    }
)

const classifiedAlleles = Compute(
    state`views.workflows.alleleSidebar.classified`,
    state`views.workflows.data.alleles`,
    (classified, alleles) => {
        if (!classified) {
            return
        }
        return classified.map((aId) => alleles[aId])
    }
)

const isTogglable = Compute(
    state`views.workflows.data.alleles`,
    getClassification,
    state`views.workflows.selectedComponent`,
    (alleles, classifications, selectedComponent, get) => {
        const result = {}
        if (!alleles) {
            return result
        }
        const verificationStatus = get(getVerificationStatus)
        for (let [alleleId, allele] of Object.entries(alleles)) {
            if (selectedComponent !== 'Report') {
                result[alleleId] = false
                continue
            }
            result[alleleId] =
                Boolean(classifications[alleleId]) && verificationStatus[alleleId] != 'technical'
        }
        return result
    }
)

const isToggled = Compute(
    state`views.workflows.data.alleles`,
    state`views.workflows.selectedComponent`,
    (alleles, selectedComponent, get) => {
        const result = {}
        if (!alleles) {
            return result
        }
        for (let [alleleId, allele] of Object.entries(alleles)) {
            if (selectedComponent !== 'Report') {
                result[alleleId] = false
                continue
            }
            const alleleState = get(getAlleleState(alleleId))
            result[alleleId] = alleleState.report.included
        }
        return result
    }
)

app.component('alleleSidebar', {
    templateUrl: 'alleleSidebar.ngtmpl.html',
    controller: connect(
        {
            selectedComponent: state`views.workflows.selectedComponent`,
            classified: classifiedAlleles,
            classification: getClassification,
            consequence: getConsequence,
            isMultipleInGene,
            isNonsense,
            isTogglable,
            isToggled,
            verificationStatus: getVerificationStatus,
            orderBy: state`views.workflows.alleleSidebar.orderBy`,
            selectedAllele: state`views.workflows.data.alleles.${state`views.workflows.selectedAllele`}`,
            unclassified: unclassifiedAlleles,
            selectedAlleleChanged: signal`views.workflows.alleleSidebar.selectedAlleleChanged`,
            includeReportToggled: signal`views.workflows.alleleSidebar.includeReportToggled`,
            orderByChanged: signal`views.workflows.alleleSidebar.orderByChanged`
        },
        'AlleleSidebar',
        [
            '$scope',
            function($scope) {
                const RECESSIVE_TAGS = [
                    'recessive_compound_heterozygous',
                    'autosomal_recessive_homozygous',
                    'xlinked_recessive_homozygous'
                ]
                const DENOVO_TAGS = ['denovo']

                const FAMILY_TITLES = {
                    denovo: 'Denovo',
                    recessive_compound_heterozygous: 'Compound recessive heterozygous',
                    autosomal_recessive_homozygous: 'Autosomal recessive homozygous',
                    xlinked_recessive_homozygous: 'X-linked recessive homozygous'
                }

                const $ctrl = $scope.$ctrl
                Object.assign($ctrl, {
                    rowClicked(alleleId, section) {
                        // Handle whether to change selected allele, or to include in report
                        if ($ctrl.selectedComponent !== 'Report') {
                            $ctrl.selectedAlleleChanged({ alleleId })
                        } else {
                            if (section == 'classified' && !$ctrl.isTechnical(alleleId)) {
                                $ctrl.includeReportToggled({ alleleId })
                            }
                        }
                    },
                    getSampleType(allele) {
                        return allele.samples
                            .map((s) => s.sample_type.substring(0, 1))
                            .join('')
                            .toUpperCase()
                    },
                    getSampleTypesFull(allele) {
                        return allele.samples
                            .map((s) => s.sample_type)
                            .join(', ')
                            .toUpperCase()
                    },
                    isTechnical(allele_id) {
                        return $ctrl.verificationStatus[allele_id] === 'technical'
                    },
                    isVerified(allele_id) {
                        return $ctrl.verificationStatus[allele_id] === 'verified'
                    },
                    getClassificationText(allele_id) {
                        if ($ctrl.isTechnical(allele_id)) {
                            return `(${$ctrl.classification[allele_id]})`
                        } else {
                            return $ctrl.classification[allele_id]
                        }
                    },
                    hasQualityInformation(allele) {
                        return (
                            $ctrl.isLowQual(allele) ||
                            $ctrl.isTechnical(allele.id) ||
                            $ctrl.isVerified(allele.id)
                        )
                    },
                    getQualityClass(allele_id) {
                        if ($ctrl.isTechnical(allele_id)) {
                            return 'technical'
                        } else if ($ctrl.isVerified(allele_id)) {
                            return 'verified'
                        } else {
                            return 'low-qual'
                        }
                    },
                    getQualityTag(allele) {
                        if ($ctrl.isTechnical(allele.id)) {
                            return 'T'
                        } else if ($ctrl.isVerified(allele.id)) {
                            return 'V'
                        } else if ($ctrl.isLowQual(allele)) {
                            return 'Q'
                        }
                    },
                    getQualityTextPopover(allele) {
                        if ($ctrl.isTechnical(allele)) {
                            return 'Technical'
                        } else if ($ctrl.isVerified(allele)) {
                            return 'Verified'
                        } else {
                            return 'Quality issues'
                        }
                    },
                    isLowQual(allele) {
                        return allele.tags.includes('low_quality')
                    },
                    isHomozygous(allele) {
                        return allele.tags.includes('homozygous')
                    },
                    hasReferences(allele) {
                        return allele.tags.includes('has_references')
                    },
                    getFamilyTag(allele) {
                        // Denovo takes precedence if tags include both types
                        if (allele.tags.includes('denovo')) {
                            return 'D'
                        } else if (allele.tags.includes('autosomal_recessive_homozygous')) {
                            return 'A'
                        } else if (allele.tags.includes('xlinked_recessive_homozygous')) {
                            return 'X'
                        } else if (allele.tags.includes('recessive_compound_heterozygous')) {
                            return 'C'
                        }
                    },
                    getFamilyLabel(allele) {
                        return allele.tags
                            .filter((t) => {
                                return RECESSIVE_TAGS.concat(DENOVO_TAGS).includes(t)
                            })
                            .map((t) => FAMILY_TITLES[t])
                            .join(', ')
                    }
                })
            }
        ]
    )
})
