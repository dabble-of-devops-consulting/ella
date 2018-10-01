import { sequence } from 'cerebral'
import { set, when } from 'cerebral/operators'
import { state, props } from 'cerebral/tags'
import getAlleles from '../actions/getAlleles'
import toast from '../../../../common/factories/toast'
import prepareInterpretationState from './prepareInterpretationState'
import allelesChanged from '../alleleSidebar/sequences/allelesChanged'
import loadCollisions from './loadCollisions'
import updateSuggestedClassification from '../interpretation/sequences/updateSuggestedClassification'

export default sequence('loadAlleles', [
    getAlleles,
    {
        success: [
            set(state`views.workflows.data.alleles`, props`result`),
            prepareInterpretationState,
            allelesChanged, // Update alleleSidebar
            loadCollisions,
            when(state`views.workflows.selectedAllele`),
            {
                true: [
                    set(props`alleleId`, state`views.workflows.selectedAllele`),
                    updateSuggestedClassification
                ],
                false: []
            }
        ],
        error: [toast('error', 'Failed to load variant(s)', 30000)]
    }
])