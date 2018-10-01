import { set, when } from 'cerebral/operators'
import { state, props } from 'cerebral/tags'
import toast from '../../../../../common/factories/toast'
import getSamples from '../actions/getSamples'

export default [set(state`views.overview.import.selectedSample`, props`selectedSample`)]