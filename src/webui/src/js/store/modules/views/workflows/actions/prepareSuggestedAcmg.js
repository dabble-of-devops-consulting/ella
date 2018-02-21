import { ACMGHelper } from '../../../../../model/acmghelper'

export default function prepareSuggestedAcmg({ state }) {
    const alleles = state.get(`views.workflows.data.alleles`)

    for (let [alleleId, allele] of Object.entries(alleles)) {
        const suggestedAcmg = []
        if (allele.acmg) {
            for (let code of allele.acmg.codes) {
                suggestedAcmg.push({
                    code: code.code,
                    source: code.source,
                    op: code.op || null,
                    match: code.match || null
                })
            }
        }
        state.set(
            `views.workflows.interpretation.selected.state.allele.${alleleId}.` +
                `alleleassessment.evaluation.acmg.suggested`,
            suggestedAcmg
        )
    }
}
