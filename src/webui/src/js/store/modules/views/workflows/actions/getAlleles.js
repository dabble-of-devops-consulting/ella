import processAlleles from '../../../../common/helpers/processAlleles'

const TYPES = {
    analysis: 'analyses',
    allele: 'alleles'
}

function getAlleles({ http, path, state }) {
    const genepanel = state.get('views.workflows.data.genepanel')

    // There's two possible scenarios:
    // - No existing interpretations -> use normal allele resource
    //   Can only happen for 'allele' type. If so, we need to use the /allele/ resource to load the allele.
    //   We still get the allele id from the 'fake' interpretation
    // - Existing interpretations -> use workflow's allele resource (it can handle historical data)

    const hasInterpretations = Boolean(state.get('views.workflows.data.interpretations').length)
    let alleleIds = state.get('views.workflows.interpretation.selected.allele_ids')

    let uri = null
    let params = null
    if (hasInterpretations) {
        const type = TYPES[state.get('views.workflows.type')]
        const id = state.get('views.workflows.id')
        const selectedInterpretation = state.get('views.workflows.interpretation.selected')
        const getCurrentData = selectedInterpretation.current || false

        if ('manuallyAddedAlleles' in selectedInterpretation.state) {
            alleleIds = alleleIds.concat(selectedInterpretation.state.manuallyAddedAlleles)
        }

        uri = `workflows/${type}/${id}/interpretations/${selectedInterpretation.id}/alleles/`
        params = {
            allele_ids: alleleIds.join(','),
            current: getCurrentData // Only relevant when interpretation status is 'Done'
        }
    } else {
        uri = `alleles/`
        params = {
            q: JSON.stringify({ id: alleleIds }),
            gp_name: genepanel.name,
            gp_version: genepanel.version
        }
    }
    if (alleleIds.length) {
        return http
            .get(uri, params)
            .then((response) => {
                let alleles = response.result
                processAlleles(alleles, genepanel)

                // Structure as {alleleId: allele}
                let allelesById = {}
                for (let allele of alleles) {
                    allelesById[allele.id] = allele
                }

                return path.success({ result: allelesById })
            })
            .catch((error) => {
                console.error(error)
                return path.error(error)
            })
    } else {
        return path.success({ result: {} })
    }
}

export default getAlleles