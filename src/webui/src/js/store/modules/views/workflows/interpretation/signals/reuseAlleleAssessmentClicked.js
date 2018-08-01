import { set } from 'cerebral/operators'
import { state, props } from 'cerebral/tags'
import isAlleleAssessmentOutdated from '../operators/isAlleleAssessmentOutdated'
import toast from '../../../../../common/factories/toast'
import toggleReuseAlleleAssessment from '../actions/toggleReuseAlleleAssessment'
import copyExistingAlleleAssessments from '../../actions/copyExistingAlleleAssessments'
import autoReuseExistingReferenceAssessments from '../actions/autoReuseExistingReferenceAssessments'

export default [
    isAlleleAssessmentOutdated,
    {
        true: [toast('error', 'Cannot toggle reuse of outdated classification')],
        false: [
            toggleReuseAlleleAssessment,
            copyExistingAlleleAssessments,
            set(
                state`views.workflows.interpretation.selected.state.allele.${props`alleleId`}.referenceassessments`,
                []
            ),
            autoReuseExistingReferenceAssessments
        ]
    }
]
