import { set, when } from 'cerebral/operators'
import { state, props } from 'cerebral/tags'

export default [
    when(props`selected`),
    {
        true: [set(state`views.workflows.modals.alleleHistory.selected`, props`selected`)],
        false: []
    }
]
