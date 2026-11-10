# TaskFlow: Proje Tanıtım Dokümanı

**Görev ve Proje Yönetim Sistemi API'si** · Node.js ile Backend Programlama Bitirme Projesi

## Amaç

TaskFlow, bir yazılım ekibindeki görevlerin tek bir sistem üzerinden yönetilmesini sağlayan REST API'dir. Proje, eğitim süresince öğrenilen Node.js, Express.js, routing, middleware, CRUD ve JSON ile veri yönetimi konularını gerçek hayata yakın bir senaryoda uygulamak amacıyla geliştirilmiştir.

## Senaryo

Bir yazılım şirketi, ekip içindeki görevleri ve çalışanların sorumluluklarını takip etmek istemektedir. Görevlerin kimde olduğu, hangi aşamada bulunduğu ve ne kadar öncelikli olduğu farklı yerlerde tutulduğunda işler gözden kaçmakta, aynı görev birden fazla kez açılabilmektedir.

TaskFlow bu ihtiyaca şu şekilde yanıt verir:

- Görevler oluşturulur ve bir çalışana atanır.
- Görevin durumu `pending`, `in-progress` ve `completed` değerleriyle takip edilir.
- Öncelik `low`, `medium` ve `high` olarak belirlenir.
- Görevler filtrelenir, aranır, sıralanır ve sayfalanır.
- Yöneticiler tamamlanan ve bekleyen işleri raporlardan görür.

## Sistem özellikleri

**Zorunlu kapsam**

- Görev ekleme, listeleme, detay görüntüleme, güncelleme ve silme (CRUD)
- Modüler routing yapısı
- Her isteğin yöntemini, adresini ve zaman damgasını kaydeden logger middleware'i
- Postman ile test edilmiş endpoint'ler ([ekran görüntüleri](screenshot/))

**İsteğe bağlı kapsam**

- Duruma, önceliğe ve kişiye göre filtreleme
- Başlık ve açıklamada anahtar kelime ile arama
- Kişiye göre görev listeleme
- Sayfalama ve sıralama
- `title`, `description`, `status`, `priority` ve `assignee` için doğrulama middleware'i
- Tamamlanan, bekleyen ve genel özet raporları
- API, test ve kullanım dokümanları

**Projeye eklenen iş kuralları**

- **Tekrar eden görev engeli:** Aynı başlıkla açık bir görev varsa yeni görev `409 Conflict` ile reddedilir. Bu nedenle aynı başlıkla art arda `POST` isteği göndermek hata değil, beklenen davranıştır. Tamamlanan görevler engel oluşturmaz.
- **Kısmi güncelleme:** `PATCH` yalnızca gönderilen alanları değiştirir, `PUT` görevin tamamını değiştirir.
- **Güvenli veri yazımı:** İstekler sıraya alınır ve dosya önce geçici olarak yazılır. Böylece eşzamanlı istekler birbirini ezmez, yazma yarıda kalırsa veri bozulmaz.

## Veri modeli

| Alan | Tür | Açıklama |
|---|---|---|
| `id` | UUID | Sunucu tarafından üretilir |
| `title` | Metin (zorunlu, en fazla 200) | Görevin başlığı |
| `description` | Metin (en fazla 2000) | Görevin açıklaması |
| `status` | `pending`, `in-progress`, `completed` | Görevin durumu, varsayılan `pending` |
| `priority` | `low`, `medium`, `high` | Görevin önceliği, varsayılan `medium` |
| `assignee` | Metin veya `null` | Görevin atandığı çalışan |
| `createdAt` | ISO 8601 tarih | Oluşturulma zamanı |
| `updatedAt` | ISO 8601 tarih | Son güncelleme zamanı |

## API mimarisi

Bir istek uygulama içinde şu sırayla ilerler:

```
İstek → Logger → CORS → JSON ayrıştırma → Route → Doğrulama → Controller → Veri katmanı → Yanıt
                                                     (hata olursa) → Hata yönetimi middleware'i
```

| Katman | Klasör | Sorumluluk |
|---|---|---|
| Routing | `routes/` | Adresleri middleware ve controller'lara bağlar |
| Middleware | `middleware/` | Logger, doğrulama, CORS ve hata yönetimi |
| Controller | `controllers/` | İsteği işler, listeyi hazırlar, raporu hesaplar |
| Veri | `data/` | `tasks.json` dosyasını okur ve yazar, tekrar kuralını uygular |

## Endpoint listesi

| Yöntem | Adres | Açıklama |
|---|---|---|
| `POST` | `/tasks` | Görev oluşturur |
| `GET` | `/tasks` | Görevleri listeler |
| `GET` | `/tasks/search?keyword=...` | Görev arar |
| `GET` | `/tasks/assignee/:assignee` | Kişinin görevlerini listeler |
| `GET` | `/tasks/:id` | Görev detayını getirir |
| `PUT` | `/tasks/:id` | Görevi tamamen günceller |
| `PATCH` | `/tasks/:id` | Görevi kısmen günceller |
| `DELETE` | `/tasks/:id` | Görevi siler |
| `GET` | `/reports/completed` | Tamamlanan görev sayısı |
| `GET` | `/reports/pending` | Bekleyen görev sayısı |
| `GET` | `/reports/summary` | Genel sistem özeti |

Ayrıntılar için [API Dokümantasyonu](docs/API.md), kurulum için [README](README.md) dosyasına bakılabilir.

## Kullanılan teknolojiler

Node.js, Express.js 5, JSON dosya depolama, Postman, Node.js yerleşik test aracı (`node:test`).
