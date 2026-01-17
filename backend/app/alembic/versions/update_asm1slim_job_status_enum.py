"""Update ASM1SlimJob status enum to use MaterialBalanceJobStatus

Revision ID: update_asm1slim_status
Revises: 046055085f98
Create Date: 2024-12-19 10:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'update_asm1slim_status'
down_revision = '046055085f98'
branch_labels = None
depends_on = None


def upgrade():
    # Update the status column to use materialbalancejobstatus enum
    op.execute("""
        ALTER TABLE asm1slimjob 
        ALTER COLUMN status TYPE materialbalancejobstatus 
        USING status::text::materialbalancejobstatus
    """)
    
    # Drop the old enum type after updating the column
    op.execute("DROP TYPE IF EXISTS asm1slimjobstatus CASCADE")


def downgrade():
    # Create the old enum type
    op.execute("""
        CREATE TYPE asm1slimjobstatus AS ENUM (
            'pending', 'running', 'success', 'failed', 'cancelled'
        )
    """)
    
    # Revert the status column to use asm1slimjobstatus enum
    op.execute("""
        ALTER TABLE asm1slimjob 
        ALTER COLUMN status TYPE asm1slimjobstatus 
        USING status::text::asm1slimjobstatus
    """)