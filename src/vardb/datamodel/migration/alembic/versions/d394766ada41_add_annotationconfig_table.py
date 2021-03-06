"""Add annotationconfig table

Revision ID: d394766ada41
Revises: 611d46cd83b4
Create Date: 2021-05-19 13:46:46.719537

"""

# revision identifiers, used by Alembic.
revision = "d394766ada41"
down_revision = "1a6024944723"
branch_labels = None
depends_on = None

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from pathlib import Path
import yaml
from sqlalchemy.orm.session import Session
from vardb.deposit.annotation_config import deposit_annotationconfig
from vardb.datamodel.jsonschemas.update_schemas import update_schemas
from api.config import config
from vardb.datamodel.annotationshadow import create_trigger_sql


def upgrade():
    op.create_table(
        "annotationconfig",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("deposit", postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column("view", postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column("date_created", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_annotationconfig")),
    )
    op.add_column("annotation", sa.Column("annotation_config_id", sa.Integer(), nullable=True))
    op.create_index(
        op.f("ix_annotation_annotation_config_id"),
        "annotation",
        ["annotation_config_id"],
        unique=False,
    )
    op.create_foreign_key(
        op.f("fk_annotation_annotation_config_id_annotationconfig"),
        "annotation",
        "annotationconfig",
        ["annotation_config_id"],
        ["id"],
    )

    session = Session(bind=op.get_bind())
    with (Path(__file__).parent.parent / "data/annotation-config-legacy.yml").open() as f:
        annotation_config = yaml.safe_load(f)
        deposit_annotationconfig(session, annotation_config)

    op.execute("DROP TRIGGER IF EXISTS annotation_to_annotationshadow ON annotation;")
    op.execute("DROP TRIGGER IF EXISTS annotation_schema_version ON annotation;")

    op.execute("UPDATE annotation SET annotation_config_id=1")
    op.alter_column("annotation", "annotation_config_id", nullable=False)

    op.execute(create_trigger_sql(config))

    op.execute("DELETE FROM jsonschema WHERE name='annotation'")
    update_schemas(session)


def downgrade():
    op.drop_constraint(
        op.f("fk_annotation_annotation_config_id_annotationconfig"),
        "annotation",
        type_="foreignkey",
    )
    op.drop_index(op.f("ix_annotation_annotation_config_id"), table_name="annotation")
    op.drop_column("annotation", "annotation_config_id")
    op.drop_table("annotationconfig")
