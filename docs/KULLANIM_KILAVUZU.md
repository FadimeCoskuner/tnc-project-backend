# Kullanım Kılavuzu

Bu kılavuz, TaskFlow API'sini bir frontend veya başka bir uygulamaya adım adım bağlamayı anlatır. Tüm uçların ayrıntıları için [API Dokümantasyonu](API.md) dosyasına bakılabilir.

## 1. Sunucuyu başlatın

Kurulum adımları [README](../README.md) dosyasındadır. Sunucu açıldığında `http://localhost:3000` adresi şu yanıtı verir:

```json
{
  "name": "TaskFlow API",
  "status": "ok",
  "endpoints": { "tasks": "/tasks", "reports": "/reports/summary" }
}
```

## 2. Frontend adresine izin verin

`localhost` ve `127.0.0.1` üzerinde çalışan frontend'ler ek ayar gerektirmez. Yayındaki bir frontend için adresi `CORS_ORIGINS` değişkeniyle tanımlayın:

```bash
CORS_ORIGINS=https://taskflow.example.com npm start
```

Windows PowerShell'de:

```powershell
$env:CORS_ORIGINS="https://taskflow.example.com"; npm start
```

## 3. İstek yardımcı fonksiyonu yazın

Başarısız yanıtlarda API'nin döndürdüğü hata mesajını kullanan küçük bir yardımcı, tüm istekleri sadeleştirir:

```js
const API_URL = 'http://localhost:3000';

async function api(path, method = 'GET', body) {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 204) return null;

  const data = await response.json();
  if (!response.ok) throw Object.assign(new Error(data.error.message), { status: response.status, ...data.error });
  return data;
}
```

## 4. Görevleri yönetin

```js
// Görev oluşturma
const task = await api('/tasks', 'POST', {
  title: 'Giriş ekranını tasarla',
  priority: 'high',
  assignee: 'Musa',
});

// Sadece durumu güncelleme
await api(`/tasks/${task.id}`, 'PATCH', { status: 'in-progress' });

// Görev silme
await api(`/tasks/${task.id}`, 'DELETE');
```

## 5. Listeleri alın

```js
// Yüksek öncelikli açık görevler
const urgent = await api('/tasks?status=pending&priority=high');

// Arama (kullanıcı girdisini mutlaka kodlayın)
const results = await api(`/tasks/search?keyword=${encodeURIComponent('giriş ekranı')}`);

// Bir çalışanın görevleri
const musaTasks = await api(`/tasks/assignee/${encodeURIComponent('Musa')}`);

// Sayfalı liste, en yeni görev önce
const { data, pagination } = await api('/tasks?sort=-createdAt&page=1&limit=10');
```

`page` veya `limit` kullanıldığında yanıt `{ data, pagination }` biçiminde, kullanılmadığında doğrudan dizi olarak döner.

## 6. Hataları ele alın

```js
try {
  await api('/tasks', 'POST', { title: 'Giriş ekranını tasarla' });
} catch (error) {
  if (error.status === 409) {
    console.log('Bu görev zaten açık:', error.details.existingId);
  } else if (error.status === 400) {
    console.log('Eksik veya hatalı alanlar:', error.details);
  } else {
    console.log(error.message);
  }
}
```

## 7. Pano için özet alın

```js
const summary = await api('/reports/summary');

console.log(`Toplam görev: ${summary.total}`);
console.log(`Tamamlanma oranı: %${summary.completionRate}`);
```
