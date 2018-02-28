/* jshint esnext: true */

import {Directive, Inject} from '../ng-decorators';
import {AlleleStateHelper} from '../model/allelestatehelper';

@Directive({
    selector: 'analysis-info',
    templateUrl: 'ngtmpl/analysisInfo.ngtmpl.html',
    scope: {
        analysis: '=',
        alleles: '=',
        readOnly: '=?'
    }

})
@Inject()
export class AnalysisInfoController {
    constructor() {}
}
