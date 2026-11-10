# API Dokümantasyonu

Temel adres: `http://localhost:3000`

İstek ve yanıt gövdeleri JSON biçimindedir. Gövde gönderilen isteklerde `Content-Type: application/json` başlığı kullanılmalıdır.

## Görev nesnesi

```json
{
  "id": "b16aecea-2244-45f9-a2a5-8e008692575e",
  "title": "Backend dokümanını yaz",
  "description": "API uçları açıklanacak",
  "status": "pending",
  "priority": "high",
  "assignee": "Musa",
  "createdAt": "2026-11-10T11:18:21.583Z",
  "updatedAt": "2026-11-10T11:18:21.583Z"
}
```

Bu bölümdeki örneklerde görev nesnesi kısaltılmadan yalnızca ilk kez gösterilmiştir, sonraki yanıtlarda aynı alanlar döner.

## Görev ekleme

`POST /tasks`

```json
{
  "title": "Backend dokümanını yaz",
  "description": "API uçları açıklanacak",
  "priority": "high",
  "assignee": "Musa"
}
```

Yanıt `201 Created`: oluşturulan görev nesnesi.

Hatalar: Geçersiz veride `400`, aynı başlıkla açık görev varsa `409`.

## Görev listeleme

`GET /tasks`

Yanıt `200 OK`: görev nesnelerinden oluşan dizi.

| Sorgu parametresi | Değer | Örnek |
|---|---|---|
| `status` | `pending`, `in-progress`, `completed` | `?status=completed` |
| `priority` | `low`, `medium`, `high` | `?priority=high` |
| `assignee` | Kişi adı, boş değer atanmamış görevleri getirir | `?assignee=Musa` |
| `sort` | `createdAt`, `updatedAt`, `title`, `status`, `priority`, azalan sıra için başına `-` eklenir | `?sort=-createdAt` |
| `page` | 1 veya üstü tam sayı, varsayılan `1` | `?page=2` |
| `limit` | 1 ile 100 arası tam sayı, varsayılan `10` | `?limit=20` |

Parametreler birlikte kullanılabilir. `priority` ve `status` alfabetik değil, anlamlarına göre sıralanır: `low`, `medium`, `high` ve `pending`, `in-progress`, `completed`.

`page` veya `limit` gönderildiğinde yanıt şu biçimde döner:

```json
{
  "data": [],
  "pagination": { "page": 2, "limit": 2, "total": 5, "totalPages": 3 }
}
```

Hatalar: Geçersiz parametre değerinde `400`.

## Görev arama

`GET /tasks/search?keyword=backend`

Başlık ve açıklamada büyük/küçük harf duyarsız arama yapar. Listelemedeki filtre, sıralama ve sayfalama parametrelerini de kabul eder.

Yanıt `200 OK`: eşleşen görevlerin dizisi.

Hatalar: `keyword` eksik veya boşsa `400`.

## Kişiye göre listeleme

`GET /tasks/assignee/musa`

Yanıt `200 OK`: kişiye atanan görevlerin dizisi. Büyük/küçük harf fark etmez. Listelemedeki filtre, sıralama ve sayfalama parametrelerini de kabul eder.

## Görev detayı

`GET /tasks/:id`

Yanıt `200 OK`: görev nesnesi.

Hatalar: Görev yoksa `404`.

## Görevi tamamen güncelleme

`PUT /tasks/:id`

```json
{
  "title": "Backend dokümanını bitir",
  "description": "API uçları açıklandı",
  "status": "in-progress",
  "priority": "high",
  "assignee": "Musa"
}
```

`title` zorunludur. Gönderilmeyen alanlar varsayılan değerine döner.

Yanıt `200 OK`: güncellenen görev nesnesi.

Hatalar: Geçersiz veride `400`, görev yoksa `404`, başlık başka bir açık görevle aynıysa `409`.

## Görevi kısmen güncelleme

`PATCH /tasks/:id`

```json
{ "status": "completed" }
```

En az bir geçerli alan gönderilmelidir. Gönderilmeyen alanlar değişmez.

Yanıt `200 OK`: güncellenen görev nesnesi.

Hatalar: Geçersiz veya boş gövdede `400`, görev yoksa `404`, başka bir açık görevle çakışırsa `409`.

## Görev silme

`DELETE /tasks/:id`

Yanıt `204 No Content`, gövde dönmez.

Hatalar: Görev yoksa `404`.

## Raporlar

`GET /reports/completed`

```json
{ "status": "completed", "count": 1 }
```

`GET /reports/pending`

```json
{ "status": "pending", "count": 2 }
```

`GET /reports/summary`

```json
{
  "total": 4,
  "byStatus": { "pending": 2, "in-progress": 1, "completed": 1 },
  "byPriority": { "low": 1, "medium": 1, "high": 2 },
  "byAssignee": [
    { "assignee": "Musa", "total": 2, "completed": 1, "open": 1 },
    { "assignee": "Ayşe", "total": 1, "completed": 0, "open": 1 }
  ],
  "unassigned": 1,
  "completionRate": 25
}
```

`completionRate`, tamamlanan görevlerin yüzdesidir. `open`, tamamlanmamış görev sayısını gösterir.

## Hata yanıtları

```json
{
  "error": {
    "message": "Doğrulama hatası",
    "details": [
      "title zorunludur",
      "priority şunlardan biri olmalıdır: low, medium, high"
    ]
  }
}
```

| Kod | Ne zaman döner |
|---|---|
| `400` | Doğrulama hatası veya geçersiz JSON |
| `404` | Görev veya endpoint bulunamadı |
| `409` | Aynı başlıkla açık görev zaten var, `details.existingId` çakışan görevi gösterir |
| `500` | Sunucu hatası |
