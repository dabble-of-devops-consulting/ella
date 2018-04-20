import { set, equals } from 'cerebral/operators'
import { state, props } from 'cerebral/tags'
import loadSelectedGenepanel from './loadSelectedGenepanel'
import loadDefaultGenepanel from './loadDefaultGenepanel'
import prepareAddedGenepanel from '../actions/prepareAddedGenepanel'

export default [
    loadDefaultGenepanel,
    prepareAddedGenepanel,
    loadSelectedGenepanel
]
