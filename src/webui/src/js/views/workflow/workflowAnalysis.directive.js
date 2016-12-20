/* jshint esnext: true */

import {Directive, Inject} from '../../ng-decorators';

@Directive({
    selector: 'workflow-analysis',
    scope: {
        'analysisId': '@'
    },
    templateUrl: 'ngtmpl/workflowAnalysis.ngtmpl.html'
})
@Inject('$rootScope',
    '$scope',
    'WorkflowResource',
    'AnalysisResource',
    'Workflow',
    'Navbar',
    'Config',
    'User')
export class AnalysisController {
    constructor(rootScope, scope, WorkflowResource, AnalysisResource, Workflow, Navbar, Config, User) {
        this.rootScope = rootScope;
        this.scope = scope;
        this.workflowResource = WorkflowResource;
        this.analysisResource = AnalysisResource;
        this.workflowService = Workflow;
        this.analysis = null;
        this.active_interpretation = null;
        this.navbar = Navbar;
        this.config = Config.getConfig();
        this.user = User;

        this.components = [ // instantiated/rendered in AlleleSectionboxContentController
            {
                title: 'Classification',
                sections: [
                    {
                        title: 'Classification',
                        options: {
                            collapsed: false
                        },
                        controls: [
                            'classification',
                            'reuse_classification'
                        ],
                        comments: [
                            {
                                placeholder: 'EVALUATION',
                                modeltype: 'alleleassessment',
                                modelname: 'classification'
                            },
                            {
                                placeholder: 'REPORT',
                                modeltype: 'report',
                                modelname: 'evaluation'
                            }
                        ],
                        content: [
                            {'tag': 'allele-info-acmg-selection'},
                            {'tag': 'allele-info-vardb'}
                        ],
                    },
                    {
                        title: 'Frequency & QC',
                        options: {
                            collapsed: false
                        },
                        controls: [
                            'igv',
                            'copy_alamut',
                            'toggle_class1',
                            'toggle_class2',
                            'toggle_technical'
                        ],
                        comments: [
                            {
                                placeholder: 'FREQUENCY-COMMENTS',
                                modeltype: 'alleleassessment',
                                modelname: 'frequency'
                            }
                        ],
                        content: [
                            {'tag': 'allele-info-frequency-exac'},
                            {'tag': 'allele-info-frequency-thousandg'},
                            {'tag': 'allele-info-frequency-esp6500'},
                            {'tag': 'allele-info-frequency-indb'},
                            {'tag': 'allele-info-dbsnp'},
                            {'tag': 'allele-info-quality'},
                        ],
                    },
                    {
                        title: 'External',
                        options: {
                            collapsed: false
                        },
                        controls: [
                            'custom_external'
                        ],
                        comments: [
                            {
                                placeholder: 'EXTERNAL DB-COMMENTS',
                                modeltype: 'alleleassessment',
                                modelname: 'external'
                            }
                        ],
                        content: [
                            {'tag': 'allele-info-hgmd'},
                            {'tag': 'allele-info-clinvar'},
                            {'tag': 'allele-info-external-other'}
                        ],
                    },
                    {
                        title: 'Prediction',
                        options: {
                            collapsed: false
                        },
                        controls: [
                            'custom_prediction'
                        ],
                        comments: [
                            {
                                placeholder: 'PREDICTION-COMMENTS',
                                modeltype: 'alleleassessment',
                                modelname: 'prediction'
                            }
                        ],
                        content: [
                            {'tag': 'allele-info-consequence'},
                            {'tag': 'allele-info-splice'},
                            {'tag': 'allele-info-prediction-other'},
                        ],
                    },
                    {
                        title: 'References',
                        options: {
                            collapsed: false
                        },
                        controls: [
                            'references'
                        ],
                        content: [
                            {'tag': 'allele-info-references'}
                        ],
                    }
                ]
            },
            {
                title: 'Report',
                alleles: []
            }
        ];
        this.selected_component = this.components[0];

        // Dummy state provided to <interpretation> before we have loaded actual interpretation. Never stored, just discarded..
        // Let's user browse read only view, without starting interpretation
        this.dummy_interpretation = {
            state: {},
            user_state: {}
        };


        this.selected_interpretation = null; // Holds displayed interpretation
        this.selected_interpretation_alleles = []; // Loaded alleles for current interpretation
        this.alleles_loaded = false;  // Loading indicators etc


        this.interpretations = []; // Holds interpretations from backend
        this.history_interpretations = []; // Filtered interpretations, containing only the finished ones. Used in dropdown

        this.setUpListeners();
        this._setWatchers();
        this.setupNavbar();

        this._loadAnalysis();
        this.reloadInterpretationData();
    }

    setUpListeners() {
        // Setup listener for asking user if they really want to navigate
        // away from page if unsaved changes
        let unregister_func = this.rootScope.$on('$stateChangeStart', (event) => {  // TODO: create switch to disable in CI/test
            if (this.config.app.user_confirmation_on_state_change && this.isInterpretationOngoing() && this.selected_interpretation.dirty) {
                this.confirmAbortInterpretation(event);
            }
        });

        // Unregister when scope is destroyed.
        this.scope.$on('$destroy', () => {
            unregister_func();
            window.onbeforeunload = null;
        });

        // Ask user when reloading/closing if unsaved changes
        window.onbeforeunload = (event) => {
            if (this.config.app.user_confirmation_to_discard_changes && this.isInterpretationOngoing() && this.selected_interpretation.dirty) { // TODO: create switch to disable in CI/test
                event.returnValue = "You have unsaved work. Do you really want to exit application?";
            }
        };
    }

    _setWatchers(rootScope) {
        // Watch interpretation's state/user_state and call update whenever it changes
        let watchStateFn = () => {
            if (this.isInterpretationOngoing() &&
                this.selected_interpretation.state) {
                return this.selected_interpretation.state;
            }
        };
        let watchUserStateFn = () => {
            if (this.isInterpretationOngoing() &&
                this.selected_interpretation.user_state) {
                return this.selected_interpretation.user_state;
            }
        };
        this.rootScope.$watch(watchStateFn, (n, o) => {
            // If no old object, we're on the first iteration
            // -> don't set dirty
            if (this.selected_interpretation && o) {
                this.selected_interpretation.setDirty();
            }
        }, true); // true -> Deep watch

        this.rootScope.$watch(watchUserStateFn, (n, o) => {
            if (this.selected_interpretation && o) {
                this.selected_interpretation.setDirty();
            }
        }, true); // true -> Deep watch


        this.rootScope.$watch(
            () => this.selected_interpretation,
            () => this.loadAlleles(this.selected_interpretation)
        );
    }

    setupNavbar() {
        this.navbar.replaceItems([
            {
                title: this.analysis ? this.analysis.name : '',
                url: "/overview"
            }
        ]);
        this.navbar.setAnalysis(this.analysis);
    }

    getExcludedAlleleCount() {
        return Object.values(this.interpretation.excluded_allele_ids)
               .map(excluded_group => excluded_group.length)
               .reduce((total_length, length) => total_length + length);
    }

    isAnalysisDone() {
        if (!this.interpretation) {
            return false;
        }

        return this.interpretation.status == 'Done';
    }

    confirmAbortInterpretation(event) {
        if (this.isInterpretationOngoing() && !event.defaultPrevented) {
            let choice = confirm('Abort current analysis? Any unsaved changes will be lost!');
            if (!choice) {
                event.preventDefault();
            }
        }
    }

    getInterpretation() {
        // Force selected interpretation to be the Ongoing one, if it exists, to avoid mixups.
        let ongoing_interpretation = this.interpretations.find(i => i.status === 'Ongoing');
        if (ongoing_interpretation) {
            this.selected_interpretation = ongoing_interpretation;
        }

        if (this.selected_interpretation) {
            return this.selected_interpretation;
        }
        return this.dummy_interpretation;
    }

    isInterpretationOngoing() {
        return (this.selected_interpretation &&
                this.selected_interpretation.status == 'Ongoing')
    }

    showHistory() {
        return !this.isInterpretationOngoing()
               && this.history_interpretations.length;
    }

    canFinish() {
        return true;
    }

    reloadInterpretationData() {
        console.log("Reloading interpretation data...")
        this._loadInterpretations().then(() => {
            this.history_interpretations = this.interpretations.filter(i => i.status === 'Done');
        });
    }

    loadAlleles(interpretation) {
        this.alleles_loaded = false;
        this.selected_interpretation_alleles = [];
        if (interpretation) {
            return this.workflowService.loadAlleles(
                'analysis',
                this.analysisId,
                interpretation
            ).then(alleles => {
                this.selected_interpretation_alleles = alleles;
                this.alleles_loaded = true;
            });
        }
    }

    _loadInterpretations() {
        return this.workflowResource.getInterpretations('analysis', this.analysisId).then(interpretations => {
            this.interpretations = interpretations
            this.selected_interpretation = this.interpretations[this.interpretations.length-1];
        });
    }

    _loadAnalysis() {
        this.analysisResource.getAnalysis(this.analysisId).then(a => {
            this.analysis = a;
            this.setupNavbar();
        });
    }

}
