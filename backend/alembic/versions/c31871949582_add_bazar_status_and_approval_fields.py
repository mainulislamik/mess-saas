"""add bazar status and approval fields

Revision ID: c31871949582
Revises: b20760938471
Create Date: 2026-10-15 18:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'c31871949582'
down_revision: Union[str, None] = 'b20760938471'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create bazarstatus enum if it doesn't exist
    bazarstatus = postgresql.ENUM('PENDING', 'APPROVED', 'REJECTED', name='bazarstatus')
    bazarstatus.create(op.get_bind(), checkfirst=True)

    # 2. Add status column to bazars with default 'APPROVED' so existing bazars remain active
    op.add_column(
        'bazars',
        sa.Column('status', sa.Enum('PENDING', 'APPROVED', 'REJECTED', name='bazarstatus'), nullable=False, server_default='APPROVED')
    )
    op.add_column('bazars', sa.Column('approved_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True))
    op.add_column('bazars', sa.Column('approved_at', sa.DateTime(), nullable=True))
    op.add_column('bazars', sa.Column('rejection_reason', sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column('bazars', 'rejection_reason')
    op.drop_column('bazars', 'approved_at')
    op.drop_column('bazars', 'approved_by')
    op.drop_column('bazars', 'status')
    op.execute("DROP TYPE IF EXISTS bazarstatus")
