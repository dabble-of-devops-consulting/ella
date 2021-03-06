import app from '../../ng-decorators'
import { connect } from '@cerebral/angularjs'
import { state, props } from 'cerebral/tags'
import getReferenceAnnotation from '../../store/modules/views/workflows/interpretation/computed/getReferenceAnnotation'
import template from './alleleInfoReferences.ngtmpl.html' // eslint-disable-line no-unused-vars

app.component('alleleInfoReferences', {
    bindings: {
        title: '@',
        type: '@'
    },
    templateUrl: 'alleleInfoReferences.ngtmpl.html',
    controller: connect(
        {
            references: getReferenceAnnotation(
                props`type`,
                state`views.workflows.interpretation.data.alleles.${state`views.workflows.selectedAllele`}`,
                state`views.workflows.interpretation.data.references`
            ),
            showExcluded: state`views.workflows.interpretation.userState.allele.${state`views.workflows.selectedAllele`}.showExcludedReferences`
        },
        'AlleleInfoReferences',
        [
            '$scope',
            function($scope) {
                const $ctrl = $scope.$ctrl

                Object.assign($ctrl, {
                    hasContent() {
                        if ($ctrl.references) {
                            let refCount =
                                $ctrl.references[$ctrl.type].unpublished.length +
                                $ctrl.references[$ctrl.type].published.length
                            if ('missing' in $ctrl.references) {
                                refCount += $ctrl.references.missing.length
                            }
                            return refCount > 0
                        }
                        return false
                    }
                })
            }
        ]
    )
})
