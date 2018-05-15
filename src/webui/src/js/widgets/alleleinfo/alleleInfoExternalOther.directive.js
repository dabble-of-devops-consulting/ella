import app from '../../ng-decorators'
import { connect } from '@cerebral/angularjs'
import { state, string, signal } from 'cerebral/tags'

app.component('alleleInfoExternalOther', {
    templateUrl: 'ngtmpl/alleleInfoExternalOther.ngtmpl.html',
    controller: connect(
        {
            config: state`app.config`,
            allele: state`views.workflows.data.alleles.${state`views.workflows.selectedAllele`}`
        },
        'AlleleInfoExternalOther',
        [
            '$scope',
            function($scope) {
                const $ctrl = $scope.$ctrl

                Object.assign($ctrl, {
                    hasContent() {
                        return this.config.custom_annotation.external.some((group) => {
                            return (
                                'external' in this.allele.annotation &&
                                group.key in this.allele.annotation.external
                            )
                        })
                    }
                })
            }
        ]
    )
})
