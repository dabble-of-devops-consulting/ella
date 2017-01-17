import itertools

from vardb.datamodel import allele, workflow
from api.util.interpretationdataloader import InterpretationDataLoader
from api.config import config


class SnapshotCreator(object):

    EXCLUDED_FLAG = {
        'class1': allele.Allele.CLASS1,
        'intronic': allele.Allele.INTRON,
        'gene': allele.Allele.GENE
    }

    def __init__(self, session):
        self.session = session

    def _create_snapshot_object(
            self,
            interpretation_snapshot_model,
            interpretation_id,
            allele_id,
            annotations,
            custom_annotations,
            presented_alleleassessments,
            presented_allelereports,
            used_alleleassessments=None,
            used_allelereports=None,
            excluded_category=None):

        if not annotations:
            annotations = list()
        if not custom_annotations:
            custom_annotations = list()

        kwargs = {
            'allele_id': allele_id,
            'annotation_id': next((a['annotation_id'] for a in annotations if a['allele_id'] == allele_id), None),
            'customannotation_id': next((a['custom_annotation_id'] for a in custom_annotations if a['allele_id'] == allele_id), None),
            'presented_alleleassessment_id': next((a.id for a in presented_alleleassessments if a.allele_id == allele_id), None),
            'alleleassessment_id': next((a.id for a in used_alleleassessments if a.allele_id == allele_id), None),
            'presented_allelereport_id': next((a.id for a in presented_allelereports if a.allele_id == allele_id), None),
            'allelereport_id': next((a.id for a in used_allelereports if a.allele_id == allele_id), None)
        }

        if interpretation_snapshot_model == 'analysis':
            kwargs['analysisinterpretation_id'] = interpretation_id
            kwargs['filtered'] = SnapshotCreator.EXCLUDED_FLAG.get(excluded_category)
            return workflow.AnalysisInterpretationSnapshot(**kwargs)
        elif interpretation_snapshot_model == 'allele':
            kwargs['alleleinterpretation_id'] = interpretation_id
            return workflow.AlleleInterpretationSnapshot(**kwargs)

    def create_from_data(
            self,
            interpretation_snapshot_model,  # 'allele' or 'analysis'
            interpretation_id,
            annotations,
            presented_alleleassessments,
            presented_allelereports,
            used_alleleassessments=None,
            used_allelereports=None,
            custom_annotations=None):

        if custom_annotations is None:
            custom_annotations = list()

        if used_alleleassessments is None:
            used_alleleassessments = list()

        if used_allelereports is None:
            used_allelereports = list()

        # Get working list of alleles straigt from interpretation to ensure we log all data
        excluded = {}
        if interpretation_snapshot_model == 'analysis':
            analysisinterpretation_obj = self.session.query(workflow.AnalysisInterpretation).filter(
                workflow.AnalysisInterpretation.id == interpretation_id
            ).one()
            analysisinterpretation = InterpretationDataLoader(self.session, config).from_obj(analysisinterpretation_obj)
            excluded = analysisinterpretation['excluded_allele_ids']
            allele_ids = analysisinterpretation['allele_ids'] + \
                         list(itertools.chain(*excluded.values()))

        # 'excluded' is not a concept for alleleinterpretation
        elif interpretation_snapshot_model == 'allele':
            alleleinterpretation = self.session.query(workflow.AlleleInterpretation).filter(
                workflow.AlleleInterpretation.id == interpretation_id
            ).one()
            allele_ids = [alleleinterpretation.allele_id]

        snapshot_objects = list()
        for allele_id in allele_ids:
            excluded_category = next((k for k, v in excluded.iteritems() if allele_id in v), None)
            # Check if allele_id is in any of the excluded categories
            snapshot_object = self._create_snapshot_object(
                interpretation_snapshot_model,
                interpretation_id,
                allele_id,
                annotations,
                custom_annotations,
                presented_alleleassessments,
                presented_allelereports,
                used_alleleassessments=used_alleleassessments,
                used_allelereports=used_allelereports,
                excluded_category=excluded_category
            )
            snapshot_objects.append(snapshot_object)

        return snapshot_objects