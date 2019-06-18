import { sequence } from 'cerebral'
import prepareInterpretationState from '../actions/prepareInterpretationState'
import checkAddRemoveAlleleToReport from '../interpretation/actions/checkAddRemoveAllelesToReport'
import autoReuseExistingAlleleassessments from '../interpretation/actions/autoReuseExistingAlleleassessments'
import autoReuseExistingReferenceAssessments from '../interpretation/actions/autoReuseExistingReferenceAssessments'
import prepareAlleleState from '../actions/prepareAlleleState'
import copyExistingAlleleReports from '../actions/copyExistingAlleleReports'

export default sequence('prepareInterpretationState', [
    prepareInterpretationState,
    prepareAlleleState,
    autoReuseExistingAlleleassessments,
    copyExistingAlleleReports,
    autoReuseExistingReferenceAssessments,
    checkAddRemoveAlleleToReport
])
