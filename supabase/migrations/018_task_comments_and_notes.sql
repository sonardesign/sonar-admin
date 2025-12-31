-- Add notes column to time_entries for rich text description
ALTER TABLE time_entries 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create task_comments table
CREATE TABLE IF NOT EXISTS task_comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    task_id UUID REFERENCES time_entries(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_user_id ON task_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_created_at ON task_comments(created_at);

-- Enable RLS
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies for task_comments
-- Everyone can view comments on tasks they can access
CREATE POLICY "Users can view task comments"
    ON task_comments FOR SELECT
    USING (true);

-- Users can insert their own comments
CREATE POLICY "Users can insert own comments"
    ON task_comments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own comments
CREATE POLICY "Users can update own comments"
    ON task_comments FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can delete their own comments, admins can delete any
CREATE POLICY "Users can delete own comments"
    ON task_comments FOR DELETE
    USING (
        auth.uid() = user_id 
        OR EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Trigger for updated_at
CREATE TRIGGER trigger_task_comments_updated_at
    BEFORE UPDATE ON task_comments
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

