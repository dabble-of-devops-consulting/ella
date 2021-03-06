import { runAction } from 'cerebral/test'
import toggleReuseAlleleAssessment from './toggleReuseAlleleAssessment'

describe('toggleReuseAlleleAssessment', () => {
    const createState = (resuseFlag = false) => {
        return {
            views: {
                workflows: {
                    interpretation: {
                        data: {
                            alleles: {
                                1: {
                                    id: 1,
                                    allele_assessment: {
                                        dummy: 'Just to have something here',
                                        id: 45
                                    }
                                }
                            }
                        },
                        state: {
                            allele: {
                                1: {
                                    alleleassessment: { reuse: resuseFlag }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    it("changes to 'no reuse' when initially reused", async () => {
        const { state, output } = await runAction(toggleReuseAlleleAssessment, {
            state: createState(true),
            props: { alleleId: 1 }
        })
        expect(state.views.workflows.interpretation.state.allele[1].alleleassessment.reuse).toBe(
            false
        )
        expect(output.copyExistingAlleleAssessmentAlleleIds).toEqual([1])
    })

    it("changes to 'reuse' when initially not reused", async () => {
        const { state, output } = await runAction(toggleReuseAlleleAssessment, {
            state: createState(false),
            props: { alleleId: 1 }
        })
        expect(state.views.workflows.interpretation.state.allele[1].alleleassessment.reuse).toBe(
            true
        )
        expect(state.views.workflows.interpretation.state.allele[1].alleleassessment).toEqual({
            allele_id: 1,
            reuse: true,
            reuseCheckedId: 45
        })

        expect(output.copyExistingAlleleAssessmentAlleleIds).toEqual([])
    })
})
