"""add must_change_credentials

Revision ID: 002_must_change_credentials
Revises: 001_initial
Create Date: 2026-10-02 00:00:00.000000

"""
from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op

revision: str = '002_must_change_credentials'
down_revision: Union[str, None] = '001_initial'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    try:
        op.add_column(
            'users',
            sa.Column('must_change_credentials', sa.Boolean(), server_default='true', nullable=False)
        )
    except Exception:
        pass


def downgrade() -> None:
    try:
        op.drop_column('users', 'must_change_credentials')
    except Exception:
        pass
