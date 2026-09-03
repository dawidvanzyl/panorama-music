-- delete_waiting_list_entry
-- Removes one entry from the waiting list. The student record is deleted by
-- its own function in the same unit of work; this is called first so the
-- removal reads as an explicit pair rather than relying on the table's
-- ON DELETE CASCADE to carry the entry away silently.

CREATE OR REPLACE FUNCTION students.delete_waiting_list_entry(
    p_waiting_list_entry_id UUID
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM students.waiting_list WHERE waiting_list_entry_id = p_waiting_list_entry_id;
END;
$$;
