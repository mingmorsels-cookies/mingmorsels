
// Push Notification Broadcast Logic
document.getElementById('btn-send-push')?.addEventListener('click', async () => {
  const btn = document.getElementById('btn-send-push');
  const resultDiv = document.getElementById('push-result');
  const title = document.getElementById('push-title').value.trim();
  const body = document.getElementById('push-body').value.trim();
  const url = document.getElementById('push-url').value.trim();

  if (!title || !body) {
    resultDiv.style.display = 'block';
    resultDiv.style.backgroundColor = 'rgba(231,76,60,0.15)';
    resultDiv.style.color = '#E74C3C';
    resultDiv.innerText = 'Title and Body are required.';
    return;
  }

  const pass = localStorage.getItem('mm_admin_key');
  if (!pass) return;

  btn.disabled = true;
  btn.innerText = 'Broadcasting...';
  resultDiv.style.display = 'none';

  try {
    const res = await fetch('/api/admin/push/broadcast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': pass
      },
      body: JSON.stringify({ title, body, url })
    });
    const data = await res.json();

    resultDiv.style.display = 'block';
    if (data.success) {
      resultDiv.style.backgroundColor = 'rgba(46,204,113,0.15)';
      resultDiv.style.color = '#2ECC71';
      resultDiv.innerText = data.message;
      document.getElementById('push-title').value = '';
      document.getElementById('push-body').value = '';
      document.getElementById('push-url').value = '';
    } else {
      resultDiv.style.backgroundColor = 'rgba(231,76,60,0.15)';
      resultDiv.style.color = '#E74C3C';
      resultDiv.innerText = data.error || 'Broadcast failed.';
    }
  } catch (err) {
    console.error(err);
    resultDiv.style.display = 'block';
    resultDiv.style.backgroundColor = 'rgba(231,76,60,0.15)';
    resultDiv.style.color = '#E74C3C';
    resultDiv.innerText = 'Network error during broadcast.';
  } finally {
    btn.disabled = false;
    btn.innerText = '📢 Broadcast to All Subscribers';
  }
});
