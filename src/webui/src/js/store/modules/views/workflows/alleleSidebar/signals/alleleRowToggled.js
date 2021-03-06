import { toggle, equals } from 'cerebral/operators'
import { state, props } from 'cerebral/tags'
import setDirty from '../../interpretation/actions/setDirty'
import getClassification from '../../interpretation/computed/getClassification'

function canAddToReport({ state, props, path, resolve }) {
    const { alleleId } = props
    const verificationStatus = state.get(
        `views.workflows.interpretation.state.allele.${alleleId}.analysis.verification`
    )
    const allele = state.get(`views.workflows.interpretation.data.alleles.${alleleId}`)
    const classification = resolve.value(getClassification(allele))
    if (verificationStatus !== 'technical' && classification.hasValidClassification) {
        return path.true()
    }
    return path.false()
}

export default [
    equals(state`views.workflows.selectedComponent`),
    {
        Report: [
            canAddToReport,
            {
                true: [
                    setDirty,
                    toggle(
                        state`views.workflows.interpretation.state.allele.${props`alleleId`}.report.included`
                    )
                ],
                false: [] // no op
            }
        ],
        otherwise: []
    }
]
