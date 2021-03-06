import { set, equals } from 'cerebral/operators'
import { state } from 'cerebral/tags'

export default [
    equals(state`views.workflows.modals.addReferences.referenceMode`),
    {
        Search: [
            set(state`views.workflows.modals.addReferences.selection`, {
                searchPhrase: ''
            })
        ],
        PubMed: [
            set(state`views.workflows.modals.addReferences.selection`, {
                pubmedData: ''
            })
        ],
        Manual: [
            set(state`views.workflows.modals.addReferences.selection`, {
                submodes: ['Published', 'Unpublished'],
                submode: 'Published',
                title: '',
                authors: '',
                journal: '',
                volume: '',
                issue: '',
                year: '',
                pages: '',
                abstract: ''
            })
        ]
    }
]
