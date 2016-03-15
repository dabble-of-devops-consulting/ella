/* jshint esnext: true */

import {Directive, Inject} from '../../ng-decorators';

@Directive({
    selector: 'report-card',
    templateUrl: 'ngtmpl/reportcard.ngtmpl.html',
    scope: {
        analysis: '=',
        alleles: '=',
        references: '=',
        state: '=',
        userState: '=',
    }

})
@Inject(
    'Config',
    'Allele',
    'Analysis',
    'Interpretation'
)
export class ReportCardController {


    constructor(Config,
                Allele,
                Analysis,
                Interpretation) {
        this.config = Config.getConfig();
        this.alleleService = Allele;
        this.interpretationService = Interpretation;
        this.analysisService = Analysis;

        this.selected_excluded = null;
    }

    getIncludedAlleles() {
        let included = this.alleles.filter(allele => {
            if ('report' in this.state.allele[allele.id] &&
                'included' in this.state.allele[allele.id].report) {
                return this.state.allele[allele.id].report.included;
            }
            return false;
        });
        included.sort((a, b) => {
            let ac = this.getClassification(a);
            let bc = this.getClassification(b);
            let aci = this.config.classification.options.findIndex(elem => {
                return elem.value === ac;
            });
            let bci = this.config.classification.options.findIndex(elem => {
                return elem.value === bc;
            });
            return bci - aci;
        });
        return included;
    }

    getExcludedAlleles() {
        return this.alleles.filter(allele => {
            if ('report' in this.state.allele[allele.id] &&
                'included' in this.state.allele[allele.id].report) {
                return !this.state.allele[allele.id].report.included;
            }
            return true;
        });
    }

    getIncludedNeedsVerification() {
        return this.getIncludedAlleles().filter(al => {
            return al.annotation.quality.needs_verification;
        });
    }

    includeSelectedExcluded() {
        if (this.selected_excluded) {
            if (!('report' in this.state.allele[this.selected_excluded.id])) {
                this.state.allele[this.selected_excluded.id].report = {};
            };
            this.state.allele[this.selected_excluded.id].report.included = true;
        }
        this.selected_excluded = null;
    }

    getAlleleState(allele) {
        return this.state.allele[allele.id];
    }

    getClassification(allele) {
        if ('alleleassessment' in this.getAlleleState(allele) &&
            'classification' in this.getAlleleState(allele).alleleassessment) {
            return this.getAlleleState(allele).alleleassessment.classification;
        }
    }

    formatHGVS(allele) {
        let hgvs = '';
        for (let t of allele.annotation.filtered) {
            hgvs += `${t.Transcript}.${t.Transcript_version}(${t.SYMBOL}):`;
            let part = t.HGVSc_short.split("c.", 2)[1]; // remove 'c.'
            if (allele.genotype.homozygous) {
                hgvs += `c.[${part}];[(${part})]`; // c.[76A>C];[(76A>C)]
            }
            else {
                hgvs += `c.[${part}];[=]`; // c.[76A>C];[=]
            }
            let classification = this.getClassification(allele);
            if (classification) {
                hgvs += ` ${this.config.report.classification_text[classification]}`;
            }
            hgvs += `\n${t.HGVSc_short}`;
            if (t.HGVSp_short) {
                hgvs += ` ${t.HGVSp_short}`;
            }
            hgvs += '\n\n';

        }
        hgvs += ``;
        return hgvs;
    }

}