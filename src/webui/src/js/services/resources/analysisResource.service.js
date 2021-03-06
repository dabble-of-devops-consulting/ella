/* jshint esnext: true */

import { Service, Inject } from '../../ng-decorators'

@Service({
    serviceName: 'AnalysisResource'
})
@Inject('$resource')
class AnalysisResource {
    constructor(resource) {
        this.base = '/api/v1'
        this.resource = resource
    }

    get(q, per_page, page) {
        return new Promise((resolve, reject) => {
            let args = []
            if (q) {
                args.push(`q=${encodeURIComponent(JSON.stringify(q))}`)
            }
            if (per_page) {
                args.push(`per_page=${per_page}`)
            }
            if (page) {
                args.push(`page=${page}`)
            }

            if (!args.length) {
                var AnalysisRS = this.resource(`${this.base}/analyses/`)
            } else {
                var AnalysisRS = this.resource(`${this.base}/analyses/?${args.join('&')}`)
            }
            var analyses = AnalysisRS.query(() => {
                resolve(analyses)
            })
        })
    }

    getAnalysis(id) {
        return new Promise((resolve, reject) => {
            var AnalysisRS = this.resource(`${this.base}/analyses/${id}/`)
            var analysis = AnalysisRS.get(() => {
                resolve(analysis)
            })
        })
    }
}

export default AnalysisResource
