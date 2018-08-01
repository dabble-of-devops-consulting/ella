import { set, when } from 'cerebral/operators'
import { state, props } from 'cerebral/tags'
import { getConfig } from '../actions'
import toast from './toast'

function initApp(continueSequence) {
    return [
        when(state`app.config`),
        {
            true: continueSequence,
            false: [
                getConfig,
                {
                    success: [
                        // FIXME: Temporary until we've migrated to cerebral.
                        // Copy config into Angular service
                        ({ Config, props }) => {
                            Config.setConfig(props.result)
                        },
                        set(state`app.config`, props`result`),
                        continueSequence
                    ],
                    error: [
                        set(state`app.config`, null),
                        toast(
                            'error',
                            'ella cannot start. Please contact support: "Failed to load configuration"',
                            10000000
                        )
                    ]
                }
            ]
        }
    ]
}

export default initApp
