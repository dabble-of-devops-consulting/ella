import { set, equals } from 'cerebral/operators'
import { state, props } from 'cerebral/tags'

export default [set(state`views.login.password`, props`password`)]
