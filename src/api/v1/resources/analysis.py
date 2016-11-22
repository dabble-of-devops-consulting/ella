import itertools

from sqlalchemy import desc, not_

from vardb.datamodel import user, assessment, sample, genotype, allele, annotation, gene

from api import schemas, ApiError
from api.util.util import paginate, rest_filter, request_json
from api.util.assessmentcreator import AssessmentCreator
from api.util.allelereportcreator import AlleleReportCreator
from api.util.alleledataloader import AlleleDataLoader
from api.util.interpretationdataloader import InterpretationDataLoader
from api.v1.resource import Resource
from api.config import config


def get_current_interpretation(analysis):
    """
    Goes through the interpretations and selects the
    current one, if any. A current interpretation is
    defined as a interpretation that has yet to be started,
    or is currently in progress.
    """

    ongoing_statuses = ['Not started', 'Ongoing']
    current = list()
    for interpretation in analysis['interpretations']:
        if interpretation['status'] in ongoing_statuses:
            current.append(interpretation['id'])
    assert len(current) < 2
    return current[0] if current else None


class AnalysisListResource(Resource):

    @paginate
    @rest_filter
    def get(self, session, rest_filter=None, page=None, num_per_page=None):
        """
        Returns a list of analyses.

        * Supports `q=` filtering.
        * Supports pagination.
        ---
        summary: List analyses
        tags:
          - Analysis
        parameters:
          - name: q
            in: query
            type: string
            description: JSON filter query
        responses:
          200:
            schema:
              type: array
              items:
                $ref: '#/definitions/Analysis'
            description: List of analyses
        """
        analyses = self.list_query(session, sample.Analysis, schema=schemas.AnalysisSchema(), rest_filter=rest_filter)
        for analysis in analyses:
            analysis['current_interpretation'] = get_current_interpretation(analysis)
        return analyses


class AnalysisResource(Resource):

    def get(self, session, analysis_id):
        """
        Returns a single analysis.
        ---
        summary: Get analysis
        tags:
          - Analysis
        parameters:
          - name: analysis_id
            in: path
            type: integer
            description: Analysis id
        responses:
          200:
            schema:
                $ref: '#/definitions/Analysis'
            description: Analysis object
        """
        a = session.query(sample.Analysis).filter(sample.Analysis.id == analysis_id).one()
        analysis = schemas.AnalysisSchema().dump(a).data
        analysis['current_interpretation'] = get_current_interpretation(analysis)
        return analysis

    @request_json(['properties'])
    def patch(self, session, analysis_id, data=None):
        """
        Updates an analysis.
        ---
        summary: Update analysis
        tags:
          - Analysis
        parameters:
          - name: analysis_id
            in: path
            type: integer
            description: Analysis id
          - data:
            in: body
            required: true
            schema:
              title: Analysis properties
              type: object
              required:
                - properties
              properties:
                properties:
                  description: Properties data
                  type: object
        responses:
          200:
            schema:
                $ref: '#/definitions/Analysis'
            description: Analysis object
        """
        a = session.query(sample.Analysis).filter(
            sample.Analysis.id == analysis_id
        ).one()

        a.properties = data['properties']
        session.commit()
        return schemas.AnalysisSchema().dump(a).data, 200

    def delete(self, session, analysis_id, override=False):
        """
        Deletes an analysis from the system, including corresponding samples, genotypes
        and interpretations. Alleles that were imported as part of the analysis are
        left intact, as we cannot know whether they were also "imported" (i.e in use)
        by other sources as well.

        Not callable by API as of yet.

        TODO: Make proper API description when included in API.
        """
        # NOTE: Not callable by API since override param will be false.
        # We cannot enable this in API until we have user authorization
        # It is however used by cli tool

        if not override:
            return None, 403  # Report as forbidden

        # If any alleleassessments points to this analysis, it cannot be removed
        # We'll get an error in any case, so this check is mostly to
        # present an error to the user
        if session.query(assessment.AlleleAssessment.id).filter(
            assessment.AlleleAssessment.analysis_id == analysis_id
        ).count():
            raise ApiError("One or more alleleassessments are pointing to this analysis. It's removal is not allowed.'")

        analysis = session.query(sample.Analysis).join(
            genotype.Genotype,
            sample.Sample,
        ).filter(
            sample.Analysis.id == analysis_id
        ).one()

        # Remove samples and genotypes
        samples = analysis.samples
        for s in samples:
            for g in s.genotypes:
                session.delete(g)
            session.delete(s)
        for i in analysis.interpretations:
            session.delete(i)

        # Clean up corresponding analysisfinalized entries
        # Will rarely happen (but can in principle), since we forbid to remove
        # analyses that have alleleassessments pointing to it.
        afs = session.query(sample.AnalysisFinalized).filter(
            sample.AnalysisFinalized.analysis_id == analysis_id
        ).all()
        for af in afs:
            session.delete(af)

        # Finally, delete analysis
        session.delete(analysis)

        session.commit()

        return None, 200


class AnalysisActionOverrideResource(Resource):

    @request_json(['user_id'])
    def post(self, session, analysis_id, data=None):
        """
        Lets an user take over an analysis, by replacing the
        analysis' current interpretation's user_id with the input user_id.

        **Only works for analyses with a `Ongoing` current interpretation**
        ---
        summary: Assign analysis to another user
        tags:
            - Analysis
        parameters:
          - name: analysis_id
            in: path
            type: integer
            description: Analysis id
          - name: data
            in: body
            type: object
            required: true
            schema:
              title: User id object
              required:
                - user_id
              properties:
                user_id:
                  type: integer
                example:
                  user_id: 1
            description: User id

        responses:
          200:
            description: Returns null
          500:
            description: Error
        """
        # Get user by username
        new_user = session.query(user.User).filter(
            user.User.id == data['user_id']
        ).one()

        a = session.query(sample.Analysis).filter(sample.Analysis.id == analysis_id).one()
        analysis = schemas.AnalysisSchema().dump(a).data
        int_id = get_current_interpretation(analysis)

        i = session.query(sample.Interpretation).filter(
            sample.Interpretation.id == int_id
        ).one()

        if i.status == 'Not started':
            raise ApiError("Interpretation hasn't started.")

        # db will throw exception if user_id is not a valid id
        # since it's a foreign key
        i.user = new_user
        session.commit()
        return None, 200


class AnalysisActionStartResource(Resource):

    @request_json(['user_id'])
    def post(self, session, analysis_id, data=None):
        """
        Starts an analysis.

        This sets the analysis' current interpretation's status to 'In progress'.

        **Only works for analyses with a `Not started` current interpretation**
        ---
        summary: Start analysis
        tags:
            - Analysis
        parameters:
          - name: analysis_id
            in: path
            type: integer
            description: Analysis id
          - name: data
            in: body
            type: object
            required: true
            schema:
              title: User id object
              required:
                - user_id
              properties:
                user_id:
                  type: integer
              example:
                user_id: 1
            description: User id

        responses:
          200:
            description: Returns null
          500:
            description: Error
        """
        # Get user by username
        start_user = session.query(user.User).filter(
            user.User.id == data['user_id']
        ).one()

        a = session.query(sample.Analysis).filter(sample.Analysis.id == analysis_id).one()
        analysis = schemas.AnalysisSchema().dump(a).data
        int_id = get_current_interpretation(analysis)

        i = session.query(sample.Interpretation).filter(
            sample.Interpretation.id == int_id
        ).one()

        if i.status != 'Not started':
            raise ApiError("Interpretation already started.")

        # db will throw exception if user_id is not a valid id
        # since it's a foreign key
        i.user = start_user
        i.status = 'Ongoing'
        session.commit()
        return None, 200


class AnalysisActionMarkReviewResource(Resource):

    def post(self, session, analysis_id):
        """
        Marks an analysis for review.

        This sets the analysis' current interpretation's status to `Done` and creates
        a new current interpretation with status `Not started`.

        **Only works for analyses with a `Ongoing` current interpretation**
        ---
        summary: Mark analysis for review
        tags:
          - Analysis
        parameters:
          - name: analysis_id
            in: path
            type: integer
            description: Analysis id
          - name: data
            in: body
            type: object
            required: true
            schema:
              title: User id object
              required:
                - user_id
              properties:
                user_id:
                  type: integer
              example:
                user_id: 1
            description: User id
        responses:
          200:
            description: Returns null
          500:
            description: Error
        """
        # TODO: Validate that user is same as user on interpretation
        # TODO: Consider some way to validate that it should be completable

        a = session.query(sample.Analysis).filter(sample.Analysis.id == analysis_id).one()
        analysis = schemas.AnalysisSchema().dump(a).data
        int_id = get_current_interpretation(analysis)

        a = session.query(sample.Analysis).filter(sample.Analysis.id == analysis_id).one()
        analysis = schemas.AnalysisSchema().dump(a).data
        int_id = get_current_interpretation(analysis)

        interpretation_current = session.query(sample.Interpretation).filter(
            sample.Interpretation.id == int_id
        ).one()

        if interpretation_current.status != 'Ongoing':
            raise ApiError("Interpretation is not ongoing.")

        interpretation_current.status = 'Done'

        # Create next interpretation
        interpretation_next = sample.Interpretation()
        interpretation_next.analysis_id = interpretation_current.analysis_id
        interpretation_next.state = interpretation_current.state

        session.add(interpretation_next)
        session.commit()
        return None, 200


class AnalysisActionReopenResource(Resource):

    def post(self, session, analysis_id):
        """
        Reopens an analysis, which was previously finalized.

        This creates a new current interpretation for the analysis,
        with status set to `Not started`.


        **Only works for analyses with a `Ongoing` current interpretation**
        ---
        summary: Mark analysis for review
        tags:
          - Analysis
        parameters:
          - name: analysis_id
            in: path
            type: integer
            description: Analysis id
          - name: data
            in: body
            type: object
            required: true
            schema:
                title: User id object
                required:
                    - user_id
                properties:
                    user_id:
                        type: integer
                example:
                    user_id: 1
            description: User id
        responses:
          200:
            description: Returns null
          500:
            description: Error
        """
        a = session.query(sample.Analysis).filter(sample.Analysis.id == analysis_id).one()
        analysis = schemas.AnalysisSchema().dump(a).data
        if get_current_interpretation(analysis) is not None:
            raise ApiError("Analysis is already pending or ongoing. Cannot reopen.")

        interpretation_current = session.query(sample.Interpretation).filter(
            sample.Analysis.id == analysis_id
        ).order_by(desc(sample.Interpretation.id)).first()

        # Create next interpretation
        interpretation_next = sample.Interpretation()
        interpretation_next.analysis_id = interpretation_current.analysis_id
        interpretation_next.state = interpretation_current.state

        session.add(interpretation_next)
        session.commit()
        return None, 200


class AnalysisActionFinalizeResource(Resource):

    def get(self, session, analysis_id):
        a = session.query(sample.AnalysisFinalized).filter(
            sample.AnalysisFinalized.analysis_id == analysis_id
            ).all()

        result = schemas.AnalysisFinalizedSchema(strict=True).dump(a, many=True).data
        return result

    @request_json(
        [
            'alleleassessments',
            'referenceassessments',
            'allelereports'
        ]
    )
    def post(self, session, analysis_id, data=None):
        """
        Finalizes an analysis.

        This sets the analysis' current interpretation's status to `Done` and creates
        any [alleleassessment|referenceassessment|allelereport] objects for the provided alleles,
        unless it's specified to reuse existing objects.

        The user must provide a list of alleleassessments, referenceassessments and allelereports.
        For each assessment/report, there are two cases:
        - 'reuse=False' or reuse is missing: a new assessment/report is created in the database using the data given.
        - 'reuse=True' The id of an existing assessment/report is expected in 'presented_assessment_id'
            or 'presented_report_id'.

        The assessment/report mentioned in the 'presented..' field is the one displayed/presented to the user.
        We pass it along to keep a record of the context of the assessment.

        The analysis will be linked to assessments/report.

        **Only works for analyses with a `Ongoing` current interpretation**

        ```javascript
        Example POST data:
        {
            "annotations": [
              {
               "allele_id": 14,
               "annotation_id": 56
               }
              ],
            "customannotations": [
               {
                "allele_id": 14,
                "custom_annotation_id": 56
               }
             ],
          "referenceassessments": [
                {
                    // New assessment will be created, superceding any old one
                    "user_id": 1,
                    "analysis_id": 3,
                    "reference_id": 123
                    "evaluation": {...data...},
                    "analysis_id": 3,
                    "allele_id": 14,
                },
                {
                    // Reusing assessment
                    "id": 13,
                    "allele_id": 13,
                    "reference_id": 1
                }
            ],
            "alleleassessments": [
                {
                    // New assessment will be created, superceding any old one
                    "user_id": 1,
                    "allele_id": 2,
                    "classification": "3",
                    "evaluation": {...data...},
                    "analysis_id": 3,
                    "presented_alleleassessment_id": 7 // optional
                    "reuse": false
                },
                {
                    // Reusing assessment
                    "allele_id": 6,
                    "presented_alleleassessment_id": 7,
                    "reuse": true
                 }
            ],
            "allelereports": [
                {
                    // New report will be created, superceding any old one
                    "user_id": 1,
                    "allele_id": 2,
                    "evaluation": {...data...},
                    "analysis_id": 3,
                },
                {
                    // Reusing report
                    "allele_id": 6
                    "presented_allelereport_id": 7,
                    "reuse": true

                }
            ]
        }
        ```

        ---
        summary: Finalize an analysis
        tags:
          - Analysis
        parameters:
          - name: analysis_id
            in: path
            type: integer
            description: Analysis id
          - name: data
            in: body
            required: true
            schema:
              title: Data object
              type: object
              required:
                - annotations
                - customannotations
                - referenceassessments
                - alleleassessments
                - allelereports
              properties:
                referenceassessments:
                  name: referenceassessment
                  type: array
                  items:
                    title: ReferenceAssessment
                    type: object
                    required:
                      - allele_id
                      - reference_id
                    properties:
                      id:
                        description: Existing referenceassessment id. If provided, existing object will be reused
                        type: integer
                      user_id:
                        description: User id. Required if not reusing existing object
                        type: integer
                      analysis_id:
                        description: Analysis id. Required if not reusing existing object
                        type: integer
                      allele_id:
                        description: Allele id
                        type: integer
                      reference_id:
                        description: Reference id
                        type: integer
                      evaluation:
                        description: Evaluation data object
                        type: object
                alleleassessment:
                  name: alleleassessment
                  type: array
                  items:
                    title: AlleleAssessment
                    type: object
                    required:
                      - allele_id
                    properties:
                      presented_alleleassessment_id:
                        description: Existing alleleassessment id. Displayed to the user (aka context)
                        type: integer
                      reuse:
                        description: The objects signals reuse of an existing alleleassessment
                        type: boolean
                      user_id:
                        description: User id. Required if not reusing existing object
                        type: integer
                      analysis_id:
                        description: Analysis id. Required if not reusing existing object
                        type: integer
                      allele_id:
                        description: Allele id
                        type: integer
                      evaluation:
                        description: Evaluation data object
                        type: object
                      classification:
                        description: Classification
                        type: string
                allelereport:
                  name: allelereport
                  type: array
                  items:
                    title: AlleleReport
                    type: object
                    required:
                      - allele_id
                    properties:
                      id:
                        description: Existing reference id. If provided, existing object will be reused
                        type: integer
                      presented_allelereport_id:
                        description: Existing report id. Displayed to the user (aka context)
                        type: integer
                      reuse:
                        description: The objects signals reuse of an existing report
                        type: boolean
                      user_id:
                        description: User id. Required if not reusing existing object
                        type: integer
                      analysis_id:
                        description: Analysis id. Required if not reusing existing object
                        type: integer
                      allele_id:
                        description: Allele id
                        type: integer
                      evaluation:
                        description: Evaluation data object
                        type: object
              example:
                annotations:
                  - annotation_id: 1
                custom_annotations:
                  -
                referenceassessments:
                  - user_id: 1
                    analysis_id: 3
                    reference_id: 123
                    evaluation: {}
                    allele_id: 14
                  - id: 13
                    allele_id: 13
                    reference_id: 1
                alleleassessments:
                  - user_id: 1
                    allele_id: 2
                    classification: '3'
                    evaluation: {}
                    analysis_id: 3
                  - presented_alleleassessment_id: 9,
                    reuse: true
                    allele_id: 6
                allelereports:
                  - user_id: 1
                    allele_id: 2
                    evaluation: {}
                    analysis_id: 3
                  - presented_report_id: 9
                    reuse: true
                    allele_id: 6
              description: Submitted data


        responses:
          200:
            description: Returns null
          500:
            description: Error
        """
        """

        Example data:

        {
            "referenceassessments": [
                {
                    # New assessment will be created, superceding any old one
                    "user_id": 1,
                    "analysis_id": 3,
                    "reference_id": 123
                    "evaluation": {...data...},
                    "analysis_id": 3,
                    "allele_id": 14,
                },
                {
                    # Reusing assessment
                    "id": 13,
                    "allele_id": 13,
                     "reference_id": 1
                }
            ],
            "alleleassessments": [
                {
                    # New assessment will be created, superceding any old one
                    "user_id": 1,
                    "allele_id": 2,
                    "classification": "3",
                    "evaluation": {...data...},
                    "analysis_id": 3,
                },
                {
                    # Reusing assessment
                    "presented_alleleassessment_id": 9,
                    "reuse": true
                    "allele_id": 6
                }
            ],
            "allelereports": [
                {
                    # New report will be created, superceding any old one
                    "user_id": 1,
                    "allele_id": 2,
                    "evaluation": {...data...},
                    "analysis_id": 3,
                },
                {
                    # Reusing report
                    "presented_allelereport_id": 9,
                    "reuse": true,
                    "allele_id": 6
                }
            ]
        }

        """

        # internal helper methods:
        def _find_first_allele_assessment(created_alleleassessments, reused_alleleassessments, allele_id):
            """
            Find the first assessment from 'created..' and 'reused..' whose allele_id matches.
            If found, return a tuple (id_of_presented | None, id_of_created | None)
            """

            created = _find_first_matching(created_alleleassessments, lambda x: x[1].allele_id == allele_id)
            reused = _find_first_matching(reused_alleleassessments, lambda x: x[0].allele_id == allele_id)
            if created:
                return created[0].id if created[0] else None, created[1].id
            if reused:
                return reused[0].id, None
            raise ApiError("No allele assessment found for allele_id {} when finalizing analysis.".format(allele_id))

        def _find_first_allele_report(created_allele_reports, reused_allele_reports, allele_id):
            """
            Find the first report from 'created..' and 'reused..' whose allele_id matches.
            If found, return a tuple (id_of_presented | None, id_of_created | None)
            """
            created = _find_first_matching(created_allele_reports, lambda x: x[1].allele_id == allele_id)
            reused = _find_first_matching(reused_allele_reports, lambda x: x[0].allele_id == allele_id)
            if created:
                return created[0].id if created[0] else None, created[1].id
            if reused:
                return reused[0].id, None
            raise ApiError("No allele assessment found for allele_id {} when finalizing analysis.".format(allele_id))

        def _find_first_matching(seq, predicate):
            return next((s for s in seq if predicate(s)), None)

        def _filter_flag(id, excluded):
            if id in excluded['class1']:
                return allele.Allele.CLASS1
            elif id in excluded['intronic']:
                return allele.Allele.INTRON
            else:
                return None

        def _create_finalization_object_for_excluded(allele_id, analysis_id, excluded):
            kwargs = {
                'analysis_id': analysis_id,
                'allele_id': allele_id,
                'annotation_id': None,
                'customannotation_id': None,
                'alleleassessment_id': None,
                'presented_alleleassessment_id': None,
                'allelereport_id': None,
                'presented_allelereport_id': None,
                'filtered': _filter_flag(allele_id, excluded)
            }
            return sample.AnalysisFinalized(**kwargs)

        def _create_finalization_object_for_included_allele(
                allele_id,
                analysis_id,
                annotations,
                custom_annotations,
                created_alleleassessments,
                reused_alleleassessments,
                created_allelereports,
                reused_allelereports):
            annotation = _find_first_matching(annotations, lambda x: x['allele_id'] == allele_id)
            custom_annotation = _find_first_matching(custom_annotations, lambda x: x['allele_id'] == allele_id)
            presented_alleleassessment_id, alleleassessment_id = _find_first_allele_assessment(
                created_alleleassessments,
                reused_alleleassessments,
                allele_id)
            presented_allelereport_id, allelereport_id = _find_first_allele_report(created_allelereports,
                                                                                   reused_allelereports,
                                                                                   allele_id)
            kwargs = {
                'analysis_id': analysis_id,
                'allele_id': allele_id,
                'annotation_id': annotation['annotation_id'],
                'customannotation_id': custom_annotation['custom_annotation_id'] if (
                    custom_annotation and 'custom_annotation_id' in custom_annotation) else None,

                'alleleassessment_id': alleleassessment_id,
                'presented_alleleassessment_id': presented_alleleassessment_id,

                'allelereport_id': allelereport_id,
                'presented_allelereport_id': presented_allelereport_id,

                'filtered': None
            }
            return sample.AnalysisFinalized(**kwargs)

            # end internal

        annotations = data['annotations']
        custom_annotations = data['custom_annotations']

        grouped_alleleassessments = AssessmentCreator(session).create_from_data(
            data['alleleassessments'],
            data['referenceassessments'],
        )

        # List of tuples:
        reused_alleleassessments = grouped_alleleassessments['alleleassessments']['reused']
        created_alleleassessments = grouped_alleleassessments['alleleassessments']['created']
        # un-tuple:
        all_alleleassessments_without_link_to_presented_assessments = \
            map(lambda a: a[0], reused_alleleassessments) + map(lambda a: a[1], created_alleleassessments)

        reused_referenceassessments = grouped_alleleassessments['referenceassessments']['reused']
        created_referenceassessments = grouped_alleleassessments['referenceassessments']['created']
        all_referenceassessments = reused_referenceassessments + created_referenceassessments

        grouped_allelereports = AlleleReportCreator(session).create_from_data(
            data['allelereports'],
            all_alleleassessments_without_link_to_presented_assessments
        )
        # List of tuples:
        reused_allelereports = grouped_allelereports['reused']
        created_allelereports = grouped_allelereports['created']
        # un-tuple:
        all_allelereports_without_link_to_presented_report = \
            map(lambda a: a[0], reused_allelereports) + map(lambda a: a[1], created_allelereports)

        connected_interpretations, interpretation_data = self.find_ongoing_interpretation(analysis_id, session)

        allele_ids = interpretation_data['allele_ids']
        excluded = interpretation_data['excluded_allele_ids']

        for allele_id in allele_ids:
            finalization_object = _create_finalization_object_for_included_allele(
                allele_id,
                analysis_id,
                annotations,
                custom_annotations,
                created_alleleassessments,
                reused_alleleassessments,
                created_allelereports,
                reused_allelereports)
            session.add(finalization_object)

        for allele_id in list(itertools.chain(*excluded.values())):
            finalization_object = _create_finalization_object_for_excluded(allele_id, analysis_id, excluded)
            session.add(finalization_object)

        # Mark all interpretations as done (we do all just in case)
        for ci in connected_interpretations:
            ci.status = 'Done'

        session.commit()

        return {
                   'allelereports': schemas.AlleleReportSchema().dump(
                       all_allelereports_without_link_to_presented_report, many=True).data,
                   'alleleassessments': schemas.AlleleAssessmentSchema().dump(
                       all_alleleassessments_without_link_to_presented_assessments, many=True).data,
                   'referenceassessments': schemas.ReferenceAssessmentSchema().dump(all_referenceassessments,
                                                                                    many=True).data,
               }, 200

    @staticmethod
    def find_ongoing_interpretation(analysis_id, session):
        connected_interpretations = session.query(sample.Interpretation).filter(
            sample.Interpretation.analysis_id == analysis_id
        ).all()

        # Check that exactly one is ongoing
        if not len([i for i in connected_interpretations if i.status == 'Ongoing']) == 1:
            raise ApiError("There's more than one ongoing interpretation. This shouldn't happen!")

        if [i for i in connected_interpretations if i.status == 'Not started']:
            raise ApiError("One or more interpretations are marked as 'Not started'. Finalization not possible.")

        current_interpretation = next((i for i in connected_interpretations if i.status == 'Ongoing'), None)

        if current_interpretation is None:
            raise ApiError("Trying to finalize analysis with no 'Ongoing' interpretations")

        # Create a finalization item for allele in the ongoing interpretation:

        i = InterpretationDataLoader(session, config).from_id(current_interpretation.id)
        return connected_interpretations, i


class AnalysisCollisionResource(Resource):
    def get(self, session, analysis_id):
        """
        Checks whether there are other analyses with
        alleles overlapping this analysis, AND
        having no valid classification in the system.

        The use case is to check whether the user could
        potentially be interpreting an allele at the same
        time as another user, duplicating the effort.

        Return the alleles in question and what user that it concerns.
        Do NOT return the analyses in question, this is not allowed.
        """

        aa = session.query(assessment.AlleleAssessment.allele_id).join(
            allele.Allele
        )

        # Subquery: Get all allele ids without any alleleassessments
        allele_ids_no_aa = session.query(allele.Allele.id).filter(not_(aa.exists()))

        # Subquery: Get all analyses that are ongoing
        analysis_ongoing_interpretation = session.query(sample.Analysis.id).join(
            sample.Interpretation
        ).filter(
            sample.Interpretation.status == 'Ongoing',
            sample.Analysis.id != analysis_id
        )

        # Subquery: Only include alleles which belongs to requested analysis
        analysis_alleles = session.query(allele.Allele.id).join(
            genotype.Genotype.alleles,
            sample.Sample,
            sample.Analysis
        ).filter(sample.Analysis.id == analysis_id)

        # Get all combinations of users and alleles where the analyses belongs to ongoing
        # interpretations and the alleles have no existing alleleassessment
        user_alleles = session.query(
            user.User.id,
            allele.Allele.id,
            gene.Genepanel.name,
            gene.Genepanel.version
        ).join(
            genotype.Genotype.alleles,
            sample.Sample,
            sample.Analysis,
            sample.Interpretation
        ).filter(
            allele.Allele.id.in_(analysis_alleles),
            allele.Allele.id.in_(allele_ids_no_aa),
            sample.Analysis.id.in_(analysis_ongoing_interpretation),
            user.User.id == sample.Interpretation.user_id,
            gene.Genepanel.name == sample.Analysis.genepanel_name,
            gene.Genepanel.version == sample.Analysis.genepanel_version
        ).group_by(
            user.User.id,
            allele.Allele.id,
            gene.Genepanel.name,
            gene.Genepanel.version
        ).order_by(
            user.User.id
        ).limit(  # Just in case to prevent DB overload...
            20
        ).all()

        user_ids = set([ua[0] for ua in user_alleles])
        allele_ids = set([ua[1] for ua in user_alleles])

        # Load the full data for user and allele
        user_cache = session.query(user.User).filter(user.User.id.in_(user_ids)).all()
        allele_cache = session.query(allele.Allele).filter(allele.Allele.id.in_(allele_ids)).all()
        genepanel_cache = dict()  # Will be filled later

        adl = AlleleDataLoader(session)
        result = list()
        # Generate result structure:
        #
        # [
        #   {
        #       "id": 1,
        #       "username": "testuser"
        #       "alleles": [
        #           {allele_data...}
        #       ],
        #       rest of user data...
        #   },
        #   {next entry...}
        # ]
        #
        # Genepanel is needed to select the default transcript, which
        # again is needed for showing relevant cDNA to the user
        for user_id, allele_id, gp_name, gp_version in user_alleles:
            user_in_result = next((u for u in result if u['id'] == user_id), None)
            if not user_in_result:
                user_obj = next(u for u in user_cache if u.id == user_id)
                dumped_user = schemas.UserSchema().dump(user_obj).data
                dumped_user['alleles'] = list()
                result.append(dumped_user)
                user_in_result = dumped_user
            allele_in_user_result = next((a for a in user_in_result['alleles'] if a['id'] == allele_id), None)
            if not allele_in_user_result:
                if (gp_name, gp_version) not in genepanel_cache:
                    # TODO: Query in a loop is a code smell re. performance,
                    # but complex primary keys are more hassle when prefilling cache...
                    gp_obj = session.query(gene.Genepanel).filter(
                        gene.Genepanel.name == gp_name,
                        gene.Genepanel.version == gp_version
                    ).one()
                    genepanel_cache[(gp_name, gp_version)] = gp_obj
                else:
                    gp_obj = genepanel_cache[(gp_name, gp_version)]

                allele_obj = next((a for a in allele_cache if a.id == allele_id))
                final_allele = adl.from_objs(
                    [allele_obj],
                    genepanel=gp_obj,
                    include_annotation=True,
                    include_custom_annotation=False,
                    include_allele_assessment=False,
                    include_reference_assessments=False
                )
                user_in_result['alleles'].append(final_allele[0])

        return result
