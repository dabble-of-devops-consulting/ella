import app from '../ng-decorators'
import { connect } from '@cerebral/angularjs'
import { state, signal } from 'cerebral/tags'

import template from './navbar.ngtmpl.html'

app.component('navbar', {
    templateUrl: 'navbar.ngtmpl.html',
    controller: connect(
        {
            config: state`app.config`,
            user: state`app.user`,
            currentView: state`views.current`,
            title: state`app.navbar.title`
        },
        'Navbar'
    )
})
