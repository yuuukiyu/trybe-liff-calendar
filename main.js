import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Supabase接続設定
const SUPABASE_URL = 'https://axeoezwxjjnghtyfmjnz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4ZW9lend4ampuZ2h0eWZtam56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4NTE2NjQsImV4cCI6MjA3NjQyNzY2NH0.79UMcuggtqTpbghbXkjtR8g2FYGSTbpasHBd6hcf2Gw
';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', async function () {
  const calendarEl = document.getElementById('calendar');

  const { data: events, error } = await supabase.from('events').select('*');
  if (error) {
    alert('イベント取得エラー:' + error.message);
    return;
  }

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    locale: 'ja',
    height: 'auto',
    events: events.map(event => ({
      id: event.id,
      title: event.title,
      start: event.date,
      extendedProps: event
    })),

    eventClick: async function (info) {
      const event = info.event.extendedProps;

      // モーダル生成
      const modal = document.createElement('div');
      modal.classList.add('modal-overlay');
      modal.innerHTML = `
        <div class="modal">
          <h3>${event.title}（${await getParticipantCount(event.id)}名）｜${event.date} の参加者</h3>
          <input id="userNameInput" placeholder="あなたの名前を入力" />
          <div class="modal-buttons">
            <button id="joinBtn" class="join">参加する</button>
            <button id="cancelBtn" class="cancel">キャンセル</button>
            <button id="closeBtn" class="close">閉じる</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      document.getElementById('joinBtn').onclick = async () => {
        const name = document.getElementById('userNameInput').value;
        if (!name) return alert('名前を入力してください');

        const { error } = await supabase.from('reservations').insert({
          user_name: name,
          event_id: event.id,
          status: 'reserved',
          date: event.date,
        });
        if (error) {
          alert('登録エラー: ' + error.message);
        } else {
          alert('✅ 参加登録完了！');
          modal.remove();
          location.reload();
        }
      };

      document.getElementById('cancelBtn').onclick = async () => {
        const name = document.getElementById('userNameInput').value;
        if (!name) return alert('名前を入力してください');

        const { error } = await supabase
          .from('reservations')
          .update({ status: 'canceled' })
          .eq('event_id', event.id)
          .eq('user_name', name);
        if (error) {
          alert('キャンセルエラー: ' + error.message);
        } else {
          alert('✅ キャンセル完了！');
          modal.remove();
          location.reload();
        }
      };

      document.getElementById('closeBtn').onclick = () => modal.remove();
    },

    // 空の日付クリック無効化
    dateClick: function (info) {
      const hasEvent = events.some(e => e.date === info.dateStr);
      if (!hasEvent) return; // 予定のない日は無反応
    }
  });

  calendar.render();
});

// 参加人数カウント
async function getParticipantCount(eventId) {
  const { data, error } = await supabase
    .from('reservations')
    .select('*')
    .eq('event_id', eventId)
    .eq('status', 'reserved');

  if (error) return 0;
  return data.length;
}
