"""add_udm_hybrid_config_table

Revision ID: 6f1b7a2d9c10
Revises: 1ce6aa42e2f7
Create Date: 2026-02-14 12:00:00.000000

"""

from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = "6f1b7a2d9c10"
down_revision = "1ce6aa42e2f7"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "udmhybridconfig",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False),
        sa.Column("description", sqlmodel.sql.sqltypes.AutoString(length=1000), nullable=True),
        sa.Column("hybrid_config", sa.JSON(), nullable=True),
        sa.Column("owner_id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade():
    op.drop_table("udmhybridconfig")
