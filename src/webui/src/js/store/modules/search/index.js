import { Module } from 'cerebral'

import queryChanged from './signals/queryChanged'
import optionsSearchChanged from './signals/optionsSearchChanged'
import showAnalysesClicked from './signals/showAnalysesClicked'

export default Module({
    state: {
        query: {
            freetext: null,
            gene: null,
            user: null
        },
        options: {
            genepanel: null,
            user: null
        },
        results: null,
        loading: false
    },
    signals: {
        optionsSearchChanged,
        queryChanged,
        showAnalysesClicked
    }
})