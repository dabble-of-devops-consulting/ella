/* jshint esnext: true */

import { Directive } from '../ng-decorators'
import template from './checkablebutton.ngtmpl.html' // eslint-disable-line no-unused-vars

/**
 <checkable-button>
 Checkable button element supporting either normal checkbox behavior,
 by use of the 'check-model=' attribue, or a list model, by use of 'list-model='
 attribute. If using list-model, you must also specify the value with 'list-value='.
 */
@Directive({
    selector: 'checkable-button',
    transclude: {
        checked: '?checked'
    },
    scope: {
        checkModel: '=?',
        listModel: '=?',
        listValue: '=?',
        buttonclass: '@',
        showMark: '@?',
        onChange: '&?',
        ngDisabled: '=',
        oneWay: '=?' // Don't update model upon clicking.
    },
    templateUrl: 'checkablebutton.ngtmpl.html',
    link: (scope, elem, attrs) => {
        if ('listModel' in attrs) {
            if (!('listValue' in attrs)) {
                throw new Error('Missing required attribute list-value')
            } else {
                scope.vm.isListModel = true
            }
        } else if ('checkModel' in attrs) {
            scope.vm.isListModel = false
        } else {
            throw new Error('You need to either define attribute check-model or list-model')
        }
    }
})
export class CheckableButtonController {
    constructor() {
        this.isListModel = null // Will be set in link function
    }

    getClasses() {
        return this.buttonclass ? this.buttonclass : ''
    }

    issueChange() {
        if (this.onChange) {
            this.onChange()
        }
    }

    check() {
        if (this.oneWay) {
            return
        }
        if (this.isListModel) {
            let idx = this.listModel.indexOf(this.listValue)
            if (idx > -1) {
                this.listModel.splice(idx, 1)
                this.issueChange()
            } else {
                this.listModel.push(this.listValue)
                this.issueChange()
            }
        } else {
            this.checkModel = !this.checkModel
            this.issueChange()
        }
    }

    isChecked() {
        if (this.isListModel) {
            return this.listModel.find((v) => v === this.listValue)
        } else {
            return this.checkModel
        }
    }
}
