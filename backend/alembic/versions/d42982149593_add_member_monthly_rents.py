"""add member monthly rents table

Revision ID: d42982149593
Revises: c31871949582
Create Date: 2026-10-16 04:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'd42982149593'
down_revision: Union[str, None] = 'c31871949582'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table(
        'member_monthly_rents',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('mess_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('messes.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('month', sa.String(length=7), nullable=False),
        sa.Column('seat_label', sa.String(length=50), nullable=True),
        sa.Column('base_seat_rent', sa.Float(), server_default='0.0', nullable=False),
        sa.Column('vacancy_adjustment', sa.Float(), server_default='0.0', nullable=False),
        sa.Column('total_rent', sa.Float(), server_default='0.0', nullable=False),
        sa.Column('is_resident', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('notes', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.UniqueConstraint('mess_id', 'user_id', 'month', name='uq_member_monthly_rent'),
    )
    op.create_index('ix_member_monthly_rents_mess_id', 'member_monthly_rents', ['mess_id'])
    op.create_index('ix_member_monthly_rents_user_id', 'member_monthly_rents', ['user_id'])
    op.create_index('ix_member_monthly_rents_month', 'member_monthly_rents', ['month'])

def downgrade() -> None:
    op.drop_index('ix_member_monthly_rents_month', table_name='member_monthly_rents')
    op.drop_index('ix_member_monthly_rents_user_id', table_name='member_monthly_rents')
    op.drop_index('ix_member_monthly_rents_mess_id', table_name='member_monthly_rents')
    op.drop_table('member_monthly_rents')
