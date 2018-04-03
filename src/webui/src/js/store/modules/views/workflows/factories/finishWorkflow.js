import { prepareInterpretationPayload } from '../../../../common/helpers/workflow'

const TYPES = {
    analysis: 'analyses',
    allele: 'alleles'
}

export default function(finishType) {
    return function finishWorkflow({ state, http, path }) {
        const type = state.get('views.workflows.type')
        const postType = TYPES[type]
        const id = state.get('views.workflows.id')
        const interpretation = state.get('views.workflows.interpretation.selected')
        const alleles = state.get('views.workflows.data.alleles')
        const references = state.get('views.workflows.data.references')

        if (!['markreview', 'finalize'].find((e) => e === finishType)) {
            console.error(`'Invalid finishType ${finishType}`)
            return path.error()
        }

        if (interpretation.status !== 'Ongoing') {
            console.error('Trying to mark review when interpretation status is not Ongoing')
            return path.error()
        }

        const payload = prepareInterpretationPayload(
            type,
            id,
            interpretation,
            alleles,
            Object.values(references)
        )

        return http
            .post(`workflows/${postType}/${id}/actions/${finishType}/`, payload)
            .then((response) => {
                return path.success(response)
            })
            .catch((response) => {
                return path.error(response)
            })
    }
}
