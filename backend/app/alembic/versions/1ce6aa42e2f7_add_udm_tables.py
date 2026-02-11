"""add_udm_tables

Revision ID: 1ce6aa42e2f7
Revises: 67ab1fac884d
Create Date: 2026-02-11 13:10:00.000000

"""

from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "1ce6aa42e2f7"
down_revision = "67ab1fac884d"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "udmmodel",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False),
        sa.Column("description", sqlmodel.sql.sqltypes.AutoString(length=2000), nullable=True),
        sa.Column("tags", sa.JSON(), nullable=True),
        sa.Column("current_version", sa.Integer(), nullable=False),
        sa.Column("is_published", sa.Boolean(), nullable=False),
        sa.Column("owner_id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "udmmodelversion",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("model_id", sa.Uuid(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("content_hash", sqlmodel.sql.sqltypes.AutoString(length=128), nullable=False),
        sa.Column("components", sa.JSON(), nullable=True),
        sa.Column("parameters", sa.JSON(), nullable=True),
        sa.Column("processes", sa.JSON(), nullable=True),
        sa.Column("meta", sa.JSON(), nullable=True),
        sa.Column("validation_ok", sa.Boolean(), nullable=False),
        sa.Column("validation_errors", sa.JSON(), nullable=True),
        sa.Column("seed_source", sqlmodel.sql.sqltypes.AutoString(length=60), nullable=True),
        sa.Column("owner_id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["model_id"], ["udmmodel.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["owner_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_udmmodelversion_content_hash"),
        "udmmodelversion",
        ["content_hash"],
        unique=False,
    )

    op.create_table(
        "udmflowchart",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False),
        sa.Column("description", sqlmodel.sql.sqltypes.AutoString(length=1000), nullable=True),
        sa.Column("flow_data", sa.JSON(), nullable=True),
        sa.Column("owner_id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "udmjob",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("job_id", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("job_name", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column(
            "status",
            postgresql.ENUM(
                "pending",
                "running",
                "success",
                "failed",
                "cancelled",
                name="materialbalancejobstatus",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("input_data", sa.JSON(), nullable=True),
        sa.Column("result_data", sa.JSON(), nullable=True),
        sa.Column("summary_data", sa.JSON(), nullable=True),
        sa.Column("error_message", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("owner_id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_udmjob_job_id"), "udmjob", ["job_id"], unique=True)


def downgrade():
    op.drop_index(op.f("ix_udmjob_job_id"), table_name="udmjob")
    op.drop_table("udmjob")
    op.drop_table("udmflowchart")
    op.drop_index(op.f("ix_udmmodelversion_content_hash"), table_name="udmmodelversion")
    op.drop_table("udmmodelversion")
    op.drop_table("udmmodel")
