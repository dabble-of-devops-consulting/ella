"""Add GQ threshold to segregationfilter

Revision ID: 61779f00886c
Revises: 49c742fa2e6c
Create Date: 2020-06-23 11:12:14.424899

"""

# revision identifiers, used by Alembic.
revision = "61779f00886c"
down_revision = "49c742fa2e6c"
branch_labels = None
depends_on = None

from alembic import op
import sqlalchemy as sa
from sqlalchemy.orm.session import Session
from vardb.datamodel.jsonschemas.update_schemas import update_schemas


def upgrade():
    # Filterconfig schema is updated, but is fully backward compatible. Therefore, replace the existing
    # schema, by first dropping it, and update_schemas again
    op.execute("DELETE FROM jsonschema WHERE name='filterconfig' and version=2")
    session = Session(bind=op.get_bind())
    update_schemas(session)
    session.flush()


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    pass
    # ### end Alembic commands ###
