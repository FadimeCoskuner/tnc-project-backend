# TNC Project Backend

Express ile yazılmış, görevleri JSON dosyasında tutan görev yönetimi REST API'si. Veritabanı gerektirmez.

## Kurulum

Node.js 18 veya üstü gerekir.

```powershell
npm install
npm start
```

Sunucu `http://localhost:3000` adresinde açılır. Geliştirme sırasında kod değiştikçe yeniden başlaması için `npm run dev` kullanılabilir.

## Ortam değişkenleri

| Değişken | Varsayılan | Açıklama |
|---|---|---|
| `PORT` | `3000` | Sunucunun dinleyeceği port |
| `CORS_ORIGINS` | Boş | `localhost` dışında izin verilecek frontend adresleri, virgülle ayrılır |

`localhost` ve `127.0.0.1` adreslerinden gelen isteklere her zaman izin verilir.

## Endpoint'ler

| Yöntem | Adres | Açıklama | Başarılı yanıt |
|---|---|---|---|
| `POST` | `/tasks` | Görev oluşturur | `201` |
| `GET` | `/tasks` | Görevleri listeler | `200` |
| `GET` | `/tasks/:id` | Tek görevi getirir | `200` |
| `PUT` | `/tasks/:id` | Görevi tamamen değiştirir | `200` |
| `PATCH` | `/tasks/:id` | Yalnızca gönderilen alanları değiştirir | `200` |
| `DELETE` | `/tasks/:id` | Görevi siler | `204` |

`GET /tasks` isteği `status`, `priority` ve `assignee` ile filtrelenebilir:

```
GET /tasks?status=pending&priority=high
```

## Görev alanları

| Alan | Tür | Varsayılan |
|---|---|---|
| `title` | Metin, `POST` ve `PUT` için zorunlu | Yok |
| `description` | Metin | `""` |
| `status` | `pending`, `in-progress`, `completed` | `pending` |
| `priority` | `low`, `medium`, `high` | `medium` |
| `assignee` | Metin veya `null` | `null` |

`id`, `createdAt` ve `updatedAt` sunucu tarafından yönetilir. `PUT` isteğinde gönderilmeyen alanlar varsayılan değerine döner.

## Tekrar eden görevler

Aynı `title` değerine sahip açık bir görev varsa istek `409 Conflict` ile reddedilir. Karşılaştırmada büyük/küçük harf ve fazla boşluklar yok sayılır. `completed` durumundaki görevler engel oluşturmaz, bu yüzden tamamlanan bir iş yeniden eklenebilir.

## Hata biçimi

```json
{
  "error": {
    "message": "Aynı başlıkla açık bir görev zaten var",
    "details": { "existingId": "442d56bb-16bd-4600-bd9c-07b5414c4218" }
  }
}
```

| Kod | Anlamı |
|---|---|
| `400` | Doğrulama hatası veya geçersiz JSON |
| `404` | Görev veya endpoint bulunamadı |
| `409` | Aynı başlıkla açık görev zaten var |
| `500` | Sunucu hatası |
