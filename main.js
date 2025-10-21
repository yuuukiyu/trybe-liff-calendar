import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://axeoezwxjjnghtyfmjnz.supabase.co";
const SUPABASE_KEY = "（Anonキーをここに貼る）";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener("DOMContentLoaded", async () => {
  const calendarEl = document.getElementById("calendar");

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    locale: "ja",
    events: await loadEvents()
  });

  calendar.render();
});

async function loadEvents() {
  const { data, error } = await supabase.from("events").select("*");
  if (error) {
    console.error("Error fetching events:", error);
    return [];
  }
  return data.map(event => ({
    title: event.title,
    start: event.date,
  }));
}
