const path = require('path');
const projectDir = '/Users/ellisqwameadams/Desktop/sg-studio-booking';
const dotenv = require(path.join(projectDir, 'node_modules/dotenv'));
dotenv.config({ path: path.join(projectDir, '.env.local') });

const { createClient } = require(path.join(projectDir, 'node_modules/@supabase/supabase-js'));

async function check() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  console.log("Supabase URL:", url);
  console.log("Supabase Service Key Length:", key ? key.length : 0);

  const supabase = createClient(url, key, {
    auth: { persistSession: false }
  });

  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .limit(1);

    if (error) {
      console.error("Error fetching bookings:", error.message);
    } else {
      console.log("Successfully connected and fetched booking!");
      if (data && data.length > 0) {
        console.log("Sample booking keys:", Object.keys(data[0]));
        console.log("Sample booking details:", data[0]);
      } else {
        console.log("No bookings found in the table.");
      }
    }
  } catch (err) {
    console.error("Catch error:", err);
  }
}

check();
