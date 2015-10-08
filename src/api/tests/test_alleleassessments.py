import json
import copy
import pytest

from util import FlaskClientProxy, reset_db


@pytest.fixture
def testdata():
    return {
        "allele_id": 1,
        "classification": "1",
        "evaluation": {
            "comment": "Some comment",
        },
        "genepanelName": "HBOC",
        "genepanelVersion": "v00",
        "interpretation_id": 1,
        "user_id": 1,
        "transcript_id": 1,
        "annotation_id": 1,
        "status": 0
    }


@pytest.fixture
def client():
    return FlaskClientProxy()


class TestAlleleAssessment(object):

    @classmethod
    def setup_class(cls):
        reset_db()

    @pytest.mark.aa(order=0)
    def test_create_new(self, testdata, client):
        # Retrieve alleles for interpretation for which
        # to create new AlleleAssessments
        alleles = client.get('/api/v1/interpretations/1/alleles/').json
        allele_ids = [a['id'] for a in alleles]

        # Create all AlleleAssessments
        for idx, allele_id in enumerate(allele_ids):
            testdata['allele_id'] = allele_id
            r = client.put('/api/v1/alleleassessments/', testdata)
            assert r.status_code == 200
            assert r.json['allele_id'] == allele_id
            assert r.json['id'] == idx+1

    @pytest.mark.aa(order=1)
    def test_update_assessment_1(self, client):
        """
        Simulate updating the AlleleAssessment created in create_new().
        It should result in the AlleleAssessment being updated, while the id remains the same.
        """

        alleles = client.get('/api/v1/interpretations/1/alleles/').json
        allele_ids = [a['id'] for a in alleles]

        q = {'allele_id': allele_ids, 'dateSuperceeded': None, 'status': 0}
        previous_aa = client.get('/api/v1/alleleassessments/?{}'.format(json.dumps(q))).json

        for prev in previous_aa:
            prev['evaluation']['comment'] = "Some new comment"
            r = client.put('/api/v1/alleleassessments/', prev)
            assert r.status_code == 200

            # Check that id remains the same
            assert r.json['id'] == prev['id']
            assert r.json['evaluation']['comment'] == 'Some new comment'

    @pytest.mark.aa(order=2)
    def test_finalize_interpretation(self, client):
        """
        Finalize the connected interpretation for this AlleleAssessment, in order to mark it as curated.
        """
        r = client.put('/api/v1/interpretations/1/actions/finalize/', data={})
        assert r.status_code == 200

        # Check that all alleleassessments are set as curated
        q = {'interpretation_id': 1}
        interpretation_aa = client.get('/api/v1/alleleassessments/?{}'.format(json.dumps(q))).json
        assert all(aa['status'] == 1 for aa in interpretation_aa)

    @pytest.mark.aa(order=3)
    def test_update_assessment_2(self, client):
        """
        Simulate updating the AlleleAssessments created in create_new().
        It should result in new AlleleAssessments being created, with new ids.
        """

        q = {'interpretation_id': 1}
        interpretation_aa = client.get('/api/v1/alleleassessments/?{}'.format(json.dumps(q))).json
        aa_ids = [aa['id'] for aa in interpretation_aa]

        # Create new AlleleAssessments and check their ids
        for aa in interpretation_aa:
            # remove id, as we're simulating creating a new one
            del aa['id']
            aa['evaluation']['comment'] = 'New assessment comment'

            r = client.put('/api/v1/alleleassessments/', aa)
            assert r.status_code == 200

            assert r.json['id'] not in aa_ids
            assert r.json['evaluation']['comment'] == 'New assessment comment'
            assert r.json['status'] == 0