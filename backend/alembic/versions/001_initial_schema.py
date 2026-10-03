"""initial schema

Revision ID: 001_initial
Revises:
Create Date: 2026-10-01 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = '001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Users
    op.create_table(
        'users',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('username', sa.String(length=64), unique=True, index=True, nullable=False),
        sa.Column('email', sa.String(length=128), unique=True, index=True, nullable=False),
        sa.Column('hashed_password', sa.String(length=256), nullable=False),
        sa.Column('is_active', sa.Boolean(), default=True, nullable=False),
        sa.Column('is_superuser', sa.Boolean(), default=False, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # Roles
    op.create_table(
        'roles',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('name', sa.String(length=32), unique=True, index=True, nullable=False),
        sa.Column('description', sa.String(length=256), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # User Roles
    op.create_table(
        'user_roles',
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('role_id', sa.String(length=36), sa.ForeignKey('roles.id', ondelete='CASCADE'), primary_key=True),
    )

    # Permissions
    op.create_table(
        'permissions',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('name', sa.String(length=64), unique=True, index=True, nullable=False),
        sa.Column('description', sa.String(length=256), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # Role Permissions
    op.create_table(
        'role_permissions',
        sa.Column('role_id', sa.String(length=36), sa.ForeignKey('roles.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('permission_id', sa.String(length=36), sa.ForeignKey('permissions.id', ondelete='CASCADE'), primary_key=True),
    )

    # API Keys
    op.create_table(
        'api_keys',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), index=True, nullable=False),
        sa.Column('name', sa.String(length=64), nullable=False),
        sa.Column('key_prefix', sa.String(length=16), index=True, nullable=False),
        sa.Column('key_hash', sa.String(length=64), unique=True, index=True, nullable=False),
        sa.Column('is_active', sa.Boolean(), default=True, nullable=False),
        sa.Column('permissions', sa.Text(), default='*', nullable=False),
        sa.Column('rate_limit', sa.Integer(), nullable=True),
        sa.Column('usage_count', sa.Integer(), default=0, nullable=False),
        sa.Column('last_used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # Backend Services
    op.create_table(
        'backend_services',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('name', sa.String(length=64), unique=True, index=True, nullable=False),
        sa.Column('upstream_url', sa.String(length=256), nullable=False),
        sa.Column('health_check_path', sa.String(length=128), default='/health', nullable=False),
        sa.Column('is_active', sa.Boolean(), default=True, nullable=False),
        sa.Column('timeout_seconds', sa.Float(), default=30.0, nullable=False),
        sa.Column('weight', sa.Integer(), default=100, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # Routes
    op.create_table(
        'routes',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('name', sa.String(length=64), unique=True, index=True, nullable=False),
        sa.Column('path_prefix', sa.String(length=256), index=True, nullable=False),
        sa.Column('methods', sa.String(length=64), default='ALL', nullable=False),
        sa.Column('backend_service_id', sa.String(length=36), sa.ForeignKey('backend_services.id', ondelete='CASCADE'), nullable=False),
        sa.Column('strip_prefix', sa.Boolean(), default=False, nullable=False),
        sa.Column('auth_required', sa.Boolean(), default=False, nullable=False),
        sa.Column('rate_limit_policy_id', sa.String(length=36), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # Gateway Configs
    op.create_table(
        'gateway_configs',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('key', sa.String(length=64), unique=True, index=True, nullable=False),
        sa.Column('value_json', sa.Text(), nullable=False),
        sa.Column('description', sa.String(length=256), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # IP Policies
    op.create_table(
        'ip_policies',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('ip_or_cidr', sa.String(length=64), index=True, nullable=False),
        sa.Column('action', sa.String(length=32), default='BLOCK', nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('reason', sa.String(length=256), nullable=True),
        sa.Column('created_by', sa.String(length=64), default='system', nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # Rate Limit Policies
    op.create_table(
        'rate_limit_policies',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('name', sa.String(length=64), unique=True, index=True, nullable=False),
        sa.Column('algorithm', sa.String(length=32), default='SLIDING_WINDOW', nullable=False),
        sa.Column('target_type', sa.String(length=32), default='IP', nullable=False),
        sa.Column('rate_limit', sa.Integer(), nullable=False),
        sa.Column('window_seconds', sa.Integer(), default=60, nullable=False),
        sa.Column('burst_capacity', sa.Integer(), default=0, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # Security Rules
    op.create_table(
        'security_rules',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('name', sa.String(length=64), unique=True, index=True, nullable=False),
        sa.Column('description', sa.String(length=256), nullable=True),
        sa.Column('priority', sa.Integer(), default=100, nullable=False),
        sa.Column('conditions_json', sa.Text(), nullable=False),
        sa.Column('action', sa.String(length=32), nullable=False),
        sa.Column('action_parameters_json', sa.Text(), nullable=True),
        sa.Column('is_enabled', sa.Boolean(), default=True, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # Security Events
    op.create_table(
        'security_events',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('event_type', sa.String(length=64), index=True, nullable=False),
        sa.Column('severity', sa.String(length=16), default='MEDIUM', index=True, nullable=False),
        sa.Column('client_ip', sa.String(length=64), index=True, nullable=False),
        sa.Column('request_path', sa.String(length=256), nullable=False),
        sa.Column('method', sa.String(length=16), nullable=False),
        sa.Column('details_json', sa.Text(), default='{}', nullable=False),
        sa.Column('rule_id', sa.String(length=36), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # Alerts
    op.create_table(
        'alerts',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('title', sa.String(length=128), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('severity', sa.String(length=16), default='WARNING', index=True, nullable=False),
        sa.Column('status', sa.String(length=16), default='OPEN', index=True, nullable=False),
        sa.Column('source', sa.String(length=64), default='megalodon-core', nullable=False),
        sa.Column('metadata_json', sa.Text(), default='{}', nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # Audit Logs
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('timestamp', sa.DateTime(timezone=True), index=True, nullable=False),
        sa.Column('user_id', sa.String(length=36), index=True, nullable=True),
        sa.Column('username', sa.String(length=64), nullable=True),
        sa.Column('action', sa.String(length=64), index=True, nullable=False),
        sa.Column('resource', sa.String(length=64), index=True, nullable=False),
        sa.Column('resource_id', sa.String(length=64), nullable=True),
        sa.Column('source_ip', sa.String(length=64), nullable=True),
        sa.Column('metadata_json', sa.Text(), default='{}', nullable=True),
    )

    # Network Interfaces
    op.create_table(
        'network_interfaces',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('name', sa.String(length=64), unique=True, index=True, nullable=False),
        sa.Column('state', sa.String(length=16), default='UP', nullable=False),
        sa.Column('mac_address', sa.String(length=32), nullable=True),
        sa.Column('speed_mbps', sa.Integer(), nullable=True),
        sa.Column('mtu', sa.Integer(), nullable=True),
        sa.Column('last_seen_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # Network Addresses
    op.create_table(
        'network_addresses',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('interface_id', sa.String(length=36), sa.ForeignKey('network_interfaces.id', ondelete='CASCADE'), index=True, nullable=False),
        sa.Column('family', sa.String(length=16), nullable=False),
        sa.Column('address', sa.String(length=64), index=True, nullable=False),
        sa.Column('prefix', sa.Integer(), nullable=False),
        sa.Column('last_seen_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # Network Listeners
    op.create_table(
        'network_listeners',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('protocol', sa.String(length=16), default='TCP', index=True, nullable=False),
        sa.Column('bind_address', sa.String(length=64), index=True, nullable=False),
        sa.Column('port', sa.Integer(), index=True, nullable=False),
        sa.Column('process_name', sa.String(length=128), nullable=True),
        sa.Column('pid', sa.Integer(), nullable=True),
        sa.Column('command', sa.Text(), nullable=True),
        sa.Column('last_seen_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # Network Services
    op.create_table(
        'network_services',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('name', sa.String(length=64), index=True, nullable=False),
        sa.Column('port', sa.Integer(), index=True, nullable=False),
        sa.Column('protocol', sa.String(length=16), default='TCP', nullable=False),
        sa.Column('description', sa.String(length=256), nullable=True),
        sa.Column('status', sa.String(length=32), default='ACTIVE', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('network_services')
    op.drop_table('network_listeners')
    op.drop_table('network_addresses')
    op.drop_table('network_interfaces')
    op.drop_table('audit_logs')
    op.drop_table('alerts')
    op.drop_table('security_events')
    op.drop_table('security_rules')
    op.drop_table('rate_limit_policies')
    op.drop_table('ip_policies')
    op.drop_table('gateway_configs')
    op.drop_table('routes')
    op.drop_table('backend_services')
    op.drop_table('api_keys')
    op.drop_table('role_permissions')
    op.drop_table('permissions')
    op.drop_table('user_roles')
    op.drop_table('roles')
    op.drop_table('users')
