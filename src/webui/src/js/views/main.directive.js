/* jshint esnext: true */

import { Directive, Inject } from '../ng-decorators'

import app from '../ng-decorators'
import { connect } from '@cerebral/angularjs'
import { state, signal } from 'cerebral/tags'

app.component('main', {
    templateUrl: 'ngtmpl/main-new.ngtmpl.html',
    controller: connect(
        {
            views: state`views`,
            modals: state`modals`
        },
        'Main'
    )
})

@Directive({
    selector: 'main-old',
    templateUrl: 'ngtmpl/main.ngtmpl.html',
    scope: {}
})
@Inject('Search')
export class MainController {
    constructor(SearchResource) {
        this.searchResource = SearchResource

        this.search = {
            results: null,
            query: ''
        }
    }

    updateSearch() {
        if (this.search.search_query && this.search.search_query.length > 2) {
            SearchResource.get(this.search.search_query).then(r => {
                this.search.results = r
            })
        } else {
            this.search.results = null
        }
    }

    hasSearchResults() {
        return this.search.results || false
    }
}
