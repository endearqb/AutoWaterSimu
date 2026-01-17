"""merge asm3 and summary data migrations

Revision ID: 5685026a8b35
Revises: add_asm3_tables, c32fa0f7920c
Create Date: 2025-09-07 14:50:57.367633

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '5685026a8b35'
down_revision = ('add_asm3_tables', 'c32fa0f7920c')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
