import { Compute } from 'cerebral'
import { state, props, string } from 'cerebral/tags'
import getAlleleState from './getAlleleState'

export default function(alleleId) {
    return Compute(getAlleleState(alleleId), alleleState => {
        return Boolean(alleleState.alleleassessment.reuse)
    })
}
