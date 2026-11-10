# TaskFlow API

Yazılım ekiplerinin görevlerini oluşturup çalışanlara atamasını, durum ve önceliklerini takip etmesini sağlayan REST API. Node.js ve Express ile yazılmıştır, görevleri JSON dosyasında tutar ve veritabanı gerektirmez.

## Kurulum ve çalıştırma

Bilgisayarınızda [Node.js](https://nodejs.org) 18 veya üstü ve Git kurulu olmalıdır.

**1. Projeyi indirin.**

```bash
git clone https://github.com/FadimeCoskuner/tnc-project-backend.git
cd tnc-project-backend
```

Git kullanmıyorsanız GitHub sayfasındaki **Code > Download ZIP** seçeneğiyle indirip klasörü açabilirsiniz.

**2. Bağımlılıkları kurun.**

```bash
npm install
```

**3. Sunucuyu çalıştırın.**

```bash
npm start
```

Sunucu `http://localhost:3000` adresinde açılır. Bu adres görev yönetim arayüzünü gösterir, API uçları Postman ile aynı adres üzerinden denenebilir.

| Komut | Açıklama |
|---|---|
| `npm start` | Sunucuyu başlatır |
| `npm run dev` | Kod değiştikçe sunucuyu yeniden başlatır |
| `npm test` | Otomatik testleri çalıştırır, `data/tasks.json` dosyasına dokunmaz |
| `npm run build:css` | Arayüzde sınıf değişikliği yapıldığında Tailwind CSS çıktısını yeniden üretir |

## Arayüz

API'nin üzerine, Tailwind CSS ile hazırlanmış bir görev yönetim paneli eklenmiştir. Görevler eklenip düzenlenebilir, silinebilir, aranabilir ve filtrelenebilir, özet kartları raporları gösterir. Derlenmiş CSS repoda bulunduğu için ek bir kurulum veya derleme gerekmez.

## Ortam değişkenleri

Hiçbiri zorunlu değildir.

| Değişken | Varsayılan | Açıklama |
|---|---|---|
| `PORT` | `3000` | Sunucunun dinleyeceği port |
| `CORS_ORIGINS` | Boş | `localhost` dışında izin verilecek frontend adresleri, virgülle ayrılır |
| `TASKS_FILE` | `data/tasks.json` | Görevlerin saklanacağı dosya |

## Endpoint'ler

| Yöntem | Adres | Açıklama | Başarılı yanıt |
|---|---|---|---|
| `POST` | `/tasks` | Görev oluşturur | `201` |
| `GET` | `/tasks` | Görevleri listeler, filtreler, sıralar, sayfalar | `200` |
| `GET` | `/tasks/search?keyword=backend` | Başlık ve açıklamada arar | `200` |
| `GET` | `/tasks/assignee/:assignee` | Bir kişinin görevlerini listeler | `200` |
| `GET` | `/tasks/:id` | Tek görevi getirir | `200` |
| `PUT` | `/tasks/:id` | Görevi tamamen değiştirir | `200` |
| `PATCH` | `/tasks/:id` | Yalnızca gönderilen alanları değiştirir | `200` |
| `DELETE` | `/tasks/:id` | Görevi siler | `204` |
| `GET` | `/reports/completed` | Tamamlanan görev sayısı | `200` |
| `GET` | `/reports/pending` | Bekleyen görev sayısı | `200` |
| `GET` | `/reports/summary` | Genel sistem özeti | `200` |

Listeleme örnekleri:

```
GET /tasks?status=completed
GET /tasks?priority=high
GET /tasks?sort=createdAt
GET /tasks?sort=-priority
GET /tasks?page=1&limit=10
GET /tasks?status=pending&sort=-priority&page=1&limit=5
```

## Görev alanları

| Alan | Tür | Varsayılan |
|---|---|---|
| `title` | Metin, en fazla 200 karakter, `POST` ve `PUT` için zorunlu | Yok |
| `description` | Metin, en fazla 2000 karakter | `""` |
| `status` | `pending`, `in-progress`, `completed` | `pending` |
| `priority` | `low`, `medium`, `high` | `medium` |
| `assignee` | Metin (en fazla 100 karakter) veya `null` | `null` |

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

## Klasör yapısı

```
├── server.js          Uygulamanın giriş noktası
├── routes/            Adresleri controller'lara bağlar
├── controllers/       İstekleri işler ve yanıtları üretir
├── middleware/        Logger, doğrulama, CORS ve hata yönetimi
├── data/              JSON dosyası ve dosya işlemleri
├── constants/         Durum ve öncelik değerleri
├── utils/             Yardımcı fonksiyonlar
├── public/            Express'in sunduğu arayüz dosyaları
├── ui/                Tailwind CSS kaynak dosyası
├── tests/             Otomatik API testleri
├── docs/              Ayrıntılı dokümanlar
└── screenshot/        Postman test ekran görüntüleri
```

## Dokümanlar

- [Proje Tanıtım Dokümanı](PROJE_TANITIMI.md)
- [API Dokümantasyonu](docs/API.md)
- [Test Dokümantasyonu](docs/TEST_SENARYOLARI.md)
- [Kullanım Kılavuzu](docs/KULLANIM_KILAVUZU.md)
- [Postman ekran görüntüleri](screenshot/)
