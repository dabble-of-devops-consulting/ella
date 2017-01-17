from flask.ext.marshmallow import Marshmallow
from marshmallow import Schema, fields, post_dump

from api import app
from api.schemas import users

ma = Marshmallow(app)


class AnalysisInterpretationSchema(Schema):
    class Meta:
        title = "AnalysisInterpretation"
        description = 'Represents one round of interpretation of an analysis'
        # Fields to expose
        fields = ('id',
                  'status',
                  'user_state',
                  'state',
                  'date_last_update',
                  'genepanel_name',
                  'genepanel_version',
                  'user_id',
                  'user')

    user = fields.Nested(users.UserSchema)


class AnalysisInterpretationOverviewSchema(Schema):
    class Meta:
        title = "AnalysisInterpretationOverview"
        description = 'Represents one round of interpretation of an analysis. Overview data fields only.'
        fields = ('id',
                  'status',
                  'date_last_update',
                  'state',
                  'genepanel_name',
                  'genepanel_version',
                  'user_id',
                  'user')

    user = fields.Nested(users.UserSchema)

    @post_dump()
    def clean_state(self, data):
        """
        We only want to include the review_comment from state
        when included as part of analysis.
        """
        if 'review_comment' in data['state']:
            data['review_comment'] = data['state']['review_comment']
        del data['state']