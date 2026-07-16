-- identity.create_user_role is replaced by the bulk identity.create_user_roles
-- function (single p_user_id + p_roles TEXT[], mirroring identity.update_user_roles).
-- Functions deploy as RunAlways scripts, so deleting create_user_role.sql alone would
-- stop it being recreated on fresh databases but would not remove it from
-- already-migrated ones — the drop has to happen via a versioned migration. See #164.

DROP FUNCTION IF EXISTS identity.create_user_role(UUID, TEXT);
