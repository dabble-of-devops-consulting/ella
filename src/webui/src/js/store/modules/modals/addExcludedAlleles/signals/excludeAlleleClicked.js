import { parallel } from 'cerebral'
import { push, equals } from 'cerebral/operators'
import { state, props, string } from 'cerebral/tags'
import loadAlleles from '../sequences/loadAlleles'
import loadIncludedAlleles from '../sequences/loadIncludedAlleles'

export default [
    ({ state, props }) => {
        const includedAlleleIds = state.get('modals.addExcludedAlleles.includedAlleleIds')
        const idx = includedAlleleIds.findIndex((alleleId) => alleleId === props.alleleId)
        if (idx >= 0) {
            state.splice(`modals.addExcludedAlleles.includedAlleleIds`, idx, 1)
        } else {
            throw Error(`Allele id ${props.alleleId} is not included`)
        }
    },
    loadAlleles,
    loadIncludedAlleles
]
