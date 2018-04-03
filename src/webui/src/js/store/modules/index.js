import { Module } from 'cerebral'
import HttpProvider from '@cerebral/http'
import StorageModule from '@cerebral/storage'
import Router from '@cerebral/router'

import AppModule from './app'
import SearchModule from './search'
import ViewsModule from './views'
import ModalsModule from './modals'
import { IntervalProvider, ProgressProvider, ClipboardProvider } from '../common/providers/'
import onBeforeUnload from '../common/providers/onBeforeUnload'
import closeModal from '../common/actions/closeModal'
import showModal from '../common/actions/showModal'

let http = HttpProvider({
    baseUrl: '/api/v1/',
    headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        Accept: 'application/json'
    },
    onRequest(xhr, options) {
        if (options.headers['Content-Type'].indexOf('application/x-www-form-urlencoded') >= 0) {
            options.body = urlEncode(options.body)
        } else if (options.headers['Content-Type'].indexOf('application/json') >= 0) {
            // Only this line is changed from default
            options.body = angular.toJson(options.body)
        }

        if (
            typeof window !== 'undefined' &&
            window.FormData &&
            options.body instanceof window.FormData
        ) {
            delete options.headers['Content-Type']
        }

        xhr.withCredentials = Boolean(options.withCredentials)

        Object.keys(options.headers).forEach((key) => {
            xhr.setRequestHeader(key, options.headers[key])
        })

        if (options.onRequestCallback) {
            options.onRequestCallback(xhr)
        }

        xhr.send(options.body)
    }
})

const storage = StorageModule({
    target: localStorage,
    json: true,
    sync: {},
    prefix: 'app'
})

export default Module({
    state: {},
    modules: {
        storage,
        modals: ModalsModule,
        search: SearchModule,
        views: ViewsModule,
        app: AppModule,
        router: Router({
            routes: [
                {
                    path: '/overview/:section',
                    signal: 'views.overview.routed'
                },
                {
                    path: '/workflows/analyses/:analysisId',
                    signal: 'views.workflows.routedAnalysis'
                },
                {
                    path: '/workflows/variants/:alleleReference/:alleleIdentifier',
                    signal: 'views.workflows.routedAllele'
                },
                {
                    path: '/dashboard',
                    signal: 'views.dashboard.routed'
                },
                {
                    path: '/login',
                    signal: 'views.login.routed'
                },
                {
                    path: '/*',
                    signal: 'views.defaultRouted'
                }
            ]
        })
    },
    signals: {
        closeModal: [closeModal],
        showModal: [showModal]
    },
    providers: {
        progress: ProgressProvider,
        onBeforeUnload,
        interval: IntervalProvider,
        clipboard: ClipboardProvider,
        http
    },
    services: [
        'toastr',
        'AlleleAssessmentHistoryModal',
        'CustomAnnotationModal',
        'ReferenceEvalModal',
        'ImportModal',
        'Config',
        'User',
        '$uibModal'
    ]
})
