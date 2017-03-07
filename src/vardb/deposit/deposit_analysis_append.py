#!/usr/bin/env python
"""
Code for loading the contents of VCF files into the vardb database.

Use one transaction for whole file, and prompts user before committing.
Adds annotation if supplied annotation is different than what is already in db.
Can use specific annotation parsers to split e.g. allele specific annotation.
"""

import sys
import argparse
import json
import logging
from collections import OrderedDict

from sqlalchemy import and_
import sqlalchemy.orm.exc

import vardb.datamodel
from vardb.datamodel import gene
from vardb.util import vcfiterator
from vardb.deposit.importers import AnalysisImporter, AnnotationImporter, SampleImporter, \
                                    GenotypeImporter, AlleleImporter, AnalysisInterpretationImporter, \
                                    inDBInfoProcessor, SpliceInfoProcessor, HGMDInfoProcessor, \
                                    SplitToDictInfoProcessor

from deposit_from_vcf import DepositFromVCF

log = logging.getLogger(__name__)


class DepositAnalysisAppend(DepositFromVCF):
    def process_records(self, records, db_analysis, vcf_sample_names, db_samples):
        for k,v in records.iteritems():
            # Import alleles
            db_alleles = []
            for record in v:
                new_db_alleles = self.allele_importer.process(record)

                # Import annotation
                self.annotation_importer.process(record, new_db_alleles)

                db_alleles += new_db_alleles


            # Compute and import genotypes
            for sample_name, db_sample in zip(vcf_sample_names, db_samples):
                self.genotype_importer.process(v, sample_name, db_analysis, db_sample, db_alleles)

    def import_vcf(self, path, sample_configs=None, analysis_config=None, assess_class=None, cache_size=1000):

        vi = vcfiterator.VcfIterator(path)
        vi.addInfoProcessor(inDBInfoProcessor(vi.getMeta()))
        vi.addInfoProcessor(SpliceInfoProcessor(vi.getMeta()))
        vi.addInfoProcessor(HGMDInfoProcessor(vi.getMeta()))
        vi.addInfoProcessor(SplitToDictInfoProcessor(vi.getMeta()))

        vcf_sample_names = vi.samples
        self.check_samples(vcf_sample_names, sample_configs)

        # if not db_samples or len(db_samples) != len(vcf_sample_names):
        #     raise RuntimeError("Couldn't import samples to database.")

        db_genepanel = self.get_genepanel(analysis_config)

        db_analysis = self.analysis_importer.get(
            analysis_config=analysis_config,
            genepanel=db_genepanel
        )

        # Only import sample/analysis if not importing assessments
        db_samples = self.sample_importer.get(vcf_sample_names, db_analysis)

        self.analysis_interpretation_importer.process(db_analysis)
        records_cache = OrderedDict()
        N = 0
        for record in vi.iter():
            self.counter['nVariantsInFile'] += 1
            N += 1
            key = (record["CHROM"], record["POS"])
            if key not in records_cache: records_cache[key] = []

            assert len(record["ALT"]) == 1, "We only support decomposed variants. That is, only one ALT per line/record."

            if N < cache_size:
                records_cache[key].append(record)
                continue
            elif key in records_cache:
                # Make sure all variants at same position is in same cache
                records_cache[key].append(record)
                continue
            else:
                self.process_records(records_cache, db_analysis, vcf_sample_names, db_samples)

                records_cache.clear()
                records_cache[key].append(record)# self.annotation_importer.process(record, db_alleles)
                N = 1

        self.process_records(records_cache, db_analysis, vcf_sample_names, db_samples)