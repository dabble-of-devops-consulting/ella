import app from '../../ng-decorators'
import { connect } from '@cerebral/angularjs'
import { state } from 'cerebral/tags'
import template from './alleleInfoExternalOther.ngtmpl.html' // eslint-disable-line no-unused-vars

app.component('alleleInfoExternalOther', {
    templateUrl: 'alleleInfoExternalOther.ngtmpl.html',
    controller: connect(
        {
            config: state`app.config`,
            allele: state`views.workflows.interpretation.data.alleles.${state`views.workflows.selectedAllele`}`
        },
        'AlleleInfoExternalOther',
        [
            '$scope',
            function($scope) {
                const $ctrl = $scope.$ctrl

                Object.assign($ctrl, {
                    hasContent() {
                        return $ctrl.config.custom_annotation.external.some((group) => {
                            return (
                                $ctrl.allele &&
                                'external' in $ctrl.allele.annotation &&
                                group.key in $ctrl.allele.annotation.external
                            )
                        })
                    }
                })
            }
        ]
    )
})
