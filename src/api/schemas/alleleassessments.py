import datetime
import pytz
from marshmallow import fields, Schema, post_load

from vardb.datamodel import assessment
from api.schemas import users, referenceassessments


class AlleleAssessmentUsergroupSchema(Schema):
    class Meta:
        fields = ("id", "name")


class AlleleAssessmentOverviewSchema(Schema):
    class Meta:
        title = "AlleleAssessment"
        description = "Represents an assessment of one allele for overview"
        fields = ("id", "date_created", "classification")


class AlleleAssessmentSchema(Schema):
    class Meta:
        title = "AlleleAssessment"
        description = "Represents an assessment of one allele"
        fields = (
            "id",
            "date_created",
            "date_superceeded",
            "allele_id",
            "analysis_id",
            "genepanel_name",
            "genepanel_version",
            "annotation_id",
            "custom_annotation_id",
            "previous_assessment_id",
            "user_id",
            "usergroup_id",
            "usergroup",
            "user",
            "classification",
            "seconds_since_update",
            "evaluation",
            "attachment_ids",
        )

    user_id = fields.Integer()
    user = fields.Nested(users.UserSchema)
    usergroup = fields.Nested(AlleleAssessmentUsergroupSchema)
    evaluation = fields.Field(required=False, default={})
    classification = fields.Field(required=True)
    date_created = fields.DateTime()
    date_superceeded = fields.DateTime(allow_none=True)
    seconds_since_update = fields.Method("get_seconds_since_created")
    attachment_ids = fields.Method("get_attachment_ids")

    def get_seconds_since_created(self, obj):
        return (datetime.datetime.now(pytz.utc) - obj.date_created).total_seconds()

    def get_attachment_ids(self, obj):
        return [at.id for at in obj.attachments]

    @post_load
    def make_object(self, data):
        return assessment.AlleleAssessment(**data)


class AlleleAssessmentInputSchema(Schema):
    class Meta:
        title = "AlleleAssessmentInput"
        description = "Represents data to create an allele assessment"
        fields = (
            "allele_id",
            "analysis_id",
            "genepanel_name",
            "genepanel_version",
            "classification",
            "evaluation",
            "referenceassessments",
        )

    evaluation = fields.Field(required=False, default={})
    classification = fields.Field(required=True)

    referenceassessments = fields.Nested(
        referenceassessments.ReferenceAssessmentInputSchema,
        many=True,
        attribute="referenceassessments",
        required=False,
    )
