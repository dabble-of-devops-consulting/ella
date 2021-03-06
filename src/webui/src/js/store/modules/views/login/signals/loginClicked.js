import { set, unset } from 'cerebral/operators'
import { state, props, string } from 'cerebral/tags'
import toast from '../../../../common/factories/toast'
import { redirect } from '../../../../common/factories/route'
import checkUsername from '../actions/checkUsername'
import postLogin from '../actions/postLogin'
import reset from '../actions/reset'
import loadBroadcast from '../../../../common/sequences/loadBroadcast'

export default [
    checkUsername,
    {
        pass: [
            postLogin,
            {
                // Unset config here; this is reloaded (with user config) on redirect
                success: [reset, unset(state`app.config`), redirect('overview/'), loadBroadcast],
                error: [
                    set(state`views.login.password`, ''),
                    toast('error', string`${props`errorMessage`}`, 10000)
                ]
            }
        ],
        fail: [toast('error', 'Invalid username')]
    }
]
