import { parallel } from 'cerebral'
import { set, equals } from 'cerebral/operators'
import { state, props, string } from 'cerebral/tags'
import getAlleleIdsByGene from '../actions/getAlleleIdsByGene'
import toast from '../../../../common/factories/toast'
import getAlleleIdsCategory from '../computed/getAlleleIdsCategory'
import loadAlleles from '../sequences/loadAlleles'
import loadIncludedAlleles from '../sequences/loadIncludedAlleles'

export default [
    set(state`modals.addExcludedAlleles.analysisId`, props`analysisId`),
    set(state`modals.addExcludedAlleles.genepanelPath`, props`genepanelPath`),
    set(state`modals.addExcludedAlleles.excludedAlleleIds`, props`excludedAlleleIds`),
    ({ props }) => {
        // Make copy to avoid changing input props
        return { includedAlleleIds: props.includedAlleleIds.slice() }
    },
    set(state`modals.addExcludedAlleles.includedAlleleIds`, props`includedAlleleIds`),
    set(state`modals.addExcludedAlleles.readOnly`, props`readOnly`),
    set(state`modals.addExcludedAlleles.category`, 'all'),
    set(state`modals.addExcludedAlleles.itemsPerPage`, 1),
    set(state`modals.addExcludedAlleles.selectedPage`, 1),
    set(state`modals.addExcludedAlleles.show`, true),
    set(props`alleleIds`, getAlleleIdsCategory), // Defaults to 'all', so we get all possible allele ids
    getAlleleIdsByGene,
    {
        success: [
            set(state`modals.addExcludedAlleles.data.alleleIdsByGene`, props`result`),
            parallel([loadAlleles, loadIncludedAlleles])
        ],
        error: [toast('error', 'Failed to load variants')]
    }
]
