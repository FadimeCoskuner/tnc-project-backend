# Test Dokümantasyonu

Proje iki şekilde test edilmiştir: temel CRUD uçları Postman ile elle, tüm senaryolar `npm test` komutuyla otomatik olarak.

## Otomatik testler

```bash
npm test
```

Testler sunucuyu geçici bir veri dosyasıyla başlatır, bu yüzden `data/tasks.json` dosyası değişmez. Her test boş veriyle başlar. Test kodu [tests/api.test.js](../tests/api.test.js) dosyasındadır.

## Postman ile temel CRUD testleri

| # | İstek | Beklenen sonuç | Kanıt |
|---|---|---|---|
| 1 | `POST /tasks` | `201 Created`, oluşturulan görev döner | [post.png](../screenshot/post.png) |
| 2 | `GET /tasks` | `200 OK`, görev listesi döner | [get.png](../screenshot/get.png) |
| 3 | `GET /tasks/:id` | `200 OK`, tek görev döner | [get-id.png](../screenshot/get-id.png) |
| 4 | `PUT /tasks/:id` | `200 OK`, güncellenen görev döner | [put.png](../screenshot/put.png) |
| 5 | `DELETE /tasks/:id` | `204 No Content` | [delete.png](../screenshot/delete.png) |

## Test senaryoları

Aşağıdaki senaryoların tamamı otomatik testlerle doğrulanır.

### CRUD ve logger

| Senaryo | Beklenen sonuç |
|---|---|
| Geçerli görev eklenir | `201`, varsayılan durum `pending` |
| Görev listelenir ve detayı alınır | `200` |
| `PUT` ile görev güncellenir | `200`, gönderilmeyen alanlar varsayılana döner, `createdAt` korunur |
| `PATCH` ile sadece durum değiştirilir | `200`, diğer alanlar korunur |
| Görev silinir, sonra tekrar istenir | `204`, ardından `404` |
| Var olmayan görev güncellenir veya silinir | `404` |
| Herhangi bir istek gönderilir | Konsola zaman damgası, yöntem ve adres yazılır |

### Doğrulama

| Senaryo | Beklenen sonuç |
|---|---|
| `title` eksik, boş veya metin değil | `400` |
| `title` 200, `description` 2000, `assignee` 100 karakteri aşıyor | `400` |
| Geçersiz `status` veya `priority` | `400` |
| `description` veya `assignee` yanlış türde | `400` |
| Boş veya tanınmayan alanlardan oluşan `PATCH` | `400` |
| Bozuk JSON gövdesi | `400` |
| Gövdede `id` veya `createdAt` gönderilir | Yok sayılır |
| Metinlerin başında ve sonunda boşluk var | Kırpılarak kaydedilir |

### Tekrar eden görevler

| Senaryo | Beklenen sonuç |
|---|---|
| Aynı başlıkla açık görev eklenir | `409`, `existingId` döner |
| Harf veya boşluk farkıyla aynı başlık | `409` |
| Aynı başlık, farklı kişi veya öncelik | `409` |
| Aynı başlıklı görev tamamlanmış | `201` |
| Tamamlanan görev, açık kopyası varken yeniden açılır | `409` |
| `PUT` görevin kendi başlığını korur | `200` |
| `PUT` veya `PATCH` başka görevin başlığını verir | `409` |
| Aynı anda 20 aynı istek gönderilir | Biri `201`, 19'u `409` |

### Listeleme

| Senaryo | Beklenen sonuç |
|---|---|
| `status`, `priority`, `assignee` filtreleri | Yalnızca eşleşen görevler |
| Boş `assignee` filtresi | Atanmamış görevler |
| Geçersiz filtre değeri | `400` |
| `keyword` ile arama | Başlık ve açıklamada, harf duyarsız |
| `keyword` eksik veya boş | `400` |
| `/tasks/assignee/musa` | Kişinin görevleri, harf duyarsız |
| `?page=2&limit=2` | Doğru dilim ve `pagination` bilgisi |
| Son sayfadan sonraki sayfa | `200`, boş `data` |
| Geçersiz `page` veya `limit` | `400` |
| `sort=title` | Türkçe alfabeye göre |
| `sort=priority` ve `sort=-priority` | `low`, `medium`, `high` ve tersi |
| Geçersiz `sort` | `400` |
| Filtre, sıralama ve sayfalama birlikte | Üçü de uygulanır |

### Raporlar ve altyapı

| Senaryo | Beklenen sonuç |
|---|---|
| `/reports/completed` ve `/reports/pending` | Doğru sayılar |
| `/reports/summary` | Doğru toplamlar, kişi kırılımı ve tamamlanma oranı |
| Hiç görev yokken raporlar | Sıfır değerler |
| Bilinmeyen adres | `404` |
| Kök adres | `200`, arayüz sayfası ve dosyaları döner |
| İzin verilen ve verilmeyen CORS adresleri | Başlık yalnızca izin verilene eklenir |
| Yazma tamamlanır | Geçici dosya kalmaz, veri geçerli JSON olur |
