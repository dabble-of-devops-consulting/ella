import { set, debounce } from 'cerebral/operators'
import { state, props } from 'cerebral/tags'

export default [
    debounce(50),
    {
        continue: [
            set(state`views.workflows.interpretation.userState`, props`userState`),
            set(state`views.workflows.interpretation.dirty`, true)
        ],
        discard: []
    }
]
