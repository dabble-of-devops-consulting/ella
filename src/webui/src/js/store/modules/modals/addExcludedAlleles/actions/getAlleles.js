import processAlleles from '../../../../common/helpers/processAlleles'

export default function({ http, path, state, props }) {
    const { alleleIds } = props
    const analysisId = state.get('modals.addExcludedAlleles.analysisId')
    const genepanelPath = state.get('modals.addExcludedAlleles.genepanelPath')
    const genepanel = state.get(genepanelPath)
    if (!alleleIds.length) {
        return path.success({ result: [] })
    }
    return http
        .get(`alleles/`, {
            q: JSON.stringify({ id: alleleIds }),
            analysis_id: analysisId,
            gp_name: genepanel.name,
            gp_version: genepanel.version
        })
        .then((response) => {
            processAlleles(response.result, genepanel)
            const result = response.result.reduce((obj, allele) => {
                obj[allele.id] = allele
                return obj
            }, {})
            return path.success({ result: result })
        })
        .catch((err) => {
            console.error(err)
            return path.error({ result: err })
        })
}