import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://godfljwjcxenwlqszcab.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvZGZsandqY3hlbndscXN6Y2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1MzI1NDAsImV4cCI6MjA2MjEwODU0MH0.-sUnA53cMjhc_Z0AFM18dYVSDfoodJHzEoKCnKT23aw";

export const supabase = createClient(supabaseUrl, supabaseKey);
