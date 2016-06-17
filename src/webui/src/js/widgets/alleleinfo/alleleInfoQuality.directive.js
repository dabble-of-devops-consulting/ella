/* jshint esnext: true */

import {Directive, Inject} from '../../ng-decorators';

@Directive({
    selector: 'allele-info-quality',
    scope: {
        allele: '='
    },
    templateUrl: 'ngtmpl/alleleInfoQuality.ngtmpl.html'
})
@Inject()
export class AlleleInfoQuality {

    constructor() {}

    getVerificationText() {
        return this.allele.annotation.quality.needs_verification ? 'Yes' : 'No';
    }
}