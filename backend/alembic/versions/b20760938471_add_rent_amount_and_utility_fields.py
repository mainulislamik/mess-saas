"""add rent_amount to memberships and utility fields to fixed_costs

Revision ID: b20760938471
Revises: a19659827685
Create Date: 2026-10-15 16:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b20760938471'
down_revision: Union[str, None] = 'a19659827685'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add WASTE to fixedcostcategory enum if not exists
    op.execute("ALTER TYPE fixedcostcategory ADD VALUE IF NOT EXISTS 'WASTE';")

    # 2. Add rent_amount to memberships
    op.add_column('memberships', sa.Column('rent_amount', sa.Float(), server_default='0.0', nullable=False))

    # 3. Add cost_date and meta_data to fixed_costs
    op.add_column('fixed_costs', sa.Column('cost_date', sa.Date(), nullable=True))
    op.add_column('fixed_costs', sa.Column('meta_data', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('fixed_costs', 'meta_data')
    op.drop_column('fixed_costs', 'cost_date')
    op.drop_column('memberships', 'rent_amount')
