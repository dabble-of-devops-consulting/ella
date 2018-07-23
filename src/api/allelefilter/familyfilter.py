from math import log10
from sqlalchemy import or_, and_, text, func, literal
from sqlalchemy.orm import aliased

from vardb.datamodel import sample, genotype, allele, annotationshadow

MUTATION_PRIOR = 1e-8
DEFAULT_FREQ = 0.1

PAR1_START = 60001
PAR1_END = 2699520
PAR2_START = 154931044
PAR2_END = 155260560


def debug_print_allele_ids(session, allele_ids):

    transcript_info = session.query(
        annotationshadow.AnnotationShadowTranscript.allele_id,
        func.string_agg(
            annotationshadow.AnnotationShadowTranscript.transcript,
            ','
        ).label('transcript'),
        func.string_agg(
            annotationshadow.AnnotationShadowTranscript.hgvsc,
            ','
        ).label('hgvsc')
    ).filter(
        annotationshadow.AnnotationShadowTranscript.allele_id.in_(allele_ids),
        annotationshadow.AnnotationShadowTranscript.transcript.like('NM_%')
    ).group_by(
        annotationshadow.AnnotationShadowTranscript.allele_id
    )

    transcript_info = transcript_info.subquery()

    allele_info = self.session.query(
        allele.Allele.id,
        allele.Allele.chromosome,
        allele.Allele.vcf_pos,
        #allele.Allele.vcf_ref,
        #allele.Allele.vcf_alt,
        #transcript_info.c.transcript,
        transcript_info.c.hgvsc
    ).join(
        transcript_info,
        transcript_info.c.allele_id == allele.Allele.id
    ).filter(
        allele.Allele.id.in_(allele_ids)
    ).order_by(
        allele.Allele.chromosome,
        allele.Allele.vcf_pos,
        allele.Allele.vcf_ref,
        allele.Allele.vcf_alt
    )

    for item in allele_info.all():
        print '{}\t{}\t{}\t{}'.format(*item)



def denovo_probability(PLm, PLf, PLc, is_x_minus_par, proband_male, denovo_mode):
    """
    Compute a posteriori denovo probability given phred scaled genotype likelihoods for genotypes [0/0, 1/0, 1/1]
    Denovo mode is a three-tuple of the called genotypes for father, mother and proband respectively,
    as indexes of the above genotypes. Examples:
     - denovo_mode=[0,0,1] -> Compute probability of proband being heterozygous given both parents called homozygous reference
     - denovo_mode=[0,1,2] -> Compute probability of proband being homozygous given over parent called as heterozygous, and one as homozygous reference

    Based on denovo probability computation from FILTUS (see supporting material):
    https://academic.oup.com/bioinformatics/article/32/10/1592/1743466
    """

    # A priori probability of mutation
    def priors(is_x_minus_par):
        logfr = [log10(1-DEFAULT_FREQ), log10(DEFAULT_FREQ)]
        log_hardy_weinberg = [2*logfr[0], log10(2)+logfr[0]+logfr[1], 2*logfr[1]]
        if is_x_minus_par:
            return log_hardy_weinberg, logfr
        else:
            return log_hardy_weinberg, log_hardy_weinberg

    # Probability of child getting alleles from mother/father given genotypes
    def _single_transmit(parent, child):
        if child in parent and parent[0] == parent[1]:
            # Probability of getting an allele from homozygous parent
            return 1-MUTATION_PRIOR
        elif child in parent:
            # Probability of getting an allele from heterozygous parent
            return 0.5
        else:
            # Probability of a denovo mutation
            return MUTATION_PRIOR

    class TrioTransmit(object):
        def __init__(self, is_x_minus_par, proband_male):
            self.is_x_minus_par = is_x_minus_par
            self.proband_male = proband_male

            if self.is_x_minus_par and self.proband_male:
                # No transmission from father to boy on X (minus PAR) chromosome
                self.transmit_father = None
            elif self.is_x_minus_par and not self.proband_male:
                # Since father only has one copy to inherit from, chance of inheriting is either very high (father has allele)
                # or very low (father does not have allele)
                self.transmit_father = lambda f,c: 1-MUTATION_PRIOR if f == c else MUTATION_PRIOR
            else:
                self.transmit_father = _single_transmit

            self.transmit_mother = _single_transmit

        def __call__(self, father, mother, child):
            if self.is_x_minus_par and self.proband_male:
                # No transmission from father to boy on X (minus PAR) chromosome
                return self.transmit_mother(mother, child[0])
            elif (child[0] == child[1]):
                # Child is homozygous, probability of inheriting from both mother and father
                return self.transmit_father(father, child[0])*self.transmit_mother(mother, child[0])
            else:
                # Child is heterozygous, probability of inheriting from mother + probability of inheriting from father
                return self.transmit_father(father, child[0])*self.transmit_mother(mother, child[1]) + self.transmit_father(father, child[0])*self.transmit_mother(mother, child[1])


    class LogTransmissionMatrix(object):
        def __init__(self, is_x_minus_par, proband_male):
            gt = [(0,0), (0,1), (1,1)]
            gtx = [(0,),(1,)]

            if is_x_minus_par and proband_male:
                self.child_gt = gtx
                self.father_gt = gtx
            elif is_x_minus_par and not proband_male:
                self.father_gt = gtx
                self.child_gt = gt
            else:
                self.father_gt = gt
                self.child_gt = gt
            self.mother_gt = gt
            self.trio_transmit = TrioTransmit(is_x_minus_par, proband_male)

        def __call__(self, f, m, c):
            return log10(self.trio_transmit(self.father_gt[f], self.mother_gt[m], self.child_gt[c]))

    # Remove PL for genotype 0/1 if X chromosome for father and proband if proband is male
    if is_x_minus_par:
        PLf = [PLf[0], PLf[2]]
        if proband_male:
            PLc = [PLc[0], PLc[2]]

    mo_prior, fa_prior = priors(is_x_minus_par)
    log_transmission_matrix = LogTransmissionMatrix(is_x_minus_par, proband_male)

    # Compute relative likelihoods of all genotype combinations, using the phred scaled genotype likelihoods
    sum_liks = 0
    for fi, _PLf in enumerate(PLf):
        for mi, _PLm in enumerate(PLm):
            for ci, _PLc in enumerate(PLc):
                l = fa_prior[fi] + mo_prior[mi] + log_transmission_matrix(fi, mi, ci) - (_PLf + _PLm + _PLc)/10
                sum_liks += pow(10, l)

    # Compute likelihood of the given denovo mode
    f,m,c = denovo_mode
    l = pow(10, fa_prior[f] + mo_prior[m] + log_transmission_matrix(f, m, c) - (PLf[f] + PLm[m] + PLc[c])/10)

    # Normalize likelihood to probability
    return l/sum_liks



class FamilyFilter(object):

    def __init__(self, session, config):
        self.session = session
        self.config = config

    def get_genotype_with_allele(self, genotype_table):
        genotype_with_allele = self.session.query(
            allele.Allele.chromosome.label('chromosome'),
            allele.Allele.start_position.label('start_position'),
            allele.Allele.open_end_position.label('open_end_position'),
            allele.Allele.genome_reference.label('genome_reference'),
            *[c for c in genotype_table.c]
        ).join(
            genotype_table,
            genotype_table.c.allele_id == allele.Allele.id
        )
        return genotype_with_allele

    def get_x_minus_par_filter(self, genotype_with_allele_table):
        """
        PAR1 X:60001-2699520 (GRCh37)
        PAR2 X:154931044-155260560 (GRCh37)
        """

        # Only GRCh37 is supported for now
        assert not self.session.query(genotype_with_allele_table.c.allele_id).filter(
            genotype_with_allele_table.c.genome_reference != 'GRCh37'
        ).first()

        x_minus_par_filter = and_(
            genotype_with_allele_table.c.chromosome == 'X',
            # Allele table has 0-indexed positions
            or_(
                # Before PAR1
                genotype_with_allele_table.c.open_end_position <= PAR1_START,
                # Between PAR1 and PAR2
                and_(
                    genotype_with_allele_table.c.start_position > PAR1_END,
                    genotype_with_allele_table.c.open_end_position <= PAR2_START,
                ),
                # After PAR2
                genotype_with_allele_table.c.start_position > PAR2_END
            )
        )

        return x_minus_par_filter

    def denovo(self, genotype_table, proband_sample, father_sample, mother_sample):
        """
        Denovo mutations

        Based on denovo filtering from FILTUS:
        https://academic.oup.com/bioinformatics/article/32/10/1592/1743466

        Denovo patterns:
        Autosomal:
            - 0/0 + 0/0 = 0/1
            - 0/0 + 0/0 = 1/1
            - 0/0 + 0/1 = 1/1
            - 0/1 + 0/0 = 1/1
        X-linked, child is boy:
            - 0 + 0/0 = 1
        X-linked, child is girl:
            - 0 + 0/0 = 0/1
            - 0 + 0/0 = 1/1
            - 0 + 0/1 = 1/1

        A variant is treated as X-linked in this context only if it is located outside of the pseudoautosomal regions
        PAR1 and PAR2 on the X chromosome. Multiallelic generalizations of the above patterns are also caught.

        However, combinations with any of the following properties are treated as benign and discarded from further
        analyses:
        - The de novo allele is 0 (= REF). Example: 1/1 + 1/1 = 0/1.
        - Child genotype equals either of the parents. Example: 0/0 + 1/1 = 1/1.
        - Missing genotype in any trio member.
        - A male trio member is reported as heterozygous for an X-linked variant.

        """

        genotype_table = genotype_table.subquery('genotype_table')
        genotype_with_allele_table = self.get_genotype_with_allele(genotype_table)
        genotype_with_allele_table = genotype_with_allele_table.subquery('genotype_with_allele_table')
        x_minus_par_filter = self.get_x_minus_par_filter(genotype_with_allele_table)

        denovo_allele_ids = self.session.query(
            genotype_with_allele_table.c.allele_id
        ).filter(
            # Exclude no coverage
            getattr(genotype_with_allele_table.c, father_sample + '_type') != 'No coverage',
            getattr(genotype_with_allele_table.c, mother_sample + '_type') != 'No coverage',
            or_(
                # Autosomal
                and_(
                    ~x_minus_par_filter,
                    or_(
                        # 0/0 + 0/0 = 0/1
                        # 0/0 + 0/0 = 1/1
                        and_(
                            or_(
                                getattr(genotype_with_allele_table.c, proband_sample + '_type') == 'Homozygous',
                                getattr(genotype_with_allele_table.c, proband_sample + '_type') == 'Heterozygous',
                            ),
                            getattr(genotype_with_allele_table.c, father_sample + '_type') == 'Reference',
                            getattr(genotype_with_allele_table.c, mother_sample + '_type') == 'Reference'
                        ),
                        # 0/0 + 0/1 = 1/1
                        # 0/1 + 0/0 = 1/1
                        and_(
                            getattr(genotype_with_allele_table.c, proband_sample + '_type') == 'Homozygous',
                            or_(
                                and_(
                                    getattr(genotype_with_allele_table.c, father_sample + '_type') == 'Heterozygous',
                                    getattr(genotype_with_allele_table.c, mother_sample + '_type') == 'Reference',
                                ),
                                and_(
                                    getattr(genotype_with_allele_table.c, father_sample + '_type') == 'Reference',
                                    getattr(genotype_with_allele_table.c, mother_sample + '_type') == 'Heterozygous',
                                )
                            )
                        )
                    )
                ),
                # X-linked
                and_(
                    x_minus_par_filter,
                    or_(
                        # Male proband
                        and_(
                            # 0 + 0/0 = 1
                            getattr(genotype_with_allele_table.c, proband_sample + '_sex') == 'Male',
                            or_(
                                getattr(genotype_with_allele_table.c, proband_sample + '_type') == 'Homozygous',
                            ),
                            getattr(genotype_with_allele_table.c, father_sample + '_type') == 'Reference',
                            getattr(genotype_with_allele_table.c, mother_sample + '_type') == 'Reference'
                        ),
                        # Female proband
                        and_(
                            getattr(genotype_with_allele_table.c, proband_sample + '_sex') == 'Female',
                            getattr(genotype_with_allele_table.c, father_sample + '_type') == 'Reference',
                            or_(
                                # 0 + 0/0 = 0/1
                                # 0 + 0/0 = 1/1
                                and_(
                                    or_(
                                        getattr(genotype_with_allele_table.c, proband_sample + '_type') == 'Homozygous',
                                        getattr(genotype_with_allele_table.c, proband_sample + '_type') == 'Heterozygous'
                                    ),
                                    getattr(genotype_with_allele_table.c, mother_sample + '_type') == 'Reference'
                                ),
                                # 0 + 0/1 = 1/1
                                and_(
                                    getattr(genotype_with_allele_table.c, proband_sample + '_type') == 'Homozygous',
                                    getattr(genotype_with_allele_table.c, mother_sample + '_type') == 'Heterozygous'
                                )
                            )
                        ),
                    )
                ),
            )
        )

        return set([a[0] for a in denovo_allele_ids.all()])


    def autosomal_recessive_homozygous(self, genotype_table, proband_sample, father_sample, mother_sample):
        """
        X-linked recessive:
        A variant must be:
        - Homozygous in proband (for girls this requires a denovo, but still valid case)
        - Heterozygous in mother
        - Not present in father
        - Homozygous in affected siblings
        - Not homozygous in unaffected siblings
        - In chromosome X, but not pseudoautosomal region (PAR1, PAR2)
        """
        genotype_table = genotype_table.subquery('genotype_table')

        genotype_with_allele_table = self.get_genotype_with_allele(genotype_table)
        genotype_with_allele_table = genotype_with_allele_table.subquery('genotype_with_allele_table')
        x_minus_par_filter = self.get_x_minus_par_filter(genotype_with_allele_table)

        autosomal_allele_ids = self.session.query(
            genotype_with_allele_table.c.allele_id
        ).filter(
            getattr(genotype_with_allele_table.c, proband_sample + '_type') == 'Homozygous',
            getattr(genotype_with_allele_table.c, father_sample + '_type') == 'Heterozygous',
            getattr(genotype_with_allele_table.c, mother_sample + '_type') == 'Heterozygous',
            ~x_minus_par_filter  # In chromosome 1-22 or in X PAR
        )

        return set([a[0] for a in autosomal_allele_ids])

    def xlinked_recessive_homozygous(self, genotype_table, proband_sample, father_sample, mother_sample):
        """
        Autosomal recessive transmission

        Autosomal recessive:
        A variant must be:
        - Homozygous in proband
        - Heterozygous in both parents
        - Not homozygous in unaffected siblings
        - Homozygous in affected siblings
        - In chromosome 1-22 or X pseudoautosomal region (PAR1, PAR2)
        """

        genotype_table = genotype_table.subquery('genotype_table')

        genotype_with_allele_table = self.get_genotype_with_allele(genotype_table)
        genotype_with_allele_table = genotype_with_allele_table.subquery('genotype_with_allele_table')
        x_minus_par_filter = self.get_x_minus_par_filter(genotype_with_allele_table)

        xlinked_allele_ids = self.session.query(
            genotype_with_allele_table.c.allele_id
        ).filter(
            getattr(genotype_with_allele_table.c, proband_sample + '_type') == 'Homozygous',
            getattr(genotype_with_allele_table.c, father_sample + '_type') == 'Reference',
            getattr(genotype_with_allele_table.c, mother_sample + '_type') == 'Heterozygous',
            x_minus_par_filter  # In X chromosome (minus PAR)
        )

        return set([a[0] for a in xlinked_allele_ids])

    def recessive_compound_heterozygous(self, genotype_table, proband_sample, father_sample, mother_sample):
        """
        Autosomal recessive transmission: Compound heterozygous

        Based on rule set from:
        Filtering for compound heterozygous sequence variant in non-consanguineous pedigrees.
        (Kamphans T et al. (2013), PLoS ONE: 8(8), e70151)

        1. A variant has to be in a heterozygous state in all affected individuals.

        2. A variant must not occur in a homozygous state in any of the unaffected
        individuals.

        3. A variant that is heterozygous in an affected child must be heterozygous
        in exactly one of the parents.

        4. A gene must have two or more heterozygous variants in each of the
        affected individuals.

        5. There must be at least one variant transmitted from the paternal side
        and one transmitted from the maternal side.

        For the second part of the third rule - "in exactly one of the parents" - note
        this excerpt from article:
        "Rule 3b is applicable only if we assume that no de novo mutations occurred.
        The number of de novo mutations is estimated to be below five per exome per generation [2], [3],
        thus, the likelihood that an individual is compound heterozygous and at least one
        of these mutations arose de novo is low.
        If more than one family member is affected, de novo mutations are even orders
        of magnitudes less likely as a recessive disease cause.
        On the other hand, excluding these variants from the further analysis helps to
        remove many sequencing artifacts. In linkage analysis for example it is common practice
        of data cleaning to exclude variants as Mendelian errors if they cannot be explained
        by Mendelian inheritance."

        :note: Alleles with 'No coverage' in either parent are not included.
        """

        genotype_table = genotype_table.subquery('genotype_table')

        # Get candidates for compound heterozygosity. Covers the following rules:
        # 1. A variant has to be in a heterozygous state in all affected individuals.
        # 2. A variant must not occur in a homozygous state in any of the unaffected individuals.
        # 3. A variant that is heterozygous in an affected child must be heterozygous in exactly one of the parents.

        compound_candidates = self.session.query(
            genotype_table.c.allele_id,
            getattr(genotype_table.c, proband_sample + '_type'),
            getattr(genotype_table.c, father_sample + '_type'),
            getattr(genotype_table.c, mother_sample + '_type'),
        ).filter(
            getattr(genotype_table.c, proband_sample + '_type') == 'Heterozygous',  # Heterozygous in affected
            # TODO: Unaffected
            getattr(genotype_table.c, father_sample + '_type') != 'Homozygous',  # Not homozygous in father
            getattr(genotype_table.c, mother_sample + '_type') != 'Homozygous',  # Not homozygous in mother
            # Heterozygous in _exactly one_ parent.
            # Note: This will also exclude any alleles with 'No coverage' in either parent.
            or_(
                and_(
                    getattr(genotype_table.c, father_sample + '_type') == 'Heterozygous',
                    getattr(genotype_table.c, mother_sample + '_type') == 'Reference',
                ),
                and_(
                    getattr(genotype_table.c, father_sample + '_type') == 'Reference',
                    getattr(genotype_table.c, mother_sample + '_type') == 'Heterozygous',
                )
            )
        )
        compound_candidates = compound_candidates.subquery('compound_candidates')


        # Group per gene and get the gene symbols with >= 2 candidates.
        #
        # Covers the following rules:
        # 4. A gene must have two or more heterozygous variants in each of the affected individuals.
        # 5. There must be at least one variant transmitted from the paternal side
        #    and one transmitted from the maternal side.
        #
        # Note: We use symbols instead of HGNC id since some symbols have no id in the annotation data
        # One allele can be in several genes, and the gene symbol set is more extensive than only
        # the symbols having HGNC ids so it should be safer to user.
        #
        # candidates_with_genes example:
        # ----------------------------------------------------------------------
        # | allele_id | Proband_type | Father_type  | Mother_type   | symbol   |
        # ----------------------------------------------------------------------
        # | 6006      | Heterozygous | Heterozygous | Reference     | KIAA0586 |
        # | 6005      | Heterozygous | Reference    | Heterozygous  | KIAA0586 |
        # | 6004      | Heterozygous | Reference    | Heterozygous  | KIAA0586 |
        # | 5528      | Heterozygous | Heterozygous | Reference     | TUBA1A   |
        # | 5529      | Heterozygous | Heterozygous | Reference     | TUBA1A   |
        #
        # In the above example, 6004, 6005 and 6006 satisfy the rules.

        inclusion_regex = self.config['transcripts']['inclusion_regex']
        candidates_with_genes = self.session.query(
            compound_candidates.c.allele_id,
            getattr(compound_candidates.c, proband_sample + '_type'),
            getattr(compound_candidates.c, father_sample + '_type'),
            getattr(compound_candidates.c, mother_sample + '_type'),
            annotationshadow.AnnotationShadowTranscript.symbol
        ).join(
            annotationshadow.AnnotationShadowTranscript,
            compound_candidates.c.allele_id == annotationshadow.AnnotationShadowTranscript.allele_id
        ).filter(
            text("annotationshadowtranscript.transcript ~ :reg").params(reg=inclusion_regex),
        ).distinct()

        candidates_with_genes = candidates_with_genes.subquery('candidates_with_genes')

        compound_heterozygous_symbols = self.session.query(
            candidates_with_genes.c.symbol
        ).group_by(
            candidates_with_genes.c.symbol
        ).having(
            and_(
                # 2 or more alleles in this gene
                func.count(candidates_with_genes.c.allele_id) > 1,
                # bool_or: at least one allele in this gene is 'Heterozygous'
                func.bool_or(getattr(candidates_with_genes.c, mother_sample + '_type') == 'Heterozygous'),
                func.bool_or(getattr(candidates_with_genes.c, father_sample + '_type') == 'Heterozygous')
            )
        )

        compound_heterozygous_allele_ids = self.session.query(
            candidates_with_genes.c.allele_id,
        ).filter(
            candidates_with_genes.c.symbol.in_(compound_heterozygous_symbols)
        ).distinct()

        return set([a[0] for a in compound_heterozygous_allele_ids.all()])

    def check_filter_conditions(self, analysis_id):
        """
        The inheritance filter currently expects a normal family
        analysis, with two unaffected parents, one affected proband
        and any number of affected or unaffected siblings.

        If these conditions are not met, the filter will produce wrong
        results and should therefore not be used.
        """

        proband_sample = None
        father_sample = None
        mother_sample = None

        # TODO: Handle multiple probands
        proband_sample = self.session.query(sample.Sample).filter(
            sample.Sample.proband.is_(True),
            sample.Sample.affected.is_(True),
            ~sample.Sample.father_id.is_(None),
            ~sample.Sample.mother_id.is_(None),
            sample.Sample.analysis_id == analysis_id
        ).one_or_none()

        if proband_sample is not None:
            father_sample = self.session.query(sample.Sample).filter(
                sample.Sample.id == proband_sample.father_id,
                sample.Sample.affected.is_(False)
            ).one_or_none()

            mother_sample = self.session.query(sample.Sample).filter(
                sample.Sample.id == proband_sample.mother_id,
                sample.Sample.affected.is_(False)
            ).one_or_none()

        return all([proband_sample, father_sample, mother_sample])

    def get_genotype_query(self, allele_ids, analysis_id):
        """
        Creates a combined genotype table (query)
        which looks like the following:

        -------------------------------------------------------------------------------------
        | allele_id | sample_1_type  | sample_1_sex | sample_2_type  | sample_2_sex | ...
        -------------------------------------------------------------------------------------
        | 55        | 'Heterozygous' | 'Male'       | 'Heterozygous' | 'Female'     | ...
        | 71        | 'Homozygous'   | 'Male'       | 'Heterozygous' | 'Female'     | ...
        | 82        | 'Heterozygous' | 'Male'       | 'Heterozygous' | 'Female'     | ...
        | 91        | 'Heterozygous' | 'Male'       | 'Heterozygous' | 'Female'     | ...
        ...

        The data is created by combining the genotype and genotypesampledata tables,
        for all samples connected to provided analysis_id.
        :note: allele_id and secondallele_id are union'ed together into one table.

        """


        def create_query(secondallele=False):

            samples = self.session.query(sample.Sample).filter(
                sample.Sample.analysis_id == analysis_id
            ).all()

            # We'll join several times on same table, so create aliases for each sample
            aliased_genotypesampledata = dict()
            sample_fields = list()
            for s in samples:
                aliased_genotypesampledata[s.id] = aliased(genotype.GenotypeSampleData)
                sample_fields.extend([
                    aliased_genotypesampledata[s.id].id.label(s.identifier + '_id'),
                    aliased_genotypesampledata[s.id].type.label(s.identifier + '_type'),
                    literal(s.sex).label(s.identifier + '_sex'),
                    aliased_genotypesampledata[s.id].genotype_likelihood.label(s.identifier + '_gl'),
                ])

            if secondallele:
                allele_id_field = genotype.Genotype.secondallele_id
            else:
                allele_id_field = genotype.Genotype.allele_id

            genotype_query = self.session.query(
                allele_id_field.label('allele_id'),
                *sample_fields
            ).filter(
                allele_id_field.in_(allele_ids),
            )

            for sample_id, gsd in aliased_genotypesampledata.iteritems():
                genotype_query = genotype_query.join(
                    gsd,
                    and_(
                        genotype.Genotype.id == gsd.genotype_id,
                        gsd.secondallele.is_(secondallele),
                        gsd.sample_id == sample_id
                    )
                )

            return genotype_query

        # Combine allele_id and secondallele_id into one large table
        without_secondallele = create_query(False)
        with_secondallele = create_query(True)

        genotype_query = without_secondallele.union(with_secondallele).subquery()
        genotype_query = self.session.query(genotype_query)

        assert genotype_query.count() == len(allele_ids)
        return genotype_query

    def get_proband_sample_identifier(self, analysis_id):
        proband_sample = self.session.query(sample.Sample).filter(
            sample.Sample.proband.is_(True),
            sample.Sample.analysis_id == analysis_id
        ).one()

        return proband_sample.identifier

    def get_father_sample_identifier(self, analysis_id):
        proband_sample = self.session.query(sample.Sample).filter(
            sample.Sample.proband.is_(True),
            sample.Sample.analysis_id == analysis_id
        ).one()

        father_sample = self.session.query(sample.Sample).filter(
            sample.Sample.id == proband_sample.father_id
        ).one()

        return father_sample.identifier

    def get_mother_sample_identifier(self, analysis_id):
        proband_sample = self.session.query(sample.Sample).filter(
            sample.Sample.proband.is_(True),
            sample.Sample.analysis_id == analysis_id
        ).one()

        mother_sample = self.session.query(sample.Sample).filter(
            sample.Sample.id == proband_sample.mother_id
        ).one()

        return mother_sample.identifier

    def filter_alleles(self, analysis_allele_ids):
        """
        """

        # Combine variants from all probands!
        # Perform more advanced family/sibling check, supporting several proband samples

        result = dict()
        for analysis_id, allele_ids in analysis_allele_ids.iteritems():

            if not self.check_filter_conditions(analysis_id):
                result[analysis_id] = set()
                continue

            genotype_query = self.get_genotype_query(allele_ids, analysis_id)

            proband_identifier = self.get_proband_sample_identifier(analysis_id)
            father_identifier = self.get_father_sample_identifier(analysis_id)
            mother_identifier = self.get_mother_sample_identifier(analysis_id)

            denovo_results = self.denovo(
                genotype_query,
                proband_identifier,
                father_identifier,
                mother_identifier
            )

            recessive_compound_results = self.recessive_compound_heterozygous(
                genotype_query,
                proband_identifier,
                father_identifier,
                mother_identifier
            )

            autosomal_recessive_results = self.autosomal_recessive_homozygous(
                genotype_query,
                proband_identifier,
                father_identifier,
                mother_identifier
            )

            xlinked_recessive_results = self.xlinked_recessive_homozygous(
                genotype_query,
                proband_identifier,
                father_identifier,
                mother_identifier
            )

            result[analysis_id] = allele_ids - (denovo_results | autosomal_recessive_results | xlinked_recessive_results | recessive_compound_results)

        return result

    def denovo_p_value(self, genotype_table, proband_sample, father_sample, mother_sample):
        denovo_allele_ids = self.denovo(genotype_table, proband_sample, father_sample, mother_sample)
        genotype_table = genotype_table.subquery('genotype_table')
        genotype_with_allele_table = self.get_genotype_with_allele(genotype_table)
        genotype_with_allele_table = genotype_with_allele_table.subquery()
        x_minus_par_filter = self.get_x_minus_par_filter(genotype_with_allele_table)

        denovo_mode_map = {
            "Xmale": {
                'Reference': 0,
                'Homozygous': 1
                },
            "default": {
                'Reference': 0,
                'Heterozygous': 1,
                'Homozygous': 2
            }
        }

        def _compute_denovo_probabilities(genotype_with_allele_table, x_minus_par=False):
            dp = dict()
            for row in genotype_with_allele_table:
                if not all([row.Father_gl, row.Mother_gl, row.Father_gl]):
                    dp[row.allele_id] = '-'
                    continue

                if x_minus_par and row.Proband_sex == 'Male':
                    denovo_mode = [
                        denovo_mode_map['Xmale'][row.Father_type],
                        denovo_mode_map['Xmale'][row.Mother_type],
                        denovo_mode_map['Xmale'][row.Proband_type],
                    ]
                else:
                    denovo_mode = [
                        denovo_mode_map['default'][row.Father_type],
                        denovo_mode_map['default'][row.Mother_type],
                        denovo_mode_map['default'][row.Proband_type],
                    ]

                # It should not come up as a denovo candidate if either mother or father has the same called genotype
                assert denovo_mode.count(denovo_mode[2]) == 1

                p = denovo_probability(
                    row.Mother_gl,
                    row.Father_gl,
                    row.Proband_gl,
                    x_minus_par,
                    row.Proband_sex == 'Male',
                    denovo_mode
                )
                dp[row.allele_id] = p
            return dp

        genotype_with_denovo_allele_table = session.query(
            *genotype_with_allele_table.c
        ).filter(
            genotype_with_allele_table.c.allele_id.in_(denovo_allele_ids)
        )

        # Compute denovo probabilities for autosomal and x-linked regions separately
        denovo_probabilities = dict()
        denovo_probabilities.update(_compute_denovo_probabilities(genotype_with_denovo_allele_table.filter(~x_minus_par_filter), False))
        denovo_probabilities.update(_compute_denovo_probabilities(genotype_with_denovo_allele_table.filter(x_minus_par_filter), True))

        return denovo_probabilities
