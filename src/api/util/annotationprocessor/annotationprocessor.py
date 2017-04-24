# -*- coding: utf-8 -*-

import copy

from api import config


class TranscriptAnnotation(object):
    """
    Calculate extra transcript related fields that depend on dynamic configs.
    """

    def __init__(self, config):
        self.config = config

    def _get_worst_consequence(self, transcripts):
        """
        Finds the transcript with the worst consequence.
        :param transcripts: List of transcripts with data
        :return: List of transcript names with the worst consequence.
        """
        if not self.config.get('transcripts', {}).get('consequences'):
            return list()

        # Get minimum index for each item (since each have several consequences), then sort by that index
        consequences = self.config['transcripts']['consequences']

        def sort_func(x):
            if 'consequences' in x and x['consequences']:
                return min(consequences.index(c) for c in x['consequences'])
            else:
                return 9999999
        sorted_transcripts = sorted(transcripts, key=sort_func)

        worst_consequences = list()
        if sorted_transcripts:
            worst_consequence = sorted_transcripts[0]['consequences']
            for t in sorted_transcripts:
                if any(c in t.get('consequences', []) for c in worst_consequence):
                    worst_consequences.append(t['transcript'])
                else:
                    break

            return worst_consequences

    @staticmethod
    def get_genepanel_transcripts(transcript_names, genepanel):
        """
        Searches input transcripts for matching RefSeq transcript names in the genepanel,
        and returns the list of matches. If no matches are done, returns all RefSeq
        transcripts.

        *The transcript version is stripped off during matching.*

        :param transcript_names: List of transcript names (without version) to search for
        :param genepanel:
        :type genepanel: vardb.datamodel.gene.Genepanel
        :return: list of matching transcript names
        """

        gp_transcripts = list()
        for transcript in genepanel.transcripts:
            gp_transcripts.append(transcript.refseq_name)

        transcript_names_in_genepanel = [t.split('.', 1)[0] for t in gp_transcripts if t.startswith('NM_')]

        filtered_transcript_names = list()
        for transcript_name in transcript_names:
            if transcript_name.split('.', 1)[0] in transcript_names_in_genepanel:
                filtered_transcript_names.append(transcript_name)
        return filtered_transcript_names

    def process(self, annotation, genepanel=None):
        """
        :param annotation
        :param genepanel: If provided, adds filtered_transcript to output,
                          containing the name of the transcripts found in
                          genepanel.
        :type genepanel: vardb.datamodel.gene.Genepanel
        """

        result = dict()
        if 'transcripts' not in annotation:
            return result

        transcripts = annotation['transcripts']
        result['transcripts'] = transcripts

        if genepanel:
            transcript_names = [t['transcript'] for t in transcripts]
            result['filtered_transcripts'] \
                = TranscriptAnnotation.get_genepanel_transcripts(transcript_names, genepanel)

        result['worst_consequence'] = self._get_worst_consequence(transcripts)
        return result


class AnnotationProcessor(object):

    @staticmethod
    def process(annotation, custom_annotation=None, genepanel=None):
        """
        Expands/changes/merges input annotation data.

        :param annotation:
        :param custom_annotation:
        :param genepanel:
        :type genepanel: vardb.datamodel.gene.Genepanel
        :return: Modified annotation data
        """

        data = copy.deepcopy(annotation)
        if 'transcripts' in data:
            data.update(TranscriptAnnotation(config.config).process(annotation, genepanel=genepanel))

        if custom_annotation:
            # Merge/overwrite data with custom_annotation
            for key in config.config['custom_annotation'].keys():
                if key in custom_annotation:
                    if key not in data:
                        data[key] = dict()
                    data[key].update(custom_annotation[key])

            # References are merged specially
            if 'references' in data and 'references' in custom_annotation:
                for ca_ref in custom_annotation['references']:
                    if "source_info" not in ca_ref:
                        ca_ref["source_info"] = dict()

                    # A reference can come from several sources, if so only merge the source
                    assert ca_ref.get('id') or ca_ref.get('pubmed_id'), ca_ref
                    existing_ref = None
                    for r in data['references']:
                        for id in ['id', 'pubmed_id']:
                            if r.get(id) is not None and r.get(id) == ca_ref.get(id):
                                existing_ref = r
                                break

                    if existing_ref is not None:
                        existing_ref['sources'] = existing_ref['sources'] + ca_ref['sources']
                        continue

                    data['references'].append(ca_ref)

        return data
